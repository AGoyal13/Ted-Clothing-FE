import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';
import { ApiService } from '../../../../core/services/api.service';
import { SiteConfigService } from '../../../../core/services/site-config.service';
import { Order, OrderItem, OrderListItem, OrderStatus, ReturnStatus } from '../../../../core/models/order.model';
import { formatINR } from '../../../../core/models/product.model';

type ReturnReason = 'WRONG_SIZE' | 'DEFECTIVE_ITEM' | 'NOT_AS_DESCRIBED' | 'WRONG_ITEM_DELIVERED' | 'DAMAGED_IN_TRANSIT' | 'CHANGED_MIND';
type CodMode = 'UPI' | 'BANK';

interface SkuOption {
  id: string;
  sizeLabel: string;
  stockQty: number;
  color: { id: string; colorName: string; colorHex: string };
}

interface ReturnPhoto {
  localId: string;
  url: string;
  uploading: boolean;
}

const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  WRONG_SIZE: 'Wrong size',
  DEFECTIVE_ITEM: 'Defective item',
  NOT_AS_DESCRIBED: 'Not as described',
  WRONG_ITEM_DELIVERED: 'Wrong item delivered',
  DAMAGED_IN_TRANSIT: 'Damaged in transit',
  CHANGED_MIND: 'Changed my mind',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURN_REQUESTED: 'Return Requested',
  RETURNED: 'Returned',
};

@Component({
  selector: 'app-orders-tab',
  standalone: true,
  imports: [DatePipe, LowerCasePipe, RouterLink],
  templateUrl: './orders-tab.component.html',
  styleUrl: './orders-tab.component.scss',
})
export class OrdersTabComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  readonly api = inject(ApiService);
  readonly siteConfig = inject(SiteConfigService);

  readonly orders = signal<OrderListItem[]>([]);
  readonly loading = signal(true);
  readonly expandedId = signal<string | null>(null);
  readonly expandedOrder = signal<Order | null>(null);
  readonly expandedLoading = signal(false);

  // Review
  readonly openReviewKey = signal<string | null>(null);
  readonly reviewRating = signal(5);
  readonly hoverRating = signal(0);
  readonly reviewTitle = signal('');
  readonly reviewBody = signal('');
  readonly reviewSubmitting = signal(false);
  readonly reviewError = signal('');
  readonly reviewedProductIds = signal(new Set<string>());
  readonly reviewSuccessProductId = signal<string | null>(null);

  // Return wizard
  readonly returnFormOrderId = signal<string | null>(null);
  readonly returnStep = signal<0 | 1 | 2 | 3 | 4>(1); // 0 = type picker (mode=both only)
  readonly returnType = signal<'return' | 'exchange' | null>(null); // only used in 'both' mode
  readonly returnReason = signal<ReturnReason | ''>('');
  readonly returnComments = signal('');
  readonly returnPhotos = signal<ReturnPhoto[]>([]);
  readonly returnExchangeSizes = signal<Record<string, string>>({}); // orderItemId -> skuId
  readonly returnExchangeColors = signal<Record<string, string>>({}); // orderItemId -> colorId
  readonly returnSelectedItems = signal<Set<string>>(new Set()); // orderItemIds selected for exchange
  readonly availableSkus = signal<Record<string, SkuOption[]>>({}); // productId -> skus
  readonly availableSkusLoading = signal(false);
  readonly codMode = signal<CodMode>('UPI');
  readonly upiId = signal('');
  readonly bankName = signal('');
  readonly bankAccount = signal('');
  readonly bankIfsc = signal('');
  readonly returnSubmitting = signal(false);
  readonly returnFormError = signal('');
  readonly returnSuccessId = signal<string | null>(null);
  readonly photoDragOver = signal(false);

  readonly formatINR = formatINR;
  readonly STATUS_LABEL = STATUS_LABEL;
  readonly STARS = [1, 2, 3, 4, 5];
  readonly RETURN_REASONS = Object.entries(RETURN_REASON_LABELS) as [ReturnReason, string][];
  readonly returnWindowDays = this.siteConfig.returnWindowDays;
  readonly returnMode = this.siteConfig.returnMode;

  // True when the current wizard session is an exchange (not a return)
  readonly isExchangeMode = computed(() => {
    const mode = this.returnMode();
    if (mode === 'exchange') return true;
    if (mode === 'return') return false;
    return this.returnType() === 'exchange'; // 'both': driven by customer's step-0 choice
  });

  // Display label for the action in progress
  readonly modeDisplayLabel = computed(() => {
    const mode = this.returnMode();
    const type = this.returnType();
    if (mode === 'both') {
      if (!type) return 'Return or Exchange';
      return type === 'exchange' ? 'Exchange' : 'Return';
    }
    return mode === 'exchange' ? 'Exchange' : 'Return';
  });

  orderStatusLabel(order: OrderListItem): string {
    if (order.status === 'RETURNED') {
      if (order.return?.status === 'EXCHANGE_DELIVERED' || order.return?.status === 'EXCHANGE_COMPLETE') return 'Exchanged';
      if (order.return?.status === 'REFUNDED') return 'Refunded';
    }
    return STATUS_LABEL[order.status];
  }

  ngOnInit() {
    this.orderService.getMyOrders().subscribe({
      next: list => { this.orders.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  shortId(id: string): string { return '#' + id.slice(-8).toUpperCase(); }

  savedAmount(item: OrderItem): string {
    if (!item.compareAtPriceAtPurchase) return '';
    const saved = (+item.compareAtPriceAtPurchase - +item.priceAtPurchase) * item.quantity;
    return formatINR(saved);
  }

  toggleOrder(order: OrderListItem) {
    if (this.expandedId() === order.id) { this.expandedId.set(null); return; }
    this.expandedId.set(order.id);
    this.expandedOrder.set(null);
    this.expandedLoading.set(true);
    this.openReviewKey.set(null);
    this.orderService.getOrderById(order.id).subscribe({
      next: o => { this.expandedOrder.set(o); this.expandedLoading.set(false); },
      error: () => this.expandedLoading.set(false),
    });
  }

  isReviewable(order: OrderListItem, productId: string): boolean {
    if (order.status !== 'DELIVERED' || !order.deliveredAt) return false;
    if (this.reviewedProductIds().has(productId)) return false;
    return (Date.now() - new Date(order.deliveredAt).getTime()) <= 90 * 24 * 60 * 60 * 1000;
  }

  isReturnable(order: OrderListItem): boolean {
    if (order.status !== 'DELIVERED' || !order.deliveredAt) return false;
    const w = this.returnWindowDays();
    if (w <= 0) return false;
    return (Date.now() - new Date(order.deliveredAt).getTime()) / 86400000 <= w;
  }

  returnDeadline(order: OrderListItem): Date | null {
    if (!order.deliveredAt) return null;
    const d = new Date(order.deliveredAt);
    d.setDate(d.getDate() + this.returnWindowDays());
    return d;
  }

  // ── Return wizard ─────────────────────────────────────────────────────────

  totalSteps(isCod: boolean, itemCount: number): number {
    if (this.isExchangeMode()) return isCod ? 4 : 3;
    const hasItemPicker = itemCount > 1;
    return hasItemPicker ? (isCod ? 4 : 3) : (isCod ? 3 : 2);
  }

  stepsArray(isCod: boolean, itemCount: number): number[] {
    return Array.from({ length: this.totalSteps(isCod, itemCount) }, (_, i) => i + 1);
  }

  isLastStep(isCod: boolean, itemCount: number): boolean {
    return this.returnStep() === this.totalSteps(isCod, itemCount);
  }

  showExchangeStep(step: number): boolean {
    return this.isExchangeMode() && step === 3;
  }

  showItemPickerStep(step: number, itemCount: number): boolean {
    return !this.isExchangeMode() && itemCount > 1 && step === 3;
  }

  showBankStep(step: number, isCod: boolean, itemCount: number): boolean {
    if (!isCod) return false;
    if (this.isExchangeMode()) return step === 4;
    return itemCount > 1 ? step === 4 : step === 3;
  }

  openReturnForm(orderId: string, items: OrderItem[]): void {
    const mode = this.returnMode();
    this.returnFormOrderId.set(orderId);
    // Step 0 only when mode=both — customer must pick return or exchange first
    this.returnStep.set(mode === 'both' ? 0 : 1);
    this.returnType.set(mode === 'both' ? null : (mode === 'exchange' ? 'exchange' : 'return'));
    this.returnReason.set('');
    this.returnComments.set('');
    this.returnPhotos.set([]);
    this.returnExchangeSizes.set({});
    this.returnExchangeColors.set({});
    this.returnSelectedItems.set(new Set(items.map(i => i.id)));
    this.codMode.set('UPI');
    this.upiId.set('');
    this.bankName.set('');
    this.bankAccount.set('');
    this.bankIfsc.set('');
    this.returnFormError.set('');
    this.availableSkus.set({});
  }

  cancelReturnForm(): void { this.returnFormOrderId.set(null); }

  // Called from step 0 when customer picks return or exchange
  chooseReturnType(type: 'return' | 'exchange'): void {
    this.returnType.set(type);
    this.returnStep.set(1);
  }

  nextReturnStep(order: Order): void {
    const step = this.returnStep();
    const isCod = order.paymentMethod === 'COD';
    const isExchange = this.isExchangeMode();
    this.returnFormError.set('');

    if (step === 1) {
      if (!this.returnReason()) { this.returnFormError.set('Please select a reason'); return; }
      this.returnStep.set(2);
      return;
    }
    if (step === 2) {
      const uploaded = this.returnPhotos().filter(p => p.url).length;
      if (uploaded === 0) { this.returnFormError.set('Please upload at least one photo'); return; }
      if (this.returnPhotos().some(p => p.uploading)) { this.returnFormError.set('Please wait for photos to finish uploading'); return; }
      if (isExchange) {
        this.loadSkusForItems(order.items);
        // Pre-select each item's own ordered color so the default view is familiar
        const initColors: Record<string, string> = {};
        order.items.forEach(i => { initColors[i.id] = i.sku.color.id; });
        this.returnExchangeColors.set(initColors);
        this.returnStep.set(3);
      } else if (order.items.length > 1) {
        this.returnStep.set(3);
      } else if (isCod) {
        this.returnStep.set(3);
      } else {
        this.doSubmitReturn(order);
      }
      return;
    }
    if (step === 3) {
      if (isExchange) {
        const exchangeable = order.items.filter(i => this.hasAvailableExchangeSizes(i));
        if (exchangeable.length === 0) { this.returnFormError.set('No stock available for exchange on any item'); return; }
        if (this.returnSelectedItems().size === 0) { this.returnFormError.set('Please select at least one item to exchange'); return; }
        if (!this.allSizesSelected(order.items)) { this.returnFormError.set('Please select an exchange size for each selected item'); return; }
        if (isCod) { this.returnStep.set(4); return; }
        this.doSubmitReturn(order);
      } else if (order.items.length > 1) {
        if (this.returnSelectedItems().size === 0) { this.returnFormError.set('Please select at least one item to return'); return; }
        if (isCod) { this.returnStep.set(4); return; }
        this.doSubmitReturn(order);
      } else {
        this.doSubmitReturn(order);
      }
      return;
    }
    if (step === 4) {
      this.doSubmitReturn(order);
    }
  }

  prevReturnStep(): void {
    const s = this.returnStep();
    if (s === 1 && this.returnMode() === 'both') {
      // Back from step 1 in 'both' mode → return to type picker
      this.returnStep.set(0);
      this.returnType.set(null);
    } else if (s > 1) {
      this.returnStep.set((s - 1) as 1 | 2 | 3 | 4);
    }
  }

  // ── Photo upload ──────────────────────────────────────────────────────────

  onPhotoSelect(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (files) this.uploadPhotoFiles(files);
    (event.target as HTMLInputElement).value = '';
  }

  onPhotoDrop(event: DragEvent): void {
    event.preventDefault();
    this.photoDragOver.set(false);
    if (event.dataTransfer?.files) this.uploadPhotoFiles(event.dataTransfer.files);
  }

  private uploadPhotoFiles(files: FileList): void {
    const remaining = 4 - this.returnPhotos().length;
    if (remaining <= 0) return;
    Array.from(files).slice(0, remaining).forEach(file => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        this.returnFormError.set('Only JPEG, PNG, or WebP photos allowed');
        return;
      }
      const localId = Math.random().toString(36).slice(2);
      this.returnPhotos.update(p => [...p, { localId, url: '', uploading: true }]);
      const fd = new FormData();
      fd.append('files', file);
      this.api.uploadFiles<{ urls: string[] }>('/upload/return-photos', fd).subscribe({
        next: res => this.returnPhotos.update(p =>
          p.map(ph => ph.localId === localId ? { ...ph, url: res.urls[0], uploading: false } : ph)),
        error: () => {
          this.returnPhotos.update(p => p.filter(ph => ph.localId !== localId));
          this.returnFormError.set('Photo upload failed — please try again');
        },
      });
    });
  }

  removePhoto(localId: string): void {
    this.returnPhotos.update(p => p.filter(ph => ph.localId !== localId));
  }

  // ── Exchange size picker ──────────────────────────────────────────────────

  private loadSkusForItems(items: OrderItem[]): void {
    const loaded = this.availableSkus();
    const unique = [...new Set(items.map(i => i.sku.product.id))].filter(id => !loaded[id]);
    if (!unique.length) return;
    this.availableSkusLoading.set(true);
    let pending = unique.length;
    unique.forEach(productId => {
      this.api.get<SkuOption[]>(`/products/${productId}/skus`).subscribe({
        next: skus => {
          this.availableSkus.update(m => ({ ...m, [productId]: skus }));
          if (--pending === 0) this.availableSkusLoading.set(false);
        },
        error: () => { if (--pending === 0) this.availableSkusLoading.set(false); },
      });
    });
  }

  colorsForItem(item: OrderItem): Array<{ id: string; colorName: string; colorHex: string; hasStock: boolean }> {
    const allSkus = this.availableSkus()[item.sku.product.id] ?? [];
    const seen = new Set<string>();
    const result: Array<{ id: string; colorName: string; colorHex: string; hasStock: boolean }> = [];
    for (const sku of allSkus) {
      if (!seen.has(sku.color.id)) {
        seen.add(sku.color.id);
        result.push({
          id: sku.color.id,
          colorName: sku.color.colorName,
          colorHex: sku.color.colorHex,
          hasStock: allSkus.some(s => s.color.id === sku.color.id && s.stockQty > 0),
        });
      }
    }
    return result;
  }

  skusForItem(item: OrderItem): SkuOption[] {
    const selectedColorId = this.returnExchangeColors()[item.id] ?? item.sku.color.id;
    const selectedSizes = this.returnExchangeSizes();
    const claimedCounts = new Map<string, number>();
    for (const [itemId, skuId] of Object.entries(selectedSizes)) {
      if (itemId !== item.id) {
        claimedCounts.set(skuId, (claimedCounts.get(skuId) ?? 0) + 1);
      }
    }
    return (this.availableSkus()[item.sku.product.id] ?? [])
      .filter(s => s.color.id === selectedColorId)
      .map(s => ({ ...s, stockQty: Math.max(0, s.stockQty - (claimedCounts.get(s.id) ?? 0)) }));
  }

  // Any sku across any color still has stock — used to enable/disable the item checkbox
  hasAvailableExchangeSizes(item: OrderItem): boolean {
    return (this.availableSkus()[item.sku.product.id] ?? []).some(s => s.stockQty > 0);
  }

  selectExchangeColor(orderItemId: string, colorId: string): void {
    this.returnExchangeColors.update(m => ({ ...m, [orderItemId]: colorId }));
    // Clear size selection — chosen size may not exist in the new color
    this.returnExchangeSizes.update(m => { const n = { ...m }; delete n[orderItemId]; return n; });
  }

  selectExchangeSize(orderItemId: string, skuId: string): void {
    this.returnExchangeSizes.update(m => ({ ...m, [orderItemId]: skuId }));
  }

  toggleReturnItem(itemId: string, item?: OrderItem): void {
    this.returnSelectedItems.update(set => {
      const next = new Set(set);
      if (next.has(itemId)) {
        next.delete(itemId);
        this.returnExchangeSizes.update(m => { const n = { ...m }; delete n[itemId]; return n; });
        this.returnExchangeColors.update(m => { const n = { ...m }; delete n[itemId]; return n; });
      } else {
        next.add(itemId);
        // Restore to ordered colour when re-checking, then auto-select single size
        if (item) {
          this.returnExchangeColors.update(m => ({ ...m, [itemId]: item.sku.color.id }));
          const available = this.skusForItem(item).filter(s => s.stockQty > 0);
          if (available.length === 1) {
            this.returnExchangeSizes.update(m => ({ ...m, [itemId]: available[0].id }));
          }
        }
      }
      return next;
    });
  }

  allSizesSelected(items: OrderItem[]): boolean {
    const sizes = this.returnExchangeSizes();
    const selected = this.returnSelectedItems();
    return items.filter(i => selected.has(i.id)).every(i => !!sizes[i.id]);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  private doSubmitReturn(order: Order): void {
    const isCod = order.paymentMethod === 'COD';
    const isExchange = this.isExchangeMode();
    let bankDetails: string | undefined;

    if (isCod) {
      if (this.codMode() === 'UPI') {
        const id = this.upiId().trim();
        if (!id) { this.returnFormError.set('Please enter your UPI ID'); return; }
        bankDetails = JSON.stringify({ type: 'UPI', upiId: id });
      } else {
        const name = this.bankName().trim();
        const acct = this.bankAccount().trim();
        const ifsc = this.bankIfsc().trim().toUpperCase();
        if (!name || !acct || !ifsc) { this.returnFormError.set('Please fill all bank details'); return; }
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) { this.returnFormError.set('Invalid IFSC code format'); return; }
        bankDetails = JSON.stringify({ type: 'BANK', name, account: acct, ifsc });
      }
    }

    this.returnSubmitting.set(true);
    this.returnFormError.set('');
    const exchangeSizes = this.returnExchangeSizes();
    const payload: Record<string, unknown> = {
      orderId: order.id,
      reason: this.returnReason(),
      comments: this.returnComments().trim() || undefined,
      photoUrls: this.returnPhotos().filter(p => p.url).map(p => p.url),
      items: order.items
        .filter(i => this.returnSelectedItems().has(i.id))
        .map(i => ({
          orderItemId: i.id,
          ...(isExchange && exchangeSizes[i.id] ? { exchangeSkuId: exchangeSizes[i.id] } : {}),
        })),
      ...(bankDetails ? { bankDetails } : {}),
    };

    this.api.post<{ id: string }>('/returns', payload).subscribe({
      next: () => {
        this.returnSubmitting.set(false);
        this.returnFormOrderId.set(null);
        this.returnSuccessId.set(order.id);
        this.orders.update(list =>
          list.map(o => o.id === order.id ? { ...o, status: 'RETURN_REQUESTED' as const } : o));
      },
      error: err => {
        this.returnSubmitting.set(false);
        this.returnFormError.set(err?.error?.error?.message ?? 'Submission failed — please try again');
      },
    });
  }

  // ── Reviews ───────────────────────────────────────────────────────────────

  openReviewForm(orderId: string, productId: string) {
    const key = `${orderId}:${productId}`;
    if (this.openReviewKey() === key) { this.openReviewKey.set(null); return; }
    this.openReviewKey.set(key);
    this.reviewRating.set(5); this.hoverRating.set(0);
    this.reviewTitle.set(''); this.reviewBody.set(''); this.reviewError.set('');
  }

  submitReview(orderId: string, productId: string) {
    const body = this.reviewBody().trim();
    if (body.length < 10) { this.reviewError.set('Write at least 10 characters'); return; }
    if (body.length > 500) { this.reviewError.set('Keep it under 500 characters'); return; }
    this.reviewSubmitting.set(true);
    this.reviewError.set('');
    const payload: Record<string, unknown> = { orderId, rating: this.reviewRating(), body };
    if (this.reviewTitle().trim()) payload['title'] = this.reviewTitle().trim();
    this.api.post<unknown>(`/products/${productId}/reviews`, payload).subscribe({
      next: () => {
        this.reviewSubmitting.set(false);
        this.openReviewKey.set(null);
        this.reviewedProductIds.update(s => new Set([...s, productId]));
        this.reviewSuccessProductId.set(productId);
        setTimeout(() => this.reviewSuccessProductId.update(id => id === productId ? null : id), 3500);
      },
      error: err => {
        this.reviewSubmitting.set(false);
        if (err?.status === 409) {
          this.reviewedProductIds.update(s => new Set([...s, productId]));
          this.openReviewKey.set(null);
        } else {
          this.reviewError.set(err?.error?.error?.message ?? 'Submission failed');
        }
      },
    });
  }

  findOrderItem(items: OrderItem[], orderItemId: string): OrderItem | undefined {
    return items.find(i => i.id === orderItemId);
  }

  getReturnItemForOrder(order: Order, orderItemId: string) {
    return order.return?.items?.find(ri => ri.orderItemId === orderItemId) ?? null;
  }

  trackingUrl(awb: string): string {
    return `https://www.delhivery.com/track/package/${awb}`;
  }
}

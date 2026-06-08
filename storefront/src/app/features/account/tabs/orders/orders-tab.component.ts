import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';
import { ApiService } from '../../../../core/services/api.service';
import { SiteConfigService } from '../../../../core/services/site-config.service';
import { Order, OrderItem, OrderListItem, OrderStatus } from '../../../../core/models/order.model';
import { formatINR } from '../../../../core/models/product.model';

type ReturnReason = 'WRONG_SIZE' | 'DEFECTIVE_ITEM' | 'NOT_AS_DESCRIBED' | 'WRONG_ITEM_DELIVERED' | 'DAMAGED_IN_TRANSIT' | 'CHANGED_MIND';
type CodMode = 'UPI' | 'BANK';

interface SkuOption {
  id: string;
  sizeLabel: string;
  stockQty: number;
  color: { id: string; colorName: string };
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
  imports: [DatePipe, RouterLink],
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
  readonly returnStep = signal<1 | 2 | 3 | 4>(1);
  readonly returnReason = signal<ReturnReason | ''>('');
  readonly returnComments = signal('');
  readonly returnPhotos = signal<ReturnPhoto[]>([]);
  readonly returnExchangeSizes = signal<Record<string, string>>({}); // orderItemId -> skuId
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
  readonly returnEnabled = this.siteConfig.returnEnabled;

  ngOnInit() {
    this.siteConfig.load();
    this.orderService.getMyOrders().subscribe({
      next: list => { this.orders.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  shortId(id: string): string { return '#' + id.slice(-8).toUpperCase(); }

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

  totalSteps(isCod: boolean): number {
    const isExchange = !this.returnEnabled();
    return isExchange ? (isCod ? 4 : 3) : (isCod ? 3 : 2);
  }

  stepsArray(isCod: boolean): number[] {
    return Array.from({ length: this.totalSteps(isCod) }, (_, i) => i + 1);
  }

  isLastStep(isCod: boolean): boolean {
    return this.returnStep() === this.totalSteps(isCod);
  }

  showExchangeStep(step: number): boolean {
    return !this.returnEnabled() && step === 3;
  }

  showBankStep(step: number, isCod: boolean): boolean {
    if (!isCod) return false;
    return this.returnEnabled() ? step === 3 : step === 4;
  }

  openReturnForm(orderId: string, items: OrderItem[]): void {
    this.returnFormOrderId.set(orderId);
    this.returnStep.set(1);
    this.returnReason.set('');
    this.returnComments.set('');
    this.returnPhotos.set([]);
    this.returnExchangeSizes.set({});
    this.codMode.set('UPI');
    this.upiId.set('');
    this.bankName.set('');
    this.bankAccount.set('');
    this.bankIfsc.set('');
    this.returnFormError.set('');
    this.availableSkus.set({});
  }

  cancelReturnForm(): void { this.returnFormOrderId.set(null); }

  nextReturnStep(order: Order): void {
    const step = this.returnStep();
    const isCod = order.paymentMethod === 'COD';
    const isExchange = !this.returnEnabled();
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
        if (!this.allSizesSelected(order.items)) { this.returnFormError.set('Please select an exchange size for each item'); return; }
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
    if (s > 1) this.returnStep.set((s - 1) as 1 | 2 | 3 | 4);
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
    const remaining = 4 - this.returnPhotos().filter(p => !p.uploading || p.url).length;
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

  skusForItem(item: OrderItem): SkuOption[] {
    return (this.availableSkus()[item.sku.product.id] ?? [])
      .filter(s => s.color.id === item.sku.color.id);
  }

  selectExchangeSize(orderItemId: string, skuId: string): void {
    this.returnExchangeSizes.update(m => ({ ...m, [orderItemId]: skuId }));
  }

  allSizesSelected(items: OrderItem[]): boolean {
    const sizes = this.returnExchangeSizes();
    return items.every(i => !!sizes[i.id]);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  private doSubmitReturn(order: Order): void {
    const isCod = order.paymentMethod === 'COD';
    const isExchange = !this.returnEnabled();
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
      items: order.items.map(i => ({
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

  trackingUrl(awb: string): string {
    return `https://www.delhivery.com/track/package/${awb}`;
  }
}

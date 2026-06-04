import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';
import { ApiService } from '../../../../core/services/api.service';
import { SiteConfigService } from '../../../../core/services/site-config.service';
import { Order, OrderListItem, OrderStatus } from '../../../../core/models/order.model';
import { formatINR } from '../../../../core/models/product.model';

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
  private readonly api = inject(ApiService);
  private readonly siteConfig = inject(SiteConfigService);

  readonly orders = signal<OrderListItem[]>([]);
  readonly loading = signal(true);
  readonly expandedId = signal<string | null>(null);
  readonly expandedOrder = signal<Order | null>(null);
  readonly expandedLoading = signal(false);

  readonly openReviewKey = signal<string | null>(null); // `${orderId}:${productId}`
  readonly reviewRating = signal(5);
  readonly hoverRating = signal(0);
  readonly reviewTitle = signal('');
  readonly reviewBody = signal('');
  readonly reviewSubmitting = signal(false);
  readonly reviewError = signal('');
  readonly reviewedProductIds = signal(new Set<string>());
  readonly reviewSuccessProductId = signal<string | null>(null);

  readonly returningId = signal<string | null>(null);
  readonly returnSuccessId = signal<string | null>(null);
  readonly returnErrorId = signal<string | null>(null);

  readonly formatINR = formatINR;
  readonly STATUS_LABEL = STATUS_LABEL;
  readonly STARS = [1, 2, 3, 4, 5];
  readonly returnWindowDays = this.siteConfig.returnWindowDays;

  ngOnInit() {
    this.siteConfig.load();
    this.orderService.getMyOrders().subscribe({
      next: list => { this.orders.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  shortId(id: string): string {
    return '#' + id.slice(-8).toUpperCase();
  }

  toggleOrder(order: OrderListItem) {
    if (this.expandedId() === order.id) {
      this.expandedId.set(null);
      return;
    }
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
    const elapsed = Date.now() - new Date(order.deliveredAt).getTime();
    return elapsed <= 90 * 24 * 60 * 60 * 1000;
  }

  isReturnable(order: OrderListItem): boolean {
    if (order.status !== 'DELIVERED' || !order.deliveredAt) return false;
    const windowDays = this.returnWindowDays();
    if (windowDays <= 0) return false;
    const elapsed = (Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
    return elapsed <= windowDays;
  }

  returnDeadline(order: OrderListItem): Date | null {
    if (!order.deliveredAt) return null;
    const d = new Date(order.deliveredAt);
    d.setDate(d.getDate() + this.returnWindowDays());
    return d;
  }

  requestReturn(orderId: string): void {
    if (this.returningId()) return;
    this.returningId.set(orderId);
    this.returnErrorId.set(null);
    this.api.post<{ id: string; status: string }>(`orders/${orderId}/request-return`, {}).subscribe({
      next: () => {
        this.returningId.set(null);
        this.returnSuccessId.set(orderId);
        this.orders.update(list =>
          list.map(o => o.id === orderId ? { ...o, status: 'RETURN_REQUESTED' as const } : o)
        );
      },
      error: (err) => {
        this.returningId.set(null);
        this.returnErrorId.set(orderId);
        setTimeout(() => this.returnErrorId.update(id => id === orderId ? null : id), 4000);
        console.error('Return request failed:', err?.error?.error?.message);
      },
    });
  }

  openReviewForm(orderId: string, productId: string) {
    const key = `${orderId}:${productId}`;
    if (this.openReviewKey() === key) { this.openReviewKey.set(null); return; }
    this.openReviewKey.set(key);
    this.reviewRating.set(5);
    this.hoverRating.set(0);
    this.reviewTitle.set('');
    this.reviewBody.set('');
    this.reviewError.set('');
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

import { inject, Injectable, PLATFORM_ID, signal, computed, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap, map } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { CartItem, CartApiResponse } from '../models/cart.model';

const SESSION_ID_KEY = 'ted_session_id';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly items = signal<CartItem[]>([]);
  readonly oosItems = signal<CartItem[]>([]);
  readonly loading = signal(false);

  readonly count = computed(() =>
    this.items().reduce((sum, i) => sum + i.quantity, 0)
  );
  readonly total = computed(() =>
    this.items().reduce((sum, i) => sum + i.price * i.quantity, 0)
  );

  constructor() {
    if (this.isBrowser) {
      this.ensureSessionId();
      this.loadCart();
      this.watchAuthLogout();
    }
  }

  private watchAuthLogout(): void {
    // Track the previous userId so we can detect logged-in → logged-out transitions.
    // undefined = "effect hasn't fired yet" (distinguishes initial load from actual logout).
    let prevUserId: string | null | undefined = undefined;

    effect(() => {
      const userId = this.auth.currentUser()?.id ?? null;

      if (prevUserId !== undefined && prevUserId !== null && userId === null) {
        // User just logged out — clear immediately and reload as guest
        this.items.set([]);
        this.oosItems.set([]);
        this.loadCart();
      }

      prevUserId = userId;
    });
  }

  private ensureSessionId(): void {
    if (!localStorage.getItem(SESSION_ID_KEY)) {
      localStorage.setItem(SESSION_ID_KEY, crypto.randomUUID());
    }
  }

  loadCart(): void {
    this.loading.set(true);
    this.api.get<CartApiResponse>('/cart').subscribe({
      next: (res) => {
        this.items.set(res.items.map(this.toCartItem));
        this.oosItems.set(res.oosItems.map(this.toCartItem));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  addItem(skuId: string, quantity = 1): Observable<void> {
    return this.api.post<unknown>('/cart', { skuId, quantity }).pipe(
      tap(() => this.loadCart()),
      map(() => undefined),
    );
  }

  updateQty(skuId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(skuId);
      return;
    }
    this.items.update(items =>
      items.map(i => (i.skuId === skuId ? { ...i, quantity } : i))
    );
    this.api.patch<unknown>(`/cart/${skuId}`, { quantity }).subscribe({
      error: () => this.loadCart(),
    });
  }

  removeItem(skuId: string): void {
    this.items.update(items => items.filter(i => i.skuId !== skuId));
    this.oosItems.update(items => items.filter(i => i.skuId !== skuId));
    this.api.delete(`/cart/${skuId}`).subscribe({
      error: () => this.loadCart(),
    });
  }

  onLogin(): void {
    this.api.post<unknown>('/cart/merge', {}).subscribe({
      next: () => this.loadCart(),
      error: () => this.loadCart(),
    });
  }

  clearCart(): void {
    this.items.set([]);
    this.oosItems.set([]);
  }

  private toCartItem(apiItem: any): CartItem {
    const base = parseFloat(String(apiItem.sku?.product?.basePrice ?? 0));
    const disc = parseFloat(String(apiItem.sku?.product?.discountPercent ?? 0));
    return {
      skuId: apiItem.skuId,
      skuCode: apiItem.sku?.skuCode ?? '',
      productId: apiItem.sku?.product?.id ?? '',
      productSlug: apiItem.sku?.product?.slug ?? '',
      productTitle: apiItem.sku?.product?.title ?? '',
      colorName: apiItem.sku?.color?.colorName ?? '',
      sizeLabel: apiItem.sku?.sizeLabel ?? '',
      price: apiItem.effectivePrice ?? base,
      basePrice: base,
      discountPct: disc,
      quantity: apiItem.quantity,
      stockQty: apiItem.sku?.stockQty ?? 0,
      image: apiItem.sku?.color?.images?.[0] ?? null,
    };
  }
}

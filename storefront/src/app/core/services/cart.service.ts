import { inject, Injectable, PLATFORM_ID, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CartItem } from '../models/cart.model';

const CART_STORAGE_KEY = 'ted_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly items = signal<CartItem[]>(this.loadFromStorage());

  readonly count = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  private loadFromStorage(): CartItem[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items()));
    } catch {
      // Storage unavailable — ignore
    }
  }

  addItem(item: CartItem): void {
    const current = this.items();
    const existing = current.find(i => i.skuId === item.skuId);
    if (existing) {
      this.items.set(
        current.map(i =>
          i.skuId === item.skuId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      );
    } else {
      this.items.set([...current, item]);
    }
    this.persist();
  }

  removeItem(skuId: string): void {
    this.items.set(this.items().filter(i => i.skuId !== skuId));
    this.persist();
  }

  updateQty(skuId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(skuId);
      return;
    }
    this.items.set(
      this.items().map(i => (i.skuId === skuId ? { ...i, quantity } : i))
    );
    this.persist();
  }

  clearCart(): void {
    this.items.set([]);
    this.persist();
  }
}

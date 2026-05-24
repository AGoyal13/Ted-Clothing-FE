import { inject, Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/product.model';
import { AuthService } from './auth.service';

export interface WishlistEntry {
  id: string;
  skuId: string;
  productId: string;
}

interface WishlistApiItem {
  id: string;
  skuId: string;
  sku: { id: string; productId: string };
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = environment.apiUrl;

  private readonly _entries = signal<WishlistEntry[]>([]);

  readonly count = computed(() => this._entries().length);

  readonly wishlistedProductIds = computed(
    () => new Set(this._entries().map(e => e.productId))
  );

  constructor() {
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.loadWishlist();
      } else {
        this._entries.set([]);
      }
    });
  }

  isWishlisted(productId: string): boolean {
    return this.wishlistedProductIds().has(productId);
  }

  toggle(productId: string, skuId: string): void {
    if (this.isWishlisted(productId)) {
      const entry = this._entries().find(e => e.productId === productId);
      if (entry) this.remove(entry.skuId, productId);
    } else {
      this.add(skuId, productId);
    }
  }

  private loadWishlist(): void {
    this.http
      .get<ApiResponse<WishlistApiItem[]>>(`${this.baseUrl}/wishlist`)
      .pipe(
        map(r =>
          r.data.map(item => ({
            id: item.id,
            skuId: item.skuId,
            productId: item.sku.productId,
          }))
        )
      )
      .subscribe({ next: entries => this._entries.set(entries), error: () => {} });
  }

  private add(skuId: string, productId: string): void {
    this.http
      .post<ApiResponse<{ id: string }>>(`${this.baseUrl}/wishlist`, { skuId })
      .subscribe({
        next: r => {
          this._entries.update(prev => [
            ...prev,
            { id: r.data.id, skuId, productId },
          ]);
        },
        error: () => {},
      });
  }

  private remove(skuId: string, productId: string): void {
    this._entries.update(prev => prev.filter(e => e.productId !== productId));
    this.http
      .delete(`${this.baseUrl}/wishlist/${skuId}`)
      .subscribe({ error: () => this.loadWishlist() });
  }
}

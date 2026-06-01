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
  productTitle: string;
  productSlug: string;
  colorName: string;
  colorHex: string;
  sizeLabel: string;
  image: string;
  basePrice: number;
  discountPercent: number;
}

interface WishlistApiItem {
  id: string;
  skuId: string;
  sku: {
    id: string;
    productId: string;
    sizeLabel: string;
    color: { id: string; colorName: string; colorHex: string; images: string[] };
    product: { id: string; title: string; slug: string; basePrice: number; discountPercent: number };
  };
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = environment.apiUrl;

  private readonly _entries = signal<WishlistEntry[]>([]);

  readonly items = this._entries.asReadonly();
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
      .pipe(map(r => r.data.map(this.mapItem)))
      .subscribe({ next: entries => this._entries.set(entries), error: () => {} });
  }

  private mapItem(item: WishlistApiItem): WishlistEntry {
    return {
      id: item.id,
      skuId: item.skuId,
      productId: item.sku.productId,
      productTitle: item.sku.product.title,
      productSlug: item.sku.product.slug,
      colorName: item.sku.color.colorName,
      colorHex: item.sku.color.colorHex,
      sizeLabel: item.sku.sizeLabel,
      image: item.sku.color.images?.[0] ?? '',
      basePrice: item.sku.product.basePrice,
      discountPercent: item.sku.product.discountPercent,
    };
  }

  addItem(skuId: string, productId: string): void {
    if (!this.isWishlisted(productId)) {
      this.add(skuId, productId);
    }
  }

  private add(skuId: string, productId: string): void {
    this.http
      .post<ApiResponse<{ id: string }>>(`${this.baseUrl}/wishlist`, { skuId })
      .subscribe({ next: () => this.loadWishlist(), error: () => {} });
  }

  private remove(skuId: string, productId: string): void {
    this._entries.update(prev => prev.filter(e => e.productId !== productId));
    this.http
      .delete(`${this.baseUrl}/wishlist/${skuId}`)
      .subscribe({ error: () => this.loadWishlist() });
  }

  effectivePrice(entry: WishlistEntry): number {
    return Math.round(entry.basePrice * (1 - entry.discountPercent / 100));
  }
}

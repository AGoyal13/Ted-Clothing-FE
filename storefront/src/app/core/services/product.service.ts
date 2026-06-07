import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CacheService } from './cache.service';
import { Product, ProductDetail, ProductListResponse } from '../models/product.model';

export interface ProductQueryParams {
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  limit?: number;
  page?: number;
  categorySlug?: string;
  gender?: 'MEN' | 'WOMEN' | 'KIDS' | 'UNISEX';
  sort?: 'newest' | 'price-asc' | 'price-desc';
  onSale?: boolean;
}

const PLP_TTL = 60_000;    // 1 min — category page lists
const PDP_TTL = 30_000;    // 30 s — product detail (stock-sensitive)
const FEATURED_TTL = 2 * 60_000; // 2 min — home page featured grid

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly api = inject(ApiService);
  private readonly cache = inject(CacheService);

  getProducts(params: ProductQueryParams = {}): Observable<ProductListResponse> {
    const queryParams: Record<string, string | number | boolean> = {};
    if (params.status) queryParams['status'] = params.status;
    if (params.limit) queryParams['limit'] = params.limit;
    if (params.page) queryParams['page'] = params.page;
    if (params.categorySlug) queryParams['categorySlug'] = params.categorySlug;
    if (params.gender) queryParams['gender'] = params.gender;
    if (params.sort) queryParams['sort'] = params.sort;
    if (params.onSale) queryParams['onSale'] = true;

    // Build a stable cache key from sorted query params so all callers with same params share one entry
    const cacheKey = 'products:' + Object.entries(queryParams).sort().map(([k, v]) => `${k}=${v}`).join('&');
    return this.cache.get(cacheKey, () => this.api.get<ProductListResponse>('/products', queryParams), PLP_TTL);
  }

  getProductBySlug(slug: string): Observable<ProductDetail> {
    return this.cache.get(
      `product:slug:${slug}`,
      () => this.api.get<ProductDetail>(`/products/by-slug/${slug}`),
      PDP_TTL,
    );
  }

  getFeatured(limit = 8): Observable<ProductListResponse> {
    return this.cache.get(
      `products:featured:${limit}`,
      () => this.getProducts({ status: 'ACTIVE', limit, page: 1 }),
      FEATURED_TTL,
    );
  }
}

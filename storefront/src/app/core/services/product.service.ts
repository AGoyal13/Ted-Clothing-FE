import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Product, ProductDetail, ProductListResponse } from '../models/product.model';

export interface ProductQueryParams {
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  limit?: number;
  page?: number;
  categorySlug?: string;
  gender?: 'MEN' | 'WOMEN' | 'KIDS' | 'UNISEX';
  sort?: 'newest' | 'price-asc' | 'price-desc';
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly api = inject(ApiService);

  getProducts(params: ProductQueryParams = {}): Observable<ProductListResponse> {
    const queryParams: Record<string, string | number | boolean> = {};
    if (params.status) queryParams['status'] = params.status;
    if (params.limit) queryParams['limit'] = params.limit;
    if (params.page) queryParams['page'] = params.page;
    if (params.categorySlug) queryParams['categorySlug'] = params.categorySlug;
    if (params.gender) queryParams['gender'] = params.gender;
    if (params.sort) queryParams['sort'] = params.sort;
    return this.api.get<ProductListResponse>('/products', queryParams);
  }

  getProductBySlug(slug: string): Observable<ProductDetail> {
    return this.api.get<ProductDetail>(`/products/by-slug/${slug}`);
  }

  getFeatured(limit = 8): Observable<ProductListResponse> {
    return this.getProducts({ status: 'ACTIVE', limit, page: 1 });
  }
}

import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FacetsResponse, SearchResponse } from '../models/search.model';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly api = inject(ApiService);

  search(q: string, limit = 6): Observable<SearchResponse> {
    return this.api.get<SearchResponse>('/search', { q, limit, page: 1 });
  }

  searchPlp(params: {
    categorySlug?: string;
    gender?: string;
    sizes?: string[];
    colorNames?: string[];
    brands?: string[];
    minPrice?: number;
    maxPrice?: number;
    onSale?: boolean;
    sort?: string;
    page?: number;
    limit?: number;
  }): Observable<SearchResponse> {
    const query: Record<string, string | number | boolean | string[]> = {};
    if (params.categorySlug)       query['categorySlug'] = params.categorySlug;
    if (params.gender)             query['gender']       = params.gender;
    if (params.sizes?.length)      query['sizes']        = params.sizes;
    if (params.colorNames?.length) query['colorNames']   = params.colorNames;
    if (params.brands?.length)     query['brands']       = params.brands;
    if (params.minPrice !== undefined) query['minPrice'] = params.minPrice;
    if (params.maxPrice !== undefined) query['maxPrice'] = params.maxPrice;
    if (params.onSale)  query['onSale'] = true;
    if (params.sort)    query['sort']   = params.sort;
    if (params.page)    query['page']   = params.page;
    if (params.limit)   query['limit']  = params.limit;
    return this.api.get<SearchResponse>('/search', query);
  }

  getFacets(params: {
    categorySlug?: string;
    gender?: string;
    sizes?: string[];
    colorNames?: string[];
    brands?: string[];
    minPrice?: number;
    maxPrice?: number;
  }): Observable<FacetsResponse> {
    const query: Record<string, string | number | boolean | string[]> = {};
    if (params.categorySlug) query['categorySlug'] = params.categorySlug;
    if (params.gender)       query['gender']       = params.gender;
    if (params.sizes?.length)      query['sizes']      = params.sizes;
    if (params.colorNames?.length) query['colorNames'] = params.colorNames;
    if (params.brands?.length)     query['brands']     = params.brands;
    if (params.minPrice !== undefined) query['minPrice'] = params.minPrice;
    if (params.maxPrice !== undefined) query['maxPrice'] = params.maxPrice;
    return this.api.get<FacetsResponse>('/search/facets', query);
  }
}

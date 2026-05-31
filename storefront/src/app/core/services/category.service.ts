import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CacheService } from './cache.service';
import { Category, GenderNavTree, NavTree } from '../models/category.model';

const NAV_TREE_TTL = 5 * 60_000;   // 5 min — invalidated by admin writes, not user browsing
const CATEGORY_TTL = 2 * 60_000;   // 2 min

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly api = inject(ApiService);
  private readonly cache = inject(CacheService);

  getAll(): Observable<Category[]> {
    return this.cache.get('categories:all', () => this.api.get<Category[]>('/categories'), CATEGORY_TTL);
  }

  getBySlug(slug: string): Observable<Category> {
    return this.cache.get(
      `categories:slug:${slug}`,
      () => this.api.get<Category>(`/categories/by-slug/${slug}`),
      CATEGORY_TTL,
    );
  }

  getNavTreeByGender(gender: 'MEN' | 'WOMEN' | 'KIDS'): Observable<GenderNavTree> {
    return this.cache.get(
      `nav-tree:gender:${gender}`,
      () => this.api.get<GenderNavTree>('/categories/nav/tree', { gender }),
      NAV_TREE_TTL,
    );
  }

  getNavTree(): Observable<NavTree> {
    return this.cache.get('nav-tree', () => this.api.get<NavTree>('/categories/nav/tree'), NAV_TREE_TTL);
  }
}

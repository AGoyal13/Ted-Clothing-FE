import { computed, inject, Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService } from './api.service';
import { CacheService } from './cache.service';
import { Category, NavCategory, NavTreeResponse } from '../models/category.model';

const NAV_TREE_TTL = 5 * 60_000;
const CATEGORY_TTL = 2 * 60_000;

const EMPTY_NAV_TREE: NavTreeResponse = {
  categories: [],
  byGender: { WOMEN: [], MEN: [], KIDS: [] },
};

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly api   = inject(ApiService);
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

  getNavTree(): Observable<NavTreeResponse> {
    return this.cache.get(
      'nav-tree',
      () => this.api.get<NavTreeResponse>('/categories/nav/tree'),
      NAV_TREE_TTL,
    );
  }

  // null = still loading | NavTreeResponse = loaded (or error fallback)
  readonly navTree = toSignal(
    this.getNavTree().pipe(catchError(() => of(EMPTY_NAV_TREE))),
    { initialValue: null },
  );

  // Flat NavCategory[] for navbar / home grid — empty until navTree loads
  readonly navCategories = computed<NavCategory[]>(() => this.navTree()?.categories ?? []);

  // slug → { cat, parent } lookup — built once when navTree loads, O(1) reads after
  readonly navTreeMap = computed(() => {
    const map = new Map<string, { cat: NavCategory; parent: NavCategory | null }>();
    const walk = (nodes: NavCategory[], parent: NavCategory | null) => {
      for (const node of nodes) {
        map.set(node.slug, { cat: node, parent });
        if (node.children?.length) walk(node.children, node);
      }
    };
    walk(this.navCategories(), null);
    return map;
  });
}

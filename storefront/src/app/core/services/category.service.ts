import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Category, GenderNavTree, NavTree } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly api = inject(ApiService);

  getAll(): Observable<Category[]> {
    return this.api.get<Category[]>('/categories');
  }

  getBySlug(slug: string): Observable<Category> {
    return this.api.get<Category>(`/categories/by-slug/${slug}`);
  }

  getNavTreeByGender(gender: 'MEN' | 'WOMEN' | 'KIDS'): Observable<GenderNavTree> {
    return this.api.get<GenderNavTree>('/categories/nav/tree', { gender });
  }

  getNavTree(): Observable<NavTree> {
    return this.api.get<NavTree>('/categories/nav/tree');
  }
}

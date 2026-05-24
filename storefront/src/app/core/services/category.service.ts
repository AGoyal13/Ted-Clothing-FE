import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Category, NavTree } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly api = inject(ApiService);

  getAll(): Observable<Category[]> {
    return this.api.get<Category[]>('/categories');
  }

  getNavTree(gender?: 'MEN' | 'WOMEN' | 'KIDS'): Observable<NavTree> {
    const params: Record<string, string> = {};
    if (gender) params['gender'] = gender;
    return this.api.get<NavTree>('/categories/nav/tree', params);
  }
}

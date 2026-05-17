import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ProductDialogComponent } from './product-dialog.component';
import { DecimalPipe } from '@angular/common';

interface Category {
  id: string;
  name: string;
  slug: string;
  parent: { id: string; name: string } | null;
  children: { id: string; name: string; slug: string }[];
}

export interface Product {
  id: string;
  title: string;
  description: string;
  slug: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  basePrice: number;
  discountPercent: number;
  category: { id: string; name: string };
  _count: { skus: number };
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    MatTableModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatCardModule, MatChipsModule, MatProgressBarModule, MatSnackBarModule,
    MatBadgeModule, MatSelectModule, MatPaginatorModule, FormsModule, DecimalPipe,
  ],
  template: `
    <div class="page-header">
      <h1>Products</h1>
      <button mat-flat-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon> New Product
      </button>
    </div>

    <div class="filters">
      <mat-select [(ngModel)]="statusFilter" (ngModelChange)="page.set(1); load()" placeholder="All statuses">
        <mat-option value="">All statuses</mat-option>
        <mat-option value="DRAFT">Draft</mat-option>
        <mat-option value="ACTIVE">Active</mat-option>
        <mat-option value="ARCHIVED">Archived</mat-option>
      </mat-select>

      <mat-select [(ngModel)]="selectedParent" (ngModelChange)="onParentChange()" placeholder="All categories">
        <mat-option value="">All categories</mat-option>
        @for (c of parentCategories(); track c.id) {
          <mat-option [value]="c.slug">{{ c.name }}</mat-option>
        }
      </mat-select>

      @if (childCategories().length) {
        <mat-select [(ngModel)]="selectedChild" (ngModelChange)="page.set(1); load()" placeholder="All sub-categories">
          <mat-option value="">All sub-categories</mat-option>
          @for (c of childCategories(); track c.id) {
            <mat-option [value]="c.slug">{{ c.name }}</mat-option>
          }
        </mat-select>
      }
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    <mat-card>
      <div class="table-wrap">
      <table mat-table [dataSource]="products()" class="full-width">
        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef>Product</th>
          <td mat-cell *matCellDef="let p">
            <strong>{{ p.title }}</strong>
            <br /><code>{{ p.slug }}</code>
          </td>
        </ng-container>
        <ng-container matColumnDef="category">
          <th mat-header-cell *matHeaderCellDef>Category</th>
          <td mat-cell *matCellDef="let p">{{ p.category.name }}</td>
        </ng-container>
        <ng-container matColumnDef="price">
          <th mat-header-cell *matHeaderCellDef>Price</th>
          <td mat-cell *matCellDef="let p">
            ₹{{ p.basePrice | number:'1.0-0' }}
            @if (p.discountPercent > 0) {
              <span class="discount">-{{ p.discountPercent }}%</span>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let p">
            <span [class]="'status-badge status-' + p.status.toLowerCase()">{{ p.status }}</span>
          </td>
        </ng-container>
        <ng-container matColumnDef="skus">
          <th mat-header-cell *matHeaderCellDef>SKUs</th>
          <td mat-cell *matCellDef="let p">{{ p._count.skus }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let p">
            <button mat-icon-button title="Manage" (click)="go(p)"><mat-icon>open_in_new</mat-icon></button>
            <button mat-icon-button title="Edit" (click)="openEdit(p)"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button color="warn" title="Delete" (click)="delete(p)"><mat-icon>delete</mat-icon></button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>
      </div>
      <mat-paginator
        [length]="total()"
        [pageSize]="pageSize"
        [pageIndex]="page() - 1"
        [pageSizeOptions]="[20, 50, 100]"
        (page)="onPage($event)"
        showFirstLastButtons>
      </mat-paginator>
    </mat-card>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
    h1 { margin: 0; }
    .filters { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; align-items: center; }
    .filters mat-select { width: 180px; }
    .full-width { width: 100%; min-width: 640px; }
    code { font-size: 11px; color: #666; }
    .discount { color: #e53935; font-size: 12px; margin-left: 4px; }
    .status-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .status-draft { background: #fff9c4; color: #f57f17; }
    .status-active { background: #e8f5e9; color: #2e7d32; }
    .status-archived { background: #fce4ec; color: #c62828; }
  `],
})
export class ProductsComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  cols = ['title', 'category', 'price', 'status', 'skus', 'actions'];
  products = signal<Product[]>([]);
  loading = signal(false);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  statusFilter = '';
  selectedParent = '';
  selectedChild = '';

  allCategories = signal<Category[]>([]);
  parentCategories = computed(() => this.allCategories().filter(c => !c.parent));
  childCategories = computed(() => {
    if (!this.selectedParent) return [];
    const parent = this.allCategories().find(c => c.slug === this.selectedParent);
    return parent?.children ?? [];
  });

  ngOnInit() {
    this.loadCategories();
    this.load();
  }

  loadCategories() {
    this.api.get<Category[]>('categories').subscribe({
      next: (cats) => this.allCategories.set(cats),
    });
  }

  onParentChange() {
    this.selectedChild = '';
    this.page.set(1);
    this.load();
  }

  load() {
    this.loading.set(true);
    const params: Record<string, string> = {
      page: String(this.page()),
      limit: String(this.pageSize),
    };
    if (this.statusFilter) params['status'] = this.statusFilter;
    // child takes precedence; fall back to parent slug if no child selected
    const catSlug = this.selectedChild || this.selectedParent;
    if (catSlug) params['categorySlug'] = catSlug;

    this.api.get<{ items: Product[]; total: number }>('products', params).subscribe({
      next: (data) => { this.products.set(data.items); this.total.set(data.total); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onPage(e: PageEvent) {
    this.pageSize = e.pageSize;
    this.page.set(e.pageIndex + 1);
    this.load();
  }

  go(p: Product) { this.router.navigate(['/products', p.id]); }

  openCreate() {
    this.dialog.open(ProductDialogComponent, { width: '480px', maxWidth: '95vw', data: {} })
      .afterClosed().subscribe(r => { if (r) this.load(); });
  }

  openEdit(p: Product) {
    this.dialog.open(ProductDialogComponent, { width: '480px', maxWidth: '95vw', data: { product: p } })
      .afterClosed().subscribe(r => { if (r) this.load(); });
  }

  delete(p: Product) {
    if (!confirm(`Delete "${p.title}"? This will remove all its SKUs.`)) return;
    this.api.delete(`products/${p.id}`).subscribe({
      next: () => { this.snack.open('Deleted', '', { duration: 2000 }); this.load(); },
      error: (e) => this.snack.open(e?.error?.error?.message ?? 'Delete failed', '', { duration: 3000 }),
    });
  }
}

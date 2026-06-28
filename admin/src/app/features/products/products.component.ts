import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
  gender: 'MEN' | 'WOMEN' | 'KIDS' | 'UNISEX';
  basePrice: number;
  discountPercent: number;
  category: { id: string; name: string };
  brand?: { id: string; name: string; slug: string } | null;
  _count: { skus: number };
}

interface BrandOption { id: string; name: string; }

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    MatTableModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatCardModule, MatChipsModule, MatProgressBarModule, MatSnackBarModule,
    MatBadgeModule, MatSelectModule, MatPaginatorModule, MatCheckboxModule,
    MatTooltipModule, MatProgressSpinnerModule, FormsModule, DecimalPipe,
  ],
  template: `
    <div class="page-header">
      <h1>Products</h1>
      <div class="header-actions">
        <button mat-stroked-button (click)="reindexSearch()" [disabled]="reindexing()"
          matTooltip="Rebuild the storefront search index from the database. Use if PLP stock/price looks stale vs the product detail.">
          @if (reindexing()) {
            <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
          } @else {
            <mat-icon>sync</mat-icon>
          }
          Reindex Search
        </button>
        <button mat-flat-button color="primary" (click)="openCreate()">
          <mat-icon>add</mat-icon> New Product
        </button>
      </div>
    </div>

    <div class="filters">
      <input class="search-input" type="search" [(ngModel)]="searchTerm"
        (ngModelChange)="onSearchChange()" placeholder="Search products by name…" aria-label="Search products by name" />

      <mat-select [(ngModel)]="statusFilter" (ngModelChange)="page.set(1); pushParams(); load()" placeholder="All statuses">
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
        <mat-select [(ngModel)]="selectedChild" (ngModelChange)="page.set(1); pushParams(); load()" placeholder="All sub-categories">
          <mat-option value="">All sub-categories</mat-option>
          @for (c of childCategories(); track c.id) {
            <mat-option [value]="c.slug">{{ c.name }}</mat-option>
          }
        </mat-select>
      }

      <mat-select [(ngModel)]="brandFilter" (ngModelChange)="page.set(1); pushParams(); load()" placeholder="All brands">
        <mat-option value="">All brands</mat-option>
        @for (b of brands(); track b.id) {
          <mat-option [value]="b.id">{{ b.name }}</mat-option>
        }
      </mat-select>
    </div>

    <!-- Bulk action bar -->
    @if (selectedIds().size > 0) {
      <div class="bulk-bar">
        <span class="bulk-bar__count">{{ selectedIds().size }} selected</span>
        <button mat-flat-button color="primary" (click)="bulkSetStatus('ACTIVE')" [disabled]="bulkLoading()">
          <mat-icon>check_circle</mat-icon> Set Active
        </button>
        <button mat-flat-button (click)="bulkSetStatus('DRAFT')" [disabled]="bulkLoading()">
          <mat-icon>edit_note</mat-icon> Set Draft
        </button>
        <button mat-icon-button matTooltip="Clear selection" (click)="clearSelection()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    }

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    <mat-card>
      <div class="table-wrap">
      <table mat-table [dataSource]="products()" class="full-width">

        <!-- Checkbox column -->
        <ng-container matColumnDef="select">
          <th mat-header-cell *matHeaderCellDef>
            <mat-checkbox
              [checked]="allSelected()"
              [indeterminate]="someSelected()"
              (change)="toggleAll($event.checked)"
            />
          </th>
          <td mat-cell *matCellDef="let p" (click)="$event.stopPropagation()">
            <mat-checkbox
              [checked]="selectedIds().has(p.id)"
              (change)="toggleOne(p.id)"
            />
          </td>
        </ng-container>

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
        <ng-container matColumnDef="brand">
          <th mat-header-cell *matHeaderCellDef>Brand</th>
          <td mat-cell *matCellDef="let p">{{ p.brand?.name || '—' }}</td>
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
          <td mat-cell *matCellDef="let p">
            @if (p._count.skus === 0) {
              <span class="badge-no-skus" matTooltip="This product has no SKUs — it will appear on the storefront but cannot be wishlisted or carted">No SKUs</span>
            } @else {
              {{ p._count.skus }}
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let p">
            <button mat-icon-button title="Manage" (click)="go(p); $event.stopPropagation()"><mat-icon>open_in_new</mat-icon></button>
            <button mat-icon-button title="Edit" (click)="openEdit(p); $event.stopPropagation()"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button color="warn" title="Delete" (click)="delete(p); $event.stopPropagation()"><mat-icon>delete</mat-icon></button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"
            [class.row-selected]="selectedIds().has(row.id)"
            (click)="toggleOne(row.id)">
        </tr>
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
    .header-actions { display: flex; align-items: center; gap: 8px; }
    h1 { margin: 0; }
    .filters { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; align-items: center; }
    .filters mat-select { width: 180px; }
    .search-input { width: 240px; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; font: inherit; }
    .search-input:focus { outline: none; border-color: #3f51b5; }
    .full-width { width: 100%; min-width: 640px; }
    code { font-size: 11px; color: #666; }
    .discount { color: #e53935; font-size: 12px; margin-left: 4px; }
    .status-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .badge-no-skus { background: #fff3cd; color: #856404; border: 1px solid #ffc107; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; cursor: default; }
    .status-draft { background: #fff9c4; color: #f57f17; }
    .status-active { background: #e8f5e9; color: #2e7d32; }
    .status-archived { background: #fce4ec; color: #c62828; }
    .bulk-bar {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      background: #e3f2fd; border: 1px solid #90caf9; border-radius: 6px;
      padding: 8px 12px; margin-bottom: 12px;
    }
    .bulk-bar__count { font-weight: 600; font-size: 13px; margin-right: 4px; flex: 1; }
    .row-selected { background: #f3f8ff; }
    mat-row { cursor: pointer; }
  `],
})
export class ProductsComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  cols = ['select', 'title', 'category', 'brand', 'price', 'status', 'skus', 'actions'];
  products = signal<Product[]>([]);
  loading = signal(false);
  bulkLoading = signal(false);
  reindexing = signal(false);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  statusFilter = '';
  selectedParent = '';
  selectedChild = '';
  brandFilter = '';
  searchTerm = '';
  brands = signal<BrandOption[]>([]);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  selectedIds = signal<Set<string>>(new Set());

  allSelected = computed(() => {
    const ids = this.selectedIds();
    const prods = this.products();
    return prods.length > 0 && prods.every(p => ids.has(p.id));
  });

  someSelected = computed(() => {
    const ids = this.selectedIds();
    const prods = this.products();
    return prods.some(p => ids.has(p.id)) && !this.allSelected();
  });

  allCategories = signal<Category[]>([]);
  parentCategories = computed(() => this.allCategories().filter(c => !c.parent));
  childCategories = computed(() => {
    if (!this.selectedParent) return [];
    const parent = this.allCategories().find(c => c.slug === this.selectedParent);
    return parent?.children ?? [];
  });

  ngOnInit() {
    const q = this.route.snapshot.queryParamMap;
    this.statusFilter = q.get('status') ?? '';
    this.selectedParent = q.get('parent') ?? '';
    this.selectedChild = q.get('cat') ?? '';
    this.searchTerm = q.get('q') ?? '';
    this.brandFilter = q.get('brand') ?? '';
    this.page.set(Number(q.get('page') ?? '1'));
    this.loadCategories();
    this.loadBrands();
    this.load();
  }

  loadCategories() {
    this.api.get<Category[]>('categories').subscribe({
      next: (cats) => this.allCategories.set(cats),
    });
  }

  loadBrands() {
    this.api.get<BrandOption[]>('brands').subscribe({
      next: (b) => this.brands.set(b),
    });
  }

  pushParams() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: this.statusFilter || null,
        parent: this.selectedParent || null,
        cat: this.selectedChild || null,
        brand: this.brandFilter || null,
        q: this.searchTerm.trim() || null,
        page: this.page() > 1 ? this.page() : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onParentChange() {
    this.selectedChild = '';
    this.page.set(1);
    this.pushParams();
    this.load();
  }

  // Debounce keystrokes so we don't fire a request per character.
  onSearchChange() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.pushParams();
      this.load();
    }, 350);
  }

  load(bustCache = false) {
    this.loading.set(true);
    this.selectedIds.set(new Set());
    const params: Record<string, string> = {
      page: String(this.page()),
      limit: String(this.pageSize),
    };
    if (this.statusFilter) params['status'] = this.statusFilter;
    const catSlug = this.selectedChild || this.selectedParent;
    if (catSlug) params['categorySlug'] = catSlug;
    if (this.brandFilter) params['brandId'] = this.brandFilter;
    if (this.searchTerm.trim()) params['search'] = this.searchTerm.trim();
    if (bustCache) params['_t'] = String(Date.now());

    this.api.get<{ items: Product[]; total: number }>('products', params).subscribe({
      next: (data) => { this.products.set(data.items); this.total.set(data.total); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  toggleOne(id: string) {
    this.selectedIds.update(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  toggleAll(checked: boolean) {
    this.selectedIds.set(checked ? new Set(this.products().map(p => p.id)) : new Set());
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  bulkSetStatus(status: 'ACTIVE' | 'DRAFT') {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.bulkLoading.set(true);
    this.api.patch<{ updated: number }>('products/bulk-status', { ids, status }).subscribe({
      next: (res) => {
        this.snack.open(`${res.updated} product${res.updated === 1 ? '' : 's'} set to ${status}`, '', { duration: 3000 });
        this.bulkLoading.set(false);
        this.load(true);
      },
      error: (e) => {
        this.snack.open(e?.error?.error?.message ?? 'Bulk update failed', '', { duration: 3000 });
        this.bulkLoading.set(false);
      },
    });
  }

  onPage(e: PageEvent) {
    this.pageSize = e.pageSize;
    this.page.set(e.pageIndex + 1);
    this.pushParams();
    this.load();
  }

  go(p: Product) { this.router.navigate(['/products', p.id]); }

  openCreate() {
    this.dialog.open(ProductDialogComponent, { width: '480px', maxWidth: '95vw', data: {} })
      .afterClosed().subscribe((r: { id?: string } | undefined) => {
        // Newly-created product → jump straight to its detail page to add images/SKUs.
        if (r?.id) this.router.navigate(['/products', r.id]);
      });
  }

  // Rebuild the storefront Meilisearch index from the DB. Fixes stale PLP data
  // (e.g. stock/price that diverged from the product detail page).
  reindexSearch() {
    if (this.reindexing()) return;
    this.reindexing.set(true);
    this.api.post<{ indexed: number }>('search/reindex', {}).subscribe({
      next: res => {
        this.reindexing.set(false);
        this.snack.open(`Search reindexed — ${res.indexed} products refreshed`, 'OK', { duration: 4000 });
      },
      error: err => {
        this.reindexing.set(false);
        this.snack.open(err?.error?.error?.message ?? 'Reindex failed', 'OK', { duration: 5000 });
      },
    });
  }

  openEdit(p: Product) {
    this.dialog.open(ProductDialogComponent, { width: '480px', maxWidth: '95vw', data: { product: p } })
      .afterClosed().subscribe(r => { if (r) this.load(true); });
  }

  delete(p: Product) {
    if (!confirm(`Delete "${p.title}"? This will remove all its SKUs.`)) return;
    this.api.delete(`products/${p.id}`).subscribe({
      next: () => { this.snack.open('Deleted', '', { duration: 2000 }); this.load(true); },
      error: (e) => this.snack.open(e?.error?.error?.message ?? 'Delete failed', '', { duration: 3000 }),
    });
  }
}

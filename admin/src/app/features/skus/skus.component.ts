import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ApiService } from '../../core/services/api.service';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

interface SkuRow {
  id: string;
  skuCode: string;
  sizeLabel: string;
  stockQty: number;
  priceOverride: number | null;
  product: { id: string; title: string };
  color: { colorName: string; colorHex: string | null };
}

interface SkuPage { total: number; page: number; limit: number; items: SkuRow[]; }

@Component({
  selector: 'app-skus',
  standalone: true,
  imports: [
    FormsModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatProgressBarModule, MatPaginatorModule,
  ],
  template: `
    <div class="page-header">
      <h1>Inventory</h1>
      <span class="total-label">{{ total() }} SKUs</span>
    </div>

    <mat-card class="filters-card">
      <div class="filter-row">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search by product name</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [ngModel]="searchText" (ngModelChange)="onSearch($event)" placeholder="e.g. Slim Fit Jeans" />
        </mat-form-field>
        <button mat-stroked-button [class.filter-active]="lowStockOnly()" (click)="toggleLowStock()">
          <mat-icon>warning_amber</mat-icon>
          Low Stock (&lt; 10)
        </button>
      </div>
    </mat-card>

    @if (loading()) { <mat-progress-bar mode="indeterminate" class="progress" /> }

    <div class="table-wrap">
      <table mat-table [dataSource]="rows()" class="full-table">

        <ng-container matColumnDef="product">
          <th mat-header-cell *matHeaderCellDef>Product</th>
          <td mat-cell *matCellDef="let r">
            <a [routerLink]="['/products', r.product.id]" class="product-link">{{ r.product.title }}</a>
          </td>
        </ng-container>

        <ng-container matColumnDef="color">
          <th mat-header-cell *matHeaderCellDef>Color</th>
          <td mat-cell *matCellDef="let r">
            <div class="color-cell">
              @if (r.color.colorHex) {
                <span class="color-dot" [style.background]="r.color.colorHex"></span>
              }
              {{ r.color.colorName }}
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="size">
          <th mat-header-cell *matHeaderCellDef>Size</th>
          <td mat-cell *matCellDef="let r">{{ r.sizeLabel }}</td>
        </ng-container>

        <ng-container matColumnDef="skuCode">
          <th mat-header-cell *matHeaderCellDef>SKU Code</th>
          <td mat-cell *matCellDef="let r"><code>{{ r.skuCode }}</code></td>
        </ng-container>

        <ng-container matColumnDef="stock">
          <th mat-header-cell *matHeaderCellDef>Stock</th>
          <td mat-cell *matCellDef="let r">
            <span [class]="'stock-badge ' + stockClass(r.stockQty)">{{ r.stockQty }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="priceOverride">
          <th mat-header-cell *matHeaderCellDef>Price Override</th>
          <td mat-cell *matCellDef="let r">{{ r.priceOverride != null ? ('₹' + r.priceOverride) : '—' }}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

      </table>

      @if (!loading() && rows().length === 0) {
        <p class="empty">No SKUs found.</p>
      }
    </div>

    <mat-paginator
      [length]="total()"
      [pageSize]="pageSize"
      [pageIndex]="page()"
      [pageSizeOptions]="[25, 50, 100]"
      (page)="onPage($event)"
      showFirstLastButtons>
    </mat-paginator>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    h1 { margin: 0; }
    .total-label { font-size: 13px; color: #777; }
    .filters-card { margin-bottom: 12px; padding: 8px; }
    .filter-row { display: flex; gap: 12px; align-items: center; padding: 8px; flex-wrap: wrap; }
    .search-field { flex: 1; min-width: 220px; }
    .filter-active { background: #e8eaf6; border-color: #3f51b5 !important; color: #3f51b5; }
    .progress { margin-bottom: 4px; }
    .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid #e0e0e0; border-radius: 4px; }
    .full-table { width: 100%; min-width: 600px; }
    .product-link { color: #3f51b5; text-decoration: none; font-weight: 500; }
    .product-link:hover { text-decoration: underline; }
    .color-cell { display: flex; align-items: center; gap: 8px; }
    .color-dot { display: inline-block; width: 14px; height: 14px; border-radius: 50%; border: 1px solid rgba(0,0,0,.15); flex-shrink: 0; }
    code { font-size: 11px; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
    .stock-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .stock-oos { background: #fce4ec; color: #c62828; }
    .stock-low { background: #fff8e1; color: #e65100; }
    .stock-ok  { background: #e8f5e9; color: #2e7d32; }
    .empty { text-align: center; color: #999; padding: 32px 0; }
    mat-paginator { border-top: 1px solid #e0e0e0; }
  `],
})
export class SkusComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private destroy$ = new Subject<void>();
  private search$ = new Subject<string>();

  searchText = '';
  lowStockOnly = signal(false);
  loading = signal(false);
  rows = signal<SkuRow[]>([]);
  total = signal(0);
  page = signal(0);
  pageSize = 50;

  displayedColumns = ['product', 'color', 'size', 'skuCode', 'stock', 'priceOverride'];

  ngOnInit() {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => { this.page.set(0); this.load(); });
    this.load();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  onSearch(v: string) { this.searchText = v; this.search$.next(v); }

  toggleLowStock() { this.lowStockOnly.update(v => !v); this.page.set(0); this.load(); }

  onPage(e: PageEvent) { this.page.set(e.pageIndex); this.pageSize = e.pageSize; this.load(); }

  load() {
    this.loading.set(true);
    const params: Record<string, string> = { page: String(this.page() + 1), limit: String(this.pageSize) };
    if (this.searchText.trim()) params['search'] = this.searchText.trim();
    if (this.lowStockOnly()) params['lowStock'] = '9';
    const qs = new URLSearchParams(params).toString();
    this.api.get<SkuPage>(`skus?${qs}`).subscribe({
      next: (r) => { this.rows.set(r.items); this.total.set(r.total); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  stockClass(qty: number): string {
    if (qty === 0) return 'stock-oos';
    if (qty < 10) return 'stock-low';
    return 'stock-ok';
  }
}

import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { CategoryDialogComponent } from './category-dialog.component';
import { SizeGuideDialogComponent } from './size-guide-dialog.component';

export type ProductGender = 'MEN' | 'WOMEN' | 'KIDS' | 'UNISEX';

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  gender?: ProductGender | null;
  imageUrl?: string | null;
  focalX?: number | null;
  focalY?: number | null;
  parent?: { id: string; name: string } | null;
  sizeGuide?: { id: string; name: string } | null;
  _count?: { products: number };
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    MatTableModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatCardModule, MatChipsModule, MatProgressBarModule, MatSnackBarModule,
    FormsModule, SizeGuideDialogComponent,
  ],
  template: `
    <div class="page-header">
      <h1>Categories</h1>
      <button mat-flat-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon> New Category
      </button>
    </div>

    <div class="filters">
      <input class="search-input" type="search" [ngModel]="searchTerm()"
        (ngModelChange)="searchTerm.set($event)" placeholder="Search categories by name…" aria-label="Search categories by name" />
      @if (searchTerm().trim()) {
        <span class="result-count">{{ filtered().length }} of {{ categories().length }}</span>
      }
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    <mat-card>
      <div class="table-wrap">
      <table mat-table [dataSource]="filtered()" class="full-width">
        <ng-container matColumnDef="image">
          <th mat-header-cell *matHeaderCellDef>Image</th>
          <td mat-cell *matCellDef="let c">
            @if (c.imageUrl) {
              <img [src]="c.imageUrl" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:4px;display:block;" />
            } @else {
              <span class="muted">—</span>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let c">{{ c.name }}</td>
        </ng-container>
        <ng-container matColumnDef="slug">
          <th mat-header-cell *matHeaderCellDef>Slug</th>
          <td mat-cell *matCellDef="let c"><code>{{ c.slug }}</code></td>
        </ng-container>
        <ng-container matColumnDef="parent">
          <th mat-header-cell *matHeaderCellDef>Parent</th>
          <td mat-cell *matCellDef="let c">{{ c.parent?.name ?? '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="gender">
          <th mat-header-cell *matHeaderCellDef>Gender</th>
          <td mat-cell *matCellDef="let c">{{ c.gender ?? '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="sizeGuide">
          <th mat-header-cell *matHeaderCellDef>Size Guide</th>
          <td mat-cell *matCellDef="let c">
            @if (c.sizeGuide) {
              <mat-chip-set><mat-chip color="accent">{{ c.sizeGuide.name }}</mat-chip></mat-chip-set>
            } @else {
              <span class="muted">None</span>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let c">
            <button mat-icon-button title="Edit" (click)="openEdit(c)"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button title="Size Guide" (click)="openSizeGuide(c)"><mat-icon>table_chart</mat-icon></button>
            <button mat-icon-button color="warn" title="Delete" (click)="delete(c)"><mat-icon>delete</mat-icon></button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>
      </div>
      @if (!loading() && filtered().length === 0) {
        <div class="empty">{{ searchTerm().trim() ? 'No categories match your search.' : 'No categories yet.' }}</div>
      }
    </mat-card>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
    h1 { margin: 0; }
    .filters { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .search-input { width: 240px; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; font: inherit; }
    .search-input:focus { outline: none; border-color: #3f51b5; }
    .result-count { font-size: 13px; color: #777; }
    .empty { padding: 2rem; text-align: center; color: #999; }
    .full-width { width: 100%; min-width: 580px; }
    .muted { color: #999; font-size: 13px; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    table { margin-top: 0; }
  `],
})
export class CategoriesComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  cols = ['image', 'name', 'slug', 'parent', 'gender', 'sizeGuide', 'actions'];
  categories = signal<Category[]>([]);
  loading = signal(false);
  searchTerm = signal('');

  // Case-insensitive name filter over the already-loaded flat list (no pagination,
  // so client-side is instant and needs no backend/storefront change).
  filtered = computed(() => {
    const t = this.searchTerm().trim().toLowerCase();
    const list = this.categories();
    return t ? list.filter(c => c.name.toLowerCase().includes(t)) : list;
  });

  ngOnInit() { this.load(); }

  load(bustCache = false) {
    this.loading.set(true);
    const params = bustCache ? { _t: String(Date.now()) } : undefined;
    this.api.get<Category[]>('categories', params).subscribe({
      next: (data) => { this.categories.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.dialog.open(CategoryDialogComponent, { width: '400px', maxWidth: '95vw', data: { categories: this.categories() } })
      .afterClosed().subscribe(result => { if (result) this.load(true); });
  }

  openEdit(cat: Category) {
    this.dialog.open(CategoryDialogComponent, { width: '400px', maxWidth: '95vw', data: { category: cat, categories: this.categories() } })
      .afterClosed().subscribe(result => { if (result) this.load(true); });
  }

  openSizeGuide(cat: Category) {
    this.dialog.open(SizeGuideDialogComponent, { width: '700px', maxWidth: '95vw', data: { category: cat } })
      .afterClosed().subscribe(result => { if (result) this.load(true); });
  }

  delete(cat: Category) {
    const productCount = cat._count?.products ?? 0;
    const productWarning = productCount > 0
      ? `\n\n⚠️ ${productCount} product${productCount === 1 ? '' : 's'} belong to this category and will need to be reassigned.`
      : '';
    if (!confirm(`Delete "${cat.name}"?${productWarning}`)) return;
    this.api.delete(`categories/${cat.id}`).subscribe({
      next: () => { this.snack.open('Deleted', '', { duration: 2000 }); this.load(true); },
      error: (e) => this.snack.open(e?.error?.error?.message ?? 'Delete failed', '', { duration: 3000 }),
    });
  }
}

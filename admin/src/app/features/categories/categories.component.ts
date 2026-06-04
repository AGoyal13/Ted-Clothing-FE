import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule as RF } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { CategoryDialogComponent } from './category-dialog.component';
import { SizeTemplateDialogComponent } from './size-template-dialog.component';

export type ProductGender = 'MEN' | 'WOMEN' | 'KIDS' | 'UNISEX';

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  gender?: ProductGender | null;
  parent?: { id: string; name: string } | null;
  sizeTemplate?: { measurements: string[]; sizes: string[] } | null;
  _count?: { products: number };
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    MatTableModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatCardModule, MatChipsModule, MatProgressBarModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-header">
      <h1>Categories</h1>
      <button mat-flat-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon> New Category
      </button>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    <mat-card>
      <div class="table-wrap">
      <table mat-table [dataSource]="categories()" class="full-width">
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
        <ng-container matColumnDef="sizeTemplate">
          <th mat-header-cell *matHeaderCellDef>Size Template</th>
          <td mat-cell *matCellDef="let c">
            @if (c.sizeTemplate) {
              <mat-chip-set>
                @for (s of c.sizeTemplate.sizes; track s) {
                  <mat-chip>{{ s }}</mat-chip>
                }
              </mat-chip-set>
            } @else {
              <span class="muted">None</span>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let c">
            <button mat-icon-button title="Edit" (click)="openEdit(c)"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button title="Size Template" (click)="openSizeTemplate(c)"><mat-icon>straighten</mat-icon></button>
            <button mat-icon-button color="warn" title="Delete" (click)="delete(c)"><mat-icon>delete</mat-icon></button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>
      </div>
    </mat-card>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
    h1 { margin: 0; }
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

  cols = ['name', 'slug', 'parent', 'gender', 'sizeTemplate', 'actions'];
  categories = signal<Category[]>([]);
  loading = signal(false);

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

  openSizeTemplate(cat: Category) {
    this.dialog.open(SizeTemplateDialogComponent, { width: '500px', maxWidth: '95vw', data: { category: cat } })
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

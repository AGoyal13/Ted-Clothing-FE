import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ColorDialogComponent } from './color-dialog.component';
import { GenerateSkusDialogComponent } from '../skus/generate-skus-dialog.component';

interface ProductColor { id: string; colorName: string; colorHex: string | null; images: string[]; }
interface Sku { id: string; skuCode: string; sizeLabel: string; stockQty: number; priceOverride: number | null; color: { colorName: string; colorHex: string | null }; }
interface ProductDetail { id: string; title: string; slug: string; status: string; basePrice: number; discountPercent: number; description: string; category: { name: string }; colors: ProductColor[]; }

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule, FormsModule,
    MatTabsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatInputModule, MatChipsModule,
    MatProgressBarModule, MatSnackBarModule, MatSelectModule, MatDialogModule, DecimalPipe,
  ],
  template: `
    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
    @if (product()) {
      <div class="page-header">
        <div>
          <button mat-icon-button (click)="router.navigate(['/products'])"><mat-icon>arrow_back</mat-icon></button>
          <h1>{{ product()!.title }}</h1>
          <span [class]="'status-badge status-' + product()!.status.toLowerCase()">{{ product()!.status }}</span>
        </div>
        <div class="header-actions">
          <span class="price">₹{{ product()!.basePrice | number:'1.0-0' }}</span>
          <span class="category">{{ product()!.category.name }}</span>
        </div>
      </div>

      <mat-tab-group>
        <!-- COLORS TAB -->
        <mat-tab label="Colors & Images">
          <div class="tab-content">
            <div class="tab-header">
              <h3>Colors ({{ product()!.colors.length }})</h3>
              <button mat-flat-button color="primary" (click)="openAddColor()">
                <mat-icon>palette</mat-icon> Add Color
              </button>
            </div>
            <div class="colors-grid">
              @for (color of product()!.colors; track color.id) {
                <mat-card class="color-card">
                  <mat-card-header>
                    <div class="color-swatch" [style.background]="color.colorHex || '#ccc'"></div>
                    <mat-card-title>{{ color.colorName }}</mat-card-title>
                    <mat-card-subtitle>{{ color.images.length }} image(s)</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-actions>
                    <button mat-button (click)="openEditColor(color)"><mat-icon>edit</mat-icon> Edit</button>
                    <button mat-button color="warn" (click)="deleteColor(color)"><mat-icon>delete</mat-icon></button>
                  </mat-card-actions>
                </mat-card>
              }
            </div>
          </div>
        </mat-tab>

        <!-- SKUs TAB -->
        <mat-tab label="SKUs ({{ skus().length }})">
          <div class="tab-content">
            <div class="tab-header">
              <h3>SKUs</h3>
              <button mat-flat-button color="primary" (click)="openGenerateSkus()" [disabled]="!product()!.colors.length">
                <mat-icon>auto_awesome</mat-icon> Generate SKUs
              </button>
            </div>
            @if (skus().length) {
              <div class="table-wrap">
              <table mat-table [dataSource]="skus()" class="full-width">
                <ng-container matColumnDef="skuCode">
                  <th mat-header-cell *matHeaderCellDef>SKU Code</th>
                  <td mat-cell *matCellDef="let s"><code>{{ s.skuCode }}</code></td>
                </ng-container>
                <ng-container matColumnDef="color">
                  <th mat-header-cell *matHeaderCellDef>Color</th>
                  <td mat-cell *matCellDef="let s">
                    <div class="color-inline">
                      <span class="dot" [style.background]="s.color.colorHex || '#ccc'"></span>
                      {{ s.color.colorName }}
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="size">
                  <th mat-header-cell *matHeaderCellDef>Size</th>
                  <td mat-cell *matCellDef="let s">{{ s.sizeLabel }}</td>
                </ng-container>
                <ng-container matColumnDef="stock">
                  <th mat-header-cell *matHeaderCellDef>Stock</th>
                  <td mat-cell *matCellDef="let s; let i = index">
                    <input class="stock-input" type="number" [(ngModel)]="skuEdits[i].stockQty" min="0" />
                  </td>
                </ng-container>
                <ng-container matColumnDef="priceOverride">
                  <th mat-header-cell *matHeaderCellDef>Price Override</th>
                  <td mat-cell *matCellDef="let s; let i = index">
                    <input class="stock-input" type="number" [(ngModel)]="skuEdits[i].priceOverride" min="0" placeholder="—" />
                  </td>
                </ng-container>
                <ng-container matColumnDef="save">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let s; let i = index">
                    <button mat-icon-button color="primary" title="Save" (click)="saveSku(s, i)"><mat-icon>save</mat-icon></button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="skuCols"></tr>
                <tr mat-row *matRowDef="let row; columns: skuCols;"></tr>
              </table>
              </div>
            } @else {
              <p class="muted">No SKUs yet. Add colors first, then generate SKUs.</p>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; gap: 8px; }
    .page-header > div { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    h1 { margin: 0; font-size: 20px; }
    .header-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .price { font-size: 20px; font-weight: 700; }
    .category { font-size: 13px; color: #666; }
    .tab-content { padding: 20px 0; }
    .tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .tab-header h3 { margin: 0; }
    .colors-grid { display: flex; flex-wrap: wrap; gap: 16px; }
    .color-card { width: 200px; }
    mat-card-header { display: flex; align-items: center; gap: 10px; }
    .color-swatch { width: 32px; height: 32px; border-radius: 50%; border: 2px solid #ddd; flex-shrink: 0; }
    .full-width { width: 100%; min-width: 580px; }
    code { font-size: 11px; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
    .color-inline { display: flex; align-items: center; gap: 6px; }
    .dot { width: 14px; height: 14px; border-radius: 50%; border: 1px solid #ddd; flex-shrink: 0; }
    .stock-input { width: 80px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .muted { color: #999; font-style: italic; }
    .status-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .status-draft { background: #fff9c4; color: #f57f17; }
    .status-active { background: #e8f5e9; color: #2e7d32; }
    .status-archived { background: #fce4ec; color: #c62828; }
  `],
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  router = inject(Router);

  product = signal<ProductDetail | null>(null);
  skus = signal<Sku[]>([]);
  skuEdits: { stockQty: number; priceOverride: number | null }[] = [];
  loading = signal(false);
  skuCols = ['skuCode', 'color', 'size', 'stock', 'priceOverride', 'save'];

  ngOnInit() { this.loadProduct(); }

  loadProduct() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loading.set(true);
    this.api.get<ProductDetail>(`products/${id}`).subscribe({
      next: (p) => { this.product.set(p); this.loading.set(false); this.loadSkus(); },
      error: () => this.loading.set(false),
    });
  }

  loadSkus() {
    const id = this.product()!.id;
    this.api.get<Sku[]>(`products/${id}/skus`).subscribe(skus => {
      this.skus.set(skus);
      this.skuEdits = skus.map(s => ({ stockQty: s.stockQty, priceOverride: s.priceOverride }));
    });
  }

  openAddColor() {
    this.dialog.open(ColorDialogComponent, { width: '440px', maxWidth: '95vw', data: { productId: this.product()!.id } })
      .afterClosed().subscribe(r => { if (r) this.loadProduct(); });
  }

  openEditColor(color: ProductColor) {
    this.dialog.open(ColorDialogComponent, { width: '440px', maxWidth: '95vw', data: { productId: this.product()!.id, color } })
      .afterClosed().subscribe(r => { if (r) this.loadProduct(); });
  }

  deleteColor(color: ProductColor) {
    if (!confirm(`Remove color "${color.colorName}"? This will also delete its SKUs.`)) return;
    this.api.delete(`products/${this.product()!.id}/colors/${color.id}`).subscribe({
      next: () => { this.snack.open('Color removed', '', { duration: 2000 }); this.loadProduct(); },
      error: (e) => this.snack.open(e?.error?.error?.message ?? 'Error', '', { duration: 3000 }),
    });
  }

  openGenerateSkus() {
    this.dialog.open(GenerateSkusDialogComponent, {
      width: '540px', maxWidth: '95vw',
      data: { product: this.product() },
    }).afterClosed().subscribe(r => { if (r) this.loadSkus(); });
  }

  saveSku(sku: Sku, i: number) {
    const edit = this.skuEdits[i];
    this.api.patch(`skus/${sku.id}`, {
      stockQty: Number(edit.stockQty),
      priceOverride: edit.priceOverride ? Number(edit.priceOverride) : undefined,
    }).subscribe({
      next: () => this.snack.open('Saved', '', { duration: 1500 }),
      error: (e) => this.snack.open(e?.error?.error?.message ?? 'Error', '', { duration: 3000 }),
    });
  }
}

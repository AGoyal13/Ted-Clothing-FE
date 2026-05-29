import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ColorDialogComponent } from './color-dialog.component';
import { AddColorVariantDialogComponent } from './add-color-variant-dialog.component';

interface ProductColor { id: string; colorName: string; colorHex: string | null; images: string[]; }
interface Sku { id: string; skuCode: string; colorId: string; sizeLabel: string; stockQty: number; priceOverride: number | null; }
interface ProductDetail {
  id: string; title: string; slug: string; status: string; gender: string;
  basePrice: number; discountPercent: number; description: string;
  category: { id: string; name: string; slug: string };
  colors: ProductColor[];
  skus: Sku[];
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    FormsModule,
    MatTabsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatChipsModule,
    MatProgressBarModule, MatSnackBarModule, MatDialogModule,
    MatTooltipModule, DecimalPipe,
  ],
  template: `
    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    @if (product()) {
      <div class="page-header">
        <div class="header-left">
          <button mat-icon-button (click)="router.navigate(['/products'])">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <div class="title-row">
              <h1>{{ product()!.title }}</h1>
              <span [class]="'badge status-' + product()!.status.toLowerCase()">{{ product()!.status }}</span>
              <span class="badge gender-badge">{{ product()!.gender }}</span>
            </div>
            <div class="meta-row">
              <span>{{ product()!.category.name }}</span>
              <span>·</span>
              <span>₹{{ product()!.basePrice | number:'1.0-0' }}</span>
              @if (product()!.discountPercent) {
                <span class="discount">{{ product()!.discountPercent }}% off</span>
              }
            </div>
          </div>
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
                    <div>
                      <mat-card-title>{{ color.colorName }}</mat-card-title>
                      <mat-card-subtitle>{{ skuCountForColor(color.id) }} size(s)</mat-card-subtitle>
                    </div>
                  </mat-card-header>
                  @if (color.images.length) {
                    <div class="img-strip">
                      @for (img of color.images.slice(0, 4); track img) {
                        <img class="img-thumb" [src]="img" [alt]="color.colorName" loading="lazy" />
                      }
                      @if (color.images.length > 4) {
                        <div class="img-more">+{{ color.images.length - 4 }}</div>
                      }
                    </div>
                  } @else {
                    <p class="no-images">No images yet</p>
                  }
                  <mat-card-actions>
                    <button mat-button (click)="openEditColor(color)"><mat-icon>edit</mat-icon> Edit</button>
                    <button mat-button color="warn" (click)="deleteColor(color)"><mat-icon>delete</mat-icon></button>
                  </mat-card-actions>
                </mat-card>
              }
              @if (!product()!.colors.length) {
                <p class="muted">No colors yet. Add a color to start building SKUs.</p>
              }
            </div>
          </div>
        </mat-tab>

        <!-- SKU GRID TAB -->
        <mat-tab [label]="'Sizes & Stock (' + product()!.skus.length + ' SKUs)'">
          <div class="tab-content">
            @if (!product()!.colors.length) {
              <p class="muted">Add at least one color first.</p>
            } @else {
              <!-- Size suggestions from category template -->
              @if (suggestedSizes().length) {
                <div class="suggestions-bar">
                  <span class="suggestions-label">Suggested sizes:</span>
                  @for (s of suggestedSizes(); track s) {
                    <button class="chip" (click)="prefillSize(s)">{{ s }}</button>
                  }
                </div>
              }

              <div class="grid-wrap">
                <table class="sku-grid">
                  <thead>
                    <tr>
                      <th class="color-col">Color</th>
                      @for (size of allSizes(); track size) {
                        <th class="size-col">{{ size }}</th>
                      }
                      <th class="add-col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (color of product()!.colors; track color.id) {
                      <tr>
                        <td class="color-cell">
                          <span class="dot" [style.background]="color.colorHex || '#ccc'"></span>
                          <span class="color-name">{{ color.colorName }}</span>
                        </td>
                        @for (size of allSizes(); track size) {
                          <td class="stock-cell">
                            @if (findSku(color.id, size); as sku) {
                              <div class="stock-box" [class.oos]="sku.stockQty === 0">
                                <input class="stock-input" type="number" [value]="sku.stockQty" min="0"
                                  (blur)="updateStock(sku, $event)" (keydown.enter)="$any($event.target).blur()" />
                                <button class="del-btn" matTooltip="Remove this size"
                                  (click)="deleteSku(sku)">✕</button>
                              </div>
                            } @else {
                              <span class="no-variant">—</span>
                            }
                          </td>
                        }
                        <td class="add-col">
                          @if (addingForColorId() === color.id) {
                            <div class="inline-add">
                              <input class="size-inp" [(ngModel)]="newSizeLabel" placeholder="Size"
                                (keydown.enter)="saveNewSize(color.id)" #sizeInp />
                              <input class="qty-inp" type="number" [(ngModel)]="newSizeStock"
                                placeholder="Qty" min="0" (keydown.enter)="saveNewSize(color.id)" />
                              <button mat-icon-button color="primary" [disabled]="!newSizeLabel.trim()"
                                (click)="saveNewSize(color.id)" matTooltip="Save">
                                <mat-icon>check</mat-icon>
                              </button>
                              <button mat-icon-button (click)="cancelAdd()" matTooltip="Cancel">
                                <mat-icon>close</mat-icon>
                              </button>
                            </div>
                          } @else {
                            <button mat-button class="add-size-btn" (click)="startAdd(color.id)">
                              <mat-icon>add</mat-icon> Size
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (!allSizes().length) {
                <p class="muted" style="margin-top:16px">
                  No sizes yet. Click <strong>+ Size</strong> next to a color to add the first variant.
                </p>
              }
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .header-left { display: flex; align-items: flex-start; gap: 8px; }
    .title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    h1 { margin: 0; font-size: 20px; }
    .meta-row { font-size: 13px; color: #666; display: flex; gap: 6px; align-items: center; margin-top: 4px; }
    .discount { color: #2e7d32; font-weight: 600; }
    .badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .status-draft { background: #fff9c4; color: #f57f17; }
    .status-active { background: #e8f5e9; color: #2e7d32; }
    .status-archived { background: #fce4ec; color: #c62828; }
    .gender-badge { background: #e3f2fd; color: #1565c0; }

    .tab-content { padding: 20px 0; }
    .tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .tab-header h3 { margin: 0; }

    /* Colors grid */
    .colors-grid { display: flex; flex-wrap: wrap; gap: 16px; }
    .color-card { width: 220px; }
    mat-card-header { display: flex; align-items: center; gap: 10px; padding: 12px 12px 0; }
    .color-swatch { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #ddd; flex-shrink: 0; }
    .img-strip { display: flex; gap: 4px; padding: 8px 12px 0; flex-wrap: wrap; }
    .img-thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #eee; }
    .img-more { width: 48px; height: 48px; border-radius: 4px; background: #f5f5f5; border: 1px solid #eee;
      display: flex; align-items: center; justify-content: center; font-size: 12px; color: #777; font-weight: 600; }
    .no-images { margin: 8px 12px 0; font-size: 12px; color: #bbb; font-style: italic; }

    /* Size suggestions */
    .suggestions-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .suggestions-label { font-size: 12px; color: #777; }
    .chip { padding: 4px 12px; border: 1px solid #1a237e; border-radius: 16px; background: transparent;
      color: #1a237e; font-size: 12px; cursor: pointer; }
    .chip:hover { background: #e8eaf6; }

    /* SKU Grid */
    .grid-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .sku-grid { border-collapse: collapse; min-width: 500px; }
    .sku-grid th, .sku-grid td { border: 1px solid #e0e0e0; padding: 8px 10px; text-align: center; white-space: nowrap; }
    .sku-grid th { background: #f5f5f5; font-size: 13px; font-weight: 600; color: #333; }
    .color-col { text-align: left !important; min-width: 160px; }
    .size-col { min-width: 90px; }
    .add-col { border: none !important; background: transparent !important; min-width: 160px; text-align: left !important; }
    .color-cell { text-align: left !important; }
    .color-cell { display: flex; align-items: center; gap: 8px; }
    .dot { width: 16px; height: 16px; border-radius: 50%; border: 1px solid #ddd; flex-shrink: 0; display: inline-block; }
    .color-name { font-size: 13px; font-weight: 500; }

    .stock-box { display: flex; align-items: center; gap: 4px; justify-content: center; }
    .stock-box.oos { background: #fff3e0; border-radius: 4px; padding: 2px; }
    .stock-input { width: 60px; padding: 4px 6px; border: 1px solid #ddd; border-radius: 4px;
      font-size: 13px; text-align: center; }
    .stock-input:focus { outline: none; border-color: #1a237e; }
    .stock-box.oos .stock-input { border-color: #ffb74d; color: #e65100; font-weight: 600; }
    .del-btn { background: none; border: none; cursor: pointer; color: #bbb; font-size: 12px; padding: 2px 4px; }
    .del-btn:hover { color: #c62828; }
    .no-variant { color: #ccc; font-size: 14px; }

    /* Inline add form */
    .inline-add { display: flex; align-items: center; gap: 4px; padding: 4px 0; }
    .size-inp { width: 70px; padding: 4px 6px; border: 1px solid #1a237e; border-radius: 4px; font-size: 13px; }
    .qty-inp { width: 60px; padding: 4px 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; }
    .add-size-btn { font-size: 12px; color: #1a237e; }

    .muted { color: #999; font-style: italic; }
  `],
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  router = inject(Router);

  product = signal<ProductDetail | null>(null);
  loading = signal(false);
  suggestedSizes = signal<string[]>([]);

  addingForColorId = signal<string | null>(null);
  newSizeLabel = '';
  newSizeStock = 0;

  allSizes = computed(() => {
    const skus = this.product()?.skus ?? [];
    const sizes = [...new Set(skus.map(s => s.sizeLabel))];
    return sizes.sort((a, b) => {
      const order = ['XXS','XS','S','M','L','XL','XXL','XXXL','2XL','3XL','FREE SIZE','ONE SIZE'];
      const ai = order.indexOf(a.toUpperCase());
      const bi = order.indexOf(b.toUpperCase());
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  });

  ngOnInit() { this.loadProduct(); }

  loadProduct() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loading.set(true);
    this.api.get<ProductDetail>(`products/${id}`).subscribe({
      next: (p) => {
        this.product.set(p);
        this.loading.set(false);
        this.loadSizeTemplate(p.category.id);
      },
      error: () => this.loading.set(false),
    });
  }

  loadSizeTemplate(categoryId: string) {
    this.api.get<{ sizes: string[] }>(`categories/${categoryId}/size-template`).subscribe({
      next: (t) => this.suggestedSizes.set(t.sizes ?? []),
      error: () => this.suggestedSizes.set([]),
    });
  }

  findSku(colorId: string, size: string): Sku | undefined {
    return this.product()?.skus.find(s => s.colorId === colorId && s.sizeLabel.toLowerCase() === size.toLowerCase());
  }

  skuCountForColor(colorId: string): number {
    return this.product()?.skus.filter(s => s.colorId === colorId).length ?? 0;
  }

  // ─── Stock inline edit ────────────────────────────────────────────────────

  updateStock(sku: Sku, event: Event) {
    const qty = Math.max(0, parseInt((event.target as HTMLInputElement).value, 10) || 0);
    if (qty === sku.stockQty) return;
    this.api.patch(`skus/${sku.id}`, { stockQty: qty }).subscribe({
      next: () => {
        this.patchSkuLocal(sku.id, { stockQty: qty });
        this.snack.open('Stock updated', '', { duration: 1200 });
      },
      error: () => this.snack.open('Failed to update stock', '', { duration: 2500 }),
    });
  }

  // ─── Add size ─────────────────────────────────────────────────────────────

  startAdd(colorId: string) {
    this.addingForColorId.set(colorId);
    this.newSizeLabel = '';
    this.newSizeStock = 0;
  }

  cancelAdd() { this.addingForColorId.set(null); }

  prefillSize(size: string) {
    if (this.addingForColorId()) {
      this.newSizeLabel = size;
    }
  }

  saveNewSize(colorId: string) {
    const label = this.newSizeLabel.trim();
    if (!label) return;

    // Check duplicate
    if (this.findSku(colorId, label)) {
      this.snack.open(`Size "${label}" already exists for this color`, '', { duration: 2500 });
      return;
    }

    this.api.post('skus', {
      productId: this.product()!.id,
      colorId,
      sizeLabel: label,
      stockQty: Math.max(0, this.newSizeStock || 0),
    }).subscribe({
      next: (sku: any) => {
        const p = this.product()!;
        this.product.set({ ...p, skus: [...p.skus, sku] });
        this.cancelAdd();
        this.snack.open(`Size "${label}" added`, '', { duration: 1500 });
      },
      error: (e) => {
        const msg = e?.error?.error?.message ?? e?.error?.message ?? 'Failed to add size';
        this.snack.open(msg, 'OK', { duration: 4000 });
        this.cancelAdd();
        this.loadProduct();
      },
    });
  }

  // ─── Delete SKU ───────────────────────────────────────────────────────────

  deleteSku(sku: Sku) {
    if (!confirm(`Remove size "${sku.sizeLabel}"? This cannot be undone.`)) return;
    this.api.delete(`skus/${sku.id}`).subscribe({
      next: () => {
        const p = this.product()!;
        this.product.set({ ...p, skus: p.skus.filter(s => s.id !== sku.id) });
        this.snack.open('Size removed', '', { duration: 1500 });
      },
      error: (e) => this.snack.open(e?.error?.error?.message ?? 'Error', '', { duration: 3000 }),
    });
  }

  // ─── Colors ───────────────────────────────────────────────────────────────

  openAddColor() {
    this.dialog.open(AddColorVariantDialogComponent, {
      width: '480px', maxWidth: '95vw',
      data: { productId: this.product()!.id, suggestedSizes: this.suggestedSizes() },
    }).afterClosed().subscribe(r => { if (r) this.loadProduct(); });
  }

  openEditColor(color: ProductColor) {
    this.dialog.open(ColorDialogComponent, {
      width: '440px', maxWidth: '95vw',
      data: { productId: this.product()!.id, color },
    }).afterClosed().subscribe(r => { if (r) this.loadProduct(); });
  }

  deleteColor(color: ProductColor) {
    if (!confirm(`Remove color "${color.colorName}"? All its size variants will also be deleted.`)) return;
    this.api.delete(`products/${this.product()!.id}/colors/${color.id}`).subscribe({
      next: () => {
        this.snack.open('Color removed', '', { duration: 2000 });
        this.loadProduct();
      },
      error: (e) => this.snack.open(e?.error?.error?.message ?? 'Error', '', { duration: 3000 }),
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private patchSkuLocal(skuId: string, patch: Partial<Sku>) {
    const p = this.product()!;
    this.product.set({ ...p, skus: p.skus.map(s => s.id === skuId ? { ...s, ...patch } : s) });
  }
}

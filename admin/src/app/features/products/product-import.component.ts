import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../core/services/api.service';
import * as XLSX from 'xlsx';

interface RowResult {
  title: string; colorName: string; size: string; skuCode: string;
  productAction: 'created' | 'updated' | 'error';
  colorAction: 'created' | 'updated' | 'error';
  skuAction: 'created' | 'updated' | 'error';
  error?: string;
}

interface BulkResult {
  dryRun: boolean;
  products: { created: number; updated: number };
  skus: { created: number; updated: number };
  errors: number;
  results: RowResult[];
}

const TEMPLATE_HEADERS = ['TITLE', 'DESCRIPTION', 'CATEGORY_SLUG', 'PARENT_CATEGORY_SLUG', 'GENDER', 'BASE_PRICE', 'DISCOUNT_PCT', 'COLOR_NAME', 'COLOR_HEX', 'SIZE', 'STOCK_QTY', 'PRICE_OVERRIDE'];
// SIZE: single value "M" OR comma-separated "S,M,L,XL"
// STOCK_QTY: single value applied to all sizes, OR comma-separated matching SIZE count
// GENDER values: MEN | WOMEN | KIDS | UNISEX
const TEMPLATE_SAMPLE = [
  // Men's clothing — two colour variants, comma-separated sizes
  ['Slim Fit Oxford Shirt',       'A premium cotton Oxford shirt.',             'men-shirts',       'men',         'MEN',    1499, 10, 'Navy Blue',    '#1a237e', 'S,M,L,XL',     '20,30,25,15', ''],
  ['Slim Fit Oxford Shirt',       'A premium cotton Oxford shirt.',             'men-shirts',       'men',         'MEN',    1499, 10, 'Olive Green',  '#556B2F', 'S,M,L,XL',     '10,20,15,10', ''],
  // Women's clothing
  ['Floral Wrap Dress',           'Lightweight floral wrap dress.',             'women-dresses',    'women',       'WOMEN',  1999,  0, 'Pink Floral',  '#f06292', 'XS,S,M,L',     '15,20,20,10', ''],
  // Kids
  ['Kids Dinosaur T-Shirt',       'Fun dino print kids tee.',                  'kids-tshirts',     'kids',        'KIDS',    699,  0, 'Blue',         '#1565c0', '3-4Y,5-6Y,7-8Y','25,25,20',   ''],
  // Bags
  ['Classic Leather Backpack',    'Durable full-grain leather backpack.',       'backpacks',        'bags',        'UNISEX', 3499,  5, 'Tan',          '#c8a97e', 'Free Size',     '30',          ''],
  // Accessories — free size, single stock
  ['Genuine Leather Belt',        'Full-grain leather belt with pin buckle.',  'belts',            'accessories', 'UNISEX',  799,  0, 'Black',        '#212121', 'Free Size',     '50',          ''],
  ['Classic Aviator Sunglasses',  'UV400 aviator sunglasses.',                 'men-sunglasses',   'accessories', 'MEN',    1299,  0, 'Gold / Green', '#bfa76a', 'Free Size',     '40',          ''],
  // Beauty
  ['Matte Lip Kit',               'Long-wear matte lip colour + liner.',        'makeup',           'beauty',      'WOMEN',   899,  0, 'Berry Red',    '#8b0000', 'Free Size',     '60',          ''],
];

// All valid category combinations — used to populate the "Categories" reference sheet in the template
const CATEGORY_REFERENCE: string[][] = [
  ['CATEGORY_SLUG', 'PARENT_CATEGORY_SLUG', 'GENDER', 'Display Name'],
  // ── Men ───────────────────────────────────────────────────────
  ['men-tshirts',       'men',         'MEN',    'Men — Round Neck T-Shirts'],
  ['men-polos',         'men',         'MEN',    'Men — Polo Shirts'],
  ['men-shirts',        'men',         'MEN',    'Men — Shirts'],
  ['men-hoodies',       'men',         'MEN',    'Men — Hoodies & Sweatshirts'],
  ['men-jackets',       'men',         'MEN',    'Men — Jackets & Outerwear'],
  ['men-bottoms',       'men',         'MEN',    'Men — Bottoms (Jeans, Shorts, Trousers)'],
  ['men-footwear',      'men',         'MEN',    'Men — Footwear'],
  // ── Women ─────────────────────────────────────────────────────
  ['women-tshirts',     'women',       'WOMEN',  'Women — Round Neck T-Shirts'],
  ['women-polos',       'women',       'WOMEN',  'Women — Polo Shirts'],
  ['women-shirts',      'women',       'WOMEN',  'Women — Shirts & Tops'],
  ['women-coord-sets',  'women',       'WOMEN',  'Women — Co-ord Sets'],
  ['women-dresses',     'women',       'WOMEN',  'Women — Dresses'],
  ['women-hoodies',     'women',       'WOMEN',  'Women — Hoodies & Sweatshirts'],
  ['women-jackets',     'women',       'WOMEN',  'Women — Jackets & Outerwear'],
  ['women-bottoms',     'women',       'WOMEN',  'Women — Bottoms (Jeans, Shorts, Trousers)'],
  ['women-footwear',    'women',       'WOMEN',  'Women — Footwear'],
  // ── Kids ──────────────────────────────────────────────────────
  ['kids-tshirts',      'kids',        'KIDS',   'Kids — T-Shirts'],
  ['kids-coord-sets',   'kids',        'KIDS',   'Kids — Co-ord Sets'],
  ['kids-dresses',      'kids',        'KIDS',   'Kids — Dresses'],
  ['kids-winter',       'kids',        'KIDS',   'Kids — Winter Wear'],
  // ── Bags ──────────────────────────────────────────────────────
  ['backpacks',         'bags',        'UNISEX', 'Bags — Backpacks'],
  ['laptop-bags',       'bags',        'UNISEX', 'Bags — Laptop Bags'],
  ['travel-pouches',    'bags',        'UNISEX', 'Bags — Travel Pouches'],
  ['women-bags',        'bags',        'WOMEN',  'Bags — Women\'s Handbags'],
  // ── Accessories ───────────────────────────────────────────────
  ['belts',             'accessories', 'UNISEX', 'Accessories — Belts'],
  ['caps',              'accessories', 'UNISEX', 'Accessories — Caps'],
  ['card-holders',      'accessories', 'MEN',    'Accessories — Card Holders'],
  ['wallets',           'accessories', 'UNISEX', 'Accessories — Wallets'],
  ['ties',              'accessories', 'MEN',    'Accessories — Ties'],
  ['stoles',            'accessories', 'WOMEN',  'Accessories — Stoles'],
  ['watches',           'accessories', 'UNISEX', 'Accessories — Watches'],
  ['men-sunglasses',    'accessories', 'MEN',    'Accessories — Men\'s Sunglasses'],
  ['women-sunglasses',  'accessories', 'WOMEN',  'Accessories — Women\'s Sunglasses'],
  // ── Beauty ────────────────────────────────────────────────────
  ['makeup',            'beauty',      'WOMEN',  'Beauty — Makeup'],
];

@Component({
  selector: 'app-product-import',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatProgressBarModule, MatSnackBarModule, MatChipsModule,
  ],
  template: `
    <div class="page-header">
      <h1>Product Import</h1>
      <button mat-stroked-button (click)="downloadTemplate()">
        <mat-icon>download</mat-icon> Download Template
      </button>
    </div>

    <mat-card class="info-card">
      <mat-card-content>
        <p class="info">Each row is one colour variant. Repeat the row for each colour. Use comma-separated sizes in SIZE (e.g. <code>S,M,L,XL</code>) and matching stocks in STOCK_QTY (e.g. <code>20,30,25,15</code>) — or a single stock value for all sizes. Products are matched and upserted by title.</p>
        <p class="info">Download the template below — it includes a <strong>Categories Reference</strong> sheet with all valid <code>CATEGORY_SLUG</code> / <code>PARENT_CATEGORY_SLUG</code> / <code>GENDER</code> values, and an <strong>Instructions</strong> sheet explaining every column.</p>
        <p class="cols">Columns: <code>{{ HEADERS }}</code></p>
      </mat-card-content>
    </mat-card>

    <mat-card class="upload-card">
      <mat-card-content>
        <div class="drop-zone" (click)="fileInput.click()" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
          <mat-icon class="upload-icon">cloud_upload</mat-icon>
          <p>Click to select or drag & drop (.csv or .xlsx)</p>
          <input #fileInput type="file" accept=".csv,.xlsx" hidden (change)="onFileSelected($event)" />
        </div>
        @if (fileName()) {
          <mat-chip-set><mat-chip>{{ fileName() }}</mat-chip></mat-chip-set>
        }
      </mat-card-content>
    </mat-card>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    @if (preview() && !committed()) {
      <mat-card class="preview-card">
        <mat-card-header>
          <mat-card-title>Preview — {{ preview()!.results.length }} rows</mat-card-title>
          <mat-card-subtitle>{{ subtitle() }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="table-wrap">
            <table mat-table [dataSource]="preview()!.results" class="full-table">
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef>Product</th>
                <td mat-cell *matCellDef="let r">{{ r.title }}</td>
              </ng-container>
              <ng-container matColumnDef="colorName">
                <th mat-header-cell *matHeaderCellDef>Color</th>
                <td mat-cell *matCellDef="let r">{{ r.colorName }}</td>
              </ng-container>
              <ng-container matColumnDef="size">
                <th mat-header-cell *matHeaderCellDef>Size</th>
                <td mat-cell *matCellDef="let r">{{ r.size }}</td>
              </ng-container>
              <ng-container matColumnDef="skuCode">
                <th mat-header-cell *matHeaderCellDef>SKU Code</th>
                <td mat-cell *matCellDef="let r"><code>{{ r.skuCode }}</code></td>
              </ng-container>
              <ng-container matColumnDef="productAction">
                <th mat-header-cell *matHeaderCellDef>Product</th>
                <td mat-cell *matCellDef="let r"><span [class]="badge(r.productAction)">{{ label(r.productAction) }}</span></td>
              </ng-container>
              <ng-container matColumnDef="skuAction">
                <th mat-header-cell *matHeaderCellDef>SKU</th>
                <td mat-cell *matCellDef="let r"><span [class]="badge(r.skuAction)">{{ label(r.skuAction) }}</span></td>
              </ng-container>
              <ng-container matColumnDef="error">
                <th mat-header-cell *matHeaderCellDef>Error</th>
                <td mat-cell *matCellDef="let r" class="error-cell">{{ r.error ?? '' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols;" [class.row-error]="row.productAction === 'error'"></tr>
            </table>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-button (click)="reset()">Clear</button>
          <button mat-flat-button color="primary" [disabled]="validRows() === 0 || committing()" (click)="commit()">
            {{ commitLabel() }}
          </button>
        </mat-card-actions>
      </mat-card>
    }

    @if (committed()) {
      <mat-card class="success-card">
        <mat-card-content>
          <p>✅ Products — created: <strong>{{ committed()!.products.created }}</strong>, updated: <strong>{{ committed()!.products.updated }}</strong></p>
          <p>✅ SKUs — created: <strong>{{ committed()!.skus.created }}</strong>, updated: <strong>{{ committed()!.skus.updated }}</strong></p>
          @if (committed()!.errors > 0) {
            <p class="warn">⚠️ {{ committed()!.errors }} rows skipped due to errors.</p>
          }
        </mat-card-content>
        <mat-card-actions>
          <button mat-button (click)="reset()">Import another file</button>
        </mat-card-actions>
      </mat-card>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
    h1 { margin: 0; }
    .info-card, .upload-card { margin-bottom: 16px; }
    .info { margin: 0 0 8px; font-size: 13px; color: #555; line-height: 1.5; }
    .cols { margin: 0; font-size: 12px; color: #777; }
    code { font-size: 11px; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
    .drop-zone { border: 2px dashed #bdbdbd; border-radius: 8px; padding: 32px; text-align: center; cursor: pointer; transition: border-color .2s; }
    .drop-zone:hover { border-color: #3f51b5; }
    .upload-icon { font-size: 40px; width: 40px; height: 40px; color: #9e9e9e; }
    .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .full-table { width: 100%; min-width: 700px; }
    .preview-card, .success-card { margin-top: 16px; }
    .success-card p { margin: 4px 0; font-size: 15px; }
    .warn { color: #e65100; }
    .row-error td { color: #c62828; }
    .error-cell { font-size: 12px; color: #c62828; max-width: 200px; }
    .badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-created { background: #e8f5e9; color: #2e7d32; }
    .badge-updated { background: #e3f2fd; color: #1565c0; }
    .badge-error { background: #fce4ec; color: #c62828; }
  `],
})
export class ProductImportComponent {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  readonly HEADERS = TEMPLATE_HEADERS.join(', ');
  cols = ['title', 'colorName', 'size', 'skuCode', 'productAction', 'skuAction', 'error'];

  fileName = signal('');
  loading = signal(false);
  committing = signal(false);
  preview = signal<BulkResult | null>(null);
  committed = signal<BulkResult | null>(null);

  private parsedRows: Record<string, string | number>[] = [];

  subtitle() {
    const p = this.preview();
    if (!p) return '';
    return `Products: +${p.products.created} new, ↺${p.products.updated} update · SKUs: +${p.skus.created} new, ↺${p.skus.updated} update · ❌${p.errors} errors`;
  }

  validRows() {
    return this.preview()?.results.filter(r => r.productAction !== 'error').length ?? 0;
  }

  commitLabel() {
    if (this.committing()) return 'Importing…';
    const p = this.preview();
    if (!p) return 'Import';
    return `Import (${p.products.created + p.products.updated} products, ${p.skus.created + p.skus.updated} SKUs)`;
  }

  badge(action: string) { return `badge badge-${action}`; }
  label(action: string) {
    return { created: '✅ Create', updated: '↺ Update', error: '❌ Error' }[action] ?? action;
  }

  onFileSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  processFile(file: File) {
    this.fileName.set(file.name);
    this.preview.set(null);
    this.committed.set(null);
    this.loading.set(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, string | number>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rows.length) { this.snack.open('File is empty', '', { duration: 3000 }); this.loading.set(false); return; }
        if (rows.length > 500) { this.snack.open('Max 500 rows allowed', '', { duration: 3000 }); this.loading.set(false); return; }

        this.parsedRows = rows;
        const payload = this.toPayload(rows);
        const res = await this.api.post<BulkResult>('products/bulk-upsert', { dryRun: true, rows: payload }).toPromise();
        this.preview.set(res ?? null);
      } catch (err: any) {
        this.snack.open(err?.error?.error?.message ?? 'Failed to parse or preview file', '', { duration: 4000 });
      }
      this.loading.set(false);
    };
    reader.readAsArrayBuffer(file);
  }

  async commit() {
    this.committing.set(true);
    try {
      const payload = this.toPayload(this.parsedRows);
      const res = await this.api.post<BulkResult>('products/bulk-upsert', { dryRun: false, rows: payload }).toPromise();
      this.committed.set(res ?? null);
    } catch (err: any) {
      this.snack.open(err?.error?.error?.message ?? 'Import failed', '', { duration: 4000 });
    }
    this.committing.set(false);
  }

  private toPayload(rows: Record<string, string | number>[]) {
    const result: any[] = [];

    for (const r of rows) {
      const sizes = String(r['SIZE'] ?? '').split(',').map(s => s.trim()).filter(Boolean);
      const stocks = String(r['STOCK_QTY'] ?? '0').split(',').map(s => parseInt(s.trim(), 10) || 0);
      const prices = String(r['PRICE_OVERRIDE'] ?? '').split(',').map(s => s.trim());

      const base = {
        title:              String(r['TITLE'] ?? '').trim(),
        description:        String(r['DESCRIPTION'] ?? '').trim(),
        categorySlug:       String(r['CATEGORY_SLUG'] ?? '').trim(),
        parentCategorySlug: r['PARENT_CATEGORY_SLUG'] ? String(r['PARENT_CATEGORY_SLUG']).trim() : undefined,
        gender:             r['GENDER'] ? String(r['GENDER']).trim().toUpperCase() : undefined,
        basePrice:          Number(r['BASE_PRICE'] ?? 0),
        discountPercent:    r['DISCOUNT_PCT'] !== '' ? Number(r['DISCOUNT_PCT']) : undefined,
        colorName:          String(r['COLOR_NAME'] ?? '').trim(),
        colorHex:           r['COLOR_HEX'] ? String(r['COLOR_HEX']).trim() : undefined,
      };

      for (let i = 0; i < sizes.length; i++) {
        // if stocks has only one value, apply it to all sizes; otherwise pair by index
        const stockQty = stocks.length === 1 ? stocks[0] : (stocks[i] ?? 0);
        const priceOverride = prices[i] && prices[i] !== '' ? Number(prices[i]) : undefined;
        result.push({ ...base, size: sizes[i], stockQty, priceOverride });
      }
    }

    return result.filter(r => r.title && r.colorName && r.size);
  }

  downloadTemplate() {
    const wb = XLSX.utils.book_new();

    // Sheet 1 — Products (sample rows)
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE]);
    XLSX.utils.book_append_sheet(wb, ws, 'Products');

    // Sheet 2 — Categories reference
    const catWs = XLSX.utils.aoa_to_sheet(CATEGORY_REFERENCE);
    XLSX.utils.book_append_sheet(wb, catWs, 'Categories Reference');

    // Sheet 3 — Instructions
    const instructions = [
      ['Column', 'Required?', 'Notes'],
      ['TITLE',               'Yes',      'Product name. Same title = same product (upserted). Add multiple rows for multiple colours.'],
      ['DESCRIPTION',         'Yes',      'Short product description.'],
      ['CATEGORY_SLUG',       'Yes',      'Leaf category slug — copy from the "Categories Reference" sheet.'],
      ['PARENT_CATEGORY_SLUG','Yes',      'Parent slug — copy from the "Categories Reference" sheet (men / women / kids / bags / accessories / beauty).'],
      ['GENDER',              'Yes',      'MEN | WOMEN | KIDS | UNISEX — copy from the "Categories Reference" sheet.'],
      ['BASE_PRICE',          'Yes',      'Selling price in INR (e.g. 1499). No commas or currency symbol.'],
      ['DISCOUNT_PCT',        'Optional', 'Discount percentage 0–100. Leave blank or 0 for no discount.'],
      ['COLOR_NAME',          'Yes',      'Colour variant name (e.g. Navy Blue). One row per colour.'],
      ['COLOR_HEX',           'Optional', 'Hex code for the swatch (e.g. #1a237e).'],
      ['SIZE',                'Yes',      'Single size (e.g. M) OR comma-separated (e.g. S,M,L,XL). Use "Free Size" for one-size items.'],
      ['STOCK_QTY',           'Yes',      'Single number applied to all sizes, OR comma-separated matching SIZE count (e.g. 20,30,25,15).'],
      ['PRICE_OVERRIDE',      'Optional', 'Override price for this colour/size combination if different from BASE_PRICE.'],
      ['', '', ''],
      ['Tips', '', ''],
      ['• One row = one product + one colour. Sizes expand automatically.', '', ''],
      ['• Repeat the row with the same TITLE for each colour variant.', '', ''],
      ['• Products are matched by TITLE slug — editing the title creates a new product.', '', ''],
      ['• CATEGORY_SLUG and PARENT_CATEGORY_SLUG must match the "Categories Reference" sheet exactly.', '', ''],
    ];
    const instrWs = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, instrWs, 'Instructions');

    XLSX.writeFile(wb, 'ted-product-import-template.xlsx');
  }

  reset() {
    this.fileName.set('');
    this.parsedRows = [];
    this.preview.set(null);
    this.committed.set(null);
  }
}

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

const TEMPLATE_HEADERS = ['TITLE', 'DESCRIPTION', 'CATEGORY_SLUG', 'PARENT_CATEGORY_SLUG', 'BASE_PRICE', 'DISCOUNT_PCT', 'COLOR_NAME', 'COLOR_HEX', 'SIZE', 'STOCK_QTY', 'PRICE_OVERRIDE'];
const TEMPLATE_SAMPLE = [
  ['Slim Fit Oxford Shirt', 'A premium cotton Oxford shirt with a slim fit.', 'shirts', 'mens', 1499, 10, 'Navy Blue', '#1a237e', 'M', 50, ''],
  ['Slim Fit Oxford Shirt', 'A premium cotton Oxford shirt with a slim fit.', 'shirts', 'mens', 1499, 10, 'Navy Blue', '#1a237e', 'L', 40, ''],
  ['Slim Fit Oxford Shirt', 'A premium cotton Oxford shirt with a slim fit.', 'shirts', 'mens', 1499, 10, 'Olive Green', '#556B2F', 'M', 35, ''],
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
        <p class="info">Each row is one SKU. Repeat the product title and description for every color/size combination. If a product already exists (matched by title), it will be updated. New products are created automatically.</p>
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
    return rows.map(r => ({
      title: String(r['TITLE'] ?? '').trim(),
      description: String(r['DESCRIPTION'] ?? '').trim(),
      categorySlug: String(r['CATEGORY_SLUG'] ?? '').trim(),
      parentCategorySlug: r['PARENT_CATEGORY_SLUG'] ? String(r['PARENT_CATEGORY_SLUG']).trim() : undefined,
      basePrice: Number(r['BASE_PRICE'] ?? 0),
      discountPercent: r['DISCOUNT_PCT'] !== '' ? Number(r['DISCOUNT_PCT']) : undefined,
      colorName: String(r['COLOR_NAME'] ?? '').trim(),
      colorHex: r['COLOR_HEX'] ? String(r['COLOR_HEX']).trim() : undefined,
      size: String(r['SIZE'] ?? '').trim(),
      stockQty: Number(r['STOCK_QTY'] ?? 0),
      priceOverride: r['PRICE_OVERRIDE'] !== '' ? Number(r['PRICE_OVERRIDE']) : undefined,
    })).filter(r => r.title && r.colorName && r.size);
  }

  downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'ted-product-import-template.xlsx');
  }

  reset() {
    this.fileName.set('');
    this.parsedRows = [];
    this.preview.set(null);
    this.committed.set(null);
  }
}

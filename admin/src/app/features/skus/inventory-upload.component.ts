import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../core/services/api.service';
import * as XLSX from 'xlsx';

type Mode = 'set' | 'add';

interface StockRow { skuCode: string; qty: number; status?: string; oldStock?: number; newStock?: number; }

const TEMPLATES: Record<Mode, { headers: string[]; sample: (string | number)[][] }> = {
  set: { headers: ['SKU_CODE', 'STOCK_QTY'], sample: [['TED-SLIM-NAVY-M', 50], ['TED-SLIM-OLIV-L', 30]] },
  add: { headers: ['SKU_CODE', 'ADD_QTY'],   sample: [['TED-SLIM-NAVY-M', 20], ['TED-SLIM-OLIV-L', 10]] },
};

@Component({
  selector: 'app-inventory-upload',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule, MatButtonModule, MatButtonToggleModule, MatIconModule,
    MatTableModule, MatProgressBarModule, MatSnackBarModule, MatChipsModule,
  ],
  template: `
    <div class="page-header">
      <h1>Inventory Upload</h1>
    </div>

    <mat-card class="mode-card">
      <mat-card-content>
        <p class="mode-label">Upload mode</p>
        <mat-button-toggle-group [(ngModel)]="mode" (ngModelChange)="reset()" class="mode-toggle">
          <mat-button-toggle value="set">
            <mat-icon>swap_vert</mat-icon> Set Stock
          </mat-button-toggle>
          <mat-button-toggle value="add">
            <mat-icon>add_box</mat-icon> Add Stock
          </mat-button-toggle>
        </mat-button-toggle-group>
        <p class="mode-desc">{{ modeDesc() }}</p>
      </mat-card-content>
    </mat-card>

    <mat-card class="upload-card">
      <mat-card-content>
        <div class="upload-row">
          <div class="col-info">
            <p class="hint">Expected columns: <code>{{ expectedCols() }}</code></p>
            <p class="hint small">Accepts .csv and .xlsx — max 1000 rows</p>
          </div>
          <button mat-stroked-button (click)="downloadTemplate()">
            <mat-icon>download</mat-icon> Template
          </button>
        </div>
        <div class="drop-zone" (click)="fileInput.click()" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
          <mat-icon class="upload-icon">upload_file</mat-icon>
          <p>Click to select or drag & drop (.csv or .xlsx)</p>
          <input #fileInput type="file" accept=".csv,.xlsx" hidden (change)="onFileSelected($event)" />
        </div>
        @if (fileName()) {
          <mat-chip-set><mat-chip>{{ fileName() }}</mat-chip></mat-chip-set>
        }
      </mat-card-content>
    </mat-card>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    @if (previewReady() && !committed()) {
      <mat-card class="preview-card">
        <mat-card-header>
          <mat-card-title>Preview — {{ rows().length }} rows</mat-card-title>
          <mat-card-subtitle>{{ subtitle() }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="table-wrap">
            <table mat-table [dataSource]="rows()" class="full-table">
              <ng-container matColumnDef="skuCode">
                <th mat-header-cell *matHeaderCellDef>SKU Code</th>
                <td mat-cell *matCellDef="let r"><code>{{ r.skuCode }}</code></td>
              </ng-container>
              <ng-container matColumnDef="qty">
                <th mat-header-cell *matHeaderCellDef>{{ mode === 'add' ? 'Add Qty' : 'New Stock' }}</th>
                <td mat-cell *matCellDef="let r">{{ r.qty }}</td>
              </ng-container>
              <ng-container matColumnDef="oldStock">
                <th mat-header-cell *matHeaderCellDef>Current Stock</th>
                <td mat-cell *matCellDef="let r">{{ r.oldStock ?? '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="newStock">
                <th mat-header-cell *matHeaderCellDef>Result Stock</th>
                <td mat-cell *matCellDef="let r">{{ r.newStock ?? '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let r">
                  <span [class]="statusClass(r.status)">{{ statusLabel(r.status) }}</span>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols;" [class.row-error]="row.status === 'not_found'"></tr>
            </table>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-button (click)="reset()">Clear</button>
          <button mat-flat-button color="primary" [disabled]="foundCount() === 0 || committing()" (click)="commit()">
            {{ commitLabel() }}
          </button>
        </mat-card-actions>
      </mat-card>
    }

    @if (committed()) {
      <mat-card class="success-card">
        <mat-card-content>✅ Stock updated for {{ committedCount() }} SKUs.</mat-card-content>
        <mat-card-actions>
          <button mat-button (click)="reset()">Upload another file</button>
        </mat-card-actions>
      </mat-card>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    h1 { margin: 0; }
    .mode-card, .upload-card { margin-bottom: 16px; }
    .mode-label { margin: 0 0 10px; font-size: 13px; color: #555; font-weight: 500; }
    .mode-desc { margin: 10px 0 0; font-size: 13px; color: #777; }
    .upload-row { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .col-info { flex: 1; }
    .hint { margin: 0 0 4px; font-size: 13px; color: #555; }
    .hint.small { font-size: 12px; color: #999; }
    .drop-zone { border: 2px dashed #bdbdbd; border-radius: 8px; padding: 32px; text-align: center; cursor: pointer; transition: border-color .2s; }
    .drop-zone:hover { border-color: #3f51b5; }
    .upload-icon { font-size: 40px; width: 40px; height: 40px; color: #9e9e9e; }
    code { font-size: 12px; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
    .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .full-table { width: 100%; min-width: 500px; }
    .preview-card, .success-card { margin-top: 16px; }
    .success-card mat-card-content { color: #2e7d32; font-weight: 600; font-size: 15px; }
    .row-error td { color: #c62828; }
    .badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-ok { background: #e8f5e9; color: #2e7d32; }
    .badge-not_found { background: #fce4ec; color: #c62828; }
  `],
})
export class InventoryUploadComponent {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  mode: Mode = 'set';
  cols = ['skuCode', 'qty', 'oldStock', 'newStock', 'status'];
  fileName = signal('');
  rows = signal<StockRow[]>([]);
  loading = signal(false);
  committing = signal(false);
  previewReady = signal(false);
  committed = signal(false);
  committedCount = signal(0);

  modeDesc() {
    return this.mode === 'set'
      ? 'Replaces the current stock quantity with the uploaded value.'
      : 'Adds the uploaded quantity on top of existing stock — use this when a new shipment arrives.';
  }

  expectedCols() { return TEMPLATES[this.mode].headers.join(', '); }
  foundCount() { return this.rows().filter(r => r.status === 'ok').length; }
  subtitle() {
    const found = this.foundCount();
    const notFound = this.rows().filter(r => r.status === 'not_found').length;
    return `✅ ${found} found  ❌ ${notFound} not found`;
  }
  commitLabel() {
    if (this.committing()) return 'Committing…';
    const n = this.foundCount();
    return `Commit ${n} update${n !== 1 ? 's' : ''}`;
  }
  statusClass(s?: string) { return `badge badge-${s ?? 'unknown'}`; }
  statusLabel(s?: string) { return s === 'ok' ? '✅ Found' : s === 'not_found' ? '❌ Not found' : '…'; }

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
    this.rows.set([]);
    this.previewReady.set(false);
    this.committed.set(false);
    this.loading.set(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsed: Record<string, string | number>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!parsed.length) { this.snack.open('File is empty', '', { duration: 3000 }); this.loading.set(false); return; }
        if (parsed.length > 1000) { this.snack.open('Max 1000 rows', '', { duration: 3000 }); this.loading.set(false); return; }

        const qtyKey = this.mode === 'add' ? 'ADD_QTY' : 'STOCK_QTY';
        const updates = parsed
          .map(r => ({ skuCode: String(r['SKU_CODE'] ?? '').trim().toUpperCase(), qty: Number(r[qtyKey] ?? 0) }))
          .filter(r => r.skuCode);

        const res = await this.api.patch<{ results: StockRow[] }>('skus/bulk-stock', { mode: this.mode, dryRun: true, updates }).toPromise();
        this.rows.set(res?.results ?? []);
        this.previewReady.set(true);
      } catch (err: any) {
        this.snack.open(err?.error?.error?.message ?? 'Failed to preview file', '', { duration: 4000 });
      }
      this.loading.set(false);
    };
    reader.readAsArrayBuffer(file);
  }

  async commit() {
    this.committing.set(true);
    try {
      const updates = this.rows().filter(r => r.status === 'ok').map(r => ({ skuCode: r.skuCode, qty: r.qty }));
      const res = await this.api.patch<{ updated: number }>('skus/bulk-stock', { mode: this.mode, dryRun: false, updates }).toPromise();
      this.committedCount.set(res?.updated ?? 0);
      this.committed.set(true);
    } catch (err: any) {
      this.snack.open(err?.error?.error?.message ?? 'Commit failed', '', { duration: 4000 });
    }
    this.committing.set(false);
  }

  downloadTemplate() {
    const t = TEMPLATES[this.mode];
    const ws = XLSX.utils.aoa_to_sheet([t.headers, ...t.sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `ted-${this.mode}-stock-template.xlsx`);
  }

  reset() {
    this.fileName.set('');
    this.rows.set([]);
    this.previewReady.set(false);
    this.committed.set(false);
    this.committedCount.set(0);
  }
}

import { Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../core/services/api.service';

interface SkuUpdate { skuCode: string; stockQty: number; status: 'found' | 'not_found'; currentStock?: number; }

@Component({
  selector: 'app-inventory-upload',
  standalone: true,
  imports: [
    MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatProgressBarModule, MatSnackBarModule, MatChipsModule,
  ],
  template: `
    <div class="page-header">
      <h1>Inventory Upload</h1>
    </div>

    <mat-card class="upload-card">
      <mat-card-content>
        <p>Upload a CSV file with columns: <code>SKU_CODE, STOCK_QTY</code></p>
        <p class="hint">Each row updates the stock for that SKU. Unknown SKU codes are flagged.</p>
        <div class="drop-zone" (click)="fileInput.click()" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
          <mat-icon class="upload-icon">upload_file</mat-icon>
          <p>Click to select or drag & drop a CSV file</p>
          <input #fileInput type="file" accept=".csv" hidden (change)="onFileSelected($event)" />
        </div>
        @if (fileName()) {
          <mat-chip-set><mat-chip>{{ fileName() }}</mat-chip></mat-chip-set>
        }
      </mat-card-content>
    </mat-card>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    @if (preview().length) {
      <mat-card class="preview-card">
        <mat-card-header>
          <mat-card-title>Preview ({{ preview().length }} rows)</mat-card-title>
          <mat-card-subtitle>
            ✅ {{ found() }} found &nbsp; ❌ {{ notFound() }} not found
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="preview()" class="full-width">
            <ng-container matColumnDef="skuCode">
              <th mat-header-cell *matHeaderCellDef>SKU Code</th>
              <td mat-cell *matCellDef="let r"><code>{{ r.skuCode }}</code></td>
            </ng-container>
            <ng-container matColumnDef="stockQty">
              <th mat-header-cell *matHeaderCellDef>New Stock</th>
              <td mat-cell *matCellDef="let r">{{ r.stockQty }}</td>
            </ng-container>
            <ng-container matColumnDef="current">
              <th mat-header-cell *matHeaderCellDef>Current Stock</th>
              <td mat-cell *matCellDef="let r">{{ r.currentStock ?? '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let r">
                <span [class]="'badge badge-' + r.status">{{ r.status === 'found' ? '✅ Found' : '❌ Not found' }}</span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;" [class.row-error]="row.status === 'not_found'"></tr>
          </table>
        </mat-card-content>
        <mat-card-actions>
          <button mat-button (click)="reset()">Clear</button>
          <button mat-flat-button color="primary" [disabled]="found() === 0 || committing()" (click)="commit()">
            Commit {{ found() }} updates
          </button>
        </mat-card-actions>
      </mat-card>
    }

    @if (committed()) {
      <mat-card class="success-card">
        <mat-card-content>✅ Inventory updated for {{ committed() }} SKUs.</mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    h1 { margin: 0; }
    .upload-card { margin-bottom: 16px; }
    .hint { color: #666; font-size: 13px; margin: 4px 0 16px; }
    .drop-zone { border: 2px dashed #bdbdbd; border-radius: 8px; padding: 40px; text-align: center; cursor: pointer; transition: border-color .2s; }
    .drop-zone:hover { border-color: #3f51b5; }
    .upload-icon { font-size: 48px; width: 48px; height: 48px; color: #9e9e9e; }
    code { font-size: 12px; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
    .full-width { width: 100%; }
    .badge { padding: 2px 8px; border-radius: 12px; font-size: 12px; }
    .badge-found { background: #e8f5e9; color: #2e7d32; }
    .badge-not_found { background: #fce4ec; color: #c62828; }
    .row-error td { color: #c62828; }
    .preview-card, .success-card { margin-top: 16px; }
    .success-card mat-card-content { color: #2e7d32; font-weight: 600; }
  `],
})
export class InventoryUploadComponent {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  cols = ['skuCode', 'stockQty', 'current', 'status'];
  fileName = signal('');
  preview = signal<SkuUpdate[]>([]);
  loading = signal(false);
  committing = signal(false);
  committed = signal(0);

  get found() { return signal(this.preview().filter(r => r.status === 'found').length); }
  get notFound() { return signal(this.preview().filter(r => r.status === 'not_found').length); }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  processFile(file: File) {
    this.fileName.set(file.name);
    this.loading.set(true);
    this.committed.set(0);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = (e.target?.result as string) ?? '';
      const rows = text.trim().split('\n').slice(1); // skip header
      const parsed = rows.map(row => {
        const [skuCode, stockQty] = row.split(',').map(s => s.trim().replace(/"/g, ''));
        return { skuCode: skuCode?.toUpperCase(), stockQty: parseInt(stockQty) || 0 };
      }).filter(r => r.skuCode);

      const results: SkuUpdate[] = [];
      for (const row of parsed) {
        try {
          const sku = await this.api.get<{ stockQty: number }>(`skus/by-code/${row.skuCode}`).toPromise();
          results.push({ ...row, status: 'found', currentStock: sku?.stockQty });
        } catch {
          results.push({ ...row, status: 'not_found' });
        }
      }
      this.preview.set(results);
      this.loading.set(false);
    };
    reader.readAsText(file);
  }

  async commit() {
    this.committing.set(true);
    const toUpdate = this.preview().filter(r => r.status === 'found');
    let count = 0;
    for (const row of toUpdate) {
      try {
        const sku = await this.api.get<{ id: string }>(`skus/by-code/${row.skuCode}`).toPromise();
        if (sku) {
          await this.api.patch(`skus/${sku.id}`, { stockQty: row.stockQty }).toPromise();
          count++;
        }
      } catch { /* skip */ }
    }
    this.committed.set(count);
    this.committing.set(false);
    this.snack.open(`Updated ${count} SKUs`, '', { duration: 3000 });
  }

  reset() {
    this.preview.set([]);
    this.fileName.set('');
    this.committed.set(0);
  }
}

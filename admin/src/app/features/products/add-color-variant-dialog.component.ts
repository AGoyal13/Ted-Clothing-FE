import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';

interface SizeRow { sizeLabel: string; stockQty: number; }

@Component({
  selector: 'app-add-color-variant-dialog',
  standalone: true,
  imports: [
    FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Add Color with Sizes</h2>
    <mat-dialog-content>
      <div class="form">
        <!-- Color fields -->
        <div class="row">
          <mat-form-field appearance="outline" class="flex2">
            <mat-label>Color Name</mat-label>
            <input matInput [(ngModel)]="colorName" placeholder="e.g. Navy Blue" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex1">
            <mat-label>Hex (optional)</mat-label>
            <input matInput [(ngModel)]="colorHex" placeholder="#1a237e" />
            @if (colorHex) {
              <span matSuffix class="swatch" [style.background]="colorHex"></span>
            }
          </mat-form-field>
        </div>

        <!-- Suggested sizes -->
        @if (data.suggestedSizes.length) {
          <div class="suggestions">
            <span class="hint">Quick add:</span>
            @for (s of data.suggestedSizes; track s) {
              <button class="chip" (click)="addSuggested(s)" type="button">{{ s }}</button>
            }
          </div>
        }

        <!-- Sizes table -->
        <div class="sizes-section">
          <div class="sizes-header">
            <span class="col-size">Size</span>
            <span class="col-stock">Stock Qty</span>
            <span class="col-del"></span>
          </div>
          @for (row of rows(); track $index) {
            <div class="size-row">
              <input class="inp-size" [(ngModel)]="row.sizeLabel" placeholder="e.g. M" />
              <input class="inp-stock" type="number" [(ngModel)]="row.stockQty" min="0" placeholder="0" />
              <button class="del-btn" (click)="removeRow($index)" type="button" title="Remove">✕</button>
            </div>
          }
          <button mat-button (click)="addRow()" type="button" class="add-row-btn">
            <mat-icon>add</mat-icon> Add Size
          </button>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="!canSave() || loading()">
        @if (loading()) { <mat-spinner diameter="18" /> }
        @else { Save ({{ validRows() }} size{{ validRows() === 1 ? '' : 's' }}) }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; min-width: 380px; }
    .row { display: flex; gap: 12px; }
    .flex1 { flex: 1; }
    .flex2 { flex: 2; }
    .swatch { display: inline-block; width: 18px; height: 18px; border-radius: 50%; border: 1px solid #ddd; margin-right: 4px; }

    .suggestions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .hint { font-size: 12px; color: #777; }
    .chip { padding: 3px 10px; border: 1px solid #1a237e; border-radius: 14px; background: transparent;
      color: #1a237e; font-size: 12px; cursor: pointer; }
    .chip:hover { background: #e8eaf6; }

    .sizes-section { border: 1px solid #e0e0e0; border-radius: 6px; padding: 8px; }
    .sizes-header { display: flex; gap: 8px; padding: 0 4px 6px; border-bottom: 1px solid #f0f0f0; margin-bottom: 6px; }
    .col-size { flex: 2; font-size: 11px; font-weight: 600; color: #777; text-transform: uppercase; }
    .col-stock { flex: 1; font-size: 11px; font-weight: 600; color: #777; text-transform: uppercase; }
    .col-del { width: 28px; }

    .size-row { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
    .inp-size { flex: 2; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; }
    .inp-size:focus { outline: none; border-color: #1a237e; }
    .inp-stock { flex: 1; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; text-align: center; }
    .inp-stock:focus { outline: none; border-color: #1a237e; }
    .del-btn { width: 28px; background: none; border: none; cursor: pointer; color: #bbb; font-size: 13px; }
    .del-btn:hover { color: #c62828; }
    .add-row-btn { color: #1a237e; font-size: 13px; margin-top: 2px; }
    mat-spinner { margin: auto; }
  `],
})
export class AddColorVariantDialogComponent {
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<AddColorVariantDialogComponent>);
  private snack = inject(MatSnackBar);
  data: { productId: string; suggestedSizes: string[] } = inject(MAT_DIALOG_DATA);

  colorName = '';
  colorHex = '';
  rows = signal<SizeRow[]>([{ sizeLabel: '', stockQty: 0 }]);
  loading = signal(false);

  validRows() { return this.rows().filter(r => r.sizeLabel.trim()).length; }
  canSave() { return this.colorName.trim() && this.validRows() > 0; }

  addRow() { this.rows.update(r => [...r, { sizeLabel: '', stockQty: 0 }]); }

  removeRow(index: number) {
    this.rows.update(r => r.filter((_, i) => i !== index));
    if (!this.rows().length) this.addRow();
  }

  addSuggested(size: string) {
    const already = this.rows().some(r => r.sizeLabel.trim().toUpperCase() === size.toUpperCase());
    if (already) return;
    // Fill first empty row, otherwise append
    const emptyIdx = this.rows().findIndex(r => !r.sizeLabel.trim());
    if (emptyIdx !== -1) {
      this.rows.update(r => r.map((row, i) => i === emptyIdx ? { ...row, sizeLabel: size } : row));
    } else {
      this.rows.update(r => [...r, { sizeLabel: size, stockQty: 0 }]);
    }
  }

  save() {
    if (!this.canSave()) return;
    this.loading.set(true);
    const body = {
      colorName: this.colorName.trim(),
      colorHex: this.colorHex.trim() || undefined,
      sizes: this.rows()
        .filter(r => r.sizeLabel.trim())
        .map(r => ({ sizeLabel: r.sizeLabel.trim(), stockQty: Math.max(0, r.stockQty || 0) })),
    };
    this.api.post(`products/${this.data.productId}/color-variants`, body).subscribe({
      next: () => this.ref.close(true),
      error: (e) => {
        this.snack.open(e?.error?.error?.message ?? 'Failed to save', '', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }
}

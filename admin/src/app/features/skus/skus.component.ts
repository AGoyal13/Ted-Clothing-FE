import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';

interface Sku {
  id: string; skuCode: string; sizeLabel: string; stockQty: number;
  priceOverride: number | null;
  product: { id: string; title: string };
  color: { colorName: string; colorHex: string | null };
}

@Component({
  selector: 'app-skus',
  standalone: true,
  imports: [
    FormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatProgressBarModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-header">
      <h1>SKU Lookup</h1>
    </div>
    <mat-card class="search-card">
      <div class="search-row">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search by SKU code</mat-label>
          <input matInput [(ngModel)]="searchCode" (keyup.enter)="search()" placeholder="TED-SHRT-NAVY-M" />
        </mat-form-field>
        <button mat-flat-button color="primary" (click)="search()">Search</button>
      </div>
    </mat-card>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    @if (sku()) {
      <mat-card class="sku-card">
        <mat-card-header>
          <mat-card-title><code>{{ sku()!.skuCode }}</code></mat-card-title>
          <mat-card-subtitle>{{ sku()!.product.title }} · {{ sku()!.color.colorName }} · {{ sku()!.sizeLabel }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="edit-row">
            <mat-form-field appearance="outline">
              <mat-label>Stock Qty</mat-label>
              <input matInput type="number" [(ngModel)]="editStock" min="0" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Price Override (₹)</mat-label>
              <input matInput type="number" [(ngModel)]="editPrice" min="0" placeholder="—" />
            </mat-form-field>
            <button mat-flat-button color="primary" (click)="saveSku()">Save</button>
          </div>
        </mat-card-content>
      </mat-card>
    }
    @if (notFound()) {
      <p class="muted">No SKU found for that code.</p>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    h1 { margin: 0; }
    .search-card { margin-bottom: 16px; padding: 8px; }
    .search-row { display: flex; gap: 12px; align-items: center; padding: 8px; }
    .search-field { flex: 1; }
    .sku-card { margin-top: 16px; }
    .edit-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    code { font-size: 16px; font-weight: 700; }
    .muted { color: #999; margin-top: 16px; }
  `],
})
export class SkusComponent {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  searchCode = '';
  sku = signal<Sku | null>(null);
  loading = signal(false);
  notFound = signal(false);
  editStock = 0;
  editPrice: number | null = null;

  search() {
    if (!this.searchCode.trim()) return;
    this.loading.set(true);
    this.sku.set(null);
    this.notFound.set(false);
    this.api.get<Sku>(`skus/by-code/${this.searchCode.trim().toUpperCase()}`).subscribe({
      next: (s) => {
        this.sku.set(s);
        this.editStock = s.stockQty;
        this.editPrice = s.priceOverride;
        this.loading.set(false);
      },
      error: () => { this.notFound.set(true); this.loading.set(false); },
    });
  }

  saveSku() {
    const s = this.sku();
    if (!s) return;
    this.api.patch(`skus/${s.id}`, { stockQty: Number(this.editStock), priceOverride: this.editPrice ? Number(this.editPrice) : undefined }).subscribe({
      next: () => this.snack.open('Saved', '', { duration: 1500 }),
      error: (e) => this.snack.open(e?.error?.error?.message ?? 'Error', '', { duration: 3000 }),
    });
  }
}

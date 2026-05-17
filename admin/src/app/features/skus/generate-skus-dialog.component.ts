import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface Color { id: string; colorName: string; colorHex: string | null; }
interface ProductDetail { id: string; title: string; colors: Color[]; category: { sizeTemplate?: { sizes: string[] } | null }; }

@Component({
  selector: 'app-generate-skus-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, FormsModule, MatDialogModule, MatButtonModule,
    MatCheckboxModule, MatProgressSpinnerModule, MatSnackBarModule, MatChipsModule, MatCardModule,
  ],
  template: `
    <h2 mat-dialog-title>Generate SKUs — {{ data.product.title }}</h2>
    <mat-dialog-content>
      <p class="hint">Select colors and sizes. SKUs will be created for each combination.</p>

      <h4>Colors</h4>
      <div class="check-list">
        @for (c of data.product.colors; track c.id) {
          <mat-checkbox [(ngModel)]="colorSelected[c.id]">
            <span class="dot" [style.background]="c.colorHex || '#ccc'"></span>
            {{ c.colorName }}
          </mat-checkbox>
        }
      </div>

      <h4>Sizes</h4>
      @if (availableSizes().length) {
        <div class="check-list">
          @for (s of availableSizes(); track s) {
            <mat-checkbox [(ngModel)]="sizeSelected[s]">{{ s }}</mat-checkbox>
          }
        </div>
      } @else {
        <p class="muted">No size template on this category. Enter sizes manually:</p>
        <div class="manual-sizes">
          @for (s of manualSizes; track i; let i = $index) {
            <input [(ngModel)]="manualSizes[i]" placeholder="e.g. M" class="size-input" />
          }
          <button mat-button (click)="manualSizes.push('')">+ Add size</button>
        </div>
      }

      @if (result()) {
        <mat-card class="result-card">
          <mat-card-content>
            <p>✅ Created: <strong>{{ result()!.created }}</strong> SKUs</p>
            @if (result()!.skipped > 0) {
              <p>⏭ Skipped: {{ result()!.skipped }} (already exist)</p>
            }
          </mat-card-content>
        </mat-card>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="ref.close(result() != null)">{{ result() ? 'Done' : 'Cancel' }}</button>
      @if (!result()) {
        <button mat-flat-button color="primary" (click)="generate()" [disabled]="loading()">
          @if (loading()) { <mat-spinner diameter="18" /> } @else { Generate }
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .hint { margin: 0 0 12px; color: #555; }
    h4 { margin: 12px 0 6px; }
    .check-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; border: 1px solid #ddd; margin-right: 4px; vertical-align: middle; }
    .muted { color: #999; font-size: 13px; }
    .manual-sizes { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .size-input { width: 60px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; }
    .result-card { margin-top: 16px; background: #f1f8e9; }
    mat-spinner { margin: auto; }
  `],
})
export class GenerateSkusDialogComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  ref = inject(MatDialogRef<GenerateSkusDialogComponent>);
  data: { product: ProductDetail } = inject(MAT_DIALOG_DATA);

  colorSelected: Record<string, boolean> = {};
  sizeSelected: Record<string, boolean> = {};
  manualSizes: string[] = ['XS', 'S', 'M', 'L', 'XL'];
  availableSizes = signal<string[]>([]);
  loading = signal(false);
  result = signal<{ created: number; skipped: number } | null>(null);

  ngOnInit() {
    this.data.product.colors.forEach(c => this.colorSelected[c.id] = true);
    // load category size template
    this.api.get<{ id: string; category: { sizeTemplate: { sizes: string[] } | null } }>(`products/${this.data.product.id}`)
      .subscribe(p => {
        const sizes = (p as any).category?.sizeTemplate?.sizes ?? [];
        this.availableSizes.set(sizes);
        sizes.forEach((s: string) => this.sizeSelected[s] = true);
      });
  }

  generate() {
    const colors = this.data.product.colors.filter(c => this.colorSelected[c.id]);
    const sizes = this.availableSizes().length
      ? this.availableSizes().filter(s => this.sizeSelected[s])
      : this.manualSizes.filter(Boolean);

    if (!colors.length || !sizes.length) {
      this.snack.open('Select at least one color and size', '', { duration: 2500 });
      return;
    }
    this.loading.set(true);
    const variants = colors.map(c => ({ colorId: c.id, sizes }));
    this.api.post<{ created: number; skipped: number }>(`products/${this.data.product.id}/skus`, { variants })
      .subscribe({
        next: (r) => { this.result.set(r); this.loading.set(false); },
        error: (e) => { this.snack.open(e?.error?.error?.message ?? 'Error', '', { duration: 3000 }); this.loading.set(false); },
      });
  }
}

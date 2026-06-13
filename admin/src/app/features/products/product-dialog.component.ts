import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { Product } from './products.component';

@Component({
  selector: 'app-product-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.product ? 'Edit Product' : 'New Product' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Category</mat-label>
          <mat-select formControlName="categoryId">
            @for (c of categories(); track c.id) {
              <mat-option [value]="c.id">{{ c.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Base Price (₹)</mat-label>
            <input matInput type="number" formControlName="basePrice" min="0" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Discount %</mat-label>
            <input matInput type="number" formControlName="discountPercent" min="0" max="100" />
          </mat-form-field>
        </div>
        @if (data.product) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="DRAFT">Draft</mat-option>
              <mat-option value="ACTIVE">Active</mat-option>
              <mat-option value="ARCHIVED">Archived</mat-option>
            </mat-select>
          </mat-form-field>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="loading()">
        @if (loading()) { <mat-spinner diameter="18" /> } @else { Save }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 4px; padding-top: 8px; }
    .full-width { width: 100%; }
    .row { display: flex; gap: 12px; }
    .row mat-form-field { flex: 1; }
    mat-spinner { margin: auto; }
  `],
})
export class ProductDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<ProductDialogComponent>);
  private snack = inject(MatSnackBar);
  data: { product?: Product } = inject(MAT_DIALOG_DATA);

  categories = signal<{ id: string; name: string }[]>([]);
  loading = signal(false);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    categoryId: ['', Validators.required],
    basePrice: [0, [Validators.required, Validators.min(0)]],
    discountPercent: [0, [Validators.min(0), Validators.max(100)]],
    status: ['DRAFT'],
  });

  ngOnInit() {
    this.api.get<{ id: string; name: string }[]>('categories').subscribe(c => this.categories.set(c));
    if (this.data.product) {
      const p = this.data.product;
      this.form.patchValue({ title: p.title, description: p.description, categoryId: p.category.id, basePrice: p.basePrice, discountPercent: p.discountPercent, status: p.status });
    }
  }

  save() {
    if (this.form.invalid) {
      this.snack.open('Please fill in all required fields', '', { duration: 3000 });
      return;
    }
    this.loading.set(true);
    const { status, ...createBody } = this.form.value;
    const body = this.data.product ? this.form.value : createBody;
    const req = this.data.product
      ? this.api.patch(`products/${this.data.product.id}`, body)
      : this.api.post('products', body);
    req.subscribe({
      next: () => this.ref.close(true),
      error: (e) => { this.snack.open(e?.error?.error?.message ?? 'Error', '', { duration: 3000 }); this.loading.set(false); },
    });
  }
}

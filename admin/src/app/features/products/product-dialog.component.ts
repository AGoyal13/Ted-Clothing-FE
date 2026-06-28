import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable, of, map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Product } from './products.component';

interface Brand { id: string; name: string; }

@Component({
  selector: 'app-product-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatAutocompleteModule, MatButtonModule,
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
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Brand</mat-label>
          <input matInput formControlName="brandName" [matAutocomplete]="brandAuto"
                 placeholder="Select or type to add a new brand" />
          <mat-autocomplete #brandAuto="matAutocomplete">
            @for (b of filteredBrands(); track b.id) {
              <mat-option [value]="b.name">{{ b.name }}</mat-option>
            }
            @if (showCreateBrandOption()) {
              <mat-option [value]="brandQuery().trim()">+ Add "{{ brandQuery().trim() }}"</mat-option>
            }
          </mat-autocomplete>
          <mat-hint>Optional — leave blank for no brand</mat-hint>
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
  brands = signal<Brand[]>([]);
  brandQuery = signal('');
  loading = signal(false);

  // Brands whose name contains the typed text (case-insensitive).
  filteredBrands = computed(() => {
    const q = this.brandQuery().trim().toLowerCase();
    const list = this.brands();
    return q ? list.filter(b => b.name.toLowerCase().includes(q)) : list;
  });

  // Offer "+ Add X" only when the typed name doesn't already exist exactly.
  showCreateBrandOption = computed(() => {
    const q = this.brandQuery().trim();
    if (!q) return false;
    return !this.brands().some(b => b.name.toLowerCase() === q.toLowerCase());
  });

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    categoryId: ['', Validators.required],
    brandName: [''],
    basePrice: [0, [Validators.required, Validators.min(0)]],
    discountPercent: [0, [Validators.min(0), Validators.max(100)]],
    status: ['DRAFT'],
  });

  ngOnInit() {
    this.api.get<{ id: string; name: string }[]>('categories').subscribe(c => this.categories.set(c));
    this.api.get<Brand[]>('brands').subscribe(b => this.brands.set(b));
    this.form.controls.brandName.valueChanges.subscribe(v => this.brandQuery.set(v ?? ''));
    if (this.data.product) {
      const p = this.data.product;
      this.form.patchValue({
        title: p.title, description: p.description, categoryId: p.category.id,
        brandName: p.brand?.name ?? '',
        basePrice: p.basePrice, discountPercent: p.discountPercent, status: p.status,
      });
    }
  }

  // Resolve the typed brand name to a brandId: null if blank, an existing brand's
  // id if it matches, otherwise create it (backend dedups case-insensitively).
  private resolveBrandId(): Observable<string | null> {
    const name = (this.form.value.brandName ?? '').trim();
    if (!name) return of(null);
    const existing = this.brands().find(b => b.name.toLowerCase() === name.toLowerCase());
    if (existing) return of(existing.id);
    return this.api.post<Brand>('brands', { name }).pipe(map(b => b.id));
  }

  save() {
    if (this.form.invalid) {
      this.snack.open('Please fill in all required fields', '', { duration: 3000 });
      return;
    }
    this.loading.set(true);
    this.resolveBrandId().subscribe({
      next: (brandId) => {
        const v = this.form.value;
        const base = {
          title: v.title,
          description: v.description,
          categoryId: v.categoryId,
          basePrice: v.basePrice,
          discountPercent: v.discountPercent,
          brandId,
        };
        const body = this.data.product ? { ...base, status: v.status } : base;
        const req = this.data.product
          ? this.api.patch(`products/${this.data.product.id}`, body)
          : this.api.post('products', body);
        req.subscribe({
          // On create, return the new product so the list can jump to its detail page;
          // on edit, just signal success (true) so the list reloads in place.
          next: (res: any) => this.ref.close(this.data.product ? true : res),
          error: (e) => { this.snack.open(e?.error?.error?.message ?? 'Error', '', { duration: 3000 }); this.loading.set(false); },
        });
      },
      error: (e) => { this.snack.open(e?.error?.error?.message ?? 'Failed to create brand', '', { duration: 3000 }); this.loading.set(false); },
    });
  }
}

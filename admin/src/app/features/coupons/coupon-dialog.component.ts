import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { Coupon, CouponType } from './coupons.component';

@Component({
  selector: 'app-coupon-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatSlideToggleModule, MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data?.coupon ? 'Edit' : 'New' }} Coupon</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Code</mat-label>
          <input matInput formControlName="code" style="text-transform:uppercase" />
          <mat-hint>Customers enter this at checkout (case-insensitive)</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Type</mat-label>
          <mat-select formControlName="type">
            <mat-option value="PERCENT">Percent off (%)</mat-option>
            <mat-option value="FLAT">Flat amount off (₹)</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ form.value.type === 'PERCENT' ? 'Percent (1–100)' : 'Amount (₹)' }}</mat-label>
          <input matInput type="number" formControlName="value" />
        </mat-form-field>

        @if (form.value.type === 'PERCENT') {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Max discount cap (₹) — optional</mat-label>
            <input matInput type="number" formControlName="maxDiscountAmount" />
            <mat-hint>e.g. "20% off up to ₹500"</mat-hint>
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Min order amount (₹) — optional</mat-label>
          <input matInput type="number" formControlName="minOrderAmount" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Max total uses — optional</mat-label>
          <input matInput type="number" formControlName="maxUses" />
          <mat-hint>Blank = unlimited. (Each customer can use a coupon once.)</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Expires on — optional</mat-label>
          <input matInput type="date" formControlName="expiresAt" />
        </mat-form-field>

        <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
        <mat-slide-toggle formControlName="isPublic">Show on storefront (advertise code)</mat-slide-toggle>

        @if (error()) { <p class="error">{{ error() }}</p> }
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
    .form { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }
    .full-width { width: 100%; }
    mat-spinner { margin: auto; }
    .error { color: #c0392b; font-size: 13px; margin: 4px 0 0; }
    mat-slide-toggle { margin: 4px 0 8px; }
  `],
})
export class CouponDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<CouponDialogComponent>);
  data: { coupon?: Coupon } | null = inject(MAT_DIALOG_DATA, { optional: true });

  form = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(3)]],
    type: ['PERCENT' as CouponType, Validators.required],
    value: [null as number | null, [Validators.required, Validators.min(0.01)]],
    maxDiscountAmount: [null as number | null],
    minOrderAmount: [null as number | null],
    maxUses: [null as number | null],
    expiresAt: [null as string | null],
    isActive: [true],
    isPublic: [false],
  });
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    const c = this.data?.coupon;
    if (c) {
      this.form.patchValue({
        code: c.code,
        type: c.type,
        value: Number(c.value),
        maxDiscountAmount: c.maxDiscountAmount != null ? Number(c.maxDiscountAmount) : null,
        minOrderAmount: c.minOrderAmount != null ? Number(c.minOrderAmount) : null,
        maxUses: c.maxUses,
        expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : null,
        isActive: c.isActive,
        isPublic: c.isPublic,
      });
    }
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error.set(null);
    const v = this.form.value;
    const isPercent = v.type === 'PERCENT';
    if (isPercent && (v.value ?? 0) > 100) {
      this.error.set('Percent value cannot exceed 100.');
      return;
    }

    // ?? null (not || undefined) so cleared optional fields are sent and actually cleared.
    const body: Record<string, unknown> = {
      code: (v.code ?? '').trim().toUpperCase(),
      type: v.type,
      value: v.value,
      minOrderAmount: v.minOrderAmount ?? null,
      maxDiscountAmount: isPercent ? (v.maxDiscountAmount ?? null) : null,
      maxUses: v.maxUses ?? null,
      // Expire at end of the chosen day
      expiresAt: v.expiresAt ? new Date(v.expiresAt + 'T23:59:59').toISOString() : null,
      isActive: v.isActive,
      isPublic: v.isPublic,
    };

    this.loading.set(true);
    const req = this.data?.coupon
      ? this.api.patch(`admin/coupons/${this.data.coupon.id}`, body)
      : this.api.post('admin/coupons', body);
    req.subscribe({
      next: () => this.ref.close(true),
      error: (e) => {
        this.error.set(e?.error?.error?.message ?? 'Save failed');
        this.loading.set(false);
      },
    });
  }
}

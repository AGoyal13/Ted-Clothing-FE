import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';

export interface WarehouseDialogData {
  warehouse?: {
    id: string; name: string; code: string; pincode: string;
    city: string; isActive: boolean; isDefault: boolean;
  };
}

@Component({
  selector: 'app-warehouse-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatCheckboxModule, MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.warehouse ? 'Edit Warehouse' : 'New Warehouse' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="warehouse-form">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" placeholder="Mumbai Hub" />
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            <mat-error>Name is required (min 2 chars)</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Code</mat-label>
          <input matInput formControlName="code" placeholder="MUM01" />
          <mat-hint>Short unique identifier</mat-hint>
          @if (form.get('code')?.invalid && form.get('code')?.touched) {
            <mat-error>Code is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Pincode</mat-label>
          <input matInput formControlName="pincode" placeholder="400001" maxlength="6" />
          @if (form.get('pincode')?.invalid && form.get('pincode')?.touched) {
            <mat-error>Enter a valid 6-digit pincode</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>City</mat-label>
          <input matInput formControlName="city" placeholder="Mumbai" />
          @if (form.get('city')?.invalid && form.get('city')?.touched) {
            <mat-error>City is required</mat-error>
          }
        </mat-form-field>

        <div class="checkbox-row">
          <mat-checkbox formControlName="isActive">Active</mat-checkbox>
          <mat-checkbox formControlName="isDefault">Set as Default</mat-checkbox>
        </div>

        @if (error) {
          <div class="error-msg">{{ error }}</div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="saving">
        @if (saving) { <mat-spinner diameter="18" /> } @else { Save }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .warehouse-form { display: flex; flex-direction: column; gap: 0.5rem; min-width: 340px; padding-top: 4px; }
    mat-form-field { width: 100%; }
    .checkbox-row { display: flex; gap: 1.5rem; padding: 4px 0; }
    .error-msg { color: #c62828; font-size: 0.82rem; margin-top: 4px; }
    mat-spinner { display: inline-block; }
  `],
})
export class WarehouseDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly dialogRef = inject(MatDialogRef<WarehouseDialogComponent>);
  readonly data: WarehouseDialogData = inject(MAT_DIALOG_DATA);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: ['', Validators.required],
    pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    city: ['', Validators.required],
    isActive: [true],
    isDefault: [false],
  });

  saving = false;
  error = '';

  ngOnInit() {
    if (this.data.warehouse) {
      this.form.patchValue(this.data.warehouse);
    }
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.error = '';
    const payload = this.form.value;
    const req = this.data.warehouse
      ? this.api.patch(`warehouses/${this.data.warehouse.id}`, payload)
      : this.api.post('warehouses', payload);

    req.subscribe({
      next: result => { this.saving = false; this.dialogRef.close(result); },
      error: err => {
        this.saving = false;
        this.error = err?.error?.error?.message ?? 'Save failed';
      },
    });
  }
}

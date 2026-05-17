import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { Category } from './categories.component';

@Component({
  selector: 'app-size-template-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Size Template — {{ data.category.name }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Measurements (comma-separated)</mat-label>
          <input matInput formControlName="measurements" placeholder="Chest, Shoulder, Sleeve, Length" />
          <mat-hint>e.g. Chest, Shoulder, Sleeve, Length</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Sizes (comma-separated)</mat-label>
          <input matInput formControlName="sizes" placeholder="XS, S, M, L, XL" />
          <mat-hint>e.g. XS, S, M, L, XL, XXL</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="loading()">
        @if (loading()) { <mat-spinner diameter="18" /> } @else { Save }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.form { display: flex; flex-direction: column; gap: 16px; padding-top: 8px; } .full-width { width: 100%; } mat-spinner { margin: auto; }`],
})
export class SizeTemplateDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<SizeTemplateDialogComponent>);
  private snack = inject(MatSnackBar);
  data: { category: Category } = inject(MAT_DIALOG_DATA);

  form = this.fb.group({
    measurements: ['', Validators.required],
    sizes: ['', Validators.required],
  });
  loading = signal(false);

  ngOnInit() {
    const t = this.data.category.sizeTemplate;
    if (t) {
      this.form.patchValue({
        measurements: t.measurements.join(', '),
        sizes: t.sizes.join(', '),
      });
    }
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const body = {
      measurements: this.form.value.measurements!.split(',').map(s => s.trim()).filter(Boolean),
      sizes: this.form.value.sizes!.split(',').map(s => s.trim()).filter(Boolean),
    };
    this.api.post(`categories/${this.data.category.id}/size-template`, body).subscribe({
      next: () => { this.snack.open('Saved', '', { duration: 2000 }); this.ref.close(true); },
      error: (e) => { this.snack.open(e?.error?.error?.message ?? 'Error', '', { duration: 3000 }); this.loading.set(false); },
    });
  }
}

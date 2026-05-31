import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { ImageUploadComponent } from './image-upload.component';
import { ColorSwatchPickerComponent } from '../../shared/color-swatch-picker.component';

interface Color { id: string; colorName: string; colorHex: string | null; images: string[]; }

@Component({
  selector: 'app-color-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
    ImageUploadComponent, ColorSwatchPickerComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.color ? 'Edit Color' : 'Add Color' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Color Name</mat-label>
          <input matInput formControlName="colorName" placeholder="e.g. Navy Blue" />
        </mat-form-field>

        <div class="hex-field">
          <label class="hex-label">Hex Color <span class="opt">(optional)</span></label>
          <app-color-swatch-picker
            [hex]="form.get('colorHex')?.value || ''"
            (hexChange)="form.patchValue({ colorHex: $event })">
          </app-color-swatch-picker>
        </div>

        <app-image-upload
          [productId]="data.productId"
          [initialImages]="currentImages"
          (imagesChange)="currentImages = $event">
        </app-image-upload>
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
    .form { display: flex; flex-direction: column; gap: 16px; padding-top: 8px; min-width: 380px; }
    .full-width { width: 100%; }
    mat-spinner { margin: auto; }
    .hex-field { display: flex; flex-direction: column; gap: 6px; }
    .hex-label { font-size: 12px; color: rgba(0,0,0,0.6); font-weight: 500; letter-spacing: 0.01em; }
    .opt { font-weight: 400; color: rgba(0,0,0,0.38); margin-left: 4px; }
  `],
})
export class ColorDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<ColorDialogComponent>);
  private snack = inject(MatSnackBar);
  data: { productId: string; color?: Color } = inject(MAT_DIALOG_DATA);

  form = this.fb.group({
    colorName: ['', [Validators.required, Validators.minLength(2)]],
    colorHex: [''],
  });
  loading = signal(false);
  currentImages: string[] = [];

  ngOnInit() {
    if (this.data.color) {
      this.form.patchValue({
        colorName: this.data.color.colorName,
        colorHex: this.data.color.colorHex ?? '',
      });
      this.currentImages = [...this.data.color.images];
    }
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const body = {
      colorName: this.form.value.colorName!,
      colorHex: this.form.value.colorHex || undefined,
      images: this.currentImages,
    };
    const req = this.data.color
      ? this.api.patch(`products/${this.data.productId}/colors/${this.data.color.id}`, body)
      : this.api.post(`products/${this.data.productId}/colors`, body);
    req.subscribe({
      next: () => this.ref.close(true),
      error: (e) => { this.snack.open(e?.error?.error?.message ?? 'Error', '', { duration: 3000 }); this.loading.set(false); },
    });
  }
}

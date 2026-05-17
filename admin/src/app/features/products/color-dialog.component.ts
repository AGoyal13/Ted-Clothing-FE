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

interface Color { id: string; colorName: string; colorHex: string | null; images: string[]; }

@Component({
  selector: 'app-color-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.color ? 'Edit Color' : 'Add Color' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Color Name</mat-label>
          <input matInput formControlName="colorName" placeholder="e.g. Navy Blue" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Hex Color</mat-label>
          <input matInput formControlName="colorHex" placeholder="#1a237e" />
          <mat-hint>Optional — for color swatch display</mat-hint>
        </mat-form-field>

        <label class="images-label">Image URLs (one per line, up to 12)</label>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Images</mat-label>
          <textarea matInput formControlName="imagesRaw" rows="6" placeholder="https://cdn.example.com/img1.jpg&#10;https://cdn.example.com/img2.jpg"></textarea>
          <mat-hint>{{ imageCount() }} / 12 images</mat-hint>
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
  styles: [`
    .form { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }
    .full-width { width: 100%; }
    .images-label { font-size: 12px; color: #666; }
    mat-spinner { margin: auto; }
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
    imagesRaw: [''],
  });
  loading = signal(false);

  get imageCount() {
    return signal(
      (this.form.value.imagesRaw ?? '').split('\n').map(s => s.trim()).filter(Boolean).length
    );
  }

  ngOnInit() {
    if (this.data.color) {
      this.form.patchValue({
        colorName: this.data.color.colorName,
        colorHex: this.data.color.colorHex ?? '',
        imagesRaw: this.data.color.images.join('\n'),
      });
    }
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const images = (this.form.value.imagesRaw ?? '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 12);
    const body = { colorName: this.form.value.colorName!, colorHex: this.form.value.colorHex || undefined, images };
    const req = this.data.color
      ? this.api.patch(`products/${this.data.productId}/colors/${this.data.color.id}`, body)
      : this.api.post(`products/${this.data.productId}/colors`, body);
    req.subscribe({
      next: () => this.ref.close(true),
      error: (e) => { this.snack.open(e?.error?.error?.message ?? 'Error', '', { duration: 3000 }); this.loading.set(false); },
    });
  }
}

import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';
import { Category, ProductGender } from './categories.component';

@Component({
  selector: 'app-category-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatProgressSpinnerModule, MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.category ? 'Edit' : 'New' }} Category</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Parent Category</mat-label>
          <mat-select formControlName="parentId">
            <mat-option [value]="null">— None —</mat-option>
            @for (c of data.categories; track c.id) {
              @if (c.id !== data.category?.id) {
                <mat-option [value]="c.id">{{ c.name }}</mat-option>
              }
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Gender</mat-label>
          <mat-select formControlName="gender">
            <mat-option [value]="null">— None —</mat-option>
            @for (g of genders; track g) {
              <mat-option [value]="g">{{ g }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Image upload -->
        <div class="image-section">
          <div class="image-label">Category Image</div>
          <div class="image-row">
            @if (previewUrl()) {
              <img [src]="previewUrl()!" class="image-preview" alt="Category image preview" />
            } @else {
              <div class="image-placeholder"><mat-icon>image</mat-icon></div>
            }
            <div class="image-actions">
              <button type="button" mat-stroked-button (click)="fileInput.click()">
                <mat-icon>upload</mat-icon> {{ previewUrl() ? 'Replace' : 'Upload' }} Image
              </button>
              @if (previewUrl() && (pendingFile() || data.category?.imageUrl)) {
                <button type="button" mat-button color="warn" (click)="clearImage()">Remove</button>
              }
              <input #fileInput type="file" accept="image/jpeg,image/png,image/webp"
                     style="display:none" (change)="onFileSelected($event)" />
              <span class="image-hint">JPEG, PNG or WebP · Resized to 800×800</span>
            </div>
          </div>
        </div>
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
    .image-section { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
    .image-label { font-size: 12px; color: rgba(0,0,0,.6); }
    .image-row { display: flex; gap: 12px; align-items: flex-start; }
    .image-preview { width: 72px; height: 72px; object-fit: cover; border-radius: 4px; border: 1px solid #e0e0e0; flex-shrink: 0; }
    .image-placeholder { width: 72px; height: 72px; border-radius: 4px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #bbb; }
    .image-actions { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
    .image-hint { font-size: 11px; color: #999; }
  `],
})
export class CategoryDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ref = inject(MatDialogRef<CategoryDialogComponent>);
  data: { category?: Category; categories: Category[] } = inject(MAT_DIALOG_DATA);

  genders: ProductGender[] = ['MEN', 'WOMEN', 'KIDS', 'UNISEX'];
  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    parentId: [null as string | null],
    gender: [null as ProductGender | null],
  });
  loading = signal(false);
  pendingFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  removeImage = signal(false);

  ngOnInit() {
    if (this.data.category) {
      this.form.patchValue({
        name: this.data.category.name,
        parentId: this.data.category.parentId,
        gender: this.data.category.gender ?? null,
      });
      if (this.data.category.imageUrl) {
        this.previewUrl.set(this.data.category.imageUrl);
      }
    }
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.pendingFile.set(file);
    this.removeImage.set(false);
    const reader = new FileReader();
    reader.onload = (e) => this.previewUrl.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  clearImage() {
    this.pendingFile.set(null);
    this.previewUrl.set(null);
    this.removeImage.set(true);
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);

    const baseBody = {
      name: this.form.value.name,
      parentId: this.form.value.parentId || undefined,
      gender: this.form.value.gender || undefined,
    };

    if (this.data.category) {
      // EDIT: upload image first if changed, then patch
      this.uploadIfNeeded(this.data.category.id).then(imageUrl => {
        const body: Record<string, unknown> = { ...baseBody };
        if (imageUrl !== undefined) body['imageUrl'] = imageUrl;
        this.api.patch(`categories/${this.data.category!.id}`, body)
          .subscribe({ next: () => this.ref.close(true), error: () => this.loading.set(false) });
      });
    } else {
      // CREATE: create first, then upload if needed, then patch
      this.api.post<{ id: string }>('categories', baseBody).subscribe({
        next: async (cat) => {
          const imageUrl = await this.uploadIfNeeded(cat.id);
          if (imageUrl) {
            this.api.patch(`categories/${cat.id}`, { imageUrl })
              .subscribe({ next: () => this.ref.close(true), error: () => this.ref.close(true) });
          } else {
            this.ref.close(true);
          }
        },
        error: () => this.loading.set(false),
      });
    }
  }

  private uploadIfNeeded(categoryId: string): Promise<string | null | undefined> {
    if (this.pendingFile()) {
      const fd = new FormData();
      fd.append('file', this.pendingFile()!);
      return new Promise((resolve) => {
        this.api.uploadFiles<{ url: string }>(`upload/category-image?categoryId=${categoryId}`, fd)
          .subscribe({ next: (r) => resolve(r.url), error: () => resolve(undefined) });
      });
    }
    if (this.removeImage()) return Promise.resolve(null);
    return Promise.resolve(undefined); // unchanged
  }
}

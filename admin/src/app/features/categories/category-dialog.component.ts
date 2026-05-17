import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { Category, ProductGender } from './categories.component';

@Component({
  selector: 'app-category-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatProgressSpinnerModule,
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
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="loading()">
        @if (loading()) { <mat-spinner diameter="18" /> } @else { Save }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.form { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; } .full-width { width: 100%; } mat-spinner { margin: auto; }`],
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

  ngOnInit() {
    if (this.data.category) {
      this.form.patchValue({
        name: this.data.category.name,
        parentId: this.data.category.parentId,
        gender: this.data.category.gender ?? null,
      });
    }
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const body = {
      name: this.form.value.name,
      parentId: this.form.value.parentId || undefined,
      gender: this.form.value.gender || undefined,
    };
    const req = this.data.category
      ? this.api.patch(`categories/${this.data.category.id}`, body)
      : this.api.post('categories', body);
    req.subscribe({ next: () => this.ref.close(true), error: () => this.loading.set(false) });
  }
}

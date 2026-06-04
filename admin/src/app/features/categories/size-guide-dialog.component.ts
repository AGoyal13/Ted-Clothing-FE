import {
  Component, inject, signal, OnInit, computed,
} from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogRef, MatDialogModule,
} from '@angular/material/dialog';
import { FormBuilder, Validators, ReactiveFormsModule, FormArray, FormGroup, AbstractControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { Category } from './categories.component';

interface SizeGuideStub { id: string; name: string; }
interface SizeGuide {
  id: string; name: string;
  measurements: { key: string; label: string; howTo: string }[];
  rows: { size: string; values: Record<string, string> }[];
  fitTip: string | null;
}

@Component({
  selector: 'app-size-guide-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatIconModule, MatProgressSpinnerModule,
    MatTabsModule, MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Size Guide — {{ data.category.name }}</h2>
    <mat-dialog-content>
      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:2rem">
          <mat-spinner diameter="40" />
        </div>
      } @else {
        <!-- Mode switcher -->
        <div class="mode-row">
          <button mat-stroked-button [class.active-mode]="mode() === 'select'"
            (click)="mode.set('select')">Use existing guide</button>
          <button mat-stroked-button [class.active-mode]="mode() === 'edit'"
            (click)="switchToEdit()">{{ editingGuide() ? 'Edit guide' : 'Create new guide' }}</button>
          @if (data.category.sizeGuide) {
            <button mat-stroked-button color="warn" (click)="removeGuide()">Remove guide</button>
          }
        </div>

        <!-- Select existing -->
        @if (mode() === 'select') {
          <mat-form-field appearance="outline" style="width:100%;margin-top:1rem">
            <mat-label>Choose a guide</mat-label>
            <mat-select [(value)]="selectedGuideId">
              @for (g of allGuides(); track g.id) {
                <mat-option [value]="g.id">{{ g.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        <!-- Edit / Create -->
        @if (mode() === 'edit') {
          <form [formGroup]="guideForm" style="margin-top:1rem">
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Guide name</mat-label>
              <input matInput formControlName="name" placeholder="e.g. Men's Tops" />
            </mat-form-field>

            <!-- Measurements -->
            <div class="section-label">Measurements (columns)</div>
            <div formArrayName="measurements">
              @for (m of measurementsArray.controls; track $index; let i = $index) {
                <div [formGroupName]="i" class="meas-row">
                  <mat-form-field appearance="outline" style="flex:1">
                    <mat-label>Label</mat-label>
                    <input matInput formControlName="label" (input)="syncKey(i)" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" style="flex:2">
                    <mat-label>How to measure</mat-label>
                    <input matInput formControlName="howTo" />
                  </mat-form-field>
                  <button mat-icon-button color="warn" type="button" (click)="removeMeasurement(i)">
                    <mat-icon>remove_circle_outline</mat-icon>
                  </button>
                </div>
              }
            </div>
            <button mat-stroked-button type="button" (click)="addMeasurement()" style="margin-bottom:1rem">
              <mat-icon>add</mat-icon> Add measurement
            </button>

            <!-- Size rows -->
            <div class="section-label">Size rows</div>
            <div class="rows-table">
              <!-- Header -->
              <div class="rows-header">
                <span style="width:80px;font-size:12px;color:#999">SIZE</span>
                @for (col of measurementCols(); track col.key) {
                  <span style="flex:1;font-size:12px;color:#999">{{ col.label }}</span>
                }
                <span style="width:40px"></span>
              </div>
              <!-- Rows -->
              <div formArrayName="rows">
                @for (row of rowsArray.controls; track $index; let ri = $index) {
                  <div [formGroupName]="ri" class="size-row">
                    <mat-form-field appearance="outline" style="width:80px">
                      <input matInput formControlName="size" placeholder="S" />
                    </mat-form-field>
                    @for (col of measurementCols(); track col.key) {
                      <mat-form-field appearance="outline" style="flex:1">
                        <input matInput [formControlName]="col.key" placeholder="—" />
                      </mat-form-field>
                    }
                    <button mat-icon-button color="warn" type="button" (click)="removeRow(ri)">
                      <mat-icon>remove_circle_outline</mat-icon>
                    </button>
                  </div>
                }
              </div>
            </div>
            <button mat-stroked-button type="button" (click)="addRow()" style="margin-bottom:1rem">
              <mat-icon>add</mat-icon> Add size row
            </button>

            <!-- Fit tip -->
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Fit tip (optional)</mat-label>
              <input matInput formControlName="fitTip" placeholder="e.g. For relaxed fit, go one size up." />
            </mat-form-field>
          </form>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="saving()" (click)="save()">
        {{ saving() ? 'Saving…' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .mode-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 0.5rem; }
    .active-mode { border-color: #3f51b5 !important; color: #3f51b5; }
    .section-label { font-size: 12px; color: #999; margin: 0.5rem 0 0.25rem; text-transform: uppercase; letter-spacing: .05em; }
    .meas-row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 4px; }
    .rows-table { border: 1px solid #e0e0e0; border-radius: 4px; padding: 8px; margin-bottom: 8px; }
    .rows-header { display: flex; gap: 8px; padding: 0 4px; margin-bottom: 4px; }
    .size-row { display: flex; gap: 8px; align-items: flex-start; }
    mat-form-field { margin-bottom: 0; }
  `],
})
export class SizeGuideDialogComponent implements OnInit {
  data = inject<{ category: Category }>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<SizeGuideDialogComponent>);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  loading = signal(true);
  saving = signal(false);
  mode = signal<'select' | 'edit'>('select');
  allGuides = signal<SizeGuideStub[]>([]);
  editingGuide = signal<SizeGuide | null>(null);
  selectedGuideId: string | null = this.data.category.sizeGuide?.id ?? null;

  guideForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    measurements: this.fb.array([]),
    rows: this.fb.array([]),
    fitTip: [''],
  });

  get measurementsArray(): FormArray { return this.guideForm.get('measurements') as FormArray; }
  get rowsArray(): FormArray { return this.guideForm.get('rows') as FormArray; }

  // signal — updated manually so it tracks FormArray state reactively in templates
  measurementCols = signal<{ key: string; label: string }[]>([]);

  private syncCols() {
    this.measurementCols.set(
      this.measurementsArray.controls
        .map(c => ({
          key: (c as FormGroup).get('key')?.value as string,
          label: (c as FormGroup).get('label')?.value as string,
        }))
        .filter(m => !!m.key),
    );
  }

  ngOnInit() {
    this.api.get<SizeGuideStub[]>('size-guides').subscribe({
      next: (guides) => {
        this.allGuides.set(guides);
        // If category already has a guide, load it for editing
        if (this.data.category.sizeGuide) {
          const id = this.data.category.sizeGuide.id;
          this.api.get<SizeGuide>(`size-guides/${id}`).subscribe({
            next: (g) => { this.editingGuide.set(g); this.fillForm(g); this.loading.set(false); },
            error: () => this.loading.set(false),
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  switchToEdit() {
    if (this.editingGuide()) {
      this.mode.set('edit');
    } else {
      // Start fresh
      while (this.measurementsArray.length) this.measurementsArray.removeAt(0);
      while (this.rowsArray.length) this.rowsArray.removeAt(0);
      this.measurementCols.set([]);
      this.guideForm.patchValue({ name: '', fitTip: '' });
      this.mode.set('edit');
    }
  }

  fillForm(g: SizeGuide) {
    while (this.measurementsArray.length) this.measurementsArray.removeAt(0);
    while (this.rowsArray.length) this.rowsArray.removeAt(0);
    this.measurementCols.set([]);
    this.guideForm.patchValue({ name: g.name, fitTip: g.fitTip ?? '' });
    for (const m of g.measurements) this.addMeasurementWith(m);
    for (const r of g.rows) this.addRowWith(r);
  }

  syncKey(i: number) {
    const group = this.measurementsArray.at(i) as FormGroup;
    const label: string = group.get('label')?.value ?? '';
    const newKey = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const oldKey: string = group.get('key')?.value ?? '';
    group.patchValue({ key: newKey }, { emitEvent: false });

    // Rename the control in every existing row
    if (oldKey && oldKey !== newKey) {
      for (const rowCtrl of this.rowsArray.controls) {
        const rowGroup = rowCtrl as FormGroup;
        const val = rowGroup.get(oldKey)?.value ?? '';
        if (rowGroup.contains(oldKey)) rowGroup.removeControl(oldKey);
        if (newKey && !rowGroup.contains(newKey)) rowGroup.addControl(newKey, this.fb.control(val));
      }
    } else if (newKey && !oldKey) {
      for (const rowCtrl of this.rowsArray.controls) {
        const rowGroup = rowCtrl as FormGroup;
        if (!rowGroup.contains(newKey)) rowGroup.addControl(newKey, this.fb.control(''));
      }
    }
    this.syncCols();
  }

  addMeasurement() { this.addMeasurementWith({ key: '', label: '', howTo: '' }); }
  addMeasurementWith(m: { key: string; label: string; howTo: string }) {
    this.measurementsArray.push(this.fb.group({ key: [m.key], label: [m.label, Validators.required], howTo: [m.howTo] }));
    const key = m.key || m.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (key) {
      for (const rowCtrl of this.rowsArray.controls) {
        const rowGroup = rowCtrl as FormGroup;
        if (!rowGroup.contains(key)) rowGroup.addControl(key, this.fb.control(''));
      }
    }
    this.syncCols();
  }

  removeMeasurement(i: number) {
    const group = this.measurementsArray.at(i) as FormGroup;
    const key: string = group.get('key')?.value ?? '';
    this.measurementsArray.removeAt(i);
    if (key) {
      for (const rowCtrl of this.rowsArray.controls) {
        const rowGroup = rowCtrl as FormGroup;
        if (rowGroup.contains(key)) rowGroup.removeControl(key);
      }
    }
    this.syncCols();
  }

  addRow() {
    const keys = this.measurementCols().map(c => c.key);
    this.addRowWith({ size: '', values: Object.fromEntries(keys.map(k => [k, ''])) });
  }
  addRowWith(r: { size: string; values: Record<string, string> }) {
    const keys = this.measurementCols().map(c => c.key);
    const controls: Record<string, AbstractControl> = {
      size: this.fb.control(r.size, Validators.required),
    };
    for (const key of keys) controls[key] = this.fb.control(r.values[key] ?? '');
    for (const k of Object.keys(r.values)) {
      if (!controls[k]) controls[k] = this.fb.control(r.values[k] ?? '');
    }
    this.rowsArray.push(new FormGroup(controls));
  }
  removeRow(i: number) { this.rowsArray.removeAt(i); }

  removeGuide() {
    if (!confirm('Remove size guide from this category?')) return;
    this.saving.set(true);
    this.api.patch(`categories/${this.data.category.id}`, { sizeGuideId: null }).subscribe({
      next: () => { this.saving.set(false); this.dialogRef.close(true); },
      error: () => { this.saving.set(false); this.snack.open('Failed to remove guide', '', { duration: 3000 }); },
    });
  }

  save() {
    if (this.mode() === 'select') {
      if (!this.selectedGuideId) return;
      this.saving.set(true);
      this.api.patch(`categories/${this.data.category.id}`, { sizeGuideId: this.selectedGuideId }).subscribe({
        next: () => { this.saving.set(false); this.dialogRef.close(true); },
        error: () => { this.saving.set(false); this.snack.open('Failed to save', '', { duration: 3000 }); },
      });
      return;
    }

    if (this.guideForm.invalid) { this.guideForm.markAllAsTouched(); return; }
    const cols = this.measurementCols();
    const keys = cols.map(c => c.key);
    const measurements = this.measurementsArray.controls.map(c => ({
      key: (c as FormGroup).get('key')?.value as string,
      label: (c as FormGroup).get('label')?.value as string,
      howTo: (c as FormGroup).get('howTo')?.value as string,
    }));
    const rows = this.rowsArray.controls.map(c => {
      const g = c as FormGroup;
      return { size: g.get('size')?.value as string, values: Object.fromEntries(keys.map(k => [k, g.get(k)?.value ?? ''])) };
    });
    const payload = {
      name: this.guideForm.get('name')?.value as string,
      measurements, rows,
      fitTip: this.guideForm.get('fitTip')?.value || null,
    };

    this.saving.set(true);
    const existing = this.editingGuide();
    const save$ = existing
      ? this.api.patch<SizeGuide>(`size-guides/${existing.id}`, payload)
      : this.api.post<SizeGuide>('size-guides', payload);

    save$.subscribe({
      next: (guide) => {
        this.api.patch(`categories/${this.data.category.id}`, { sizeGuideId: guide.id }).subscribe({
          next: () => { this.saving.set(false); this.dialogRef.close(true); },
          error: () => { this.saving.set(false); this.snack.open('Guide saved but link failed', '', { duration: 3000 }); },
        });
      },
      error: () => { this.saving.set(false); this.snack.open('Failed to save guide', '', { duration: 3000 }); },
    });
  }
}

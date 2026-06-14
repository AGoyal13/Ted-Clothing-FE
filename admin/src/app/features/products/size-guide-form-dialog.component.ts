import { Component, inject, signal, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogRef, MatDialogModule,
} from '@angular/material/dialog';
import {
  FormBuilder, Validators, ReactiveFormsModule,
  FormArray, FormGroup, AbstractControl,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';

export interface SizeGuide {
  id: string;
  name: string;
  measurements: { key: string; label: string; howTo: string }[];
  rows: { size: string; values: Record<string, string> }[];
  fitTip: string | null;
}

export interface SizeGuideFormDialogData {
  guide?: SizeGuide; // provided → edit mode; omitted → create mode
}

@Component({
  selector: 'app-size-guide-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.guide ? 'Edit Size Guide' : 'Create Size Guide' }}</h2>

    <mat-dialog-content>
      @if (loading()) {
        <div class="center"><mat-spinner diameter="40" /></div>
      } @else {
        <form [formGroup]="form">

          <mat-form-field appearance="outline" class="full">
            <mat-label>Guide name</mat-label>
            <input matInput formControlName="name" placeholder="e.g. Men's Tops" />
            @if (form.get('name')?.invalid && form.get('name')?.touched) {
              <mat-error>Name is required</mat-error>
            }
          </mat-form-field>

          <!-- Measurements -->
          <div class="section-label">Measurements (columns)</div>
          <div formArrayName="measurements">
            @for (m of measurementsArray.controls; track $index; let i = $index) {
              <div [formGroupName]="i" class="meas-row">
                <mat-form-field appearance="outline" class="meas-label">
                  <mat-label>Label</mat-label>
                  <input matInput formControlName="label" (input)="syncKey(i)" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="meas-howto">
                  <mat-label>How to measure</mat-label>
                  <input matInput formControlName="howTo" />
                </mat-form-field>
                <button mat-icon-button color="warn" type="button" (click)="removeMeasurement(i)">
                  <mat-icon>remove_circle_outline</mat-icon>
                </button>
              </div>
            }
          </div>
          <button mat-stroked-button type="button" (click)="addMeasurement()" class="add-btn">
            <mat-icon>add</mat-icon> Add measurement
          </button>

          <!-- Size rows -->
          <div class="section-label">Size rows</div>
          <div class="rows-table">
            <div class="rows-header">
              <span class="size-hdr">SIZE</span>
              @for (col of measurementCols(); track col.key) {
                <span class="col-hdr">{{ col.label }}</span>
              }
              <span class="del-hdr"></span>
            </div>
            <div formArrayName="rows">
              @for (row of rowsArray.controls; track $index; let ri = $index) {
                <div [formGroupName]="ri" class="size-row">
                  <mat-form-field appearance="outline" class="size-field">
                    <input matInput formControlName="size" placeholder="S" />
                  </mat-form-field>
                  @for (col of measurementCols(); track col.key) {
                    <mat-form-field appearance="outline" class="val-field">
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
          <button mat-stroked-button type="button" (click)="addRow()" class="add-btn">
            <mat-icon>add</mat-icon> Add size row
          </button>

          <!-- Fit tip -->
          <mat-form-field appearance="outline" class="full" style="margin-top:8px">
            <mat-label>Fit tip (optional)</mat-label>
            <input matInput formControlName="fitTip" placeholder="e.g. For relaxed fit, go one size up." />
          </mat-form-field>

        </form>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="saving()" (click)="save()">
        {{ saving() ? 'Saving…' : (data.guide ? 'Save changes' : 'Create guide') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .center { display: flex; justify-content: center; padding: 2rem; }
    form { display: flex; flex-direction: column; gap: 0; padding-top: 8px; min-width: 320px; }
    .full { width: 100%; }
    mat-form-field { width: 100%; margin-bottom: 0; }
    .section-label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: .05em; margin: 1rem 0 0.25rem; }
    .meas-row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 4px; }
    .meas-label { flex: 1; min-width: 0; }
    .meas-howto { flex: 2; min-width: 0; }
    .add-btn { margin-bottom: 0.75rem; }
    .rows-table { border: 1px solid #e0e0e0; border-radius: 4px; padding: 8px; margin-bottom: 8px; overflow-x: auto; }
    .rows-header { display: flex; gap: 8px; padding: 0 4px 4px; }
    .size-hdr { width: 72px; font-size: 11px; color: #999; flex-shrink: 0; }
    .col-hdr { flex: 1; font-size: 11px; color: #999; min-width: 80px; }
    .del-hdr { width: 40px; }
    .size-row { display: flex; gap: 8px; align-items: flex-start; }
    .size-field { width: 72px; flex-shrink: 0; }
    .val-field { flex: 1; min-width: 80px; }
  `],
})
export class SizeGuideFormDialogComponent implements OnInit {
  readonly data = inject<SizeGuideFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<SizeGuideFormDialogComponent>);
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  loading = signal(false);
  saving = signal(false);
  measurementCols = signal<{ key: string; label: string }[]>([]);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    measurements: this.fb.array([]),
    rows: this.fb.array([]),
    fitTip: [''],
  });

  get measurementsArray(): FormArray { return this.form.get('measurements') as FormArray; }
  get rowsArray(): FormArray { return this.form.get('rows') as FormArray; }

  ngOnInit() {
    if (this.data.guide) {
      this.loading.set(true);
      this.api.get<SizeGuide>(`size-guides/${this.data.guide.id}`).subscribe({
        next: (g) => { this.fillForm(g); this.loading.set(false); },
        error: () => { this.snack.open('Failed to load guide', '', { duration: 3000 }); this.loading.set(false); },
      });
    }
  }

  private fillForm(g: SizeGuide) {
    while (this.measurementsArray.length) this.measurementsArray.removeAt(0);
    while (this.rowsArray.length) this.rowsArray.removeAt(0);
    this.measurementCols.set([]);
    this.form.patchValue({ name: g.name, fitTip: g.fitTip ?? '' });
    for (const m of g.measurements) this.addMeasurementWith(m);
    for (const r of g.rows) this.addRowWith(r);
  }

  private syncCols() {
    this.measurementCols.set(
      this.measurementsArray.controls
        .map(c => ({ key: (c as FormGroup).get('key')?.value as string, label: (c as FormGroup).get('label')?.value as string }))
        .filter(m => !!m.key),
    );
  }

  syncKey(i: number) {
    const group = this.measurementsArray.at(i) as FormGroup;
    const label: string = group.get('label')?.value ?? '';
    const newKey = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const oldKey: string = group.get('key')?.value ?? '';
    group.patchValue({ key: newKey }, { emitEvent: false });
    if (oldKey && oldKey !== newKey) {
      for (const rowCtrl of this.rowsArray.controls) {
        const rg = rowCtrl as FormGroup;
        const val = rg.get(oldKey)?.value ?? '';
        if (rg.contains(oldKey)) rg.removeControl(oldKey);
        if (newKey && !rg.contains(newKey)) rg.addControl(newKey, this.fb.control(val));
      }
    } else if (newKey && !oldKey) {
      for (const rowCtrl of this.rowsArray.controls) {
        const rg = rowCtrl as FormGroup;
        if (!rg.contains(newKey)) rg.addControl(newKey, this.fb.control(''));
      }
    }
    this.syncCols();
  }

  addMeasurement() { this.addMeasurementWith({ key: '', label: '', howTo: '' }); }
  addMeasurementWith(m: { key: string; label: string; howTo: string }) {
    this.measurementsArray.push(this.fb.group({
      key: [m.key], label: [m.label, Validators.required], howTo: [m.howTo],
    }));
    const key = m.key || m.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (key) {
      for (const rowCtrl of this.rowsArray.controls) {
        const rg = rowCtrl as FormGroup;
        if (!rg.contains(key)) rg.addControl(key, this.fb.control(''));
      }
    }
    this.syncCols();
  }

  removeMeasurement(i: number) {
    const key: string = (this.measurementsArray.at(i) as FormGroup).get('key')?.value ?? '';
    this.measurementsArray.removeAt(i);
    if (key) {
      for (const rowCtrl of this.rowsArray.controls) {
        const rg = rowCtrl as FormGroup;
        if (rg.contains(key)) rg.removeControl(key);
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
    const controls: Record<string, AbstractControl> = { size: this.fb.control(r.size, Validators.required) };
    for (const key of keys) controls[key] = this.fb.control(r.values[key] ?? '');
    for (const k of Object.keys(r.values)) {
      if (!controls[k]) controls[k] = this.fb.control(r.values[k] ?? '');
    }
    this.rowsArray.push(new FormGroup(controls));
  }
  removeRow(i: number) { this.rowsArray.removeAt(i); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const cols = this.measurementCols();
    const keys = cols.map(c => c.key);
    const payload = {
      name: this.form.get('name')?.value as string,
      measurements: this.measurementsArray.controls.map(c => ({
        key: (c as FormGroup).get('key')?.value as string,
        label: (c as FormGroup).get('label')?.value as string,
        howTo: (c as FormGroup).get('howTo')?.value as string,
      })),
      rows: this.rowsArray.controls.map(c => {
        const g = c as FormGroup;
        return { size: g.get('size')?.value as string, values: Object.fromEntries(keys.map(k => [k, g.get(k)?.value ?? ''])) };
      }),
      fitTip: this.form.get('fitTip')?.value || null,
    };

    this.saving.set(true);
    const req = this.data.guide
      ? this.api.patch<SizeGuide>(`size-guides/${this.data.guide.id}`, payload)
      : this.api.post<SizeGuide>('size-guides', payload);

    req.subscribe({
      next: (guide) => { this.saving.set(false); this.dialogRef.close(guide); },
      error: () => { this.saving.set(false); this.snack.open('Failed to save guide', '', { duration: 3000 }); },
    });
  }
}

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { WarehouseDialogComponent } from './warehouse-dialog.component';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  address2: string | null;
  city: string;
  state: string;
  pincode: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-warehouses',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    MatTableModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatDialogModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <h1>Warehouses</h1>
      <button mat-flat-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon> New Warehouse
      </button>
    </div>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else {
      <mat-table [dataSource]="warehouses()" class="table">

        <ng-container matColumnDef="name">
          <mat-header-cell *matHeaderCellDef>Name</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <div class="wh-name">{{ row.name }}</div>
            <div class="wh-code">{{ row.code }}</div>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="location">
          <mat-header-cell *matHeaderCellDef>Address</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <div class="addr-line">{{ row.address }}{{ row.address2 ? ', ' + row.address2 : '' }}</div>
            <div class="addr-sub">{{ row.city }}, {{ row.state }} – {{ row.pincode }}</div>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="status">
          <mat-header-cell *matHeaderCellDef>Status</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <div class="badges">
              @if (row.isDefault) {
                <span class="badge badge--default">Default</span>
              }
              <span class="badge" [class.badge--active]="row.isActive" [class.badge--inactive]="!row.isActive">
                {{ row.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="created">
          <mat-header-cell *matHeaderCellDef>Created</mat-header-cell>
          <mat-cell *matCellDef="let row">{{ row.createdAt | date:'d MMM y' }}</mat-cell>
        </ng-container>

        <ng-container matColumnDef="actions">
          <mat-header-cell *matHeaderCellDef></mat-header-cell>
          <mat-cell *matCellDef="let row">
            <button mat-icon-button matTooltip="Edit" (click)="openEdit(row)">
              <mat-icon>edit</mat-icon>
            </button>
            @if (!row.isDefault) {
              <button mat-icon-button matTooltip="Set as Default" (click)="setDefault(row)">
                <mat-icon>star_outline</mat-icon>
              </button>
            }
            <button mat-icon-button matTooltip="Delete" color="warn" (click)="delete(row)">
              <mat-icon>delete</mat-icon>
            </button>
          </mat-cell>
        </ng-container>

        <mat-header-row *matHeaderRowDef="cols"></mat-header-row>
        <mat-row *matRowDef="let row; columns: cols;"></mat-row>
      </mat-table>

      @if (warehouses().length === 0) {
        <div class="empty">No warehouses yet. Add one to enable shipping.</div>
      }
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
    h1 { margin: 0; }
    .center { display: flex; justify-content: center; padding: 3rem; }
    .table { width: 100%; border: 1px solid #e0e0e0; box-shadow: none; }
    .wh-name { font-weight: 600; font-size: 0.88rem; }
    .wh-code { font-size: 0.75rem; color: #888; font-family: monospace; }
    .addr-line { font-size: 0.85rem; }
    .addr-sub { font-size: 0.75rem; color: #888; }
    .badges { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .badge {
      padding: 2px 8px; border-radius: 3px; font-size: 0.72rem;
      font-weight: 600; letter-spacing: 0.05em;
    }
    .badge--default { background: #1a237e; color: #fff; }
    .badge--active { background: #e8f5e9; color: #2e7d32; }
    .badge--inactive { background: #fafafa; color: #999; border: 1px solid #e0e0e0; }
    .empty { padding: 3rem; text-align: center; color: #999; }
  `],
})
export class WarehousesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly cols = ['name', 'location', 'status', 'created', 'actions'];
  readonly warehouses = signal<Warehouse[]>([]);
  readonly loading = signal(false);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.get<Warehouse[]>('warehouses').subscribe({
      next: list => { this.warehouses.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.dialog.open(WarehouseDialogComponent, { data: {}, width: '420px' })
      .afterClosed().subscribe(result => { if (result) this.load(); });
  }

  openEdit(warehouse: Warehouse) {
    this.dialog.open(WarehouseDialogComponent, { data: { warehouse }, width: '420px' })
      .afterClosed().subscribe(result => { if (result) this.load(); });
  }

  setDefault(warehouse: Warehouse) {
    this.api.patch(`warehouses/${warehouse.id}`, { isDefault: true }).subscribe({
      next: () => { this.load(); this.snackBar.open(`${warehouse.name} set as default`, 'OK', { duration: 3000 }); },
      error: () => this.snackBar.open('Failed to update', 'OK', { duration: 3000 }),
    });
  }

  delete(warehouse: Warehouse) {
    if (!confirm(`Delete warehouse "${warehouse.name}"? This cannot be undone.`)) return;
    this.api.delete(`warehouses/${warehouse.id}`).subscribe({
      next: () => { this.load(); this.snackBar.open('Warehouse deleted', 'OK', { duration: 3000 }); },
      error: err => {
        const msg = err?.error?.error?.message ?? 'Delete failed';
        this.snackBar.open(msg, 'OK', { duration: 5000 });
      },
    });
  }
}

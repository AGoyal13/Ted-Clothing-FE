import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { CouponDialogComponent } from './coupon-dialog.component';

export type CouponType = 'PERCENT' | 'FLAT';

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: string;
  minOrderAmount: string | null;
  maxDiscountAmount: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [
    DatePipe, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatCardModule, MatChipsModule, MatSlideToggleModule, MatProgressBarModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-header">
      <h1>Coupons</h1>
      <button mat-flat-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon> New Coupon
      </button>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    <mat-card>
      <div class="table-wrap">
      <table mat-table [dataSource]="coupons()" class="full-width">
        <ng-container matColumnDef="code">
          <th mat-header-cell *matHeaderCellDef>Code</th>
          <td mat-cell *matCellDef="let c"><code>{{ c.code }}</code></td>
        </ng-container>
        <ng-container matColumnDef="discount">
          <th mat-header-cell *matHeaderCellDef>Discount</th>
          <td mat-cell *matCellDef="let c">
            @if (c.type === 'PERCENT') {
              {{ c.value }}%@if (c.maxDiscountAmount) { <span class="muted"> (max ₹{{ c.maxDiscountAmount }})</span> }
            } @else {
              ₹{{ c.value }}
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="minOrder">
          <th mat-header-cell *matHeaderCellDef>Min Order</th>
          <td mat-cell *matCellDef="let c">{{ c.minOrderAmount ? '₹' + c.minOrderAmount : '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="usage">
          <th mat-header-cell *matHeaderCellDef>Usage</th>
          <td mat-cell *matCellDef="let c">{{ c.usedCount }}{{ c.maxUses ? ' / ' + c.maxUses : '' }}</td>
        </ng-container>
        <ng-container matColumnDef="expiresAt">
          <th mat-header-cell *matHeaderCellDef>Expires</th>
          <td mat-cell *matCellDef="let c">{{ c.expiresAt ? (c.expiresAt | date:'mediumDate') : '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="active">
          <th mat-header-cell *matHeaderCellDef>Active</th>
          <td mat-cell *matCellDef="let c">
            <mat-slide-toggle [checked]="c.isActive" (change)="toggleActive(c, $event.checked)" />
          </td>
        </ng-container>
        <ng-container matColumnDef="public">
          <th mat-header-cell *matHeaderCellDef>On Storefront</th>
          <td mat-cell *matCellDef="let c">
            <mat-slide-toggle [checked]="c.isPublic" (change)="togglePublic(c, $event.checked)" />
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let c">
            <button mat-icon-button title="Edit" (click)="openEdit(c)"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button color="warn" title="Delete" (click)="delete(c)"><mat-icon>delete</mat-icon></button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>
      @if (!loading() && coupons().length === 0) {
        <p class="empty">No coupons yet. Create one to get started.</p>
      }
      </div>
    </mat-card>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
    h1 { margin: 0; }
    .full-width { width: 100%; min-width: 680px; }
    .muted { color: #999; font-size: 12px; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .empty { padding: 24px; text-align: center; color: #999; }
  `],
})
export class CouponsComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  cols = ['code', 'discount', 'minOrder', 'usage', 'expiresAt', 'active', 'public', 'actions'];
  coupons = signal<Coupon[]>([]);
  loading = signal(false);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.get<Coupon[]>('admin/coupons').subscribe({
      next: (data) => { this.coupons.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.dialog.open(CouponDialogComponent, { width: '440px', maxWidth: '95vw' })
      .afterClosed().subscribe(result => { if (result) this.load(); });
  }

  openEdit(coupon: Coupon) {
    this.dialog.open(CouponDialogComponent, { width: '440px', maxWidth: '95vw', data: { coupon } })
      .afterClosed().subscribe(result => { if (result) this.load(); });
  }

  toggleActive(coupon: Coupon, isActive: boolean) {
    this.api.patch(`admin/coupons/${coupon.id}`, { isActive }).subscribe({
      next: () => { coupon.isActive = isActive; this.snack.open(isActive ? 'Activated' : 'Deactivated', '', { duration: 1500 }); },
      error: (e) => { this.snack.open(e?.error?.error?.message ?? 'Update failed', '', { duration: 3000 }); this.load(); },
    });
  }

  togglePublic(coupon: Coupon, isPublic: boolean) {
    this.api.patch(`admin/coupons/${coupon.id}`, { isPublic }).subscribe({
      next: () => { coupon.isPublic = isPublic; this.snack.open(isPublic ? 'Shown on storefront' : 'Hidden from storefront', '', { duration: 1500 }); },
      error: (e) => { this.snack.open(e?.error?.error?.message ?? 'Update failed', '', { duration: 3000 }); this.load(); },
    });
  }

  delete(coupon: Coupon) {
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    this.api.delete(`admin/coupons/${coupon.id}`).subscribe({
      next: () => { this.snack.open('Deleted', '', { duration: 2000 }); this.load(); },
      error: (e) => this.snack.open(e?.error?.error?.message ?? 'Delete failed', '', { duration: 3000 }),
    });
  }
}

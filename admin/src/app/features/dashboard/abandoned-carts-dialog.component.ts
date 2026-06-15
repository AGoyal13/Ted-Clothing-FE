import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';

interface AbandonedCart {
  owner: string;
  isGuest: boolean;
  name: string | null;
  phone: string | null;
  email: string | null;
  itemCount: number;
  totalValue: number;
  lastActivity: string;
}

interface AbandonedCartsResponse {
  items: AbandonedCart[];
  total: number;
  page: number;
  pageSize: number;
}

@Component({
  selector: 'app-abandoned-carts-dialog',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatTableModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>Abandoned Carts</h2>

    <mat-dialog-content>
      @if (loading()) {
        <div class="center"><mat-spinner diameter="40" /></div>
      } @else if (rows().length === 0) {
        <p class="empty">No abandoned carts.</p>
      } @else {
        <table mat-table [dataSource]="rows()" class="acart-table">
          <!-- Customer -->
          <ng-container matColumnDef="customer">
            <th mat-header-cell *matHeaderCellDef>Customer</th>
            <td mat-cell *matCellDef="let r">
              @if (r.isGuest) {
                <span class="badge badge--guest">Guest</span>
              } @else {
                {{ r.name || '(no name)' }}
              }
            </td>
          </ng-container>

          <!-- Contact -->
          <ng-container matColumnDef="contact">
            <th mat-header-cell *matHeaderCellDef>Contact</th>
            <td mat-cell *matCellDef="let r">
              @if (r.phone) {
                <a [href]="'tel:' + r.phone">{{ r.phone }}</a>
              } @else if (r.email) {
                <a [href]="'mailto:' + r.email">{{ r.email }}</a>
              } @else {
                <span class="muted" matTooltip="Guest carts have no contact details">—</span>
              }
            </td>
          </ng-container>

          <!-- Items -->
          <ng-container matColumnDef="items">
            <th mat-header-cell *matHeaderCellDef>Items</th>
            <td mat-cell *matCellDef="let r">{{ r.itemCount }}</td>
          </ng-container>

          <!-- Value -->
          <ng-container matColumnDef="value">
            <th mat-header-cell *matHeaderCellDef>Value</th>
            <td mat-cell *matCellDef="let r">{{ formatINR(r.totalValue) }}</td>
          </ng-container>

          <!-- Last active -->
          <ng-container matColumnDef="lastActivity">
            <th mat-header-cell *matHeaderCellDef>Last active</th>
            <td mat-cell *matCellDef="let r">{{ r.lastActivity | date:'medium' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      @if (!loading() && total() > pageSize) {
        <span class="pager">
          <button mat-icon-button [disabled]="page() === 1" (click)="changePage(-1)">
            <mat-icon>chevron_left</mat-icon>
          </button>
          {{ rangeStart() }}–{{ rangeEnd() }} of {{ total() }}
          <button mat-icon-button [disabled]="rangeEnd() >= total()" (click)="changePage(1)">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </span>
      }
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 640px; max-width: 880px; }
    .center { display: flex; justify-content: center; padding: 32px; }
    .empty { color: rgba(0,0,0,.54); padding: 16px; }
    .acart-table { width: 100%; }
    .badge--guest {
      display: inline-block; padding: 2px 8px; border-radius: 10px;
      background: #eee; color: #666; font-size: 12px; font-weight: 500;
    }
    .muted { color: rgba(0,0,0,.38); }
    .pager { display: inline-flex; align-items: center; gap: 4px; margin-right: auto; font-size: 13px; }
  `],
})
export class AbandonedCartsDialogComponent implements OnInit {
  private api = inject(ApiService);

  loading = signal(true);
  rows = signal<AbandonedCart[]>([]);
  total = signal(0);
  page = signal(1);
  readonly pageSize = 50;

  readonly cols = ['customer', 'contact', 'items', 'value', 'lastActivity'];

  ngOnInit() { this.load(); }

  private load() {
    this.loading.set(true);
    this.api.get<AbandonedCartsResponse>('admin/abandoned-carts', {
      page: this.page(),
      pageSize: this.pageSize,
    }).subscribe({
      next: (data) => {
        this.rows.set(data.items);
        this.total.set(data.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  changePage(delta: number) {
    this.page.update(p => Math.max(1, p + delta));
    this.load();
  }

  rangeStart() { return this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize + 1; }
  rangeEnd() { return Math.min(this.page() * this.pageSize, this.total()); }

  formatINR(v: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(v ?? 0);
  }
}

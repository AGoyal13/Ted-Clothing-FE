import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';

// NDR (Phase 8) queue — orders the courier could not deliver (status DELIVERY_FAILED).
// Reuses GET /admin/orders?status=DELIVERY_FAILED (no dedicated backend list endpoint).
// Resolution actions:
//   Re-attempt    → POST shipping/orders/:id/reattempt   (→ OUT_FOR_DELIVERY)
//   Cancel+Refund → PATCH admin/orders/:id/status CANCELLED (reuses refund logic)
//   Mark as RTO   → PATCH admin/orders/:id/status RETURN_REQUESTED

interface NdrOrder {
  id: string;
  status: string;
  awb?: string;
  totalAmount: string;
  paymentMethod: string;
  paymentStatus: string;
  ndrReason?: string;
  ndrAttemptCount: number;
  lastNdrAt?: string;
  createdAt: string;
  user: { id: string; name?: string; email?: string };
  address: {
    name: string; phone: string; line1: string; line2?: string;
    city: string; state: string; pincode: string;
  };
  _count: { items: number };
}

interface OrdersPage { total: number; page: number; limit: number; orders: NdrOrder[]; }

@Component({
  selector: 'app-ndr',
  standalone: true,
  imports: [
    CommonModule, DatePipe, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <h1>NDR Queue</h1>
      <span class="header-count">{{ total() }} failed {{ total() === 1 ? 'delivery' : 'deliveries' }}</span>
    </div>
    <p class="page-sub">Orders the courier attempted but could not deliver. Choose a resolution for each.</p>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else if (orders().length === 0) {
      <div class="empty">
        <mat-icon class="empty-icon">check_circle</mat-icon>
        <p>No failed deliveries. The queue is clear.</p>
      </div>
    } @else {
      <mat-table [dataSource]="orders()" class="ndr-table">

        <ng-container matColumnDef="order">
          <mat-header-cell *matHeaderCellDef>Order</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <div class="cell-stack">
              <div class="order-id">#{{ row.id.slice(-8).toUpperCase() }}</div>
              <div class="muted">{{ row._count.items }} item{{ row._count.items === 1 ? '' : 's' }} · ₹{{ (+row.totalAmount).toFixed(0) }}</div>
              @if (row.awb) { <div class="awb">AWB {{ row.awb }}</div> }
            </div>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="customer">
          <mat-header-cell *matHeaderCellDef>Customer</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <div class="cell-stack">
              <div>{{ row.address.name || row.user.name || '—' }}</div>
              <div class="muted">{{ row.address.phone }}</div>
              <div class="muted addr" [matTooltip]="fullAddress(row)">{{ row.address.city }}, {{ row.address.state }} – {{ row.address.pincode }}</div>
            </div>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="ndr">
          <mat-header-cell *matHeaderCellDef>Failed Delivery</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <div class="cell-stack">
              <div class="reason">{{ row.ndrReason || 'Delivery could not be completed' }}</div>
              <div class="muted">
                Attempt #{{ row.ndrAttemptCount }}
                @if (row.lastNdrAt) { · {{ row.lastNdrAt | date:'d MMM, h:mm a' }} }
              </div>
            </div>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="actions">
          <mat-header-cell *matHeaderCellDef>Resolution</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <div class="actions">
              <button mat-stroked-button color="primary" [disabled]="busyId() === row.id"
                (click)="reattempt(row)" matTooltip="Ask the courier to attempt delivery again">
                <mat-icon>replay</mat-icon> Re-attempt
              </button>
              <button mat-stroked-button [disabled]="busyId() === row.id"
                (click)="cancel(row)" matTooltip="Cancel the order and refund the customer">
                <mat-icon>cancel</mat-icon> Cancel + Refund
              </button>
              <button mat-stroked-button [disabled]="busyId() === row.id"
                (click)="markRto(row)" matTooltip="Mark as Return to Origin (goods coming back)">
                <mat-icon>keyboard_return</mat-icon> Mark RTO
              </button>
              @if (busyId() === row.id) { <mat-spinner diameter="18" /> }
            </div>
          </mat-cell>
        </ng-container>

        <mat-header-row *matHeaderRowDef="columns"></mat-header-row>
        <mat-row *matRowDef="let row; columns: columns;"></mat-row>
      </mat-table>

      @if (total() > limit) {
        <div class="pagination">
          <button mat-button [disabled]="page() === 1" (click)="changePage(page() - 1)">← Prev</button>
          <span class="page-info">Page {{ page() }} of {{ totalPages() }}</span>
          <button mat-button [disabled]="page() >= totalPages()" (click)="changePage(page() + 1)">Next →</button>
        </div>
      }
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: baseline; gap: 1rem; margin-bottom: 0.25rem; }
    h1 { margin: 0; }
    .header-count { color: #666; font-size: 0.85rem; }
    .page-sub { color: #777; font-size: 0.85rem; margin: 0 0 1.5rem; }
    .center { display: flex; justify-content: center; padding: 3rem; }
    .empty { text-align: center; color: #999; padding: 4rem 1rem; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: #27ae60; margin-bottom: 0.5rem; }
    .ndr-table { width: 100%; box-shadow: none; border: 1px solid #e0e0e0; }
    .cell-stack { display: flex; flex-direction: column; justify-content: center; gap: 2px; padding: 8px 0; }
    .order-id { font-weight: 600; font-size: 0.85rem; }
    .muted { font-size: 0.75rem; color: #888; }
    .awb { font-family: monospace; font-size: 0.72rem; color: #555; }
    .addr { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .reason { font-size: 0.85rem; color: #c0392b; font-weight: 500; }
    .actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .actions button { font-size: 0.78rem; }
    .pagination { display: flex; align-items: center; gap: 1rem; padding: 1rem 0; }
    .page-info { font-size: 0.85rem; color: #666; }
    .mat-column-order { flex: 0 0 160px; max-width: 160px; }
    .mat-column-customer { flex: 1 1 200px; min-width: 180px; }
    .mat-column-ndr { flex: 1 1 200px; min-width: 180px; }
    .mat-column-actions { flex: 0 0 360px; max-width: 360px; }
  `],
})
export class NdrComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly columns = ['order', 'customer', 'ndr', 'actions'];
  readonly limit = 20;

  readonly orders = signal<NdrOrder[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly busyId = signal<string | null>(null);

  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params: Record<string, string> = {
      status: 'DELIVERY_FAILED', page: String(this.page()), limit: String(this.limit),
    };
    this.api.get<OrdersPage>('admin/orders', params).subscribe({
      next: res => { this.orders.set(res.orders); this.total.set(res.total); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  changePage(p: number) { this.page.set(p); this.load(); }

  fullAddress(row: NdrOrder): string {
    return `${row.address.line1}${row.address.line2 ? ', ' + row.address.line2 : ''}, ${row.address.city}, ${row.address.state} – ${row.address.pincode}`;
  }

  private removeFromQueue(id: string) {
    this.orders.update(list => list.filter(o => o.id !== id));
    this.total.update(t => Math.max(0, t - 1));
  }

  reattempt(row: NdrOrder) {
    this.busyId.set(row.id);
    this.api.post<{ status: string }>(`shipping/orders/${row.id}/reattempt`, {}).subscribe({
      next: () => {
        this.busyId.set(null);
        this.removeFromQueue(row.id);
        this.snackBar.open('Re-attempt requested — order back out for delivery', 'OK', { duration: 4000 });
      },
      error: (err) => {
        this.busyId.set(null);
        this.snackBar.open(err?.error?.error?.message ?? 'Re-attempt failed', 'OK', { duration: 4000 });
      },
    });
  }

  cancel(row: NdrOrder) {
    if (!window.confirm(`Cancel order #${row.id.slice(-8).toUpperCase()} and refund the customer?`)) return;
    this.busyId.set(row.id);
    this.api.patch<{ status: string; paymentStatus: string }>(`admin/orders/${row.id}/status`, { status: 'CANCELLED' }).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.removeFromQueue(row.id);
        const msg = res.paymentStatus === 'REFUNDED' ? 'Order cancelled — refund initiated' : 'Order cancelled — no refund (COD or unpaid)';
        this.snackBar.open(msg, 'OK', { duration: 4000 });
      },
      error: (err) => {
        this.busyId.set(null);
        this.snackBar.open(err?.error?.error?.message ?? 'Cancel failed', 'OK', { duration: 4000 });
      },
    });
  }

  markRto(row: NdrOrder) {
    if (!window.confirm(`Mark order #${row.id.slice(-8).toUpperCase()} as RTO (Return to Origin)? A return will be created so you can receive the goods and refund the customer when the package arrives back.`)) return;
    this.busyId.set(row.id);
    this.api.post<{ status: string; returnId: string }>(`shipping/orders/${row.id}/rto`, {}).subscribe({
      next: () => {
        this.busyId.set(null);
        this.removeFromQueue(row.id);
        this.snackBar.open('Marked as RTO — return created; process it in the Returns page on arrival', 'OK', { duration: 5000 });
      },
      error: (err) => {
        this.busyId.set(null);
        this.snackBar.open(err?.error?.error?.message ?? 'Mark RTO failed', 'OK', { duration: 4000 });
      },
    });
  }
}

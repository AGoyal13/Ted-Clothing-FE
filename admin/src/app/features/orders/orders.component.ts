import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED';

interface AdminOrder {
  id: string;
  status: OrderStatus;
  paymentStatus: string;
  totalAmount: string;
  shippingCharge: string;
  createdAt: string;
  deliveredAt?: string;
  user: { id: string; name?: string; email?: string };
  address: {
    name: string; phone: string; line1: string; line2?: string;
    city: string; state: string; pincode: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    priceAtPurchase: string;
    sku: {
      sizeLabel: string;
      skuCode: string;
      color: { colorName: string; images: string[] };
      product: { id: string; title: string; slug: string };
    };
  }>;
  _count: { items: number };
}

interface OrdersPage {
  total: number;
  page: number;
  limit: number;
  orders: AdminOrder[];
}

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'CONFIRMED'],
  RETURNED: [],
  CANCELLED: [],
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: '#f39c12',
  CONFIRMED: '#3498db',
  SHIPPED: '#9b59b6',
  DELIVERED: '#27ae60',
  CANCELLED: '#e74c3c',
  RETURN_REQUESTED: '#e67e22',
  RETURNED: '#95a5a6',
};

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule, DatePipe, CurrencyPipe, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatChipsModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatMenuModule, MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <h1>Orders</h1>
      <span class="header-count">{{ total() }} total</span>
    </div>

    <!-- Filters -->
    <div class="orders-filters">
      <mat-form-field appearance="outline" class="filter-select">
        <mat-label>Filter by status</mat-label>
        <mat-select [(ngModel)]="filterStatus" (ngModelChange)="onFilterChange()">
          <mat-option value="">All</mat-option>
          @for (s of allStatuses; track s) {
            <mat-option [value]="s">{{ s }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else {
      <mat-table [dataSource]="orders()" class="orders-table">

        <ng-container matColumnDef="order">
          <mat-header-cell *matHeaderCellDef>Order</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <div class="order-id">#{{ row.id.slice(-8).toUpperCase() }}</div>
            <div class="order-date">{{ row.createdAt | date:'d MMM y, h:mm a' }}</div>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="customer">
          <mat-header-cell *matHeaderCellDef>Customer</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <div class="customer-name">{{ row.user.name || '—' }}</div>
            <div class="customer-email">{{ row.user.email || '—' }}</div>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="items">
          <mat-header-cell *matHeaderCellDef>Items</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <div class="items-preview">
              @for (item of row.items.slice(0, 2); track item.id) {
                <div class="item-chip" [matTooltip]="item.sku.product.title + ' · ' + item.sku.color.colorName + ' · ' + item.sku.sizeLabel">
                  @if (item.sku.color.images?.[0]) {
                    <img [src]="item.sku.color.images[0]" [alt]="item.sku.product.title" class="item-thumb" />
                  }
                </div>
              }
              @if (row._count.items > 2) {
                <span class="items-more">+{{ row._count.items - 2 }}</span>
              }
            </div>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="amount">
          <mat-header-cell *matHeaderCellDef>Amount</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <div class="amount">₹{{ (+row.totalAmount).toFixed(2) }}</div>
            @if (+row.shippingCharge > 0) {
              <div class="shipping-note">+₹{{ row.shippingCharge }} ship</div>
            }
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="status">
          <mat-header-cell *matHeaderCellDef>Status</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <span class="status-chip" [style.background]="statusColor(row.status)">
              {{ row.status }}
            </span>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="actions">
          <mat-header-cell *matHeaderCellDef></mat-header-cell>
          <mat-cell *matCellDef="let row">
            @if (nextStatuses(row.status).length > 0) {
              <button mat-icon-button [matMenuTriggerFor]="menu" [disabled]="saving()">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                @for (ns of nextStatuses(row.status); track ns) {
                  <button mat-menu-item (click)="updateStatus(row, ns)">
                    <mat-icon>arrow_forward</mat-icon>
                    Mark as {{ ns }}
                  </button>
                }
              </mat-menu>
            }
          </mat-cell>
        </ng-container>

        <mat-header-row *matHeaderRowDef="columns"></mat-header-row>
        <mat-row *matRowDef="let row; columns: columns;"
          (click)="toggleExpanded(row)"
          class="order-row"
          [class.order-row--expanded]="expandedId() === row.id"
        ></mat-row>

      </mat-table>

      @if (orders().length === 0) {
        <div class="empty">No orders yet.</div>
      }

      <!-- Pagination -->
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
    .page-header { display: flex; align-items: baseline; gap: 1rem; margin-bottom: 1.5rem; }
    h1 { margin: 0; }
    .header-count { color: #666; font-size: 0.85rem; }
    .orders-filters { margin-bottom: 1rem; }
    .filter-select { min-width: 200px; }
    .center { display: flex; justify-content: center; padding: 3rem; }
    .orders-table { width: 100%; box-shadow: none; border: 1px solid #e0e0e0; }
    .order-id { font-weight: 600; font-size: 0.85rem; }
    .order-date { font-size: 0.75rem; color: #666; }
    .customer-name { font-size: 0.88rem; }
    .customer-email { font-size: 0.75rem; color: #666; }
    .items-preview { display: flex; align-items: center; gap: 4px; }
    .item-chip { width: 32px; height: 42px; overflow: hidden; border-radius: 2px; background: #eee; }
    .item-thumb { width: 100%; height: 100%; object-fit: cover; }
    .items-more { font-size: 0.75rem; color: #666; }
    .amount { font-weight: 600; }
    .shipping-note { font-size: 0.72rem; color: #999; }
    .status-chip {
      color: #fff; border-radius: 3px; padding: 3px 8px;
      font-size: 0.72rem; letter-spacing: 0.05em; font-weight: 600;
    }
    .order-row { cursor: pointer; }
    .order-row:hover { background: #fafafa; }
    .empty { padding: 3rem; text-align: center; color: #999; }
    .pagination { display: flex; align-items: center; gap: 1rem; padding: 1rem 0; }
    .page-info { font-size: 0.85rem; color: #666; }
  `],
})
export class OrdersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly columns = ['order', 'customer', 'items', 'amount', 'status', 'actions'];
  readonly allStatuses: OrderStatus[] = [
    'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED',
  ];
  readonly limit = 20;

  readonly orders = signal<AdminOrder[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly expandedId = signal<string | null>(null);
  filterStatus = '';

  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params: Record<string, string> = { page: String(this.page()), limit: String(this.limit) };
    if (this.filterStatus) params['status'] = this.filterStatus;
    this.api.get<OrdersPage>('admin/orders', params).subscribe({
      next: res => {
        this.orders.set(res.orders);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onFilterChange() { this.page.set(1); this.load(); }
  changePage(p: number) { this.page.set(p); this.load(); }

  toggleExpanded(row: AdminOrder) {
    this.expandedId.update(id => id === row.id ? null : row.id);
  }

  nextStatuses(status: OrderStatus): OrderStatus[] {
    return STATUS_TRANSITIONS[status] ?? [];
  }

  statusColor(status: OrderStatus): string {
    return STATUS_COLORS[status] ?? '#999';
  }

  updateStatus(order: AdminOrder, newStatus: OrderStatus) {
    this.saving.set(true);
    this.api.patch(`admin/orders/${order.id}/status`, { status: newStatus }).subscribe({
      next: () => {
        this.orders.update(list => list.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
        this.saving.set(false);
        this.snackBar.open(`Order updated to ${newStatus}`, 'OK', { duration: 3000 });
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Failed to update status', 'OK', { duration: 3000 });
      },
    });
  }
}

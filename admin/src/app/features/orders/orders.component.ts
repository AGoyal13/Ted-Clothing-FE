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
      <span class="header-count">{{ total() }} {{ filterStatus ? 'results' : 'total' }}</span>
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

        <!-- Expanded detail row -->
        <ng-container matColumnDef="expandedDetail">
          <td mat-cell *matCellDef="let row" [attr.colspan]="columns.length" class="detail-cell">
            @if (expandedId() === row.id) {
              <div class="detail-panel">
                <div class="detail-section">
                  <div class="detail-label">Delivery Address</div>
                  <div class="detail-address">
                    <strong>{{ row.address.name }}</strong> · {{ row.address.phone }}<br>
                    {{ row.address.line1 }}{{ row.address.line2 ? ', ' + row.address.line2 : '' }}<br>
                    {{ row.address.city }}, {{ row.address.state }} – {{ row.address.pincode }}
                  </div>
                </div>
                <div class="detail-section">
                  <div class="detail-label">Items ({{ row.items.length }})</div>
                  <div class="detail-items">
                    @for (item of row.items; track item.id) {
                      <div class="detail-item">
                        @if (item.sku.color.images?.[0]) {
                          <img [src]="item.sku.color.images[0]" [alt]="item.sku.product.title" class="detail-thumb" />
                        }
                        <div class="detail-item-info">
                          <div class="detail-item-title">{{ item.sku.product.title }}</div>
                          <div class="detail-item-meta">{{ item.sku.color.colorName }} · {{ item.sku.sizeLabel }} · qty {{ item.quantity }}</div>
                          <div class="detail-item-price">₹{{ (+item.priceAtPurchase * item.quantity).toFixed(2) }}</div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </td>
        </ng-container>

        <mat-header-row *matHeaderRowDef="columns"></mat-header-row>
        <mat-row *matRowDef="let row; columns: columns;"
          (click)="toggleExpanded(row)"
          class="order-row"
          [class.order-row--expanded]="expandedId() === row.id"
        ></mat-row>
        <tr mat-row *matRowDef="let row; columns: ['expandedDetail']" class="detail-row"></tr>

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
    .order-row--expanded { background: #f5f5f5; }
    .detail-row { height: 0; }
    .detail-cell { padding: 0 !important; border-bottom: none; }
    .detail-panel {
      display: flex; gap: 2.5rem; padding: 1rem 1.5rem 1.25rem;
      background: #fafafa; border-bottom: 1px solid #e0e0e0;
      overflow: hidden;
    }
    .detail-section { flex: 1; min-width: 0; }
    .detail-label { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.06em; color: #888; text-transform: uppercase; margin-bottom: 0.5rem; }
    .detail-address { font-size: 0.82rem; line-height: 1.6; color: #333; }
    .detail-items { display: flex; flex-direction: column; gap: 0.75rem; }
    .detail-item { display: flex; gap: 0.75rem; align-items: flex-start; }
    .detail-thumb { width: 40px; height: 53px; object-fit: cover; border-radius: 2px; flex-shrink: 0; background: #eee; }
    .detail-item-info { font-size: 0.82rem; }
    .detail-item-title { font-weight: 500; }
    .detail-item-meta { color: #888; font-size: 0.75rem; margin-top: 1px; }
    .detail-item-price { font-weight: 600; margin-top: 2px; }
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

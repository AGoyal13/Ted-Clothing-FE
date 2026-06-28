import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';

interface PrimaryAddress {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface Customer {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  orderCount: number;
  cartCount: number;
  wishlistCount: number;
  primaryAddress: PrimaryAddress | null;
}

interface CustomersPage {
  total: number;
  page: number;
  limit: number;
  customers: Customer[];
}

interface LineItem {
  id: string;
  productTitle: string;
  slug: string;
  colorName: string;
  image: string | null;
  sizeLabel: string;
  skuCode: string;
  stockQty: number;
  price: number;
  quantity?: number;
  addedAt: string;
}

interface CustomerDetail {
  id: string;
  cart: LineItem[];
  wishlist: LineItem[];
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule, DatePipe, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-header">
      <h1>Customers</h1>
      <span class="header-count">{{ total() }} {{ search ? 'results' : 'registered' }}</span>
    </div>

    <!-- Search -->
    <div class="customers-filters">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Search name, email or mobile</mat-label>
        <input matInput [(ngModel)]="search" (ngModelChange)="onSearchChange()" placeholder="e.g. Aman, 98765..." />
        @if (search) {
          <button matSuffix mat-icon-button aria-label="Clear" (click)="clearSearch()">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-form-field>
      <span class="hint">Click a row to view cart &amp; wishlist</span>
    </div>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else {
      <mat-table [dataSource]="customers()" class="customers-table" multiTemplateDataRows>

        <ng-container matColumnDef="customer">
          <mat-header-cell *matHeaderCellDef>Customer</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <div class="cell-stack">
              <div class="customer-name">{{ row.name || '—' }}</div>
              <div class="customer-id">#{{ row.id.slice(-8).toUpperCase() }}</div>
            </div>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="contact">
          <mat-header-cell *matHeaderCellDef>Contact</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <div class="cell-stack">
              <div class="contact-email">{{ row.email || '—' }}</div>
              <div class="contact-phone">{{ row.phone || '—' }}</div>
            </div>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="address">
          <mat-header-cell *matHeaderCellDef>Primary Address</mat-header-cell>
          <mat-cell *matCellDef="let row">
            @if (row.primaryAddress; as a) {
              <div class="address-block">
                <div>{{ a.line1 }}{{ a.line2 ? ', ' + a.line2 : '' }}</div>
                <div class="address-region">{{ a.city }}, {{ a.state }} – {{ a.pincode }}</div>
                @if (!a.isDefault) {
                  <span class="address-note">most recent</span>
                }
              </div>
            } @else {
              <span class="no-address">No address saved</span>
            }
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="orders">
          <mat-header-cell *matHeaderCellDef>Orders</mat-header-cell>
          <mat-cell *matCellDef="let row"><span class="metric">{{ row.orderCount }}</span></mat-cell>
        </ng-container>

        <ng-container matColumnDef="cart">
          <mat-header-cell *matHeaderCellDef>Cart</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <span class="metric" [class.metric--zero]="!row.cartCount">{{ row.cartCount }}</span>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="wishlist">
          <mat-header-cell *matHeaderCellDef>Wishlist</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <span class="metric" [class.metric--zero]="!row.wishlistCount">{{ row.wishlistCount }}</span>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="registered">
          <mat-header-cell *matHeaderCellDef>Registered</mat-header-cell>
          <mat-cell *matCellDef="let row">{{ row.createdAt | date:'d MMM y' }}</mat-cell>
        </ng-container>

        <!-- Expanded cart + wishlist detail -->
        <ng-container matColumnDef="expandedDetail">
          <td mat-cell *matCellDef="let row" [attr.colspan]="columns.length" class="detail-cell">
            @if (expandedId() === row.id) {
              <div class="detail-panel">
                @if (detailLoading()) {
                  <div class="detail-loading"><mat-spinner diameter="24" /></div>
                } @else if (detail(); as d) {
                  <div class="detail-section">
                    <div class="detail-label">Cart ({{ d.cart.length }})</div>
                    @if (d.cart.length) {
                      @for (item of d.cart; track item.id) {
                        <div class="line-item">
                          @if (item.image) { <img [src]="item.image" [alt]="item.productTitle" class="line-thumb" /> }
                          <div class="line-info">
                            <div class="line-title">{{ item.productTitle }}</div>
                            <div class="line-meta">{{ item.colorName }} · {{ item.sizeLabel }} · qty {{ item.quantity }}</div>
                            <div class="line-price">
                              ₹{{ item.price.toFixed(2) }}
                              @if (item.stockQty <= 0) { <span class="oos">out of stock</span> }
                            </div>
                          </div>
                        </div>
                      }
                    } @else {
                      <div class="line-empty">Cart is empty</div>
                    }
                  </div>

                  <div class="detail-section">
                    <div class="detail-label">Wishlist ({{ d.wishlist.length }})</div>
                    @if (d.wishlist.length) {
                      @for (item of d.wishlist; track item.id) {
                        <div class="line-item">
                          @if (item.image) { <img [src]="item.image" [alt]="item.productTitle" class="line-thumb" /> }
                          <div class="line-info">
                            <div class="line-title">{{ item.productTitle }}</div>
                            <div class="line-meta">{{ item.colorName }} · {{ item.sizeLabel }}</div>
                            <div class="line-price">
                              ₹{{ item.price.toFixed(2) }}
                              @if (item.stockQty <= 0) { <span class="oos">out of stock</span> }
                            </div>
                          </div>
                        </div>
                      }
                    } @else {
                      <div class="line-empty">Wishlist is empty</div>
                    }
                  </div>
                } @else {
                  <div class="line-empty">Could not load details.</div>
                }
              </div>
            }
          </td>
        </ng-container>

        <mat-header-row *matHeaderRowDef="columns"></mat-header-row>
        <mat-row *matRowDef="let row; columns: columns;"
          (click)="toggleExpanded(row)"
          class="customer-row"
          [class.customer-row--expanded]="expandedId() === row.id"
        ></mat-row>
        <tr mat-row *matRowDef="let row; columns: ['expandedDetail']" class="detail-row"></tr>
      </mat-table>

      @if (customers().length === 0) {
        <div class="empty">{{ search ? 'No customers match your search.' : 'No customers yet.' }}</div>
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
    .customers-filters { margin-bottom: 1rem; display: flex; align-items: center; gap: 1rem; }
    .search-field { min-width: 320px; max-width: 420px; }
    .hint { font-size: 0.78rem; color: #999; }
    .center { display: flex; justify-content: center; padding: 3rem; }
    .customers-table { width: 100%; box-shadow: none; border: 1px solid #e0e0e0; }
    .cell-stack { display: flex; flex-direction: column; justify-content: center; gap: 2px; }
    .customer-name { font-weight: 600; font-size: 0.88rem; }
    .customer-id { font-size: 0.72rem; color: #999; font-family: monospace; }
    .contact-email { font-size: 0.85rem; }
    .contact-phone { font-size: 0.78rem; color: #666; }
    .address-block { font-size: 0.82rem; line-height: 1.5; color: #333; padding: 0.35rem 0; }
    .address-region { color: #666; }
    .address-note { font-size: 0.68rem; color: #b8860b; text-transform: uppercase; letter-spacing: 0.04em; }
    .no-address { color: #bbb; font-size: 0.82rem; }
    .metric { font-weight: 600; }
    .metric--zero { color: #ccc; font-weight: 400; }
    .empty { padding: 3rem; text-align: center; color: #999; }
    .pagination { display: flex; align-items: center; gap: 1rem; padding: 1rem 0; }
    .page-info { font-size: 0.85rem; color: #666; }
    .customer-row { cursor: pointer; }
    .customer-row:hover { background: #fafafa; }
    .customer-row--expanded { background: #f5f5f5; }
    .detail-row { height: 0; }
    .detail-cell { padding: 0 !important; border-bottom: none; }
    .detail-panel {
      display: flex; gap: 2.5rem; padding: 1rem 1.5rem 1.25rem;
      background: #fafafa; border-bottom: 1px solid #e0e0e0;
    }
    .detail-loading { padding: 0.5rem 0; }
    .detail-section { flex: 1; min-width: 0; }
    .detail-label { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.06em; color: #888; text-transform: uppercase; margin-bottom: 0.6rem; }
    .line-item { display: flex; gap: 0.75rem; align-items: flex-start; margin-bottom: 0.65rem; }
    .line-thumb { width: 40px; height: 53px; object-fit: cover; border-radius: 2px; flex-shrink: 0; background: #eee; }
    .line-info { font-size: 0.82rem; }
    .line-title { font-weight: 500; }
    .line-meta { color: #888; font-size: 0.75rem; margin-top: 1px; }
    .line-price { font-weight: 600; margin-top: 2px; }
    .oos { color: #c0392b; font-weight: 600; font-size: 0.72rem; margin-left: 4px; }
    .line-empty { font-size: 0.82rem; color: #aaa; }
    .mat-column-customer { flex: 1 1 150px; min-width: 130px; }
    .mat-column-contact { flex: 1 1 190px; min-width: 170px; }
    .mat-column-address { flex: 2 1 250px; min-width: 200px; }
    .mat-column-orders, .mat-column-cart, .mat-column-wishlist { flex: 0 0 70px; max-width: 70px; }
    .mat-column-registered { flex: 0 0 110px; max-width: 110px; }
    .mat-column-expandedDetail { flex: 1 1 100%; max-width: 100%; }
  `],
})
export class CustomersComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly columns = ['customer', 'contact', 'address', 'orders', 'cart', 'wishlist', 'registered'];
  readonly limit = 20;

  readonly customers = signal<Customer[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  search = '';

  readonly expandedId = signal<string | null>(null);
  readonly detail = signal<CustomerDetail | null>(null);
  readonly detailLoading = signal(false);
  // Cache fetched details so re-expanding a row doesn't re-hit the API.
  private readonly detailCache = new Map<string, CustomerDetail>();

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.expandedId.set(null);
    const params: Record<string, string> = { page: String(this.page()), limit: String(this.limit) };
    const term = this.search.trim();
    if (term) params['search'] = term;
    this.api.get<CustomersPage>('admin/customers', params).subscribe({
      next: res => {
        this.customers.set(res.customers);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleExpanded(row: Customer) {
    if (this.expandedId() === row.id) {
      this.expandedId.set(null);
      return;
    }
    this.expandedId.set(row.id);
    const cached = this.detailCache.get(row.id);
    if (cached) {
      this.detail.set(cached);
      this.detailLoading.set(false);
      return;
    }
    this.detail.set(null);
    this.detailLoading.set(true);
    this.api.get<CustomerDetail>(`admin/customers/${row.id}`).subscribe({
      next: d => {
        this.detailCache.set(row.id, d);
        // Guard against a stale response if the admin clicked another row meanwhile.
        if (this.expandedId() === row.id) this.detail.set(d);
        this.detailLoading.set(false);
      },
      error: () => {
        if (this.expandedId() === row.id) this.detail.set(null);
        this.detailLoading.set(false);
      },
    });
  }

  // Debounce keystrokes so we don't fire a request per character.
  onSearchChange() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 350);
  }

  clearSearch() {
    this.search = '';
    this.page.set(1);
    this.load();
  }

  changePage(p: number) { this.page.set(p); this.load(); }
}

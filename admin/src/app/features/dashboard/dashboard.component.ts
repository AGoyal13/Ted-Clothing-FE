import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { AbandonedCartsDialogComponent } from './abandoned-carts-dialog.component';

type Preset = '7d' | '30d' | '90d' | 'custom';

interface DailyReg { date: string; count: number; }
interface TopProduct { productId: string; title: string; slug: string; count: number; }
interface TopSeller { productId: string; title: string; slug: string; units: number; revenue: number; }
interface DailySale { date: string; orders: number; revenue: number; }
interface WaitlistItem { productId: string; waitlistCount: number; product: { id: string; title: string; slug: string } | null; }

interface AdminStats {
  users: { total: number; newInRange: number; dailyRegistrations: DailyReg[]; };
  wishlist: { customersWithWishlist: number; topProducts: TopProduct[]; };
  cart: { customersWithCart: number; topProducts: TopProduct[]; };
  orders: { total: number; byStatus: Record<string, number>; pending: number; };
  revenue: { total: number; shippingRevenue: number; avgOrderValue: number; };
  sales: {
    topProducts: TopSeller[];
    daily: DailySale[];
    byPaymentMethod: Record<string, { count: number; amount: number }>;
  };
  returns: { count: number; refundTotal: number; rate: number; byReason: Record<string, number>; byStatus: Record<string, number>; };
  inventory: { lowStock: number; outOfStock: number; value: number; };
  carts: { abandoned: number; abandonedValue: number; };
  coupons: { redemptions: number; discountGiven: number; };
  waitlist: WaitlistItem[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatTableModule, MatTooltipModule,
    MatDatepickerModule, MatNativeDateModule, MatFormFieldModule, MatInputModule,
    MatDialogModule,
  ],
  template: `
    <div class="dash">
      <!-- Header -->
      <div class="dash__header">
        <h1 class="dash__title">Dashboard</h1>
        <div class="dash__controls">
          <div class="dash__presets">
            @for (p of presets; track p.value) {
              <button
                mat-stroked-button
                [class.active]="preset() === p.value"
                (click)="setPreset(p.value)"
              >{{ p.label }}</button>
            }
          </div>
          <div class="dash__custom-range">
            <mat-form-field appearance="outline" class="dash__range-field">
              <mat-label>Custom range</mat-label>
              <mat-date-range-input [formGroup]="dateRange" [rangePicker]="picker" [max]="today">
                <input matStartDate formControlName="start" placeholder="Start" />
                <input matEndDate formControlName="end" placeholder="End" />
              </mat-date-range-input>
              <mat-datepicker-toggle matIconSuffix [for]="picker" />
              <mat-date-range-picker #picker />
            </mat-form-field>
            <button
              mat-flat-button
              color="primary"
              class="dash__apply-btn"
              [disabled]="!dateRange.value.start || !dateRange.value.end"
              (click)="applyCustomRange()"
            >Apply</button>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="dash__spinner"><mat-spinner diameter="48" /></div>
      } @else if (stats()) {
        <!-- KPI Cards -->
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-card__icon"><mat-icon>people</mat-icon></div>
            <div class="kpi-card__body">
              <div class="kpi-card__value">{{ stats()!.users.total | number }}</div>
              <div class="kpi-card__label">Total Customers</div>
            </div>
          </div>
          <div class="kpi-card kpi-card--accent">
            <div class="kpi-card__icon"><mat-icon>person_add</mat-icon></div>
            <div class="kpi-card__body">
              <div class="kpi-card__value">{{ stats()!.users.newInRange | number }}</div>
              <div class="kpi-card__label">New This Period</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon"><mat-icon>favorite</mat-icon></div>
            <div class="kpi-card__body">
              <div class="kpi-card__value">{{ stats()!.wishlist.customersWithWishlist | number }}</div>
              <div class="kpi-card__label">With Wishlist</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon"><mat-icon>shopping_cart</mat-icon></div>
            <div class="kpi-card__body">
              <div class="kpi-card__value">{{ stats()!.cart.customersWithCart | number }}</div>
              <div class="kpi-card__label">With Cart</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon"><mat-icon>receipt_long</mat-icon></div>
            <div class="kpi-card__body">
              <div class="kpi-card__value">{{ stats()!.orders.total | number }}</div>
              <div class="kpi-card__label">Orders</div>
            </div>
          </div>
          <div class="kpi-card kpi-card--gold">
            <div class="kpi-card__icon"><mat-icon>currency_rupee</mat-icon></div>
            <div class="kpi-card__body">
              <div class="kpi-card__value">{{ formatINR(stats()!.revenue.total) }}</div>
              <div class="kpi-card__label">Revenue</div>
            </div>
          </div>
        </div>

        <!-- Registrations Sparkline -->
        @if (stats()!.users.dailyRegistrations.length >= 1) {
          <div class="section-card">
            <h2 class="section-card__title">
              <mat-icon>show_chart</mat-icon>
              New Registrations
            </h2>
            <div class="sparkline-wrap">
              <svg class="sparkline" viewBox="0 0 400 80" preserveAspectRatio="none">
                <polyline
                  [attr.points]="sparklinePoints()"
                  fill="none"
                  stroke="#3f51b5"
                  stroke-width="2"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
                <polyline
                  [attr.points]="sparklineFill()"
                  fill="rgba(63,81,181,0.08)"
                  stroke="none"
                />
              </svg>
              <div class="sparkline-labels">
                <span>{{ stats()!.users.dailyRegistrations[0].date }}</span>
                <span>{{ stats()!.users.dailyRegistrations[stats()!.users.dailyRegistrations.length - 1].date }}</span>
              </div>
            </div>
          </div>
        }

        <!-- Sales over time -->
        @if (stats()!.sales.daily.length >= 1) {
          <div class="section-card">
            <h2 class="section-card__title"><mat-icon>trending_up</mat-icon> Sales Over Time</h2>
            <div class="trend-grid">
              <div class="trend-block">
                <div class="trend-block__label">Revenue · {{ formatINR(rangeRevenue()) }}</div>
                <div class="sparkline-wrap">
                  <svg class="sparkline" viewBox="0 0 400 80" preserveAspectRatio="none">
                    <polyline [attr.points]="revenueSparkPoints()" fill="none" stroke="#f9a825" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
                    <polyline [attr.points]="revenueSparkFill()" fill="rgba(249,168,37,0.10)" stroke="none" />
                  </svg>
                </div>
              </div>
              <div class="trend-block">
                <div class="trend-block__label">Orders · {{ rangeOrders() | number }}</div>
                <div class="sparkline-wrap">
                  <svg class="sparkline" viewBox="0 0 400 80" preserveAspectRatio="none">
                    <polyline [attr.points]="ordersSparkPoints()" fill="none" stroke="#3f51b5" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
                    <polyline [attr.points]="ordersSparkFill()" fill="rgba(63,81,181,0.08)" stroke="none" />
                  </svg>
                </div>
              </div>
            </div>
            <div class="sparkline-labels">
              <span>{{ stats()!.sales.daily[0].date }}</span>
              <span>{{ stats()!.sales.daily[stats()!.sales.daily.length - 1].date }}</span>
            </div>
          </div>
        }

        <!-- Tables Row -->
        <div class="tables-row">

          <!-- Top Wishlisted -->
          <div class="section-card">
            <h2 class="section-card__title">
              <mat-icon>favorite</mat-icon>
              Top Wishlisted Products
            </h2>
            @if (stats()!.wishlist.topProducts.length === 0) {
              <p class="empty-state">No wishlist data for this period.</p>
            } @else {
              <table mat-table [dataSource]="stats()!.wishlist.topProducts" class="dash-table">
                <ng-container matColumnDef="rank">
                  <th mat-header-cell *matHeaderCellDef>#</th>
                  <td mat-cell *matCellDef="let row; let i = index">{{ i + 1 }}</td>
                </ng-container>
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>Product</th>
                  <td mat-cell *matCellDef="let row">{{ row.title }}</td>
                </ng-container>
                <ng-container matColumnDef="count">
                  <th mat-header-cell *matHeaderCellDef>Saves</th>
                  <td mat-cell *matCellDef="let row"><strong>{{ row.count }}</strong></td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['rank','title','count']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['rank','title','count']"></tr>
              </table>
            }
          </div>

          <!-- Top Waitlisted OOS -->
          <div class="section-card">
            <h2 class="section-card__title">
              <mat-icon>notifications</mat-icon>
              Top Waitlisted (OOS)
            </h2>
            @if (stats()!.waitlist.length === 0) {
              <p class="empty-state">No waitlist signups yet.</p>
            } @else {
              <table mat-table [dataSource]="stats()!.waitlist" class="dash-table">
                <ng-container matColumnDef="rank">
                  <th mat-header-cell *matHeaderCellDef>#</th>
                  <td mat-cell *matCellDef="let row; let i = index">{{ i + 1 }}</td>
                </ng-container>
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>Product</th>
                  <td mat-cell *matCellDef="let row">{{ row.product?.title ?? row.productId }}</td>
                </ng-container>
                <ng-container matColumnDef="count">
                  <th mat-header-cell *matHeaderCellDef>Waitlist</th>
                  <td mat-cell *matCellDef="let row"><strong>{{ row.waitlistCount }}</strong></td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['rank','title','count']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['rank','title','count']"></tr>
              </table>
            }
          </div>

          <!-- Top Carted -->
          <div class="section-card">
            <h2 class="section-card__title">
              <mat-icon>shopping_cart</mat-icon>
              Top Carted Products
            </h2>
            @if (stats()!.cart.topProducts.length === 0) {
              <p class="empty-state">No cart data for this period.</p>
            } @else {
              <table mat-table [dataSource]="stats()!.cart.topProducts" class="dash-table">
                <ng-container matColumnDef="rank">
                  <th mat-header-cell *matHeaderCellDef>#</th>
                  <td mat-cell *matCellDef="let row; let i = index">{{ i + 1 }}</td>
                </ng-container>
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>Product</th>
                  <td mat-cell *matCellDef="let row">{{ row.title }}</td>
                </ng-container>
                <ng-container matColumnDef="count">
                  <th mat-header-cell *matHeaderCellDef>Added</th>
                  <td mat-cell *matCellDef="let row"><strong>{{ row.count }}</strong></td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['rank','title','count']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['rank','title','count']"></tr>
              </table>
            }
          </div>

        </div>

        <!-- Top Selling Products (actual sales) -->
        <div class="section-card">
          <h2 class="section-card__title"><mat-icon>local_fire_department</mat-icon> Top Selling Products</h2>
          @if (stats()!.sales.topProducts.length === 0) {
            <p class="empty-state">No sales in this period.</p>
          } @else {
            <table mat-table [dataSource]="stats()!.sales.topProducts" class="dash-table">
              <ng-container matColumnDef="rank">
                <th mat-header-cell *matHeaderCellDef>#</th>
                <td mat-cell *matCellDef="let row; let i = index">{{ i + 1 }}</td>
              </ng-container>
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef>Product</th>
                <td mat-cell *matCellDef="let row">{{ row.title }}</td>
              </ng-container>
              <ng-container matColumnDef="units">
                <th mat-header-cell *matHeaderCellDef>Units Sold</th>
                <td mat-cell *matCellDef="let row"><strong>{{ row.units }}</strong></td>
              </ng-container>
              <ng-container matColumnDef="revenue">
                <th mat-header-cell *matHeaderCellDef>Revenue</th>
                <td mat-cell *matCellDef="let row">{{ formatINR(row.revenue) }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['rank','title','units','revenue']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['rank','title','units','revenue']"></tr>
            </table>
          }
        </div>

        <!-- Orders Breakdown -->
        <div class="section-card section-card--orders">
          <h2 class="section-card__title">
            <mat-icon>receipt_long</mat-icon>
            Orders Breakdown
            <span class="section-card__sub">Phase 4 data</span>
          </h2>
          <div class="orders-grid">
            @for (entry of orderEntries(); track entry.status) {
              <div class="order-status-card" [attr.data-status]="entry.status">
                <div class="order-status-card__count">{{ entry.count }}</div>
                <div class="order-status-card__label">{{ entry.status }}</div>
              </div>
            }
          </div>
          <div class="revenue-row">
            <div class="revenue-item">
              <span class="revenue-item__label">Total Revenue</span>
              <span class="revenue-item__value">{{ formatINR(stats()!.revenue.total) }}</span>
            </div>
            <div class="revenue-item">
              <span class="revenue-item__label">Shipping Revenue</span>
              <span class="revenue-item__value">{{ formatINR(stats()!.revenue.shippingRevenue) }}</span>
            </div>
            <div class="revenue-item">
              <span class="revenue-item__label">Avg. Order Value</span>
              <span class="revenue-item__value">{{ formatINR(stats()!.revenue.avgOrderValue) }}</span>
            </div>
            <div class="revenue-item">
              <span class="revenue-item__label">Pending Orders</span>
              <span class="revenue-item__value">{{ stats()!.orders.pending }}</span>
            </div>
          </div>
          <div class="revenue-row">
            <div class="revenue-item">
              <span class="revenue-item__label">Prepaid · {{ stats()!.sales.byPaymentMethod['PREPAID'].count }}</span>
              <span class="revenue-item__value">{{ formatINR(stats()!.sales.byPaymentMethod['PREPAID'].amount) }}</span>
            </div>
            <div class="revenue-item">
              <span class="revenue-item__label">COD · {{ stats()!.sales.byPaymentMethod['COD'].count }}</span>
              <span class="revenue-item__value">{{ formatINR(stats()!.sales.byPaymentMethod['COD'].amount) }}</span>
            </div>
            <div class="revenue-item">
              <span class="revenue-item__label">Coupon Redemptions</span>
              <span class="revenue-item__value">{{ stats()!.coupons.redemptions }}</span>
            </div>
            <div class="revenue-item">
              <span class="revenue-item__label">Discount Given</span>
              <span class="revenue-item__value">{{ formatINR(stats()!.coupons.discountGiven) }}</span>
            </div>
          </div>
        </div>

        <!-- Returns & Refunds -->
        <div class="section-card">
          <h2 class="section-card__title"><mat-icon>assignment_return</mat-icon> Returns &amp; Refunds</h2>
          <div class="revenue-row">
            <div class="revenue-item">
              <span class="revenue-item__label">Returns</span>
              <span class="revenue-item__value">{{ stats()!.returns.count }}</span>
            </div>
            <div class="revenue-item">
              <span class="revenue-item__label">Return Rate</span>
              <span class="revenue-item__value">{{ (stats()!.returns.rate * 100) | number:'1.0-1' }}%</span>
            </div>
            <div class="revenue-item">
              <span class="revenue-item__label">Refunds Total</span>
              <span class="revenue-item__value">{{ formatINR(stats()!.returns.refundTotal) }}</span>
            </div>
          </div>
          @if (returnReasonEntries().length > 0) {
            <div class="orders-grid">
              @for (e of returnReasonEntries(); track e.key) {
                <div class="order-status-card">
                  <div class="order-status-card__count">{{ e.count }}</div>
                  <div class="order-status-card__label">{{ e.key }}</div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Inventory & Carts (current snapshot) -->
        <div class="section-card section-card--orders">
          <h2 class="section-card__title">
            <mat-icon>inventory_2</mat-icon> Inventory &amp; Carts
            <span class="section-card__sub">current snapshot</span>
          </h2>
          <div class="revenue-row">
            <div class="revenue-item">
              <span class="revenue-item__label">Low Stock (≤5)</span>
              <span class="revenue-item__value">{{ stats()!.inventory.lowStock }}</span>
            </div>
            <div class="revenue-item">
              <span class="revenue-item__label">Out of Stock</span>
              <span class="revenue-item__value">{{ stats()!.inventory.outOfStock }}</span>
            </div>
            <div class="revenue-item">
              <span class="revenue-item__label">Inventory Value</span>
              <span class="revenue-item__value">{{ formatINR(stats()!.inventory.value) }}</span>
            </div>
            <div class="revenue-item revenue-item--clickable"
                 (click)="openAbandonedCarts()"
                 matTooltip="Click to see customer details">
              <span class="revenue-item__label">Abandoned Carts</span>
              <span class="revenue-item__value">
                {{ stats()!.carts.abandoned }}
                <span class="revenue-item__sub">{{ formatINR(stats()!.carts.abandonedValue) }}</span>
              </span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dash { max-width: 1400px; }

    .dash__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 24px;
    }

    .dash__title {
      font-size: 22px;
      font-weight: 600;
      margin: 0;
    }

    .dash__controls {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .dash__presets {
      display: flex;
      gap: 8px;

      button.active {
        background: #3f51b5;
        color: white;
      }
    }

    .dash__custom-range {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .dash__range-field {
      width: 240px;

      .mat-mdc-form-field-subscript-wrapper { display: none; }
    }

    .dash__apply-btn {
      height: 40px;
      margin-top: -4px;
    }

    .dash__spinner {
      display: flex;
      justify-content: center;
      padding: 80px 0;
    }

    /* KPI Cards */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);

      &--accent { border-left: 3px solid #3f51b5; }
      &--gold { border-left: 3px solid #f9a825; }
    }

    .kpi-card__icon {
      color: #9e9e9e;
      mat-icon { font-size: 28px; width: 28px; height: 28px; }
    }

    .kpi-card--accent .kpi-card__icon { color: #3f51b5; }
    .kpi-card--gold .kpi-card__icon { color: #f9a825; }

    .kpi-card__value {
      font-size: 26px;
      font-weight: 700;
      line-height: 1.1;
      color: #212121;
    }

    .kpi-card__label {
      font-size: 12px;
      color: #757575;
      margin-top: 2px;
    }

    /* Section cards */
    .section-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
      margin-bottom: 24px;
    }

    .section-card__title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 600;
      margin: 0 0 16px;
      color: #212121;

      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #3f51b5; }
    }

    .section-card__sub {
      font-size: 11px;
      font-weight: 400;
      color: #9e9e9e;
      margin-left: 4px;
    }

    /* Sparkline */
    .sparkline-wrap { position: relative; }

    .sparkline {
      width: 100%;
      height: 80px;
      display: block;
    }

    .sparkline-labels {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #9e9e9e;
      margin-top: 4px;
    }

    .trend-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .trend-block__label {
      font-size: 13px;
      font-weight: 600;
      color: #555;
      margin-bottom: 6px;
    }

    /* Tables row */
    .tables-row {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 24px;

      .section-card { margin-bottom: 0; }
    }

    .dash-table {
      width: 100%;

      th { font-size: 12px; color: #757575; font-weight: 500; }
      td { font-size: 13px; }

      .mat-mdc-row:hover { background: #f5f5f5; }
    }

    .empty-state {
      color: #9e9e9e;
      font-size: 13px;
      text-align: center;
      padding: 24px 0;
    }

    /* Orders */
    .section-card--orders { margin-bottom: 0; }

    .orders-grid {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }

    .order-status-card {
      flex: 1;
      min-width: 100px;
      text-align: center;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 12px;

      &[data-status="DELIVERED"] { border-color: #4caf50; }
      &[data-status="SHIPPED"] { border-color: #2196f3; }
      &[data-status="CONFIRMED"] { border-color: #ff9800; }
      &[data-status="CANCELLED"] { border-color: #f44336; }
    }

    .order-status-card__count {
      font-size: 24px;
      font-weight: 700;
      color: #212121;
    }

    .order-status-card__label {
      font-size: 11px;
      color: #757575;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 2px;
    }

    .revenue-row {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
      border-top: 1px solid #f0f0f0;
      padding-top: 16px;
    }

    .revenue-item__label {
      display: block;
      font-size: 12px;
      color: #757575;
      margin-bottom: 2px;
    }

    .revenue-item__value {
      font-size: 20px;
      font-weight: 600;
      color: #212121;
    }

    .revenue-item__sub {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #757575;
    }

    .revenue-item--clickable {
      cursor: pointer;
      border-radius: 6px;
      padding: 4px 8px;
      margin: -4px -8px;
      transition: background 0.15s ease;
    }
    .revenue-item--clickable:hover {
      background: #f5f5f5;
    }
    .revenue-item--clickable .revenue-item__label {
      color: #1565c0;
    }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);

  readonly presets: { label: string; value: Preset }[] = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
  ];

  readonly today = new Date();
  readonly dateRange = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  readonly preset = signal<Preset>('30d');
  readonly loading = signal(true);
  readonly stats = signal<AdminStats | null>(null);

  readonly sparklinePoints = computed(() => {
    const daily = this.stats()?.users.dailyRegistrations ?? [];
    if (daily.length < 2) return '';
    const max = Math.max(...daily.map(d => d.count), 1);
    return daily
      .map((d, i) => {
        const x = (i / (daily.length - 1)) * 400;
        const y = 80 - (d.count / max) * 70;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });

  readonly sparklineFill = computed(() => {
    const line = this.sparklinePoints();
    if (!line) return '';
    const pts = line.split(' ');
    const last = pts[pts.length - 1].split(',')[0];
    return `${line} ${last},80 0,80`;
  });

  readonly orderEntries = computed(() => {
    const byStatus = this.stats()?.orders.byStatus ?? {};
    return Object.entries(byStatus).map(([status, count]) => ({ status, count }));
  });

  readonly returnReasonEntries = computed(() => {
    const byReason = this.stats()?.returns.byReason ?? {};
    return Object.entries(byReason).map(([key, count]) => ({ key, count }));
  });

  // ── Sales trend sparklines (reuse the registrations sparkline math) ──────────
  private sparkLine(values: number[]): string {
    if (values.length < 2) return '';
    const max = Math.max(...values, 1);
    return values
      .map((v, i) => `${((i / (values.length - 1)) * 400).toFixed(1)},${(80 - (v / max) * 70).toFixed(1)}`)
      .join(' ');
  }
  private sparkArea(line: string): string {
    if (!line) return '';
    const pts = line.split(' ');
    const last = pts[pts.length - 1].split(',')[0];
    return `${line} ${last},80 0,80`;
  }

  readonly revenueSparkPoints = computed(() => this.sparkLine((this.stats()?.sales.daily ?? []).map(d => d.revenue)));
  readonly revenueSparkFill = computed(() => this.sparkArea(this.revenueSparkPoints()));
  readonly ordersSparkPoints = computed(() => this.sparkLine((this.stats()?.sales.daily ?? []).map(d => d.orders)));
  readonly ordersSparkFill = computed(() => this.sparkArea(this.ordersSparkPoints()));
  readonly rangeRevenue = computed(() => (this.stats()?.sales.daily ?? []).reduce((s, d) => s + d.revenue, 0));
  readonly rangeOrders = computed(() => (this.stats()?.sales.daily ?? []).reduce((s, d) => s + d.orders, 0));

  ngOnInit(): void {
    this.load();
  }

  setPreset(p: Preset): void {
    this.dateRange.reset();
    this.preset.set(p);
    this.load();
  }

  applyCustomRange(): void {
    const { start, end } = this.dateRange.value;
    if (!start || !end) return;
    this.preset.set('custom');
    this.load();
  }

  openAbandonedCarts(): void {
    this.dialog.open(AbandonedCartsDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      autoFocus: false,
    });
  }

  formatINR(value: number): string {
    const n = Number(value ?? 0);
    if (!n || isNaN(n)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n);
  }

  private load(): void {
    this.loading.set(true);

    let from: Date;
    let to: Date;

    if (this.preset() === 'custom') {
      const { start, end } = this.dateRange.value;
      from = start!;
      to = new Date(end!);
      to.setHours(23, 59, 59, 999);
    } else {
      to = new Date();
      const days = this.preset() === '7d' ? 7 : this.preset() === '30d' ? 30 : 90;
      from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    }

    this.api.get<AdminStats>('admin/stats', {
      from: from.toISOString(),
      to: to.toISOString(),
    }).subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}

import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';

type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PICKUP_SCHEDULED' | 'IN_TRANSIT' | 'RECEIVED' | 'EXCHANGE_COMPLETE' | 'REFUNDED';

interface OrderItemContext {
  id: string;
  quantity: number;
  priceAtPurchase: string;
  sku: {
    id: string;
    sizeLabel: string;
    color: { colorName: string; images: string[] };
    product: { title: string };
  };
}

interface AdminReturn {
  id: string;
  orderId: string;
  userId: string;
  status: ReturnStatus;
  reason: string;
  comments?: string;
  photoUrls: string[];
  reverseAwb?: string;
  refundAmount?: string;
  refundId?: string;
  refundedAt?: string;
  bankDetails?: string;
  adminNotes?: string;
  approvedAt?: string;
  rejectedAt?: string;
  receivedAt?: string;
  createdAt: string;
  user: { name?: string; email?: string };
  order: {
    id: string;
    paymentMethod: string;
    paymentStatus?: string;
    totalAmount: string;
    items: OrderItemContext[];
  };
  items: Array<{
    id: string;
    quantity: number;
    orderItem: {
      id: string;
      priceAtPurchase: string;
      sku: {
        sizeLabel: string;
        skuCode: string;
        color: { colorName: string; images: string[] };
        product: { title: string; slug: string };
      };
    };
    exchangeSku?: { sizeLabel: string; color: { colorName: string }; product: { title: string } } | null;
  }>;
}

interface ReturnsPage {
  total: number;
  page: number;
  limit: number;
  returns: AdminReturn[];
}

const STATUS_COLORS: Record<ReturnStatus, string> = {
  REQUESTED: '#e67e22',
  APPROVED: '#3498db',
  REJECTED: '#e74c3c',
  PICKUP_SCHEDULED: '#9b59b6',
  IN_TRANSIT: '#8e44ad',
  RECEIVED: '#27ae60',
  EXCHANGE_COMPLETE: '#1abc9c',
  REFUNDED: '#2ecc71',
};

const REASON_LABELS: Record<string, string> = {
  WRONG_SIZE: 'Wrong size',
  DEFECTIVE_ITEM: 'Defective item',
  NOT_AS_DESCRIBED: 'Not as described',
  WRONG_ITEM_DELIVERED: 'Wrong item delivered',
  DAMAGED_IN_TRANSIT: 'Damaged in transit',
  CHANGED_MIND: 'Changed mind',
};

@Component({
  selector: 'app-returns',
  standalone: true,
  imports: [
    CommonModule, DatePipe, FormsModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatChipsModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <h1>Returns &amp; Exchanges</h1>
      <span class="header-count">{{ total() }} {{ filterStatus ? 'results' : 'total' }}</span>
    </div>

    <div class="filters-row">
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

      <mat-table [dataSource]="returns()" class="returns-table" multiTemplateDataRows>

        <ng-container matColumnDef="id">
          <mat-header-cell *matHeaderCellDef>Return</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <div class="cell-stack">
              <div class="return-id">#{{ row.id.slice(-8).toUpperCase() }}</div>
              <div class="return-date">{{ row.createdAt | date:'d MMM y' }}</div>
            </div>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="order">
          <mat-header-cell *matHeaderCellDef>Order</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <a class="order-link" [routerLink]="['/orders']" [queryParams]="{highlight: row.orderId}">
              #{{ row.orderId.slice(-8).toUpperCase() }}
            </a>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="customer">
          <mat-header-cell *matHeaderCellDef>Customer</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <div class="cell-stack">
              <div>{{ row.user?.name || '—' }}</div>
              <div class="muted">{{ row.user?.email || '—' }}</div>
            </div>
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="reason">
          <mat-header-cell *matHeaderCellDef>Reason</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <span class="reason-label">{{ reasonLabel(row.reason) }}</span>
            @if (hasExchange(row)) {
              <span class="exchange-badge">Exchange</span>
            }
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="photos">
          <mat-header-cell *matHeaderCellDef>Photos</mat-header-cell>
          <mat-cell *matCellDef="let row">
            @if (row.photoUrls?.length) {
              <div class="photo-strip">
                @for (url of row.photoUrls.slice(0, 3); track url) {
                  <img [src]="url" class="photo-thumb" (click)="openLightbox(row, $index); $event.stopPropagation()" />
                }
                @if (row.photoUrls.length > 3) {
                  <span class="photo-more">+{{ row.photoUrls.length - 3 }}</span>
                }
              </div>
            } @else {
              <span class="muted">—</span>
            }
          </mat-cell>
        </ng-container>

        <ng-container matColumnDef="status">
          <mat-header-cell *matHeaderCellDef>Status</mat-header-cell>
          <mat-cell *matCellDef="let row">
            <span class="status-chip" [style.background]="statusColor(row.status)">{{ row.status }}</span>
          </mat-cell>
        </ng-container>

        <!-- Expanded detail row -->
        <ng-container matColumnDef="expandedDetail">
          <td mat-cell *matCellDef="let row" [attr.colspan]="columns.length" class="detail-cell">
            @if (expandedId() === row.id) {
              <div class="detail-panel">

                <!-- Photos section -->
                @if (row.photoUrls?.length) {
                  <div class="detail-section">
                    <div class="detail-label">Customer Photos ({{ row.photoUrls.length }})</div>
                    <div class="photo-grid">
                      @for (url of row.photoUrls; track url; let i = $index) {
                        <div class="photo-card" (click)="openLightbox(row, i)">
                          <img [src]="url" class="photo-card__img" />
                          <div class="photo-card__overlay"><mat-icon>zoom_in</mat-icon></div>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Order items context: all items with return/exchange status -->
                <div class="detail-section">
                  <div class="detail-label">Order Items ({{ row.order.items.length }})</div>
                  <div class="detail-items">
                    @for (oi of row.order.items; track oi.id) {
                      @let returnItem = getReturnItemForOrderItem(row, oi.id);
                      <div class="detail-item" [class.detail-item--inactive]="!returnItem">
                        @if (oi.sku.color.images?.[0]) {
                          <img [src]="oi.sku.color.images[0]" class="detail-thumb" [class.detail-thumb--inactive]="!returnItem" />
                        }
                        <div class="detail-item-info">
                          <div class="detail-item-title">{{ oi.sku.product.title }}</div>
                          <div class="detail-item-meta">{{ oi.sku.color.colorName }} · {{ oi.sku.sizeLabel }} × {{ oi.quantity }}</div>
                          <div class="detail-item-price">₹{{ (+oi.priceAtPurchase * oi.quantity).toFixed(2) }}</div>
                          @if (returnItem) {
                            @if (returnItem.exchangeSku) {
                              <div class="exchange-arrow">→ Exchange: <strong>{{ returnItem.exchangeSku.product.title }} {{ returnItem.exchangeSku.sizeLabel }}</strong> ({{ returnItem.exchangeSku.color.colorName }})</div>
                            } @else {
                              <div class="return-tag">Return</div>
                            }
                          } @else {
                            <div class="not-in-return-tag">Not in return</div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Meta section -->
                <div class="detail-section">
                  <div class="detail-label">Details</div>
                  <div class="meta-grid">
                    <span class="meta-key">Reason</span><span>{{ reasonLabel(row.reason) }}</span>
                    @if (row.comments) {
                      <span class="meta-key">Comments</span><span class="meta-italic">"{{ row.comments }}"</span>
                    }
                    <span class="meta-key">Payment</span><span>{{ row.order.paymentMethod }}</span>
                    <span class="meta-key">Order total</span><span>₹{{ (+row.order.totalAmount).toFixed(2) }}</span>
                    @if (row.reverseAwb) {
                      <span class="meta-key">Reverse AWB</span><span class="mono">{{ row.reverseAwb }}</span>
                    }
                    @if (row.refundAmount) {
                      <span class="meta-key">Refund</span>
                      <span>₹{{ (+row.refundAmount).toFixed(2) }} @if (row.refundId) { · <span class="mono">{{ row.refundId }}</span> }</span>
                    }
                    @if (row.adminNotes) {
                      <span class="meta-key">Notes</span><span class="meta-italic">{{ row.adminNotes }}</span>
                    }
                  </div>

                  @if (row.bankDetails && parseBankDetails(row.bankDetails); as bd) {
                    <div class="bank-details">
                      <div class="detail-label" style="margin-top:0.75rem">COD Refund Details</div>
                      @if (bd['type'] === 'UPI') {
                        <div class="bank-row"><span>UPI ID</span><strong>{{ bd['upiId'] }}</strong></div>
                      } @else {
                        <div class="bank-row"><span>Name</span><strong>{{ bd['name'] }}</strong></div>
                        <div class="bank-row"><span>Account</span><strong>{{ bd['account'] }}</strong></div>
                        <div class="bank-row"><span>IFSC</span><strong>{{ bd['ifsc'] }}</strong></div>
                      }
                    </div>
                  }

                  <!-- Actions -->
                  <div class="return-actions" (click)="$event.stopPropagation()">
                    @if (row.status === 'REQUESTED') {
                      <button mat-stroked-button color="primary" [disabled]="acting() === row.id" (click)="approve(row)">
                        <mat-icon>check_circle</mat-icon> Approve
                      </button>
                      <button mat-stroked-button color="warn" [disabled]="acting() === row.id" (click)="openRejectDialog(row.id)">
                        <mat-icon>cancel</mat-icon> Reject
                      </button>
                    }
                    @if (row.status === 'APPROVED') {
                      <button mat-stroked-button color="primary" [disabled]="acting() === row.id" (click)="schedulePickup(row)">
                        <mat-icon>local_shipping</mat-icon> Schedule Pickup
                      </button>
                    }
                    @if (row.status === 'PICKUP_SCHEDULED' || row.status === 'IN_TRANSIT' || row.status === 'APPROVED') {
                      <button mat-stroked-button color="primary" [disabled]="acting() === row.id" (click)="markReceived(row)">
                        <mat-icon>inventory</mat-icon> Mark Received
                      </button>
                    }
                    @if (row.status === 'RECEIVED') {
                      @if (hasExchange(row)) {
                        <button mat-flat-button color="primary" [disabled]="acting() === row.id"
                          (click)="markExchangeComplete(row)"
                          matTooltip="Exchange fulfilled — inventory already balanced">
                          <mat-icon>swap_horiz</mat-icon> Exchange Complete
                        </button>
                        <button mat-stroked-button color="warn" [disabled]="acting() === row.id"
                          (click)="openRefundDialog(row)"
                          matTooltip="Exchange failed — restore stock and issue cash refund">
                          <mat-icon>currency_rupee</mat-icon> Issue Refund
                        </button>
                      } @else {
                        <button mat-flat-button color="primary" [disabled]="acting() === row.id" (click)="openRefundDialog(row)">
                          <mat-icon>currency_rupee</mat-icon> Process Refund
                        </button>
                      }
                    }
                    @if (acting() === row.id) {
                      <mat-spinner diameter="20" style="margin-left:8px" />
                    }
                  </div>

                  <!-- Reject dialog -->
                  @if (rejectDialogId() === row.id) {
                    <div class="inline-dialog" (click)="$event.stopPropagation()">
                      <div class="inline-dialog__title">Reject — provide reason</div>
                      <textarea class="inline-dialog__textarea"
                        placeholder="Reason (shown to customer)…"
                        [value]="rejectReason()"
                        (input)="rejectReason.set($any($event.target).value)"
                        rows="2"></textarea>
                      <div class="inline-dialog__actions">
                        <button mat-button (click)="rejectDialogId.set(null)">Cancel</button>
                        <button mat-flat-button color="warn" [disabled]="!rejectReason().trim()" (click)="confirmReject(row)">Confirm Reject</button>
                      </div>
                    </div>
                  }

                  <!-- Refund dialog -->
                  @if (refundDialogId() === row.id) {
                    <div class="inline-dialog" (click)="$event.stopPropagation()">
                      <div class="inline-dialog__title">{{ hasExchange(row) ? 'Issue Refund (exchange failed)' : 'Process Refund' }}</div>
                      <p class="inline-dialog__note" style="margin-bottom:0.25rem">Select items to refund:</p>
                      <div class="refund-item-list">
                        @for (item of row.items; track item.id) {
                          <label class="refund-item-row">
                            <input type="checkbox"
                              [checked]="refundItemSelection()[item.id] !== false"
                              (change)="toggleRefundItem(item.id, $any($event.target).checked)" />
                            <span class="refund-item-name">{{ item.orderItem.sku.product.title }}</span>
                            <span class="refund-item-meta">{{ item.orderItem.sku.sizeLabel }} × {{ item.quantity }}</span>
                            <span class="refund-item-price">₹{{ (+item.orderItem.priceAtPurchase * item.quantity).toFixed(2) }}</span>
                          </label>
                        }
                      </div>
                      <p class="inline-dialog__note" style="margin-top:0.5rem">
                        Refund total: <strong>₹{{ computeRefundTotal(row).toFixed(2) }}</strong>
                        @if (row.order.paymentMethod === 'PREPAID') {
                          — will be triggered via Razorpay automatically.
                        } @else {
                          — transfer manually using the details above.
                        }
                      </p>
                      @if (row.order.paymentMethod === 'COD' && !row.bankDetails) {
                        <p style="color:#e67e22;font-size:0.78rem">⚠ No bank details on record.</p>
                      }
                      <div class="inline-dialog__actions">
                        <button mat-button (click)="refundDialogId.set(null)">Cancel</button>
                        <button mat-flat-button color="primary"
                          [disabled]="computeRefundTotal(row) === 0"
                          (click)="confirmRefund(row)">Confirm</button>
                      </div>
                    </div>
                  }
                </div>

              </div>
            }
          </td>
        </ng-container>

        <mat-header-row *matHeaderRowDef="columns"></mat-header-row>
        <mat-row *matRowDef="let row; columns: columns;" (click)="toggleExpanded(row)" class="return-row" [class.return-row--expanded]="expandedId() === row.id"></mat-row>
        <tr mat-row *matRowDef="let row; columns: ['expandedDetail']" class="detail-row"></tr>
      </mat-table>

      @if (returns().length === 0) {
        <div class="empty">No returns yet.</div>
      }

      @if (total() > limit) {
        <div class="pagination">
          <button mat-button [disabled]="page() === 1" (click)="changePage(page() - 1)">← Prev</button>
          <span class="page-info">Page {{ page() }} of {{ totalPages() }}</span>
          <button mat-button [disabled]="page() >= totalPages()" (click)="changePage(page() + 1)">Next →</button>
        </div>
      }
    }

    <!-- Photo lightbox -->
    @if (lightboxReturn()) {
      <div class="lightbox" (click)="closeLightbox()">
        <button class="lightbox__close" (click)="closeLightbox()"><mat-icon>close</mat-icon></button>
        <button class="lightbox__nav lightbox__nav--prev" (click)="lightboxPrev(); $event.stopPropagation()" [disabled]="lightboxIndex() === 0">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <img class="lightbox__img" [src]="lightboxReturn()!.photoUrls[lightboxIndex()]" (click)="$event.stopPropagation()" />
        <button class="lightbox__nav lightbox__nav--next" (click)="lightboxNext(); $event.stopPropagation()" [disabled]="lightboxIndex() >= lightboxReturn()!.photoUrls.length - 1">
          <mat-icon>chevron_right</mat-icon>
        </button>
        <div class="lightbox__counter">{{ lightboxIndex() + 1 }} / {{ lightboxReturn()!.photoUrls.length }}</div>
      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: baseline; gap: 1rem; margin-bottom: 1.5rem; }
    h1 { margin: 0; }
    .header-count { color: #666; font-size: 0.85rem; }
    .filters-row { margin-bottom: 1rem; }
    .filter-select { min-width: 200px; }
    .center { display: flex; justify-content: center; padding: 3rem; }
    .returns-table { width: 100%; box-shadow: none; border: 1px solid #e0e0e0; }
    .cell-stack { display: flex; flex-direction: column; gap: 2px; }
    .return-id { font-weight: 600; font-size: 0.85rem; }
    .return-date { font-size: 0.75rem; color: #666; }
    .order-link { font-size: 0.82rem; color: #1a237e; text-decoration: none; font-family: monospace; }
    .order-link:hover { text-decoration: underline; }
    .muted { font-size: 0.75rem; color: #888; }
    .reason-label { font-size: 0.82rem; }
    .exchange-badge { margin-left: 6px; background: #e3f2fd; color: #1565c0; border-radius: 3px; padding: 1px 6px; font-size: 0.68rem; font-weight: 600; vertical-align: middle; }
    .photo-strip { display: flex; align-items: center; gap: 4px; }
    .photo-thumb { width: 32px; height: 42px; object-fit: cover; border-radius: 2px; cursor: pointer; border: 1px solid #eee; }
    .photo-more { font-size: 0.72rem; color: #666; }
    .status-chip { color: #fff; border-radius: 3px; padding: 3px 8px; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.04em; white-space: nowrap; }
    .return-row { cursor: pointer; }
    .return-row:hover { background: #fafafa; }
    .return-row--expanded { background: #f5f5f5; }
    .detail-row { height: 0; }
    .detail-cell { padding: 0 !important; border-bottom: none; }
    .detail-panel { display: flex; gap: 2rem; padding: 1rem 1.5rem 1.25rem; background: #fafafa; border-bottom: 1px solid #e0e0e0; flex-wrap: wrap; }
    .detail-section { flex: 1; min-width: 220px; }
    .detail-label { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em; color: #888; text-transform: uppercase; margin-bottom: 0.5rem; }
    .photo-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .photo-card { position: relative; width: 80px; height: 106px; border-radius: 3px; overflow: hidden; cursor: pointer; border: 1px solid #ddd; }
    .photo-card__img { width: 100%; height: 100%; object-fit: cover; }
    .photo-card__overlay { position: absolute; inset: 0; background: rgba(0,0,0,0); display: flex; align-items: center; justify-content: center; color: #fff; transition: background 0.15s; }
    .photo-card:hover .photo-card__overlay { background: rgba(0,0,0,0.35); }
    .detail-items { display: flex; flex-direction: column; gap: 0.75rem; }
    .detail-item { display: flex; gap: 0.75rem; align-items: flex-start; }
    .detail-thumb { width: 40px; height: 53px; object-fit: cover; border-radius: 2px; flex-shrink: 0; background: #eee; }
    .detail-item-info { font-size: 0.82rem; }
    .detail-item-title { font-weight: 500; }
    .detail-item-meta { color: #888; font-size: 0.75rem; margin-top: 1px; }
    .detail-item-price { font-weight: 600; margin-top: 2px; }
    .exchange-arrow { font-size: 0.75rem; color: #3498db; margin-top: 3px; }
    .return-tag { font-size: 0.7rem; color: #e67e22; font-weight: 600; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.04em; }
    .not-in-return-tag { font-size: 0.7rem; color: #bbb; margin-top: 3px; font-style: italic; }
    .detail-item--inactive { opacity: 0.45; }
    .detail-thumb--inactive { filter: grayscale(1); }
    .refund-item-list { display: flex; flex-direction: column; gap: 4px; margin: 4px 0; }
    .refund-item-row { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; cursor: pointer; padding: 3px 0; }
    .refund-item-row input { flex-shrink: 0; }
    .refund-item-name { flex: 1; font-weight: 500; }
    .refund-item-meta { color: #888; font-size: 0.75rem; }
    .refund-item-price { font-weight: 600; min-width: 60px; text-align: right; }
    .meta-grid { display: grid; grid-template-columns: 90px 1fr; gap: 4px 12px; font-size: 0.82rem; }
    .meta-key { color: #888; font-size: 0.75rem; align-self: center; }
    .meta-italic { font-style: italic; color: #555; }
    .mono { font-family: monospace; font-size: 0.8rem; }
    .bank-details { margin-top: 0.5rem; }
    .bank-row { display: flex; gap: 0.75rem; font-size: 0.82rem; margin-bottom: 3px; }
    .bank-row span { color: #888; min-width: 65px; font-size: 0.75rem; }
    .return-actions { display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }
    .inline-dialog { margin-top: 0.75rem; padding: 0.75rem; background: #fff3e0; border: 1px solid #ffe0b2; border-radius: 4px; }
    .inline-dialog__title { font-weight: 600; font-size: 0.85rem; margin-bottom: 0.5rem; }
    .inline-dialog__note { font-size: 0.78rem; color: #555; margin: 0 0 0.5rem; line-height: 1.4; }
    .inline-dialog__textarea { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 3px; padding: 6px 8px; font-family: inherit; font-size: 0.82rem; resize: vertical; }
    .inline-dialog__actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
    .empty { padding: 3rem; text-align: center; color: #999; }
    .pagination { display: flex; align-items: center; gap: 1rem; padding: 1rem 0; }
    .page-info { font-size: 0.85rem; color: #666; }
    .mat-column-id { flex: 0 0 130px; }
    .mat-column-order { flex: 0 0 120px; }
    .mat-column-customer { flex: 1 1 160px; min-width: 130px; overflow: hidden; }
    .mat-column-reason { flex: 1 1 160px; min-width: 130px; }
    .mat-column-photos { flex: 0 0 130px; }
    .mat-column-status { flex: 0 0 200px; overflow: hidden; }
    .mat-column-expandedDetail { flex: 1 1 100%; max-width: 100%; }
    /* Lightbox */
    .lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; }
    .lightbox__img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 4px; }
    .lightbox__close { position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.15); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; }
    .lightbox__close:hover { background: rgba(255,255,255,0.3); }
    .lightbox__nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; }
    .lightbox__nav:hover:not(:disabled) { background: rgba(255,255,255,0.3); }
    .lightbox__nav:disabled { opacity: 0.3; cursor: default; }
    .lightbox__nav--prev { left: 16px; }
    .lightbox__nav--next { right: 16px; }
    .lightbox__counter { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.7); font-size: 0.85rem; }
  `],
})
export class ReturnsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);

  readonly columns = ['id', 'order', 'customer', 'reason', 'photos', 'status'];
  readonly allStatuses: ReturnStatus[] = [
    'REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'RECEIVED', 'EXCHANGE_COMPLETE', 'REFUNDED',
  ];
  readonly limit = 20;

  readonly returns = signal<AdminReturn[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly expandedId = signal<string | null>(null);
  readonly acting = signal<string | null>(null);
  readonly rejectDialogId = signal<string | null>(null);
  readonly rejectReason = signal('');
  readonly refundDialogId = signal<string | null>(null);
  readonly refundItemSelection = signal<Record<string, boolean>>({});

  // Lightbox
  readonly lightboxReturn = signal<AdminReturn | null>(null);
  readonly lightboxIndex = signal(0);

  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit));

  filterStatus: ReturnStatus | '' = '';
  private orderIdFilter = '';

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.orderIdFilter = params['orderId'] ?? '';
      this.load();
    });
  }

  load() {
    this.loading.set(true);
    const params: Record<string, string> = { page: String(this.page()), limit: String(this.limit) };
    if (this.filterStatus) params['status'] = this.filterStatus;
    this.api.get<ReturnsPage>('admin/returns', params).subscribe({
      next: res => {
        let list = res.returns;
        // If navigated from orders with ?orderId, auto-expand that return
        if (this.orderIdFilter) {
          const match = list.find(r => r.orderId === this.orderIdFilter);
          if (match) this.expandedId.set(match.id);
        }
        this.returns.set(list);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onFilterChange() { this.page.set(1); this.load(); }
  changePage(p: number) { this.page.set(p); this.load(); }

  toggleExpanded(row: AdminReturn) {
    this.expandedId.update(id => id === row.id ? null : row.id);
    this.rejectDialogId.set(null);
    this.refundDialogId.set(null);
  }

  statusColor(status: ReturnStatus): string {
    return STATUS_COLORS[status] ?? '#999';
  }

  reasonLabel(reason: string): string {
    return REASON_LABELS[reason] ?? reason;
  }

  hasExchange(row: AdminReturn): boolean {
    return row.items.some(i => i.exchangeSku);
  }

  getReturnItemForOrderItem(row: AdminReturn, orderItemId: string) {
    return row.items.find(i => i.orderItem.id === orderItemId) ?? null;
  }

  toggleRefundItem(itemId: string, checked: boolean) {
    this.refundItemSelection.update(sel => ({ ...sel, [itemId]: checked }));
  }

  computeRefundTotal(row: AdminReturn): number {
    const sel = this.refundItemSelection();
    return row.items
      .filter(i => sel[i.id] !== false)
      .reduce((sum, i) => sum + (+i.orderItem.priceAtPurchase * i.quantity), 0);
  }

  parseBankDetails(raw?: string): Record<string, string> | null {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  openLightbox(row: AdminReturn, index: number) {
    this.lightboxReturn.set(row);
    this.lightboxIndex.set(index);
  }

  closeLightbox() { this.lightboxReturn.set(null); }
  lightboxPrev() { this.lightboxIndex.update(i => Math.max(0, i - 1)); }
  lightboxNext() { this.lightboxIndex.update(i => Math.min(this.lightboxReturn()!.photoUrls.length - 1, i + 1)); }

  private updateRow(updated: AdminReturn) {
    this.returns.update(list => list.map(r => r.id === updated.id ? { ...r, ...updated } : r));
  }

  approve(row: AdminReturn) {
    this.acting.set(row.id);
    this.api.patch<AdminReturn>(`admin/returns/${row.id}/approve`, {}).subscribe({
      next: updated => { this.updateRow(updated); this.acting.set(null); this.snackBar.open('Return approved', 'OK', { duration: 3000 }); },
      error: err => { this.acting.set(null); this.snackBar.open(err?.error?.error?.message ?? 'Action failed', 'OK', { duration: 4000 }); },
    });
  }

  openRejectDialog(id: string) { this.rejectDialogId.set(id); this.rejectReason.set(''); }

  confirmReject(row: AdminReturn) {
    const reason = this.rejectReason().trim();
    if (!reason) return;
    this.acting.set(row.id);
    this.rejectDialogId.set(null);
    this.api.patch<AdminReturn>(`admin/returns/${row.id}/reject`, { reason }).subscribe({
      next: updated => { this.updateRow(updated); this.acting.set(null); this.snackBar.open('Return rejected', 'OK', { duration: 3000 }); },
      error: err => { this.acting.set(null); this.snackBar.open(err?.error?.error?.message ?? 'Action failed', 'OK', { duration: 4000 }); },
    });
  }

  schedulePickup(row: AdminReturn) {
    this.acting.set(row.id);
    this.api.post<AdminReturn>(`admin/returns/${row.id}/schedule-pickup`, {}).subscribe({
      next: updated => {
        this.updateRow(updated);
        this.acting.set(null);
        this.snackBar.open(`Pickup scheduled${updated.reverseAwb ? ' — AWB: ' + updated.reverseAwb : ''}`, 'OK', { duration: 4000 });
      },
      error: err => { this.acting.set(null); this.snackBar.open(err?.error?.error?.message ?? 'Failed', 'OK', { duration: 4000 }); },
    });
  }

  markReceived(row: AdminReturn) {
    this.acting.set(row.id);
    this.api.patch<AdminReturn>(`admin/returns/${row.id}/mark-received`, {}).subscribe({
      next: updated => { this.updateRow(updated); this.acting.set(null); this.snackBar.open('Marked received — stock restored, photos deleted', 'OK', { duration: 4000 }); },
      error: err => { this.acting.set(null); this.snackBar.open(err?.error?.error?.message ?? 'Action failed', 'OK', { duration: 4000 }); },
    });
  }

  markExchangeComplete(row: AdminReturn) {
    this.acting.set(row.id);
    this.api.patch<AdminReturn>(`admin/returns/${row.id}/exchange-complete`, {}).subscribe({
      next: updated => { this.updateRow(updated); this.acting.set(null); this.snackBar.open('Exchange complete — inventory balanced', 'OK', { duration: 3000 }); },
      error: err => { this.acting.set(null); this.snackBar.open(err?.error?.error?.message ?? 'Action failed', 'OK', { duration: 4000 }); },
    });
  }

  openRefundDialog(row: AdminReturn) {
    // Default: all items selected
    const defaults: Record<string, boolean> = {};
    row.items.forEach(i => defaults[i.id] = true);
    this.refundItemSelection.set(defaults);
    this.refundDialogId.set(row.id);
  }

  confirmRefund(row: AdminReturn) {
    const sel = this.refundItemSelection();
    const selectedIds = row.items.filter(i => sel[i.id] !== false).map(i => i.id);
    const body: Record<string, unknown> = {};
    // Only send returnItemIds if it's a partial selection
    if (selectedIds.length < row.items.length) {
      body['returnItemIds'] = selectedIds;
    }
    this.acting.set(row.id);
    this.refundDialogId.set(null);
    this.api.post<AdminReturn>(`admin/returns/${row.id}/refund`, body).subscribe({
      next: updated => { this.updateRow(updated); this.acting.set(null); this.snackBar.open('Refund processed', 'OK', { duration: 3000 }); },
      error: err => { this.acting.set(null); this.snackBar.open(err?.error?.error?.message ?? 'Refund failed', 'OK', { duration: 5000 }); },
    });
  }
}

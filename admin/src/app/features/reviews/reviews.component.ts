import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  verified: boolean;
  approved: boolean;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
  product: { id: string; title: string; slug: string };
}

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [
    CommonModule, DatePipe, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule, MatTabsModule,
    MatSnackBarModule, MatChipsModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <h1>Reviews</h1>
      <span class="header-count">{{ all().length }} total</span>
    </div>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else {
      <mat-tab-group>
        <mat-tab [label]="'Pending (' + pending().length + ')'">
          @if (pending().length === 0) {
            <p class="empty">No pending reviews. All caught up!</p>
          } @else {
            <table mat-table [dataSource]="pending()" class="reviews-table">
              <ng-container matColumnDef="product">
                <th mat-header-cell *matHeaderCellDef>Product</th>
                <td mat-cell *matCellDef="let r">
                  <a [routerLink]="['/products', r.product.id]" class="product-link">{{ r.product.title }}</a>
                </td>
              </ng-container>
              <ng-container matColumnDef="author">
                <th mat-header-cell *matHeaderCellDef>Author</th>
                <td mat-cell *matCellDef="let r">
                  <strong>{{ r.user.name || 'Anonymous' }}</strong><br>
                  <small class="muted">{{ r.user.email }}</small>
                </td>
              </ng-container>
              <ng-container matColumnDef="rating">
                <th mat-header-cell *matHeaderCellDef>Rating</th>
                <td mat-cell *matCellDef="let r">
                  <span class="stars">{{ '★'.repeat(r.rating) }}{{ '☆'.repeat(5 - r.rating) }}</span>
                  @if (r.verified) {
                    <span class="verified-chip" matTooltip="Verified Purchase">✓ Verified</span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="body">
                <th mat-header-cell *matHeaderCellDef>Review</th>
                <td mat-cell *matCellDef="let r" class="body-cell">
                  @if (r.title) { <strong>{{ r.title }}</strong><br> }
                  {{ r.body.length > 120 ? r.body.slice(0, 120) + '…' : r.body }}
                </td>
              </ng-container>
              <ng-container matColumnDef="submitted">
                <th mat-header-cell *matHeaderCellDef>Submitted</th>
                <td mat-cell *matCellDef="let r">{{ r.createdAt | date:'d MMM y' }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let r">
                  <button mat-stroked-button color="primary" (click)="approve(r)" [disabled]="saving()">
                    <mat-icon>check</mat-icon> Approve
                  </button>
                  <button mat-icon-button color="warn" (click)="remove(r)" [disabled]="saving()" matTooltip="Delete">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols;"></tr>
            </table>
          }
        </mat-tab>

        <mat-tab [label]="'Approved (' + approved().length + ')'">
          @if (approved().length === 0) {
            <p class="empty">No approved reviews yet.</p>
          } @else {
            <table mat-table [dataSource]="approved()" class="reviews-table">
              <ng-container matColumnDef="product">
                <th mat-header-cell *matHeaderCellDef>Product</th>
                <td mat-cell *matCellDef="let r">
                  <a [routerLink]="['/products', r.product.id]" class="product-link">{{ r.product.title }}</a>
                </td>
              </ng-container>
              <ng-container matColumnDef="author">
                <th mat-header-cell *matHeaderCellDef>Author</th>
                <td mat-cell *matCellDef="let r">
                  <strong>{{ r.user.name || 'Anonymous' }}</strong><br>
                  <small class="muted">{{ r.user.email }}</small>
                </td>
              </ng-container>
              <ng-container matColumnDef="rating">
                <th mat-header-cell *matHeaderCellDef>Rating</th>
                <td mat-cell *matCellDef="let r">
                  <span class="stars">{{ '★'.repeat(r.rating) }}{{ '☆'.repeat(5 - r.rating) }}</span>
                  @if (r.verified) {
                    <span class="verified-chip" matTooltip="Verified Purchase">✓ Verified</span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="body">
                <th mat-header-cell *matHeaderCellDef>Review</th>
                <td mat-cell *matCellDef="let r" class="body-cell">
                  @if (r.title) { <strong>{{ r.title }}</strong><br> }
                  {{ r.body.length > 120 ? r.body.slice(0, 120) + '…' : r.body }}
                </td>
              </ng-container>
              <ng-container matColumnDef="submitted">
                <th mat-header-cell *matHeaderCellDef>Approved on</th>
                <td mat-cell *matCellDef="let r">{{ r.createdAt | date:'d MMM y' }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let r">
                  <button mat-icon-button color="warn" (click)="remove(r)" [disabled]="saving()" matTooltip="Delete">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols;"></tr>
            </table>
          }
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 24px; }
    .page-header h1 { margin: 0; font-size: 24px; }
    .header-count { color: #666; font-size: 14px; }
    .center { display: flex; justify-content: center; padding: 48px; }
    .empty { padding: 32px 16px; color: #888; font-style: italic; }
    .reviews-table { width: 100%; }
    .body-cell { max-width: 400px; font-size: 13px; color: #444; }
    .stars { color: #c9a84c; letter-spacing: 2px; }
    .muted { color: #888; }
    .verified-chip {
      display: inline-block; margin-left: 6px; padding: 1px 6px;
      font-size: 11px; background: #e8f5e9; color: #2e7d32;
      border-radius: 3px; font-weight: 500;
    }
    .product-link { color: inherit; text-decoration: none; font-weight: 500; }
    .product-link:hover { text-decoration: underline; }
    td button { margin-left: 4px; }
    mat-tab-group { margin-top: 8px; }
  `],
})
export class ReviewsComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly all = signal<AdminReview[]>([]);

  readonly cols = ['product', 'author', 'rating', 'body', 'submitted', 'actions'];

  readonly pending = () => this.all().filter(r => !r.approved);
  readonly approved = () => this.all().filter(r => r.approved);

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.api.get<AdminReview[]>('admin/reviews').subscribe({
      next: data => { this.all.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snack.open('Failed to load reviews', 'OK', { duration: 3000 }); },
    });
  }

  approve(r: AdminReview) {
    this.saving.set(true);
    this.api.patch<AdminReview>(`admin/reviews/${r.id}/approve`, {}).subscribe({
      next: updated => {
        this.all.update(list => list.map(item => item.id === updated.id ? updated : item));
        this.saving.set(false);
        this.snack.open('Review approved — now visible on storefront', 'OK', { duration: 3000 });
      },
      error: () => { this.saving.set(false); this.snack.open('Failed to approve', 'OK', { duration: 3000 }); },
    });
  }

  remove(r: AdminReview) {
    const name = r.user.name || r.user.email || 'this user';
    if (!confirm(`Delete review from ${name}?`)) return;
    this.saving.set(true);
    this.api.delete<void>(`admin/reviews/${r.id}`).subscribe({
      next: () => {
        this.all.update(list => list.filter(item => item.id !== r.id));
        this.saving.set(false);
        this.snack.open('Review deleted', 'OK', { duration: 3000 });
      },
      error: () => { this.saving.set(false); this.snack.open('Failed to delete', 'OK', { duration: 3000 }); },
    });
  }
}

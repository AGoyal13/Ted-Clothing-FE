import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule, MatTabChangeEvent } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';

interface Feedback {
  id: string;
  name: string;
  location: string;
  quote: string;
  rating: number;
  approved: boolean;
  approvedAt?: string;
  createdAt: string;
}

interface FeedbackPage {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: Feedback[];
}

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    MatTableModule, MatButtonModule, MatIconModule, MatTabsModule,
    MatSnackBarModule, MatChipsModule, MatProgressSpinnerModule,
    MatDialogModule, MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <h1>Feedback</h1>
      <span class="header-count">{{ pendingTotal() + approvedTotal() }} total</span>
    </div>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else {
      <mat-tab-group (selectedTabChange)="onTabChange($event)">

        <mat-tab [label]="'Pending (' + pendingTotal() + ')'">
          @if (pending().length === 0) {
            <p class="empty">No pending feedback. All caught up!</p>
          } @else {
            <table mat-table [dataSource]="pending()" class="feedback-table">
              <ng-container matColumnDef="author">
                <th mat-header-cell *matHeaderCellDef>Author</th>
                <td mat-cell *matCellDef="let f">
                  <strong>{{ f.name }}</strong><br>
                  <small class="muted">{{ f.location }}</small>
                </td>
              </ng-container>
              <ng-container matColumnDef="rating">
                <th mat-header-cell *matHeaderCellDef>Rating</th>
                <td mat-cell *matCellDef="let f">
                  <span class="stars">{{ '★'.repeat(f.rating) }}{{ '☆'.repeat(5 - f.rating) }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="quote">
                <th mat-header-cell *matHeaderCellDef>Quote</th>
                <td mat-cell *matCellDef="let f" class="quote-cell">
                  {{ f.quote.length > 120 ? f.quote.slice(0, 120) + '…' : f.quote }}
                </td>
              </ng-container>
              <ng-container matColumnDef="submitted">
                <th mat-header-cell *matHeaderCellDef>Submitted</th>
                <td mat-cell *matCellDef="let f">{{ f.createdAt | date:'d MMM y' }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let f">
                  <button mat-stroked-button color="primary" (click)="approve(f)" [disabled]="saving()">
                    <mat-icon>check</mat-icon> Approve
                  </button>
                  <button mat-icon-button color="warn" (click)="remove(f)" [disabled]="saving()" matTooltip="Delete">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols;"></tr>
            </table>
            @if (pendingTotalPages() > 1) {
              <div class="pagination">
                <button mat-button [disabled]="pendingPage() === 1" (click)="changePendingPage(pendingPage() - 1)">← Prev</button>
                <span class="page-info">Page {{ pendingPage() }} of {{ pendingTotalPages() }}</span>
                <button mat-button [disabled]="pendingPage() >= pendingTotalPages()" (click)="changePendingPage(pendingPage() + 1)">Next →</button>
              </div>
            }
          }
        </mat-tab>

        <mat-tab [label]="'Approved (' + approvedTotal() + ')'">
          @if (approved().length === 0) {
            <p class="empty">No approved feedback yet.</p>
          } @else {
            <table mat-table [dataSource]="approved()" class="feedback-table">
              <ng-container matColumnDef="author">
                <th mat-header-cell *matHeaderCellDef>Author</th>
                <td mat-cell *matCellDef="let f">
                  <strong>{{ f.name }}</strong><br>
                  <small class="muted">{{ f.location }}</small>
                </td>
              </ng-container>
              <ng-container matColumnDef="rating">
                <th mat-header-cell *matHeaderCellDef>Rating</th>
                <td mat-cell *matCellDef="let f">
                  <span class="stars">{{ '★'.repeat(f.rating) }}{{ '☆'.repeat(5 - f.rating) }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="quote">
                <th mat-header-cell *matHeaderCellDef>Quote</th>
                <td mat-cell *matCellDef="let f" class="quote-cell">
                  {{ f.quote.length > 120 ? f.quote.slice(0, 120) + '…' : f.quote }}
                </td>
              </ng-container>
              <ng-container matColumnDef="submitted">
                <th mat-header-cell *matHeaderCellDef>Approved on</th>
                <td mat-cell *matCellDef="let f">{{ (f.approvedAt ?? f.createdAt) | date:'d MMM y' }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let f">
                  <button mat-icon-button color="warn" (click)="remove(f)" [disabled]="saving()" matTooltip="Delete">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols;"></tr>
            </table>
            @if (approvedTotalPages() > 1) {
              <div class="pagination">
                <button mat-button [disabled]="approvedPage() === 1" (click)="changeApprovedPage(approvedPage() - 1)">← Prev</button>
                <span class="page-info">Page {{ approvedPage() }} of {{ approvedTotalPages() }}</span>
                <button mat-button [disabled]="approvedPage() >= approvedTotalPages()" (click)="changeApprovedPage(approvedPage() + 1)">Next →</button>
              </div>
            }
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
    .feedback-table { width: 100%; }
    .quote-cell { max-width: 400px; font-size: 13px; color: #444; }
    .stars { color: #c9a84c; letter-spacing: 2px; }
    .muted { color: #888; }
    td mat-icon-button, td button { margin-left: 4px; }
    mat-tab-group { margin-top: 8px; }
    .pagination { display: flex; align-items: center; gap: 1rem; padding: 1rem 0; }
    .page-info { font-size: 0.85rem; color: #666; }
  `],
})
export class FeedbackComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly pending = signal<Feedback[]>([]);
  readonly pendingTotal = signal(0);
  readonly pendingPage = signal(1);
  readonly pendingTotalPages = signal(1);

  readonly approved = signal<Feedback[]>([]);
  readonly approvedTotal = signal(0);
  readonly approvedPage = signal(1);
  readonly approvedTotalPages = signal(1);

  private approvedLoaded = false;

  readonly cols = ['author', 'rating', 'quote', 'submitted', 'actions'];
  private readonly limit = 25;

  ngOnInit() {
    this.loadPending();
  }

  onTabChange(event: MatTabChangeEvent) {
    if (event.index === 1 && !this.approvedLoaded) {
      this.loadApproved();
    }
  }

  private loadPending() {
    this.loading.set(true);
    this.api.get<FeedbackPage>('feedback/all', { status: 'pending', page: String(this.pendingPage()), limit: String(this.limit) }).subscribe({
      next: res => {
        this.pending.set(res.data);
        this.pendingTotal.set(res.total);
        this.pendingTotalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.snack.open('Failed to load feedback', 'OK', { duration: 3000 }); },
    });
  }

  private loadApproved() {
    this.api.get<FeedbackPage>('feedback/all', { status: 'approved', page: String(this.approvedPage()), limit: String(this.limit) }).subscribe({
      next: res => {
        this.approved.set(res.data);
        this.approvedTotal.set(res.total);
        this.approvedTotalPages.set(res.totalPages);
        this.approvedLoaded = true;
      },
      error: () => this.snack.open('Failed to load approved feedback', 'OK', { duration: 3000 }),
    });
  }

  changePendingPage(p: number) { this.pendingPage.set(p); this.loadPending(); }
  changeApprovedPage(p: number) { this.approvedPage.set(p); this.loadApproved(); }

  approve(f: Feedback) {
    this.saving.set(true);
    this.api.patch<Feedback>(`feedback/${f.id}/approve`, {}).subscribe({
      next: () => {
        this.pending.update(list => list.filter(item => item.id !== f.id));
        this.pendingTotal.update(n => n - 1);
        this.approvedTotal.update(n => n + 1);
        this.approvedLoaded = false;
        this.saving.set(false);
        this.snack.open('Feedback approved — now visible on storefront', 'OK', { duration: 3000 });
      },
      error: () => { this.saving.set(false); this.snack.open('Failed to approve', 'OK', { duration: 3000 }); },
    });
  }

  remove(f: Feedback) {
    if (!confirm(`Delete feedback from ${f.name}?`)) return;
    this.saving.set(true);
    this.api.delete<void>(`feedback/${f.id}`).subscribe({
      next: () => {
        if (f.approved) {
          this.approved.update(list => list.filter(item => item.id !== f.id));
          this.approvedTotal.update(n => n - 1);
        } else {
          this.pending.update(list => list.filter(item => item.id !== f.id));
          this.pendingTotal.update(n => n - 1);
        }
        this.saving.set(false);
        this.snack.open('Feedback deleted', 'OK', { duration: 3000 });
      },
      error: () => { this.saving.set(false); this.snack.open('Failed to delete', 'OK', { duration: 3000 }); },
    });
  }
}

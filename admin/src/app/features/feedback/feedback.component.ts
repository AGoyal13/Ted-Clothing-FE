import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';

interface Feedback {
  id: string;
  name: string;
  location: string;
  quote: string;
  rating: number;
  approved: boolean;
  createdAt: string;
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
      <span class="header-count">{{ all().length }} total</span>
    </div>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else {
      <mat-tab-group>
        <mat-tab [label]="'Pending (' + pending().length + ')'">
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
              <tr mat-header-row *matHeaderRowDef="pendingCols"></tr>
              <tr mat-row *matRowDef="let row; columns: pendingCols;"></tr>
            </table>
          }
        </mat-tab>

        <mat-tab [label]="'Approved (' + approved().length + ')'">
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
                <td mat-cell *matCellDef="let f">{{ f.createdAt | date:'d MMM y' }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let f">
                  <button mat-icon-button color="warn" (click)="remove(f)" [disabled]="saving()" matTooltip="Delete">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="pendingCols"></tr>
              <tr mat-row *matRowDef="let row; columns: pendingCols;"></tr>
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
    .feedback-table { width: 100%; }
    .quote-cell { max-width: 400px; font-size: 13px; color: #444; }
    .stars { color: #c9a84c; letter-spacing: 2px; }
    .muted { color: #888; }
    td mat-icon-button, td button { margin-left: 4px; }
    mat-tab-group { margin-top: 8px; }
  `],
})
export class FeedbackComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly all = signal<Feedback[]>([]);

  readonly pendingCols = ['author', 'rating', 'quote', 'submitted', 'actions'];

  readonly pending = () => this.all().filter(f => !f.approved);
  readonly approved = () => this.all().filter(f => f.approved);

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.api.get<Feedback[]>('feedback/all').subscribe({
      next: data => { this.all.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snack.open('Failed to load feedback', 'OK', { duration: 3000 }); },
    });
  }

  approve(f: Feedback) {
    this.saving.set(true);
    this.api.patch<Feedback>(`feedback/${f.id}/approve`, {}).subscribe({
      next: updated => {
        this.all.update(list => list.map(item => item.id === updated.id ? updated : item));
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
        this.all.update(list => list.filter(item => item.id !== f.id));
        this.saving.set(false);
        this.snack.open('Feedback deleted', 'OK', { duration: 3000 });
      },
      error: () => { this.saving.set(false); this.snack.open('Failed to delete', 'OK', { duration: 3000 }); },
    });
  }
}

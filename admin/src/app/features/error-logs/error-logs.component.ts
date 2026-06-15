import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ErrorLog {
  id: string;
  timestamp: string;
  origin: 'BACKEND' | 'STOREFRONT';
  source: string;
  message: string;
  stack: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  userId: string | null;
  userAgent: string | null;
  meta: unknown;
}

interface ErrorLogResponse {
  success: boolean;
  data: { total: number; page: number; pageSize: number; items: ErrorLog[] };
}

@Component({
  selector: 'app-error-logs',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, DatePipe,
    MatCardModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatChipsModule,
  ],
  template: `
    <div class="page-wrap">
      <h2 class="page-title">Error Logs</h2>
      <p class="subtitle">Critical-path errors (payment · order · auth · checkout). No external service.</p>

      <!-- Filters -->
      <mat-card class="filter-card">
        <form [formGroup]="filters" (ngSubmit)="load(1)" class="filter-row">
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Origin</mat-label>
            <mat-select formControlName="origin">
              <mat-option value="">All</mat-option>
              <mat-option value="BACKEND">Backend</mat-option>
              <mat-option value="STOREFRONT">Storefront</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Source contains</mat-label>
            <input matInput formControlName="source" placeholder="razorpay_verify" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>From</mat-label>
            <input matInput type="date" formControlName="from" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>To</mat-label>
            <input matInput type="date" formControlName="to" />
          </mat-form-field>
          <button mat-flat-button color="primary" type="submit">Filter</button>
          <button mat-button type="button" (click)="clearFilters()">Clear</button>
        </form>
      </mat-card>

      @if (loading()) {
        <div class="spinner-wrap"><mat-spinner diameter="40" /></div>
      } @else if (items().length === 0) {
        <mat-card><mat-card-content>
          <div class="empty"><mat-icon>check_circle</mat-icon><p>No errors logged.</p></div>
        </mat-card-content></mat-card>
      } @else {
        <mat-card>
          <mat-card-content>
            <p class="result-count">{{ total() }} total entries · page {{ page() }}</p>
            <div class="table-scroll">
              <table mat-table [dataSource]="items()" class="error-table">

                <ng-container matColumnDef="timestamp">
                  <th mat-header-cell *matHeaderCellDef>Time</th>
                  <td mat-cell *matCellDef="let r">{{ r.timestamp | date:'dd MMM yy, HH:mm:ss' }}</td>
                </ng-container>

                <ng-container matColumnDef="origin">
                  <th mat-header-cell *matHeaderCellDef>Origin</th>
                  <td mat-cell *matCellDef="let r">
                    <mat-chip [color]="r.origin === 'BACKEND' ? 'primary' : 'accent'" highlighted>{{ r.origin }}</mat-chip>
                  </td>
                </ng-container>

                <ng-container matColumnDef="source">
                  <th mat-header-cell *matHeaderCellDef>Source</th>
                  <td mat-cell *matCellDef="let r">{{ r.source }}</td>
                </ng-container>

                <ng-container matColumnDef="statusCode">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let r">{{ r.statusCode ?? '—' }}</td>
                </ng-container>

                <ng-container matColumnDef="message">
                  <th mat-header-cell *matHeaderCellDef>Message</th>
                  <td mat-cell *matCellDef="let r" class="msg-cell">{{ r.message }}</td>
                </ng-container>

                <ng-container matColumnDef="path">
                  <th mat-header-cell *matHeaderCellDef>Path</th>
                  <td mat-cell *matCellDef="let r">{{ r.method ? r.method + ' ' : '' }}{{ r.path ?? '—' }}</td>
                </ng-container>

                <ng-container matColumnDef="detail">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let r">
                    @if (r.stack || r.meta) {
                      <button mat-icon-button (click)="toggle(r.id)" [attr.aria-label]="'Toggle details'">
                        <mat-icon>{{ expanded() === r.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                      </button>
                    }
                  </td>
                </ng-container>

                <!-- Expandable stack/meta row -->
                <ng-container matColumnDef="expandedDetail">
                  <td mat-cell *matCellDef="let r" [attr.colspan]="cols.length">
                    @if (expanded() === r.id) {
                      <div class="detail-panel">
                        @if (r.userId) { <p><strong>User:</strong> {{ r.userId }}</p> }
                        @if (r.meta) { <p><strong>Meta:</strong> {{ r.meta | json }}</p> }
                        @if (r.stack) { <pre class="stack">{{ r.stack }}</pre> }
                      </div>
                    }
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="cols"></tr>
                <tr mat-row *matRowDef="let r; columns: cols;"></tr>
                <tr mat-row *matRowDef="let r; columns: ['expandedDetail'];" class="detail-row"></tr>
              </table>
            </div>

            <!-- Pagination -->
            <div class="pagination">
              <button mat-button [disabled]="page() <= 1" (click)="load(page() - 1)">
                <mat-icon>chevron_left</mat-icon> Prev
              </button>
              <span>Page {{ page() }} of {{ totalPages() }}</span>
              <button mat-button [disabled]="page() >= totalPages()" (click)="load(page() + 1)">
                Next <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .page-wrap { padding: 24px; max-width: 1400px; }
    .page-title { margin: 0 0 4px; font-size: 1.4rem; font-weight: 600; }
    .subtitle { margin: 0 0 16px; font-size: 0.85rem; color: #666; }
    .filter-card { margin-bottom: 16px; padding: 16px; }
    .filter-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .filter-field { flex: 1; min-width: 160px; }
    .spinner-wrap { display: flex; justify-content: center; padding: 48px; }
    .empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px; color: #888; }
    .empty mat-icon { font-size: 40px; height: 40px; width: 40px; color: #4caf50; }
    .result-count { margin: 0 0 8px; font-size: 0.85rem; color: #666; }
    .table-scroll { overflow-x: auto; }
    .error-table { width: 100%; }
    .msg-cell { max-width: 380px; font-size: 0.82rem; }
    .detail-row td { padding: 0; border: none; }
    .detail-panel { padding: 12px 16px; background: #fafafa; font-size: 0.8rem; }
    .detail-panel p { margin: 4px 0; }
    .stack { white-space: pre-wrap; word-break: break-word; font-family: monospace; font-size: 0.75rem; margin: 8px 0 0; color: #c0392b; }
    .pagination { display: flex; align-items: center; gap: 12px; justify-content: center; padding-top: 16px; }
  `],
})
export class ErrorLogsComponent implements OnInit {
  private http = inject(HttpClient);
  private fb   = inject(FormBuilder);

  items    = signal<ErrorLog[]>([]);
  total    = signal(0);
  page     = signal(1);
  loading  = signal(false);
  expanded = signal<string | null>(null);
  cols     = ['timestamp', 'origin', 'source', 'statusCode', 'message', 'path', 'detail'];

  totalPages = () => Math.max(1, Math.ceil(this.total() / 50));

  filters = this.fb.group({ origin: '', source: '', from: '', to: '' });

  ngOnInit() { this.load(1); }

  load(page: number) {
    this.loading.set(true);
    this.expanded.set(null);
    const { origin, source, from, to } = this.filters.value;
    const params: Record<string, string> = { page: String(page) };
    if (origin) params['origin'] = origin;
    if (source) params['source'] = source;
    if (from)   params['from']   = from;
    if (to)     params['to']     = to;

    this.http.get<ErrorLogResponse>(`${environment.apiUrl}/admin/error-logs`, { params }).subscribe({
      next: res => {
        this.items.set(res.data.items);
        this.total.set(res.data.total);
        this.page.set(res.data.page);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggle(id: string) {
    this.expanded.update(cur => (cur === id ? null : id));
  }

  clearFilters() {
    this.filters.reset({ origin: '', source: '', from: '', to: '' });
    this.load(1);
  }
}

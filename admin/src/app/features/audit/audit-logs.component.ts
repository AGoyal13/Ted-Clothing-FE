import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface AuditLog {
  id: string;
  timestamp: string;
  adminId: string | null;
  adminEmail: string | null;
  ip: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  before: unknown;
  after: unknown;
}

interface AuditResponse {
  success: boolean;
  data: { total: number; page: number; pageSize: number; items: AuditLog[] };
}

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, DatePipe,
    MatCardModule, MatTableModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatChipsModule,
  ],
  template: `
    <div class="page-wrap">
      <h2 class="page-title">Audit Log</h2>

      <!-- Filters -->
      <mat-card class="filter-card">
        <form [formGroup]="filters" (ngSubmit)="load(1)" class="filter-row">
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Action contains</mat-label>
            <input matInput formControlName="action" placeholder="auth.login" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Admin ID</mat-label>
            <input matInput formControlName="adminId" />
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
      } @else {
        <mat-card>
          <mat-card-content>
            <p class="result-count">{{ total() }} total entries · page {{ page() }}</p>
            <div class="table-scroll">
              <table mat-table [dataSource]="items()" class="audit-table">

                <ng-container matColumnDef="timestamp">
                  <th mat-header-cell *matHeaderCellDef>Time</th>
                  <td mat-cell *matCellDef="let r">{{ r.timestamp | date:'dd MMM yy, HH:mm:ss' }}</td>
                </ng-container>

                <ng-container matColumnDef="action">
                  <th mat-header-cell *matHeaderCellDef>Action</th>
                  <td mat-cell *matCellDef="let r">
                    <mat-chip [color]="chipColor(r.action)" highlighted>{{ r.action }}</mat-chip>
                  </td>
                </ng-container>

                <ng-container matColumnDef="adminEmail">
                  <th mat-header-cell *matHeaderCellDef>Admin</th>
                  <td mat-cell *matCellDef="let r">{{ r.adminEmail ?? '—' }}</td>
                </ng-container>

                <ng-container matColumnDef="ip">
                  <th mat-header-cell *matHeaderCellDef>IP</th>
                  <td mat-cell *matCellDef="let r">{{ r.ip }}</td>
                </ng-container>

                <ng-container matColumnDef="entity">
                  <th mat-header-cell *matHeaderCellDef>Entity</th>
                  <td mat-cell *matCellDef="let r">
                    {{ r.entityType ?? '' }}{{ r.entityId ? ' · ' + r.entityId.slice(0, 8) + '…' : '' }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="before">
                  <th mat-header-cell *matHeaderCellDef>Before → After</th>
                  <td mat-cell *matCellDef="let r" class="diff-cell">
                    @if (r.before || r.after) {
                      <span class="before">{{ r.before | json }}</span>
                      @if (r.after) { <span class="arrow">→</span> <span class="after">{{ r.after | json }}</span> }
                    }
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="cols"></tr>
                <tr mat-row *matRowDef="let r; columns: cols;"></tr>
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
    .page-title { margin: 0 0 16px; font-size: 1.4rem; font-weight: 600; }
    .filter-card { margin-bottom: 16px; padding: 16px; }
    .filter-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .filter-field { flex: 1; min-width: 160px; }
    .spinner-wrap { display: flex; justify-content: center; padding: 48px; }
    .result-count { margin: 0 0 8px; font-size: 0.85rem; color: #666; }
    .table-scroll { overflow-x: auto; }
    .audit-table { width: 100%; }
    .diff-cell { font-size: 0.78rem; font-family: monospace; max-width: 300px; }
    .before { color: #c0392b; }
    .after { color: #27ae60; }
    .arrow { margin: 0 4px; color: #999; }
    .pagination { display: flex; align-items: center; gap: 12px; justify-content: center; padding-top: 16px; }
  `],
})
export class AuditLogsComponent implements OnInit {
  private http = inject(HttpClient);
  private fb   = inject(FormBuilder);

  items   = signal<AuditLog[]>([]);
  total   = signal(0);
  page    = signal(1);
  loading = signal(false);
  cols    = ['timestamp', 'action', 'adminEmail', 'ip', 'entity', 'before'];

  totalPages = () => Math.max(1, Math.ceil(this.total() / 50));

  filters = this.fb.group({ action: '', adminId: '', from: '', to: '' });

  ngOnInit() { this.load(1); }

  load(page: number) {
    this.loading.set(true);
    const { action, adminId, from, to } = this.filters.value;
    const params: Record<string, string> = { page: String(page) };
    if (action)   params['action']  = action;
    if (adminId)  params['adminId'] = adminId;
    if (from)     params['from']    = from;
    if (to)       params['to']      = to;

    this.http.get<AuditResponse>(`${environment.apiUrl}/admin/audit-logs`, { params }).subscribe({
      next: res => {
        this.items.set(res.data.items);
        this.total.set(res.data.total);
        this.page.set(res.data.page);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  clearFilters() {
    this.filters.reset({ action: '', adminId: '', from: '', to: '' });
    this.load(1);
  }

  chipColor(action: string): string {
    if (action.includes('failed'))  return 'warn';
    if (action.startsWith('auth.')) return 'accent';
    return 'primary';
  }
}

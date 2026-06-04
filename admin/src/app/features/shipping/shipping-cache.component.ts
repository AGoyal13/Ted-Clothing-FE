import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';

interface CacheStats {
  generatedAt: string | null;
  fromPincode: string | null;
  total: number;
  serviceable: number;
}

@Component({
  selector: 'app-shipping-cache',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    MatButtonModule, MatIconModule, MatCardModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-header">
      <h1>ETD Cache</h1>
      <button mat-flat-button color="primary" (click)="refresh()" [disabled]="refreshing()">
        @if (refreshing()) { <mat-spinner diameter="18" style="display:inline-block" /> }
        @else { <mat-icon>sync</mat-icon> }
        Refresh Now
      </button>
    </div>

    <p class="subtitle">
      Pincode delivery-time data sourced from Shiprocket. Refreshes automatically every Sunday 8:30 PM UTC (Monday 2 AM IST).
      Click "Refresh Now" to trigger an immediate sync.
    </p>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else if (stats()) {
      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-value">{{ stats()!.total.toLocaleString() }}</div>
            <div class="stat-label">Total Pincodes Cached</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-value">{{ stats()!.serviceable.toLocaleString() }}</div>
            <div class="stat-label">Serviceable Pincodes</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-value">
              {{ stats()!.total > 0 ? ((stats()!.serviceable / stats()!.total) * 100).toFixed(1) + '%' : '—' }}
            </div>
            <div class="stat-label">Coverage</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-value">{{ stats()!.fromPincode ?? '—' }}</div>
            <div class="stat-label">Source Warehouse Pincode</div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="meta-card">
        <mat-card-content>
          <div class="meta-row">
            <span class="meta-label">Last Refreshed</span>
            <span class="meta-value">
              @if (stats()!.generatedAt) {
                {{ stats()!.generatedAt | date:'d MMM y, h:mm a' }}
              } @else {
                Never — click Refresh Now to populate
              }
            </span>
          </div>
        </mat-card-content>
      </mat-card>

      @if (!stats()!.generatedAt) {
        <div class="empty-note">
          <mat-icon>info_outline</mat-icon>
          No ETD data yet. Add your Shiprocket credentials to the environment, then click "Refresh Now".
        </div>
      }
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
    h1 { margin: 0; }
    .subtitle { color: #666; font-size: 0.85rem; margin-bottom: 2rem; line-height: 1.6; max-width: 600px; }
    .center { display: flex; justify-content: center; padding: 3rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { text-align: center; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #1a237e; line-height: 1.2; }
    .stat-label { font-size: 0.75rem; color: #666; margin-top: 4px; letter-spacing: 0.03em; }
    .meta-card { margin-bottom: 1rem; }
    .meta-row { display: flex; gap: 2rem; align-items: baseline; font-size: 0.88rem; }
    .meta-label { font-weight: 600; color: #555; min-width: 120px; }
    .meta-value { color: #333; }
    .empty-note {
      display: flex; align-items: center; gap: 0.5rem;
      color: #e65100; font-size: 0.85rem; padding: 1rem;
      background: #fff3e0; border-radius: 4px;
    }
  `],
})
export class ShippingCacheComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly stats = signal<CacheStats | null>(null);
  readonly loading = signal(false);
  readonly refreshing = signal(false);

  ngOnInit() { this.loadStats(); }

  loadStats() {
    this.loading.set(true);
    this.api.get<CacheStats>('shipping/cache/stats').subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  refresh() {
    this.refreshing.set(true);
    this.api.post<CacheStats>('shipping/cache/refresh', {}).subscribe({
      next: result => {
        this.refreshing.set(false);
        this.stats.set(result);
        this.snackBar.open('ETD cache refreshed successfully', 'OK', { duration: 4000 });
      },
      error: err => {
        this.refreshing.set(false);
        const msg = err?.error?.error?.message ?? 'Refresh failed — check Shiprocket credentials';
        this.snackBar.open(msg, 'OK', { duration: 6000 });
      },
    });
  }
}

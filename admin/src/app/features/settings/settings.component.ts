import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatCardModule,
  ],
  template: `
    <div class="page-header">
      <h1>Site Settings</h1>
    </div>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="40" /></div>
    } @else {
      <div class="settings-grid">
        <mat-card class="settings-card">
          <mat-card-header>
            <mat-card-title>Stats Banner</mat-card-title>
            <mat-card-subtitle>Displayed on the storefront home page</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="fields">
              <mat-form-field appearance="outline">
                <mat-label>Happy Clients (number)</mat-label>
                <input matInput type="number" [(ngModel)]="happyClients" placeholder="12000" />
                <mat-hint>Shown as "12K+" on storefront</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Satisfaction %</mat-label>
                <input matInput type="number" [(ngModel)]="satisfactionPct" placeholder="98" min="0" max="100" />
                <mat-hint>Shown as "98%" on storefront</mat-hint>
              </mat-form-field>
            </div>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-flat-button color="primary" (click)="saveStats()" [disabled]="savingStats()">
              {{ savingStats() ? 'Saving…' : 'Save Changes' }}
            </button>
          </mat-card-actions>
        </mat-card>

        <mat-card class="settings-card">
          <mat-card-header>
            <mat-card-title>Shipping</mat-card-title>
            <mat-card-subtitle>Controls cart shipping charges on the storefront</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="fields">
              <mat-form-field appearance="outline">
                <mat-label>Free Shipping Minimum (₹)</mat-label>
                <input matInput type="number" [(ngModel)]="freeShippingMin" placeholder="999" min="0" />
                <mat-hint>Orders at or above this amount get free shipping</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Shipping Charge (₹)</mat-label>
                <input matInput type="number" [(ngModel)]="shippingCharge" placeholder="99" min="0" />
                <mat-hint>Applied when order total is below the free shipping minimum</mat-hint>
              </mat-form-field>
            </div>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-flat-button color="primary" (click)="saveShipping()" [disabled]="savingShipping()">
              {{ savingShipping() ? 'Saving…' : 'Save Changes' }}
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { margin: 0; font-size: 24px; }
    .center { display: flex; justify-content: center; padding: 48px; }
    .settings-grid { display: flex; flex-direction: column; gap: 24px; max-width: 560px; }
    .settings-card { width: 100%; }
    .fields { display: flex; flex-direction: column; gap: 16px; padding: 16px 0; }
    mat-form-field { width: 100%; }
  `],
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly savingStats = signal(false);
  readonly savingShipping = signal(false);

  happyClients = 12000;
  satisfactionPct = 98;
  freeShippingMin = 999;
  shippingCharge = 99;

  ngOnInit() {
    this.api.get<Record<string, string>>('site-config').subscribe({
      next: cfg => {
        this.happyClients = parseInt(cfg['happy_clients'] ?? '12000', 10);
        this.satisfactionPct = parseInt(cfg['satisfaction_pct'] ?? '98', 10);
        this.freeShippingMin = parseInt(cfg['free_shipping_threshold'] ?? '999', 10);
        this.shippingCharge = parseInt(cfg['shipping_charge'] ?? '99', 10);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); },
    });
  }

  private validateStats(): string | null {
    if (!Number.isInteger(this.happyClients) || this.happyClients < 1)
      return 'Happy Clients must be a whole number of at least 1';
    if (!Number.isInteger(this.satisfactionPct) || this.satisfactionPct < 0 || this.satisfactionPct > 100)
      return 'Satisfaction % must be a whole number between 0 and 100';
    return null;
  }

  private validateShipping(): string | null {
    if (!Number.isInteger(this.freeShippingMin) || this.freeShippingMin < 1)
      return 'Free Shipping Minimum must be a whole number of at least ₹1';
    if (!Number.isInteger(this.shippingCharge) || this.shippingCharge < 0)
      return 'Shipping Charge must be 0 or greater';
    return null;
  }

  saveStats() {
    const error = this.validateStats();
    if (error) { this.snack.open(error, 'OK', { duration: 4000 }); return; }
    this.savingStats.set(true);
    this.api.patch<Record<string, string>>('site-config', {
      updates: {
        happy_clients: String(this.happyClients),
        satisfaction_pct: String(this.satisfactionPct),
      },
    }).subscribe({
      next: () => { this.savingStats.set(false); this.snack.open('Stats saved', 'OK', { duration: 3000 }); },
      error: (e) => { this.savingStats.set(false); this.snack.open(e?.error?.message ?? 'Failed to save', 'OK', { duration: 3000 }); },
    });
  }

  saveShipping() {
    const error = this.validateShipping();
    if (error) { this.snack.open(error, 'OK', { duration: 4000 }); return; }
    this.savingShipping.set(true);
    this.api.patch<Record<string, string>>('site-config', {
      updates: {
        free_shipping_threshold: String(this.freeShippingMin),
        shipping_charge: String(this.shippingCharge),
      },
    }).subscribe({
      next: () => { this.savingShipping.set(false); this.snack.open('Shipping saved', 'OK', { duration: 3000 }); },
      error: (e) => { this.savingShipping.set(false); this.snack.open(e?.error?.message ?? 'Failed to save', 'OK', { duration: 3000 }); },
    });
  }
}

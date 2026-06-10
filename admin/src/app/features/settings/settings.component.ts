import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatCardModule,
    MatIconModule, MatDividerModule, MatButtonToggleModule,
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

        <mat-card class="settings-card">
          <mat-card-header>
            <mat-card-title>Returns &amp; Exchanges</mat-card-title>
            <mat-card-subtitle>Controls return/exchange window and mode shown on storefront</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="fields">
              <mat-form-field appearance="outline">
                <mat-label>Return / Exchange Window (days)</mat-label>
                <input matInput type="number" [(ngModel)]="returnWindowDays" placeholder="2" min="0" max="30" />
                <mat-hint>Set to 0 to disable. Applies to both returns and exchanges.</mat-hint>
              </mat-form-field>
              <div class="toggle-row">
                <label class="toggle-label">Return &amp; Exchange Mode</label>
                <mat-button-toggle-group [(ngModel)]="returnMode" name="returnMode" class="return-mode-toggle">
                  <mat-button-toggle value="true">Returns only</mat-button-toggle>
                  <mat-button-toggle value="both">Customer chooses</mat-button-toggle>
                  <mat-button-toggle value="false">Exchanges only</mat-button-toggle>
                </mat-button-toggle-group>
                <span class="toggle-hint">
                  @if (returnMode === 'true') { Customers see "Return" only — no size swap option. }
                  @else if (returnMode === 'false') { Customers see "Exchange" only — must select a replacement size. }
                  @else { Customers pick Return or Exchange themselves at the start of the request form. }
                </span>
              </div>
            </div>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-flat-button color="primary" (click)="saveReturns()" [disabled]="savingReturns()">
              {{ savingReturns() ? 'Saving…' : 'Save Changes' }}
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- ── MFA Card ── -->
        <mat-card class="settings-card">
          <mat-card-header>
            <mat-card-title>Two-Factor Authentication</mat-card-title>
            <mat-card-subtitle>Adds a TOTP code requirement on every admin login</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>

            @if (mfaLoading()) {
              <div class="mfa-center"><mat-spinner diameter="32" /></div>
            }

            <!-- Enabled state -->
            @if (!mfaLoading() && mfaEnabled()) {
              <div class="mfa-status mfa-status--on">
                <mat-icon>verified_user</mat-icon>
                <span>2FA is active — your account is protected</span>
              </div>
              <button mat-stroked-button color="warn" class="mfa-btn" (click)="disableMfa()" [disabled]="mfaSaving()">
                {{ mfaSaving() ? 'Disabling…' : 'Disable 2FA' }}
              </button>
            }

            <!-- Not set up -->
            @if (!mfaLoading() && !mfaEnabled() && mfaStep() === 'idle') {
              <div class="mfa-status mfa-status--off">
                <mat-icon>security</mat-icon>
                <span>2FA is not enabled</span>
              </div>
              <button mat-flat-button color="primary" class="mfa-btn" (click)="startMfaSetup()" [disabled]="mfaSaving()">
                Set Up 2FA
              </button>
            }

            <!-- Setup: QR + backup codes -->
            @if (mfaStep() === 'setup') {
              <p class="mfa-hint">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to confirm.</p>
              <div class="mfa-qr">
                <img [src]="mfaQr()" alt="MFA QR code" width="180" height="180" />
              </div>
              <p class="mfa-secret-label">Or enter manually:</p>
              <code class="mfa-secret">{{ mfaSecret() }}</code>
              <mat-divider class="mfa-divider" />
              <p class="mfa-backup-title">
                <mat-icon class="mfa-backup-icon">key</mat-icon>
                Save your backup codes — shown once only
              </p>
              <div class="mfa-backup-grid">
                @for (code of mfaBackupCodes(); track code) {
                  <code class="mfa-backup-code">{{ code }}</code>
                }
              </div>
              <mat-divider class="mfa-divider" />
              <mat-form-field appearance="outline" class="mfa-code-field">
                <mat-label>Enter code from app to activate</mat-label>
                <input matInput type="text" [(ngModel)]="mfaConfirmCode"
                  maxlength="6" inputmode="numeric" autocomplete="one-time-code"
                  placeholder="000000" />
              </mat-form-field>
              <div class="mfa-actions">
                <button mat-flat-button color="primary" (click)="confirmMfaSetup()"
                  [disabled]="mfaSaving() || mfaConfirmCode.length !== 6">
                  {{ mfaSaving() ? 'Verifying…' : 'Activate 2FA' }}
                </button>
                <button mat-button (click)="cancelMfaSetup()">Cancel</button>
              </div>
            }

          </mat-card-content>
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
    .toggle-row { display: flex; flex-direction: column; gap: 8px; }
    .toggle-label { font-size: 0.82rem; color: #555; font-weight: 500; }
    .return-mode-toggle { flex-wrap: wrap; }
    .toggle-hint { font-size: 0.78rem; color: #888; line-height: 1.4; }
    mat-form-field { width: 100%; }

    .mfa-center { display: flex; justify-content: center; padding: 24px 0; }
    .mfa-status { display: flex; align-items: center; gap: 10px; padding: 12px 0; font-size: 15px; }
    .mfa-status--on { color: #2e7d32; }
    .mfa-status--off { color: #616161; }
    .mfa-btn { margin-bottom: 8px; }
    .mfa-hint { font-size: 13px; color: #555; margin: 12px 0; }
    .mfa-qr { display: flex; justify-content: center; margin: 12px 0; }
    .mfa-secret-label { font-size: 12px; color: #888; margin: 4px 0 2px; }
    .mfa-secret { display: block; background: #f5f5f5; padding: 8px 12px; border-radius: 4px;
                  font-size: 13px; letter-spacing: 2px; word-break: break-all; margin-bottom: 12px; }
    .mfa-divider { margin: 16px 0; }
    .mfa-backup-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
                        color: #333; margin: 0 0 10px; }
    .mfa-backup-icon { font-size: 18px; width: 18px; height: 18px; color: #b45309; }
    .mfa-backup-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 4px; }
    .mfa-backup-code { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 4px;
                       padding: 6px 4px; text-align: center; font-size: 12px; letter-spacing: 1px; }
    .mfa-code-field { width: 100%; margin-top: 8px; }
    .mfa-actions { display: flex; gap: 8px; margin-top: 4px; }
  `],
})
export class SettingsComponent implements OnInit {
  private api  = inject(ApiService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  readonly loading        = signal(true);
  readonly savingStats    = signal(false);
  readonly savingShipping = signal(false);
  readonly savingReturns  = signal(false);

  // MFA
  readonly mfaLoading  = signal(true);
  readonly mfaEnabled  = signal(false);
  readonly mfaSaving   = signal(false);
  readonly mfaStep     = signal<'idle' | 'setup'>('idle');
  readonly mfaQr       = signal('');
  readonly mfaSecret   = signal('');
  readonly mfaBackupCodes = signal<string[]>([]);
  mfaConfirmCode = '';

  happyClients = 12000;
  satisfactionPct = 98;
  freeShippingMin = 999;
  shippingCharge = 99;
  returnWindowDays = 2;
  returnMode: 'true' | 'false' | 'both' = 'true';

  ngOnInit() {
    this.auth.getMfaStatus().subscribe({
      next: res => { this.mfaEnabled.set(res.data.enabled); this.mfaLoading.set(false); },
      error: ()  => { this.mfaLoading.set(false); },
    });

    this.api.get<Record<string, string>>('site-config').subscribe({
      next: cfg => {
        this.happyClients = parseInt(cfg['happy_clients'] ?? '12000', 10);
        this.satisfactionPct = parseInt(cfg['satisfaction_pct'] ?? '98', 10);
        this.freeShippingMin = parseInt(cfg['free_shipping_threshold'] ?? '999', 10);
        this.shippingCharge = parseInt(cfg['shipping_charge'] ?? '99', 10);
        this.returnWindowDays = parseInt(cfg['return_window_days'] ?? '2', 10);
        const rv = cfg['return_enabled'];
        this.returnMode = (rv === 'false' || rv === 'both') ? rv : 'true';
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); },
    });
  }

  startMfaSetup() {
    this.mfaSaving.set(true);
    this.auth.setupMfa().subscribe({
      next: res => {
        this.mfaSaving.set(false);
        this.mfaQr.set(res.data.qrDataUrl);
        this.mfaSecret.set(res.data.secret);
        this.mfaBackupCodes.set(res.data.backupCodes);
        this.mfaStep.set('setup');
      },
      error: () => {
        this.mfaSaving.set(false);
        this.snack.open('Failed to start MFA setup', 'OK', { duration: 3000 });
      },
    });
  }

  confirmMfaSetup() {
    if (this.mfaConfirmCode.length !== 6) return;
    this.mfaSaving.set(true);
    this.auth.confirmMfa(this.mfaConfirmCode).subscribe({
      next: () => {
        this.mfaSaving.set(false);
        this.mfaEnabled.set(true);
        this.mfaStep.set('idle');
        this.mfaConfirmCode = '';
        this.mfaQr.set('');
        this.mfaSecret.set('');
        this.mfaBackupCodes.set([]);
        this.snack.open('2FA activated ✓', 'OK', { duration: 3000 });
      },
      error: (e) => {
        this.mfaSaving.set(false);
        this.snack.open(e?.error?.error?.message ?? 'Invalid code — try again', 'OK', { duration: 3000 });
      },
    });
  }

  cancelMfaSetup() {
    this.mfaStep.set('idle');
    this.mfaConfirmCode = '';
    this.mfaQr.set('');
    this.mfaSecret.set('');
    this.mfaBackupCodes.set([]);
  }

  disableMfa() {
    if (!confirm('Are you sure you want to disable 2FA? Your account will be less secure.')) return;
    this.mfaSaving.set(true);
    this.auth.disableMfa().subscribe({
      next: () => {
        this.mfaSaving.set(false);
        this.mfaEnabled.set(false);
        this.snack.open('2FA disabled', 'OK', { duration: 3000 });
      },
      error: () => {
        this.mfaSaving.set(false);
        this.snack.open('Failed to disable 2FA', 'OK', { duration: 3000 });
      },
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

  private validateReturns(): string | null {
    if (!Number.isInteger(this.returnWindowDays) || this.returnWindowDays < 0 || this.returnWindowDays > 30)
      return 'Return Window must be a whole number between 0 and 30';
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

  saveReturns() {
    const error = this.validateReturns();
    if (error) { this.snack.open(error, 'OK', { duration: 4000 }); return; }
    this.savingReturns.set(true);
    this.api.patch<Record<string, string>>('site-config', {
      updates: { return_window_days: String(this.returnWindowDays), return_enabled: this.returnMode },
    }).subscribe({
      next: () => { this.savingReturns.set(false); this.snack.open('Return policy saved', 'OK', { duration: 3000 }); },
      error: (e) => { this.savingReturns.set(false); this.snack.open(e?.error?.message ?? 'Failed to save', 'OK', { duration: 3000 }); },
    });
  }
}

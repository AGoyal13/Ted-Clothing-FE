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
          <button mat-flat-button color="primary" (click)="save()" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save Changes' }}
          </button>
        </mat-card-actions>
      </mat-card>
    }
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { margin: 0; font-size: 24px; }
    .center { display: flex; justify-content: center; padding: 48px; }
    .settings-card { max-width: 560px; }
    .fields { display: flex; flex-direction: column; gap: 16px; padding: 16px 0; }
    mat-form-field { width: 100%; }
  `],
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly saving = signal(false);

  happyClients = 12000;
  satisfactionPct = 98;

  ngOnInit() {
    this.api.get<Record<string, string>>('site-config').subscribe({
      next: cfg => {
        this.happyClients = parseInt(cfg['happy_clients'] ?? '12000', 10);
        this.satisfactionPct = parseInt(cfg['satisfaction_pct'] ?? '98', 10);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); },
    });
  }

  save() {
    this.saving.set(true);
    this.api.patch<Record<string, string>>('site-config', {
      updates: {
        happy_clients: String(this.happyClients),
        satisfaction_pct: String(this.satisfactionPct),
      },
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('Settings saved', 'OK', { duration: 3000 });
      },
      error: () => { this.saving.set(false); this.snack.open('Failed to save', 'OK', { duration: 3000 }); },
    });
  }
}

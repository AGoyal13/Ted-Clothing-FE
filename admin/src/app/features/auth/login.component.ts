import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

type Step = 'credentials' | 'mfa';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-page">
      <mat-card class="login-card">

        <!-- ── TOTP challenge (step 2) ── -->
        @if (step() === 'mfa') {
          <mat-card-header>
            <mat-card-title>Two-Factor Authentication</mat-card-title>
            <mat-card-subtitle>Enter the 6-digit code from your authenticator app</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="mfaForm" (ngSubmit)="submitMfa()" class="mfa-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Authenticator code</mat-label>
                <input matInput type="text" formControlName="code"
                  maxlength="10" inputmode="numeric" autocomplete="one-time-code"
                  placeholder="000000" />
                <mat-icon matPrefix>security</mat-icon>
                <mat-hint>Or enter a 10-character backup code</mat-hint>
              </mat-form-field>
              @if (error()) {
                <p class="error-msg">{{ error() }}</p>
              }
              <button mat-flat-button color="primary" class="full-width submit-btn"
                type="submit" [disabled]="loading()">
                @if (loading()) { <mat-spinner diameter="20" /> } @else { Verify }
              </button>
              <button mat-button class="full-width" type="button"
                (click)="step.set('credentials'); error.set('')">
                ← Back to sign in
              </button>
            </form>
          </mat-card-content>
        }

        <!-- ── Credentials (step 1) ── -->
        @if (step() === 'credentials') {
          <mat-card-header>
            <mat-card-title>Ted Clothing Admin</mat-card-title>
            <mat-card-subtitle>Sign in to continue</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="emailForm" (ngSubmit)="submitEmail()" class="credentials-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" autocomplete="email" />
                <mat-icon matPrefix>email</mat-icon>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Password</mat-label>
                <input matInput [type]="showPw() ? 'text' : 'password'"
                  formControlName="password" autocomplete="current-password" />
                <mat-icon matPrefix>lock</mat-icon>
                <button mat-icon-button matSuffix type="button" (click)="showPw.set(!showPw())">
                  <mat-icon>{{ showPw() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>
              @if (error()) {
                <p class="error-msg">{{ error() }}</p>
              }
              <button mat-flat-button color="primary" class="full-width submit-btn"
                type="submit" [disabled]="loading()">
                @if (loading()) { <mat-spinner diameter="20" /> } @else { Sign In }
              </button>
            </form>
          </mat-card-content>
        }

      </mat-card>
    </div>
  `,
  styles: [`
    .login-page { height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; padding: 16px; }
    .login-card { width: min(400px, 100%); padding: 8px; }
    mat-card-header { margin-bottom: 8px; }
    .credentials-form { padding-top: 8px; display: flex; flex-direction: column; }
    .mfa-form { padding-top: 20px; display: flex; flex-direction: column; gap: 4px; }
    .full-width { width: 100%; }
    .submit-btn { margin-top: 8px; height: 44px; }
    .error-msg { color: #f44336; font-size: 13px; margin: 0 0 8px; }
    mat-spinner { margin: auto; }
  `],
})
export class LoginComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  step    = signal<Step>('credentials');
  showPw  = signal(false);
  loading = signal(false);
  error   = signal('');

  private pendingMfaToken = '';

  emailForm = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  mfaForm = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(10)]],
  });

  submitEmail() {
    if (this.emailForm.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.emailForm.value;
    this.auth.login(email!, password!).subscribe({
      next: result => {
        this.loading.set(false);
        if (result.requiresMfa) {
          this.pendingMfaToken = result.mfaToken;
          this.step.set('mfa');
        } else if (result.user?.role !== 'ADMIN') {
          this.auth.logout();
          this.error.set('Access denied — admin accounts only');
        } else {
          this.router.navigate(['/']);
        }
      },
      error: err => {
        this.error.set(err?.error?.error?.message ?? 'Login failed');
        this.loading.set(false);
      },
    });
  }

  submitMfa() {
    if (this.mfaForm.invalid) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.verifyMfa(this.pendingMfaToken, this.mfaForm.value.code!).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        this.error.set(err?.error?.error?.message ?? 'Invalid code');
        this.loading.set(false);
      },
    });
  }
}

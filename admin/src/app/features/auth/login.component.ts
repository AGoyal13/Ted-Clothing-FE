import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTabsModule,
  ],
  template: `
    <div class="login-page">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Ted Clothing Admin</mat-card-title>
          <mat-card-subtitle>Sign in to continue</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <mat-tab-group animationDuration="0" (selectedIndexChange)="onTabChange()">

            <!-- ── Email + Password ── -->
            <mat-tab label="Email">
              <div class="tab-body">
                <form [formGroup]="emailForm" (ngSubmit)="submitEmail()">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Email</mat-label>
                    <input matInput type="email" formControlName="email" autocomplete="email" />
                    <mat-icon matPrefix>email</mat-icon>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Password</mat-label>
                    <input matInput [type]="showPw() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
                    <mat-icon matPrefix>lock</mat-icon>
                    <button mat-icon-button matSuffix type="button" (click)="showPw.set(!showPw())">
                      <mat-icon>{{ showPw() ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                  </mat-form-field>
                  @if (error()) {
                    <p class="error-msg">{{ error() }}</p>
                  }
                  <button mat-flat-button color="primary" class="full-width submit-btn" type="submit" [disabled]="loading()">
                    @if (loading()) { <mat-spinner diameter="20" /> } @else { Sign In }
                  </button>
                </form>
              </div>
            </mat-tab>

            <!-- ── Phone + OTP ── -->
            <mat-tab label="Phone (OTP)">
              <div class="tab-body">
                @if (!otpSent()) {
                  <form [formGroup]="phoneForm" (ngSubmit)="sendOtp()">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Mobile number</mat-label>
                      <input matInput type="tel" formControlName="phone" placeholder="9876543210" maxlength="10" />
                      <mat-icon matPrefix>phone</mat-icon>
                      <mat-hint>10-digit Indian mobile number</mat-hint>
                      @if (phoneForm.get('phone')?.touched && phoneForm.get('phone')?.hasError('pattern')) {
                        <mat-error>Enter a valid 10-digit mobile number</mat-error>
                      }
                    </mat-form-field>
                    @if (error()) {
                      <p class="error-msg">{{ error() }}</p>
                    }
                    <button mat-flat-button color="primary" class="full-width submit-btn" type="submit" [disabled]="loading()">
                      @if (loading()) { <mat-spinner diameter="20" /> } @else { Send OTP }
                    </button>
                  </form>
                } @else {
                  <form [formGroup]="otpForm" (ngSubmit)="verifyOtp()">
                    <p class="otp-hint">OTP sent to <strong>+91 {{ phoneForm.value.phone }}</strong></p>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Enter OTP</mat-label>
                      <input matInput type="text" formControlName="otp" maxlength="6" inputmode="numeric" autocomplete="one-time-code" />
                      <mat-icon matPrefix>pin</mat-icon>
                    </mat-form-field>
                    @if (error()) {
                      <p class="error-msg">{{ error() }}</p>
                    }
                    <button mat-flat-button color="primary" class="full-width submit-btn" type="submit" [disabled]="loading()">
                      @if (loading()) { <mat-spinner diameter="20" /> } @else { Verify & Sign In }
                    </button>
                    <button mat-button class="full-width" type="button" (click)="otpSent.set(false); error.set('')">
                      Change number
                    </button>
                  </form>
                }
              </div>
            </mat-tab>

          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-page { height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; padding: 16px; }
    .login-card { width: min(400px, 100%); padding: 8px; }
    mat-card-header { margin-bottom: 8px; }
    .tab-body { padding-top: 20px; }
    .full-width { width: 100%; }
    .submit-btn { margin-top: 8px; height: 44px; }
    .error-msg { color: #f44336; font-size: 13px; margin: 0 0 8px; }
    .otp-hint { font-size: 13px; color: #555; margin: 0 0 16px; }
    mat-spinner { margin: auto; }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  phoneForm = this.fb.group({
    phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
  });

  otpForm = this.fb.group({
    otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  showPw = signal(false);
  loading = signal(false);
  error = signal('');
  otpSent = signal(false);

  onTabChange() {
    this.error.set('');
    this.otpSent.set(false);
  }

  submitEmail() {
    if (this.emailForm.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.emailForm.value;
    this.auth.login(email!, password!).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'Login failed');
        this.loading.set(false);
      },
    });
  }

  sendOtp() {
    if (this.phoneForm.invalid) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.sendOtp(this.phoneForm.value.phone!).subscribe({
      next: () => {
        this.otpSent.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'Failed to send OTP');
        this.loading.set(false);
      },
    });
  }

  verifyOtp() {
    if (this.otpForm.invalid) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.verifyOtp(this.phoneForm.value.phone!, this.otpForm.value.otp!).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.error.set(err?.error?.error?.message ?? 'Invalid OTP');
        this.loading.set(false);
      },
    });
  }
}

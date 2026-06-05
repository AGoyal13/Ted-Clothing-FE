import {
  Component,
  inject,
  signal,
  HostListener,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';

type Tab = 'login' | 'register';
type LoginMethod = 'password' | 'otp';
type OtpStep = 'email' | 'verify';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss',
})
export class AuthModalComponent {
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);

  readonly tab = signal<Tab>('login');
  readonly loginMethod = signal<LoginMethod>('password');
  readonly otpStep = signal<OtpStep>('email');
  readonly loading = signal(false);
  readonly errorMsg = signal('');

  loginEmail = '';
  loginPassword = '';
  otpEmail = '';
  otpCode = '';
  regName = '';
  regEmail = '';
  regPhone = '';
  regPassword = '';
  regConfirm = '';

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
    this.errorMsg.set('');
    this.otpStep.set('email');
    this.otpEmail = '';
    this.otpCode = '';
  }

  close(): void {
    this.authService.closeModal();
  }

  submitLogin(): void {
    if (!this.loginEmail || !this.loginPassword) return;
    this.loading.set(true);
    this.errorMsg.set('');
    this.authService.login(this.loginEmail, this.loginPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.cartService.onLogin();
        this.close();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error?.message ?? err?.error?.message ?? 'Invalid credentials');
      },
    });
  }

  submitSendOtp(): void {
    if (!this.otpEmail) return;
    this.loading.set(true);
    this.errorMsg.set('');
    this.authService.sendOtp(this.otpEmail).subscribe({
      next: () => {
        this.loading.set(false);
        this.otpStep.set('verify');
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error?.message ?? err?.error?.message ?? 'Failed to send OTP');
      },
    });
  }

  submitVerifyOtp(): void {
    if (!this.otpEmail || !this.otpCode) return;
    this.loading.set(true);
    this.errorMsg.set('');
    this.authService.verifyOtp(this.otpEmail, this.otpCode).subscribe({
      next: () => {
        this.loading.set(false);
        this.cartService.onLogin();
        this.close();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error?.message ?? err?.error?.message ?? 'Invalid or expired OTP');
      },
    });
  }

  submitRegister(): void {
    if (!this.regEmail || !this.regPassword || !this.regConfirm) return;
    if (this.regPassword !== this.regConfirm) {
      this.errorMsg.set('Passwords do not match');
      return;
    }
    if (this.regPassword.length < 8) {
      this.errorMsg.set('Password must be at least 8 characters');
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');
    this.authService.register(this.regEmail, this.regPassword, this.regName || undefined, this.regPhone || undefined).subscribe({
      next: () => {
        this.loading.set(false);
        this.cartService.onLogin();
        this.close();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error?.message ?? err?.error?.message ?? 'Registration failed');
      },
    });
  }
}

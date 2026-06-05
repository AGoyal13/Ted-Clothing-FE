import {
  Component,
  inject,
  signal,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';

type Tab = 'login' | 'register';
type LoginMethod = 'password' | 'otp';
type OtpStep = 'email' | 'verify';
type ForgotStep = 'input' | 'otp' | 'password' | 'done';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss',
})
export class AuthModalComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);

  readonly tab = signal<Tab>('login');
  readonly loginMethod = signal<LoginMethod>('password');
  readonly otpStep = signal<OtpStep>('email');
  readonly forgotStep = signal<ForgotStep | null>(null);
  readonly loading = signal(false);
  readonly errorMsg = signal('');
  readonly otpCooldown    = signal(0);
  readonly forgotCooldown = signal(0);

  private otpTimer: ReturnType<typeof setInterval> | null = null;
  private forgotTimer: ReturnType<typeof setInterval> | null = null;

  loginEmail = '';
  loginPassword = '';
  otpEmail = '';
  otpCode = '';
  regName = '';
  regEmail = '';
  regPhone = '';
  regPassword = '';
  regConfirm = '';
  forgotEmail = '';
  forgotOtp = '';
  forgotNewPassword = '';
  forgotConfirmPassword = '';

  ngOnDestroy(): void {
    if (this.otpTimer) clearInterval(this.otpTimer);
    if (this.forgotTimer) clearInterval(this.forgotTimer);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
    this.forgotStep.set(null);
    this.errorMsg.set('');
    this.otpStep.set('email');
    this.otpEmail = '';
    this.otpCode = '';
    if (this.otpTimer) { clearInterval(this.otpTimer); this.otpTimer = null; }
    this.otpCooldown.set(0);
  }

  openForgot(): void {
    this.forgotStep.set('input');
    this.forgotEmail = this.loginEmail;
    this.errorMsg.set('');
  }

  closeForgot(): void {
    this.forgotStep.set(null);
    this.forgotOtp = '';
    this.forgotNewPassword = '';
    this.forgotConfirmPassword = '';
    this.errorMsg.set('');
    if (this.forgotTimer) { clearInterval(this.forgotTimer); this.forgotTimer = null; }
    this.forgotCooldown.set(0);
  }

  submitForgotEmail(): void {
    if (!this.forgotEmail) return;
    this.loading.set(true);
    this.errorMsg.set('');
    this.authService.forgotPassword(this.forgotEmail).subscribe({
      next: () => {
        this.loading.set(false);
        this.forgotStep.set('otp');
        this.startForgotCooldown();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error?.message ?? err?.error?.message ?? 'Failed to send OTP');
        this.startForgotCooldown();
      },
    });
  }

  private startForgotCooldown(): void {
    if (this.forgotTimer) clearInterval(this.forgotTimer);
    this.forgotCooldown.set(30);
    this.forgotTimer = setInterval(() => {
      this.forgotCooldown.update(n => {
        if (n <= 1) { clearInterval(this.forgotTimer!); this.forgotTimer = null; return 0; }
        return n - 1;
      });
    }, 1000);
  }

  submitForgotOtp(): void {
    if (!this.forgotOtp || this.forgotOtp.length !== 6) return;
    this.forgotStep.set('password');
    this.errorMsg.set('');
  }

  submitNewPassword(): void {
    if (!this.forgotNewPassword || !this.forgotConfirmPassword) return;
    if (this.forgotNewPassword !== this.forgotConfirmPassword) {
      this.errorMsg.set('Passwords do not match');
      return;
    }
    if (this.forgotNewPassword.length < 8) {
      this.errorMsg.set('Password must be at least 8 characters');
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');
    this.authService.resetPassword(this.forgotEmail, this.forgotOtp, this.forgotNewPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.forgotStep.set('done');
      },
      error: (err: any) => {
        this.loading.set(false);
        const msg = err?.error?.error?.message ?? err?.error?.message ?? 'Reset failed';
        // If OTP is now invalid (expired between steps), go back to OTP entry
        if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('expired')) {
          this.forgotStep.set('otp');
          this.forgotOtp = '';
        }
        this.errorMsg.set(msg);
      },
    });
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
        this.errorMsg.set(err?.error?.error?.message ?? err?.error?.message ?? err?.message ?? 'Invalid credentials');
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
        this.startOtpCooldown();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error?.message ?? err?.error?.message ?? 'Failed to send OTP');
        this.startOtpCooldown();
      },
    });
  }

  private startOtpCooldown(): void {
    if (this.otpTimer) clearInterval(this.otpTimer);
    this.otpCooldown.set(30);
    this.otpTimer = setInterval(() => {
      this.otpCooldown.update(n => {
        if (n <= 1) { clearInterval(this.otpTimer!); this.otpTimer = null; return 0; }
        return n - 1;
      });
    }, 1000);
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
        this.errorMsg.set(err?.error?.error?.message ?? err?.error?.message ?? err?.message ?? 'Invalid or expired OTP');
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

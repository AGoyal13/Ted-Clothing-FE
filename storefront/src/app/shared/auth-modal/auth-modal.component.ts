import {
  Component,
  inject,
  signal,
  HostListener,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

type Tab = 'login' | 'register';
type LoginMethod = 'email' | 'otp';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="overlay" (click)="close()">
      <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Sign in">

        <button class="modal__close" (click)="close()" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- Brand -->
        <div class="modal__brand">
          <span class="modal__brand-ted">TED</span>
          <span class="modal__brand-clothing">CLOTHING</span>
        </div>

        <!-- Tabs -->
        <div class="modal__tabs">
          <button
            class="modal__tab"
            [class.modal__tab--active]="tab() === 'login'"
            (click)="setTab('login')"
          >SIGN IN</button>
          <button
            class="modal__tab"
            [class.modal__tab--active]="tab() === 'register'"
            (click)="setTab('register')"
          >CREATE ACCOUNT</button>
        </div>

        <!-- Error -->
        @if (errorMsg()) {
          <p class="modal__error">{{ errorMsg() }}</p>
        }

        <!-- Login Form -->
        @if (tab() === 'login') {
          <div class="modal__method-switch">
            <button
              class="modal__method-btn"
              [class.active]="loginMethod() === 'email'"
              (click)="loginMethod.set('email')"
            >Email</button>
            <button
              class="modal__method-btn"
              [class.active]="loginMethod() === 'otp'"
              (click)="loginMethod.set('otp')"
            >Phone OTP</button>
          </div>

          @if (loginMethod() === 'email') {
            <form class="modal__form" (ngSubmit)="submitLogin()" #loginForm="ngForm">
              <div class="modal__field">
                <label class="modal__label" for="login-email">Email</label>
                <input
                  id="login-email"
                  class="modal__input"
                  type="email"
                  [(ngModel)]="loginEmail"
                  name="email"
                  placeholder="your@email.com"
                  required
                  autocomplete="email"
                />
              </div>
              <div class="modal__field">
                <label class="modal__label" for="login-password">Password</label>
                <input
                  id="login-password"
                  class="modal__input"
                  type="password"
                  [(ngModel)]="loginPassword"
                  name="password"
                  placeholder="••••••••"
                  required
                  autocomplete="current-password"
                />
              </div>
              <button class="modal__submit" type="submit" [disabled]="loading()">
                {{ loading() ? 'SIGNING IN…' : 'SIGN IN' }}
              </button>
            </form>
          }

          @if (loginMethod() === 'otp') {
            <form class="modal__form" (ngSubmit)="otpStep() === 'phone' ? submitSendOtp() : submitVerifyOtp()">
              <div class="modal__field">
                <label class="modal__label" for="otp-phone">Phone Number</label>
                <input
                  id="otp-phone"
                  class="modal__input"
                  type="tel"
                  [(ngModel)]="otpPhone"
                  name="phone"
                  placeholder="10-digit mobile number"
                  [disabled]="otpStep() === 'verify'"
                  required
                />
              </div>
              @if (otpStep() === 'verify') {
                <div class="modal__field">
                  <label class="modal__label" for="otp-code">OTP</label>
                  <input
                    id="otp-code"
                    class="modal__input"
                    type="text"
                    [(ngModel)]="otpCode"
                    name="otp"
                    placeholder="Enter 6-digit OTP"
                    maxlength="6"
                    required
                    autocomplete="one-time-code"
                  />
                </div>
              }
              <button class="modal__submit" type="submit" [disabled]="loading()">
                @if (loading()) { SENDING… }
                @else if (otpStep() === 'phone') { SEND OTP }
                @else { VERIFY OTP }
              </button>
              @if (otpStep() === 'verify') {
                <button type="button" class="modal__link-btn" (click)="otpStep.set('phone')">Change number</button>
              }
            </form>
          }
        }

        <!-- Register Form -->
        @if (tab() === 'register') {
          <form class="modal__form" (ngSubmit)="submitRegister()">
            <div class="modal__field">
              <label class="modal__label" for="reg-email">Email</label>
              <input
                id="reg-email"
                class="modal__input"
                type="email"
                [(ngModel)]="regEmail"
                name="email"
                placeholder="your@email.com"
                required
                autocomplete="email"
              />
            </div>
            <div class="modal__field">
              <label class="modal__label" for="reg-password">Password</label>
              <input
                id="reg-password"
                class="modal__input"
                type="password"
                [(ngModel)]="regPassword"
                name="password"
                placeholder="Min 8 characters"
                minlength="8"
                required
                autocomplete="new-password"
              />
            </div>
            <div class="modal__field">
              <label class="modal__label" for="reg-confirm">Confirm Password</label>
              <input
                id="reg-confirm"
                class="modal__input"
                type="password"
                [(ngModel)]="regConfirm"
                name="confirm"
                placeholder="••••••••"
                required
                autocomplete="new-password"
              />
            </div>
            <button class="modal__submit" type="submit" [disabled]="loading()">
              {{ loading() ? 'CREATING…' : 'CREATE ACCOUNT' }}
            </button>
          </form>
        }

        <!-- Footer switch -->
        <p class="modal__footer">
          @if (tab() === 'login') {
            New here?
            <button class="modal__link-btn" (click)="setTab('register')">Create an account</button>
          } @else {
            Already have an account?
            <button class="modal__link-btn" (click)="setTab('login')">Sign in</button>
          }
        </p>

      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(13, 13, 13, 0.75);
      backdrop-filter: blur(6px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal {
      background: #1a1714;
      border: 1px solid rgba(201, 168, 76, 0.18);
      width: 100%;
      max-width: 420px;
      padding: 2.5rem 2rem 2rem;
      position: relative;
      animation: slideUp 0.3s var(--ease-enter, cubic-bezier(0.22, 1, 0.36, 1));
      /* Pin dark-theme values so the modal always renders correctly regardless of active theme */
      --cream: #f5f0e8;
      --muted: rgba(245, 240, 232, 0.72);
      --bg: #0d0d0d;
      --gold: #c9a84c;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .modal__close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      color: var(--muted);
      transition: color 0.2s ease;
      padding: 4px;
      &:hover { color: var(--cream, #f5f0e8); }
    }

    .modal__brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1.75rem;
    }

    .modal__brand-ted {
      font-family: var(--font-display, 'Bebas Neue', sans-serif);
      font-size: 2rem;
      color: var(--gold, #c9a84c);
      letter-spacing: 0.05em;
      line-height: 1;
    }

    .modal__brand-clothing {
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 0.45rem;
      font-weight: 500;
      letter-spacing: 0.4em;
      color: var(--muted);
      text-transform: uppercase;
    }

    .modal__tabs {
      display: flex;
      border-bottom: 1px solid rgba(245, 240, 232, 0.08);
      margin-bottom: 1.5rem;
    }

    .modal__tab {
      flex: 1;
      padding: 0.625rem 0;
      font-family: var(--font-display, 'Bebas Neue', sans-serif);
      font-size: 0.85rem;
      letter-spacing: 0.15em;
      color: var(--muted);
      border-bottom: 2px solid transparent;
      transition: color 0.2s ease, border-color 0.2s ease;

      &.modal__tab--active {
        color: var(--gold, #c9a84c);
        border-bottom-color: var(--gold, #c9a84c);
      }

      &:hover:not(.modal__tab--active) {
        color: var(--cream, #f5f0e8);
      }
    }

    .modal__method-switch {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }

    .modal__method-btn {
      flex: 1;
      padding: 0.4rem 0;
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      border: 1px solid rgba(245, 240, 232, 0.1);
      color: var(--muted);
      transition: all 0.2s ease;

      &.active {
        border-color: var(--gold, #c9a84c);
        color: var(--gold, #c9a84c);
      }

      &:not(.active):hover {
        border-color: rgba(245, 240, 232, 0.2);
        color: var(--cream, #f5f0e8);
      }
    }

    .modal__error {
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 0.8rem;
      color: #f87171;
      background: rgba(248, 113, 113, 0.08);
      border: 1px solid rgba(248, 113, 113, 0.2);
      padding: 0.5rem 0.75rem;
      margin-bottom: 1rem;
    }

    .modal__form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .modal__field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .modal__label {
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 0.7rem;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .modal__input {
      background: rgba(245, 240, 232, 0.04);
      border: 1px solid rgba(245, 240, 232, 0.1);
      color: var(--cream, #f5f0e8);
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 0.9rem;
      padding: 0.625rem 0.75rem;
      width: 100%;
      transition: border-color 0.2s ease;
      outline: none;

      &::placeholder { color: rgba(245, 240, 232, 0.2); }

      &:focus { border-color: rgba(201, 168, 76, 0.5); }

      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }

    .modal__submit {
      margin-top: 0.25rem;
      padding: 0.75rem;
      background: var(--gold, #c9a84c);
      color: var(--bg, #0d0d0d);
      font-family: var(--font-display, 'Bebas Neue', sans-serif);
      font-size: 0.9rem;
      letter-spacing: 0.2em;
      width: 100%;
      transition: opacity 0.2s ease;

      &:disabled { opacity: 0.5; cursor: not-allowed; }
      &:not(:disabled):hover { opacity: 0.88; }
    }

    .modal__footer {
      margin-top: 1.5rem;
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 0.8rem;
      color: var(--muted);
      text-align: center;
    }

    .modal__link-btn {
      color: var(--gold, #c9a84c);
      font-size: inherit;
      font-family: inherit;
      text-decoration: underline;
      text-underline-offset: 2px;
      transition: opacity 0.2s ease;
      &:hover { opacity: 0.75; }
    }
  `],
})
export class AuthModalComponent {
  private readonly authService = inject(AuthService);

  readonly tab = signal<Tab>('login');
  readonly loginMethod = signal<LoginMethod>('email');
  readonly otpStep = signal<'phone' | 'verify'>('phone');
  readonly loading = signal(false);
  readonly errorMsg = signal('');

  loginEmail = '';
  loginPassword = '';
  otpPhone = '';
  otpCode = '';
  regEmail = '';
  regPassword = '';
  regConfirm = '';

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
    this.errorMsg.set('');
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
        this.close();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error ?? 'Invalid credentials');
      },
    });
  }

  submitSendOtp(): void {
    if (!this.otpPhone) return;
    this.loading.set(true);
    this.errorMsg.set('');
    this.authService.sendOtp(this.otpPhone).subscribe({
      next: () => {
        this.loading.set(false);
        this.otpStep.set('verify');
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error ?? 'Failed to send OTP');
      },
    });
  }

  submitVerifyOtp(): void {
    if (!this.otpPhone || !this.otpCode) return;
    this.loading.set(true);
    this.errorMsg.set('');
    this.authService.verifyOtp(this.otpPhone, this.otpCode).subscribe({
      next: () => {
        this.loading.set(false);
        this.close();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error ?? 'Invalid or expired OTP');
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
    this.authService.register(this.regEmail, this.regPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.close();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error ?? 'Registration failed');
      },
    });
  }
}

import { inject, Injectable, PLATFORM_ID, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthUser, AuthResponse } from '../models/auth.model';
import { ApiResponse } from '../models/product.model';
import { ApiService } from './api.service';

const USER_KEY = 'ted_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http       = inject(HttpClient);
  private readonly api        = inject(ApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser  = isPlatformBrowser(this.platformId);
  private readonly baseUrl    = environment.apiUrl;

  // Access token and CSRF token live in memory only.
  // Refresh token is in an HttpOnly cookie managed entirely by the browser.
  private readonly _token     = signal<string | null>(null);
  private readonly _csrfToken = signal<string | null>(null);

  readonly currentUser = signal<AuthUser | null>(this.loadStoredUser());
  readonly isLoggedIn  = computed(() => !!this.currentUser());
  readonly modalOpen   = signal(false);

  private loadStoredUser(): AuthUser | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw) as AuthUser;
      if (user.role === 'ADMIN') {
        sessionStorage.removeItem(USER_KEY);
        return null;
      }
      return user;
    } catch { return null; }
  }

  getToken(): string | null     { return this._token(); }
  getCsrfToken(): string | null { return this._csrfToken(); }

  openModal():  void { this.modalOpen.set(true);  }
  closeModal(): void { this.modalOpen.set(false); }

  // ── Auth flows ─────────────────────────────────────────────────────────────

  /**
   * Report only infra-level auth failures (network down / server 5xx). Expected
   * 4xx (wrong password, invalid/expired OTP, 401) are normal UX, not errors.
   * Rethrows so callers' existing error handling is unchanged.
   */
  private reportAuthError(source: string, err: any) {
    if (err?.status === 0 || err?.status >= 500) {
      this.api.reportClientError(
        source,
        err?.error?.error?.message ?? err?.message ?? 'Auth request failed',
        { statusCode: err?.status },
      );
    }
    return throwError(() => err);
  }

  register(email: string, password: string, name?: string, phone?: string) {
    return this.http
      .post<ApiResponse<AuthResponse>>(
        `${this.baseUrl}/auth/register`,
        { email, password, ...(name ? { name } : {}), ...(phone ? { phone } : {}) },
        { withCredentials: true },
      )
      .pipe(map(r => r.data), tap(d => this.persistSession(d)), catchError(e => this.reportAuthError('auth_register', e)));
  }

  login(email: string, password: string) {
    return this.http
      .post<ApiResponse<AuthResponse>>(
        `${this.baseUrl}/auth/login`,
        { email, password },
        { withCredentials: true },
      )
      .pipe(map(r => r.data), tap(d => this.persistSession(d)), catchError(e => this.reportAuthError('auth_login', e)));
  }

  verifyOtp(email: string, otp: string) {
    return this.http
      .post<ApiResponse<AuthResponse>>(
        `${this.baseUrl}/auth/verify-otp`,
        { email, otp },
        { withCredentials: true },
      )
      .pipe(map(r => r.data), tap(d => this.persistSession(d)), catchError(e => this.reportAuthError('auth_otp', e)));
  }

  sendOtp(email: string) {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/auth/send-otp`, { email })
      .pipe(catchError(e => this.reportAuthError('auth_otp', e)));
  }

  forgotPassword(email: string) {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/auth/forgot-password`, { email })
      .pipe(catchError(e => this.reportAuthError('auth_reset', e)));
  }

  resetPassword(email: string, otp: string, newPassword: string) {
    return this.http
      .post<ApiResponse<{ message: string }>>(
        `${this.baseUrl}/auth/reset-password`,
        { email, otp, newPassword },
        { withCredentials: true },
      )
      .pipe(map(r => r.data), catchError(e => this.reportAuthError('auth_reset', e)));
  }

  // ── Profile ────────────────────────────────────────────────────────────────

  sendProfileOtp(purpose: 'EMAIL' | 'PHONE', newValue: string) {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/auth/profile/send-otp`, { purpose, newValue });
  }

  updateProfile(data: { name?: string; purpose?: 'EMAIL' | 'PHONE'; newValue?: string; otp?: string }) {
    return this.http
      .patch<ApiResponse<AuthResponse>>(`${this.baseUrl}/auth/profile`, data, { withCredentials: true })
      .pipe(map(r => r.data), tap(d => this.persistSession(d)));
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.patch<ApiResponse<void>>(
      `${this.baseUrl}/auth/password`,
      { currentPassword, newPassword },
      { withCredentials: true },
    );
  }

  // ── Session lifecycle ──────────────────────────────────────────────────────

  /**
   * Called once on browser init (APP_INITIALIZER). Silently restores the
   * access token from the HttpOnly refresh token cookie. If the cookie is
   * missing or expired the user simply starts as logged out.
   */
  tryRefresh(): Promise<void> {
    if (!this.isBrowser) return Promise.resolve();

    return firstValueFrom(
      this.http
        .post<ApiResponse<AuthResponse>>(
          `${this.baseUrl}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        .pipe(
          map(r => r.data),
          tap(d => this.persistSession(d)),
          catchError(() => {
            // No cookie, expired, or server error — clear stale user display data
            if (this.isBrowser) sessionStorage.removeItem(USER_KEY);
            this.currentUser.set(null);
            return of(undefined);
          }),
          map(() => undefined),
        ),
    );
  }

  /**
   * Used by the interceptor to attempt a token refresh after a 401.
   * Returns an Observable<boolean> — true if a new access token was obtained.
   */
  silentRefresh(): Observable<boolean> {
    if (!this.isBrowser) return of(false);
    return this.http
      .post<ApiResponse<AuthResponse>>(
        `${this.baseUrl}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map(r => r.data),
        tap(d => this.persistSession(d)),
        map(() => true),
        catchError(() => of(false)),
      );
  }

  logout(): void {
    // Fire-and-forget: tell the server to invalidate the refresh token and
    // clear the cookie. Don't wait — clear the local state immediately.
    if (this.isBrowser) {
      this.http
        .post<void>(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true })
        .subscribe({ error: () => {} });
      sessionStorage.removeItem(USER_KEY);
    }
    this._token.set(null);
    this._csrfToken.set(null);
    this.currentUser.set(null);
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private persistSession(data: AuthResponse): void {
    if (data.user.role === 'ADMIN') {
      // Revoke the refresh token cookie immediately so the admin session doesn't linger.
      if (this.isBrowser) {
        this.http
          .post<void>(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true })
          .subscribe({ error: () => {} });
      }
      throw new Error('Admin accounts cannot access the storefront.');
    }
    this._token.set(data.accessToken);
    this._csrfToken.set(data.csrfToken ?? null);
    if (this.isBrowser) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
    this.currentUser.set(data.user);
  }
}

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
// map re-exported above for login/mfa flow
import { environment } from '../../../environments/environment';

export interface AdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
}

interface AuthResponse {
  success: boolean;
  data:
    | { accessToken: string; csrfToken?: string; user: AdminUser }
    | { requiresMfa: true; mfaToken: string };
}

const USER_KEY = 'admin_user';

export type LoginResult =
  | { requiresMfa: false; user: AdminUser }
  | { requiresMfa: true;  mfaToken: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  // Access token and CSRF token in memory only — never in localStorage
  private readonly _token     = signal<string | null>(null);
  private readonly _csrfToken = signal<string | null>(null);
  private readonly _user      = signal<AdminUser | null>(this.loadUser());

  readonly user$      = computed(() => this._user());
  readonly isLoggedIn = computed(() => !!this._user());

  getToken(): string | null     { return this._token(); }
  getCsrfToken(): string | null { return this._csrfToken(); }

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(
        `${environment.apiUrl}/auth/login`,
        { email, password },
        { withCredentials: true },
      )
      .pipe(
        map(res => {
          if ('requiresMfa' in res.data && res.data.requiresMfa) {
            return { requiresMfa: true as const, mfaToken: res.data.mfaToken };
          }
          const d = res.data as { accessToken: string; csrfToken?: string; user: AdminUser };
          this.storeSession(d);
          return { requiresMfa: false as const, user: d.user };
        }),
      );
  }

  verifyMfa(mfaToken: string, code: string) {
    return this.http
      .post<AuthResponse>(
        `${environment.apiUrl}/auth/mfa/verify`,
        { mfaToken, code },
        { withCredentials: true },
      )
      .pipe(
        tap(res => {
          if (!('requiresMfa' in res.data)) {
            this.storeSession(res.data as { accessToken: string; csrfToken?: string; user: AdminUser });
          }
        }),
      );
  }

  getMfaStatus() {
    return this.http.get<{ success: boolean; data: { enabled: boolean } }>(
      `${environment.apiUrl}/auth/mfa/status`,
    );
  }

  disableMfa() {
    return this.http.delete<void>(`${environment.apiUrl}/auth/mfa`);
  }

  setupMfa() {
    return this.http.post<{ success: boolean; data: { secret: string; qrDataUrl: string; backupCodes: string[] } }>(
      `${environment.apiUrl}/auth/mfa/setup`, {}, { withCredentials: true },
    );
  }

  confirmMfa(code: string) {
    return this.http.post<void>(`${environment.apiUrl}/auth/mfa/confirm`, { code }, { withCredentials: true });
  }

  sendOtp(phone: string) {
    return this.http.post(`${environment.apiUrl}/auth/send-otp`, { phone });
  }

  verifyOtp(phone: string, otp: string) {
    return this.http
      .post<AuthResponse>(
        `${environment.apiUrl}/auth/verify-otp`,
        { phone, otp },
        { withCredentials: true },
      )
      .pipe(tap(res => {
        if (!('requiresMfa' in res.data)) this.storeSession(res.data);
      }));
  }

  // ── Session lifecycle ──────────────────────────────────────────────────────

  /**
   * Called once on app init. Silently restores the access token from the
   * HttpOnly refresh token cookie. If the cookie is absent or expired the
   * admin simply sees the login page.
   */
  tryRefresh(): Promise<void> {
    return firstValueFrom(
      this.http
        .post<AuthResponse>(
          `${environment.apiUrl}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        .pipe(
          tap(res => {
            if (!('requiresMfa' in res.data)) this.storeSession(res.data);
          }),
          catchError(() => {
            sessionStorage.removeItem(USER_KEY);
            this._user.set(null);
            return of(undefined);
          }),
          map(() => undefined),
        ),
    );
  }

  /**
   * Used by the interceptor to attempt a token refresh after a 401.
   * Returns Observable<boolean> — true when a new access token was obtained.
   */
  silentRefresh(): Observable<boolean> {
    return this.http
      .post<AuthResponse>(
        `${environment.apiUrl}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(
        tap(res => {
          if (!('requiresMfa' in res.data)) this.storeSession(res.data);
        }),
        map(() => true),
        catchError(() => of(false)),
      );
  }

  logout() {
    this.http
      .post<void>(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe({ error: () => {} });
    sessionStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._csrfToken.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private storeSession(data: { accessToken: string; csrfToken?: string; user: AdminUser }) {
    this._token.set(data.accessToken);
    this._csrfToken.set(data.csrfToken ?? null);
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
    this._user.set(data.user);
  }

  private loadUser(): AdminUser | null {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AdminUser) : null;
    } catch { return null; }
  }
}

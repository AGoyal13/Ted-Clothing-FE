import { inject, Injectable, PLATFORM_ID, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthUser, AuthResponse } from '../models/auth.model';
import { ApiResponse } from '../models/product.model';

const TOKEN_KEY = 'ted_auth_token';
const USER_KEY  = 'ted_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http        = inject(HttpClient);
  private readonly platformId  = inject(PLATFORM_ID);
  private readonly isBrowser   = isPlatformBrowser(this.platformId);
  private readonly baseUrl     = environment.apiUrl;

  readonly currentUser = signal<AuthUser | null>(this.loadStoredUser());
  readonly isLoggedIn  = computed(() => !!this.currentUser());
  readonly modalOpen   = signal(false);

  private loadStoredUser(): AuthUser | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch { return null; }
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  openModal():  void { this.modalOpen.set(true);  }
  closeModal(): void { this.modalOpen.set(false); }

  register(email: string, password: string, name?: string, phone?: string) {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.baseUrl}/auth/register`, {
        email, password,
        ...(name  ? { name }  : {}),
        ...(phone ? { phone } : {}),
      })
      .pipe(map(r => r.data), tap(d => this.persistSession(d)));
  }

  login(email: string, password: string) {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.baseUrl}/auth/login`, { email, password })
      .pipe(map(r => r.data), tap(d => this.persistSession(d)));
  }

  verifyOtp(email: string, otp: string) {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.baseUrl}/auth/verify-otp`, { email, otp })
      .pipe(map(r => r.data), tap(d => this.persistSession(d)));
  }

  sendOtp(email: string) {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/auth/send-otp`, { email });
  }

  // ── Profile ────────────────────────────────────────────────────────────────

  sendProfileOtp(purpose: 'EMAIL' | 'PHONE', newValue: string) {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/auth/profile/send-otp`, { purpose, newValue });
  }

  updateProfile(data: { name?: string; purpose?: 'EMAIL' | 'PHONE'; newValue?: string; otp?: string }) {
    return this.http
      .patch<ApiResponse<AuthResponse>>(`${this.baseUrl}/auth/profile`, data)
      .pipe(map(r => r.data), tap(d => this.persistSession(d)));
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/auth/password`, { currentPassword, newPassword });
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    this.currentUser.set(null);
  }

  private persistSession(data: AuthResponse): void {
    if (this.isBrowser) {
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
    this.currentUser.set(data.user);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
}

interface AuthResponse {
  success: boolean;
  data: { accessToken: string; user: AdminUser };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user = new BehaviorSubject<AdminUser | null>(this.loadUser());
  user$ = this._user.asObservable();

  get isLoggedIn(): boolean {
    return !!localStorage.getItem('admin_token');
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((res) => this.storeSession(res.data)));
  }

  sendOtp(phone: string) {
    return this.http.post(`${environment.apiUrl}/auth/send-otp`, { phone });
  }

  verifyOtp(phone: string, otp: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/verify-otp`, { phone, otp })
      .pipe(tap((res) => this.storeSession(res.data)));
  }

  logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    this._user.next(null);
    this.router.navigate(['/login']);
  }

  private storeSession(data: { accessToken: string; user: AdminUser }) {
    localStorage.setItem('admin_token', data.accessToken);
    localStorage.setItem('admin_user', JSON.stringify(data.user));
    this._user.next(data.user);
  }

  private loadUser(): AdminUser | null {
    const raw = localStorage.getItem('admin_user');
    return raw ? JSON.parse(raw) : null;
  }
}

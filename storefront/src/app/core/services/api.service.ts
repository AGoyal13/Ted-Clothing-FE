import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models/product.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = environment.apiUrl;

  get<T>(path: string, params?: Record<string, string | number | boolean | string[]>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
          value.forEach((v) => { httpParams = httpParams.append(key, v); });
        } else {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http
      .get<ApiResponse<T>>(`${this.baseUrl}${path}`, { params: httpParams })
      .pipe(map(response => response.data));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(`${this.baseUrl}${path}`, body)
      .pipe(map(response => response.data));
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(`${this.baseUrl}${path}`, body)
      .pipe(map(response => response.data));
  }

  delete<T = void>(path: string): Observable<T> {
    return this.http
      .delete<ApiResponse<T>>(`${this.baseUrl}${path}`)
      .pipe(map(response => response.data));
  }

  uploadFiles<T>(path: string, formData: FormData): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(`${this.baseUrl}${path}`, formData)
      .pipe(map(response => response.data));
  }

  /**
   * Fire-and-forget critical-path error report (checkout / payment / auth).
   * Browser-only, never throws, never recurses — a reporting failure must not
   * surface to the user or trigger another report. Do NOT pass any PII in extra.
   */
  reportClientError(
    source: string,
    message: string,
    extra?: { stack?: string; statusCode?: number; meta?: Record<string, unknown> },
  ): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      this.http
        .post(`${this.baseUrl}/client-errors`, {
          source,
          message: String(message ?? '').slice(0, 2000),
          stack: extra?.stack?.slice(0, 10000),
          statusCode: extra?.statusCode,
          meta: extra?.meta,
        })
        .subscribe({ next: () => {}, error: () => {} });
    } catch {
      // never let error reporting throw
    }
  }
}

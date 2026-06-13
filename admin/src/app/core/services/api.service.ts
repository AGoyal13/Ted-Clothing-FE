import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: null | object;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  get<T>(path: string, params?: Record<string, string | number>) {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => httpParams = httpParams.set(k, String(v)));
    }
    httpParams = httpParams.set('_t', Date.now());
    return this.http
      .get<ApiResponse<T>>(`${this.base}/${path}`, { params: httpParams })
      .pipe(map((r) => r.data));
  }

  post<T>(path: string, body: unknown) {
    return this.http
      .post<ApiResponse<T>>(`${this.base}/${path}`, body)
      .pipe(map((r) => r.data));
  }

  patch<T>(path: string, body: unknown) {
    return this.http
      .patch<ApiResponse<T>>(`${this.base}/${path}`, body)
      .pipe(map((r) => r.data));
  }

  delete<T>(path: string) {
    return this.http
      .delete<ApiResponse<T>>(`${this.base}/${path}`)
      .pipe(map((r) => r.data));
  }

  uploadFiles<T>(path: string, formData: FormData) {
    return this.http
      .post<ApiResponse<T>>(`${this.base}/${path}`, formData)
      .pipe(map((r) => r.data));
  }
}

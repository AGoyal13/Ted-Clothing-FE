import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const isCookieEndpoint =
    req.url.includes('/auth/refresh') || req.url.includes('/auth/logout');
  const csrfToken = isCookieEndpoint ? authService.getCsrfToken() : null;

  let headers = req.headers;
  if (token)     headers = headers.set('Authorization', `Bearer ${token}`);
  if (csrfToken) headers = headers.set('X-CSRF-Token', csrfToken);

  const outReq = token || csrfToken ? req.clone({ headers }) : req;

  return next(outReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthEndpoint =
        req.url.includes('/auth/refresh') || req.url.includes('/auth/logout');

      if (err.status === 401 && authService.isLoggedIn() && !isAuthEndpoint) {
        return authService.silentRefresh().pipe(
          switchMap(refreshed => {
            if (refreshed) {
              const newToken = authService.getToken();
              const retryReq = newToken
                ? req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })
                : req;
              return next(retryReq);
            }
            authService.logout();
            return throwError(() => err);
          }),
          catchError(() => {
            authService.logout();
            return throwError(() => err);
          }),
        );
      }

      if (err.status === 401 && authService.isLoggedIn() && isAuthEndpoint) {
        authService.logout();
      }

      return throwError(() => err);
    }),
  );
};

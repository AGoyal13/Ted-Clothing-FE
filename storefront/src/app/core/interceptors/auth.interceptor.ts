import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

const SESSION_ID_KEY = 'ted_session_id';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return next(req);

  const authService = inject(AuthService);

  const outReq = attachHeaders(req, authService);

  return next(outReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Skip retry for the refresh and logout endpoints to avoid infinite loops
      const isAuthEndpoint =
        req.url.includes('/auth/refresh') || req.url.includes('/auth/logout');

      if (err.status === 401 && authService.isLoggedIn() && !isAuthEndpoint) {
        // Access token expired — try a silent refresh then replay the request once
        return authService.silentRefresh().pipe(
          switchMap(refreshed => {
            if (refreshed) {
              return next(attachHeaders(req, authService));
            }
            authService.logout();
            authService.openModal();
            return throwError(() => err);
          }),
          catchError(() => {
            authService.logout();
            authService.openModal();
            return throwError(() => err);
          }),
        );
      }

      if (err.status === 401 && authService.isLoggedIn() && isAuthEndpoint) {
        authService.logout();
        authService.openModal();
      }

      return throwError(() => err);
    }),
  );
};

function attachHeaders(req: any, authService: AuthService) {
  const token     = authService.getToken();
  const sessionId = localStorage.getItem(SESSION_ID_KEY);

  // Include X-CSRF-Token on cookie-bearing auth endpoints so the CsrfGuard
  // can validate it on all calls after the initial bootstrap. Profile and
  // password mutations are also guarded — they send withCredentials so the
  // refresh cookie travels with the request for CSRF derivation.
  const isCookieEndpoint =
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/logout') ||
    req.url.includes('/auth/profile') ||
    req.url.includes('/auth/password');
  const csrfToken = isCookieEndpoint ? authService.getCsrfToken() : null;

  let headers = req.headers;
  if (token)     headers = headers.set('Authorization', `Bearer ${token}`);
  if (sessionId) headers = headers.set('X-Session-ID', sessionId);
  if (csrfToken) headers = headers.set('X-CSRF-Token', csrfToken);

  return token || sessionId || csrfToken ? req.clone({ headers }) : req;
}

import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const TOKEN_KEY = 'ted_auth_token';
const SESSION_ID_KEY = 'ted_session_id';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return next(req);

  const authService = inject(AuthService);
  const token = localStorage.getItem(TOKEN_KEY);
  const sessionId = localStorage.getItem(SESSION_ID_KEY);

  let headers = req.headers;
  if (token) headers = headers.set('Authorization', `Bearer ${token}`);
  if (sessionId) headers = headers.set('X-Session-ID', sessionId);

  const outReq = (token || sessionId) ? req.clone({ headers }) : req;

  return next(outReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // 401 on an authenticated request means the JWT expired server-side while the user
      // still appears logged in locally. Clear the stale session and re-prompt login.
      if (err.status === 401 && authService.isLoggedIn()) {
        authService.logout();
        authService.openModal();
      }
      return throwError(() => err);
    }),
  );
};

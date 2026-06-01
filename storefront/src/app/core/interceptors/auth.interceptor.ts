import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'ted_auth_token';
const SESSION_ID_KEY = 'ted_session_id';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return next(req);

  const token = localStorage.getItem(TOKEN_KEY);
  const sessionId = localStorage.getItem(SESSION_ID_KEY);

  let headers = req.headers;
  if (token) headers = headers.set('Authorization', `Bearer ${token}`);
  if (sessionId) headers = headers.set('X-Session-ID', sessionId);

  if (token || sessionId) {
    return next(req.clone({ headers }));
  }
  return next(req);
};

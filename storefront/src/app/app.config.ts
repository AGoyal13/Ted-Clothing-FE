import {
  APP_INITIALIZER,
  ApplicationConfig,
  inject,
  PLATFORM_ID,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  provideClientHydration,
  withEventReplay,
  withIncrementalHydration,
} from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';
import { SiteConfigService } from './core/services/site-config.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideClientHydration(withEventReplay(), withIncrementalHydration()),
    provideAnimationsAsync(),
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const authService = inject(AuthService);
        const platformId  = inject(PLATFORM_ID);
        // Only attempt refresh in the browser — SSR has no cookie access
        return () => isPlatformBrowser(platformId) ? authService.tryRefresh() : Promise.resolve();
      },
      multi: true,
    },
    {
      // Load site-config during bootstrap (server + client) so the client reads
      // it from the HTTP transfer cache instead of re-fetching /site-config after
      // hydration. Runs on both platforms — no isPlatformBrowser guard.
      provide: APP_INITIALIZER,
      useFactory: () => {
        const siteConfig = inject(SiteConfigService);
        return () => firstValueFrom(siteConfig.load());
      },
      multi: true,
    },
  ],
};

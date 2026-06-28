import { inject, Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SiteConfigService {
  private readonly api = inject(ApiService);
  private readonly _config = signal<Record<string, string> | null>(null);

  /**
   * Fetch site-config once. Called from an APP_INITIALIZER (server + client) so
   * the request happens inside the bootstrap window — the server caches it into
   * the HTTP transfer state and the client reads it back from that cache instead
   * of issuing a duplicate /site-config XHR after hydration. Never rejects.
   */
  load(): Observable<Record<string, string>> {
    return this.api.get<Record<string, string>>('/site-config').pipe(
      tap(cfg => this._config.set(cfg)),
      catchError(() => {
        this._config.set({});
        return of({} as Record<string, string>);
      }),
    );
  }

  readonly returnWindowDays = computed(() => {
    const cfg = this._config();
    return cfg ? parseInt(cfg['return_window_days'] ?? '2', 10) : 2;
  });

  // Four states:
  //   'none'     — returns & exchanges disabled (return_enabled = 'none', or returnWindowDays = 0)
  //   'return'   — returns only (return_enabled = 'true')
  //   'exchange' — exchanges only (return_enabled = 'false')
  //   'both'     — customer chooses (return_enabled = 'both')
  readonly returnMode = computed((): 'return' | 'exchange' | 'both' | 'none' => {
    const cfg = this._config();
    if (!cfg) return 'return';
    const v = cfg['return_enabled'];
    if (v === 'none' || this.returnWindowDays() === 0) return 'none';
    if (v === 'false') return 'exchange';
    if (v === 'both') return 'both';
    return 'return';
  });

  /** Convenience: true when either returns or exchanges are available. */
  readonly returnsEnabled = computed(() => this.returnMode() !== 'none');
}

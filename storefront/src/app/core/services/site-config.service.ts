import { inject, Injectable, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SiteConfigService {
  private readonly api = inject(ApiService);

  private readonly _config = toSignal(
    this.api.get<Record<string, string>>('/site-config').pipe(
      catchError(() => of({} as Record<string, string>)),
    ),
    { initialValue: null },
  );

  readonly returnWindowDays = computed(() => {
    const cfg = this._config();
    return cfg ? parseInt(cfg['return_window_days'] ?? '2', 10) : 2;
  });

  // Four states:
  //   'none'     — returnWindowDays = 0 (admin disabled both via the window field)
  //   'return'   — returns only (return_enabled = 'true')
  //   'exchange' — exchanges only (return_enabled = 'false')
  //   'both'     — customer chooses (return_enabled = 'both')
  readonly returnMode = computed((): 'return' | 'exchange' | 'both' | 'none' => {
    const cfg = this._config();
    if (!cfg) return 'return';
    if (this.returnWindowDays() === 0) return 'none';
    const v = cfg['return_enabled'];
    if (v === 'false') return 'exchange';
    if (v === 'both') return 'both';
    return 'return';
  });
}

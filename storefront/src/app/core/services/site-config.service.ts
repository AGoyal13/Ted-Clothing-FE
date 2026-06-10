import { inject, Injectable, signal, computed } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SiteConfigService {
  private readonly api = inject(ApiService);

  private readonly _config = signal<Record<string, string> | null>(null);
  private _loaded = false;

  readonly returnWindowDays = computed(() => {
    const cfg = this._config();
    return cfg ? parseInt(cfg['return_window_days'] ?? '2', 10) : 2;
  });

  // Three-state: 'return' (returns only), 'exchange' (exchanges only), 'both' (customer picks)
  readonly returnMode = computed((): 'return' | 'exchange' | 'both' => {
    const cfg = this._config();
    if (!cfg) return 'return';
    const v = cfg['return_enabled'];
    if (v === 'false') return 'exchange';
    if (v === 'both') return 'both';
    return 'return';
  });

  // Kept for backward compat (return-policy page). True when returns are available.
  readonly returnEnabled = computed(() => this.returnMode() !== 'exchange');

  load(): void {
    if (this._loaded) return;
    this._loaded = true;
    this.api.get<Record<string, string>>('/site-config').subscribe({
      next: cfg => this._config.set(cfg),
      error: () => this._config.set({}),
    });
  }
}

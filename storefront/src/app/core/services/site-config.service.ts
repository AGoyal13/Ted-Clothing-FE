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

  load(): void {
    if (this._loaded) return;
    this._loaded = true;
    this.api.get<Record<string, string>>('site-config').subscribe({
      next: cfg => this._config.set(cfg),
      error: () => this._config.set({}),
    });
  }
}

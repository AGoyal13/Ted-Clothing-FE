import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, catchError, of, combineLatest } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ProductListResponse } from '../../../../core/models/product.model';

function formatClientCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)}K+`;
  return `${n}+`;
}

@Component({
  selector: 'app-stats-banner',
  standalone: true,
  templateUrl: './stats-banner.component.html',
  styleUrl: './stats-banner.component.scss',
})
export class StatsBannerComponent {
  private api = inject(ApiService);

  private productTotal = toSignal(
    this.api.get<ProductListResponse>('/products', { status: 'ACTIVE', limit: 1 }).pipe(
      map(res => res.total),
      catchError(() => of(null)),
    ),
    { initialValue: null },
  );

  private siteConfig = toSignal(
    this.api.get<Record<string, string>>('/site-config').pipe(
      catchError(() => of({} as Record<string, string>)),
    ),
    { initialValue: null },
  );

  readonly stats = computed(() => {
    const total = this.productTotal();
    const cfg = this.siteConfig();

    const uniquePieces = total !== null ? `${total}+` : '—';

    const happyClients = cfg?.['happy_clients']
      ? formatClientCount(parseInt(cfg['happy_clients'], 10))
      : '12K+';

    const satisfaction = cfg?.['satisfaction_pct']
      ? `${cfg['satisfaction_pct']}%`
      : '98%';

    return [
      { number: happyClients,  label: 'Happy Clients' },
      { number: uniquePieces,  label: 'Unique Pieces' },
      { number: satisfaction,  label: 'Satisfaction' },
    ];
  });
}

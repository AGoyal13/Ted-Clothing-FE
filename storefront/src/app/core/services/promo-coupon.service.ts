import { computed, inject, Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService } from './api.service';
import { CacheService } from './cache.service';
import { PublicCoupon } from '../models/promo-coupon.model';

const PUBLIC_COUPON_TTL = 5 * 60_000;

@Injectable({ providedIn: 'root' })
export class PromoCouponService {
  private readonly api = inject(ApiService);
  private readonly cache = inject(CacheService);

  private getPublicCoupons(): Observable<PublicCoupon[]> {
    return this.cache.get(
      'coupons:public',
      () => this.api.get<PublicCoupon[]>('/coupons/public'),
      PUBLIC_COUPON_TTL,
    );
  }

  // One shared fetch across marquee + PLP banner + PDP offer line.
  // null = still loading | [] = none/error
  readonly publicCoupons = toSignal(
    this.getPublicCoupons().pipe(catchError(() => of([] as PublicCoupon[]))),
    { initialValue: [] as PublicCoupon[] },
  );

  // Single-slot surfaces (PLP banner, PDP line) show the most recent public coupon.
  readonly topCoupon = computed<PublicCoupon | null>(() => this.publicCoupons()[0] ?? null);
}

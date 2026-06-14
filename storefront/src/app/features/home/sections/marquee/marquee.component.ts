import { Component, computed, inject } from '@angular/core';
import { PromoCouponService } from '../../../../core/services/promo-coupon.service';
import { formatCouponPromo } from '../../../../core/models/promo-coupon.model';

const SEP = '  ·  ';
const STATIC_LINES = [
  'FREE SHIPPING ON ORDERS ABOVE ₹999',
  'NEW ARRIVALS EVERY FRIDAY',
  'HANDCRAFTED IN INDIA',
  'EASY 30-DAY RETURNS',
];

@Component({
  selector: 'app-marquee',
  standalone: true,
  templateUrl: './marquee.component.html',
  styleUrl: './marquee.component.scss',
})
export class MarqueeComponent {
  private readonly promo = inject(PromoCouponService);

  // Admin-promoted coupons lead, then evergreen static lines (so the strip is never blank).
  private readonly items = computed(() => {
    const coupons = this.promo.publicCoupons().map(c => {
      const p = formatCouponPromo(c);
      return `USE CODE ${p.code} · ${p.headline} ${p.detail}`.toUpperCase();
    });
    return [...coupons, ...STATIC_LINES];
  });

  // Content is duplicated so the CSS -50% translate loops seamlessly.
  readonly track = computed(() => {
    const line = this.items().join(SEP);
    return line + SEP + line + SEP;
  });
}

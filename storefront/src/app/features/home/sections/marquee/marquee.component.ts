import { Component, computed, inject } from '@angular/core';
import { PromoCouponService } from '../../../../core/services/promo-coupon.service';
import { SiteConfigService } from '../../../../core/services/site-config.service';
import { formatCouponPromo } from '../../../../core/models/promo-coupon.model';

const SEP = '  ·  ';
const STATIC_LINES = [
  'FREE SHIPPING ON ORDERS ABOVE ₹999',
  'NEW ARRIVALS EVERY FRIDAY',
  'HANDCRAFTED IN INDIA',
];

@Component({
  selector: 'app-marquee',
  standalone: true,
  templateUrl: './marquee.component.html',
  styleUrl: './marquee.component.scss',
})
export class MarqueeComponent {
  private readonly promo = inject(PromoCouponService);
  private readonly siteConfig = inject(SiteConfigService);

  // Returns/exchange line reflects the configured mode; omitted entirely when disabled.
  private readonly returnsLine = computed(() => {
    const days = this.siteConfig.returnWindowDays();
    const prefix = days > 0 ? `EASY ${days}-DAY ` : 'EASY ';
    switch (this.siteConfig.returnMode()) {
      case 'return':   return `${prefix}RETURNS`;
      case 'exchange': return `${prefix}EXCHANGES`;
      case 'both':     return `${prefix}RETURNS & EXCHANGES`;
      default:         return null; // 'none' — disabled
    }
  });

  // Admin-promoted coupons lead, then evergreen static lines (so the strip is never blank).
  private readonly items = computed(() => {
    const coupons = this.promo.publicCoupons().map(c => {
      const p = formatCouponPromo(c);
      return `USE CODE ${p.code} · ${p.headline} ${p.detail}`.toUpperCase();
    });
    const rl = this.returnsLine();
    return [...coupons, ...STATIC_LINES, ...(rl ? [rl] : [])];
  });

  // Content is duplicated so the CSS -50% translate loops seamlessly.
  readonly track = computed(() => {
    const line = this.items().join(SEP);
    return line + SEP + line + SEP;
  });
}

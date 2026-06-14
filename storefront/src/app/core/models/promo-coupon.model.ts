import { formatINR } from './product.model';

export type CouponType = 'PERCENT' | 'FLAT';

// Curated shape from GET /coupons/public — no internal fields (id/usedCount/maxUses).
export interface PublicCoupon {
  code: string;
  type: CouponType;
  value: string;                 // Decimal serialized as string
  minOrderAmount: string | null;
  maxDiscountAmount: string | null;
  expiresAt: string | null;
}

export interface CouponPromoCopy {
  code: string;
  headline: string;   // e.g. "20% OFF up to ₹500"  /  "₹150 OFF"
  detail: string;     // e.g. "on orders over ₹1,000"  /  "sitewide"
}

// Pure: derive customer-facing copy from the coupon's own fields (admin sets no custom text).
export function formatCouponPromo(c: PublicCoupon): CouponPromoCopy {
  const value = Number(c.value);
  let headline: string;
  if (c.type === 'PERCENT') {
    headline = `${value}% OFF`;
    if (c.maxDiscountAmount != null) {
      headline += ` up to ${formatINR(Number(c.maxDiscountAmount))}`;
    }
  } else {
    headline = `${formatINR(value)} OFF`;
  }
  const detail = c.minOrderAmount != null
    ? `on orders over ${formatINR(Number(c.minOrderAmount))}`
    : 'sitewide';
  return { code: c.code, headline, detail };
}

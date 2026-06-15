import {
  Component,
  inject,
  signal,
  computed,
  effect,
  untracked,
  PLATFORM_ID,
  OnInit,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { CartService } from '../../core/services/cart.service';
import { AddressService } from '../../core/services/address.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { ApiService } from '../../core/services/api.service';
import { Address, AddressFormData } from '../../core/models/address.model';
import { CartItem } from '../../core/models/cart.model';
import { formatINR } from '../../core/models/product.model';
import { CouponValidation, RazorpayPaymentResponse, ShippingRate } from '../../core/models/order.model';
import { PromoCouponService } from '../../core/services/promo-coupon.service';
import { formatCouponPromo } from '../../core/models/promo-coupon.model';
import { environment } from '../../../environments/environment';

declare const Razorpay: any;

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly cartService = inject(CartService);
  private readonly addressService = inject(AddressService);
  private readonly authService = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly api = inject(ApiService);
  private readonly promoCoupons = inject(PromoCouponService);

  readonly items = this.cartService.items;
  readonly cartLoading = this.cartService.loading;
  readonly addresses = this.addressService.addresses;
  readonly addressLoading = this.addressService.loading;
  readonly currentUser = this.authService.currentUser;

  readonly selectedAddressId = signal<string | null>(null);
  readonly showAddForm = signal(false);
  readonly paymentMethod = signal<'PREPAID' | 'COD'>('PREPAID');

  readonly shippingRate = signal<ShippingRate | null>(null);
  readonly rateLoading = signal(false);

  private rateTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Auto-select default address once addresses load
    effect(() => {
      const list = this.addresses();
      if (list.length > 0 && this.selectedAddressId() === null) {
        const def = list.find(a => a.isDefault) ?? list[0];
        this.selectedAddressId.set(def.id);
      }
    });

    // Fetch real shipping rate when address or payment method changes
    effect(() => {
      const addrId = this.selectedAddressId();
      const cod = this.paymentMethod() === 'COD';
      const addrs = untracked(() => this.addresses());
      const addr = addrs.find(a => a.id === addrId);
      const pincode = addr?.pincode;

      if (!pincode || pincode.length !== 6) {
        this.shippingRate.set(null);
        return;
      }

      if (this.rateTimer) clearTimeout(this.rateTimer);
      this.rateTimer = setTimeout(() => {
        this.rateLoading.set(true);
        this.orderService.getShippingRate(pincode, cod).subscribe({
          next: rate => { this.shippingRate.set(rate); this.rateLoading.set(false); },
          error: () => this.rateLoading.set(false),
        });
      }, 300);
    });
  }

  readonly formError = signal<string | null>(null);
  readonly paying = signal(false);
  readonly savingAddress = signal(false);

  readonly subtotal = computed(() =>
    this.items().reduce((sum, i) => sum + i.price * i.quantity, 0),
  );

  // Product-level savings vs MRP (basePrice) — informational; already baked into subtotal
  readonly mrpSavings = computed(() =>
    this.items().reduce((sum, i) => sum + (i.basePrice - i.price) * i.quantity, 0),
  );

  // ── Coupon (Phase 9) ──────────────────────────────────────────────────────
  readonly couponCodeInput = signal('');
  readonly appliedCoupon = signal<CouponValidation | null>(null);
  readonly couponError = signal<string | null>(null);
  readonly couponLoading = signal(false);

  // Admin-promoted coupons offered as one-tap chips (shared one-fetch signal).
  readonly offers = computed(() =>
    this.promoCoupons.publicCoupons().map(c => ({ ...formatCouponPromo(c) })),
  );

  applyOffer(code: string) {
    this.couponCodeInput.set(code);
    this.applyCoupon();
  }

  // Cap at the current subtotal in case the cart changed after the coupon was applied;
  // the backend re-validates and is authoritative for the persisted total.
  readonly discount = computed(() => {
    const c = this.appliedCoupon();
    if (!c) return 0;
    return Math.min(c.discount, this.subtotal());
  });

  // Total savings shown under TOTAL: MRP discounts + coupon discount (when applied)
  readonly totalSavings = computed(() => this.mrpSavings() + this.discount());

  applyCoupon() {
    const code = this.couponCodeInput().trim();
    if (!code) return;
    this.couponError.set(null);
    this.couponLoading.set(true);
    this.orderService.validateCoupon(code, this.subtotal()).subscribe({
      next: res => {
        this.appliedCoupon.set(res);
        this.couponLoading.set(false);
      },
      error: (err: any) => {
        this.appliedCoupon.set(null);
        this.couponError.set(err?.error?.error?.message ?? 'This coupon code is not valid.');
        this.couponLoading.set(false);
      },
    });
  }

  removeCoupon() {
    this.appliedCoupon.set(null);
    this.couponCodeInput.set('');
    this.couponError.set(null);
  }

  // Use real Delhivery rate when available; fall back to SiteConfig cart charge while loading
  readonly liveShippingCharge = computed(() => {
    const rate = this.shippingRate();
    if (rate) return rate.charge;
    return this.cartService.shippingCharge(); // fallback while rate loads
  });
  readonly liveCodCharge = computed(() => this.shippingRate()?.codCharge ?? 0);
  readonly etdDays = computed(() => this.shippingRate()?.etdDays ?? null);
  readonly isServiceable = computed(() => this.shippingRate()?.serviceable ?? true);
  readonly isCod = computed(() => this.paymentMethod() === 'COD');

  readonly total = computed(() =>
    Math.max(0, this.subtotal() - this.discount()) +
    this.liveShippingCharge() +
    (this.isCod() ? this.liveCodCharge() : 0),
  );
  readonly isFreeShipping = computed(() => this.liveShippingCharge() === 0);

  readonly fmt = formatINR;

  readonly newAddress: AddressFormData = {
    name: '', phone: '', line1: '', line2: '', landmark: '',
    city: '', state: '', pincode: '', isDefault: false,
  };

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.authService.openModal();
      this.router.navigate(['/cart']);
      return;
    }
    this.addressService.load();
    this.cartService.loadCart();
  }

  selectAddress(id: string) {
    this.selectedAddressId.set(id);
    this.showAddForm.set(false);
  }

  toggleAddForm() {
    this.showAddForm.update(v => !v);
    if (this.showAddForm()) this.selectedAddressId.set(null);
  }

  onPincodeChange(pincode: string) {
    if (pincode.length !== 6) return;
    this.http.get<{ success: boolean; data: { city: string; state: string } }>(
      `${environment.apiUrl}/pincode/${pincode}`
    ).subscribe({
      next: res => {
        if (res.data?.city) this.newAddress.city = res.data.city;
        if (res.data?.state) this.newAddress.state = res.data.state;
      },
      error: () => {},
    });
  }

  saveAddress(form: NgForm) {
    if (form.invalid) { form.form.markAllAsTouched(); return; }
    this.savingAddress.set(true);
    this.addressService.create(this.newAddress).subscribe({
      next: (r: any) => {
        const addr: Address = r.data ?? r;
        this.savingAddress.set(false);
        this.showAddForm.set(false);
        this.selectedAddressId.set(addr.id);
        Object.assign(this.newAddress, {
          name: '', phone: '', line1: '', line2: '', landmark: '',
          city: '', state: '', pincode: '', isDefault: false,
        });
      },
      error: () => this.savingAddress.set(false),
    });
  }

  get selectedAddress(): Address | undefined {
    return this.addresses().find(a => a.id === this.selectedAddressId());
  }

  getImage(item: CartItem): string { return item.image ?? ''; }

  discountLabel(item: CartItem): string { return `${Math.round(item.discountPct)}% OFF`; }

  async pay() {
    const addressId = this.selectedAddressId();
    if (!addressId) { this.formError.set('Please select a delivery address.'); return; }
    if (this.items().length === 0) { this.formError.set('Your cart is empty.'); return; }
    if (!this.isServiceable()) { this.formError.set('Delivery is not available to this pincode.'); return; }
    this.formError.set(null);
    this.paying.set(true);

    if (this.isCod()) {
      this.placeCodOrder(addressId);
    } else {
      this.startRazorpayFlow(addressId);
    }
  }

  private placeCodOrder(addressId: string) {
    this.orderService.initiateCodOrder(
      addressId,
      this.liveShippingCharge(),
      this.liveCodCharge(),
      this.etdDays() ?? 0,
      this.appliedCoupon()?.code,
    ).subscribe({
      next: order => {
        this.paying.set(false);
        this.cartService.loadCart(); // clear local cart signals
        this.router.navigate(['/order-confirmed', order.id]);
      },
      error: (err: any) => {
        if (err?.status === 401) { this.paying.set(false); return; }
        if (err?.error?.error?.oosSkuIds) {
          this.formError.set('Some items are now out of stock. Please review your cart.');
          this.cartService.loadCart();
        } else {
          this.formError.set(err?.error?.error?.message ?? 'Failed to place order. Please try again.');
          if (this.shouldReport(err)) {
            this.api.reportClientError('cod_order', err?.error?.error?.message ?? 'COD order failed', { statusCode: err?.status });
          }
        }
        this.paying.set(false);
      },
    });
  }

  // Infra-level failures worth logging (network down / server 5xx); expected
  // 4xx (validation, OOS, 401) are normal UX, not errors.
  private shouldReport(err: any): boolean {
    return err?.status === 0 || err?.status >= 500;
  }

  private async startRazorpayFlow(addressId: string) {
    try {
      await this.loadRazorpayScript();
    } catch {
      this.formError.set('Could not load payment gateway. Please try again.');
      this.api.reportClientError('razorpay_script', 'Razorpay checkout script failed to load');
      this.paying.set(false);
      return;
    }

    this.orderService.initiateOrder(addressId, this.liveShippingCharge(), this.appliedCoupon()?.code).subscribe({
      next: data => {
        const user = this.currentUser();
        const rzp = new Razorpay({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          order_id: data.razorpayOrderId,
          name: 'Ted Clothing',
          description: 'Fashion Order',
          image: '',
          prefill: { name: user?.name ?? '', email: user?.email ?? '' },
          theme: { color: '#c9a84c' },
          modal: { backdropclose: false, escape: false, ondismiss: () => this.paying.set(false) },
          handler: (response: RazorpayPaymentResponse) => {
            this.onPaymentSuccess(addressId, response);
          },
        });
        rzp.on('payment.failed', (resp: any) => {
          this.formError.set('Payment failed. Please try again.');
          this.api.reportClientError('razorpay_payment_failed', resp?.error?.description ?? 'Razorpay payment.failed event', { meta: { code: resp?.error?.code, reason: resp?.error?.reason } });
          this.paying.set(false);
        });
        rzp.open();
      },
      error: (err: any) => {
        if (err?.status === 401) { this.paying.set(false); return; }
        if (err?.error?.error?.oosSkuIds) {
          this.formError.set('Some items in your cart are now out of stock. Please review your cart.');
          this.cartService.loadCart();
        } else {
          this.formError.set(err?.error?.error?.message ?? 'Failed to initiate payment. Please try again.');
          if (this.shouldReport(err)) {
            this.api.reportClientError('order_initiate', err?.error?.error?.message ?? 'Order initiate failed', { statusCode: err?.status });
          }
        }
        this.paying.set(false);
      },
    });
  }

  private onPaymentSuccess(addressId: string, payment: RazorpayPaymentResponse) {
    this.orderService.verifyPayment(addressId, payment, this.appliedCoupon()?.code).subscribe({
      next: order => {
        this.paying.set(false);
        this.router.navigate(['/order-confirmed', order.id]);
      },
      error: (err: any) => {
        // Money-critical: payment may have been captured but the order failed to
        // persist. Always report regardless of status (incl. 409 sold-out race).
        this.api.reportClientError(
          'razorpay_verify',
          err?.error?.error?.message ?? 'Payment verify / order creation failed',
          { statusCode: err?.status, meta: { razorpayOrderId: payment?.razorpay_order_id } },
        );
        if (err?.status === 401) { this.paying.set(false); return; }
        if (err?.status === 409) {
          this.formError.set(
            'An item sold out while your payment was processing. ' +
            'If your payment was charged, our team will reach out regarding a refund. ' +
            'Please review your cart below.'
          );
          this.cartService.loadCart();
        } else {
          this.formError.set('Payment received but order creation failed. Contact support.');
        }
        this.paying.set(false);
      },
    });
  }

  private loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isPlatformBrowser(this.platformId)) { reject(); return; }
      if (typeof Razorpay !== 'undefined') { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  }
}

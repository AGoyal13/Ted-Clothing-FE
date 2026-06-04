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
import { Address, AddressFormData } from '../../core/models/address.model';
import { CartItem } from '../../core/models/cart.model';
import { formatINR } from '../../core/models/product.model';
import { RazorpayPaymentResponse, ShippingRate } from '../../core/models/order.model';
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
    this.subtotal() + this.liveShippingCharge() + (this.isCod() ? this.liveCodCharge() : 0),
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
        }
        this.paying.set(false);
      },
    });
  }

  private async startRazorpayFlow(addressId: string) {
    try {
      await this.loadRazorpayScript();
    } catch {
      this.formError.set('Could not load payment gateway. Please try again.');
      this.paying.set(false);
      return;
    }

    this.orderService.initiateOrder(addressId, this.liveShippingCharge()).subscribe({
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
        rzp.on('payment.failed', () => {
          this.formError.set('Payment failed. Please try again.');
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
        }
        this.paying.set(false);
      },
    });
  }

  private onPaymentSuccess(addressId: string, payment: RazorpayPaymentResponse) {
    this.orderService.verifyPayment(addressId, payment).subscribe({
      next: order => {
        this.paying.set(false);
        this.router.navigate(['/order-confirmed', order.id]);
      },
      error: (err: any) => {
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

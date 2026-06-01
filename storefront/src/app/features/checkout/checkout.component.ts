import {
  Component,
  inject,
  signal,
  computed,
  effect,
  PLATFORM_ID,
  OnInit,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { CartService } from '../../core/services/cart.service';
import { AddressService } from '../../core/services/address.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { Address, AddressFormData } from '../../core/models/address.model';
import { CartItem } from '../../core/models/cart.model';
import { formatINR } from '../../core/models/product.model';
import { RazorpayPaymentResponse } from '../../core/models/order.model';

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

  constructor() {
    // Auto-select default address once addresses load
    effect(() => {
      const list = this.addresses();
      if (list.length > 0 && this.selectedAddressId() === null) {
        const def = list.find(a => a.isDefault) ?? list[0];
        this.selectedAddressId.set(def.id);
      }
    });
  }
  readonly formError = signal<string | null>(null);
  readonly paying = signal(false);
  readonly savingAddress = signal(false);

  readonly subtotal = computed(() =>
    this.items().reduce((sum, i) => sum + i.price * i.quantity, 0),
  );
  readonly shippingCharge = this.cartService.shippingCharge;
  readonly freeShippingThreshold = this.cartService.freeShippingThreshold;
  readonly total = computed(() => this.subtotal() + this.shippingCharge());
  readonly isFreeShipping = computed(() => this.subtotal() >= this.freeShippingThreshold());

  readonly fmt = formatINR;

  readonly newAddress: AddressFormData = {
    name: '',
    phone: '',
    line1: '',
    line2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
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
    fetch(`/api/v1/pincode/${pincode}`)
      .then(r => r.json())
      .then(r => {
        if (r.data?.city) this.newAddress.city = r.data.city;
        if (r.data?.state) this.newAddress.state = r.data.state;
      })
      .catch(() => {});
  }

  saveAddress(form: NgForm) {
    if (form.invalid) return;
    this.savingAddress.set(true);
    this.addressService.create(this.newAddress).subscribe({
      next: (r: any) => {
        const addr: Address = r.data ?? r;
        this.savingAddress.set(false);
        this.showAddForm.set(false);
        this.selectedAddressId.set(addr.id);
        // Reset form fields
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

  getImage(item: CartItem): string {
    return item.image ?? '';
  }

  async pay() {
    const addressId = this.selectedAddressId();
    if (!addressId) {
      this.formError.set('Please select a delivery address.');
      return;
    }
    if (this.items().length === 0) {
      this.formError.set('Your cart is empty.');
      return;
    }
    this.formError.set(null);
    this.paying.set(true);

    try {
      await this.loadRazorpayScript();
    } catch {
      this.formError.set('Could not load payment gateway. Please try again.');
      this.paying.set(false);
      return;
    }

    this.orderService.initiateOrder(addressId).subscribe({
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
          prefill: {
            name: user?.name ?? '',
            email: user?.email ?? '',
          },
          theme: { color: '#c9a84c' },
          modal: { backdropclose: false, escape: false },
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
        const msg = err?.error?.error?.message ?? 'Failed to initiate payment. Please try again.';
        if (err?.error?.error?.oosSkuIds) {
          this.formError.set('Some items in your cart are now out of stock. Please review your cart.');
          this.cartService.loadCart();
        } else {
          this.formError.set(msg);
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
      error: () => {
        this.formError.set('Payment received but order creation failed. Contact support.');
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

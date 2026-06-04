import { inject, Injectable, signal, computed, effect } from '@angular/core';
import { ApiService } from './api.service';
import { AddressService } from './address.service';
import { AuthService } from './auth.service';
import { CacheService } from './cache.service';

export interface EtdResult {
  minDays: number;
  maxDays: number;
  serviceable: boolean;
}

@Injectable({ providedIn: 'root' })
export class ShippingService {
  private readonly api = inject(ApiService);
  private readonly addressService = inject(AddressService);
  private readonly authService = inject(AuthService);
  private readonly cache = inject(CacheService);

  private readonly _etd = signal<EtdResult | null>(null);
  private readonly _etdLoading = signal(false);
  private lastFetchedPincode: string | null = null;

  readonly etd = this._etd.asReadonly();
  readonly etdLoading = this._etdLoading.asReadonly();

  readonly etdLabel = computed(() => {
    const e = this._etd();
    if (!e || !e.serviceable) return null;
    if (e.minDays === e.maxDays) return `Delivers in ${e.minDays} day${e.minDays === 1 ? '' : 's'}`;
    return `Delivers in ${e.minDays}–${e.maxDays} days`;
  });

  constructor() {
    effect(() => {
      if (!this.authService.isLoggedIn()) { this._etd.set(null); this.lastFetchedPincode = null; return; }
      const addrs = this.addressService.addresses();
      const def = addrs.find(a => a.isDefault) ?? addrs[0];
      if (!def?.pincode || def.pincode.length !== 6) return;
      if (def.pincode === this.lastFetchedPincode) return;
      this.fetchEtd(def.pincode);
    });
  }

  ensureAddresses() {
    if (this.authService.isLoggedIn() && !this.addressService.addresses().length) {
      this.addressService.load();
    }
  }

  private fetchEtd(pincode: string) {
    this.lastFetchedPincode = pincode;
    this._etdLoading.set(true);
    this.cache.get<EtdResult>(
      `etd:${pincode}`,
      () => this.api.get<EtdResult>(`/shipping/etd?pincode=${pincode}`),
      10 * 60 * 1000,
    ).subscribe({
      next: result => { this._etd.set(result); this._etdLoading.set(false); },
      error: () => { this._etdLoading.set(false); this.lastFetchedPincode = null; },
    });
  }
}

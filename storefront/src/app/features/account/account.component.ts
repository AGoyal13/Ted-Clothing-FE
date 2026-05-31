import { Component, computed, effect, HostListener, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AddressService } from '../../core/services/address.service';
import { ThemeSwitcherComponent } from '../../shared/theme-switcher/theme-switcher.component';
import { Address, AddressFormData } from '../../core/models/address.model';

type Tab = 'profile' | 'wishlist' | 'addresses' | 'preferences';
type FieldState = 'idle' | 'editing' | 'otp-sent' | 'saving';

function emptyForm(): AddressFormData {
  return { name: '', phone: '', line1: '', city: '', state: '', pincode: '', isDefault: false };
}

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, ThemeSwitcherComponent],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly wishlistService = inject(WishlistService);
  readonly addressService = inject(AddressService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly routeParams = toSignal(this.route.params, { initialValue: {} });
  readonly tab = signal<Tab>('profile');
  readonly navOpen = signal(false);

  constructor() {
    const validTabs = new Set<Tab>(['profile', 'wishlist', 'addresses', 'preferences']);
    effect(() => {
      const t = (this.routeParams() as Record<string, string>)['tab'] as Tab;
      this.tab.set(validTabs.has(t) ? t : 'profile');
    });
  }
  readonly tabLabel = computed(() => {
    const labels: Record<Tab, string> = {
      profile: 'Profile', wishlist: 'Wishlist',
      addresses: 'Addresses', preferences: 'Preferences',
    };
    return labels[this.tab()];
  });

  // ── Profile signals ───────────────────────────────────────────────────────
  readonly profileName = signal(this.authService.currentUser()?.name ?? '');
  readonly nameSaving  = signal(false);
  readonly nameMsg     = signal<string | null>(null);

  readonly emailState = signal<FieldState>('idle');
  readonly newEmail   = signal('');
  readonly emailOtp   = signal('');
  readonly emailMsg   = signal<string | null>(null);

  readonly phoneState = signal<FieldState>('idle');
  readonly newPhone   = signal('');
  readonly phoneOtp   = signal('');
  readonly phoneMsg   = signal<string | null>(null);

  readonly pwCurrent  = signal('');
  readonly pwNew      = signal('');
  readonly pwConfirm  = signal('');
  readonly pwSaving   = signal(false);
  readonly pwMsg      = signal<string | null>(null);
  readonly showPwModal = signal(false);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly form = signal<AddressFormData>(emptyForm());
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly pincodeStatus = signal<'idle' | 'loading' | 'resolved' | 'error'>('idle');

  private pincodeTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.addressService.load();
  }

  @HostListener('document:click')
  onDocClick(): void { this.navOpen.set(false); }

  setTab(t: Tab): void {
    this.router.navigate(['/account', t]);
    this.closeForm();
  }

  selectMobileTab(t: Tab): void {
    this.setTab(t);
    this.navOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/');
  }

  removeWishlist(productId: string, skuId: string): void {
    this.wishlistService.toggle(productId, skuId);
  }

  openAddForm(): void {
    this.editingId.set(null);
    this.form.set(emptyForm());
    this.formError.set('');
    this.pincodeStatus.set('idle');
    this.showForm.set(true);
  }

  openEditForm(addr: Address): void {
    this.editingId.set(addr.id);
    this.form.set({
      name: addr.name,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 ?? undefined,
      landmark: addr.landmark ?? undefined,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      isDefault: addr.isDefault,
    });
    this.formError.set('');
    this.pincodeStatus.set('resolved');
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.pincodeStatus.set('idle');
    if (this.pincodeTimer) { clearTimeout(this.pincodeTimer); this.pincodeTimer = null; }
  }

  onPincodeInput(value: string): void {
    this.form.update(f => ({ ...f, pincode: value }));
    if (this.pincodeTimer) { clearTimeout(this.pincodeTimer); this.pincodeTimer = null; }
    if (value.length < 6) {
      this.pincodeStatus.set('idle');
      this.form.update(f => ({ ...f, city: '', state: '' }));
      return;
    }
    this.pincodeStatus.set('loading');
    this.pincodeTimer = setTimeout(() => this.fetchLocation(value), 400);
  }

  private fetchLocation(pincode: string): void {
    this.http.get<{ success: boolean; data: { city: string; state: string } }>(`${this.apiUrl}/pincode/${pincode}`).subscribe({
      next: (res) => {
        this.form.update(f => ({ ...f, city: res.data.city, state: res.data.state }));
        this.pincodeStatus.set('resolved');
      },
      error: () => this.pincodeStatus.set('error'),
    });
  }

  // ── Profile methods ───────────────────────────────────────────────────────

  saveName(): void {
    if (!this.profileName().trim()) { this.nameMsg.set('Name cannot be empty'); return; }
    this.nameSaving.set(true);
    this.nameMsg.set(null);
    this.authService.updateProfile({ name: this.profileName() }).subscribe({
      next: () => { this.nameSaving.set(false); this.nameMsg.set('✓ Name updated'); },
      error: (e) => { this.nameSaving.set(false); this.nameMsg.set(e?.error?.error?.message ?? 'Failed to save'); },
    });
  }

  sendOtp(purpose: 'EMAIL' | 'PHONE'): void {
    const val = purpose === 'EMAIL' ? this.newEmail() : this.newPhone();
    const setState = purpose === 'EMAIL' ? this.emailState : this.phoneState;
    const setMsg   = purpose === 'EMAIL' ? this.emailMsg   : this.phoneMsg;
    setMsg.set(null);
    this.authService.sendProfileOtp(purpose, val).subscribe({
      next: () => setState.set('otp-sent'),
      error: (e) => setMsg.set(e?.error?.error?.message ?? 'Failed to send OTP'),
    });
  }

  verifyAndSave(purpose: 'EMAIL' | 'PHONE'): void {
    const val      = purpose === 'EMAIL' ? this.newEmail()   : this.newPhone();
    const otp      = purpose === 'EMAIL' ? this.emailOtp()   : this.phoneOtp();
    const setState = purpose === 'EMAIL' ? this.emailState   : this.phoneState;
    const setMsg   = purpose === 'EMAIL' ? this.emailMsg     : this.phoneMsg;
    setState.set('saving');
    this.authService.updateProfile({ purpose, newValue: val, otp }).subscribe({
      next: () => {
        setState.set('idle');
        setMsg.set(`✓ ${purpose === 'EMAIL' ? 'Email' : 'Phone'} updated`);
        if (purpose === 'EMAIL') { this.newEmail.set(''); this.emailOtp.set(''); }
        else { this.newPhone.set(''); this.phoneOtp.set(''); }
      },
      error: (e) => {
        setState.set('otp-sent');
        setMsg.set(e?.error?.error?.message ?? 'Invalid or expired OTP');
      },
    });
  }

  cancelField(field: 'email' | 'phone'): void {
    if (field === 'email') { this.emailState.set('idle'); this.newEmail.set(''); this.emailOtp.set(''); this.emailMsg.set(null); }
    else { this.phoneState.set('idle'); this.newPhone.set(''); this.phoneOtp.set(''); this.phoneMsg.set(null); }
  }

  closePwModal(): void {
    this.showPwModal.set(false);
    this.pwCurrent.set(''); this.pwNew.set(''); this.pwConfirm.set('');
    this.pwMsg.set(null);
  }

  changePassword(): void {
    if (!this.pwCurrent() || !this.pwNew() || !this.pwConfirm()) { this.pwMsg.set('All fields are required'); return; }
    if (this.pwNew().length < 8) { this.pwMsg.set('New password must be at least 8 characters'); return; }
    if (this.pwNew() !== this.pwConfirm()) { this.pwMsg.set('Passwords do not match'); return; }
    this.pwSaving.set(true);
    this.pwMsg.set(null);
    this.authService.changePassword(this.pwCurrent(), this.pwNew()).subscribe({
      next: () => {
        this.pwSaving.set(false);
        this.pwMsg.set('✓ Password updated');
        setTimeout(() => this.closePwModal(), 1200);
      },
      error: (e) => { this.pwSaving.set(false); this.pwMsg.set(e?.error?.error?.message ?? 'Failed to update password'); },
    });
  }

  ngOnDestroy(): void {
    if (this.pincodeTimer) clearTimeout(this.pincodeTimer);
  }

  submitAddress(): void {
    const f = this.form();
    if (!f.name || !f.phone || !f.line1 || !f.city || !f.state || !f.pincode) {
      this.formError.set('Please fill in all required fields.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');

    const payload = { ...f, line2: f.line2 || undefined, landmark: f.landmark || undefined } as AddressFormData;
    const id = this.editingId();
    const req$ = id
      ? this.addressService.update(id, payload)
      : this.addressService.create(payload);

    req$.subscribe({
      next: () => { this.saving.set(false); this.closeForm(); },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.error?.message ?? 'Something went wrong. Please try again.');
      },
    });
  }

  setDefault(id: string): void {
    this.addressService.setDefault(id).subscribe();
  }

  removeAddress(id: string): void {
    this.addressService.remove(id).subscribe();
  }
}

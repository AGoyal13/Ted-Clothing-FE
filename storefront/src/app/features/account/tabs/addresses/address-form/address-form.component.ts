import { Component, EventEmitter, inject, Input, OnDestroy, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { Address, AddressFormData } from '../../../../../core/models/address.model';
import { AddressService } from '../../../../../core/services/address.service';

function emptyForm(): AddressFormData {
  return { name: '', phone: '', line1: '', city: '', state: '', pincode: '', isDefault: false };
}

@Component({
  selector: 'app-address-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './address-form.component.html',
  styleUrl: './address-form.component.scss',
})
export class AddressFormComponent implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly addressService = inject(AddressService);

  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private _address: Address | null = null;

  @Input() set address(v: Address | null) {
    this._address = v;
    if (v) {
      this.form.set({
        name: v.name, phone: v.phone, line1: v.line1,
        line2: v.line2, landmark: v.landmark,
        city: v.city, state: v.state, pincode: v.pincode, isDefault: v.isDefault,
      });
      this.pincodeStatus.set('resolved');
    } else {
      this.form.set(emptyForm());
      this.pincodeStatus.set('idle');
    }
    this.formError.set('');
    if (this.pincodeTimer) { clearTimeout(this.pincodeTimer); this.pincodeTimer = null; }
  }

  get isEditing(): boolean { return this._address !== null; }

  readonly form = signal<AddressFormData>(emptyForm());
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly pincodeStatus = signal<'idle' | 'loading' | 'resolved' | 'error'>('idle');

  private pincodeTimer: ReturnType<typeof setTimeout> | null = null;

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

  submitAddress(): void {
    const f = this.form();
    if (!f.name || !f.phone || !f.line1 || !f.city || !f.state || !f.pincode) {
      this.formError.set('Please fill in all required fields.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    // Send null (not undefined) for emptied optional fields so editing an address can actually
    // CLEAR line2/landmark — `|| undefined` drops the key and the backend keeps the old value.
    const payload = { ...f, line2: f.line2 || null, landmark: f.landmark || null };
    const req$ = this._address
      ? this.addressService.update(this._address.id, payload)
      : this.addressService.create(payload);
    req$.subscribe({
      next: () => { this.saving.set(false); this.saved.emit(); },
      error: (err) => { this.saving.set(false); this.formError.set(err?.error?.error?.message ?? 'Something went wrong. Please try again.'); },
    });
  }

  ngOnDestroy(): void {
    if (this.pincodeTimer) clearTimeout(this.pincodeTimer);
  }
}

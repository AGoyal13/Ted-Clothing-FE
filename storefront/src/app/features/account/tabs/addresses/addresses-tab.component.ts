import { Component, inject, signal } from '@angular/core';
import { Address } from '../../../../core/models/address.model';
import { AddressService } from '../../../../core/services/address.service';
import { AddressFormComponent } from './address-form/address-form.component';

@Component({
  selector: 'app-addresses-tab',
  standalone: true,
  imports: [AddressFormComponent],
  templateUrl: './addresses-tab.component.html',
  styleUrl: './addresses-tab.component.scss',
})
export class AddressesTabComponent {
  readonly addressService = inject(AddressService);

  readonly showForm = signal(false);
  readonly editingAddress = signal<Address | null>(null);

  openAddForm(): void {
    this.editingAddress.set(null);
    this.showForm.set(true);
  }

  openEditForm(addr: Address): void {
    this.editingAddress.set(addr);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingAddress.set(null);
  }

  setDefault(id: string): void {
    this.addressService.setDefault(id).subscribe();
  }

  removeAddress(id: string): void {
    this.addressService.remove(id).subscribe();
  }
}

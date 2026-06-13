import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Address, AddressFormData } from '../models/address.model';
import { ApiResponse } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/addresses`;

  readonly addresses = signal<Address[]>([]);
  readonly loading = signal(false);

  load() {
    if (this.loading()) return;
    this.loading.set(true);
    this.http.get<ApiResponse<Address[]>>(this.baseUrl).subscribe({
      next: r => { this.addresses.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  create(data: AddressFormData) {
    return this.http.post<ApiResponse<Address>>(this.baseUrl, data).pipe(
      tap(r => {
        const newAddr = r.data;
        this.addresses.update(prev => {
          const list = newAddr.isDefault ? prev.map(a => ({ ...a, isDefault: false })) : prev;
          return [newAddr, ...list];
        });
      }),
    );
  }

  update(id: string, data: Partial<AddressFormData>) {
    return this.http.patch<ApiResponse<Address>>(`${this.baseUrl}/${id}`, data).pipe(
      tap(r => {
        const updated = r.data;
        this.addresses.update(prev => {
          let list = prev.map(a => a.id === id ? updated : a);
          if (updated.isDefault) list = list.map(a => a.id === id ? a : { ...a, isDefault: false });
          return list;
        });
      }),
    );
  }

  remove(id: string) {
    return this.http.delete(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        this.addresses.update(prev => {
          const filtered = prev.filter(a => a.id !== id);
          const hadDefault = prev.find(a => a.id === id)?.isDefault;
          if (hadDefault && filtered.length) filtered[0] = { ...filtered[0], isDefault: true };
          return filtered;
        });
      }),
    );
  }

  setDefault(id: string) {
    return this.http.patch<ApiResponse<Address>>(`${this.baseUrl}/${id}/default`, {}).pipe(
      tap(() => {
        this.addresses.update(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
      }),
    );
  }
}

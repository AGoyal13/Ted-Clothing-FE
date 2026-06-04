import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AddressService } from '../../core/services/address.service';

type Tab = 'profile' | 'orders' | 'wishlist' | 'addresses' | 'preferences';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly wishlistService = inject(WishlistService);
  readonly addressService = inject(AddressService);
  private readonly router = inject(Router);

  readonly navOpen = signal(false);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { requireSync: true },
  );

  readonly activeTab = computed<Tab>(() => {
    const parts = this.currentUrl().split('/');
    const last = parts[parts.length - 1].split('?')[0] as Tab;
    const valid = new Set<Tab>(['profile', 'orders', 'wishlist', 'addresses', 'preferences']);
    return valid.has(last) ? last : 'profile';
  });

  readonly tabLabel = computed(() => {
    const labels: Record<Tab, string> = {
      profile: 'Profile', orders: 'Orders', wishlist: 'Wishlist',
      addresses: 'Addresses', preferences: 'Preferences',
    };
    return labels[this.activeTab()];
  });

  ngOnInit(): void {
    this.addressService.load();
  }

  @HostListener('document:click')
  onDocClick(): void { this.navOpen.set(false); }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/');
  }
}

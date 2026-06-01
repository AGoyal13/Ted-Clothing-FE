import {
  Component,
  HostListener,
  inject,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  signal,
  computed,
  effect,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationStart } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, filter } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { CategoryService } from '../../core/services/category.service';
import { AddressService } from '../../core/services/address.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { MegaMenuComponent } from './mega-menu/mega-menu.component';
import { MobileDrawerComponent } from './mobile-drawer/mobile-drawer.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MegaMenuComponent, MobileDrawerComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);
  private readonly categoryService = inject(CategoryService);
  private readonly addressService = inject(AddressService);

  readonly defaultAddress = computed(() =>
    this.addressService.addresses().find(a => a.isDefault) ?? null
  );

  readonly scrolled = signal(false);
  readonly mobileOpen = signal(false);
  readonly activeMega = signal<string | null>(null);
  readonly cartCount = this.cartService.count;
  readonly wishlistCount = inject(WishlistService).count;

  private openTimer: ReturnType<typeof setTimeout> | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      if (this.authService.isLoggedIn()) this.addressService.load();
    });
  }

  readonly navTree = toSignal(
    this.categoryService.getNavTree().pipe(catchError(() => of([]))),
    { initialValue: [] }
  );

  onNavEnter(slug: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.closeTimer) { clearTimeout(this.closeTimer); this.closeTimer = null; }
    this.openTimer = setTimeout(() => this.activeMega.set(slug), 120);
  }

  onNavLeave(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.openTimer) { clearTimeout(this.openTimer); this.openTimer = null; }
    this.closeTimer = setTimeout(() => this.activeMega.set(null), 200);
  }

  onMegaEnter(): void {
    if (this.closeTimer) { clearTimeout(this.closeTimer); this.closeTimer = null; }
  }

  onMegaLeave(): void {
    this.closeTimer = setTimeout(() => this.activeMega.set(null), 200);
  }

  closeMega(): void {
    this.activeMega.set(null);
  }

  private scrollHandler = () => {
    this.scrolled.set(window.scrollY > 50);
    if (this.activeMega()) this.activeMega.set(null);
  };

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    this.router.events.pipe(filter(e => e instanceof NavigationStart)).subscribe(() => {
      this.activeMega.set(null);
      this.closeMobileMenu();
    });
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.removeEventListener('scroll', this.scrollHandler);
    if (this.openTimer) clearTimeout(this.openTimer);
    if (this.closeTimer) clearTimeout(this.closeTimer);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.activeMega.set(null);
    this.closeMobileMenu();
  }

  toggleMobileMenu(): void {
    this.mobileOpen.update(v => !v);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = this.mobileOpen() ? 'hidden' : '';
    }
  }

  closeMobileMenu(): void {
    this.mobileOpen.set(false);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  signOut(): void {
    this.authService.logout();
    this.closeMobileMenu();
  }
}

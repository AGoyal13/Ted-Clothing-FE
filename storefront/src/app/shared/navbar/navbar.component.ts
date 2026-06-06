import {
  Component,
  HostListener,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  PLATFORM_ID,
  signal,
  computed,
  effect,
  ViewChild,
  ElementRef,
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
export class NavbarComponent implements OnInit, AfterViewInit, OnDestroy {
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

  // Search overlay
  readonly searchOpen = signal(false);

  // Overflow nav
  @ViewChild('navEl') private navEl!: ElementRef<HTMLElement>;
  readonly visibleCount = signal<number>(100);
  readonly moreOpen = signal(false);
  readonly overflowItems = computed(() => this.navTree().slice(this.visibleCount()));

  private openTimer: ReturnType<typeof setTimeout> | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeObserver?: ResizeObserver;
  private recalcTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      if (this.authService.isLoggedIn()) this.addressService.load();
    });
    // Re-measure nav after navTree loads from API
    effect(() => {
      const tree = this.navTree();
      if (tree.length && isPlatformBrowser(this.platformId)) {
        requestAnimationFrame(() => this.scheduleRecalculate());
      }
    });
    // Scroll-lock body when search overlay is open
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      if (this.searchOpen()) {
        document.body.style.overflow = 'hidden';
      } else if (!this.mobileOpen()) {
        document.body.style.overflow = '';
      }
    });
  }

  readonly navTree = toSignal(
    this.categoryService.getNavTree().pipe(catchError(() => of([]))),
    { initialValue: [] }
  );

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.resizeObserver = new ResizeObserver(() => this.scheduleRecalculate());
    // Observe the nav itself — its width is now reliably set by flex:1
    this.resizeObserver.observe(this.navEl.nativeElement);
  }

  private scheduleRecalculate(): void {
    if (this.recalcTimer) clearTimeout(this.recalcTimer);
    this.recalcTimer = setTimeout(() => this.recalculate(), 60);
  }

  private recalculate(): void {
    const nav = this.navEl?.nativeElement;
    if (!nav) return;
    // Nav is hidden on mobile (display:none → offsetWidth 0). Bail out so a
    // narrow-viewport measurement never corrupts visibleCount for desktop.
    if (nav.offsetWidth === 0) return;

    const items = Array.from(nav.querySelectorAll<HTMLElement>('[data-nav-item]'));
    if (!items.length) return;

    // Show all items temporarily so we can read their natural widths
    items.forEach(el => el.classList.remove('nav-item--hidden'));

    // nav has flex:1 + min-width:0 so offsetWidth is its actual allocated space.
    // Subtract its own padding to get the usable inner width.
    const navStyle = getComputedStyle(nav);
    const navPaddingH = parseFloat(navStyle.paddingLeft) + parseFloat(navStyle.paddingRight);
    const available = nav.offsetWidth - navPaddingH;

    const gap = parseFloat(navStyle.columnGap) || 40;
    const moreEl = nav.querySelector<HTMLElement>('.nav-item--more');
    const moreBtnW = moreEl?.offsetWidth ?? 90;
    const widths = items.map(el => el.offsetWidth);

    // All fit — no More button needed
    const total = widths.reduce((sum, w, i) => sum + w + (i > 0 ? gap : 0), 0);
    if (total <= available) {
      items.forEach(el => el.classList.remove('nav-item--hidden'));
      this.visibleCount.set(items.length);
      return;
    }

    // Fit as many as possible while reserving space for the More button
    let used = 0;
    let count = 0;
    for (let i = 0; i < widths.length; i++) {
      const w = widths[i] + (i > 0 ? gap : 0);
      if (used + w + gap + moreBtnW <= available) {
        used += w;
        count++;
      } else {
        break;
      }
    }
    count = Math.max(1, count);

    // Apply visibility synchronously — avoids the CD race where the More dropdown
    // renders the overflow item before Angular re-adds nav-item--hidden to the nav item
    items.forEach((el, i) => el.classList.toggle('nav-item--hidden', i >= count));
    this.visibleCount.set(count);
  }

  onNavEnter(slug: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.moreOpen.set(false);
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

  toggleSearch(): void {
    this.searchOpen.update(v => !v);
    this.moreOpen.set(false);
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
      this.moreOpen.set(false);
      this.searchOpen.set(false);
      this.closeMobileMenu();
    });
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.removeEventListener('scroll', this.scrollHandler);
    if (this.openTimer) clearTimeout(this.openTimer);
    if (this.closeTimer) clearTimeout(this.closeTimer);
    if (this.recalcTimer) clearTimeout(this.recalcTimer);
    this.resizeObserver?.disconnect();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.activeMega.set(null);
    this.moreOpen.set(false);
    this.searchOpen.set(false);
    this.closeMobileMenu();
  }

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (this.moreOpen()) {
      const moreEl = this.navEl?.nativeElement?.querySelector('.nav-item--more');
      if (moreEl && !moreEl.contains(target as Node)) this.moreOpen.set(false);
    }
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

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
import { MegaMenuV2Component } from './mega-menu-v2/mega-menu-v2.component';
import { CategoryStripV2Component } from './category-strip-v2/category-strip-v2.component';

@Component({
  selector: 'app-navbar-v2',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MegaMenuV2Component, CategoryStripV2Component],
  templateUrl: './navbar-v2.component.html',
  styleUrl: './navbar-v2.component.scss',
})
export class NavbarV2Component implements OnInit, AfterViewInit, OnDestroy {
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
  readonly stripScrolled = signal(false);
  readonly mobileOpen = signal(false);
  readonly activeMega = signal<string | null>(null);
  readonly cartCount = this.cartService.count;
  readonly wishlistCount = inject(WishlistService).count;
  readonly searchOpen = signal(false);

  @ViewChild('navEl') private navEl!: ElementRef<HTMLElement>;
  @ViewChild('headerEl') private headerEl!: ElementRef<HTMLElement>;

  readonly visibleCount = signal<number>(100);
  readonly moreOpen = signal(false);
  readonly overflowItems = computed(() => this.navTree().slice(this.visibleCount()));

  private openTimer: ReturnType<typeof setTimeout> | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeObserver?: ResizeObserver;
  private headerObserver?: ResizeObserver;
  private recalcTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      if (this.authService.isLoggedIn()) this.addressService.load();
    });
    effect(() => {
      const tree = this.navTree();
      if (tree.length && isPlatformBrowser(this.platformId)) {
        requestAnimationFrame(() => this.scheduleRecalculate());
      }
    });
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      document.body.style.overflow = (this.searchOpen() || this.mobileOpen()) ? 'hidden' : '';
    });
  }

  readonly navTree = toSignal(
    this.categoryService.getNavTree().pipe(catchError(() => of([]))),
    { initialValue: [] }
  );

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Overflow calculation
    this.resizeObserver = new ResizeObserver(() => this.scheduleRecalculate());
    this.resizeObserver.observe(this.navEl.nativeElement);

    // Expose header height as CSS var so the category strip can position itself
    this.headerObserver = new ResizeObserver(entries => {
      const h = entries[0]?.borderBoxSize?.[0]?.blockSize
        ?? entries[0]?.contentRect.height
        ?? 80;
      const navH = Math.round(h);
      document.documentElement.style.setProperty('--navbar-v2-h', `${navH}px`);
      // page top offsets: desktop = navH + breathing room; mobile adds category strip (88px)
      document.documentElement.style.setProperty('--nav-offset', `${navH}px`);
      document.documentElement.style.setProperty('--nav-offset-mobile', `${navH + 88 + 2}px`);
    });
    this.headerObserver.observe(this.headerEl.nativeElement);
  }

  private scheduleRecalculate(): void {
    if (this.recalcTimer) clearTimeout(this.recalcTimer);
    this.recalcTimer = setTimeout(() => this.recalculate(), 60);
  }

  private recalculate(): void {
    const nav = this.navEl?.nativeElement;
    if (!nav || nav.offsetWidth === 0) return;

    const items = Array.from(nav.querySelectorAll<HTMLElement>('[data-nav-item]'));
    if (!items.length) return;

    items.forEach(el => el.classList.remove('nav-item--hidden'));

    const navStyle = getComputedStyle(nav);
    const navPaddingH = parseFloat(navStyle.paddingLeft) + parseFloat(navStyle.paddingRight);
    const available = nav.offsetWidth - navPaddingH;
    const gap = parseFloat(navStyle.columnGap) || 40;
    const moreEl = nav.querySelector<HTMLElement>('.nav-item--more');
    const moreBtnW = moreEl?.offsetWidth ?? 90;
    const widths = items.map(el => el.offsetWidth);

    const total = widths.reduce((sum, w, i) => sum + w + (i > 0 ? gap : 0), 0);
    if (total <= available) {
      this.visibleCount.set(items.length);
      return;
    }

    let used = 0;
    let count = 0;
    for (let i = 0; i < widths.length; i++) {
      const w = widths[i] + (i > 0 ? gap : 0);
      if (used + w + gap + moreBtnW <= available) { used += w; count++; } else break;
    }
    count = Math.max(1, count);
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

  closeMega(): void { this.activeMega.set(null); }

  toggleSearch(): void {
    this.searchOpen.update(v => !v);
    this.moreOpen.set(false);
    this.activeMega.set(null);
  }

  private scrollHandler = () => {
    const y = window.scrollY;
    this.scrolled.set(y > 50);
    this.stripScrolled.set(y > 10);
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
    document.documentElement.style.removeProperty('--navbar-v2-h');
    document.documentElement.style.removeProperty('--nav-offset');
    document.documentElement.style.removeProperty('--nav-offset-mobile');
    if (this.openTimer) clearTimeout(this.openTimer);
    if (this.closeTimer) clearTimeout(this.closeTimer);
    if (this.recalcTimer) clearTimeout(this.recalcTimer);
    this.resizeObserver?.disconnect();
    this.headerObserver?.disconnect();
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
    if (isPlatformBrowser(this.platformId)) document.body.style.overflow = '';
  }

  signOut(): void {
    this.authService.logout();
    this.closeMobileMenu();
  }
}

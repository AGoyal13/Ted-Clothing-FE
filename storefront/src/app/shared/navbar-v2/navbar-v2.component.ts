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
import { Subject, Subscription, catchError, of, filter, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { CategoryService } from '../../core/services/category.service';
import { AddressService } from '../../core/services/address.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { SearchService } from '../../core/services/search.service';
import { SearchHit } from '../../core/models/search.model';
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
  private readonly searchService = inject(SearchService);

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
  readonly searchQuery = signal('');
  readonly searchResults = signal<SearchHit[]>([]);
  readonly searchLoading = signal(false);
  readonly searchActiveIdx = signal(-1);
  readonly searchAttempted = signal(false);
  readonly presetResults = signal<SearchHit[]>([]);
  readonly presetLoading = signal(false);
  private readonly searchSubject = new Subject<string>();
  private searchSub?: Subscription;
  private presetSub?: Subscription;

  @ViewChild('navEl') private navEl!: ElementRef<HTMLElement>;
  @ViewChild('headerEl') private headerEl!: ElementRef<HTMLElement>;
  @ViewChild('searchInput') private searchInputEl?: ElementRef<HTMLInputElement>;

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
    if (this.searchOpen()) { this.closeSearch(); }
    else {
      this.searchOpen.set(true);
      this.moreOpen.set(false);
      this.activeMega.set(null);
      this.loadPresets();
      // autofocus doesn't fire on @if-rendered elements — focus after one tick
      if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.searchInputEl?.nativeElement.focus(), 0);
      }
    }
  }

  private loadPresets(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.presetResults().length > 0) return;
    this.presetLoading.set(true);
    this.presetSub = this.searchService.search('', 6).pipe(catchError(() => of(null))).subscribe(result => {
      this.presetLoading.set(false);
      this.presetResults.set(result?.hits ?? []);
    });
  }

  closeSearch(): void {
    this.searchOpen.set(false);
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.searchAttempted.set(false);
    this.searchActiveIdx.set(-1);
    this.searchLoading.set(false);
  }

  onSearchInput(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.searchQuery.set(q);
    if (q.trim().length < 2) {
      this.searchResults.set([]);
      this.searchAttempted.set(false);
      this.searchLoading.set(false);
      this.searchActiveIdx.set(-1);
    }
    this.searchSubject.next(q.trim());
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const results = this.searchResults();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.searchActiveIdx.update(i => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.searchActiveIdx.update(i => Math.max(i - 1, -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.searchActiveIdx();
      const target = idx >= 0 ? results[idx] : results[0];
      if (target) { this.router.navigate(['/product', target.slug]); this.closeSearch(); }
    }
  }

  searchEffectivePrice(hit: SearchHit): number {
    return Math.round(hit.basePrice * (1 - hit.discountPercent / 100));
  }

  searchDiscountPct(hit: SearchHit): number {
    return Math.round(hit.discountPercent);
  }

  formatINR(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
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
      this.closeSearch();
      this.closeMobileMenu();
    });
    this.searchSub = this.searchSubject.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      filter(q => q.length >= 2),
      tap(() => { this.searchLoading.set(true); this.searchActiveIdx.set(-1); }),
      switchMap(q => this.searchService.search(q, 6).pipe(catchError(() => of(null)))),
    ).subscribe(result => {
      this.searchLoading.set(false);
      this.searchAttempted.set(true);
      this.searchResults.set(result?.hits ?? []);
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
    this.searchSub?.unsubscribe();
    this.presetSub?.unsubscribe();
    this.searchSubject.complete();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.activeMega.set(null);
    this.moreOpen.set(false);
    this.closeSearch();
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

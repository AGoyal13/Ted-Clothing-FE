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
import { isPlatformBrowser, UpperCasePipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationStart } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, filter } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { CategoryService } from '../../core/services/category.service';
import { AddressService } from '../../core/services/address.service';
import { NavCategory } from '../../core/models/category.model';

interface MegaGroup { label: string; slug: string; links: NavCategory[]; showBorder: boolean; }

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, UpperCasePipe],
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

  constructor() {
    effect(() => {
      if (this.authService.isLoggedIn()) this.addressService.load();
    });
  }
  readonly activeMega = signal<string | null>(null);
  readonly expandedSections = signal<Set<string>>(new Set());
  readonly collapsedDrawerGroups = signal<Set<string>>(new Set());
  readonly cartCount = this.cartService.count;

  private openTimer: ReturnType<typeof setTimeout> | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  readonly navTree = toSignal(
    this.categoryService.getNavTree().pipe(catchError(() => of([]))),
    { initialValue: [] }
  );

  // Mega menu hover logic (desktop)
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

  // Collapsible mobile drawer sub-groups
  toggleDrawerGroup(key: string): void {
    this.collapsedDrawerGroups.update(s => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  isDrawerGroupCollapsed(key: string): boolean {
    return this.collapsedDrawerGroups().has(key);
  }

  // Build display groups for mega menu panel
  buildGroups(root: NavCategory): MegaGroup[] {
    const namedGroups: MegaGroup[] = [];
    const flat: NavCategory[] = [];

    for (const child of root.children ?? []) {
      if (child.children?.length) {
        // Named sub-group (e.g. Bags under Accessories): gets its own border
        namedGroups.push({ label: child.name, slug: child.slug, links: child.children, showBorder: true });
      } else {
        flat.push(child);
      }
    }

    const hasSubGroups = namedGroups.length > 0;
    const groups: MegaGroup[] = [...namedGroups];

    // Flat children chunked into columns of 7.
    // showBorder = true only when there are NO named sub-groups (whole panel is one category).
    const chunkSize = 7;
    for (let i = 0; i < flat.length; i += chunkSize) {
      groups.push({
        label: i === 0 && !hasSubGroups ? root.name : '',
        slug: root.slug,
        links: flat.slice(i, i + chunkSize),
        showBorder: !hasSubGroups,
      });
    }

    return groups;
  }

  // Mobile root-section accordion (tracks expanded; empty = all collapsed by default)
  toggleSection(slug: string): void {
    this.expandedSections.update(set => {
      const next = new Set(set);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

  isSectionCollapsed(slug: string): boolean {
    return !this.expandedSections().has(slug);
  }

  // Scroll + lifecycle
  private scrollHandler = () => {
    this.scrolled.set(window.scrollY > 50);
    if (this.activeMega()) this.activeMega.set(null);
  };

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    // close mega on route navigation
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

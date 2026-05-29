import {
  Component,
  HostListener,
  inject,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser, UpperCasePipe } from '@angular/common';
import { Router, RouterLink, NavigationStart } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, filter } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { CategoryService } from '../../core/services/category.service';
import { NavCategory } from '../../core/models/category.model';

interface MegaGroup { label: string; slug: string; links: NavCategory[]; showBorder: boolean; }

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, UpperCasePipe],
  template: `
    <header class="navbar" [class.navbar--scrolled]="scrolled()">
      <div class="navbar__inner">

        <!-- Logo -->
        <a routerLink="/" class="navbar__logo" aria-label="Ted Clothing Home">
          <span class="navbar__logo-ted">TED</span>
          <span class="navbar__logo-clothing">CLOTHING</span>
        </a>

        <!-- Desktop Nav -->
        <nav class="navbar__nav" aria-label="Main navigation">
          @for (root of navTree(); track root.slug) {
            <div class="nav-item"
                 (mouseenter)="onNavEnter(root.slug)"
                 (mouseleave)="onNavLeave()">
              <a [routerLink]="['/category', root.slug]"
                 class="navbar__link"
                 [class.navbar__link--mega-open]="activeMega() === root.slug">
                {{ root.name }}
                <svg class="navbar__link-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </a>
            </div>
          }
        </nav>

        <!-- Right Actions -->
        <div class="navbar__actions">
          <a routerLink="/cart" class="navbar__cart-btn" aria-label="Shopping cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span class="navbar__cart-label">CART ({{ cartCount() }})</span>
          </a>

          @if (authService.isLoggedIn()) {
            <a routerLink="/account" class="navbar__account" aria-label="My account">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </a>
          } @else {
            <button class="navbar__login" (click)="authService.openModal()" aria-label="Sign in">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
          }

          <!-- Hamburger -->
          <button class="navbar__hamburger" (click)="toggleMobileMenu()"
                  [attr.aria-expanded]="mobileOpen()" aria-label="Toggle menu">
            <span [class.open]="mobileOpen()"></span>
            <span [class.open]="mobileOpen()"></span>
            <span [class.open]="mobileOpen()"></span>
          </button>
        </div>

      </div><!-- /navbar__inner -->

      <!-- Mega menu panels (direct children of .navbar, positioned absolute top:100%) -->
      @for (root of navTree(); track root.slug) {
        @let groups = buildGroups(root);
        @let unified = groups[0]?.slug === root.slug;
        <div class="mega"
             [class.mega--visible]="activeMega() === root.slug"
             (mouseenter)="onMegaEnter()"
             (mouseleave)="onMegaLeave()">
          <div class="mega__inner" [class.mega__inner--unified]="unified">
            @for (group of groups; track $index) {
              <div class="mega__group">
                <div class="mega__group-header-row" [class.mega__group-header-row--bordered]="group.showBorder && !unified">
                  @if (group.label) {
                    <span class="mega__group-label">{{ group.label | uppercase }}</span>
                  }
                </div>
                @for (link of group.links; track link.slug) {
                  <a [routerLink]="['/category', link.slug]"
                     class="mega__link"
                     (click)="closeMega()">
                    @if (link.imageUrl) {
                      <img class="mega__link-img" [src]="link.imageUrl" [alt]="link.name" loading="lazy" />
                    }
                    {{ link.name }}
                  </a>
                }
              </div>
            }
          </div>
        </div>
      }

    </header>

    <!-- Mobile Drawer -->
    @if (mobileOpen()) {
      <div class="mobile-overlay" (click)="closeMobileMenu()">
        <nav class="mobile-menu" (click)="$event.stopPropagation()" aria-label="Mobile navigation">

          <div class="mobile-menu__head">
            <a routerLink="/" class="mobile-menu__brand" (click)="closeMobileMenu()">
              <span class="navbar__logo-ted">TED</span>
              <span class="navbar__logo-clothing">CLOTHING</span>
            </a>
            <button class="mobile-menu__close" (click)="closeMobileMenu()" aria-label="Close menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="mobile-menu__cats">
            @for (root of navTree(); track root.slug) {
              <div class="drawer__section" [class.drawer__section--collapsed]="isSectionCollapsed(root.slug)">

                <button class="drawer__header" (click)="toggleSection(root.slug)">
                  <span class="drawer__header-label">{{ root.name | uppercase }}</span>
                  <svg class="drawer__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                <div class="drawer__body">
                  @for (group of buildGroups(root); track $index; let gi = $index) {
                    @if (group.label && group.slug !== root.slug) {
                      <div class="drawer__sub-section">
                        <button class="drawer__sub-header"
                                (click)="toggleDrawerGroup(root.slug + ':' + gi)">
                          <span class="drawer__sub-label">{{ group.label | uppercase }}</span>
                          <svg class="drawer__sub-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                               [style.transform]="isDrawerGroupCollapsed(root.slug + ':' + gi) ? 'rotate(-90deg)' : 'rotate(0deg)'">
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div class="drawer__sub-body"
                             [style.maxHeight]="isDrawerGroupCollapsed(root.slug + ':' + gi) ? '0px' : '600px'">
                          @for (link of group.links; track link.slug) {
                            <a [routerLink]="['/category', link.slug]"
                               class="drawer__link drawer__link--nested"
                               (click)="closeMobileMenu()">
                              @if (link.imageUrl) {
                                <img class="drawer__link-img" [src]="link.imageUrl" [alt]="link.name" loading="lazy" />
                              }
                              {{ link.name }}
                            </a>
                          }
                        </div>
                      </div>
                    } @else {
                      @for (link of group.links; track link.slug) {
                        <a [routerLink]="['/category', link.slug]"
                           class="drawer__link"
                           (click)="closeMobileMenu()">
                          @if (link.imageUrl) {
                            <img class="drawer__link-img" [src]="link.imageUrl" [alt]="link.name" loading="lazy" />
                          }
                          {{ link.name }}
                        </a>
                      }
                    }
                  }
                </div>

              </div>
            }
          </div>

          <!-- Footer links -->
          <div class="mobile-menu__footer">
            <a routerLink="/cart" class="mobile-menu__footer-link" (click)="closeMobileMenu()">
              Cart
              @if (cartCount() > 0) {
                <span class="mobile-menu__badge">{{ cartCount() }}</span>
              }
            </a>
            @if (authService.isLoggedIn()) {
              <a routerLink="/account" class="mobile-menu__footer-link" (click)="closeMobileMenu()">Account</a>
            } @else {
              <button class="mobile-menu__footer-link" (click)="authService.openModal(); closeMobileMenu()">Sign In</button>
            }
          </div>

        </nav>
      </div>
    }
  `,
  styles: [`
    .navbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      transition: background 0.4s ease, backdrop-filter 0.4s ease, border-color 0.4s ease;
      border-bottom: 1px solid transparent;
    }

    .navbar--scrolled {
      background: var(--navbar-scrolled-bg);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-bottom-color: rgba(201, 168, 76, 0.12);
    }

    .navbar__inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 5%;
      max-width: 1440px;
      margin: 0 auto;
    }

    .navbar__logo {
      display: flex;
      flex-direction: column;
      line-height: 1;
      text-decoration: none;
    }

    .navbar__logo-ted {
      font-family: var(--font-display);
      font-size: 1.75rem;
      color: var(--gold);
      letter-spacing: 0.05em;
      line-height: 1;
    }

    .navbar__logo-clothing {
      font-family: var(--font-sans);
      font-size: 0.55rem;
      font-weight: 600;
      letter-spacing: 0.35em;
      color: var(--cream);
      opacity: 0.5;
      text-transform: uppercase;
    }

    .navbar__nav {
      display: flex;
      align-items: center;
      gap: 2.5rem;
    }

    .navbar__link {
      font-family: var(--font-display);
      font-size: 1.25rem;
      letter-spacing: 0.2em;
      color: var(--cream);
      text-decoration: none;
      position: relative;
      transition: color 0.2s ease;
      display: flex;
      align-items: center;
      gap: 5px;

      &::after {
        content: '';
        position: absolute;
        bottom: -4px;
        left: 0;
        right: 0;
        height: 1px;
        background: var(--gold);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.3s var(--ease-enter);
      }

      &:hover,
      &.navbar__link--active {
        color: var(--gold);

        &::after {
          transform: scaleX(1);
        }
      }
    }

    .navbar__actions {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .navbar__cart-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1.1rem;
      border: 1px solid var(--gold);
      background: #c9a84c;
      color: var(--bg);
      font-family: var(--font-display);
      font-size: 0.8rem;
      letter-spacing: 0.18em;
      text-decoration: none;
      white-space: nowrap;
    }

    .navbar__cart-label {
      position: relative;
    }

    .navbar__account,
    .navbar__login {
      position: relative;
      display: flex;
      align-items: center;
      color: var(--cream);
      transition: color 0.2s ease;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;

      &:hover {
        color: var(--gold);
      }
    }

    .navbar__hamburger {
      display: none;
      flex-direction: column;
      gap: 5px;
      width: 28px;
      cursor: pointer;
      background: none;
      border: none;
      padding: 2px;

      span {
        display: block;
        width: 100%;
        height: 1.5px;
        background: var(--cream);
        transition: transform 0.3s ease, opacity 0.3s ease;
        transform-origin: center;

        &.open:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
        &.open:nth-child(2) { opacity: 0; transform: scaleX(0); }
        &.open:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }
      }
    }

    /* Mobile Overlay */
    .mobile-overlay {
      position: fixed;
      inset: 0;
      background: rgba(13, 13, 13, 0.6);
      z-index: 1100;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .mobile-menu {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(380px, 92vw);
      background: var(--surface);
      border-left: 1px solid rgba(201, 168, 76, 0.15);
      display: flex;
      flex-direction: column;
      animation: slideIn 0.32s var(--ease-enter);
      overflow: hidden;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .mobile-menu__badge {
      background: var(--gold);
      color: var(--bg);
      font-family: var(--font-sans);
      font-size: 0.65rem;
      font-weight: 500;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    @media (max-width: 900px) {
      .navbar__nav {
        display: none;
      }

      .navbar__hamburger {
        display: flex;
      }

      .navbar {
        background: var(--navbar-scrolled-bg);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-bottom-color: rgba(201, 168, 76, 0.12);
      }
    }

    /* ── Nav item wrapper for hover zone ──────────────────────── */
    .nav-item {
      display: flex;
      align-items: stretch;
      height: 100%;
    }

    /* Chevron on desktop nav link */
    .navbar__link-chevron {
      transition: transform 0.2s ease;
      flex-shrink: 0;
    }
    .navbar__link--mega-open .navbar__link-chevron,
    .navbar__link:hover .navbar__link-chevron {
      transform: rotate(180deg);
    }

    /* ── MEGA MENU ────────────────────────────────────────────── */
    .mega {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: rgba(16, 16, 16, 0.98);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-top: 1px solid rgba(201, 168, 76, 0.12);
      border-bottom: 1px solid rgba(201, 168, 76, 0.12);
      pointer-events: none;
      opacity: 0;
      transform: translateY(-8px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      z-index: 999;
    }
    .mega--visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: all;
    }
    .mega__inner {
      max-width: 1440px;
      margin: 0 auto;
      padding: 28px 5% 32px;
      display: flex;
      gap: 40px;
      position: relative;
    }
    /* Single full-width border for panels where all columns are the same parent */
    .mega__inner--unified::after {
      content: '';
      position: absolute;
      left: 5%;
      right: 5%;
      top: 50px; /* 28px padding-top + 22px header-row height */
      height: 1px;
      background: rgba(201, 168, 76, 0.12);
      pointer-events: none;
    }
    .mega__group {
      display: flex;
      flex-direction: column;
      min-width: 110px;
    }

    .mega__group-header-row {
      height: 22px;
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }
    .mega__group-header-row--bordered {
      border-bottom: 1px solid rgba(201, 168, 76, 0.12);
    }
    .mega__group-label {
      font-family: var(--font-display);
      font-size: 0.7rem;
      letter-spacing: 0.22em;
      color: var(--gold);
      user-select: none;
    }

    .mega__link {
      font-family: var(--font-sans);
      font-size: 0.82rem;
      color: var(--muted);
      text-decoration: none;
      cursor: pointer;
      transition: color 0.15s ease, padding-left 0.15s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }
    .mega__link:hover {
      color: var(--cream);
      padding-left: 5px;
    }
    .mega__link-img {
      width: 32px;
      height: 32px;
      object-fit: cover;
      border-radius: 3px;
      opacity: 0.85;
      flex-shrink: 0;
    }

    /* ── MOBILE DRAWER ────────────────────────────────────────── */
    .mobile-menu__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 1.5rem 1.75rem 1rem;
      border-bottom: 1px solid rgba(201, 168, 76, 0.1);
      flex-shrink: 0;
    }
    .mobile-menu__brand {
      display: flex;
      flex-direction: column;
      text-decoration: none;
      line-height: 1;
    }
    .mobile-menu__close {
      color: var(--muted);
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      transition: color 0.2s;
      &:hover { color: var(--cream); }
    }
    .mobile-menu__cats {
      flex: 1;
      overflow-y: auto;
    }

    /* Root section (MEN, WOMEN, etc.) */
    .drawer__section {
      border-bottom: 1px solid rgba(201, 168, 76, 0.08);
    }
    .drawer__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 14px 1.75rem;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      user-select: none;
    }
    .drawer__header-label {
      font-family: var(--font-display);
      font-size: 1rem;
      letter-spacing: 0.16em;
      color: var(--cream);
    }
    .drawer__chevron {
      stroke: var(--gold);
      flex-shrink: 0;
      transition: transform 0.25s ease;
    }
    .drawer__section--collapsed .drawer__chevron {
      transform: rotate(-90deg);
    }
    .drawer__body {
      overflow: hidden;
      max-height: 800px;
      transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      padding: 0 1.75rem 12px;
    }
    .drawer__section--collapsed .drawer__body {
      max-height: 0;
      padding-bottom: 0;
    }

    /* Named sub-group (e.g. BAGS inside ACCESSORIES) */
    .drawer__sub-section {
      margin-top: 4px;
    }
    .drawer__sub-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 7px 0 6px;
      background: none;
      border: none;
      border-bottom: 1px solid rgba(201, 168, 76, 0.1);
      cursor: pointer;
      text-align: left;
      user-select: none;
    }
    .drawer__sub-label {
      font-size: 0.67rem;
      font-weight: 500;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: rgba(201, 168, 76, 0.55);
    }
    .drawer__sub-chevron {
      stroke: rgba(201, 168, 76, 0.5);
      flex-shrink: 0;
      transition: transform 0.22s ease;
    }
    .drawer__sub-body {
      overflow: hidden;
      transition: max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .drawer__link {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--muted);
      text-decoration: none;
      padding: 8px 0;
      border-bottom: 1px solid rgba(245, 240, 232, 0.05);
      transition: color 0.15s ease, padding-left 0.15s ease;
      &:last-child { border-bottom: none; }
      &:hover { color: var(--cream); padding-left: 6px; }
    }
    .drawer__link--nested {
      padding-left: 4px;
      font-size: 0.84rem;
    }
    .drawer__link-img {
      width: 28px;
      height: 28px;
      object-fit: cover;
      border-radius: 3px;
      opacity: 0.8;
      flex-shrink: 0;
    }

    .mobile-menu__footer {
      border-top: 1px solid rgba(201, 168, 76, 0.1);
      padding: 1rem 1.75rem 2rem;
      display: flex;
      gap: 1.5rem;
      flex-shrink: 0;
    }
    .mobile-menu__footer-link {
      font-family: var(--font-display);
      font-size: 1rem;
      letter-spacing: 0.12em;
      color: var(--muted);
      text-decoration: none;
      background: none;
      border: none;
      cursor: pointer;
      transition: color 0.2s;
      &:hover { color: var(--cream); }
    }
    .mobile-menu__badge {
      background: var(--gold);
      color: var(--bg);
      font-family: var(--font-sans);
      font-size: 0.65rem;
      font-weight: 500;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: 6px;
    }
  `],
})
export class NavbarComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);
  private readonly categoryService = inject(CategoryService);

  readonly scrolled = signal(false);
  readonly mobileOpen = signal(false);
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
}

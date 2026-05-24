import {
  Component,
  HostListener,
  inject,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../core/services/cart.service';

interface NavItem {
  label: string;
  slug: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
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
          @for (item of navItems; track item.slug) {
            <a
              [routerLink]="['/category', item.slug]"
              routerLinkActive="navbar__link--active"
              class="navbar__link"
            >{{ item.label }}</a>
          }
        </nav>

        <!-- Right Actions -->
        <div class="navbar__actions">
          <a routerLink="/cart" class="navbar__cart" aria-label="Shopping cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            @if (cartCount() > 0) {
              <span class="navbar__cart-badge">{{ cartCount() }}</span>
            }
          </a>

          <!-- Hamburger (mobile) -->
          <button
            class="navbar__hamburger"
            (click)="toggleMobileMenu()"
            [attr.aria-expanded]="mobileOpen()"
            aria-label="Toggle menu"
          >
            <span [class.open]="mobileOpen()"></span>
            <span [class.open]="mobileOpen()"></span>
            <span [class.open]="mobileOpen()"></span>
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Overlay -->
    @if (mobileOpen()) {
      <div class="mobile-overlay" (click)="closeMobileMenu()">
        <nav class="mobile-menu" (click)="$event.stopPropagation()" aria-label="Mobile navigation">
          <button class="mobile-menu__close" (click)="closeMobileMenu()" aria-label="Close menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div class="mobile-menu__brand">
            <span class="navbar__logo-ted">TED</span>
            <span class="navbar__logo-clothing">CLOTHING</span>
          </div>
          @for (item of navItems; track item.slug) {
            <a
              [routerLink]="['/category', item.slug]"
              routerLinkActive="mobile-menu__link--active"
              class="mobile-menu__link"
              (click)="closeMobileMenu()"
            >{{ item.label }}</a>
          }
          <a routerLink="/cart" class="mobile-menu__link" (click)="closeMobileMenu()">
            Cart
            @if (cartCount() > 0) {
              <span class="mobile-menu__badge">{{ cartCount() }}</span>
            }
          </a>
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
      background: rgba(26, 23, 20, 0.92);
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
      font-size: 0.5rem;
      font-weight: 500;
      letter-spacing: 0.35em;
      color: var(--muted);
      text-transform: uppercase;
    }

    .navbar__nav {
      display: flex;
      align-items: center;
      gap: 2.5rem;
    }

    .navbar__link {
      font-family: var(--font-display);
      font-size: 0.9rem;
      letter-spacing: 0.2em;
      color: var(--cream);
      text-decoration: none;
      position: relative;
      transition: color 0.2s ease;

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

    .navbar__cart {
      position: relative;
      display: flex;
      align-items: center;
      color: var(--cream);
      transition: color 0.2s ease;

      &:hover {
        color: var(--gold);
      }
    }

    .navbar__cart-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      background: var(--gold);
      color: var(--bg);
      font-family: var(--font-sans);
      font-size: 0.6rem;
      font-weight: 500;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
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
      width: min(360px, 90vw);
      background: var(--surface);
      border-left: 1px solid rgba(201, 168, 76, 0.15);
      padding: 2rem 2rem 3rem;
      display: flex;
      flex-direction: column;
      animation: slideIn 0.35s var(--ease-enter);
      overflow-y: auto;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .mobile-menu__close {
      align-self: flex-end;
      color: var(--muted);
      transition: color 0.2s ease;
      padding: 4px;
      margin-bottom: 2rem;

      &:hover {
        color: var(--cream);
      }
    }

    .mobile-menu__brand {
      display: flex;
      flex-direction: column;
      margin-bottom: 3rem;
    }

    .mobile-menu__link {
      font-family: var(--font-display);
      font-size: 2rem;
      letter-spacing: 0.1em;
      color: var(--cream);
      text-decoration: none;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(245, 240, 232, 0.06);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      transition: color 0.2s ease;

      &:hover,
      &--active {
        color: var(--gold);
      }
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
    }
  `],
})
export class NavbarComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cartService = inject(CartService);

  readonly scrolled = signal(false);
  readonly mobileOpen = signal(false);
  readonly cartCount = this.cartService.count;

  readonly navItems: NavItem[] = [
    { label: 'MEN', slug: 'men' },
    { label: 'WOMEN', slug: 'women' },
    { label: 'KIDS', slug: 'kids' },
    { label: 'ACCESSORIES', slug: 'accessories' },
  ];

  private scrollHandler = () => {
    this.scrolled.set(window.scrollY > 50);
  };

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.removeEventListener('scroll', this.scrollHandler);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
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

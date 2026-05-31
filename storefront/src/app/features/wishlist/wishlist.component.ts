import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WishlistService } from '../../core/services/wishlist.service';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <main class="wl-page">

      <!-- Header -->
      <div class="wl-page__header">
        <p class="wl-page__eyebrow">CURATED BY YOU</p>
        <h1 class="wl-page__heading">WISHLIST</h1>
        @if (wishlist.count() > 0) {
          <p class="wl-page__count">{{ wishlist.count() }} {{ wishlist.count() === 1 ? 'piece' : 'pieces' }}</p>
        }
      </div>

      @if (wishlist.count() === 0) {
        <!-- Empty state -->
        <div class="wl-page__empty">
          <div class="wl-page__empty-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <p class="wl-page__empty-title">Your wishlist is empty</p>
          <p class="wl-page__empty-sub">Save pieces you love and find them here.</p>
          <a routerLink="/" class="wl-page__cta">EXPLORE COLLECTION</a>
        </div>
      } @else {
        <!-- Product grid -->
        <div class="wl-page__grid">
          @for (item of wishlist.items(); track item.skuId) {
            <article class="wl-card">

              <!-- Image -->
              <a [routerLink]="['/product', item.productSlug]" class="wl-card__img-wrap">
                @if (item.image) {
                  <img class="wl-card__img" [src]="item.image" [alt]="item.productTitle" loading="lazy" />
                } @else {
                  <div class="wl-card__img-placeholder"></div>
                }
              </a>

              <!-- Remove -->
              <button class="wl-card__remove"
                      (click)="wishlist.toggle(item.productId, item.skuId)"
                      aria-label="Remove from wishlist">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>

              <!-- Info -->
              <div class="wl-card__info">
                <a [routerLink]="['/product', item.productSlug]" class="wl-card__title">
                  {{ item.productTitle }}
                </a>
                <span class="wl-card__meta">
                  <span class="wl-card__swatch"
                        [style.background]="item.colorHex || '#888'"
                        aria-hidden="true"></span>
                  {{ item.colorName }} &middot; {{ item.sizeLabel }}
                </span>
                <div class="wl-card__price">
                  <span class="wl-card__price-current">₹{{ wishlist.effectivePrice(item) | number:'1.0-0' }}</span>
                  @if (item.discountPercent > 0) {
                    <span class="wl-card__price-original">₹{{ item.basePrice | number:'1.0-0' }}</span>
                    <span class="wl-card__discount">{{ item.discountPercent }}% off</span>
                  }
                </div>
              </div>

            </article>
          }
        </div>

        <!-- Continue shopping -->
        <div class="wl-page__footer">
          <a routerLink="/" class="wl-page__cta wl-page__cta--outline">CONTINUE SHOPPING</a>
        </div>
      }

    </main>
  `,
  styles: [`
    .wl-page {
      min-height: 100vh;
      background: var(--bg);
      padding: 7rem 5% 5rem;
      max-width: 1440px;
      margin: 0 auto;
    }

    /* ── Header ─────────────────────────────────────────────────── */
    .wl-page__header {
      margin-bottom: 3rem;
    }

    .wl-page__eyebrow {
      font-family: var(--font-display);
      font-size: 0.8rem;
      letter-spacing: 0.4em;
      color: var(--gold);
      margin-bottom: 0.375rem;
    }

    .wl-page__heading {
      font-family: var(--font-display);
      font-size: clamp(2.5rem, 6vw, 5rem);
      letter-spacing: 0.08em;
      color: var(--cream);
      line-height: 1;
      margin-bottom: 0.5rem;
    }

    .wl-page__count {
      font-family: var(--font-sans);
      font-size: 0.82rem;
      color: var(--muted);
      letter-spacing: 0.06em;
    }

    /* ── Empty state ─────────────────────────────────────────────── */
    .wl-page__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 1rem;
      padding: 5rem 1rem;
    }

    .wl-page__empty-icon {
      color: rgba(201, 168, 76, 0.25);
      margin-bottom: 0.5rem;
    }

    .wl-page__empty-title {
      font-family: var(--font-display);
      font-size: 1.5rem;
      letter-spacing: 0.08em;
      color: var(--cream);
    }

    .wl-page__empty-sub {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--muted);
    }

    /* ── CTA button ──────────────────────────────────────────────── */
    .wl-page__cta {
      display: inline-block;
      margin-top: 0.5rem;
      padding: 0.875rem 2.5rem;
      background: var(--gold);
      color: #0d0d0d;
      font-family: var(--font-display);
      font-size: 0.875rem;
      letter-spacing: 0.2em;
      text-decoration: none;
      transition: opacity 0.2s ease;
      &:hover { opacity: 0.88; }
    }

    .wl-page__cta--outline {
      background: transparent;
      color: var(--gold);
      border: 1px solid rgba(201, 168, 76, 0.4);
      &:hover { border-color: var(--gold); opacity: 1; }
    }

    /* ── Grid ────────────────────────────────────────────────────── */
    .wl-page__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 2rem 1.5rem;
    }

    /* ── Card ────────────────────────────────────────────────────── */
    .wl-card {
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .wl-card__img-wrap {
      display: block;
      position: relative;
      aspect-ratio: 3 / 4;
      overflow: hidden;
      background: rgba(245, 240, 232, 0.04);
      margin-bottom: 0.875rem;
    }

    .wl-card__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s ease;
    }
    .wl-card__img-wrap:hover .wl-card__img { transform: scale(1.04); }

    .wl-card__img-placeholder {
      width: 100%;
      height: 100%;
      background: rgba(245, 240, 232, 0.06);
    }

    /* Filled heart remove button — top-right of image */
    .wl-card__remove {
      position: absolute;
      top: 0.625rem;
      right: 0.625rem;
      width: 32px;
      height: 32px;
      background: rgba(13, 13, 13, 0.65);
      backdrop-filter: blur(4px);
      border: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--gold);
      transition: background 0.2s ease, color 0.2s ease;
      &:hover {
        background: rgba(13, 13, 13, 0.9);
        color: #f87171;
      }
    }

    .wl-card__info {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .wl-card__title {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--cream);
      text-decoration: none;
      line-height: 1.35;
      transition: color 0.2s ease;
      &:hover { color: var(--gold); }
    }

    .wl-card__meta {
      font-family: var(--font-sans);
      font-size: 0.76rem;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .wl-card__swatch {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1px solid rgba(245, 240, 232, 0.2);
      flex-shrink: 0;
    }

    .wl-card__price {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.1rem;
    }

    .wl-card__price-current {
      font-family: var(--font-sans);
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--cream);
    }

    .wl-card__price-original {
      font-family: var(--font-sans);
      font-size: 0.78rem;
      color: var(--muted);
      text-decoration: line-through;
    }

    .wl-card__discount {
      font-family: var(--font-sans);
      font-size: 0.72rem;
      color: var(--gold);
      font-weight: 500;
    }

    /* ── Footer ──────────────────────────────────────────────────── */
    .wl-page__footer {
      margin-top: 4rem;
      display: flex;
      justify-content: center;
    }

    /* ── Responsive ──────────────────────────────────────────────── */
    @media (max-width: 600px) {
      .wl-page { padding: 7.5rem 4% 4rem; }
      .wl-page__grid { grid-template-columns: repeat(2, 1fr); gap: 1.25rem 0.75rem; }
    }
  `],
})
export class WishlistPageComponent {
  readonly wishlist = inject(WishlistService);
}

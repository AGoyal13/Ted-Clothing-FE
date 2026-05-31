import {
  Component,
  inject,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { CartItem } from '../../core/models/cart.model';
import { formatINR } from '../../core/models/product.model';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="cart-page">
      <div class="cart-page__inner">
        <div class="cart-page__header">
          <h1 class="cart-page__title">YOUR BAG</h1>
          <p class="cart-page__count">{{ itemCount() }} {{ itemCount() === 1 ? 'item' : 'items' }}</p>
        </div>

        @if (items().length === 0) {
          <!-- Empty State -->
          <div class="cart-page__empty">
            <div class="cart-page__empty-icon" aria-hidden="true">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <h2 class="cart-page__empty-title">Your bag is empty</h2>
            <p class="cart-page__empty-sub">
              <em>Discover pieces crafted to be remembered.</em>
            </p>
            <a routerLink="/" class="btn-primary" style="margin-top:2rem;">Continue Shopping</a>
          </div>
        } @else {
          <div class="cart-page__layout">
            <!-- Items -->
            <div class="cart-page__items">
              @for (item of items(); track item.skuId) {
                <div class="cart-row">
                  <!-- Product Image -->
                  <div class="cart-row__image">
                    @if (item.image) {
                      <img
                        [src]="item.image"
                        [alt]="item.productTitle"
                        loading="lazy"
                        width="100"
                        height="133"
                      />
                    } @else {
                      <div class="cart-row__img-placeholder">
                        <span>{{ item.productTitle.charAt(0) }}</span>
                      </div>
                    }
                  </div>

                  <!-- Product Details -->
                  <div class="cart-row__details">
                    <a
                      [routerLink]="['/product', item.productSlug]"
                      class="cart-row__title"
                    >{{ item.productTitle }}</a>
                    <p class="cart-row__meta">
                      {{ item.colorName }} · {{ item.sizeLabel }}
                    </p>
                    <p class="cart-row__price">{{ formatINR(item.price) }}</p>

                    <!-- Quantity Stepper -->
                    <div class="cart-row__qty" role="group" aria-label="Quantity">
                      <button
                        class="cart-row__qty-btn"
                        (click)="updateQty(item, item.quantity - 1)"
                        aria-label="Decrease quantity"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </button>
                      <span class="cart-row__qty-num" aria-label="Quantity: {{ item.quantity }}">{{ item.quantity }}</span>
                      <button
                        class="cart-row__qty-btn"
                        (click)="updateQty(item, item.quantity + 1)"
                        aria-label="Increase quantity"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Line Total + Remove -->
                  <div class="cart-row__right">
                    <p class="cart-row__line-total">{{ formatINR(item.price * item.quantity) }}</p>
                    <button
                      class="cart-row__remove"
                      (click)="removeItem(item.skuId)"
                      [attr.aria-label]="'Remove ' + item.productTitle + ' from cart'"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Order Summary Sidebar -->
            <div class="cart-page__summary">
              <div class="cart-page__summary-card">
                <h2 class="cart-page__summary-title">ORDER SUMMARY</h2>

                <div class="cart-page__summary-rows">
                  <div class="cart-page__summary-row">
                    <span>Subtotal ({{ itemCount() }} items)</span>
                    <span>{{ subtotal() }}</span>
                  </div>
                  <div class="cart-page__summary-row">
                    <span>Shipping</span>
                    <span class="cart-page__free">
                      @if (total() >= 999) {
                        FREE
                      } @else {
                        Calculated at checkout
                      }
                    </span>
                  </div>
                </div>

                <div class="cart-page__summary-divider"></div>

                <div class="cart-page__summary-row cart-page__summary-row--total">
                  <span>Total</span>
                  <span>{{ subtotal() }}</span>
                </div>

                @if (total() < 999) {
                  <p class="cart-page__free-shipping-note">
                    Add {{ formatINR(999 - total()) }} more for free shipping
                  </p>
                }

                <!-- Checkout Button (Phase 4) -->
                <button
                  class="btn-primary cart-page__checkout-btn"
                  disabled
                  aria-disabled="true"
                  title="Checkout coming soon"
                >
                  CHECKOUT — COMING SOON
                </button>

                <a routerLink="/" class="cart-page__continue">← Continue Shopping</a>
              </div>
            </div>
          </div>
        }
      </div>
    </main>
  `,
  styles: [`
    .cart-page {
      min-height: 100vh;
      padding-top: 80px;

      @media (max-width: 900px) {
        padding-top: 100px;
      }
    }

    .cart-page__inner {
      max-width: 1440px;
      margin: 0 auto;
      padding: 3rem 5%;
    }

    .cart-page__header {
      margin-bottom: 2.5rem;
      display: flex;
      align-items: baseline;
      gap: 1rem;
    }

    .cart-page__title {
      font-family: var(--font-display);
      font-size: clamp(2rem, 5vw, 3.5rem);
      letter-spacing: 0.06em;
      color: var(--cream);
    }

    .cart-page__count {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--muted);
    }

    /* Empty State */
    .cart-page__empty {
      text-align: center;
      padding: 5rem 0;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .cart-page__empty-icon {
      color: rgba(201, 168, 76, 0.2);
      margin-bottom: 1.5rem;
    }

    .cart-page__empty-title {
      font-family: var(--font-display);
      font-size: 2rem;
      letter-spacing: 0.08em;
      color: var(--cream);
      margin-bottom: 0.625rem;
    }

    .cart-page__empty-sub {
      font-family: var(--font-serif);
      font-style: italic;
      font-size: 1.1rem;
      color: var(--muted);
    }

    /* Layout */
    .cart-page__layout {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 3rem;
      align-items: start;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }

    /* Cart Row */
    .cart-row {
      display: grid;
      grid-template-columns: 100px 1fr auto;
      gap: 1.25rem;
      padding: 1.5rem 0;
      border-bottom: 1px solid rgba(245, 240, 232, 0.06);

      @media (max-width: 500px) {
        grid-template-columns: 80px 1fr;
        grid-template-rows: auto auto;

        .cart-row__right {
          grid-column: 1 / -1;
          flex-direction: row;
          justify-content: space-between;
        }
      }
    }

    .cart-row__image {
      width: 100px;
      aspect-ratio: 3/4;
      overflow: hidden;
      background: var(--surface);
      border: 1px solid rgba(245, 240, 232, 0.06);
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .cart-row__img-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 2rem;
      color: rgba(201, 168, 76, 0.2);
    }

    .cart-row__details {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .cart-row__title {
      font-family: var(--font-serif);
      font-style: italic;
      font-size: 1.1rem;
      color: var(--cream);
      text-decoration: none;
      transition: color 0.2s ease;
      line-height: 1.3;

      &:hover {
        color: var(--gold-light);
      }
    }

    .cart-row__meta {
      font-family: var(--font-sans);
      font-size: 0.75rem;
      color: var(--muted);
      letter-spacing: 0.05em;
    }

    .cart-row__price {
      font-family: var(--font-display);
      font-size: 1.1rem;
      letter-spacing: 0.05em;
      color: var(--gold);
    }

    .cart-row__qty {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.375rem;
    }

    .cart-row__qty-btn {
      width: 28px;
      height: 28px;
      border: 1px solid rgba(245, 240, 232, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--cream);
      cursor: pointer;
      background: transparent;
      transition: border-color 0.2s ease, color 0.2s ease;

      &:hover {
        border-color: var(--gold);
        color: var(--gold);
      }
    }

    .cart-row__qty-num {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--cream);
      min-width: 1rem;
      text-align: center;
    }

    .cart-row__right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.5rem;
    }

    .cart-row__line-total {
      font-family: var(--font-display);
      font-size: 1.1rem;
      letter-spacing: 0.05em;
      color: var(--cream);
    }

    .cart-row__remove {
      color: var(--muted);
      cursor: pointer;
      background: none;
      border: none;
      padding: 4px;
      transition: color 0.2s ease;

      &:hover {
        color: #e84c4c;
      }
    }

    /* Summary */
    .cart-page__summary-card {
      background: var(--surface);
      border: 1px solid rgba(245, 240, 232, 0.06);
      padding: 2rem;
      position: sticky;
      top: 90px;
    }

    .cart-page__summary-title {
      font-family: var(--font-display);
      font-size: 0.875rem;
      letter-spacing: 0.25em;
      color: var(--cream);
      margin-bottom: 1.5rem;
    }

    .cart-page__summary-rows {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .cart-page__summary-row {
      display: flex;
      justify-content: space-between;
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--muted);

      &--total {
        font-family: var(--font-display);
        font-size: 1.1rem;
        letter-spacing: 0.08em;
        color: var(--cream);
        margin-top: 0.5rem;
      }
    }

    .cart-page__free {
      color: #4caf7d;
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      font-family: var(--font-display);
    }

    .cart-page__summary-divider {
      width: 100%;
      height: 1px;
      background: rgba(245, 240, 232, 0.06);
      margin: 1rem 0;
    }

    .cart-page__free-shipping-note {
      font-family: var(--font-sans);
      font-size: 0.75rem;
      color: var(--muted);
      margin-top: 0.75rem;
      text-align: center;
    }

    .cart-page__checkout-btn {
      width: 100%;
      margin-top: 1.5rem;
      opacity: 0.5;
      cursor: not-allowed;

      &::after {
        display: none;
      }
    }

    .cart-page__continue {
      display: block;
      text-align: center;
      font-family: var(--font-sans);
      font-size: 0.75rem;
      color: var(--muted);
      text-decoration: none;
      margin-top: 1rem;
      transition: color 0.2s ease;
      letter-spacing: 0.05em;

      &:hover {
        color: var(--cream);
      }
    }
  `],
})
export class CartComponent {
  private readonly cartService = inject(CartService);

  readonly items = this.cartService.items;
  readonly total = this.cartService.total;
  readonly itemCount = this.cartService.count;
  readonly subtotal = computed(() => formatINR(this.total()));

  readonly formatINR = formatINR;

  updateQty(item: CartItem, qty: number): void {
    this.cartService.updateQty(item.skuId, qty);
  }

  removeItem(skuId: string): void {
    this.cartService.removeItem(skuId);
  }
}

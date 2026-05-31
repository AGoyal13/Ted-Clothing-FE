import {
  Component,
  input,
  inject,
  signal,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Product,
  getEffectivePrice,
  getBasePrice,
  formatINR,
  hasDiscount,
  isNewArrival,
  isInStock,
  getImagesForColor,
} from '../../core/models/product.model';
import { AuthService } from '../../core/services/auth.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { CartService } from '../../core/services/cart.service';
import { CartItem } from '../../core/models/cart.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="card" [style.--delay]="delay()">
      <a [routerLink]="['/product', product().slug]" class="card__image-link" aria-label="{{ product().title }}">

        <!-- Badges -->
        <div class="card__badges">
          @if (outOfStock()) {
            <span class="badge badge--oos">OUT OF STOCK</span>
          } @else {
            @if (isNew()) {
              <span class="badge badge--new">NEW</span>
            }
            @if (discountPct() > 20) {
              <span class="badge badge--crazy-deal">CRAZY DEAL</span>
            } @else if (discountPct() > 7) {
              <span class="badge badge--price-crash">PRICE CRASH</span>
            }
          }
        </div>

        <!-- Wishlist -->
        <button
          class="card__wishlist"
          [class.card__wishlist--active]="wishlisted()"
          [attr.aria-label]="wishlisted() ? 'Remove from wishlist' : 'Add to wishlist'"
          (click)="toggleWishlist($event)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"
            [attr.fill]="wishlisted() ? 'currentColor' : 'none'">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>

        <!-- Image -->
        <div class="card__image-wrap aspect-3-4">
          @if (currentImage()) {
            <img
              [src]="currentImage()"
              [alt]="product().title"
              loading="lazy"
              width="400"
              height="533"
              class="card__img"
            />
          } @else {
            <div class="card__img-placeholder">
              <span>{{ product().title.charAt(0) }}</span>
            </div>
          }
          <div class="card__overlay"></div>
        </div>

        <!-- Hover size bar — display-only; no quick add (customer must visit PDP to purchase) -->
        <div class="card__quick-add">
          @if (outOfStock()) {
            <span class="card__quick-add-label">OUT OF STOCK</span>
          } @else if (selectedColorOos()) {
            <span class="card__quick-add-label card__quick-add-label--hint">Try another colour</span>
          } @else if (isFreeSize()) {
            <span class="card__quick-add-label">ONE SIZE</span>
          } @else {
            <span class="card__quick-add-label">SIZES</span>
            <div class="card__sizes">
              @for (size of availableSizes(); track size.label) {
                <span
                  class="card__size-label"
                  [class.card__size-label--oos]="!size.inStock"
                >{{ size.label }}</span>
              }
            </div>
          }
        </div>
      </a>

      <!-- Card Info -->
      <div class="card__info">
        <!-- Color Swatches -->
        @if (product().colors.length > 1) {
          <div class="card__swatches">
            @for (color of product().colors; track color.id) {
              <!-- Desktop: select color in place -->
              <button
                class="card__swatch card__swatch--btn"
                [class.card__swatch--active]="(selectedColorId() ?? product().colors[0]?.id) === color.id"
                [class.card__swatch--oos]="colorOosMap().get(color.id)"
                [style.background]="color.colorHex || '#6b6560'"
                [attr.aria-label]="color.colorName + (colorOosMap().get(color.id) ? ' (Out of Stock)' : '')"
                (click)="selectColor(color.id)"
                [title]="color.colorName"
              ></button>
              <!-- Mobile: navigate to PDP -->
              <a
                class="card__swatch card__swatch--link"
                [routerLink]="['/product', product().slug]"
                [class.card__swatch--active]="(selectedColorId() ?? product().colors[0]?.id) === color.id"
                [class.card__swatch--oos]="colorOosMap().get(color.id)"
                [style.background]="color.colorHex || '#6b6560'"
                [attr.aria-label]="color.colorName + (colorOosMap().get(color.id) ? ' (Out of Stock)' : '')"
                [title]="color.colorName"
              ></a>
            }
          </div>
        }

        <!-- Category -->
        <p class="card__category">{{ product().category.name }}</p>

        <!-- Title -->
        <a [routerLink]="['/product', product().slug]" class="card__title-link">
          <h3 class="card__title">{{ product().title }}</h3>
        </a>

        <!-- Price — strikethrough + discount % only when discountPercent > 0 -->
        <div class="card__price">
          @if (onSale()) {
            <span class="card__price-original">{{ originalPriceStr() }}</span>
            <span class="card__price-sale">{{ effectivePriceStr() }}</span>
            <span class="card__price-discount">{{ discountLabel() }}</span>
          } @else {
            <span class="card__price-base">{{ effectivePriceStr() }}</span>
          }
        </div>
      </div>

      <!-- Mobile size info — tapping anywhere navigates to PDP -->
      @if (!outOfStock()) {
        <a [routerLink]="['/product', product().slug]" class="card__mobile-qa">
          @if (selectedColorOos()) {
            <span class="card__quick-add-label card__quick-add-label--hint">Try another colour</span>
          } @else if (isFreeSize()) {
            <span class="card__quick-add-label">ONE SIZE</span>
          } @else {
            <div class="card__sizes">
              @for (size of availableSizes(); track size.label) {
                <span class="card__size-label" [class.card__size-label--oos]="!size.inStock">{{ size.label }}</span>
              }
            </div>
          }
        </a>
      }

      <!-- Mobile Quick Add (original — disabled: no PLP cart actions) -->
      @if (false) {
        @if (!outOfStock()) {
          <div class="card__mobile-qa">
            @if (selectedColorOos()) {
              <span class="card__quick-add-label card__quick-add-label--hint">Try another colour</span>
            } @else if (isFreeSize()) {
              @if (singleSize(); as size) {
                <button
                  class="card__mobile-add-btn"
                  [class.card__mobile-add-btn--added]="recentlyAdded() === size?.skuId"
                  (click)="addToCart($event, size)"
                >
                  @if (recentlyAdded() === size?.skuId) {
                    ✓ ADDED
                  } @else {
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                    ADD TO BAG
                  }
                </button>
              }
            } @else {
              <span class="card__quick-add-label">QUICK ADD</span>
              <div class="card__sizes" style="margin-top:0.375rem">
                @for (size of availableSizes(); track size.label) {
                  <button
                    class="card__size-chip"
                    [class.card__size-chip--oos]="!size.inStock"
                    [class.card__size-chip--added]="recentlyAdded() === size.skuId"
                    (click)="addToCart($event, size)"
                    [disabled]="!size.inStock"
                  >{{ recentlyAdded() === size.skuId ? '✓' : size.label }}</button>
                }
              </div>
            }
          </div>
        }
      }
    </article>
  `,
  styles: [`
    .card {
      display: flex;
      flex-direction: column;
      position: relative;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: border-color 0.3s ease;

      &:hover .card__image-wrap img {
        transform: scale(1.03);
      }

      &:hover .card__image-wrap {
        border-color: rgba(201, 168, 76, 0.3);
      }

      &:hover .card__quick-add {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .card__image-link {
      position: relative;
      display: block;
      text-decoration: none;
    }

    .card__image-wrap {
      border: 1px solid rgba(245, 240, 232, 0.06);
      transition: border-color 0.3s ease;
      position: relative;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s var(--ease-enter);
      }
    }

    .card__img-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface);
      font-family: var(--font-display);
      font-size: 4rem;
      color: rgba(201, 168, 76, 0.2);
    }

    .card__overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60%;
      background: linear-gradient(to top, rgba(13, 13, 13, 0.6) 0%, transparent 100%);
      pointer-events: none;
    }

    .card__badges {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      z-index: 2;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.5rem;
      font-family: var(--font-display);
      font-size: 0.625rem;
      letter-spacing: 0.15em;
    }

    .badge--new {
      background: var(--gold);
      color: var(--bg);
    }

    .badge--sale {
      background: #8b1a1a;
      color: #ffcccc;
    }

    .badge--crazy-deal {
      background: #c0392b;
      color: #fff;
      font-weight: 600;
    }

    .badge--price-crash {
      background: #e67e22;
      color: #fff;
    }

    .badge--oos {
      background: rgba(245, 240, 232, 0.1);
      color: var(--muted);
      border: 1px solid rgba(245, 240, 232, 0.15);
    }

    .card__wishlist {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      z-index: 2;
      background: rgba(13, 13, 13, 0.5);
      border: none;
      border-radius: 50%;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--cream);
      opacity: 0;
      transition: opacity 0.2s ease, color 0.2s ease, background 0.2s ease;

      &:hover {
        color: var(--gold);
        background: rgba(13, 13, 13, 0.8);
      }

      &.card__wishlist--active {
        opacity: 1;
        color: var(--gold);
      }
    }

    .card:hover .card__wishlist {
      opacity: 1;
    }

    .card__quick-add {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(13, 13, 13, 0.9);
      padding: 0.75rem;
      transform: translateY(100%);
      opacity: 0;
      transition: transform 0.35s var(--ease-enter), opacity 0.35s ease;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;

      @media (hover: none) and (pointer: coarse) {
        display: none;
      }
    }

    .card__mobile-qa {
      display: none;
      text-decoration: none;

      /* Show size labels only on larger touch screens (tablets ≥769px); hide on phones (2-col grid) */
      @media (hover: none) and (pointer: coarse) and (min-width: 769px) {
        display: block;
        border-top: 1px solid rgba(245, 240, 232, 0.06);
        padding: 0.5rem 0.375rem 0.625rem;
      }
    }

    /* ── Mobile compact (2-col grid) ──────────────────────────────────── */
    @media (max-width: 768px) {
      .card__category {
        display: none;
      }

      .card__info {
        padding: 0.5rem 0.1rem 0;
        gap: 0.15rem;
      }

      .card__title {
        font-size: 0.82rem;
      }

      .card__price-base,
      .card__price-sale {
        font-size: 0.92rem;
      }

      .card__price-original {
        font-size: 0.72rem;
      }

      .card__price-discount {
        font-size: 0.65rem;
      }

      .card__price {
        gap: 0.35rem;
      }

      /* Always show wishlist button on mobile (no hover state) */
      .card__wishlist {
        opacity: 1;
        width: 30px;
        height: 30px;
      }
    }

    /* .card__mobile-add-btn — disabled: no PLP add-to-cart button */
    /* .card__mobile-add-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.5rem;
      background: transparent;
      border: 1px solid rgba(201, 168, 76, 0.5);
      color: var(--gold);
      -webkit-tap-highlight-color: transparent;
      font-family: var(--font-display);
      font-size: 0.625rem;
      letter-spacing: 0.2em;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;

      &:active {
        background: rgba(201, 168, 76, 0.45);
        border-color: var(--gold);
        color: #0d0d0d;
      }

      &--added {
        background: var(--gold);
        color: #0d0d0d;
        border-color: var(--gold);
      }
    } */

    .card__quick-add-label {
      font-family: var(--font-display);
      font-size: 0.625rem;
      letter-spacing: 0.25em;
      color: var(--gold);

      &--hint {
        color: var(--muted);
        font-family: var(--font-serif);
        font-style: italic;
        letter-spacing: 0.05em;
        font-size: 0.7rem;
      }
    }

    /* .card__hover-add-btn — disabled: no PLP add-to-cart button on hover */
    /* .card__hover-add-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.5rem;
      background: transparent;
      border: 1px solid rgba(201, 168, 76, 0.6);
      color: var(--gold);
      font-family: var(--font-display);
      font-size: 0.625rem;
      letter-spacing: 0.2em;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;

      &:hover {
        background: var(--gold);
        color: #0d0d0d;
        border-color: var(--gold);
      }

      &--added {
        background: var(--gold);
        color: #0d0d0d;
        border-color: var(--gold);
      }
    } */

    .card__sizes {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    /* .card__size-chip — disabled: no clickable size chips on PLP */
    /* .card__size-chip {
      font-family: var(--font-sans);
      font-size: 0.7rem;
      font-weight: 500;
      padding: 0.2rem 0.5rem;
      border: 1px solid rgba(245, 240, 232, 0.25);
      color: var(--cream);
      background: transparent;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;

      &:hover:not(:disabled) {
        border-color: var(--gold);
        color: var(--gold);
      }

      &:active:not(:disabled) {
        border-color: var(--gold);
        background: rgba(201, 168, 76, 0.45);
        color: var(--gold);
      }

      &.card__size-chip--oos,
      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
        text-decoration: line-through;
      }

      &.card__size-chip--added {
        border-color: var(--gold);
        background: var(--gold);
        color: #0d0d0d;
        cursor: default;
      }
    } */

    .card__size-label {
      font-family: var(--font-sans);
      font-size: 0.7rem;
      font-weight: 500;
      padding: 0.2rem 0.5rem;
      border: 1px solid rgba(245, 240, 232, 0.25);
      color: var(--cream);

      &.card__size-label--oos {
        opacity: 0.35;
        text-decoration: line-through;
      }
    }

    .card__info {
      padding: 0.875rem 0.25rem 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .card__swatches {
      display: flex;
      gap: 6px;
      margin-bottom: 0.25rem;
    }

    .card__swatch {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1px solid transparent;
      cursor: pointer;
      position: relative;
      transition: transform 0.2s ease, border-color 0.2s ease;
      text-decoration: none;

      &.card__swatch--active {
        border-color: var(--cream);
        transform: scale(1.2);
      }

      &:hover {
        transform: scale(1.15);
      }

      &.card__swatch--oos {
        opacity: 0.35;

        &::after {
          content: '';
          position: absolute;
          top: 50%;
          left: -2px;
          right: -2px;
          height: 1.5px;
          background: rgba(245, 240, 232, 0.8);
          transform: translateY(-50%) rotate(-45deg);
        }
      }
    }

    /* Desktop: show button, hide anchor */
    .card__swatch--link { display: none; }

    @media (max-width: 768px) {
      /* Mobile: hide button, show anchor */
      .card__swatch--btn { display: none; }
      .card__swatch--link { display: block; }
    }

    .card__category {
      font-family: var(--font-sans);
      font-size: 0.65rem;
      font-weight: 500;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .card__title-link {
      text-decoration: none;
    }

    .card__title {
      font-family: var(--font-serif);
      font-style: italic;
      font-weight: 400;
      font-size: 1rem;
      color: var(--cream);
      line-height: 1.3;
      transition: color 0.2s ease;

      &:hover {
        color: var(--gold-light);
      }
    }

    .card__price {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.125rem;
    }

    .card__price-base {
      font-family: var(--font-display);
      font-size: 1.1rem;
      color: var(--gold);
      letter-spacing: 0.05em;
    }

    .card__price-sale {
      font-family: var(--font-display);
      font-size: 1.1rem;
      color: var(--gold);
      letter-spacing: 0.05em;
    }

    .card__price-original {
      font-family: var(--font-sans);
      font-size: 0.8rem;
      color: var(--muted);
      text-decoration: line-through;
    }

    .card__price-discount {
      font-family: var(--font-display);
      font-size: 0.72rem;
      letter-spacing: 0.1em;
      color: #4caf7d;
    }
  `],
})
export class ProductCardComponent {
  private readonly authService = inject(AuthService);
  private readonly wishlistService = inject(WishlistService);
  private readonly cartService = inject(CartService);

  readonly product = input.required<Product>();
  readonly delay = input<string>('0ms');

  readonly selectedColorId = signal<string | null>(null);
  // PLP quick-add disabled — preserved because mobile @if(false) block references these
  readonly recentlyAdded = signal<string | null>(null);
  private addedTimer: ReturnType<typeof setTimeout> | null = null;

  readonly singleSize = computed(() => {
    const inStock = this.availableSizes().filter(s => s.inStock);
    return inStock.length === 1 ? inStock[0] : null;
  });

  private readonly FREE_SIZE_LABELS = new Set([
    'free size', 'freesize', 'free sz',
    'one size', 'onesize', 'one-size', 'one sz',
    'free', 'os', 'osfm',
    'universal', 'standard', 'single size', 'u',
  ]);

  readonly isFreeSize = computed(() => {
    const single = this.singleSize();
    return single !== null && this.FREE_SIZE_LABELS.has(single.label.toLowerCase().trim());
  });

  readonly wishlisted = computed(() =>
    this.wishlistService.isWishlisted(this.product().id)
  );

  readonly currentImage = computed(() => {
    const colorId = this.selectedColorId() || this.product().colors?.[0]?.id;
    const images = getImagesForColor(this.product(), colorId ?? undefined);
    return images[0] ?? null;
  });

  readonly onSale = computed(() => hasDiscount(this.product()));
  readonly discountPct = computed(() => parseFloat(this.product().discountPercent ?? '0'));
  readonly discountLabel = computed(() => {
    const pct = this.discountPct();
    return pct > 0 ? `${Math.round(pct)}% OFF` : '';
  });
  readonly isNew = computed(() => isNewArrival(this.product()));
  readonly outOfStock = computed(() => {
    const items = this.cartService.items();
    return !this.product().skus.some(s => {
      const cartQty = items.find(i => i.skuId === s.id)?.quantity ?? 0;
      return s.stockQty > cartQty;
    });
  });

  readonly colorOosMap = computed(() => {
    const skus = this.product().skus || [];
    const items = this.cartService.items();
    const map = new Map<string, boolean>();
    for (const color of this.product().colors) {
      const colorSkus = skus.filter(s => s.colorId === color.id);
      const isOos = colorSkus.length === 0 || !colorSkus.some(s => {
        const cartQty = items.find(i => i.skuId === s.id)?.quantity ?? 0;
        return s.stockQty > cartQty;
      });
      map.set(color.id, isOos);
    }
    return map;
  });

  readonly selectedColorOos = computed(() => {
    if (this.outOfStock()) return false;
    return this.availableSizes().every(s => !s.inStock);
  });

  readonly effectivePriceStr = computed(() =>
    formatINR(getEffectivePrice(this.product()))
  );

  readonly originalPriceStr = computed(() =>
    formatINR(getBasePrice(this.product()))
  );

  readonly availableSizes = computed(() => {
    const colorId = this.selectedColorId() || this.product().colors?.[0]?.id;
    const skus = this.product().skus || [];
    const filtered = colorId
      ? skus.filter(s => s.colorId === colorId)
      : skus;

    const seen = new Set<string>();
    return filtered
      .filter(s => {
        if (seen.has(s.sizeLabel)) return false;
        seen.add(s.sizeLabel);
        return true;
      })
      .map(s => {
        const cartQty = this.cartService.items().find(i => i.skuId === s.id)?.quantity ?? 0;
        return { label: s.sizeLabel, inStock: s.stockQty > cartQty, skuId: s.id, stockQty: s.stockQty };
      });
  });

  selectColor(colorId: string): void {
    this.selectedColorId.set(colorId);
  }

  // PLP quick-add disabled — no cart actions from product listing; customer visits PDP to purchase
  addToCart(event: Event, size: { skuId: string; label: string; stockQty: number }): void {
    event.preventDefault();
    event.stopPropagation();

    const currentQty = this.cartService.items().find(i => i.skuId === size.skuId)?.quantity ?? 0;
    if (currentQty >= size.stockQty) return;

    const p = this.product();
    const colorId = this.selectedColorId() || p.colors?.[0]?.id;
    const color = p.colors?.find(c => c.id === colorId);

    const item: CartItem = {
      skuId: size.skuId,
      skuCode: '',
      productSlug: p.slug,
      productTitle: p.title,
      colorName: color?.colorName ?? '',
      sizeLabel: size.label,
      price: getEffectivePrice(p),
      quantity: 1,
      image: color?.images?.[0] ?? null,
    };

    this.cartService.addItem(item);

    if (this.addedTimer) clearTimeout(this.addedTimer);
    this.recentlyAdded.set(size.skuId);
    this.addedTimer = setTimeout(() => this.recentlyAdded.set(null), 1500);
  }

  toggleWishlist(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.authService.isLoggedIn()) {
      this.authService.openModal();
      return;
    }
    const skuId = this.product().skus?.[0]?.id;
    if (!skuId) return;
    this.wishlistService.toggle(this.product().id, skuId);
  }
}

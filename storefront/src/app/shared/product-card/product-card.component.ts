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
  getImagesForColor,
} from '../../core/models/product.model';
import { AuthService } from '../../core/services/auth.service';
import { WishlistService } from '../../core/services/wishlist.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="card" [style.--delay]="delay()">
      <a [routerLink]="['/product', product().slug]" class="card__image-link" aria-label="{{ product().title }}">

        <!-- Badges -->
        <div class="card__badges">
          @if (isNew()) {
            <span class="badge badge--new">NEW</span>
          }
          @if (onSale()) {
            <span class="badge badge--sale">SALE</span>
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

        <!-- Quick Add Bar (hover) -->
        <div class="card__quick-add">
          <span class="card__quick-add-label">QUICK ADD</span>
          <div class="card__sizes">
            @for (size of availableSizes(); track size.label) {
              <button
                class="card__size-chip"
                [class.card__size-chip--oos]="!size.inStock"
                (click)="$event.preventDefault(); $event.stopPropagation()"
                [attr.aria-label]="'Add size ' + size.label"
                [disabled]="!size.inStock"
              >{{ size.label }}</button>
            }
          </div>
        </div>
      </a>

      <!-- Card Info -->
      <div class="card__info">
        <!-- Color Swatches -->
        @if (product().colors.length > 1) {
          <div class="card__swatches">
            @for (color of product().colors; track color.id) {
              <button
                class="card__swatch"
                [class.card__swatch--active]="selectedColorId() === color.id"
                [style.background]="color.colorHex || '#6b6560'"
                [attr.aria-label]="color.colorName"
                (click)="selectColor(color.id)"
                [title]="color.colorName"
              ></button>
            }
          </div>
        }

        <!-- Category -->
        <p class="card__category">{{ product().category.name }}</p>

        <!-- Title -->
        <a [routerLink]="['/product', product().slug]" class="card__title-link">
          <h3 class="card__title">{{ product().title }}</h3>
        </a>

        <!-- Price -->
        <div class="card__price">
          @if (onSale()) {
            <span class="card__price-original">{{ originalPriceStr() }}</span>
            <span class="card__price-sale">{{ effectivePriceStr() }}</span>
          } @else {
            <span class="card__price-base">{{ effectivePriceStr() }}</span>
          }
        </div>
      </div>
    </article>
  `,
  styles: [`
    .card {
      display: flex;
      flex-direction: column;
      position: relative;
      cursor: pointer;
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
    }

    .card__quick-add-label {
      font-family: var(--font-display);
      font-size: 0.625rem;
      letter-spacing: 0.25em;
      color: var(--gold);
    }

    .card__sizes {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .card__size-chip {
      font-family: var(--font-sans);
      font-size: 0.7rem;
      font-weight: 500;
      padding: 0.2rem 0.5rem;
      border: 1px solid rgba(245, 240, 232, 0.25);
      color: var(--cream);
      background: transparent;
      cursor: pointer;
      transition: border-color 0.2s ease, color 0.2s ease;

      &:hover:not(:disabled) {
        border-color: var(--gold);
        color: var(--gold);
      }

      &.card__size-chip--oos,
      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
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
      transition: transform 0.2s ease, border-color 0.2s ease;

      &.card__swatch--active {
        border-color: var(--cream);
        transform: scale(1.2);
      }

      &:hover {
        transform: scale(1.15);
      }
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
  `],
})
export class ProductCardComponent {
  private readonly authService = inject(AuthService);
  private readonly wishlistService = inject(WishlistService);

  readonly product = input.required<Product>();
  readonly delay = input<string>('0ms');

  readonly selectedColorId = signal<string | null>(null);

  readonly wishlisted = computed(() =>
    this.wishlistService.isWishlisted(this.product().id)
  );

  readonly currentImage = computed(() => {
    const colorId = this.selectedColorId() || this.product().colors?.[0]?.id;
    const images = getImagesForColor(this.product(), colorId ?? undefined);
    return images[0] ?? null;
  });

  readonly onSale = computed(() => hasDiscount(this.product()));
  readonly isNew = computed(() => isNewArrival(this.product()));

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
      .map(s => ({ label: s.sizeLabel, inStock: s.stockQty > 0 }));
  });

  selectColor(colorId: string): void {
    this.selectedColorId.set(colorId);
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

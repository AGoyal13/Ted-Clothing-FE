import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
  untracked,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { ApiService } from '../../core/services/api.service';
import {
  ProductDetail,
  ProductSku,
  formatINR,
  getEffectivePrice,
  getBasePrice,
  hasDiscount,
} from '../../core/models/product.model';
import { CartItem } from '../../core/models/cart.model';

interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  verified: boolean;
  createdAt: string;
  authorName: string;
}

interface ReviewsAggregate {
  avgRating: number;
  totalCount: number;
  distribution: Record<number, number>;
}

interface ReviewsResponse {
  aggregate: ReviewsAggregate;
  reviews: ReviewItem[];
  page: number;
  limit: number;
  totalPages: number;
}

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <main class="pdp">
      @if (loading()) {
        <div class="pdp__loading">
          <div class="pdp__inner">
            <div class="pdp__gallery-skeleton">
              <div class="skeleton pdp__main-img-skeleton"></div>
              <div class="pdp__thumbs-row">
                @for (i of [1,2,3]; track i) {
                  <div class="skeleton pdp__thumb-skeleton"></div>
                }
              </div>
            </div>
            <div class="pdp__info-skeleton">
              <div class="skeleton" style="height:16px;width:40%;"></div>
              <div class="skeleton" style="height:52px;width:90%;margin-top:12px;"></div>
              <div class="skeleton" style="height:30px;width:30%;margin-top:16px;"></div>
            </div>
          </div>
        </div>
      } @else if (notFound()) {
        <div class="pdp__not-found">
          <h1 class="pdp__not-found-title">PRODUCT NOT FOUND</h1>
          <p class="pdp__not-found-sub">
            <em>This piece may no longer be available.</em>
          </p>
          <a routerLink="/" class="btn-primary" style="margin-top:2rem;">Return Home</a>
        </div>
      } @else if (product()) {
        <div class="pdp__inner">

          <!-- Gallery -->
          <div class="pdp__gallery">
            <!-- Main Image -->
            <div class="pdp__main-image aspect-3-4">
              @if (currentImage()) {
                <img
                  [src]="currentImage()"
                  [alt]="product()!.title"
                  loading="eager"
                  width="600"
                  height="800"
                />
              } @else {
                <div class="pdp__img-placeholder">
                  <span>{{ product()!.title.charAt(0) }}</span>
                </div>
              }
            </div>

            <!-- Thumbnails -->
            @if (currentImages().length > 1) {
              <div class="pdp__thumbs">
                @for (img of currentImages().slice(0, 5); track img; let i = $index) {
                  <button
                    class="pdp__thumb"
                    [class.pdp__thumb--active]="selectedThumbIndex() === i"
                    (click)="selectThumb(i)"
                    [attr.aria-label]="'View image ' + (i + 1)"
                  >
                    <img [src]="img" [alt]="'Product image ' + (i + 1)" loading="lazy" width="80" height="106" />
                  </button>
                }
              </div>
            }
          </div>

          <!-- Product Info -->
          <div class="pdp__info">

            <!-- Breadcrumb -->
            <nav class="pdp__breadcrumb" aria-label="Breadcrumb">
              <a routerLink="/" class="pdp__bc-link">Home</a>
              <span class="pdp__bc-sep" aria-hidden="true">/</span>
              <a
                [routerLink]="['/category', product()!.category.slug]"
                class="pdp__bc-link"
              >{{ product()!.category.name }}</a>
              <span class="pdp__bc-sep" aria-hidden="true">/</span>
              <span class="pdp__bc-current">{{ product()!.title }}</span>
            </nav>

            <!-- Title -->
            <h1 class="pdp__title">{{ product()!.title }}</h1>

            <!-- Price -->
            <div class="pdp__price" aria-label="Price">
              @if (onSale()) {
                <span class="pdp__price-original">{{ originalPrice() }}</span>
                <span class="pdp__price-sale">{{ effectivePrice() }}</span>
                <span class="pdp__discount-badge">
                  {{ product()!.discountPercent }}% OFF
                </span>
              } @else {
                <span class="pdp__price-base">{{ effectivePrice() }}</span>
              }
            </div>

            <!-- Color Selector -->
            @if (product()!.colors && product()!.colors.length > 0) {
              <div class="pdp__field">
                <p class="pdp__field-label">
                  COLOR:
                  <span class="pdp__field-value">{{ selectedColorName() }}</span>
                </p>
                <div class="pdp__colors" role="group" aria-label="Select color">
                  @for (color of product()!.colors; track color.id) {
                    <button
                      class="pdp__color-swatch"
                      [class.pdp__color-swatch--active]="selectedColorId() === color.id"
                      [class.pdp__color-swatch--oos]="colorOosMap().get(color.id)"
                      [style.background]="color.colorHex || '#6b6560'"
                      [attr.aria-label]="color.colorName + (colorOosMap().get(color.id) ? ' (Out of Stock)' : '')"
                      [attr.aria-pressed]="selectedColorId() === color.id"
                      (click)="selectColor(color.id)"
                    ></button>
                  }
                </div>
              </div>
            }

            <!-- Size Selector -->
            @if (isFreeSize()) {
              <p class="pdp__field-label">SIZE: <span class="pdp__field-value">One Size</span></p>
            } @else if (sizesForColor().length > 0) {
              <div class="pdp__field">
                <p class="pdp__field-label">
                  SIZE:
                  @if (selectedSize()) {
                    <span class="pdp__field-value">{{ selectedSize() }}</span>
                  }
                </p>
                <div class="pdp__sizes" role="group" aria-label="Select size">
                  @for (sku of sizesForColor(); track sku.id) {
                    <button
                      class="pdp__size-chip"
                      [class.pdp__size-chip--active]="selectedSkuId() === sku.id"
                      [class.pdp__size-chip--oos]="effectiveStock(sku.id, sku.stockQty) <= 0"
                      [disabled]="effectiveStock(sku.id, sku.stockQty) <= 0"
                      [attr.aria-label]="sku.sizeLabel + (effectiveStock(sku.id, sku.stockQty) <= 0 ? ' - Out of stock' : '')"
                      [attr.aria-pressed]="selectedSkuId() === sku.id"
                      (click)="selectSize(sku)"
                    >{{ sku.sizeLabel }}</button>
                  }
                </div>
              </div>
            }

            <!-- Stock Indicator -->
            @if (selectedSkuId() || allSizesOos()) {
              <div class="pdp__stock" [attr.data-status]="allSizesOos() ? 'oos' : stockStatus()">
                <span class="pdp__stock-dot"></span>
                <span class="pdp__stock-text">{{ allSizesOos() && !selectedSkuId() ? 'Out of Stock' : stockStatusText() }}</span>
              </div>
            }

            <!-- Add to Cart + Wishlist -->
            <div class="pdp__actions-row">
              <button
                class="pdp__add-btn btn-primary"
                [class.pdp__add-btn--added]="addedToCart()"
                (click)="addToCart()"
                [disabled]="allSizesOos() || !selectedSkuId() || stockStatus() === 'oos'"
                [attr.aria-label]="'Add ' + product()!.title + ' to cart'"
              >
                @if (allSizesOos()) {
                  OUT OF STOCK
                } @else if (addedToCart()) {
                  ✓ ADDED TO CART
                } @else if (!selectedSkuId()) {
                  SELECT A SIZE
                } @else if (stockStatus() === 'oos') {
                  OUT OF STOCK
                } @else {
                  ADD TO CART
                }
              </button>

              <button
                class="pdp__wishlist-btn"
                [class.pdp__wishlist-btn--active]="wishlisted()"
                (click)="toggleWishlist()"
                [attr.aria-label]="wishlisted() ? 'Remove from wishlist' : 'Add to wishlist'"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                     [attr.fill]="wishlisted() ? 'currentColor' : 'none'">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>

              <button
                class="pdp__share-btn"
                [class.pdp__share-btn--copied]="linkCopied()"
                (click)="shareProduct()"
                [attr.aria-label]="linkCopied() ? 'Link copied' : 'Share this product'"
              >
                @if (linkCopied()) {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                } @else {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                }
              </button>
            </div>

            <!-- Notify Me When Back in Stock -->
            @if (allSizesOos()) {
              @if (notifySent()) {
                <p class="pdp__notify-success">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  You're on the list! We'll email you when it's back.
                </p>
              } @else if (!notifyOpen()) {
                <button class="pdp__notify-trigger" (click)="openNotify()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  NOTIFY ME WHEN BACK IN STOCK
                </button>
              } @else {
                <div class="pdp__notify-form">
                  <p class="pdp__notify-hint">We'll email you when this is available again.</p>
                  <div class="pdp__notify-row">
                    <input
                      type="email"
                      class="pdp__notify-input"
                      placeholder="your@email.com"
                      [value]="notifyEmail()"
                      (input)="notifyEmail.set($any($event.target).value)"
                      [disabled]="notifySending()"
                    />
                    <button
                      class="btn-primary pdp__notify-submit"
                      (click)="submitNotify()"
                      [disabled]="!notifyEmail().trim() || notifySending()"
                    >
                      @if (notifySending()) {
                        <span class="pdp__notify-spinner"></span>
                      } @else {
                        NOTIFY ME
                      }
                    </button>
                  </div>
                </div>
              }
            }

            <!-- Description -->
            @if (product()!.description) {
              <div class="pdp__description">
                <button
                  class="pdp__desc-toggle"
                  (click)="toggleDescription()"
                  [attr.aria-expanded]="descExpanded()"
                >
                  DESCRIPTION
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    [style.transform]="descExpanded() ? 'rotate(180deg)' : 'rotate(0deg)'"
                    style="transition:transform 0.3s ease;"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                @if (descExpanded()) {
                  <div class="pdp__desc-body">
                    <p>{{ product()!.description }}</p>
                  </div>
                }
              </div>
            }

            <!-- Measurements Table -->
            @if (selectedSku() && hasMeasurements()) {
              <div class="pdp__measurements">
                <button class="pdp__desc-toggle" (click)="toggleMeasurements()" [attr.aria-expanded]="measExpanded()">
                  MEASUREMENTS &amp; DETAILS
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                    [style.transform]="measExpanded() ? 'rotate(180deg)' : 'rotate(0deg)'"
                    style="transition:transform 0.3s ease;">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                @if (measExpanded()) {
                  <div class="pdp__meas-body">
                    <table class="pdp__meas-table" aria-label="Product measurements">
                      <tbody>
                        @for (entry of measurementEntries(); track entry.key) {
                          <tr>
                            <th>{{ entry.key }}</th>
                            <td>{{ entry.value }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Reviews -->
        @if (reviewsAggregate() && reviewsAggregate()!.totalCount > 0) {
          <section class="pdp__reviews">
            <div class="pdp__reviews-inner">
              <h2 class="pdp__reviews-heading">Customer Reviews</h2>

              <div class="pdp__rev-agg">
                <div class="pdp__rev-score">
                  <span class="pdp__rev-avg">{{ reviewsAggregate()!.avgRating.toFixed(1) }}</span>
                  <div class="pdp__rev-stars-row">
                    @for (i of [1,2,3,4,5]; track i) {
                      <span class="pdp__rev-star" [class.active]="i <= reviewsAggregate()!.avgRating">★</span>
                    }
                  </div>
                  <span class="pdp__rev-count">
                    {{ reviewsAggregate()!.totalCount }}
                    {{ reviewsAggregate()!.totalCount === 1 ? 'review' : 'reviews' }}
                  </span>
                </div>
                <div class="pdp__rev-bars">
                  @for (star of [5,4,3,2,1]; track star) {
                    <div class="pdp__rev-bar-row">
                      <span class="pdp__rev-bar-label">{{ star }}★</span>
                      <div class="pdp__rev-bar-track">
                        <div class="pdp__rev-bar-fill"
                          [style.width.%]="reviewsAggregate()!.totalCount > 0
                            ? reviewsAggregate()!.distribution[star] / reviewsAggregate()!.totalCount * 100
                            : 0">
                        </div>
                      </div>
                      <span class="pdp__rev-bar-n">{{ reviewsAggregate()!.distribution[star] }}</span>
                    </div>
                  }
                </div>
              </div>

              <div class="pdp__rev-list">
                @for (r of reviewsList(); track r.id) {
                  <article class="pdp__rev-card">
                    <div class="pdp__rev-card-top">
                      <span class="pdp__rev-card-stars">
                        @for (i of [1,2,3,4,5]; track i) {
                          <span [class.active]="i <= r.rating">★</span>
                        }
                      </span>
                      @if (r.verified) {
                        <span class="pdp__rev-verified">✓ Verified Purchase</span>
                      }
                    </div>
                    @if (r.title) {
                      <p class="pdp__rev-card-title">{{ r.title }}</p>
                    }
                    <p class="pdp__rev-card-body">{{ r.body }}</p>
                    <p class="pdp__rev-card-meta">{{ r.authorName }} · {{ r.createdAt | date:'d MMM y' }}</p>
                  </article>
                }
              </div>

              @if (reviewsHasMore()) {
                <button class="pdp__rev-more" (click)="loadMoreReviews()" [disabled]="reviewsLoading()">
                  @if (reviewsLoading()) { Loading... } @else { Load More Reviews }
                </button>
              }
            </div>
          </section>
        }
      }
    </main>
  `,
  styles: [`
    .pdp {
      min-height: 100vh;
      padding-top: 80px;
    }

    .pdp__inner {
      display: grid;
      grid-template-columns: 55fr 45fr;
      gap: 4rem;
      max-width: 1440px;
      margin: 0 auto;
      padding: 3rem 5%;
      align-items: start;

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
        gap: 2rem;
        padding: 2rem 5%;
      }
    }

    /* Gallery */
    .pdp__gallery {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      position: sticky;
      top: 90px;

      @media (max-width: 900px) {
        position: static;
      }
    }

    .pdp__main-image {
      width: 100%;
      border: 1px solid rgba(245, 240, 232, 0.06);
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .pdp__img-placeholder {
      width: 100%;
      height: 100%;
      min-height: 500px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface);
      font-family: var(--font-display);
      font-size: 6rem;
      color: rgba(201, 168, 76, 0.15);
    }

    .pdp__thumbs {
      display: flex;
      gap: 0.625rem;
      overflow-x: auto;
      scrollbar-width: thin;

      &::-webkit-scrollbar {
        height: 3px;
      }
    }

    .pdp__thumb {
      flex-shrink: 0;
      width: 72px;
      height: 96px;
      border: 1px solid rgba(245, 240, 232, 0.08);
      overflow: hidden;
      cursor: pointer;
      background: none;
      padding: 0;
      transition: border-color 0.2s ease;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      &--active {
        border-color: var(--gold);
      }

      &:hover {
        border-color: rgba(201, 168, 76, 0.5);
      }
    }

    /* Skeleton */
    .pdp__loading .pdp__inner {
      align-items: start;
    }

    .pdp__gallery-skeleton {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .pdp__main-img-skeleton {
      width: 100%;
      aspect-ratio: 3/4;
    }

    .pdp__thumbs-row {
      display: flex;
      gap: 0.625rem;
    }

    .pdp__thumb-skeleton {
      width: 72px;
      height: 96px;
    }

    .pdp__info-skeleton {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-top: 1rem;
    }

    /* Not Found */
    .pdp__not-found {
      text-align: center;
      padding: 8rem 5%;
      max-width: 600px;
      margin: 0 auto;
    }

    .pdp__not-found-title {
      font-family: var(--font-display);
      font-size: clamp(2rem, 5vw, 3.5rem);
      letter-spacing: 0.06em;
      color: var(--cream);
      margin-bottom: 1rem;
    }

    .pdp__not-found-sub {
      font-family: var(--font-serif);
      font-style: italic;
      font-size: 1.1rem;
      color: var(--muted);
    }

    /* Info */
    .pdp__breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .pdp__bc-link {
      font-family: var(--font-sans);
      font-size: 0.75rem;
      color: var(--muted);
      text-decoration: none;
      transition: color 0.2s ease;

      &:hover {
        color: var(--cream);
      }
    }

    .pdp__bc-sep {
      color: rgba(107, 101, 96, 0.5);
      font-size: 0.75rem;
    }

    .pdp__bc-current {
      font-family: var(--font-sans);
      font-size: 0.75rem;
      color: rgba(245, 240, 232, 0.5);
    }

    .pdp__title {
      font-family: var(--font-serif);
      font-weight: 400;
      font-size: clamp(1.75rem, 3vw, 2.5rem);
      color: var(--cream);
      line-height: 1.2;
      margin-bottom: 1rem;
    }

    .pdp__price {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.75rem;
    }

    .pdp__price-base,
    .pdp__price-sale {
      font-family: var(--font-display);
      font-size: 1.75rem;
      letter-spacing: 0.05em;
      color: var(--gold);
    }

    .pdp__price-original {
      font-family: var(--font-sans);
      font-size: 1rem;
      color: var(--muted);
      text-decoration: line-through;
    }

    .pdp__discount-badge {
      font-family: var(--font-display);
      font-size: 0.65rem;
      letter-spacing: 0.15em;
      background: rgba(139, 26, 26, 0.25);
      color: #ffcccc;
      border: 1px solid rgba(139, 26, 26, 0.5);
      padding: 0.2rem 0.5rem;
    }

    .pdp__field {
      margin-bottom: 1.5rem;
    }

    .pdp__field-label {
      font-family: var(--font-display);
      font-size: 0.7rem;
      letter-spacing: 0.3em;
      color: var(--muted);
      margin-bottom: 0.625rem;
    }

    .pdp__field-value {
      color: var(--cream);
    }

    .pdp__colors {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .pdp__color-swatch {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      position: relative;
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        transform: scale(1.1);
      }

      &--active {
        border-color: var(--cream);
        box-shadow: 0 0 0 1px rgba(245, 240, 232, 0.4);
        transform: scale(1.1);
      }

      &--oos {
        opacity: 0.35;

        &::after {
          content: '';
          position: absolute;
          top: 50%;
          left: -3px;
          right: -3px;
          height: 1.5px;
          background: rgba(245, 240, 232, 0.8);
          transform: translateY(-50%) rotate(-45deg);
        }
      }
    }

    .pdp__sizes {
      display: flex;
      flex-wrap: wrap;
      gap: 0.625rem;
    }

    .pdp__size-chip {
      min-width: 48px;
      padding: 0.5rem 0.875rem;
      border: 1px solid rgba(245, 240, 232, 0.2);
      color: var(--cream);
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 500;
      background: transparent;
      cursor: pointer;
      transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;

      &:hover:not(:disabled):not(.pdp__size-chip--oos) {
        border-color: var(--gold);
      }

      &--active {
        border-color: var(--gold);
        background: rgba(201, 168, 76, 0.1);
        color: var(--gold);
      }

      &--oos,
      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        text-decoration: line-through;
      }
    }

    .pdp__stock {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;

      &[data-status="in"] .pdp__stock-dot { background: #4caf7d; }
      &[data-status="low"] .pdp__stock-dot { background: #e8a84c; }
      &[data-status="oos"] .pdp__stock-dot { background: #e84c4c; }
    }

    .pdp__stock-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .pdp__stock-text {
      font-family: var(--font-sans);
      font-size: 0.8rem;
      color: var(--muted);
    }

    .pdp__actions-row {
      display: flex;
      gap: 0.75rem;
      align-items: stretch;
      margin-bottom: 0.75rem;
    }

    .pdp__add-btn {
      flex: 1;
      padding: 1rem;
      font-size: 0.875rem;
      letter-spacing: 0.25em;
      transition: background 0.25s ease, border-color 0.25s ease, color 0.25s ease;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        &::after { display: none; }
      }

      &--added {
        background: transparent !important;
        border: 1px solid var(--gold) !important;
        color: var(--gold) !important;
        cursor: default;
        &::after { display: none !important; }
      }
    }

    .pdp__wishlist-btn {
      width: 52px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(245, 240, 232, 0.2);
      background: transparent;
      color: var(--muted);
      cursor: pointer;
      transition: border-color 0.2s ease, color 0.2s ease;

      &:hover {
        border-color: var(--gold);
        color: var(--gold);
      }

      &--active {
        border-color: var(--gold);
        color: var(--gold);
      }
    }

    .pdp__share-btn {
      width: 52px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(245, 240, 232, 0.2);
      background: transparent;
      color: var(--muted);
      cursor: pointer;
      transition: border-color 0.2s ease, color 0.2s ease;

      &:hover {
        border-color: var(--gold);
        color: var(--gold);
      }

      &--copied {
        border-color: var(--gold);
        color: var(--gold);
      }
    }

    .pdp__description,
    .pdp__measurements {
      border-top: 1px solid rgba(245, 240, 232, 0.08);
      margin-top: 1.5rem;
      padding-top: 1rem;
    }

    .pdp__desc-toggle {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: var(--font-display);
      font-size: 0.75rem;
      letter-spacing: 0.25em;
      color: var(--muted);
      padding: 0.5rem 0;
      cursor: pointer;
      background: none;
      border: none;
      transition: color 0.2s ease;

      &:hover {
        color: var(--cream);
      }
    }

    .pdp__desc-body {
      padding-top: 1rem;
      font-family: var(--font-serif);
      font-size: 1rem;
      color: rgba(245, 240, 232, 0.7);
      line-height: 1.8;
      animation: fadeUp 0.3s ease both;
    }

    .pdp__meas-body {
      padding-top: 1rem;
      animation: fadeUp 0.3s ease both;
    }

    .pdp__meas-table {
      width: 100%;
      border-collapse: collapse;

      th, td {
        text-align: left;
        padding: 0.5rem 0;
        font-family: var(--font-sans);
        font-size: 0.8rem;
        border-bottom: 1px solid rgba(245, 240, 232, 0.06);
      }

      th {
        color: var(--muted);
        font-weight: 400;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 0.7rem;
        width: 40%;
      }

      td {
        color: var(--cream);
      }
    }

    /* Notify Me */
    .pdp__notify-trigger {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.75rem 1rem;
      margin-top: 0.25rem;
      background: transparent;
      border: 1px dashed rgba(245, 240, 232, 0.2);
      color: var(--muted);
      font-family: var(--font-display);
      font-size: 0.7rem;
      letter-spacing: 0.2em;
      cursor: pointer;
      transition: border-color 0.2s ease, color 0.2s ease;

      &:hover {
        border-color: rgba(201, 168, 76, 0.5);
        color: var(--gold);
      }
    }

    .pdp__notify-form {
      margin-top: 0.25rem;
      animation: fadeUp 0.3s ease both;
    }

    .pdp__notify-hint {
      font-family: var(--font-sans);
      font-size: 0.8rem;
      color: var(--muted);
      margin-bottom: 0.625rem;
    }

    .pdp__notify-row {
      display: flex;
      gap: 0.5rem;
    }

    .pdp__notify-input {
      flex: 1;
      padding: 0.75rem 1rem;
      background: var(--surface);
      border: 1px solid rgba(245, 240, 232, 0.15);
      color: var(--cream);
      font-family: var(--font-sans);
      font-size: 0.875rem;

      &:focus {
        outline: none;
        border-color: rgba(201, 168, 76, 0.5);
      }

      &:disabled {
        opacity: 0.5;
      }
    }

    .pdp__notify-submit {
      padding: 0.75rem 1.25rem;
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 100px;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        &::after { display: none; }
      }
    }

    .pdp__notify-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(13, 13, 13, 0.3);
      border-top-color: #0d0d0d;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .pdp__notify-success {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.25rem;
      font-family: var(--font-sans);
      font-size: 0.8rem;
      color: #4caf7d;
      animation: fadeUp 0.3s ease both;
    }

    /* ── Reviews ─────────────────────────────── */
    .pdp__reviews {
      border-top: 1px solid rgba(245, 240, 232, 0.08);
      margin-top: 3rem;
      padding-top: 2.5rem;
    }

    .pdp__reviews-inner {
      max-width: 1440px;
      margin: 0 auto;
      padding: 0 5% 3rem;
    }

    .pdp__reviews-heading {
      font-family: var(--font-display);
      font-size: clamp(1.4rem, 2.5vw, 2rem);
      font-weight: 400;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--cream);
      margin: 0 0 2rem;
    }

    .pdp__rev-agg {
      display: flex;
      gap: 3rem;
      align-items: flex-start;
      margin-bottom: 2.5rem;
      flex-wrap: wrap;
    }

    .pdp__rev-score {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      min-width: 90px;
    }

    .pdp__rev-avg {
      font-family: var(--font-display);
      font-size: 3rem;
      line-height: 1;
      color: var(--gold);
    }

    .pdp__rev-stars-row {
      display: flex;
      gap: 2px;
      font-size: 1.1rem;
    }

    .pdp__rev-stars-row .pdp__rev-star,
    .pdp__rev-card-stars span {
      color: rgba(245, 240, 232, 0.2);
      transition: color 0.15s;
    }

    .pdp__rev-stars-row .pdp__rev-star.active,
    .pdp__rev-card-stars span.active {
      color: var(--gold);
    }

    .pdp__rev-count {
      font-family: var(--font-sans);
      font-size: 0.75rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .pdp__rev-bars {
      flex: 1;
      min-width: 200px;
      max-width: 320px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .pdp__rev-bar-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pdp__rev-bar-label {
      font-family: var(--font-sans);
      font-size: 0.72rem;
      color: var(--muted);
      width: 22px;
      text-align: right;
      flex-shrink: 0;
    }

    .pdp__rev-bar-track {
      flex: 1;
      height: 4px;
      background: rgba(245, 240, 232, 0.08);
      border-radius: 2px;
      overflow: hidden;
    }

    .pdp__rev-bar-fill {
      height: 100%;
      background: var(--gold);
      border-radius: 2px;
      transition: width 0.4s ease;
    }

    .pdp__rev-bar-n {
      font-family: var(--font-sans);
      font-size: 0.7rem;
      color: var(--muted);
      width: 16px;
      flex-shrink: 0;
    }

    .pdp__rev-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .pdp__rev-card {
      padding: 1.5rem 0;
      border-bottom: 1px solid rgba(245, 240, 232, 0.06);
    }

    .pdp__rev-card-top {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .pdp__rev-card-stars {
      display: flex;
      gap: 2px;
      font-size: 0.9rem;
    }

    .pdp__rev-verified {
      font-family: var(--font-sans);
      font-size: 0.7rem;
      letter-spacing: 0.04em;
      color: #4caf7d;
      background: rgba(76, 175, 80, 0.08);
      padding: 2px 8px;
      border-radius: 2px;
    }

    .pdp__rev-card-title {
      font-family: var(--font-sans);
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--cream);
      margin: 0 0 0.4rem;
    }

    .pdp__rev-card-body {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--muted);
      line-height: 1.65;
      margin: 0 0 0.75rem;
    }

    .pdp__rev-card-meta {
      font-family: var(--font-sans);
      font-size: 0.72rem;
      color: rgba(245, 240, 232, 0.35);
      margin: 0;
      letter-spacing: 0.03em;
    }

    .pdp__rev-more {
      display: block;
      width: 100%;
      max-width: 280px;
      margin: 0 auto;
      padding: 0.85rem 2rem;
      font-family: var(--font-sans);
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--cream);
      background: transparent;
      border: 1px solid rgba(245, 240, 232, 0.2);
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s;

      &:hover:not(:disabled) {
        border-color: var(--gold);
        color: var(--gold);
      }

      &:disabled {
        opacity: 0.4;
        cursor: default;
      }
    }
  `],
})
export class ProductComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly wishlistService = inject(WishlistService);
  private readonly apiService = inject(ApiService);
  private readonly meta = inject(Meta);
  private readonly titleService = inject(Title);
  private readonly platformId = inject(PLATFORM_ID);

  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly product = signal<ProductDetail | null>(null);

  readonly selectedColorId = signal<string | null>(null);
  readonly selectedSkuId = signal<string | null>(null);
  readonly selectedThumbIndex = signal(0);
  readonly descExpanded = signal(true);
  readonly measExpanded = signal(false);
  readonly addedToCart = signal(false);
  readonly linkCopied = signal(false);
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  readonly notifyOpen = signal(false);
  readonly notifyEmail = signal('');
  readonly notifySending = signal(false);
  readonly notifySent = signal(false);

  readonly reviewsLoading = signal(false);
  readonly reviewsAggregate = signal<ReviewsAggregate | null>(null);
  readonly reviewsList = signal<ReviewItem[]>([]);
  readonly reviewsPage = signal(1);
  readonly reviewsTotalPages = signal(1);
  readonly reviewsHasMore = computed(() => this.reviewsPage() < this.reviewsTotalPages());

  private addedTimer: ReturnType<typeof setTimeout> | null = null;

  readonly selectedColorName = computed(() => {
    const p = this.product();
    if (!p) return '';
    const colorId = this.selectedColorId();
    return p.colors.find(c => c.id === colorId)?.colorName ?? '';
  });

  readonly currentImages = computed(() => {
    const p = this.product();
    if (!p) return [];
    const colorId = this.selectedColorId() ?? p.colors[0]?.id;
    return p.colors.find(c => c.id === colorId)?.images ?? [];
  });

  readonly currentImage = computed(() => {
    const imgs = this.currentImages();
    return imgs[this.selectedThumbIndex()] ?? imgs[0] ?? null;
  });

  readonly sizesForColor = computed(() => {
    const p = this.product();
    if (!p) return [];
    const colorId = this.selectedColorId() ?? p.colors[0]?.id;
    return p.skus.filter(s => s.colorId === colorId);
  });

  private readonly FREE_SIZE_LABELS = new Set([
    'free size', 'freesize', 'free sz',
    'one size', 'onesize', 'one-size', 'one sz',
    'free', 'os', 'osfm',
    'universal', 'standard', 'single size', 'u',
  ]);

  readonly isFreeSize = computed(() => {
    const sizes = this.sizesForColor();
    return sizes.length === 1 && this.FREE_SIZE_LABELS.has(sizes[0].sizeLabel.toLowerCase().trim());
  });

  private readonly cartQtyMap = computed(() => {
    const map = new Map<string, number>();
    for (const item of this.cartService.items()) map.set(item.skuId, item.quantity);
    return map;
  });

  effectiveStock(skuId: string, stockQty: number): number {
    return Math.max(0, stockQty - (this.cartQtyMap().get(skuId) ?? 0));
  }

  readonly selectedSku = computed<ProductSku | null>(() => {
    const p = this.product();
    if (!p) return null;
    const skuId = this.selectedSkuId();
    return p.skus.find(s => s.id === skuId) ?? null;
  });

  readonly selectedSize = computed(() => this.selectedSku()?.sizeLabel ?? null);

  readonly onSale = computed(() => {
    const p = this.product();
    return p ? hasDiscount(p) : false;
  });

  readonly effectivePrice = computed(() => {
    const p = this.product();
    return p ? formatINR(getEffectivePrice(p)) : '';
  });

  readonly originalPrice = computed(() => {
    const p = this.product();
    return p ? formatINR(getBasePrice(p)) : '';
  });

  readonly stockStatus = computed<'in' | 'low' | 'oos'>(() => {
    const sku = this.selectedSku();
    if (!sku) return 'in';
    const effective = this.effectiveStock(sku.id, sku.stockQty);
    if (effective <= 0) return 'oos';
    if (effective <= 3) return 'low';
    return 'in';
  });

  readonly stockStatusText = computed(() => {
    const status = this.stockStatus();
    const sku = this.selectedSku();
    if (status === 'oos') return 'Out of Stock';
    if (status === 'low') return `Only ${sku ? this.effectiveStock(sku.id, sku.stockQty) : 0} left`;
    return 'In Stock';
  });

  readonly wishlisted = computed(() => {
    const p = this.product();
    return p ? this.wishlistService.isWishlisted(p.id) : false;
  });

  readonly allSizesOos = computed(() => {
    const sizes = this.sizesForColor();
    return sizes.length > 0 && sizes.every(s => this.effectiveStock(s.id, s.stockQty) <= 0);
  });

  readonly colorOosMap = computed(() => {
    const p = this.product();
    if (!p) return new Map<string, boolean>();
    const map = new Map<string, boolean>();
    for (const color of p.colors) {
      const colorSkus = p.skus.filter(s => s.colorId === color.id);
      const isOos = colorSkus.length === 0 || !colorSkus.some(s => this.effectiveStock(s.id, s.stockQty) > 0);
      map.set(color.id, isOos);
    }
    return map;
  });

  readonly hasMeasurements = computed(() => {
    const sku = this.selectedSku();
    if (!sku) return false;
    return sku.measurements && Object.keys(sku.measurements).length > 0;
  });

  readonly measurementEntries = computed(() => {
    const sku = this.selectedSku();
    if (!sku?.measurements) return [];
    return Object.entries(sku.measurements).map(([key, value]) => ({
      key: key.replace(/_/g, ' ').toUpperCase(),
      value: String(value),
    }));
  });

  constructor() {
    effect(() => {
      const sizes = this.sizesForColor();
      const map = this.cartQtyMap();
      if (untracked(() => this.selectedSkuId()) !== null) return;
      const inStock = sizes.filter(s => Math.max(0, s.stockQty - (map.get(s.id) ?? 0)) > 0);
      if (inStock.length === 1) {
        this.selectedSkuId.set(inStock[0].id);
      } else if (sizes.length === 1) {
        this.selectedSkuId.set(sizes[0].id);
      }
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const slug = params['slug'];
      if (slug) this.loadProduct(slug);
    });
  }

  private loadProduct(slug: string): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.reviewsAggregate.set(null);
    this.reviewsList.set([]);
    this.reviewsPage.set(1);
    this.reviewsTotalPages.set(1);
    this.productService.getProductBySlug(slug).subscribe({
      next: (product) => {
        this.product.set(product);
        if (product.colors?.length > 0) {
          this.selectedColorId.set(product.colors[0].id);
        }
        this.autoSelectSku();
        this.loadReviews(product.id, 1);
        this.loading.set(false);
        this.titleService.setTitle(`${product.title} — Ted Clothing`);
        this.meta.updateTag({ name: 'description', content: product.description?.slice(0, 160) ?? '' });
        this.meta.updateTag({ property: 'og:title', content: `${product.title} — Ted Clothing` });
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  selectColor(colorId: string): void {
    this.selectedColorId.set(colorId);
    this.autoSelectSku();
    this.selectedThumbIndex.set(0);
    this.notifyOpen.set(false);
    this.notifySent.set(false);
  }

  private autoSelectSku(): void {
    const sizes = this.sizesForColor();
    const inStock = sizes.filter(s => this.effectiveStock(s.id, s.stockQty) > 0);
    if (inStock.length === 1) {
      this.selectedSkuId.set(inStock[0].id);
    } else if (sizes.length === 1) {
      this.selectedSkuId.set(sizes[0].id);
    } else {
      this.selectedSkuId.set(null);
    }
  }

  openNotify(): void {
    const user = this.authService.currentUser();
    this.notifyEmail.set(user?.email ?? '');
    this.notifyOpen.set(true);
  }

  submitNotify(): void {
    const p = this.product();
    const email = this.notifyEmail().trim();
    if (!p || !email) return;

    this.notifySending.set(true);
    this.apiService.post('/stock-notifications', {
      productId: p.id,
      skuId: this.selectedSkuId() ?? null,
      email,
    }).subscribe({
      next: () => {
        this.notifySent.set(true);
        this.notifyOpen.set(false);
        this.notifySending.set(false);
      },
      error: () => {
        this.notifySending.set(false);
      },
    });
  }

  private loadReviews(productId: string, page: number): void {
    this.reviewsLoading.set(true);
    this.apiService.get<ReviewsResponse>(`/products/${productId}/reviews`, { page, limit: 5 }).subscribe({
      next: (data) => {
        if (page === 1) {
          this.reviewsAggregate.set(data.aggregate);
          this.reviewsList.set(data.reviews);
        } else {
          this.reviewsList.update(list => [...list, ...data.reviews]);
        }
        this.reviewsPage.set(data.page);
        this.reviewsTotalPages.set(data.totalPages);
        this.reviewsLoading.set(false);
      },
      error: () => this.reviewsLoading.set(false),
    });
  }

  loadMoreReviews(): void {
    const p = this.product();
    if (!p) return;
    this.loadReviews(p.id, this.reviewsPage() + 1);
  }

  selectSize(sku: ProductSku): void {
    if (this.effectiveStock(sku.id, sku.stockQty) <= 0) return;
    this.selectedSkuId.set(sku.id);
  }

  selectThumb(index: number): void {
    this.selectedThumbIndex.set(index);
  }

  toggleDescription(): void {
    this.descExpanded.update(v => !v);
  }

  toggleMeasurements(): void {
    this.measExpanded.update(v => !v);
  }

  toggleWishlist(): void {
    const p = this.product();
    if (!p) return;
    if (!this.authService.isLoggedIn()) {
      this.authService.openModal();
      return;
    }
    const skuId = this.selectedSkuId() ?? this.sizesForColor()[0]?.id ?? p.skus[0]?.id;
    if (!skuId) return;
    this.wishlistService.toggle(p.id, skuId);
  }

  async shareProduct(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const p = this.product();
    if (!p) return;

    const url = window.location.href;
    const payload = {
      title: p.title,
      text: `${p.category?.name ?? ''} · ${p.title}`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else {
        await navigator.clipboard.writeText(url);
        this.triggerCopied();
      }
    } catch {
      // user cancelled share or clipboard denied — silent fail
    }
  }

  private triggerCopied(): void {
    if (this.copiedTimer) clearTimeout(this.copiedTimer);
    this.linkCopied.set(true);
    this.copiedTimer = setTimeout(() => this.linkCopied.set(false), 2000);
  }

  addToCart(): void {
    const p = this.product();
    const sku = this.selectedSku();
    if (!p || !sku) return;

    const colorId = this.selectedColorId() ?? p.colors[0]?.id;
    const color = p.colors.find(c => c.id === colorId);

    const item: CartItem = {
      skuId: sku.id,
      skuCode: sku.skuCode,
      productSlug: p.slug,
      productTitle: p.title,
      colorName: color?.colorName ?? '',
      sizeLabel: sku.sizeLabel,
      price: sku.priceOverride ? parseFloat(sku.priceOverride) : getEffectivePrice(p),
      quantity: 1,
      image: color?.images?.[0] ?? null,
    };

    if (this.effectiveStock(sku.id, sku.stockQty) <= 0) return;
    this.cartService.addItem(item);
    this.addedToCart.set(true);
    if (this.addedTimer) clearTimeout(this.addedTimer);
    this.addedTimer = setTimeout(() => this.addedToCart.set(false), 3000);
  }
}

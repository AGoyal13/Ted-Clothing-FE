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

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
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

    this.cartService.addItem(size.skuId, 1).subscribe();

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

import {
  Component,
  OnInit,
  OnDestroy,
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
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss',
})
export class ProductComponent implements OnInit, OnDestroy {
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

  readonly lightboxOpen = signal(false);
  readonly fading = signal(false);
  private touchStartX = 0;
  private lightboxKeyHandler: ((e: KeyboardEvent) => void) | null = null;

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
    if (index === this.selectedThumbIndex()) return;
    this.fading.set(true);
    setTimeout(() => {
      this.selectedThumbIndex.set(index);
      this.fading.set(false);
    }, 180);
  }

  prev(): void {
    const len = this.currentImages().length;
    if (len < 2) return;
    this.selectedThumbIndex.update(i => (i - 1 + len) % len);
  }

  next(): void {
    const len = this.currentImages().length;
    if (len < 2) return;
    this.selectedThumbIndex.update(i => (i + 1) % len);
  }

  openLightbox(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.lightboxOpen.set(true);
    document.body.style.overflow = 'hidden';
    this.lightboxKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.closeLightbox();
      else if (e.key === 'ArrowLeft') this.prev();
      else if (e.key === 'ArrowRight') this.next();
    };
    document.addEventListener('keydown', this.lightboxKeyHandler);
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
    document.body.style.overflow = '';
    if (this.lightboxKeyHandler) {
      document.removeEventListener('keydown', this.lightboxKeyHandler);
      this.lightboxKeyHandler = null;
    }
  }

  onTouchStart(e: TouchEvent): void {
    this.touchStartX = e.touches[0].clientX;
  }

  onTouchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(dx) > 50) dx < 0 ? this.next() : this.prev();
  }

  ngOnDestroy(): void {
    this.closeLightbox();
    if (this.addedTimer) clearTimeout(this.addedTimer);
    if (this.copiedTimer) clearTimeout(this.copiedTimer);
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

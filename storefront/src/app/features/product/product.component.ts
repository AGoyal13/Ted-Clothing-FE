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
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { environment } from '../../../environments/environment';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { WishlistService } from '../../core/services/wishlist.service';
import {
  ProductDetail,
  ProductSku,
  formatINR,
  getEffectivePrice,
  getBasePrice,
  getFirstImage,
  hasDiscount,
} from '../../core/models/product.model';
import { PdpGalleryComponent } from './components/pdp-gallery/pdp-gallery.component';
import { PdpReviewsComponent } from './components/pdp-reviews/pdp-reviews.component';
import { PdpNotifyComponent } from './components/pdp-notify/pdp-notify.component';
import { PdpSizeGuideComponent } from './components/pdp-size-guide/pdp-size-guide.component';
import { PdpSimilarComponent } from './components/pdp-similar/pdp-similar.component';
import { SizeGuide } from '../../core/models/product.model';
import { FALLBACK_GUIDES, getSizeGuideGroup } from './components/size-guide-fallback';
import { ShippingService } from '../../core/services/shipping.service';
import { SiteConfigService } from '../../core/services/site-config.service';
import { PromoCouponService } from '../../core/services/promo-coupon.service';
import { formatCouponPromo } from '../../core/models/promo-coupon.model';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [RouterLink, PdpGalleryComponent, PdpReviewsComponent, PdpNotifyComponent, PdpSizeGuideComponent, PdpSimilarComponent],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss',
})
export class ProductComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly wishlistService = inject(WishlistService);
  private readonly shippingService = inject(ShippingService);
  private readonly siteConfig = inject(SiteConfigService);
  private readonly promoCoupons = inject(PromoCouponService);
  private readonly seo = inject(SeoService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly etdLabel = this.shippingService.etdLabel;
  readonly returnWindowDays = this.siteConfig.returnWindowDays;

  // Admin-promoted coupon offer line (shared one-fetch signal).
  readonly promoCoupon = computed(() => {
    const c = this.promoCoupons.topCoupon();
    return c ? formatCouponPromo(c) : null;
  });

  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly product = signal<ProductDetail | null>(null);

  readonly selectedColorId = signal<string | null>(null);
  readonly selectedSkuId = signal<string | null>(null);
  readonly descExpanded = signal(true);
  readonly measExpanded = signal(false);
  readonly addedToCart = signal(false);
  readonly addingToCart = signal(false);
  readonly addToCartErr = signal<string | null>(null);
  readonly linkCopied = signal(false);
  readonly sizeGuideOpen = signal(false);

  private readonly sizeGuideGroup = computed(() => {
    return getSizeGuideGroup(this.product()?.category?.slug ?? '');
  });

  readonly sizeGuide = computed<SizeGuide | null>(() => {
    const p = this.product();
    if (!p) return null;
    if (p.sizeGuide) return p.sizeGuide;
    if (p.category.sizeGuide) return p.category.sizeGuide;
    const group = this.sizeGuideGroup();
    return group ? FALLBACK_GUIDES[group] : null;
  });

  readonly hasSizeGuide = computed(() =>
    !this.isFreeSize() && this.sizesForColor().length > 0 && this.sizeGuide() !== null,
  );

  private copiedTimer: ReturnType<typeof setTimeout> | null = null;
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
    this.shippingService.ensureAddresses();
    this.route.params.subscribe(params => {
      const slug = params['slug'];
      if (slug) this.loadProduct(slug);
    });
  }

  private loadProduct(slug: string): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.productService.getProductBySlug(slug).subscribe({
      next: (product) => {
        this.product.set(product);
        if (product.colors?.length > 0) {
          this.selectedColorId.set(product.colors[0].id);
        }
        this.autoSelectSku();
        this.loading.set(false);
        this.applySeo(product);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  // ── SEO: meta tags + JSON-LD structured data (SSR-rendered) ──────────────────
  private applySeo(product: ProductDetail): void {
    const path = `/product/${product.slug}`;
    const title = `${product.title} — Ted Clothing`;
    this.seo.updateSeo({
      title,
      description: product.description ?? '',
      path,
      image: getFirstImage(product),
      type: 'product',
    });
    this.seo.setJsonLd('ld-product', this.buildProductSchema(product, path));
    this.seo.setJsonLd('ld-breadcrumb', this.buildBreadcrumbSchema(product, path));
  }

  private buildProductSchema(product: ProductDetail, path: string): object {
    // Flatten + dedupe absolute image URLs across all colours.
    const images = [
      ...new Set(
        product.colors.flatMap(c => c.images).map(img => this.seo.toAbsolute(img)),
      ),
    ];
    // Crawler sees SSR output (cart state is browser-only) → use raw stockQty.
    const inStock = product.skus.some(s => s.stockQty > 0);

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description ?? '',
      image: images,
      brand: { '@type': 'Brand', name: 'Ted Clothing' },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: getEffectivePrice(product),
        url: this.seo.toAbsolute(path),
        availability: inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
    };

    const sku = product.skus[0]?.skuCode;
    if (sku) schema['sku'] = sku;

    // Only emit aggregateRating when the backend supplies real counts —
    // a zero-count rating is a Google structured-data error.
    if (product.avgRating != null && (product.reviewCount ?? 0) > 0) {
      schema['aggregateRating'] = {
        '@type': 'AggregateRating',
        ratingValue: product.avgRating,
        reviewCount: product.reviewCount,
      };
    }

    return schema;
  }

  private buildBreadcrumbSchema(product: ProductDetail, path: string): object {
    const siteUrl = (environment.siteUrl ?? '').replace(/\/+$/, '');
    const items: { name: string; url: string }[] = [
      { name: 'Home', url: `${siteUrl}/` },
    ];
    if (product.category) {
      items.push({
        name: product.category.name,
        url: `${siteUrl}/category/${product.category.slug}`,
      });
    }
    items.push({ name: product.title, url: this.seo.toAbsolute(path) });

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        item: it.url,
      })),
    };
  }

  selectColor(colorId: string): void {
    this.selectedSkuId.set(null);
    this.selectedColorId.set(colorId);
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

  selectSize(sku: ProductSku): void {
    if (this.effectiveStock(sku.id, sku.stockQty) <= 0) return;
    this.selectedSkuId.set(sku.id);
  }

  ngOnDestroy(): void {
    if (this.addedTimer) clearTimeout(this.addedTimer);
    if (this.copiedTimer) clearTimeout(this.copiedTimer);
    // Drop PDP-specific structured data so it doesn't leak to the next route.
    this.seo.removeJsonLd('ld-product');
    this.seo.removeJsonLd('ld-breadcrumb');
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

  openSizeGuide(e: Event): void {
    e.preventDefault();
    if (isPlatformBrowser(this.platformId)) {
      this.sizeGuideOpen.set(true);
    }
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
    const sku = this.selectedSku();
    if (!sku) return;
    if (this.effectiveStock(sku.id, sku.stockQty) <= 0) return;
    if (this.addingToCart()) return;

    this.addingToCart.set(true);
    this.cartService.addItem(sku.id, 1).subscribe({
      next: () => {
        this.addingToCart.set(false);
        this.addedToCart.set(true);
        if (this.addedTimer) clearTimeout(this.addedTimer);
        this.addedTimer = setTimeout(() => this.addedToCart.set(false), 3000);
      },
      error: (err) => {
        this.addingToCart.set(false);
        const msg = err?.error?.error?.message ?? 'Could not add to cart — please try again';
        this.addToCartErr.set(msg);
        setTimeout(() => this.addToCartErr.set(null), 4000);
      },
    });
  }
}

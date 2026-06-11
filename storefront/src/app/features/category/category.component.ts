import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { combineLatest } from 'rxjs';
import { SearchService } from '../../core/services/search.service';
import { CategoryService } from '../../core/services/category.service';
import { ShippingService } from '../../core/services/shipping.service';
import { Product } from '../../core/models/product.model';
import { searchHitToProduct } from '../../core/models/search.model';
import { ProductCardComponent } from '../../shared/product-card/product-card.component';
import { AnimateOnScrollDirective } from '../../core/directives/animate-on-scroll.directive';
import { CatFilterBarComponent } from './components/cat-filter-bar/cat-filter-bar.component';
import { CatMobileFilterComponent, MobileFilters } from './components/cat-mobile-filter/cat-mobile-filter.component';

type SortOption = 'newest' | 'price-asc' | 'price-desc';
type PageType = 'gender' | 'parent' | 'leaf';

interface FilterOption { label: string; slug: string; }
interface ActivePill {
  label: string;
  type: 'cat' | 'size' | 'color' | 'price';
  value?: string;
}

interface PlpScrollState {
  products: Product[];
  currentPage: number;
  totalPages: number;
  total: number;
  sortBy: SortOption;
  scrollToId: string;
}

const GENDER_SLUGS: Record<string, 'MEN' | 'WOMEN' | 'KIDS'> = {
  men: 'MEN', women: 'WOMEN', kids: 'KIDS',
};

function parseArrayParam(val: string | string[] | undefined): string[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [ProductCardComponent, AnimateOnScrollDirective, RouterLink, CatFilterBarComponent, CatMobileFilterComponent],
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss',
})
export class CategoryComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly platformId      = inject(PLATFORM_ID);
  private readonly ngZone          = inject(NgZone);
  private readonly route           = inject(ActivatedRoute);
  private readonly router          = inject(Router);
  private readonly searchService   = inject(SearchService);
  private readonly categoryService = inject(CategoryService);
  private readonly shippingService = inject(ShippingService);
  private readonly meta            = inject(Meta);
  private readonly titleService    = inject(Title);

  readonly etdLabel = this.shippingService.etdLabel;

  @ViewChild('scrollSentinel') private sentinel!: ElementRef<HTMLDivElement>;
  private readonly initialNavTrigger = this.router.getCurrentNavigation()?.trigger;

  // ── Core state ────────────────────────────────────────────────────────────────
  readonly slug            = signal('');
  readonly breadcrumbs     = signal<{ label: string; slug?: string }[]>([]);
  readonly loading         = signal(true);
  readonly loadingMore     = signal(false);
  readonly products        = signal<Product[]>([]);
  readonly total           = signal(0);
  readonly currentPage     = signal(1);
  readonly totalPages      = signal(1);
  readonly hasMore         = computed(() => this.currentPage() < this.totalPages());
  readonly sortBy          = signal<SortOption>('newest');
  readonly activeCat       = signal<string>('all');
  readonly pageType        = signal<PageType>('leaf');
  readonly categoryOptions = signal<FilterOption[]>([]);
  readonly leafParentSlug  = signal('');

  // ── Facet filter state (from URL) ─────────────────────────────────────────────
  readonly activeSizes    = signal<string[]>([]);
  readonly activeColors   = signal<string[]>([]);
  readonly activeMinPrice = signal<number | null>(null);
  readonly activeMaxPrice = signal<number | null>(null);

  // ── Sidebar open/collapsed (desktop only) ────────────────────────────────────
  readonly sidebarOpen = signal(true);
  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }

  // ── Sort dropdown state (desktop inline, above grid) ─────────────────────────
  readonly sortOpen = signal(false);
  readonly sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest',     label: 'Newest First' },
    { value: 'price-asc',  label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
  ];
  readonly sortLabel = computed(() =>
    this.sortOptions.find(o => o.value === this.sortBy())?.label ?? 'Newest First'
  );

  // ── Mobile preview count (live preview while filter drawer is open) ───────────
  readonly mobilePreviewCount = signal(0);

  // ── Active filter pills ───────────────────────────────────────────────────────
  readonly activeFilterPills = computed<ActivePill[]>(() => {
    const pills: ActivePill[] = [];
    if (this.activeCat() !== 'all') {
      const opt = this.categoryOptions().find(o => o.slug === this.activeCat());
      pills.push({ label: opt?.label ?? this.activeCat().toUpperCase(), type: 'cat' });
    }
    for (const size of this.activeSizes()) {
      pills.push({ label: size, type: 'size', value: size });
    }
    for (const color of this.activeColors()) {
      pills.push({ label: color, type: 'color', value: color });
    }
    const min = this.activeMinPrice(), max = this.activeMaxPrice();
    if (min !== null || max !== null) {
      let label: string;
      if (min !== null && max !== null) label = `₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')}`;
      else if (min !== null)            label = `₹${min.toLocaleString('en-IN')}+`;
      else                              label = `Up to ₹${max!.toLocaleString('en-IN')}`;
      pills.push({ label, type: 'price' });
    }
    return pills;
  });

  // ── Facet data — populated from search response on every fresh load ───────────
  readonly facetSizes      = signal<Record<string, number>>({});
  readonly facetColors     = signal<Record<string, number>>({});
  readonly facetPriceRange = signal<{ min: number; max: number } | null>(null);
  readonly colorHexMap     = signal<Record<string, string>>({});

  private prevSlug = '';
  private loadSeq  = 0; // incremented on every fresh (non-append) load; guards stale responses

  readonly skeletons = [1,2,3,4,5,6,7,8];

  readonly displayName = computed(() =>
    this.slug().replace(/-/g, ' ').toUpperCase()
  );

  ngOnInit(): void {
    this.shippingService.ensureAddresses();
    combineLatest([this.route.params, this.route.queryParams]).subscribe(([params, query]) => {
      const newSlug     = params['slug'] ?? '';
      const catFromUrl  = (query['cat']  as string)     ?? 'all';
      const sortFromUrl = (query['sort'] as SortOption) ?? 'newest';
      const sizesFromUrl  = parseArrayParam(query['size']);
      const colorsFromUrl = parseArrayParam(query['color']);
      const minPriceFromUrl = query['minPrice'] ? parseFloat(query['minPrice']) : null;
      const maxPriceFromUrl = query['maxPrice'] ? parseFloat(query['maxPrice']) : null;

      this.activeCat.set(catFromUrl);
      this.sortBy.set(sortFromUrl);
      this.activeSizes.set(sizesFromUrl);
      this.activeColors.set(colorsFromUrl);
      this.activeMinPrice.set(minPriceFromUrl);
      this.activeMaxPrice.set(maxPriceFromUrl);

      if (newSlug !== this.prevSlug) this.sidebarOpen.set(true);

      const isBrowser  = isPlatformBrowser(this.platformId);
      const isBackNav  = this.initialNavTrigger === 'popstate';
      const stateKey   = this.buildStateKey(newSlug, catFromUrl, sizesFromUrl, colorsFromUrl, minPriceFromUrl, maxPriceFromUrl);
      let restoredFromState = false;

      if (isBrowser && isBackNav) {
        const raw = sessionStorage.getItem(stateKey);
        if (raw) {
          try {
            const state: PlpScrollState = JSON.parse(raw);
            sessionStorage.removeItem(stateKey);
            this.sortBy.set(state.sortBy);
            this.products.set(state.products);
            this.currentPage.set(state.currentPage);
            this.totalPages.set(state.totalPages);
            this.total.set(state.total);
            this.loading.set(false);
            restoredFromState = true;
            setTimeout(() => {
              document.getElementById(state.scrollToId)
                ?.scrollIntoView({ block: 'center', behavior: 'instant' });
            }, 0);
          } catch { /* corrupt JSON — fall through to normal load */ }
        }
      }

      if (!restoredFromState) {
        if (isBrowser) {
          Object.keys(sessionStorage)
            .filter(k => k.startsWith(`plp:${newSlug}:`))
            .forEach(k => sessionStorage.removeItem(k));
        }
        this.currentPage.set(1);
        this.products.set([]);
      }

      if (newSlug !== this.prevSlug) {
        this.prevSlug = newSlug;
        this.slug.set(newSlug);
        if (!restoredFromState) {
          this.categoryOptions.set([]);
          this.breadcrumbs.set([]);
          this.pageType.set('leaf');
          this.leafParentSlug.set('');
          this.facetSizes.set({});
          this.facetColors.set({});
          this.facetPriceRange.set(null);
        }
        this.loadCategoryMeta();
        this.titleService.setTitle(`${this.displayName()} — Ted Clothing`);
        this.meta.updateTag({ name: 'description', content: `Shop ${this.displayName()} at Ted Clothing. Premium handcrafted Indian clothing.` });
      }

      if (!restoredFromState) {
        this.loadProducts();
      }
    });
  }

  private buildStateKey(
    slug: string, cat: string,
    sizes: string[], colors: string[],
    minPrice: number | null, maxPrice: number | null,
  ): string {
    return `plp:${slug}:${cat}:${[...sizes].sort().join(',')}:${[...colors].sort().join(',')}:${minPrice ?? ''}:${maxPrice ?? ''}`;
  }

  private loadCategoryMeta(): void {
    const slug       = this.slug();
    const genderEnum = GENDER_SLUGS[slug.toLowerCase()];

    if (slug === 'sale') {
      this.pageType.set('leaf');
      this.breadcrumbs.set([{ label: 'SALE' }]);
      this.categoryService.getNavTree().subscribe({
        next: (tree) => {
          if (this.slug() !== slug) return;
          this.categoryOptions.set(tree.map(c => ({ label: c.name.toUpperCase(), slug: c.slug })));
        },
        error: () => {},
      });
    } else if (slug === 'new-arrivals') {
      this.pageType.set('leaf');
      this.breadcrumbs.set([{ label: 'NEW ARRIVALS' }]);
      this.categoryService.getNavTree().subscribe({
        next: (tree) => {
          if (this.slug() !== slug) return;
          this.categoryOptions.set(tree.map(c => ({ label: c.name.toUpperCase(), slug: c.slug })));
        },
        error: () => {},
      });
    } else if (genderEnum) {
      this.pageType.set('gender');
      this.breadcrumbs.set([{ label: slug.toUpperCase() }]);
      this.categoryService.getNavTreeByGender(genderEnum).subscribe({
        next: (groups) => {
          if (this.slug() !== slug) return;
          this.categoryOptions.set(
            groups.flatMap(g => g.categories.map(c => ({ label: c.name.toUpperCase(), slug: c.slug })))
          );
        },
        error: () => {},
      });
    } else {
      this.categoryService.getBySlug(slug).subscribe({
        next: (cat) => {
          if (this.slug() !== slug) return;
          this.breadcrumbs.set(
            cat.parent
              ? [{ label: cat.parent.name.toUpperCase(), slug: cat.parent.slug }, { label: cat.name.toUpperCase() }]
              : [{ label: cat.name.toUpperCase() }]
          );

          if ((cat.children?.length ?? 0) > 0) {
            this.pageType.set('parent');
            this.categoryOptions.set(
              (cat.children ?? []).map(c => ({ label: c.name.toUpperCase(), slug: c.slug }))
            );
          } else {
            this.pageType.set('leaf');
            if (cat.parent) {
              this.leafParentSlug.set(cat.parent.slug);
              this.categoryService.getBySlug(cat.parent.slug).subscribe({
                next: (parent) => {
                  if (this.slug() !== slug) return;
                  this.categoryOptions.set(
                    (parent.children ?? []).map(c => ({ label: c.name.toUpperCase(), slug: c.slug }))
                  );
                },
                error: () => this.categoryOptions.set([]),
              });
            } else {
              this.categoryOptions.set([]);
            }
          }
        },
        error: () => this.pageType.set('leaf'),
      });
    }
  }

  private loadProducts(append = false): void {
    // Capture seq BEFORE any async work. Fresh loads increment it; append calls
    // inherit the current value so a new fresh load cancels any in-flight append.
    const seq = append ? this.loadSeq : ++this.loadSeq;

    // Fresh load cancels any in-flight append — reset loadingMore immediately
    // so the loadMore() guard doesn't get stuck after the append is discarded.
    if (!append) this.loadingMore.set(false);
    append ? this.loadingMore.set(true) : this.loading.set(true);

    const slug       = this.slug();
    const genderEnum = GENDER_SLUGS[slug.toLowerCase()];
    const activeCat  = this.activeCat();
    const sizes      = this.activeSizes();
    const colors     = this.activeColors();
    const minPrice   = this.activeMinPrice();
    const maxPrice   = this.activeMaxPrice();

    const params: Parameters<SearchService['searchPlp']>[0] = {
      limit: 24,
      page:  this.currentPage(),
      sort:  this.sortBy(),
      ...(sizes.length  ? { sizes }             : {}),
      ...(colors.length ? { colorNames: colors } : {}),
      ...(minPrice !== null ? { minPrice }        : {}),
      ...(maxPrice !== null ? { maxPrice }        : {}),
    };

    if (slug === 'sale') {
      params.onSale = true;
      if (activeCat !== 'all') params.categorySlug = activeCat;
    } else if (slug === 'new-arrivals') {
      if (activeCat !== 'all') params.categorySlug = activeCat;
    } else if (genderEnum) {
      if (activeCat !== 'all') params.categorySlug = activeCat;
      else                      params.gender       = genderEnum;
    } else {
      params.categorySlug = activeCat !== 'all' ? activeCat : slug;
    }

    this.searchService.searchPlp(params).subscribe({
      next: (res) => {
        if (this.loadSeq !== seq) { if (append) this.loadingMore.set(false); return; }
        const items = (res.hits ?? []).map(searchHitToProduct);

        // Accumulate colorHexMap from hits — never cleared, grows as pages load
        const hexMap: Record<string, string> = { ...this.colorHexMap() };
        for (const hit of res.hits ?? []) {
          for (const color of hit.colors) {
            if (color.colorName && color.colorHex && !hexMap[color.colorName]) {
              hexMap[color.colorName] = color.colorHex;
            }
          }
        }
        this.colorHexMap.set(hexMap);

        if (append) {
          this.products.update(prev => [...prev, ...items]);
          this.loadingMore.set(false);
        } else {
          this.products.set(items);
          this.loading.set(false);
          // Facets come from the search response — only update on fresh load, not append
          this.facetSizes.set(res.facetDistribution?.['sizes'] ?? {});
          this.facetColors.set(res.facetDistribution?.['colorNames'] ?? {});
          this.facetPriceRange.set(res.facetStats?.['basePrice'] ?? null);
          // After DOM settles, check if sentinel is already in view
          // (handles categories with fewer products than a screenful).
          setTimeout(() => {
            if (this.loadSeq === seq) this.onScroll();
          }, 100);
        }
        this.total.set(res.estimatedTotalHits ?? 0);
        this.totalPages.set(res.totalPages ?? 1);
        if (!append) this.mobilePreviewCount.set(res.estimatedTotalHits ?? 0);
      },
      error: () => {
        if (this.loadSeq !== seq) { if (append) this.loadingMore.set(false); return; }
        if (append) { this.loadingMore.set(false); }
        else        { this.products.set([]); this.loading.set(false); }
      },
    });
  }

  loadMore(): void {
    if (!this.hasMore() || this.loadingMore() || this.loading()) return;
    this.currentPage.update(p => p + 1);
    this.loadProducts(true);
  }

  onCatSelected(slug: string): void {
    if (this.pageType() === 'leaf') {
      const dest = slug === 'all' ? this.leafParentSlug() : slug;
      if (dest) this.router.navigate(['/category', dest]);
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { cat: slug === 'all' ? null : slug },
      queryParamsHandling: 'merge',
    });
  }

  onSortSelected(value: SortOption): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort: value === 'newest' ? null : value },
      queryParamsHandling: 'merge',
    });
  }

  onSizesChanged(sizes: string[]): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { size: sizes.length ? sizes : null },
      queryParamsHandling: 'merge',
    });
  }

  onColorsChanged(colors: string[]): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { color: colors.length ? colors : null },
      queryParamsHandling: 'merge',
    });
  }

  onPriceChanged(price: { min: number | null; max: number | null }): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        minPrice: price.min ?? null,
        maxPrice: price.max ?? null,
      },
      queryParamsHandling: 'merge',
    });
  }

  removePill(pill: ActivePill): void {
    switch (pill.type) {
      case 'cat':   this.onCatSelected('all'); break;
      case 'size':  this.onSizesChanged(this.activeSizes().filter(s => s !== pill.value)); break;
      case 'color': this.onColorsChanged(this.activeColors().filter(c => c !== pill.value)); break;
      case 'price': this.onPriceChanged({ min: null, max: null }); break;
    }
  }

  onFiltersApplied(filters: MobileFilters): void {
    const isLeaf = this.pageType() === 'leaf';
    if (isLeaf && filters.cat !== 'all' && filters.cat !== this.activeCat()) {
      this.router.navigate(['/category', filters.cat]);
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        cat:      isLeaf ? undefined : (filters.cat === 'all' ? null : filters.cat),
        size:     filters.sizes.length  ? filters.sizes  : null,
        color:    filters.colors.length ? filters.colors : null,
        minPrice: filters.minPrice ?? null,
        maxPrice: filters.maxPrice ?? null,
      },
      queryParamsHandling: 'merge',
    });
  }

  // ── Sort dropdown (desktop inline) ───────────────────────────────────────────
  toggleSort(e: MouseEvent): void {
    e.stopPropagation();
    this.sortOpen.update(v => !v);
  }

  @HostListener('document:click')
  closeSortDd(): void { this.sortOpen.set(false); }

  // ── Clear all filters (desktop sidebar "Clear All") ───────────────────────────
  onClearAll(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { cat: null, size: null, color: null, minPrice: null, maxPrice: null },
      queryParamsHandling: 'merge',
    });
  }

  // ── Mobile preview count ──────────────────────────────────────────────────────
  onPreviewFiltersChange(filters: MobileFilters): void {
    const slug       = this.slug();
    const genderEnum = GENDER_SLUGS[slug.toLowerCase()];
    const params: Parameters<SearchService['searchPlp']>[0] = {
      limit: 1, page: 1, sort: this.sortBy(),
      ...(filters.sizes.length  ? { sizes: filters.sizes }                : {}),
      ...(filters.colors.length ? { colorNames: filters.colors }          : {}),
      ...(filters.minPrice !== null ? { minPrice: filters.minPrice }       : {}),
      ...(filters.maxPrice !== null ? { maxPrice: filters.maxPrice }       : {}),
    };
    if (slug === 'sale') {
      params.onSale = true;
      if (filters.cat !== 'all') params.categorySlug = filters.cat;
    } else if (slug === 'new-arrivals') {
      if (filters.cat !== 'all') params.categorySlug = filters.cat;
    } else if (genderEnum) {
      if (filters.cat !== 'all') params.categorySlug = filters.cat;
      else params.gender = genderEnum;
    } else {
      params.categorySlug = filters.cat !== 'all' ? filters.cat : slug;
    }
    this.searchService.searchPlp(params).subscribe({
      next: (res) => {
        if (this.slug() !== slug) return;
        this.mobilePreviewCount.set(res.estimatedTotalHits ?? 0);
      },
      error: () => {},
    });
  }

  saveScrollState(productId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const stateKey = this.buildStateKey(
      this.slug(), this.activeCat(),
      this.activeSizes(), this.activeColors(),
      this.activeMinPrice(), this.activeMaxPrice(),
    );
    const state: PlpScrollState = {
      products:    this.products(),
      currentPage: this.currentPage(),
      totalPages:  this.totalPages(),
      total:       this.total(),
      sortBy:      this.sortBy(),
      scrollToId:  `plp-${productId}`,
    };
    try {
      sessionStorage.setItem(stateKey, JSON.stringify(state));
    } catch { /* quota exceeded — fail silently */ }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.sentinel) return;
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
    });
  }

  // Arrow fn so it's the same reference for removeEventListener
  private readonly onScroll = (): void => {
    if (!this.sentinel || !isPlatformBrowser(this.platformId)) return;
    const rect = this.sentinel.nativeElement.getBoundingClientRect();
    if (rect.top < window.innerHeight + 200) {
      this.ngZone.run(() => this.loadMore());
    }
  };

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('scroll', this.onScroll);
    }
  }
}

import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
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
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { Product } from '../../core/models/product.model';
import { ProductCardComponent } from '../../shared/product-card/product-card.component';
import { AnimateOnScrollDirective } from '../../core/directives/animate-on-scroll.directive';

type SortOption = 'newest' | 'price-asc' | 'price-desc';
type PageType = 'gender' | 'parent' | 'leaf';
type SheetType = 'none' | 'sort' | 'category';

interface FilterOption { label: string; slug: string; }

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

const CARET_SVG = `<svg width="10" height="7" viewBox="0 0 10 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M1 1l4 4 4-4"/></svg>`;

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [ProductCardComponent, AnimateOnScrollDirective, RouterLink],
  templateUrl: './category.component.html',
  styleUrl: './category.component.scss',
})
export class CategoryComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly platformId     = inject(PLATFORM_ID);
  private readonly route          = inject(ActivatedRoute);
  private readonly router         = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly categoryService= inject(CategoryService);
  private readonly meta           = inject(Meta);
  private readonly titleService   = inject(Title);

  @ViewChild('scrollSentinel') private sentinel!: ElementRef<HTMLDivElement>;
  private observer: IntersectionObserver | null = null;
  private sentinelVisible = false;
  // Captured in constructor (mid-navigation) — getCurrentNavigation() returns null
  // by the time the combineLatest subscribe callback fires (after NavigationEnd).
  private readonly initialNavTrigger = this.router.getCurrentNavigation()?.trigger;

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
  readonly sortOpen        = signal(false);
  readonly catDdOpen       = signal(false);
  readonly activeCat       = signal<string>('all');
  readonly pendingCat      = signal<string>('all');
  readonly sheetOpen       = signal<SheetType>('none');
  readonly pageType        = signal<PageType>('leaf');
  readonly categoryOptions = signal<FilterOption[]>([]);

  private prevSlug = '';

  readonly skeletons = [1,2,3,4,5,6,7,8];

  readonly sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest',     label: 'Newest First' },
    { value: 'price-asc',  label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
  ];

  readonly sortLabel = computed(() =>
    this.sortOptions.find(o => o.value === this.sortBy())?.label ?? 'Newest First'
  );

  readonly sortShortLabel = computed(() => {
    const map: Record<SortOption, string> = {
      'newest': 'NEWEST', 'price-asc': 'PRICE ↑', 'price-desc': 'PRICE ↓',
    };
    return map[this.sortBy()];
  });

  readonly displayName = computed(() =>
    this.slug().replace(/-/g, ' ').toUpperCase()
  );

  readonly hasCatFilter = computed(() => this.activeCat() !== 'all');

  readonly catPillLabel = computed(() => {
    if (!this.hasCatFilter()) return 'CATEGORY';
    const opt = this.categoryOptions().find(o => o.slug === this.activeCat());
    return (opt?.label ?? 'CATEGORY') + ' ×';
  });

  readonly mobCatLabel = computed(() => {
    const opt = this.categoryOptions().find(o => o.slug === this.activeCat());
    return opt?.label ?? 'CATEGORIES';
  });

  ngOnInit(): void {
    combineLatest([this.route.params, this.route.queryParams]).subscribe(([params, query]) => {
      const newSlug    = params['slug'] ?? '';
      const catFromUrl = (query['cat'] as string) ?? 'all';

      this.activeCat.set(catFromUrl);
      this.pendingCat.set(catFromUrl);

      // ── Scroll restoration (Option C) ───────────────────────────────
      const isBrowser   = isPlatformBrowser(this.platformId);
      const isBackNav   = this.initialNavTrigger === 'popstate';
      const stateKey    = `plp:${newSlug}:${catFromUrl}`;
      let   restoredFromState = false;

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
            // Scroll after DOM paints — instant (no animation) to feel like native back
            setTimeout(() => {
              document.getElementById(state.scrollToId)
                ?.scrollIntoView({ block: 'center', behavior: 'instant' });
            }, 0);
          } catch { /* corrupt JSON — fall through to normal load */ }
        }
      }

      if (!restoredFromState) {
        // Clear any stale saved state for this category on fresh (non-back) navigation
        if (isBrowser) {
          Object.keys(sessionStorage)
            .filter(k => k.startsWith(`plp:${newSlug}:`))
            .forEach(k => sessionStorage.removeItem(k));
        }
        this.currentPage.set(1);
        this.products.set([]);
      }
      // ────────────────────────────────────────────────────────────────

      if (newSlug !== this.prevSlug) {
        this.prevSlug = newSlug;
        this.slug.set(newSlug);
        if (!restoredFromState) {
          this.categoryOptions.set([]);
          this.breadcrumbs.set([]);
          this.pageType.set('leaf');
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

  private loadCategoryMeta(): void {
    const slug       = this.slug();
    const genderEnum = GENDER_SLUGS[slug.toLowerCase()];

    if (genderEnum) {
      this.pageType.set('gender');
      this.breadcrumbs.set([{ label: slug.toUpperCase() }]);
      this.categoryService.getNavTreeByGender(genderEnum).subscribe({
        next: (groups) => {
          this.categoryOptions.set(
            groups.flatMap(g => g.categories.map(c => ({ label: c.name.toUpperCase(), slug: c.slug })))
          );
        },
        error: () => {},
      });
    } else {
      this.categoryService.getBySlug(slug).subscribe({
        next: (cat) => {
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
            this.categoryOptions.set([]);
          }
        },
        error: () => this.pageType.set('leaf'),
      });
    }
  }

  private loadProducts(append = false): void {
    append ? this.loadingMore.set(true) : this.loading.set(true);

    const slug       = this.slug();
    const genderEnum = GENDER_SLUGS[slug.toLowerCase()];
    const activeCat  = this.activeCat();

    const params: Record<string, unknown> = {
      status: 'ACTIVE',
      limit: 24,
      page: this.currentPage(),
      sort: this.sortBy(),
    };

    if (genderEnum) {
      if (activeCat !== 'all') params['categorySlug'] = activeCat;
      else                      params['gender']       = genderEnum;
    } else {
      params['categorySlug'] = activeCat !== 'all' ? activeCat : slug;
    }

    this.productService.getProducts(params as any).subscribe({
      next: (res) => {
        const items = res.items ?? [];
        if (append) {
          this.products.update(prev => [...prev, ...items]);
          this.loadingMore.set(false);
        } else {
          this.products.set(items);
          this.loading.set(false);
          // Sentinel may have been visible during load (user scrolled fast or short page).
          // Observer won't re-fire for persistent intersection — trigger manually.
          if (this.sentinelVisible) setTimeout(() => this.loadMore(), 0);
        }
        this.total.set(res.total ?? 0);
        this.totalPages.set(res.totalPages ?? 1);
      },
      error: () => {
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

  // ── Desktop dropdown ──────────────────────────────────────────────

  toggleCatDd(event: MouseEvent): void {
    event.stopPropagation();
    this.sortOpen.set(false);
    this.catDdOpen.update(v => !v);
  }

  selectCat(slug: string): void {
    this.catDdOpen.set(false);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { cat: slug === 'all' ? null : slug },
      queryParamsHandling: 'merge',
    });
  }

  toggleSort(event: MouseEvent): void {
    event.stopPropagation();
    this.catDdOpen.set(false);
    this.sortOpen.update(v => !v);
  }

  selectSort(value: SortOption): void {
    this.sortBy.set(value);
    this.sortOpen.set(false);
    this.currentPage.set(1);
    this.products.set([]);
    this.loadProducts();
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    this.sortOpen.set(false);
    this.catDdOpen.set(false);
  }

  // ── Mobile bottom sheet ───────────────────────────────────────────

  openSheet(type: 'sort' | 'category'): void {
    this.pendingCat.set(this.activeCat());
    this.sheetOpen.set(type);
  }

  closeSheet(): void { this.sheetOpen.set('none'); }

  setPendingCat(slug: string): void { this.pendingCat.set(slug); }

  clearPending(): void { this.pendingCat.set('all'); }

  applyCategory(): void {
    const cat = this.pendingCat();
    this.sheetOpen.set('none');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { cat: cat === 'all' ? null : cat },
      queryParamsHandling: 'merge',
    });
  }

  selectSortMobile(value: SortOption): void {
    this.sortBy.set(value);
    this.sheetOpen.set('none');
    this.currentPage.set(1);
    this.products.set([]);
    this.loadProducts();
  }

  // ── Scroll state (Option C) ───────────────────────────────────────

  saveScrollState(productId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const stateKey = `plp:${this.slug()}:${this.activeCat()}`;
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

  // ── Infinite scroll ───────────────────────────────────────────────

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.sentinel) return;
    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.sentinelVisible = entry.isIntersecting;
        if (entry.isIntersecting) this.loadMore();
      },
      { rootMargin: '200px' }
    );
    this.observer.observe(this.sentinel.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}

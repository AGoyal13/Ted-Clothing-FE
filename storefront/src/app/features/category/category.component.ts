import {
  AfterViewInit,
  Component,
  ElementRef,
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
import { CatFilterBarComponent } from './components/cat-filter-bar/cat-filter-bar.component';
import { CatMobileFilterComponent } from './components/cat-mobile-filter/cat-mobile-filter.component';

type SortOption = 'newest' | 'price-asc' | 'price-desc';
type PageType = 'gender' | 'parent' | 'leaf';

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

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [ProductCardComponent, AnimateOnScrollDirective, RouterLink, CatFilterBarComponent, CatMobileFilterComponent],
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
  readonly activeCat       = signal<string>('all');
  readonly pageType        = signal<PageType>('leaf');
  readonly categoryOptions = signal<FilterOption[]>([]);

  private prevSlug = '';

  readonly skeletons = [1,2,3,4,5,6,7,8];

  readonly displayName = computed(() =>
    this.slug().replace(/-/g, ' ').toUpperCase()
  );

  ngOnInit(): void {
    combineLatest([this.route.params, this.route.queryParams]).subscribe(([params, query]) => {
      const newSlug    = params['slug'] ?? '';
      const catFromUrl = (query['cat'] as string) ?? 'all';

      this.activeCat.set(catFromUrl);

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

  onCatSelected(slug: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { cat: slug === 'all' ? null : slug },
      queryParamsHandling: 'merge',
    });
  }

  onSortSelected(value: SortOption): void {
    this.sortBy.set(value);
    this.currentPage.set(1);
    this.products.set([]);
    this.loadProducts();
  }

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

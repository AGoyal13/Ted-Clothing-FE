import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { ProductService } from '../../core/services/product.service';
import { Product, formatINR } from '../../core/models/product.model';
import { ProductCardComponent } from '../../shared/product-card/product-card.component';
import { AnimateOnScrollDirective } from '../../core/directives/animate-on-scroll.directive';

type SortOption = 'newest' | 'price-asc' | 'price-desc';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [ProductCardComponent, AnimateOnScrollDirective],
  template: `
    <main class="cat-page">
      <!-- Page Header -->
      <div class="cat-page__header">
        <div class="cat-page__header-inner">
          <p class="cat-page__breadcrumb">Home / {{ slug() }}</p>
          <h1 class="cat-page__title">{{ displayName() }}</h1>
          @if (!loading()) {
            <p class="cat-page__count">{{ total() }} products</p>
          }
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="cat-page__filters">
        <div class="cat-page__filters-inner">
          <!-- Gender Filter Chips -->
          <div class="cat-page__chips" role="group" aria-label="Filter by gender">
            @for (gender of genderFilters; track gender.value) {
              <button
                class="cat-page__chip"
                [class.cat-page__chip--active]="activeGender() === gender.value"
                (click)="setGender(gender.value)"
              >{{ gender.label }}</button>
            }
          </div>

          <!-- Sort -->
          <div class="cat-page__sort">
            <label for="sort" class="cat-page__sort-label">SORT:</label>
            <select
              id="sort"
              class="cat-page__sort-select"
              [value]="sortBy()"
              (change)="onSortChange($event)"
              aria-label="Sort products"
            >
              <option value="newest">Newest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Product Grid -->
      <div class="cat-page__content">
        @if (loading()) {
          <div class="cat-page__grid">
            @for (i of [1,2,3,4,5,6,7,8]; track i) {
              <div class="cat-page__skeleton">
                <div class="skeleton aspect-3-4"></div>
                <div class="skeleton" style="height:14px;width:70%;margin-top:8px;"></div>
                <div class="skeleton" style="height:12px;width:40%;margin-top:6px;"></div>
              </div>
            }
          </div>
        } @else if (sortedProducts().length === 0) {
          <div class="cat-page__empty">
            <p class="cat-page__empty-text">
              <em>No products found in this collection yet.</em>
            </p>
            <p class="cat-page__empty-sub">Check back soon — new arrivals every Friday.</p>
          </div>
        } @else {
          <div class="cat-page__grid">
            @for (product of sortedProducts(); track product.id; let i = $index) {
              <app-product-card
                appAnimateOnScroll
                [product]="product"
                [delay]="(i * 60) + 'ms'"
              />
            }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="cat-page__pagination" role="navigation" aria-label="Pagination">
              <button
                class="cat-page__page-btn"
                (click)="prevPage()"
                [disabled]="currentPage() <= 1"
                aria-label="Previous page"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <span class="cat-page__page-indicator">
                {{ currentPage() }} / {{ totalPages() }}
              </span>
              <button
                class="cat-page__page-btn"
                (click)="nextPage()"
                [disabled]="currentPage() >= totalPages()"
                aria-label="Next page"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          }
        }
      </div>
    </main>
  `,
  styles: [`
    .cat-page {
      min-height: 100vh;
      padding-top: 80px;
    }

    .cat-page__header {
      background: var(--surface);
      border-bottom: 1px solid rgba(245, 240, 232, 0.06);
      padding: 3rem 5%;
    }

    .cat-page__header-inner {
      max-width: 1440px;
      margin: 0 auto;
    }

    .cat-page__breadcrumb {
      font-family: var(--font-sans);
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      color: var(--muted);
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }

    .cat-page__title {
      font-family: var(--font-display);
      font-size: clamp(2.5rem, 6vw, 4rem);
      letter-spacing: 0.06em;
      color: var(--cream);
      text-transform: uppercase;
    }

    .cat-page__count {
      font-family: var(--font-sans);
      font-size: 0.8rem;
      color: var(--muted);
      margin-top: 0.375rem;
    }

    .cat-page__filters {
      border-bottom: 1px solid rgba(245, 240, 232, 0.06);
      position: sticky;
      top: 74px;
      background: rgba(13, 13, 13, 0.92);
      backdrop-filter: blur(10px);
      z-index: 100;
    }

    .cat-page__filters-inner {
      max-width: 1440px;
      margin: 0 auto;
      padding: 0 5%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      height: 56px;
      flex-wrap: wrap;
    }

    .cat-page__chips {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .cat-page__chip {
      font-family: var(--font-display);
      font-size: 0.7rem;
      letter-spacing: 0.2em;
      padding: 0.35rem 0.875rem;
      border: 1px solid rgba(245, 240, 232, 0.15);
      color: var(--muted);
      background: transparent;
      cursor: pointer;
      transition: border-color 0.2s ease, color 0.2s ease;

      &:hover {
        border-color: var(--gold);
        color: var(--gold);
      }

      &--active {
        border-color: var(--gold);
        color: var(--gold);
        background: rgba(201, 168, 76, 0.08);
      }
    }

    .cat-page__sort {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .cat-page__sort-label {
      font-family: var(--font-display);
      font-size: 0.65rem;
      letter-spacing: 0.3em;
      color: var(--muted);
    }

    .cat-page__sort-select {
      background: transparent;
      border: 1px solid rgba(245, 240, 232, 0.15);
      color: var(--cream);
      font-family: var(--font-sans);
      font-size: 0.8rem;
      padding: 0.35rem 0.625rem;
      cursor: pointer;
      outline: none;
      transition: border-color 0.2s ease;

      option {
        background: var(--surface);
      }

      &:focus {
        border-color: var(--gold);
      }
    }

    .cat-page__content {
      max-width: 1440px;
      margin: 0 auto;
      padding: 2.5rem 5%;
    }

    .cat-page__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.5rem 1.25rem;
    }

    .cat-page__skeleton {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .cat-page__empty {
      text-align: center;
      padding: 5rem 0;
    }

    .cat-page__empty-text {
      font-family: var(--font-serif);
      font-style: italic;
      font-size: 1.5rem;
      color: var(--muted);
      margin-bottom: 0.75rem;
    }

    .cat-page__empty-sub {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: rgba(107, 101, 96, 0.7);
    }

    .cat-page__pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      margin-top: 3rem;
    }

    .cat-page__page-btn {
      width: 40px;
      height: 40px;
      border: 1px solid rgba(245, 240, 232, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--cream);
      cursor: pointer;
      background: transparent;
      transition: border-color 0.2s ease, color 0.2s ease;

      &:hover:not(:disabled) {
        border-color: var(--gold);
        color: var(--gold);
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
    }

    .cat-page__page-indicator {
      font-family: var(--font-display);
      font-size: 0.875rem;
      letter-spacing: 0.15em;
      color: var(--muted);
    }
  `],
})
export class CategoryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly meta = inject(Meta);
  private readonly titleService = inject(Title);

  readonly slug = signal('');
  readonly loading = signal(true);
  readonly products = signal<Product[]>([]);
  readonly total = signal(0);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly sortBy = signal<SortOption>('newest');
  readonly activeGender = signal<string>('all');

  readonly displayName = computed(() => {
    const s = this.slug();
    return s.replace(/-/g, ' ').toUpperCase();
  });

  readonly sortedProducts = computed(() => {
    const list = [...this.products()];
    const sort = this.sortBy();
    if (sort === 'price-asc') {
      return list.sort((a, b) => parseFloat(a.basePrice) - parseFloat(b.basePrice));
    } else if (sort === 'price-desc') {
      return list.sort((a, b) => parseFloat(b.basePrice) - parseFloat(a.basePrice));
    }
    return list;
  });

  readonly genderFilters = [
    { label: 'ALL', value: 'all' },
    { label: 'MEN', value: 'MEN' },
    { label: 'WOMEN', value: 'WOMEN' },
    { label: 'KIDS', value: 'KIDS' },
    { label: 'UNISEX', value: 'UNISEX' },
  ];

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const newSlug = params['slug'] ?? '';
      this.slug.set(newSlug);
      this.currentPage.set(1);
      this.loadProducts();
      this.titleService.setTitle(`${this.displayName()} — Ted Clothing`);
      this.meta.updateTag({ name: 'description', content: `Shop ${this.displayName()} at Ted Clothing. Premium handcrafted Indian clothing.` });
    });
  }

  private loadProducts(): void {
    this.loading.set(true);
    this.productService.getProducts({
      categorySlug: this.slug(),
      status: 'ACTIVE',
      limit: 24,
      page: this.currentPage(),
    }).subscribe({
      next: (res) => {
        this.products.set(res.items ?? []);
        this.total.set(res.total ?? 0);
        this.totalPages.set(res.totalPages ?? 1);
        this.loading.set(false);
      },
      error: () => {
        this.products.set([]);
        this.loading.set(false);
      },
    });
  }

  setGender(gender: string): void {
    this.activeGender.set(gender);
    // Client-side filter — can extend to server-side
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortBy.set(select.value as SortOption);
  }

  prevPage(): void {
    if (this.currentPage() <= 1) return;
    this.currentPage.update(p => p - 1);
    this.loadProducts();
  }

  nextPage(): void {
    if (this.currentPage() >= this.totalPages()) return;
    this.currentPage.update(p => p + 1);
    this.loadProducts();
  }

  readonly formatINR = formatINR;
}

import {
  Component,
  HostListener,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
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

const GENDER_SLUGS: Record<string, 'MEN' | 'WOMEN' | 'KIDS'> = {
  men: 'MEN', women: 'WOMEN', kids: 'KIDS',
};

const CARET_SVG = `<svg width="10" height="7" viewBox="0 0 10 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M1 1l4 4 4-4"/></svg>`;

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [ProductCardComponent, AnimateOnScrollDirective, RouterLink],
  template: `
    <main class="cat-page">

      <!-- ── Mobile-only scrollable header ──────────────────────────── -->
      <div class="cat-page__mobile-hdr">
        <nav class="cat-page__bc" aria-label="Breadcrumb">
          <a routerLink="/" class="cat-page__bc-link">Home</a>
          @for (crumb of breadcrumbs(); track crumb.label; let last = $last) {
            <span class="cat-page__bc-sep">/</span>
            @if (!last && crumb.slug) {
              <a [routerLink]="['/category', crumb.slug]" class="cat-page__bc-link">{{ crumb.label }}</a>
            } @else {
              <span class="cat-page__bc-cur">{{ crumb.label }}</span>
            }
          }
        </nav>
        <h1 class="cat-page__title">{{ displayName() }}</h1>
        <p class="cat-page__count">{{ total() }} products</p>
      </div>

      <!-- ── Desktop unified sticky bar ────────────────────────────── -->
      <div class="cat-page__bar">
        <div class="cat-page__bar-inner">

          <!-- Left: breadcrumb only -->
          <div class="cat-page__bar-left">
            <nav class="cat-page__bc" aria-label="Breadcrumb">
              <a routerLink="/" class="cat-page__bc-link">Home</a>
              @for (crumb of breadcrumbs(); track crumb.label; let last = $last) {
                <span class="cat-page__bc-sep">/</span>
                @if (!last && crumb.slug) {
                  <a [routerLink]="['/category', crumb.slug]" class="cat-page__bc-link">{{ crumb.label }}</a>
                } @else {
                  <span class="cat-page__bc-cur">{{ crumb.label }}</span>
                }
              }
            </nav>
          </div>

          <!-- Right: pills -->
          <div class="cat-page__bar-right" (click)="$event.stopPropagation()">

            <!-- Category pill -->
            @if (categoryOptions().length > 0) {
              <div class="cat-page__pill-wrap">
                <button
                  class="cat-page__pill"
                  [class.cat-page__pill--active]="hasCatFilter()"
                  (click)="toggleCatDd($event)"
                  [attr.aria-expanded]="catDdOpen()"
                >
                  <span>{{ catPillLabel() }}</span>
                  <svg class="cat-page__caret" [class.cat-page__caret--open]="catDdOpen()"
                    width="10" height="7" viewBox="0 0 10 7" fill="none"
                    stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                    <path d="M1 1l4 4 4-4"/>
                  </svg>
                </button>
                @if (catDdOpen()) {
                  <ul class="cat-page__dd" role="listbox">
                    <li class="cat-page__dd-opt" [class.cat-page__dd-opt--active]="activeCat() === 'all'"
                      (click)="selectCat('all')">All</li>
                    @for (opt of categoryOptions(); track opt.slug) {
                      <li class="cat-page__dd-opt" [class.cat-page__dd-opt--active]="activeCat() === opt.slug"
                        (click)="selectCat(opt.slug)">{{ opt.label }}</li>
                    }
                  </ul>
                }
              </div>
            }

            <!-- Sort pill -->
            <div class="cat-page__pill-wrap">
              <button
                class="cat-page__pill"
                (click)="toggleSort($event)"
                [attr.aria-expanded]="sortOpen()"
              >
                <span>{{ sortLabel() }}</span>
                <svg class="cat-page__caret" [class.cat-page__caret--open]="sortOpen()"
                  width="10" height="7" viewBox="0 0 10 7" fill="none"
                  stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                  <path d="M1 1l4 4 4-4"/>
                </svg>
              </button>
              @if (sortOpen()) {
                <ul class="cat-page__dd cat-page__dd--right" role="listbox">
                  @for (opt of sortOptions; track opt.value) {
                    <li class="cat-page__dd-opt" [class.cat-page__dd-opt--active]="sortBy() === opt.value"
                      (click)="selectSort(opt.value)">{{ opt.label }}</li>
                  }
                </ul>
              }
            </div>

          </div>
        </div>
      </div>

      <!-- ── Product grid ────────────────────────────────────────────── -->
      <div class="cat-page__content">

        <!-- Title + count — desktop only (mobile uses cat-page__mobile-hdr) -->
        <div class="cat-page__content-meta">
          <span class="cat-page__bar-title">{{ displayName() }}</span>
          <span class="cat-page__bar-sep">·</span>
          <span class="cat-page__bar-count">{{ total() }} products</span>
        </div>

        @if (loading()) {
          <div class="cat-page__grid">
            @for (i of skeletons; track i) {
              <div class="cat-page__skeleton">
                <div class="skeleton aspect-3-4"></div>
                <div class="skeleton" style="height:14px;width:70%;margin-top:8px;"></div>
                <div class="skeleton" style="height:12px;width:40%;margin-top:6px;"></div>
              </div>
            }
          </div>
        } @else if (products().length === 0) {
          <div class="cat-page__empty">
            <p class="cat-page__empty-text"><em>No products found in this collection yet.</em></p>
            <p class="cat-page__empty-sub">Check back soon — new arrivals every Friday.</p>
          </div>
        } @else {
          <div class="cat-page__grid">
            @for (product of products(); track product.id; let i = $index) {
              <app-product-card appAnimateOnScroll [product]="product" [delay]="(i * 60) + 'ms'" />
            }
          </div>
          @if (totalPages() > 1) {
            <div class="cat-page__pagination" role="navigation" aria-label="Pagination">
              <button class="cat-page__page-btn" (click)="prevPage()" [disabled]="currentPage() <= 1" aria-label="Previous page">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span class="cat-page__page-ind">{{ currentPage() }} / {{ totalPages() }}</span>
              <button class="cat-page__page-btn" (click)="nextPage()" [disabled]="currentPage() >= totalPages()" aria-label="Next page">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          }
        }
      </div>

      <!-- ── Mobile fixed bottom bar ────────────────────────────────── -->
      <div class="cat-page__mob-bar">
        <button class="cat-page__mob-btn" (click)="openSheet('sort')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/>
          </svg>
          <span>{{ sortBy() === 'newest' ? 'SORT' : sortShortLabel() }}</span>
        </button>
        @if (categoryOptions().length > 0) {
          <div class="cat-page__mob-divider"></div>
          <button
            class="cat-page__mob-btn"
            [class.cat-page__mob-btn--active]="hasCatFilter()"
            (click)="openSheet('category')"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="21" y2="12"/><line x1="9" y1="18" x2="21" y2="18"/>
            </svg>
            <span>{{ hasCatFilter() ? mobCatLabel() : 'CATEGORIES' }}</span>
          </button>
        }
      </div>

      <!-- ── Bottom sheet ───────────────────────────────────────────── -->
      @if (sheetOpen() !== 'none') {
        <div class="cat-page__backdrop" (click)="closeSheet()"></div>
        <div class="cat-page__sheet" role="dialog" [attr.aria-label]="sheetOpen() === 'sort' ? 'Sort options' : 'Filter by category'">
          <div class="cat-page__sheet-handle"></div>

          @if (sheetOpen() === 'sort') {
            <div class="cat-page__sheet-title">SORT BY</div>
            <div class="cat-page__sheet-rule"></div>
            <div class="cat-page__sheet-scroll">
              @for (opt of sortOptions; track opt.value) {
                <button class="cat-page__sheet-opt" [class.cat-page__sheet-opt--active]="sortBy() === opt.value"
                  (click)="selectSortMobile(opt.value)">
                  <span class="cat-page__radio" [class.cat-page__radio--on]="sortBy() === opt.value"></span>
                  {{ opt.label }}
                </button>
              }
            </div>
          } @else {
            <div class="cat-page__sheet-title">CATEGORY</div>
            <div class="cat-page__sheet-rule"></div>
            <div class="cat-page__sheet-scroll">
              <button class="cat-page__sheet-opt" [class.cat-page__sheet-opt--active]="pendingCat() === 'all'"
                (click)="setPendingCat('all')">
                <span class="cat-page__radio" [class.cat-page__radio--on]="pendingCat() === 'all'"></span>
                All
              </button>
              @for (opt of categoryOptions(); track opt.slug) {
                <button class="cat-page__sheet-opt" [class.cat-page__sheet-opt--active]="pendingCat() === opt.slug"
                  (click)="setPendingCat(opt.slug)">
                  <span class="cat-page__radio" [class.cat-page__radio--on]="pendingCat() === opt.slug"></span>
                  {{ opt.label }}
                </button>
              }
            </div>
            <div class="cat-page__sheet-actions">
              <button class="cat-page__sheet-clear" (click)="clearPending()">CLEAR</button>
              <button class="cat-page__sheet-apply" (click)="applyCategory()">APPLY</button>
            </div>
          }
        </div>
      }

    </main>
  `,
  styles: [`
    /* ── Base ──────────────────────────────────────────────────────── */
    .cat-page {
      min-height: 100vh;
      padding-top: 80px;
    }

    /* ── Mobile scrollable header (hidden ≥769px) ───────────────────── */
    .cat-page__mobile-hdr {
      padding: 2rem 5% 1.5rem;
      background: var(--surface);
      border-bottom: 1px solid rgba(245,240,232,.06);

      @media (min-width: 769px) { display: none; }
    }

    .cat-page__title {
      font-family: var(--font-display);
      font-size: clamp(2.5rem, 6vw, 4rem);
      letter-spacing: .06em;
      color: var(--cream);
      text-transform: uppercase;
      margin-top: .5rem;
    }

    .cat-page__count {
      font-family: var(--font-sans);
      font-size: .8rem;
      color: var(--muted);
      margin-top: .375rem;
    }

    /* ── Breadcrumb (shared) ────────────────────────────────────────── */
    .cat-page__bc {
      display: flex;
      align-items: center;
      gap: .35rem;
      font-family: var(--font-sans);
      font-size: .7rem;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    .cat-page__bc-link { color: var(--muted); text-decoration: none; }
    .cat-page__bc-link:hover { color: var(--foreground); }
    .cat-page__bc-sep  { color: var(--muted); opacity: .4; }
    .cat-page__bc-cur  { color: var(--foreground); font-weight: 500; }

    /* ── Desktop sticky bar (hidden ≤768px) ─────────────────────────── */
    .cat-page__bar {
      position: sticky;
      top: 74px;
      background: rgba(13,13,13,.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(245,240,232,.06);
      z-index: 100;

      @media (max-width: 768px) { display: none; }
    }

    .cat-page__bar-inner {
      max-width: 1440px;
      margin: 0 auto;
      padding: 0 5%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      min-height: 62px;
    }

    .cat-page__bar-left {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: .15rem;
      min-width: 0;
    }

    .cat-page__content-meta {
      display: none;

      @media (min-width: 769px) {
        display: flex;
        align-items: baseline;
        gap: .5rem;
        margin-bottom: 1.5rem;
      }
    }

    .cat-page__bar-title {
      font-family: var(--font-display);
      font-size: 1.4rem;
      letter-spacing: .1em;
      color: var(--cream);
      text-transform: uppercase;
      white-space: nowrap;
    }

    .cat-page__bar-sep { color: var(--muted); opacity: .35; font-size: .8rem; }

    .cat-page__bar-count {
      font-family: var(--font-sans);
      font-size: .72rem;
      color: var(--muted);
      white-space: nowrap;
    }

    .cat-page__bar-right {
      display: flex;
      align-items: center;
      gap: .5rem;
      flex-shrink: 0;
    }

    /* ── Dropdown pills (desktop) ───────────────────────────────────── */
    .cat-page__pill-wrap { position: relative; }

    .cat-page__pill {
      display: flex;
      align-items: center;
      gap: .5rem;
      background: transparent;
      border: 1px solid rgba(201,168,76,.25);
      color: var(--cream);
      font-family: var(--font-sans);
      font-size: .75rem;
      letter-spacing: .08em;
      padding: .4rem .9rem;
      cursor: pointer;
      white-space: nowrap;
      transition: border-color .2s, color .2s, background .2s;

      &:hover { border-color: var(--gold); color: var(--gold); }

      &--active {
        background: var(--gold);
        border-color: var(--gold);
        color: #0d0d0d;
        font-weight: 600;
        &:hover { background: rgba(201,168,76,.85); color: #0d0d0d; }
      }
    }

    .cat-page__caret {
      flex-shrink: 0;
      transition: transform .2s;
      &--open { transform: rotate(180deg); }
    }

    .cat-page__dd {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      min-width: 100%;
      max-width: 240px;
      max-height: 340px;
      overflow-y: auto;
      background: var(--surface);
      border: 1px solid rgba(201,168,76,.2);
      list-style: none;
      z-index: 200;
      animation: ddIn .15s var(--ease-enter, ease) both;

      &--right { left: auto; right: 0; min-width: 200px; }
    }

    @keyframes ddIn {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .cat-page__dd-opt {
      padding: .6rem 1rem;
      font-family: var(--font-sans);
      font-size: .8rem;
      color: var(--cream);
      cursor: pointer;
      white-space: nowrap;
      transition: background .15s, color .15s;

      &:hover { background: rgba(201,168,76,.08); color: var(--gold); }

      &--active {
        color: var(--gold);
        &::before { content: '— '; opacity: .6; }
      }
    }

    /* ── Product grid ───────────────────────────────────────────────── */
    .cat-page__content {
      max-width: 1440px;
      margin: 0 auto;
      padding: 2.5rem 5%;

      @media (max-width: 768px) {
        padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 2rem);
      }
    }

    .cat-page__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.5rem 1.25rem;
    }

    .cat-page__skeleton { display: flex; flex-direction: column; gap: .5rem; }

    .cat-page__empty { text-align: center; padding: 5rem 0; }
    .cat-page__empty-text {
      font-family: var(--font-serif);
      font-style: italic;
      font-size: 1.5rem;
      color: var(--muted);
      margin-bottom: .75rem;
    }
    .cat-page__empty-sub {
      font-family: var(--font-sans);
      font-size: .875rem;
      color: rgba(107,101,96,.7);
    }

    /* ── Pagination ─────────────────────────────────────────────────── */
    .cat-page__pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      margin-top: 3rem;
    }

    .cat-page__page-btn {
      width: 40px; height: 40px;
      border: 1px solid rgba(245,240,232,.15);
      display: flex; align-items: center; justify-content: center;
      color: var(--cream);
      cursor: pointer;
      background: transparent;
      transition: border-color .2s, color .2s;

      &:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
      &:disabled { opacity: .3; cursor: not-allowed; }
    }

    .cat-page__page-ind {
      font-family: var(--font-display);
      font-size: .875rem;
      letter-spacing: .15em;
      color: var(--muted);
    }

    /* ── Mobile fixed bottom bar (hidden ≥769px) ────────────────────── */
    .cat-page__mob-bar {
      display: none;

      @media (max-width: 768px) {
        display: flex;
        position: fixed;
        bottom: 0;
        left: 0; right: 0;
        height: calc(56px + env(safe-area-inset-bottom, 0px));
        padding-bottom: env(safe-area-inset-bottom, 0px);
        background: var(--surface);
        border-top: 1px solid rgba(245,240,232,.1);
        z-index: 200;
        align-items: stretch;
      }
    }

    .cat-page__mob-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .45rem;
      background: transparent;
      border: none;
      color: var(--muted);
      font-family: var(--font-sans);
      font-size: .72rem;
      letter-spacing: .12em;
      cursor: pointer;
      transition: color .2s, background .2s;

      &:hover   { color: var(--cream); background: rgba(245,240,232,.04); }
      &--active { color: var(--gold);  background: rgba(201,168,76,.08); }
    }

    .cat-page__mob-divider {
      width: 1px;
      background: rgba(245,240,232,.08);
      margin: 10px 0;
      align-self: stretch;
    }

    /* ── Backdrop ───────────────────────────────────────────────────── */
    .cat-page__backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.55);
      z-index: 300;
      animation: fadeIn .2s ease both;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* ── Bottom sheet ───────────────────────────────────────────────── */
    .cat-page__sheet {
      position: fixed;
      bottom: 0;
      left: 0; right: 0;
      max-height: 75vh;
      display: flex;
      flex-direction: column;
      background: var(--surface);
      border-top: 1px solid rgba(201,168,76,.2);
      z-index: 400;
      animation: sheetIn .3s cubic-bezier(.4,0,.2,1) both;
    }

    @keyframes sheetIn {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }

    .cat-page__sheet-handle {
      width: 40px; height: 4px;
      background: rgba(245,240,232,.2);
      border-radius: 2px;
      margin: .875rem auto 0;
      flex-shrink: 0;
    }

    .cat-page__sheet-title {
      font-family: var(--font-display);
      font-size: .72rem;
      letter-spacing: .25em;
      color: var(--muted);
      text-transform: uppercase;
      padding: .875rem 1.5rem .5rem;
      flex-shrink: 0;
    }

    .cat-page__sheet-rule {
      height: 1px;
      background: rgba(245,240,232,.06);
      margin: 0 1.5rem .5rem;
      flex-shrink: 0;
    }

    .cat-page__sheet-scroll {
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      flex: 1;
      min-height: 0;
    }

    .cat-page__sheet-opt {
      display: flex;
      align-items: center;
      gap: .875rem;
      width: 100%;
      padding: .875rem 1.5rem;
      background: transparent;
      border: none;
      color: var(--cream);
      font-family: var(--font-sans);
      font-size: .9rem;
      cursor: pointer;
      text-align: left;
      transition: background .15s;
      box-sizing: border-box;

      &:hover { background: rgba(245,240,232,.04); }
      &--active { color: var(--gold); }
    }

    .cat-page__radio {
      width: 18px; height: 18px;
      border-radius: 50%;
      border: 1.5px solid rgba(245,240,232,.3);
      flex-shrink: 0;
      position: relative;
      transition: border-color .15s;

      &--on {
        border-color: var(--gold);
        &::after {
          content: '';
          position: absolute;
          inset: 3px;
          border-radius: 50%;
          background: var(--gold);
        }
      }
    }

    .cat-page__sheet-actions {
      display: flex;
      gap: .75rem;
      padding: .875rem 1.5rem;
      padding-bottom: calc(.875rem + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid rgba(245,240,232,.06);
      flex-shrink: 0;
    }

    .cat-page__sheet-clear {
      flex: 1;
      padding: .75rem;
      background: transparent;
      border: 1px solid rgba(245,240,232,.15);
      color: var(--muted);
      font-family: var(--font-sans);
      font-size: .78rem;
      letter-spacing: .1em;
      cursor: pointer;
      transition: border-color .2s, color .2s;
      &:hover { border-color: var(--gold); color: var(--gold); }
    }

    .cat-page__sheet-apply {
      flex: 2;
      padding: .75rem;
      background: var(--gold);
      border: none;
      color: #0d0d0d;
      font-family: var(--font-sans);
      font-size: .78rem;
      font-weight: 700;
      letter-spacing: .1em;
      cursor: pointer;
      transition: background .2s;
      &:hover { background: rgba(201,168,76,.85); }
    }
  `],
})
export class CategoryComponent implements OnInit {
  private readonly route          = inject(ActivatedRoute);
  private readonly router         = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly categoryService= inject(CategoryService);
  private readonly meta           = inject(Meta);
  private readonly titleService   = inject(Title);

  readonly slug            = signal('');
  readonly breadcrumbs     = signal<{ label: string; slug?: string }[]>([]);
  readonly loading         = signal(true);
  readonly products        = signal<Product[]>([]);
  readonly total           = signal(0);
  readonly currentPage     = signal(1);
  readonly totalPages      = signal(1);
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
      this.currentPage.set(1);

      if (newSlug !== this.prevSlug) {
        this.prevSlug = newSlug;
        this.slug.set(newSlug);
        this.categoryOptions.set([]);
        this.breadcrumbs.set([]);
        this.pageType.set('leaf');
        this.loadCategoryMeta();
        this.titleService.setTitle(`${this.displayName()} — Ted Clothing`);
        this.meta.updateTag({ name: 'description', content: `Shop ${this.displayName()} at Ted Clothing. Premium handcrafted Indian clothing.` });
      }

      this.loadProducts();
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

  private loadProducts(): void {
    this.loading.set(true);
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
        this.products.set(res.items ?? []);
        this.total.set(res.total ?? 0);
        this.totalPages.set(res.totalPages ?? 1);
        this.loading.set(false);
      },
      error: () => { this.products.set([]); this.loading.set(false); },
    });
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
    this.loadProducts();
  }

  // ── Pagination ────────────────────────────────────────────────────

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
}

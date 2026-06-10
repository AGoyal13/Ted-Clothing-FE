import {
  Component,
  input,
  output,
  signal,
  computed,
} from '@angular/core';

type SortOption = 'newest' | 'price-asc' | 'price-desc';
type SheetType = 'none' | 'sort' | 'filter';
interface FilterOption { label: string; slug: string; }

const SIZE_ORDER = [
  'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '3XL', '4XL', '5XL',
  '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48',
  '5', '6', '7', '8', '9', '10', '11', '12',
  'Free Size', 'One Size', 'OSFM', 'OS',
];

export interface MobileFilters {
  cat: string;
  sizes: string[];
  colors: string[];
  minPrice: number | null;
  maxPrice: number | null;
}

@Component({
  selector: 'cat-mobile-filter',
  standalone: true,
  imports: [],
  templateUrl: './cat-mobile-filter.component.html',
  styleUrl: './cat-mobile-filter.component.scss',
})
export class CatMobileFilterComponent {
  // ── Inputs ────────────────────────────────────────────────────────────────────
  readonly categoryOptions = input<FilterOption[]>([]);
  readonly activeCat       = input<string>('all');
  readonly sortBy          = input<SortOption>('newest');

  readonly facetSizes      = input<Record<string, number>>({});
  readonly facetColors     = input<Record<string, number>>({});
  readonly facetPriceRange = input<{ min: number; max: number } | null>(null);
  readonly colorHexMap     = input<Record<string, string>>({});
  readonly activeSizes     = input<string[]>([]);
  readonly activeColors    = input<string[]>([]);
  readonly activeMinPrice  = input<number | null>(null);
  readonly activeMaxPrice  = input<number | null>(null);

  // ── Outputs ───────────────────────────────────────────────────────────────────
  readonly sortSelected    = output<SortOption>();
  readonly filtersApplied  = output<MobileFilters>();

  // ── Sheet state ───────────────────────────────────────────────────────────────
  readonly sheetOpen = signal<SheetType>('none');

  // ── Pending state (inside filter sheet — not committed until APPLY) ───────────
  readonly pendingCat    = signal<string>('all');
  readonly pendingSizes  = signal<string[]>([]);
  readonly pendingColors = signal<string[]>([]);
  readonly pendingMin    = signal<number | null>(null);
  readonly pendingMax    = signal<number | null>(null);

  readonly sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest',     label: 'Newest First' },
    { value: 'price-asc',  label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
  ];

  // ── Computed ──────────────────────────────────────────────────────────────────
  readonly hasFacetFilter = computed(() =>
    this.activeSizes().length > 0 ||
    this.activeColors().length > 0 ||
    this.activeMinPrice() !== null ||
    this.activeMaxPrice() !== null ||
    this.activeCat() !== 'all'
  );

  readonly activeFilterCount = computed(() => {
    let n = 0;
    if (this.activeCat() !== 'all')    n++;
    if (this.activeSizes().length)     n += this.activeSizes().length;
    if (this.activeColors().length)    n += this.activeColors().length;
    if (this.activeMinPrice() !== null || this.activeMaxPrice() !== null) n++;
    return n;
  });

  readonly sortShortLabel = computed(() => {
    const map: Record<SortOption, string> = {
      'newest': 'NEWEST', 'price-asc': 'PRICE ↑', 'price-desc': 'PRICE ↓',
    };
    return map[this.sortBy()];
  });

  readonly sortedSizes = computed(() =>
    Object.entries(this.facetSizes())
      .map(([size, count]) => ({ size, count }))
      .sort((a, b) => {
        const ia = SIZE_ORDER.indexOf(a.size);
        const ib = SIZE_ORDER.indexOf(b.size);
        if (ia === -1 && ib === -1) return a.size.localeCompare(b.size);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      })
  );

  readonly sortedColors = computed(() =>
    Object.entries(this.facetColors())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  );

  // ── Sheet open/close ──────────────────────────────────────────────────────────
  openSort(): void { this.sheetOpen.set('sort'); }

  openFilter(): void {
    // Seed pending state from current active values
    this.pendingCat.set(this.activeCat());
    this.pendingSizes.set([...this.activeSizes()]);
    this.pendingColors.set([...this.activeColors()]);
    this.pendingMin.set(this.activeMinPrice());
    this.pendingMax.set(this.activeMaxPrice());
    this.sheetOpen.set('filter');
  }

  closeSheet(): void { this.sheetOpen.set('none'); }

  // ── Sort ──────────────────────────────────────────────────────────────────────
  selectSortMobile(value: SortOption): void {
    this.sheetOpen.set('none');
    this.sortSelected.emit(value);
  }

  // ── Filter sheet interactions ────────────────────────────────────────────────
  setPendingCat(slug: string): void { this.pendingCat.set(slug); }

  togglePendingSize(size: string): void {
    const curr = this.pendingSizes();
    this.pendingSizes.set(
      curr.includes(size) ? curr.filter(s => s !== size) : [...curr, size]
    );
  }

  togglePendingColor(name: string): void {
    const curr = this.pendingColors();
    this.pendingColors.set(
      curr.includes(name) ? curr.filter(c => c !== name) : [...curr, name]
    );
  }

  onMinInput(e: Event): void {
    const val = (e.target as HTMLInputElement).valueAsNumber;
    this.pendingMin.set(isNaN(val) ? null : val);
  }

  onMaxInput(e: Event): void {
    const val = (e.target as HTMLInputElement).valueAsNumber;
    this.pendingMax.set(isNaN(val) ? null : val);
  }

  clearAll(): void {
    this.pendingCat.set('all');
    this.pendingSizes.set([]);
    this.pendingColors.set([]);
    this.pendingMin.set(null);
    this.pendingMax.set(null);
  }

  applyFilters(): void {
    this.sheetOpen.set('none');
    this.filtersApplied.emit({
      cat:      this.pendingCat(),
      sizes:    this.pendingSizes(),
      colors:   this.pendingColors(),
      minPrice: this.pendingMin(),
      maxPrice: this.pendingMax(),
    });
  }
}

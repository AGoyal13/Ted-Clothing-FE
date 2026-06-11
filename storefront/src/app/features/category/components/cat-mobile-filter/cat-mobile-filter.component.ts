import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
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
  // Display-only: seeds pendingCat when the drawer opens. Differs from activeCat on leaf pages.
  readonly selectedCat     = input<string>('all');
  readonly parentLabel     = input<string | null>(null);
  readonly sortBy          = input<SortOption>('newest');

  readonly facetSizes      = input<Record<string, number>>({});
  readonly facetColors     = input<Record<string, number>>({});
  readonly facetPriceRange = input<{ min: number; max: number } | null>(null);
  readonly colorHexMap     = input<Record<string, string>>({});
  readonly activeSizes     = input<string[]>([]);
  readonly activeColors    = input<string[]>([]);
  readonly activeMinPrice  = input<number | null>(null);
  readonly activeMaxPrice  = input<number | null>(null);
  readonly previewCount    = input<number>(0);

  // ── Outputs ───────────────────────────────────────────────────────────────────
  readonly sortSelected         = output<SortOption>();
  readonly filtersApplied       = output<MobileFilters>();
  readonly previewFiltersChange = output<MobileFilters>();

  // ── Sheet / drawer state ──────────────────────────────────────────────────────
  readonly sheetOpen = signal<SheetType>('none');

  // ── Pending state ─────────────────────────────────────────────────────────────
  readonly pendingCat    = signal<string>('all');
  readonly pendingSizes  = signal<string[]>([]);
  readonly pendingColors = signal<string[]>([]);
  readonly pendingMin    = signal<number | null>(null);
  readonly pendingMax    = signal<number | null>(null);

  // ── Accordion open state for filter drawer (collapsed by default on mobile) ──
  readonly secOpen = signal({ cat: false, size: false, color: false, price: false });

  private previewDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Seed price slider from active values when facet range changes
    effect(() => {
      this.pendingMin.set(this.activeMinPrice());
      this.pendingMax.set(this.activeMaxPrice());
    });
  }

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
      newest: 'NEWEST', 'price-asc': 'PRICE ↑', 'price-desc': 'PRICE ↓',
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

  // ── Price slider (pending) ───────────────────────────────────────────────────
  readonly sliderLow = computed(() => {
    const range = this.facetPriceRange();
    if (!range) return 0;
    return this.pendingMin() ?? range.min;
  });

  readonly sliderHigh = computed(() => {
    const range = this.facetPriceRange();
    if (!range) return 0;
    return this.pendingMax() ?? range.max;
  });

  readonly sliderLowPct = computed(() => {
    const range = this.facetPriceRange();
    if (!range || range.max === range.min) return 0;
    return ((this.sliderLow() - range.min) / (range.max - range.min)) * 100;
  });

  readonly sliderHighPct = computed(() => {
    const range = this.facetPriceRange();
    if (!range || range.max === range.min) return 100;
    return ((this.sliderHigh() - range.min) / (range.max - range.min)) * 100;
  });

  readonly lowLabel  = computed(() => '₹' + this.sliderLow().toLocaleString('en-IN'));
  readonly highLabel = computed(() => '₹' + this.sliderHigh().toLocaleString('en-IN'));

  // ── Sheet open / close ───────────────────────────────────────────────────────
  openSort(): void { this.sheetOpen.set('sort'); }

  openFilter(): void {
    this.pendingCat.set(this.selectedCat());
    this.pendingSizes.set([...this.activeSizes()]);
    this.pendingColors.set([...this.activeColors()]);
    this.pendingMin.set(this.activeMinPrice());
    this.pendingMax.set(this.activeMaxPrice());
    this.secOpen.set({ cat: false, size: false, color: false, price: false });
    this.sheetOpen.set('filter');
    this.schedulePreview();
  }

  closeSheet(): void { this.sheetOpen.set('none'); }

  // ── Accordion ─────────────────────────────────────────────────────────────────
  toggleSection(key: 'cat' | 'size' | 'color' | 'price'): void {
    this.secOpen.update(s => ({ ...s, [key]: !s[key] }));
  }

  // ── Sort ──────────────────────────────────────────────────────────────────────
  selectSortMobile(value: SortOption): void {
    this.sheetOpen.set('none');
    this.sortSelected.emit(value);
  }

  // ── Filter interactions ───────────────────────────────────────────────────────
  setPendingCat(slug: string): void {
    this.pendingCat.set(slug);
    this.schedulePreview();
  }

  togglePendingSize(size: string): void {
    const curr = this.pendingSizes();
    this.pendingSizes.set(
      curr.includes(size) ? curr.filter(s => s !== size) : [...curr, size]
    );
    this.schedulePreview();
  }

  togglePendingColor(name: string): void {
    const curr = this.pendingColors();
    this.pendingColors.set(
      curr.includes(name) ? curr.filter(c => c !== name) : [...curr, name]
    );
    this.schedulePreview();
  }

  onSliderLow(e: Event): void {
    const range = this.facetPriceRange();
    if (!range) return;
    let val = (e.target as HTMLInputElement).valueAsNumber;
    val = Math.min(val, this.sliderHigh() - 1);
    (e.target as HTMLInputElement).value = String(val);
    this.pendingMin.set(val === range.min ? null : val);
  }

  onSliderHigh(e: Event): void {
    const range = this.facetPriceRange();
    if (!range) return;
    let val = (e.target as HTMLInputElement).valueAsNumber;
    val = Math.max(val, this.sliderLow() + 1);
    (e.target as HTMLInputElement).value = String(val);
    this.pendingMax.set(val === range.max ? null : val);
  }

  // On handle release, schedule a preview search
  onSliderChange(): void { this.schedulePreview(); }

  clearAll(): void {
    // On leaf pages (parentLabel is set), reset to the leaf slug so APPLY stays on this page.
    // On non-leaf pages, 'all' correctly clears the category filter.
    this.pendingCat.set(this.parentLabel() ? this.selectedCat() : 'all');
    this.pendingSizes.set([]);
    this.pendingColors.set([]);
    this.pendingMin.set(null);
    this.pendingMax.set(null);
    this.schedulePreview();
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

  // ── Preview count (debounced 400ms, fires on any pending change) ─────────────
  private schedulePreview(): void {
    if (this.previewDebounce) clearTimeout(this.previewDebounce);
    this.previewDebounce = setTimeout(() => {
      this.previewFiltersChange.emit({
        cat:      this.pendingCat(),
        sizes:    this.pendingSizes(),
        colors:   this.pendingColors(),
        minPrice: this.pendingMin(),
        maxPrice: this.pendingMax(),
      });
    }, 400);
  }
}

import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';

interface FilterOption { label: string; slug: string; }

const SIZE_ORDER = [
  'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '3XL', '4XL', '5XL',
  '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48',
  '5', '6', '7', '8', '9', '10', '11', '12',
  'Free Size', 'One Size', 'OSFM', 'OS',
];

@Component({
  selector: 'cat-filter-bar',
  standalone: true,
  imports: [],
  templateUrl: './cat-filter-bar.component.html',
  styleUrl: './cat-filter-bar.component.scss',
})
export class CatFilterBarComponent {
  // ── Inputs ───────────────────────────────────────────────────────────────────
  readonly categoryOptions = input<FilterOption[]>([]);
  readonly activeCat       = input<string>('all');
  // Display-only: which radio appears selected. Differs from activeCat on leaf pages.
  readonly selectedCat     = input<string>('all');
  readonly parentLabel     = input<string | null>(null);

  readonly facetSizes      = input<Record<string, number>>({});
  readonly facetColors     = input<Record<string, number>>({});
  readonly facetPriceRange = input<{ min: number; max: number } | null>(null);
  readonly colorHexMap     = input<Record<string, string>>({});
  readonly activeSizes     = input<string[]>([]);
  readonly activeColors    = input<string[]>([]);
  readonly activeMinPrice  = input<number | null>(null);
  readonly activeMaxPrice  = input<number | null>(null);

  // ── Sidebar open/collapsed (controlled by parent) ────────────────────────────
  readonly sidebarOpen = input<boolean>(true);

  // ── Outputs ──────────────────────────────────────────────────────────────────
  readonly toggleSidebar = output<void>();
  readonly catSelected   = output<string>();
  readonly sizesChanged  = output<string[]>();
  readonly colorsChanged = output<string[]>();
  readonly priceChanged  = output<{ min: number | null; max: number | null }>();
  readonly clearAll      = output<void>();

  // ── Accordion open state (all open by default on desktop) ────────────────────
  readonly secOpen = signal({ cat: true, size: true, color: true, price: true });

  // ── Price slider pending values (synced from URL via effect) ─────────────────
  readonly pendingMin = signal<number | null>(null);
  readonly pendingMax = signal<number | null>(null);

  constructor() {
    effect(() => {
      this.pendingMin.set(this.activeMinPrice());
      this.pendingMax.set(this.activeMaxPrice());
    });
  }

  // ── Active state ─────────────────────────────────────────────────────────────
  readonly hasCatFilter   = computed(() => this.activeCat() !== 'all');
  readonly hasSizeFilter  = computed(() => this.activeSizes().length > 0);
  readonly hasColorFilter = computed(() => this.activeColors().length > 0);
  readonly hasPriceFilter = computed(() => this.activeMinPrice() !== null || this.activeMaxPrice() !== null);
  readonly hasAnyFilter   = computed(() =>
    this.hasCatFilter() || this.hasSizeFilter() || this.hasColorFilter() || this.hasPriceFilter()
  );

  // ── Sorted facet lists ────────────────────────────────────────────────────────
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

  // ── Price slider computed ────────────────────────────────────────────────────
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

  // ── Accordion ─────────────────────────────────────────────────────────────────
  toggleSection(key: 'cat' | 'size' | 'color' | 'price'): void {
    this.secOpen.update(s => ({ ...s, [key]: !s[key] }));
  }

  // ── Category ──────────────────────────────────────────────────────────────────
  selectCat(slug: string): void { this.catSelected.emit(slug); }

  // ── Size ─────────────────────────────────────────────────────────────────────
  toggleSize(size: string): void {
    const next = this.activeSizes().includes(size)
      ? this.activeSizes().filter(s => s !== size)
      : [...this.activeSizes(), size];
    this.sizesChanged.emit(next);
  }

  // ── Color ─────────────────────────────────────────────────────────────────────
  toggleColor(name: string): void {
    const next = this.activeColors().includes(name)
      ? this.activeColors().filter(c => c !== name)
      : [...this.activeColors(), name];
    this.colorsChanged.emit(next);
  }

  // ── Price slider ──────────────────────────────────────────────────────────────
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

  // Fires on mouseup/touchend — single Meilisearch call per gesture
  onSliderChange(): void {
    this.priceChanged.emit({ min: this.pendingMin(), max: this.pendingMax() });
  }

  // ── Clear all ─────────────────────────────────────────────────────────────────
  emitClearAll(): void { this.clearAll.emit(); }
}

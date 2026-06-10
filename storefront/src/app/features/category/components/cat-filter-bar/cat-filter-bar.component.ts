import {
  Component,
  HostListener,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';

type SortOption = 'newest' | 'price-asc' | 'price-desc';
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
  imports: [RouterLink],
  templateUrl: './cat-filter-bar.component.html',
  styleUrl: './cat-filter-bar.component.scss',
})
export class CatFilterBarComponent {
  // ── Existing inputs ──────────────────────────────────────────────────────────
  readonly breadcrumbs     = input<{ label: string; slug?: string }[]>([]);
  readonly categoryOptions = input<FilterOption[]>([]);
  readonly activeCat       = input<string>('all');
  readonly sortBy          = input<SortOption>('newest');

  // ── Facet inputs ─────────────────────────────────────────────────────────────
  readonly facetSizes      = input<Record<string, number>>({});
  readonly facetColors     = input<Record<string, number>>({});
  readonly facetPriceRange = input<{ min: number; max: number } | null>(null);
  readonly colorHexMap     = input<Record<string, string>>({});
  readonly activeSizes     = input<string[]>([]);
  readonly activeColors    = input<string[]>([]);
  readonly activeMinPrice  = input<number | null>(null);
  readonly activeMaxPrice  = input<number | null>(null);

  // ── Existing outputs ──────────────────────────────────────────────────────────
  readonly catSelected  = output<string>();
  readonly sortSelected = output<SortOption>();

  // ── Facet outputs ─────────────────────────────────────────────────────────────
  readonly sizesChanged  = output<string[]>();
  readonly colorsChanged = output<string[]>();
  readonly priceChanged  = output<{ min: number | null; max: number | null }>();

  // ── Dropdown open state ───────────────────────────────────────────────────────
  readonly catDdOpen   = signal(false);
  readonly sortOpen    = signal(false);
  readonly sizeDdOpen  = signal(false);
  readonly colorDdOpen = signal(false);
  readonly priceDdOpen = signal(false);

  // ── Price pending state (inputs need explicit Apply) ─────────────────────────
  readonly pendingMin = signal<number | null>(null);
  readonly pendingMax = signal<number | null>(null);

  readonly sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest',     label: 'Newest First' },
    { value: 'price-asc',  label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
  ];

  // ── Computed labels + active state ───────────────────────────────────────────
  readonly hasCatFilter   = computed(() => this.activeCat() !== 'all');
  readonly hasSizeFilter  = computed(() => this.activeSizes().length > 0);
  readonly hasColorFilter = computed(() => this.activeColors().length > 0);
  readonly hasPriceFilter = computed(() => this.activeMinPrice() !== null || this.activeMaxPrice() !== null);

  readonly catPillLabel = computed(() => {
    if (!this.hasCatFilter()) return 'CATEGORY';
    const opt = this.categoryOptions().find(o => o.slug === this.activeCat());
    return (opt?.label ?? 'CATEGORY') + ' ×';
  });

  readonly sizePillLabel = computed(() => {
    const s = this.activeSizes();
    if (!s.length) return 'SIZE';
    return s.length === 1 ? `SIZE: ${s[0]} ×` : `SIZE (${s.length}) ×`;
  });

  readonly colorPillLabel = computed(() => {
    const c = this.activeColors();
    if (!c.length) return 'COLOR';
    return c.length === 1 ? `COLOR: ${c[0]} ×` : `COLOR (${c.length}) ×`;
  });

  readonly pricePillLabel = computed(() => {
    const min = this.activeMinPrice();
    const max = this.activeMaxPrice();
    if (min === null && max === null) return 'PRICE';
    if (min !== null && max !== null) return `₹${min}–₹${max} ×`;
    if (min !== null) return `₹${min}+ ×`;
    return `Up to ₹${max} ×`;
  });

  readonly sortLabel = computed(() =>
    this.sortOptions.find(o => o.value === this.sortBy())?.label ?? 'Newest First'
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

  // ── Category dropdown ─────────────────────────────────────────────────────────
  toggleCatDd(event: MouseEvent): void {
    event.stopPropagation();
    this.closeAll();
    this.catDdOpen.update(v => !v);
  }
  selectCat(slug: string): void {
    this.catDdOpen.set(false);
    this.catSelected.emit(slug);
  }

  // ── Sort dropdown ─────────────────────────────────────────────────────────────
  toggleSort(event: MouseEvent): void {
    event.stopPropagation();
    this.closeAll();
    this.sortOpen.update(v => !v);
  }
  selectSort(value: SortOption): void {
    this.sortOpen.set(false);
    this.sortSelected.emit(value);
  }

  // ── Size dropdown ─────────────────────────────────────────────────────────────
  toggleSizeDd(event: MouseEvent): void {
    event.stopPropagation();
    this.closeAll();
    this.sizeDdOpen.update(v => !v);
  }
  toggleSize(size: string): void {
    const current = this.activeSizes();
    const next = current.includes(size)
      ? current.filter(s => s !== size)
      : [...current, size];
    this.sizesChanged.emit(next);
  }

  // ── Color dropdown ────────────────────────────────────────────────────────────
  toggleColorDd(event: MouseEvent): void {
    event.stopPropagation();
    this.closeAll();
    this.colorDdOpen.update(v => !v);
  }
  toggleColor(name: string): void {
    const current = this.activeColors();
    const next = current.includes(name)
      ? current.filter(c => c !== name)
      : [...current, name];
    this.colorsChanged.emit(next);
  }

  // ── Price dropdown ────────────────────────────────────────────────────────────
  togglePriceDd(event: MouseEvent): void {
    event.stopPropagation();
    this.closeAll();
    // Seed pending from active values when opening
    this.pendingMin.set(this.activeMinPrice());
    this.pendingMax.set(this.activeMaxPrice());
    this.priceDdOpen.update(v => !v);
  }
  onMinInput(e: Event): void {
    const val = (e.target as HTMLInputElement).valueAsNumber;
    this.pendingMin.set(isNaN(val) ? null : val);
  }
  onMaxInput(e: Event): void {
    const val = (e.target as HTMLInputElement).valueAsNumber;
    this.pendingMax.set(isNaN(val) ? null : val);
  }
  applyPrice(): void {
    this.priceDdOpen.set(false);
    this.priceChanged.emit({ min: this.pendingMin(), max: this.pendingMax() });
  }
  clearPrice(): void {
    this.pendingMin.set(null);
    this.pendingMax.set(null);
    this.priceDdOpen.set(false);
    this.priceChanged.emit({ min: null, max: null });
  }

  private closeAll(): void {
    this.catDdOpen.set(false);
    this.sortOpen.set(false);
    this.sizeDdOpen.set(false);
    this.colorDdOpen.set(false);
    this.priceDdOpen.set(false);
  }

  @HostListener('document:click')
  closeDropdowns(): void { this.closeAll(); }
}

import {
  Component,
  input,
  output,
  signal,
  computed,
} from '@angular/core';

type SortOption = 'newest' | 'price-asc' | 'price-desc';
type SheetType = 'none' | 'sort' | 'category';
interface FilterOption { label: string; slug: string; }

@Component({
  selector: 'cat-mobile-filter',
  standalone: true,
  imports: [],
  templateUrl: './cat-mobile-filter.component.html',
  styleUrl: './cat-mobile-filter.component.scss',
})
export class CatMobileFilterComponent {
  readonly categoryOptions = input<FilterOption[]>([]);
  readonly activeCat = input<string>('all');
  readonly sortBy = input<SortOption>('newest');

  readonly sortSelected = output<SortOption>();
  readonly categoryApplied = output<string>();

  readonly sheetOpen = signal<SheetType>('none');
  readonly pendingCat = signal<string>('all');

  readonly sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest',     label: 'Newest First' },
    { value: 'price-asc',  label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
  ];

  readonly hasCatFilter = computed(() => this.activeCat() !== 'all');

  readonly sortShortLabel = computed(() => {
    const map: Record<SortOption, string> = {
      'newest': 'NEWEST', 'price-asc': 'PRICE ↑', 'price-desc': 'PRICE ↓',
    };
    return map[this.sortBy()];
  });

  readonly mobCatLabel = computed(() => {
    const opt = this.categoryOptions().find(o => o.slug === this.activeCat());
    return opt?.label ?? 'CATEGORIES';
  });

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
    this.categoryApplied.emit(cat);
  }

  selectSortMobile(value: SortOption): void {
    this.sheetOpen.set('none');
    this.sortSelected.emit(value);
  }
}

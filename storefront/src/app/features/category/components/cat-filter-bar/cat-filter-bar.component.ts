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

@Component({
  selector: 'cat-filter-bar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cat-filter-bar.component.html',
  styleUrl: './cat-filter-bar.component.scss',
})
export class CatFilterBarComponent {
  readonly breadcrumbs = input<{ label: string; slug?: string }[]>([]);
  readonly categoryOptions = input<FilterOption[]>([]);
  readonly activeCat = input<string>('all');
  readonly sortBy = input<SortOption>('newest');

  readonly catSelected = output<string>();
  readonly sortSelected = output<SortOption>();

  readonly catDdOpen = signal(false);
  readonly sortOpen = signal(false);

  readonly sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest',     label: 'Newest First' },
    { value: 'price-asc',  label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
  ];

  readonly hasCatFilter = computed(() => this.activeCat() !== 'all');

  readonly catPillLabel = computed(() => {
    if (!this.hasCatFilter()) return 'CATEGORY';
    const opt = this.categoryOptions().find(o => o.slug === this.activeCat());
    return (opt?.label ?? 'CATEGORY') + ' ×';
  });

  readonly sortLabel = computed(() =>
    this.sortOptions.find(o => o.value === this.sortBy())?.label ?? 'Newest First'
  );

  toggleCatDd(event: MouseEvent): void {
    event.stopPropagation();
    this.sortOpen.set(false);
    this.catDdOpen.update(v => !v);
  }

  selectCat(slug: string): void {
    this.catDdOpen.set(false);
    this.catSelected.emit(slug);
  }

  toggleSort(event: MouseEvent): void {
    event.stopPropagation();
    this.catDdOpen.set(false);
    this.sortOpen.update(v => !v);
  }

  selectSort(value: SortOption): void {
    this.sortOpen.set(false);
    this.sortSelected.emit(value);
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    this.sortOpen.set(false);
    this.catDdOpen.set(false);
  }
}

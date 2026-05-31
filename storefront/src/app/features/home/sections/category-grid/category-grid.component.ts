import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../../../core/services/category.service';
import { Category } from '../../../../core/models/category.model';

interface GridCategory {
  id: string;
  name: string;
  slug: string;
  accent: string;
}

const FALLBACK_CATEGORIES: GridCategory[] = [
  { id: '1', name: 'Men', slug: 'men', accent: 'rgba(139, 94, 60, 0.25)' },
  { id: '2', name: 'Women', slug: 'women', accent: 'rgba(201, 168, 76, 0.15)' },
  { id: '3', name: 'Kids', slug: 'kids', accent: 'rgba(107, 101, 96, 0.2)' },
  { id: '4', name: 'Accessories', slug: 'accessories', accent: 'rgba(201, 168, 76, 0.1)' },
  { id: '5', name: 'New Arrivals', slug: 'new-arrivals', accent: 'rgba(139, 94, 60, 0.15)' },
];

@Component({
  selector: 'app-category-grid',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './category-grid.component.html',
  styleUrl: './category-grid.component.scss',
})
export class CategoryGridComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);

  readonly loading = signal(true);
  readonly categories = signal<GridCategory[]>([]);

  ngOnInit(): void {
    this.categoryService.getAll().subscribe({
      next: (cats) => {
        if (cats && cats.length > 0) {
          const accents = [
            'rgba(139, 94, 60, 0.25)',
            'rgba(201, 168, 76, 0.15)',
            'rgba(107, 101, 96, 0.2)',
            'rgba(201, 168, 76, 0.1)',
            'rgba(139, 94, 60, 0.15)',
            'rgba(107, 101, 96, 0.15)',
            'rgba(139, 94, 60, 0.2)',
            'rgba(201, 168, 76, 0.12)',
          ];
          const flat = Array.isArray(cats)
            ? cats
            : (cats as { items?: Category[] }).items ?? [];
          const roots = flat.filter(c => c.parentId === null);
          this.categories.set(
            (roots.length > 0 ? roots : flat).map((c, i) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              accent: accents[i % accents.length],
            }))
          );
        } else {
          this.categories.set(FALLBACK_CATEGORIES);
        }
        this.loading.set(false);
      },
      error: () => {
        this.categories.set(FALLBACK_CATEGORIES);
        this.loading.set(false);
      },
    });
  }
}

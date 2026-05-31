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
  template: `
    <section class="cat-section" aria-labelledby="cat-heading">
      <div class="cat-section__header">
        <h2 class="cat-section__heading" id="cat-heading">SHOP BY CATEGORY</h2>
        <div class="cat-section__divider"></div>
      </div>

      <div class="cat-grid">
        @if (loading()) {
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="cat-card skeleton"></div>
          }
        } @else {
          @for (cat of categories(); track cat.id; let i = $index) {
            <a
              [routerLink]="['/category', cat.slug]"
              class="cat-card"
              [class.cat-card--featured]="i === 0 && categories().length >= 3"
              [style.--accent]="cat.accent"
              [attr.aria-label]="'Shop ' + cat.name"
            >
              <div class="cat-card__bg"></div>
              <div class="cat-card__content">
                <span class="cat-card__number">{{ i + 1 < 10 ? '0' : '' }}{{ i + 1 }}</span>
                <h3 class="cat-card__name">{{ cat.name }}</h3>
                <div class="cat-card__arrow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </div>
              </div>
              <div class="cat-card__border"></div>
            </a>
          }
        }
      </div>
    </section>
  `,
  styles: [`
    .cat-section {
      padding: var(--section-pad);
      max-width: 1440px;
      margin: 0 auto;
    }

    .cat-section__header {
      margin-bottom: 2.5rem;
    }

    .cat-section__heading {
      font-family: var(--font-display);
      font-size: clamp(2rem, 4vw, 3rem);
      letter-spacing: 0.1em;
      color: var(--cream);
    }

    .cat-section__divider {
      width: 48px;
      height: 1px;
      background: var(--gold);
      margin-top: 0.75rem;
    }

    .cat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
      grid-auto-rows: 220px;
      gap: 1rem;

      @media (max-width: 768px) {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        gap: 0.75rem;

        &::-webkit-scrollbar {
          display: none;
        }
      }
    }

    @media (max-width: 768px) {
      .cat-card,
      .cat-card.skeleton {
        flex: 0 0 72%;
        height: 180px;
        scroll-snap-align: start;
      }
    }

    .cat-card {
      position: relative;
      background: var(--surface);
      border: 1px solid rgba(245, 240, 232, 0.06);
      overflow: hidden;
      display: flex;
      align-items: flex-end;
      padding: 1.5rem;
      text-decoration: none;
      transition: border-color 0.3s ease;
      cursor: pointer;

      &--featured {
        grid-row: span 2;

        @media (max-width: 600px) {
          grid-row: span 1;
        }

        .cat-card__name {
          font-size: clamp(2rem, 4vw, 3.5rem);
        }
      }

      &:hover {
        border-color: rgba(201, 168, 76, 0.4);

        .cat-card__arrow {
          transform: translateX(0);
          opacity: 1;
        }

        .cat-card__bg {
          opacity: 1;
        }
      }
    }

    .cat-card__bg {
      position: absolute;
      inset: 0;
      background: var(--accent, rgba(201, 168, 76, 0.08));
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    .cat-card__content {
      position: relative;
      z-index: 1;
      width: 100%;
    }

    .cat-card__number {
      display: block;
      font-family: var(--font-display);
      font-size: 0.65rem;
      letter-spacing: 0.3em;
      color: var(--cream);
      opacity: 0.45;
      margin-bottom: 0.375rem;
    }

    .cat-card__name {
      font-family: var(--font-display);
      font-size: clamp(1.75rem, 3vw, 2.25rem);
      letter-spacing: 0.05em;
      color: var(--cream);
      line-height: 1;
      white-space: nowrap;
      transition: color 0.2s ease;
    }

    .cat-card:hover .cat-card__name {
      color: var(--gold-light);
    }

    .cat-card__arrow {
      margin-top: 0.75rem;
      color: var(--gold);
      transform: translateX(-10px);
      opacity: 0;
      transition: transform 0.3s var(--ease-enter), opacity 0.3s ease;
    }

    .cat-card__border {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--gold);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.4s var(--ease-enter);
    }

    .cat-card:hover .cat-card__border {
      transform: scaleX(1);
    }
  `],
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

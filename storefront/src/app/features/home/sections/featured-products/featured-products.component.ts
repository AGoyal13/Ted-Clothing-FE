import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { Product } from '../../../../core/models/product.model';
import { ProductCardComponent } from '../../../../shared/product-card/product-card.component';
import { AnimateOnScrollDirective } from '../../../../core/directives/animate-on-scroll.directive';

@Component({
  selector: 'app-featured-products',
  standalone: true,
  imports: [RouterLink, ProductCardComponent, AnimateOnScrollDirective],
  template: `
    <section class="featured" aria-labelledby="featured-heading">
      <div class="featured__header">
        <div>
          <p class="featured__eyebrow">CURATED FOR YOU</p>
          <h2 class="featured__heading" id="featured-heading">FEATURED COLLECTION</h2>
        </div>
        <p class="featured__subtitle">
          <em>Each piece tells a story. Each garment, a statement.</em>
        </p>
      </div>

      <div class="featured__grid">
        @if (loading()) {
          @for (i of [1,2,3,4]; track i) {
            <div class="featured__skeleton">
              <div class="skeleton aspect-3-4"></div>
              <div class="skeleton featured__skeleton-title"></div>
              <div class="skeleton featured__skeleton-price"></div>
            </div>
          }
        } @else {
          @for (product of products(); track product.id; let i = $index) {
            <app-product-card
              appAnimateOnScroll
              [product]="product"
              [delay]="(i * 80) + 'ms'"
            />
          }
        }
      </div>

      <div class="featured__footer">
        <a routerLink="/category/men" class="btn-ghost">VIEW ALL PRODUCTS</a>
      </div>
    </section>
  `,
  styles: [`
    .featured {
      padding: var(--section-pad);
      max-width: 1440px;
      margin: 0 auto;
    }

    .featured__header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 2rem;
      margin-bottom: 3rem;
      flex-wrap: wrap;
    }

    .featured__eyebrow {
      font-family: var(--font-display);
      font-size: 0.7rem;
      letter-spacing: 0.4em;
      color: var(--gold);
      margin-bottom: 0.375rem;
    }

    .featured__heading {
      font-family: var(--font-display);
      font-size: clamp(2rem, 4vw, 3rem);
      letter-spacing: 0.08em;
      color: var(--cream);
    }

    .featured__subtitle {
      font-family: var(--font-serif);
      font-style: italic;
      font-weight: 300;
      font-size: 1.1rem;
      color: var(--muted);
      max-width: 300px;
      text-align: right;
      line-height: 1.5;

      @media (max-width: 700px) {
        text-align: left;
      }
    }

    .featured__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.5rem 1.25rem;
    }

    .featured__skeleton {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .featured__skeleton-title {
      height: 16px;
      width: 70%;
      border-radius: 2px;
      margin-top: 0.25rem;
    }

    .featured__skeleton-price {
      height: 14px;
      width: 40%;
      border-radius: 2px;
    }

    .featured__footer {
      display: flex;
      justify-content: center;
      margin-top: 3rem;
    }
  `],
})
export class FeaturedProductsComponent implements OnInit {
  private readonly productService = inject(ProductService);

  readonly loading = signal(true);
  readonly products = signal<Product[]>([]);

  ngOnInit(): void {
    this.productService.getFeatured(8).subscribe({
      next: (res) => {
        this.products.set(res.items ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.products.set([]);
        this.loading.set(false);
      },
    });
  }
}

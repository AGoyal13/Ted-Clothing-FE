import {
  Component,
  OnInit,
  inject,
  input,
  signal,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ProductService } from '../../../../core/services/product.service';
import { ProductCardComponent } from '../../../../shared/product-card/product-card.component';
import { Product, ProductDetail } from '../../../../core/models/product.model';

@Component({
  selector: 'pdp-similar',
  standalone: true,
  imports: [ProductCardComponent],
  templateUrl: './pdp-similar.component.html',
  styleUrl: './pdp-similar.component.scss',
})
export class PdpSimilarComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly product = input.required<ProductDetail>();

  readonly loading = signal(true);
  readonly items = signal<Product[]>([]);

  readonly hasItems = computed(() => !this.loading() && this.items().length >= 3);

  readonly skeletons = [1, 2, 3, 4, 5, 6];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }

    const p = this.product();
    this.productService
      .getProducts({ categorySlug: p.category.slug, status: 'ACTIVE', limit: 9 })
      .subscribe({
        next: res => {
          const filtered = res.items.filter(x => x.id !== p.id).slice(0, 8);
          if (filtered.length >= 3 || !p.category.parent) {
            this.items.set(filtered);
            this.loading.set(false);
          } else {
            this.productService
              .getProducts({ categorySlug: p.category.parent.slug, status: 'ACTIVE', limit: 9 })
              .subscribe({
                next: r2 => {
                  this.items.set(r2.items.filter(x => x.id !== p.id).slice(0, 8));
                  this.loading.set(false);
                },
                error: () => {
                  this.items.set(filtered);
                  this.loading.set(false);
                },
              });
          }
        },
        error: () => this.loading.set(false),
      });
  }
}

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
  templateUrl: './featured-products.component.html',
  styleUrl: './featured-products.component.scss',
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

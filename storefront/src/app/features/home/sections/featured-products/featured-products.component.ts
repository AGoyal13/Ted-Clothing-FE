import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCardComponent } from '../../../../shared/product-card/product-card.component';
import { AnimateOnScrollDirective } from '../../../../core/directives/animate-on-scroll.directive';
import { HomeFeaturedService } from '../../home-featured.service';

@Component({
  selector: 'app-featured-products',
  standalone: true,
  imports: [RouterLink, ProductCardComponent, AnimateOnScrollDirective],
  templateUrl: './featured-products.component.html',
  styleUrl: './featured-products.component.scss',
})
export class FeaturedProductsComponent {
  private readonly homeFeatured = inject(HomeFeaturedService);

  readonly loading  = computed(() => !this.homeFeatured.loaded());
  readonly products = this.homeFeatured.products;
}

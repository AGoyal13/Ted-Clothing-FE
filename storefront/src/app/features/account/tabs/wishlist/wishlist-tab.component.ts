import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { WishlistService } from '../../../../core/services/wishlist.service';

@Component({
  selector: 'app-wishlist-tab',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './wishlist-tab.component.html',
  styleUrl: './wishlist-tab.component.scss',
})
export class WishlistTabComponent {
  readonly wishlistService = inject(WishlistService);

  removeWishlist(productId: string, skuId: string): void {
    this.wishlistService.toggle(productId, skuId);
  }
}

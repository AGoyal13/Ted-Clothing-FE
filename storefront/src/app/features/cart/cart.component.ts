import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { CartItem } from '../../core/models/cart.model';
import { formatINR } from '../../core/models/product.model';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent {
  private readonly cartService = inject(CartService);
  private readonly wishlistService = inject(WishlistService);
  readonly authService = inject(AuthService);

  readonly items = this.cartService.items;
  readonly oosItems = this.cartService.oosItems;
  readonly loading = this.cartService.loading;
  readonly total = this.cartService.total;
  readonly itemCount = this.cartService.count;
  readonly subtotal = computed(() => formatINR(this.total()));
  readonly hasAnyItems = computed(() => this.items().length > 0 || this.oosItems().length > 0);

  readonly formatINR = formatINR;

  updateQty(item: CartItem, qty: number): void {
    this.cartService.updateQty(item.skuId, qty);
  }

  removeItem(skuId: string): void {
    this.cartService.removeItem(skuId);
  }

  moveToWishlist(item: CartItem): void {
    this.wishlistService.addItem(item.skuId, item.productId);
    this.cartService.removeItem(item.skuId);
  }

  discountLabel(item: CartItem): string {
    return `${Math.round(item.discountPct)}% OFF`;
  }
}

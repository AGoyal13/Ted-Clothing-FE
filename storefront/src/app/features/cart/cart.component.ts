import {
  Component,
  inject,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
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

  readonly items = this.cartService.items;
  readonly total = this.cartService.total;
  readonly itemCount = this.cartService.count;
  readonly subtotal = computed(() => formatINR(this.total()));

  readonly formatINR = formatINR;

  updateQty(item: CartItem, qty: number): void {
    this.cartService.updateQty(item.skuId, qty);
  }

  removeItem(skuId: string): void {
    this.cartService.removeItem(skuId);
  }
}

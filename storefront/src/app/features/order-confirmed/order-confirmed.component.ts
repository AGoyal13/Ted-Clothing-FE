import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { Order } from '../../core/models/order.model';
import { formatINR } from '../../core/models/product.model';

@Component({
  selector: 'app-order-confirmed',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './order-confirmed.component.html',
  styleUrl: './order-confirmed.component.scss',
})
export class OrderConfirmedComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  readonly order = signal<Order | null>(null);
  readonly loading = signal(true);
  readonly fmt = formatINR;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.orderService.getOrderById(id).subscribe({
      next: o => { this.order.set(o); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  getFirstImage(images: string[]): string {
    return images?.[0] ?? '';
  }

  get shortId(): string {
    return this.order()?.id?.slice(-8).toUpperCase() ?? '';
  }
}

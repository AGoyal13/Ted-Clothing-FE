import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ProductListResponse } from '../../../../core/models/product.model';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
export class HeroComponent {
  private api = inject(ApiService);

  private productTotal = toSignal(
    this.api.get<ProductListResponse>('/products', { status: 'ACTIVE', limit: 1 }).pipe(
      map(res => res.total),
      catchError(() => of(null)),
    ),
    { initialValue: null },
  );

  readonly uniquePieces = computed(() => {
    const total = this.productTotal();
    return total !== null ? `${total}+` : '—';
  });
}

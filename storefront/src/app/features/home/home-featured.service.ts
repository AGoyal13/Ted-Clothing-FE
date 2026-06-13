import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';

@Injectable()
export class HomeFeaturedService {
  private readonly productService = inject(ProductService);

  // undefined = loading, null = error, value = success
  private readonly response = toSignal(
    this.productService.getFeatured(8).pipe(catchError(() => of(null))),
    { initialValue: undefined }
  );

  readonly loaded   = computed(() => this.response() !== undefined);
  readonly products = computed<Product[]>(() => this.response()?.items ?? []);
  readonly total    = computed<number | null>(() => this.response()?.total ?? null);
}

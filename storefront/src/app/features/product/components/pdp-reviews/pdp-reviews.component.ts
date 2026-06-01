import {
  Component,
  Input,
  inject,
  signal,
  computed,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../../../core/services/api.service';

interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  verified: boolean;
  createdAt: string;
  authorName: string;
}

interface ReviewsAggregate {
  avgRating: number;
  totalCount: number;
  distribution: Record<number, number>;
}

interface ReviewsResponse {
  aggregate: ReviewsAggregate;
  reviews: ReviewItem[];
  page: number;
  limit: number;
  totalPages: number;
}

@Component({
  selector: 'pdp-reviews',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './pdp-reviews.component.html',
  styleUrl: './pdp-reviews.component.scss',
})
export class PdpReviewsComponent {
  private readonly apiService = inject(ApiService);

  private _productId = '';

  @Input() set productId(id: string) {
    if (!id || id === this._productId) return;
    this._productId = id;
    this.reviewsAggregate.set(null);
    this.reviewsList.set([]);
    this.reviewsPage.set(1);
    this.reviewsTotalPages.set(1);
    this.loadReviews(id, 1);
  }

  readonly reviewsLoading = signal(false);
  readonly reviewsAggregate = signal<ReviewsAggregate | null>(null);
  readonly reviewsList = signal<ReviewItem[]>([]);
  readonly reviewsPage = signal(1);
  readonly reviewsTotalPages = signal(1);
  readonly reviewsHasMore = computed(() => this.reviewsPage() < this.reviewsTotalPages());

  private loadReviews(productId: string, page: number): void {
    this.reviewsLoading.set(true);
    this.apiService.get<ReviewsResponse>(`/products/${productId}/reviews`, { page, limit: 5 }).subscribe({
      next: (data) => {
        if (page === 1) {
          this.reviewsAggregate.set(data.aggregate);
          this.reviewsList.set(data.reviews);
        } else {
          this.reviewsList.update(list => [...list, ...data.reviews]);
        }
        this.reviewsPage.set(data.page);
        this.reviewsTotalPages.set(data.totalPages);
        this.reviewsLoading.set(false);
      },
      error: () => this.reviewsLoading.set(false),
    });
  }

  loadMoreReviews(): void {
    if (!this._productId) return;
    this.loadReviews(this._productId, this.reviewsPage() + 1);
  }
}

import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HomeFeaturedService } from '../../home-featured.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
export class HeroComponent {
  private readonly homeFeatured = inject(HomeFeaturedService);

  readonly uniquePieces = computed(() => {
    const total = this.homeFeatured.total();
    return total !== null ? `${total}+` : '—';
  });
}

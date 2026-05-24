import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { WishlistService } from '../../core/services/wishlist.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="account">
      <div class="account__inner">
        <h1 class="account__heading">My Account</h1>

        @if (authService.currentUser(); as user) {
          <p class="account__email">{{ user.email }}</p>

          <section class="account__section">
            <h2 class="account__section-title">Wishlist</h2>
            @if (wishlistService.count() > 0) {
              <p class="account__meta">{{ wishlistService.count() }} saved item(s)</p>
            } @else {
              <p class="account__meta">Your wishlist is empty.</p>
            }
          </section>

          <section class="account__section">
            <h2 class="account__section-title">Orders</h2>
            <p class="account__meta">Order history coming in Phase 4.</p>
          </section>

          <button class="account__logout" (click)="logout()">Sign Out</button>
        }
      </div>
    </main>
  `,
  styles: [`
    .account {
      min-height: 80vh;
      padding: 8rem 5% 4rem;
    }

    .account__inner {
      max-width: 600px;
      margin: 0 auto;
    }

    .account__heading {
      font-family: var(--font-display);
      font-size: 2.5rem;
      color: var(--gold);
      letter-spacing: 0.1em;
      margin-bottom: 0.5rem;
    }

    .account__email {
      font-family: var(--font-sans);
      font-size: 0.9rem;
      color: var(--muted);
      margin-bottom: 3rem;
    }

    .account__section {
      border-top: 1px solid rgba(245, 240, 232, 0.08);
      padding: 2rem 0;
    }

    .account__section-title {
      font-family: var(--font-display);
      font-size: 1.1rem;
      letter-spacing: 0.15em;
      color: var(--cream);
      margin-bottom: 0.75rem;
    }

    .account__meta {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--muted);
    }

    .account__logout {
      margin-top: 2rem;
      font-family: var(--font-display);
      font-size: 0.85rem;
      letter-spacing: 0.15em;
      color: var(--muted);
      border: 1px solid rgba(245, 240, 232, 0.15);
      padding: 0.6rem 1.5rem;
      transition: color 0.2s ease, border-color 0.2s ease;

      &:hover {
        color: var(--cream);
        border-color: rgba(245, 240, 232, 0.35);
      }
    }
  `],
})
export class AccountComponent {
  readonly authService = inject(AuthService);
  readonly wishlistService = inject(WishlistService);
  private readonly router = inject(Router);

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/');
  }
}

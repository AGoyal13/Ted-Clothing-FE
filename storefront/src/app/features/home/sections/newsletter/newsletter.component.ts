import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-newsletter',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (!auth.isLoggedIn()) {
    <section class="nl" aria-labelledby="nl-heading">
      <div class="nl__inner">
        @if (!submitted()) {
          <p class="nl__eyebrow">EXCLUSIVE ACCESS</p>
          <h2 class="nl__heading" id="nl-heading">STAY IN THE CIRCLE</h2>
          <p class="nl__subtext">
            <em>New arrivals, exclusive drops, stories from the studio.</em>
          </p>

          <form class="nl__form" (ngSubmit)="onSubmit()" novalidate>
            <div class="nl__input-group">
              <label for="nl-email" class="sr-only">Email address</label>
              <input
                id="nl-email"
                type="email"
                class="nl__input"
                placeholder="your@email.com"
                [(ngModel)]="email"
                name="email"
                required
                autocomplete="email"
              />
              <button type="submit" class="nl__btn btn-primary" [disabled]="!email()">
                JOIN
              </button>
            </div>
            <p class="nl__disclaimer">No spam. Unsubscribe anytime.</p>
          </form>
        } @else {
          <div class="nl__success" role="status">
            <div class="nl__check" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3 class="nl__success-title">YOU'RE IN THE CIRCLE</h3>
            <p class="nl__success-text">
              <em>Welcome. Expect the extraordinary.</em>
            </p>
          </div>
        }
      </div>
    </section>
    }
  `,
  styles: [`
    .nl {
      padding: var(--section-pad);
      background: var(--surface);
      border-top: 1px solid rgba(201, 168, 76, 0.1);
      border-bottom: 1px solid rgba(201, 168, 76, 0.1);
      text-align: center;
    }

    .nl__inner {
      max-width: 640px;
      margin: 0 auto;
    }

    .nl__eyebrow {
      font-family: var(--font-display);
      font-size: 0.84rem;
      letter-spacing: 0.4em;
      color: var(--gold);
      margin-bottom: 0.75rem;
    }

    .nl__heading {
      font-family: var(--font-display);
      font-size: clamp(2.5rem, 6vw, 4.5rem);
      letter-spacing: 0.06em;
      color: var(--cream);
      line-height: 1;
      margin-bottom: 1rem;
    }

    .nl__subtext {
      font-family: var(--font-serif);
      font-style: italic;
      font-weight: 300;
      font-size: clamp(1rem, 1.5vw, 1.2rem);
      color: var(--muted);
      margin-bottom: 2rem;
      line-height: 1.6;
    }

    .nl__form {
      width: 100%;

      @media (max-width: 500px) {
        padding: 0 1.25rem;
      }
    }

    .nl__input-group {
      display: flex;
      gap: 0;
      height: 52px;

      @media (max-width: 500px) {
        flex-direction: column;
        height: auto;
        gap: 0.75rem;
      }
    }

    .nl__input {
      flex: 1;
      height: 52px;
      background: var(--bg);
      border: 1px solid rgba(201, 168, 76, 0.2);
      border-right: none;
      color: var(--cream);
      padding: 0 1.25rem;
      font-family: var(--font-sans);
      font-size: 0.875rem;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      border-radius: 0;
      transition: border-color 0.2s ease;

      &::placeholder {
        color: var(--muted);
      }

      &:focus {
        border-color: var(--gold);
      }

      @media (max-width: 500px) {
        border-right: 1px solid rgba(201, 168, 76, 0.2);
        width: 100%;
        height: 64px;
        font-size: 1rem;
        padding: 1rem 1.5rem;
      }
    }

    .nl__btn {
      padding: 0 2rem;
      white-space: nowrap;
      height: 100%;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      @media (max-width: 500px) {
        height: 64px;
        width: 100%;
      }
    }

    .nl__disclaimer {
      font-family: var(--font-sans);
      font-size: 0.7rem;
      color: var(--muted);
      margin-top: 0.875rem;
      letter-spacing: 0.05em;
    }

    /* Success State */
    .nl__success {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      animation: fadeUp 0.6s var(--ease-enter) both;
    }

    .nl__check {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(201, 168, 76, 0.1);
      border: 1px solid rgba(201, 168, 76, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--gold);
    }

    .nl__success-title {
      font-family: var(--font-display);
      font-size: clamp(1.75rem, 3vw, 2.5rem);
      letter-spacing: 0.08em;
      color: var(--cream);
    }

    .nl__success-text {
      font-family: var(--font-serif);
      font-style: italic;
      font-size: 1.1rem;
      color: var(--muted);
    }

    /* Screen reader only */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
  `],
})
export class NewsletterComponent {
  readonly auth = inject(AuthService);
  readonly email = signal('');
  readonly submitted = signal(false);

  onSubmit(): void {
    if (!this.email()) return;
    // No backend yet — just show success state
    this.submitted.set(true);
  }
}

import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api.service';

interface FeedbackPayload {
  name: string;
  location: string;
  quote: string;
  rating: number;
}

@Component({
  selector: 'app-feedback-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <!-- Toast -->
    @if (toast()) {
      <div class="fb-toast" role="status">{{ toast() }}</div>
    }

    <section class="fb" aria-labelledby="fb-heading">
      <div class="fb__inner">
        <div class="fb__header">
          <p class="fb__eyebrow">SHARE YOUR EXPERIENCE</p>
          <h2 class="fb__heading" id="fb-heading">YOUR THOUGHTS</h2>
        </div>

        @if (submitted()) {
          <div class="fb__thankyou">
            <div class="fb__thankyou-icon" aria-hidden="true">✓</div>
            <p class="fb__thankyou-title">Thank you, {{ submittedName() }}!</p>
            <p class="fb__thankyou-sub">Your review has been submitted and will appear once approved.</p>
          </div>
        } @else {
          <form class="fb__form" (ngSubmit)="submit()" #form="ngForm" novalidate>

            <!-- Star rating -->
            <div class="fb__field">
              <label class="fb__label">Rating</label>
              <div class="fb__stars" role="radiogroup" aria-label="Rating">
                @for (star of stars; track star) {
                  <button
                    type="button"
                    class="fb__star"
                    [class.fb__star--filled]="star <= (hoverRating() || selectedRating())"
                    (mouseenter)="hoverRating.set(star)"
                    (mouseleave)="hoverRating.set(0)"
                    (click)="selectedRating.set(star)"
                    [attr.aria-label]="star + ' star' + (star > 1 ? 's' : '')"
                    [attr.aria-pressed]="star === selectedRating()"
                  >★</button>
                }
              </div>
            </div>

            <!-- Quote -->
            <div class="fb__field">
              <label class="fb__label" for="fb-quote">Your Review *</label>
              <textarea
                id="fb-quote"
                class="fb__textarea"
                [(ngModel)]="quote"
                name="quote"
                placeholder="Tell us about your experience with Ted Clothing…"
                rows="4"
                required
                minlength="10"
              ></textarea>
            </div>

            <div class="fb__row">
              <!-- Name -->
              <div class="fb__field">
                <label class="fb__label" for="fb-name">Name *</label>
                <input
                  id="fb-name"
                  class="fb__input"
                  type="text"
                  [(ngModel)]="name"
                  name="name"
                  placeholder="Your name"
                  required
                  autocomplete="name"
                />
              </div>

              <!-- Location -->
              <div class="fb__field">
                <label class="fb__label" for="fb-location">City *</label>
                <input
                  id="fb-location"
                  class="fb__input"
                  type="text"
                  [(ngModel)]="location"
                  name="location"
                  placeholder="e.g. Mumbai, India"
                  required
                  autocomplete="address-level2"
                />
              </div>
            </div>

            @if (errorMsg()) {
              <p class="fb__error">{{ errorMsg() }}</p>
            }

            <button
              class="fb__submit"
              type="submit"
              [disabled]="loading()"
            >{{ loading() ? 'SUBMITTING…' : 'SUBMIT REVIEW' }}</button>

          </form>
        }
      </div>
    </section>
  `,
  styles: [`
    /* ── Toast ─────────────────────────────────────────────────────────────── */
    .fb-toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background: #1a1714;
      border: 1px solid rgba(201, 168, 76, 0.5);
      color: var(--cream, #f5f0e8);
      font-family: var(--font-sans);
      font-size: 0.875rem;
      padding: 0.75rem 1.5rem;
      z-index: 3000;
      white-space: nowrap;
      animation: toastIn 0.25s ease, toastOut 0.3s ease 2.7s forwards;
      pointer-events: none;
    }

    @keyframes toastIn  { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
    @keyframes toastOut { from { opacity: 1; } to { opacity: 0; } }

    /* ── Section ────────────────────────────────────────────────────────────── */
    .fb {
      padding: var(--section-pad);
      background: var(--bg);
      border-top: 1px solid rgba(201, 168, 76, 0.08);
    }

    .fb__inner {
      max-width: 760px;
      margin: 0 auto;
    }

    .fb__header {
      margin-bottom: 2.5rem;
    }

    .fb__eyebrow {
      font-family: var(--font-display);
      font-size: 0.84rem;
      letter-spacing: 0.4em;
      color: var(--gold);
      margin-bottom: 0.375rem;
    }

    .fb__heading {
      font-family: var(--font-display);
      font-size: clamp(2rem, 4vw, 3rem);
      letter-spacing: 0.08em;
      color: var(--cream);
    }

    /* ── Form ───────────────────────────────────────────────────────────────── */
    .fb__form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .fb__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;

      @media (max-width: 560px) { grid-template-columns: 1fr; }
    }

    .fb__field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .fb__label {
      font-family: var(--font-sans);
      font-size: 0.7rem;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .fb__input,
    .fb__textarea {
      background: rgba(245, 240, 232, 0.04);
      border: 1px solid rgba(245, 240, 232, 0.1);
      color: var(--cream);
      font-family: var(--font-sans);
      font-size: 0.9rem;
      padding: 0.75rem 1rem;
      width: 100%;
      outline: none;
      transition: border-color 0.2s ease;
      resize: vertical;

      &::placeholder { color: rgba(245, 240, 232, 0.2); }
      &:focus { border-color: rgba(201, 168, 76, 0.5); }
    }

    /* ── Stars ──────────────────────────────────────────────────────────────── */
    .fb__stars {
      display: flex;
      gap: 0.25rem;
    }

    .fb__star {
      font-size: 1.75rem;
      color: rgba(245, 240, 232, 0.15);
      transition: color 0.15s ease, transform 0.1s ease;
      line-height: 1;
      padding: 0 2px;

      &.fb__star--filled { color: var(--gold); }
      &:hover { transform: scale(1.15); }
    }

    /* ── Error ──────────────────────────────────────────────────────────────── */
    .fb__error {
      font-family: var(--font-sans);
      font-size: 0.8rem;
      color: #f87171;
      background: rgba(248, 113, 113, 0.08);
      border: 1px solid rgba(248, 113, 113, 0.2);
      padding: 0.5rem 0.75rem;
    }

    /* ── Submit ─────────────────────────────────────────────────────────────── */
    .fb__submit {
      align-self: flex-start;
      padding: 0.875rem 2.5rem;
      background: var(--gold);
      color: #0d0d0d;
      font-family: var(--font-display);
      font-size: 0.9rem;
      letter-spacing: 0.2em;
      transition: opacity 0.2s ease;

      &:disabled { opacity: 0.5; cursor: not-allowed; }
      &:not(:disabled):hover { opacity: 0.88; }

      @media (max-width: 480px) { width: 100%; }
    }

    /* ── Thank-you ──────────────────────────────────────────────────────────── */
    .fb__thankyou {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 1rem;
      padding: 3rem 1rem;
      animation: fadeUp 0.4s ease;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .fb__thankyou-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: 2px solid var(--gold);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: var(--gold);
    }

    .fb__thankyou-title {
      font-family: var(--font-display);
      font-size: 1.75rem;
      letter-spacing: 0.08em;
      color: var(--cream);
    }

    .fb__thankyou-sub {
      font-family: var(--font-sans);
      font-size: 0.9rem;
      color: var(--muted);
      max-width: 360px;
      line-height: 1.6;
    }
  `],
})
export class FeedbackFormComponent {
  private auth = inject(AuthService);
  private api  = inject(ApiService);

  readonly stars = [1, 2, 3, 4, 5];

  readonly selectedRating = signal(5);
  readonly hoverRating    = signal(0);
  readonly loading        = signal(false);
  readonly submitted      = signal(false);
  readonly submittedName  = signal('');
  readonly errorMsg       = signal('');
  readonly toast          = signal('');

  name     = '';
  location = '';
  quote    = '';

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user?.name) this.name = user.name;
    });
  }

  submit(): void {
    this.errorMsg.set('');

    if (!this.quote.trim() || this.quote.trim().length < 10) {
      this.errorMsg.set('Please write at least 10 characters for your review.');
      return;
    }
    if (!this.name.trim()) {
      this.errorMsg.set('Please enter your name.');
      return;
    }
    if (!this.location.trim()) {
      this.errorMsg.set('Please enter your city.');
      return;
    }

    this.loading.set(true);

    const payload: FeedbackPayload = {
      name:     this.name.trim(),
      location: this.location.trim(),
      quote:    this.quote.trim(),
      rating:   this.selectedRating(),
    };

    this.api.post<unknown>('/feedback', payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.submittedName.set(payload.name.split(' ')[0]);
        this.submitted.set(true);
        this.showToast('Review submitted! It will appear once approved.');
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error ?? 'Failed to submit. Please try again.');
      },
    });
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3000);
  }
}

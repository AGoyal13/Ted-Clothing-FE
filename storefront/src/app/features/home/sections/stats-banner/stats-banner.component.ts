import { Component } from '@angular/core';

@Component({
  selector: 'app-stats-banner',
  standalone: true,
  template: `
    <section class="stats" aria-label="Brand statistics">
      <div class="stats__inner">
        @for (stat of stats; track stat.label) {
          <div class="stats__item">
            <span class="stats__number">{{ stat.number }}</span>
            <span class="stats__label">{{ stat.label }}</span>
          </div>
          @if (!$last) {
            <div class="stats__divider" aria-hidden="true"></div>
          }
        }
      </div>
    </section>
  `,
  styles: [`
    .stats {
      background: var(--surface);
      border-top: 1px solid rgba(201, 168, 76, 0.12);
      border-bottom: 1px solid rgba(201, 168, 76, 0.12);
    }

    .stats__inner {
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 1440px;
      margin: 0 auto;
      padding: 2.75rem 5%;
    }

    .stats__item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.375rem;
      text-align: center;
    }

    .stats__number {
      font-family: var(--font-display);
      font-size: clamp(2.25rem, 4vw, 3.25rem);
      color: var(--gold);
      letter-spacing: 0.04em;
      line-height: 1;
    }

    .stats__label {
      font-family: var(--font-sans);
      font-size: 0.78rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .stats__divider {
      width: 1px;
      height: 48px;
      background: rgba(201, 168, 76, 0.2);
      flex-shrink: 0;
      margin: 0 2rem;
    }

    @media (max-width: 600px) {
      .stats__inner {
        flex-direction: column;
        gap: 2rem;
        padding: 2.5rem 5%;
      }

      .stats__divider {
        width: 48px;
        height: 1px;
        margin: 0;
      }
    }
  `],
})
export class StatsBannerComponent {
  readonly stats = [
    { number: '12K+', label: 'Happy Clients' },
    { number: '340+', label: 'Unique Pieces' },
    { number: '98%',  label: 'Satisfaction' },
  ];
}

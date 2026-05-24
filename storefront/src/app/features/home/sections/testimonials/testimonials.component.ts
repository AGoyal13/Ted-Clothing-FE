import { Component } from '@angular/core';

interface Testimonial {
  quote: string;
  author: string;
  initials: string;
  location: string;
}

@Component({
  selector: 'app-testimonials',
  standalone: true,
  template: `
    <section class="testi" aria-labelledby="testi-heading">
      <div class="testi__inner">
        <div class="testi__header">
          <p class="testi__eyebrow">WHAT THEY SAY</p>
          <h2 class="testi__heading" id="testi-heading">WORN & LOVED</h2>
        </div>

        <div class="testi__grid">
          @for (t of testimonials; track t.author) {
            <article class="testi__card">
              <div class="testi__stars" aria-label="5 stars">
                <span aria-hidden="true">★★★★★</span>
              </div>
              <blockquote class="testi__quote">
                <em>"{{ t.quote }}"</em>
              </blockquote>
              <div class="testi__author">
                <div class="testi__avatar" aria-hidden="true">
                  <span>{{ t.initials }}</span>
                </div>
                <div class="testi__author-info">
                  <p class="testi__author-name">{{ t.author }}</p>
                  <p class="testi__author-loc">{{ t.location }}</p>
                </div>
              </div>
            </article>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    .testi {
      padding: var(--section-pad);
      background: rgba(26, 23, 20, 0.5);
    }

    .testi__inner {
      max-width: 1440px;
      margin: 0 auto;
    }

    .testi__header {
      margin-bottom: 3rem;
    }

    .testi__eyebrow {
      font-family: var(--font-display);
      font-size: 0.7rem;
      letter-spacing: 0.4em;
      color: var(--gold);
      margin-bottom: 0.375rem;
    }

    .testi__heading {
      font-family: var(--font-display);
      font-size: clamp(2rem, 4vw, 3rem);
      letter-spacing: 0.08em;
      color: var(--cream);
    }

    .testi__grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
        max-width: 500px;
      }
    }

    .testi__card {
      background: var(--surface);
      border: 1px solid rgba(245, 240, 232, 0.06);
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      transition: border-color 0.3s ease;

      &:hover {
        border-color: rgba(201, 168, 76, 0.2);
      }
    }

    .testi__stars {
      font-size: 1rem;
      letter-spacing: 0.1em;
      color: var(--gold);
    }

    .testi__quote {
      font-family: var(--font-serif);
      font-style: italic;
      font-size: 1rem;
      color: rgba(245, 240, 232, 0.8);
      line-height: 1.7;
      flex: 1;

      em {
        font-style: italic;
      }
    }

    .testi__author {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }

    .testi__avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(201, 168, 76, 0.15);
      border: 1px solid rgba(201, 168, 76, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      span {
        font-family: var(--font-display);
        font-size: 0.875rem;
        letter-spacing: 0.05em;
        color: var(--gold);
      }
    }

    .testi__author-name {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--cream);
    }

    .testi__author-loc {
      font-family: var(--font-sans);
      font-size: 0.75rem;
      color: var(--muted);
    }
  `],
})
export class TestimonialsComponent {
  readonly testimonials: Testimonial[] = [
    {
      quote: 'The quality is unlike anything I\'ve found locally. The fabric breathes beautifully and the fit is impeccable. Ted Clothing is now my go-to for every occasion.',
      author: 'Arjun Mehta',
      initials: 'AM',
      location: 'Mumbai, India',
    },
    {
      quote: 'I ordered the linen kurta set and wore it to a family function. I received so many compliments. The attention to detail — the stitching, the buttons — everything is perfect.',
      author: 'Priya Nair',
      initials: 'PN',
      location: 'Bengaluru, India',
    },
    {
      quote: 'Finally, a brand that understands quiet luxury without the European price tag. I\'ve purchased three times now and each piece only gets better with wear.',
      author: 'Rohan Sharma',
      initials: 'RS',
      location: 'Delhi, India',
    },
  ];
}

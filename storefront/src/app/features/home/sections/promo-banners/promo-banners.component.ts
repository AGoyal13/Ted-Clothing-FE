import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-promo-banners',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="promos" aria-label="Promotional banners">
      <div class="promos__inner">

        <!-- Dark Banner -->
        <a routerLink="/category/men" class="promo promo--dark" aria-label="Shop Men's Collection">
          <div class="promo__bg"></div>
          <div class="promo__content">
            <p class="promo__eyebrow">FOR THE DISCERNING FEW</p>
            <h3 class="promo__headline">CRAFTED FOR THOSE WHO KNOW</h3>
            <p class="promo__sub">
              <em>Precision tailoring. Timeless silhouettes. Made to be felt.</em>
            </p>
            <span class="promo__cta">Explore Men →</span>
          </div>
          <div class="promo__corner promo__corner--tl"></div>
          <div class="promo__corner promo__corner--br"></div>
        </a>

        <!-- Gold Banner -->
        <a routerLink="/category/women" class="promo promo--gold" aria-label="Shop Women's Collection">
          <div class="promo__bg"></div>
          <div class="promo__content">
            <p class="promo__eyebrow promo__eyebrow--dark">NEW SEASON</p>
            <h3 class="promo__headline promo__headline--dark">NEW SEASON. NEW STORY.</h3>
            <p class="promo__sub promo__sub--dark">
              <em>Woven with intention. Worn with grace.</em>
            </p>
            <span class="promo__cta promo__cta--dark">Explore Women →</span>
          </div>
          <div class="promo__corner promo__corner--dark promo__corner--tl"></div>
          <div class="promo__corner promo__corner--dark promo__corner--br"></div>
        </a>

      </div>
    </section>
  `,
  styles: [`
    .promos {
      padding: var(--section-pad);
      max-width: 1440px;
      margin: 0 auto;
    }

    .promos__inner {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;

      @media (max-width: 700px) {
        grid-template-columns: 1fr;
      }
    }

    .promo {
      position: relative;
      aspect-ratio: 16 / 7;
      overflow: hidden;
      display: flex;
      align-items: flex-end;
      padding: 2.5rem;
      text-decoration: none;
      cursor: pointer;

      &:hover .promo__content {
        transform: translateY(-6px);
      }

      &:hover .promo__bg {
        transform: scale(1.03);
      }

      @media (max-width: 500px) {
        aspect-ratio: 4/3;
        align-items: center;
        padding: 2rem;
      }
    }

    .promo--dark {
      background: var(--surface);
      border: 1px solid rgba(201, 168, 76, 0.15);
    }

    .promo--gold {
      background: var(--gold);
      border: none;
    }

    .promo__bg {
      position: absolute;
      inset: 0;
      transition: transform 0.6s var(--ease-enter);
    }

    .promo--dark .promo__bg {
      background: radial-gradient(ellipse 80% 60% at 30% 60%, rgba(139, 94, 60, 0.2) 0%, transparent 70%);
    }

    .promo--gold .promo__bg {
      background: radial-gradient(ellipse 80% 60% at 70% 30%, rgba(255, 255, 255, 0.12) 0%, transparent 70%);
    }

    .promo__content {
      position: relative;
      z-index: 1;
      transition: transform 0.4s var(--ease-enter);
    }

    .promo__eyebrow {
      font-family: var(--font-display);
      font-size: 0.78rem;
      letter-spacing: 0.4em;
      color: var(--gold);
      margin-bottom: 0.375rem;

      &--dark {
        color: rgba(13, 13, 13, 0.88);
      }
    }

    .promo__headline {
      font-family: var(--font-display);
      font-size: clamp(1.75rem, 3vw, 2.5rem);
      letter-spacing: 0.04em;
      color: var(--cream);
      line-height: 1.05;
      margin-bottom: 0.625rem;

      &--dark {
        color: var(--bg);
      }
    }

    .promo__sub {
      font-family: var(--font-serif);
      font-style: italic;
      font-size: 0.95rem;
      color: var(--muted);
      margin-bottom: 1rem;

      &--dark {
        color: rgba(13, 13, 13, 0.82);
      }
    }

    .promo__cta {
      font-family: var(--font-display);
      font-size: 0.75rem;
      letter-spacing: 0.2em;
      color: var(--gold);
      transition: letter-spacing 0.2s ease;

      &--dark {
        color: var(--bg);
      }
    }

    .promo:hover .promo__cta {
      letter-spacing: 0.3em;
    }

    .promo__corner {
      position: absolute;
      width: 18px;
      height: 18px;
      border-color: var(--gold);
      border-style: solid;
      transition: width 0.3s ease, height 0.3s ease;

      &--dark {
        border-color: rgba(13, 13, 13, 0.65);
      }

      &--tl {
        top: 1rem;
        left: 1rem;
        border-width: 1.5px 0 0 1.5px;
      }

      &--br {
        bottom: 1rem;
        right: 1rem;
        border-width: 0 1.5px 1.5px 0;
      }
    }

    .promo:hover .promo__corner {
      width: 24px;
      height: 24px;
    }
  `],
})
export class PromoBannersComponent {}

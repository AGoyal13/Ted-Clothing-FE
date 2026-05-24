import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="hero" aria-label="Hero banner">

      <!-- Noise grain overlay -->
      <svg class="hero__grain" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" opacity="0.04"/>
      </svg>

      <!-- Radial gradient -->
      <div class="hero__gradient" aria-hidden="true"></div>

      <div class="hero__inner">
        <!-- Left: Editorial Text -->
        <div class="hero__content">
          <p class="hero__eyebrow">NEW SEASON — SS'25</p>
          <h1 class="hero__headline">
            <span>WEAR</span>
            <span class="hero__headline--gold">YOUR</span>
            <span>QUIET</span>
            <span>LUXURY</span>
          </h1>
          <p class="hero__subtext">
            Handcrafted in India. Worn by those<br>who let their clothes do the talking.
          </p>
          <div class="hero__ctas">
            <a routerLink="/category/men" class="btn-primary">Shop Collection</a>
            <a routerLink="/category/women" class="btn-ghost">Explore Women</a>
          </div>

          <div class="hero__stats">
            <div class="hero__stat">
              <span class="hero__stat-number">12K+</span>
              <span class="hero__stat-label">Happy Clients</span>
            </div>
            <div class="hero__stat-divider" aria-hidden="true"></div>
            <div class="hero__stat">
              <span class="hero__stat-number">340+</span>
              <span class="hero__stat-label">Unique Pieces</span>
            </div>
            <div class="hero__stat-divider" aria-hidden="true"></div>
            <div class="hero__stat">
              <span class="hero__stat-number">98%</span>
              <span class="hero__stat-label">Satisfaction</span>
            </div>
          </div>
        </div>

        <!-- Right: Editorial Card Placeholder -->
        <div class="hero__visual" aria-hidden="true">
          <div class="hero__card">
            <div class="hero__card-inner">
              <p class="hero__card-label">EDITORIAL</p>
              <div class="hero__card-line"></div>
              <p class="hero__card-sub">SS 2025</p>
            </div>
            <div class="hero__card-corner hero__card-corner--tl"></div>
            <div class="hero__card-corner hero__card-corner--br"></div>
          </div>
        </div>
      </div>

      <!-- Scroll Indicator -->
      <div class="hero__scroll" aria-label="Scroll down">
        <span class="hero__scroll-line"></span>
        <svg class="hero__scroll-chevron" width="16" height="10" viewBox="0 0 16 10" fill="none">
          <path d="M1 1l7 7 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>

    </section>
  `,
  styles: [`
    .hero {
      position: relative;
      min-height: 100svh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--bg);
    }

    .hero__grain {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    }

    .hero__gradient {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 80% 60% at 70% 50%, rgba(139, 94, 60, 0.15) 0%, transparent 70%);
      pointer-events: none;
      z-index: 1;
    }

    .hero__inner {
      position: relative;
      z-index: 2;
      flex: 1;
      display: grid;
      grid-template-columns: 55fr 45fr;
      align-items: center;
      max-width: 1440px;
      margin: 0 auto;
      padding: 8rem 5% 4rem;
      width: 100%;
      gap: 4rem;

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
        padding: 7rem 5% 4rem;
      }
    }

    .hero__content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .hero__eyebrow {
      font-family: var(--font-display);
      font-size: 0.9rem;
      letter-spacing: 0.4em;
      color: var(--gold);
      display: flex;
      align-items: center;
      gap: 0.75rem;

      &::before {
        content: '';
        display: block;
        width: 32px;
        height: 1px;
        background: var(--gold);
      }
    }

    .hero__headline {
      display: flex;
      flex-direction: column;
      font-family: var(--font-display);
      font-size: clamp(3.5rem, 8vw, 7rem);
      line-height: 0.95;
      letter-spacing: 0.02em;
      color: var(--cream);
    }

    .hero__headline--gold {
      color: var(--gold);
    }

    .hero__subtext {
      font-family: var(--font-serif);
      font-style: italic;
      font-weight: 300;
      font-size: clamp(1rem, 1.5vw, 1.25rem);
      color: var(--muted);
      line-height: 1.7;
    }

    .hero__ctas {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .hero__stats {
      display: flex;
      align-items: center;
      gap: 0;
      padding-top: 1.75rem;
      border-top: 1px solid rgba(245, 240, 232, 0.1);
      margin-top: 0.5rem;
    }

    .hero__stat {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      flex: 1;
    }

    .hero__stat-number {
      font-family: var(--font-display);
      font-size: clamp(1.5rem, 2.5vw, 2rem);
      color: var(--gold);
      letter-spacing: 0.04em;
      line-height: 1;
    }

    .hero__stat-label {
      font-family: var(--font-sans);
      font-size: 0.7rem;
      font-weight: 500;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .hero__stat-divider {
      width: 1px;
      height: 36px;
      background: rgba(201, 168, 76, 0.25);
      flex-shrink: 0;
      margin: 0 1.5rem;
    }

    /* Editorial Visual Card */
    .hero__visual {
      display: flex;
      justify-content: center;
      align-items: center;

      @media (max-width: 900px) {
        display: none;
      }
    }

    .hero__card {
      position: relative;
      width: 100%;
      max-width: 380px;
      aspect-ratio: 2/3;
      background: var(--surface);
      border: 1px solid rgba(201, 168, 76, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .hero__card-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .hero__card-label {
      font-family: var(--font-display);
      font-size: 2.5rem;
      letter-spacing: 0.2em;
      color: rgba(201, 168, 76, 0.25);
    }

    .hero__card-line {
      width: 48px;
      height: 1px;
      background: rgba(201, 168, 76, 0.25);
    }

    .hero__card-sub {
      font-family: var(--font-sans);
      font-size: 0.65rem;
      letter-spacing: 0.35em;
      color: var(--muted);
      text-transform: uppercase;
    }

    .hero__card-corner {
      position: absolute;
      width: 16px;
      height: 16px;
      border-color: var(--gold);
      border-style: solid;

      &--tl {
        top: -1px;
        left: -1px;
        border-width: 1.5px 0 0 1.5px;
      }

      &--br {
        bottom: -1px;
        right: -1px;
        border-width: 0 1.5px 1.5px 0;
      }
    }

    /* Scroll Indicator */
    .hero__scroll {
      position: absolute;
      bottom: 2.5rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      color: var(--muted);
    }

    .hero__scroll-line {
      display: block;
      width: 1px;
      height: 40px;
      background: linear-gradient(to bottom, transparent, var(--muted));
    }

    .hero__scroll-chevron {
      animation: bounce-y 1.8s ease-in-out infinite;
    }

    @keyframes bounce-y {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(6px); }
    }
  `],
})
export class HeroComponent {}

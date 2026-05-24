import { Component } from '@angular/core';

@Component({
  selector: 'app-marquee',
  standalone: true,
  template: `
    <div class="marquee" aria-label="Promotional banner">
      <div class="marquee__track">
        <span class="marquee__content" aria-hidden="true">
          FREE SHIPPING ON ORDERS ABOVE ₹999&nbsp;&nbsp;·&nbsp;&nbsp;
          NEW ARRIVALS EVERY FRIDAY&nbsp;&nbsp;·&nbsp;&nbsp;
          HANDCRAFTED IN INDIA&nbsp;&nbsp;·&nbsp;&nbsp;
          PREMIUM QUALITY FABRICS&nbsp;&nbsp;·&nbsp;&nbsp;
          EASY 30-DAY RETURNS&nbsp;&nbsp;·&nbsp;&nbsp;
          FREE SHIPPING ON ORDERS ABOVE ₹999&nbsp;&nbsp;·&nbsp;&nbsp;
          NEW ARRIVALS EVERY FRIDAY&nbsp;&nbsp;·&nbsp;&nbsp;
          HANDCRAFTED IN INDIA&nbsp;&nbsp;·&nbsp;&nbsp;
          PREMIUM QUALITY FABRICS&nbsp;&nbsp;·&nbsp;&nbsp;
          EASY 30-DAY RETURNS&nbsp;&nbsp;·&nbsp;&nbsp;
        </span>
      </div>
    </div>
  `,
  styles: [`
    .marquee {
      background: var(--gold);
      overflow: hidden;
      padding: 0.75rem 0;

      &:hover .marquee__track {
        animation-play-state: paused;
      }
    }

    .marquee__track {
      display: flex;
      white-space: nowrap;
      animation: marquee-scroll 24s linear infinite;
      width: max-content;
    }

    .marquee__content {
      font-family: var(--font-display);
      font-size: 0.8rem;
      letter-spacing: 0.3em;
      color: var(--bg);
      white-space: nowrap;
      padding-right: 2rem;
    }

    @keyframes marquee-scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
  `],
})
export class MarqueeComponent {}

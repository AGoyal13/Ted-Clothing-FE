import { Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { HeroComponent } from './sections/hero/hero.component';
import { MarqueeComponent } from './sections/marquee/marquee.component';
import { CategoryGridComponent } from './sections/category-grid/category-grid.component';
import { FeaturedProductsComponent } from './sections/featured-products/featured-products.component';
import { PromoBannersComponent } from './sections/promo-banners/promo-banners.component';
import { TestimonialsComponent } from './sections/testimonials/testimonials.component';
import { FeedbackFormComponent } from './sections/feedback-form/feedback-form.component';
import { NewsletterComponent } from './sections/newsletter/newsletter.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroComponent,
    MarqueeComponent,
    CategoryGridComponent,
    FeaturedProductsComponent,
    PromoBannersComponent,
    TestimonialsComponent,
    FeedbackFormComponent,
    NewsletterComponent,
  ],
  template: `
    <main>
      <app-hero />

      @defer (on viewport) {
        <app-marquee />
      } @placeholder {
        <div style="height:44px;background:var(--gold);"></div>
      }

      @defer (on viewport) {
        <app-category-grid />
      } @placeholder {
        <div style="height:500px;"></div>
      }

      @defer (on viewport) {
        <app-featured-products />
      } @placeholder {
        <div style="height:600px;"></div>
      }

      @defer (on viewport) {
        <app-promo-banners />
      } @placeholder {
        <div style="height:300px;"></div>
      }

      @defer (on viewport) {
        <app-testimonials />
      } @placeholder {
        <div style="height:400px;"></div>
      }

      @defer (on viewport) {
        <app-feedback-form />
      } @placeholder {
        <div style="height:320px;"></div>
      }

      @defer (on viewport) {
        <app-newsletter />
      } @placeholder {
        <div style="height:300px;"></div>
      }
    </main>
  `,
})
export class HomeComponent {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  constructor() {
    this.title.setTitle('Ted Clothing — Quiet Luxury');
    this.meta.updateTag({ name: 'description', content: 'Shop Ted Clothing — premium handcrafted Indian clothing for men, women, and kids. Quiet luxury. New arrivals every Friday.' });
    this.meta.updateTag({ property: 'og:title', content: 'Ted Clothing — Quiet Luxury' });
    this.meta.updateTag({ property: 'og:description', content: 'Shop Ted Clothing — premium handcrafted Indian clothing for men, women, and kids.' });
  }
}

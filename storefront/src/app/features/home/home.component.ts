import { Component, inject } from '@angular/core';
import { SeoService } from '../../core/services/seo.service';
import { environment } from '../../../environments/environment';
import { HeroComponent } from './sections/hero/hero.component';
import { MarqueeComponent } from './sections/marquee/marquee.component';
import { CategoryGridComponent } from './sections/category-grid/category-grid.component';
import { FeaturedProductsComponent } from './sections/featured-products/featured-products.component';
import { PromoBannersComponent } from './sections/promo-banners/promo-banners.component';
import { TestimonialsComponent } from './sections/testimonials/testimonials.component';
import { FeedbackFormComponent } from './sections/feedback-form/feedback-form.component';
import { NewsletterComponent } from './sections/newsletter/newsletter.component';
import { HomeFeaturedService } from './home-featured.service';

@Component({
  selector: 'app-home',
  standalone: true,
  providers: [HomeFeaturedService],
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
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.updateSeo({
      title: 'Ted Clothing — Quiet Luxury',
      description: 'Shop Ted Clothing — premium handcrafted Indian clothing for men, women, and kids. Quiet luxury. New arrivals every Friday.',
      path: '/',
    });

    // Organization schema for brand entity / knowledge panel.
    // (sameAs social links omitted until available.)
    const siteUrl = (environment.siteUrl ?? '').replace(/\/+$/, '');
    this.seo.setJsonLd('ld-org', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Ted Clothing',
      url: siteUrl,
      logo: this.seo.toAbsolute('/images/hero-editorial.webp'),
    });
  }
}

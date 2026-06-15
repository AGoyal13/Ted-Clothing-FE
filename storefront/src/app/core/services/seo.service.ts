import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

export interface SeoInput {
  /** Full <title> text (already suffixed, e.g. "Foo — Ted Clothing"). */
  title: string;
  /** Meta description — truncated to 160 chars by the service. */
  description: string;
  /** Route path beginning with "/" (e.g. "/product/foo"). */
  path: string;
  /** Absolute or relative image URL for OG/Twitter. Falls back to brand default. */
  image?: string | null;
  /** og:type — "website" (default) or "product". */
  type?: string;
}

const SITE_NAME = 'Ted Clothing';
const DEFAULT_OG_IMAGE = '/images/hero-editorial.webp';

/**
 * Single source of truth for per-page SEO metadata: title, description,
 * canonical link, Open Graph + Twitter cards, and JSON-LD structured data.
 *
 * SSR-safe: all DOM access goes through the injected DOCUMENT (not the global
 * `document`), so tags are serialized into the server-rendered HTML and reach
 * crawlers. No cookies are touched, preserving Vercel edge caching.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  private get siteUrl(): string {
    return (environment.siteUrl ?? '').replace(/\/+$/, '');
  }

  /** Applies title, description, canonical, OG and Twitter tags for a page. */
  updateSeo(input: SeoInput): void {
    const description = this.truncate(input.description);
    const url = this.siteUrl + input.path;
    const image = this.toAbsolute(input.image || DEFAULT_OG_IMAGE);
    const type = input.type ?? 'website';

    this.title.setTitle(input.title);
    this.meta.updateTag({ name: 'description', content: description });

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: input.title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });

    // Twitter card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: input.title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.setCanonical(url);
  }

  /** Find-or-create a single <link rel="canonical"> in <head>. */
  setCanonical(url: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * Inject or update a JSON-LD <script> with a stable id. The id lets the
   * browser find the SSR-rendered script and update it in place on hydration
   * rather than appending a duplicate.
   */
  setJsonLd(id: string, schema: object | object[]): void {
    let script = this.doc.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = this.doc.createElement('script');
      script.type = 'application/ld+json';
      script.id = id;
      this.doc.head.appendChild(script);
    }
    // Escape "<" to prevent a "</script>" breakout from any field value.
    script.textContent = JSON.stringify(schema).replace(/</g, '\\u003c');
  }

  removeJsonLd(id: string): void {
    this.doc.getElementById(id)?.remove();
  }

  /** Resolves a possibly-relative URL to an absolute one against siteUrl. */
  toAbsolute(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    return this.siteUrl + (url.startsWith('/') ? url : '/' + url);
  }

  private truncate(text: string, max = 160): string {
    const t = (text ?? '').trim();
    return t.length > max ? t.slice(0, max).trim() : t;
  }
}

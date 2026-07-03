export const environment = {
  production: true,
  // API behind Cloudflare (§12.2) — both SSR and browser XHR hit this one host so
  // the edge can cache public catalog reads. Requires the proxied api.tedclothing.in
  // DNS record to be live before deploying this.
  apiUrl: 'https://api.tedclothing.in/api/v1',
  // Base URL for absolute canonical / OG / JSON-LD URLs (Phase 10 SEO).
  // Canonical = apex; keep Fly STOREFRONT_URL + public/robots.txt Sitemap line in sync.
  siteUrl: 'https://tedclothing.in'
};

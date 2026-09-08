import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Home was Prerender — but the navbar, category grid and featured products all
  // read live catalog data, and a prerendered page bakes those API responses into
  // static HTML (plus the hydration transfer cache, so the client never refetches).
  // A new category or product then stayed invisible on '/' until the next deploy,
  // while /category/:slug already showed it. SSR + s-maxage in server.ts keeps the
  // edge-cached speed and bounds staleness to ~60s.
  { path: '', renderMode: RenderMode.Server },
  { path: 'category/:slug', renderMode: RenderMode.Server },
  { path: 'product/:slug', renderMode: RenderMode.Server },
  { path: 'cart', renderMode: RenderMode.Client },

  // Auth-gated routes — no SSR value; explicit CSR avoids auth flicker + Razorpay in SSR
  { path: 'checkout',            renderMode: RenderMode.Client },
  { path: 'account',             renderMode: RenderMode.Client },
  { path: 'account/profile',     renderMode: RenderMode.Client },
  { path: 'account/orders',      renderMode: RenderMode.Client },
  { path: 'account/addresses',   renderMode: RenderMode.Client },
  { path: 'account/wishlist',    renderMode: RenderMode.Client },
  { path: 'account/preferences', renderMode: RenderMode.Client },
  { path: 'wishlist',            renderMode: RenderMode.Client },

  // Order confirmed — unique per order, must stay SSR but never edge-cached
  { path: 'order-confirmed/:id', renderMode: RenderMode.Server },

  // Help centre — static pages prerendered at build time, dynamic pages SSR
  { path: 'help/size-guide', renderMode: RenderMode.Prerender },
  { path: 'help/contact', renderMode: RenderMode.Prerender },
  { path: 'help/faqs', renderMode: RenderMode.Prerender },
  { path: 'help/returns', renderMode: RenderMode.Server },
  { path: 'help/track-order', renderMode: RenderMode.Server },

  { path: '**', renderMode: RenderMode.Server },
];

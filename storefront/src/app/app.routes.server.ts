import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'category/:slug', renderMode: RenderMode.Server },
  { path: 'product/:slug', renderMode: RenderMode.Server },
  { path: 'cart', renderMode: RenderMode.Client },

  // Help centre — static pages prerendered at build time, dynamic pages SSR
  { path: 'help/size-guide', renderMode: RenderMode.Prerender },
  { path: 'help/contact', renderMode: RenderMode.Prerender },
  { path: 'help/faqs', renderMode: RenderMode.Prerender },
  { path: 'help/returns', renderMode: RenderMode.Server },
  { path: 'help/track-order', renderMode: RenderMode.Server },

  { path: '**', renderMode: RenderMode.Server },
];

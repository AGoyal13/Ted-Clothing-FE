import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

// Cache-Control headers for SSR routes.
// Must be set before Angular handles the request — writeResponseToNodeResponse
// merges Angular's response headers without overwriting pre-set headers.
//
// WARNING: any Set-Cookie on these responses will cause Vercel's edge to silently
// skip caching entirely (permanent MISS). These routes make no auth calls during
// SSR (auth interceptor + tryRefresh() are both browser-only), so no cookies are set.
app.use('/product/:slug', (_req, res, next) => {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=3600');
  next();
});
app.use('/category/:slug', (_req, res, next) => {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=3600');
  next();
});
// Order-confirmed pages are unique per order — must never be edge-cached.
app.use('/order-confirmed/:id', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

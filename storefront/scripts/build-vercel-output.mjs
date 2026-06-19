// Assemble the Vercel Build Output API (.vercel/output) for Angular SSR.
//
// WHY: Vercel's zero-config Angular preset only runs @vercel/static-build — it
// serves dist/storefront/browser as a static SPA and never wraps
// dist/storefront/server/server.mjs in a serverless function, so SSR never runs
// in production (verified 2026-06-19). This script produces the Build Output API
// output explicitly so the SSR bundle runs as a Node function.
//
// USAGE: run AFTER `ng build --configuration=production`:
//   ng build --configuration=production && node scripts/build-vercel-output.mjs
// Vercel uses an existing .vercel/output as-is (Build Output API), bypassing the
// static preset.
import { cpSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist/storefront');
const browserDir = join(dist, 'browser');
const serverDir = join(dist, 'server');
const outDir = join(root, '.vercel/output');
const fnDir = join(outDir, 'functions/ssr.func');

const SITEMAP_ORIGIN = 'https://ted-be-dev.fly.dev/api/v1/sitemap.xml';

if (!existsSync(join(serverDir, 'server.mjs'))) {
  console.error('✗ dist/storefront/server/server.mjs not found — run `ng build` first.');
  process.exit(1);
}

// Replace any prior (static-preset) output with our Build Output API output.
rmSync(outDir, { recursive: true, force: true });

// 1) Static assets = the browser build (client bundles + prerendered HTML pages).
mkdirSync(join(outDir, 'static'), { recursive: true });
cpSync(browserDir, join(outDir, 'static'), { recursive: true });

// 2) SSR function = the whole server bundle + a tiny handler wrapper.
//    server.mjs exports `reqHandler` (createNodeRequestHandler(expressApp)),
//    which is a Node (req,res) listener — exactly what Vercel's Nodejs launcher
//    invokes. server.mjs only .listen()s when run as main, so importing is safe.
mkdirSync(fnDir, { recursive: true });
cpSync(serverDir, fnDir, { recursive: true });

writeFileSync(
  join(fnDir, 'index.mjs'),
  "import { reqHandler } from './server.mjs';\nexport default reqHandler;\n",
);

writeFileSync(
  join(fnDir, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.mjs',
      launcherType: 'Nodejs',
      supportsResponseStreaming: true,
    },
    null,
    2,
  ),
);

// 3) Routing: serve existing static files first (assets + prerendered pages),
//    proxy the sitemap to the API, then send everything else to the SSR function.
//    The function receives the original request URL, so Angular's router renders
//    the correct route (and server.ts sets the s-maxage / no-store headers).
writeFileSync(
  join(outDir, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: 'filesystem' },
        { src: '^/sitemap\\.xml$', dest: SITEMAP_ORIGIN, check: true },
        { src: '/(.*)', dest: '/ssr' },
      ],
    },
    null,
    2,
  ),
);

console.log('✓ .vercel/output assembled — static/ + functions/ssr.func/ + config.json');

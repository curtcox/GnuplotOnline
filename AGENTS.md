# Gnuplot Online

This is a buildless static GitHub Pages application. Use plain JavaScript with browser
globals and CommonJS exports for shared modules. Do not add a production bundler or
server. Serve the repository root over HTTP, never file://.

## Important contracts

- Public URL and HashBin redirect: `https://gnuplot.hashbin.page/` (case matters).
- Keep `vendor/gnuplot/gnuplot.js` and `.wasm` byte-identical to the recorded npm tarball.
  The upstream loader is ESM, loaded by dynamic import from a classic worker; the
  local vendor package.json declares its module type for Node tests.
- Terminal defaults go through `callMain(['-e', setup, 'script.gp'])`. Do not prepend
  lines to user scripts: diagnostics must retain the real line numbers.
- Snapshot/restore the heap around every run. Run gnuplot only in a worker in the UI;
  a timeout must terminate the worker, since synchronous WASM cannot process a cancel message.
- Keep file validation, source limits and filename reservations consistent in data files,
  documents and worker input. Source/files/settings must survive all sharing/save paths.
- Saves use the pinned SDK's `publish()` from the click (never OAuth tokens on this shared
  origin). The registered public client ID lives in the `hashbin-client-id` meta tag.
  Preserve it unless the user supplies a replacement. Keep scripts out of HTML: the
  Content-Security-Policy allows no inline script. The service worker serves only
  hash-verified bytes; run `node scripts/update-offline.mjs` after shipped-file changes.
- Keep the QR encoder's MIT notice and all vendored dependency notices.
- Keep SVG sanitization before injection/export; preserve the last good plot on errors.
- A source/example/CID URL replaces the localStorage plot only after the user confirms,
  unless the stored plot is a sample or the default. Guard asynchronous loads and
  renders against newer edits. Storage failure must not prevent editing.

## Validation and generated files

Use `npm ci`, `npm test`, `npm run check`, and
`node scripts/render-gallery.mjs --check`. Browser tests need a local HTTP server:
`node tests/browser/all.cjs http://127.0.0.1:8000/ chromium` (also firefox, webkit).
CI covers all three engines. Test the actual WASM, not a plotting mock.

After example/renderer changes, run `node scripts/render-gallery.mjs` and commit the
covers. Keep `examples/*.gp`/data synchronized with `src/examples.js`. After changing
any shipped assets, run `node scripts/update-offline.mjs`; commit the content-versioned
manifest. Offline installation is atomic: never claim readiness for an incomplete cache.

The user's current workflow is direct commits on `main` with frequent pushes.
Deployment remains independent of tests. Avoid changing Pages settings unnecessarily.

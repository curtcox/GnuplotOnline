# Gnuplot Online

This is a buildless static GitHub Pages application. Use browser-native ES modules for Fragment Kit and retain CommonJS exports for app-owned engine modules. Shared contracts are in `vendor/fragment-kit-v0.4.3/docs/contracts.md`. Do not add a production bundler or
server. Serve the repository root over HTTP, never file://.

## Important contracts

- Public URL and HashBin redirect: `https://gnuplot.hashbin.page/` (case matters).
- Keep `vendor/gnuplot/gnuplot.js` and `.wasm` byte-identical to the recorded npm tarball.
  The upstream loader is ESM, loaded through `hashbinSandbox.import` from an opaque-origin
  classic worker; the local vendor package.json declares its module type for Node tests.
- Terminal defaults go through `callMain(['-e', setup, 'script.gp'])`. Do not prepend
  lines to user scripts: diagnostics must retain the real line numbers.
- Snapshot/restore the heap around every run. Run gnuplot only in a worker in the UI;
  a timeout must terminate the worker, since synchronous WASM cannot process a cancel message.
- Keep file validation, source limits and filename reservations consistent in data files,
  documents and worker input. Source/files/settings must survive all sharing/save paths.
- Saves use the pinned SDK's `publish()` from the click (never OAuth tokens on this shared
  origin). The registered public client ID lives in the `hashbin-client-id` meta tag.
  Preserve it unless the user supplies a replacement. Keep scripts out of HTML: the
  Content-Security-Policy allows only the pinned SDK sandbox bootstrap hash as inline script.
  The service worker serves only hash-verified bytes; run `node scripts/update-offline.mjs` after shipped-file changes.
- Keep the QR encoder's MIT notice and all vendored dependency notices.
- Keep SVG sanitization before injection/export; preserve the last good plot on errors.
- A source/example/CID URL loads independently of local drafts; retain saved work for explicit recovery. Guard asynchronous loads and
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

The Fragment Kit migration is isolated on its own branch and PR.
The reusable Pages deployment is gated by the shared contracts and actual engine tests. Avoid changing Pages settings unnecessarily.

## URL identity and draft recovery

Explicit program, source, example and CID URLs always load their document, independent of browser drafts. Never gate URL loading on a replacement confirmation. The bare homepage opens the default document. Preserve local drafts separately with LocalDrafts and offer Resume saved work. Opening or running a URL must not overwrite saved work; edits retain the previous draft for recovery. Keep stale-load guards and execution isolation.

## Shared kit

Pin Fragment Kit v0.3.3 byte for byte. Do not edit files under its vendor folder.
`fragment-kit.config.json` is the app config; the registered HashBin client ID
stays in the existing meta tag. Schema validation, data files, opaque-origin
execution, timeouts, SVG sanitization and export stay app-owned.
Keep the existing `gnuplotonline:document` draft key and `gnuplot-` cache prefix.
`legacyWriter` deliberately retains the old compressed/doc query format until
all ten consumers have shipped v1 readers; the pilot already reads v1 links.
Run the shared contract suite through `testing-contract.config.mjs`, the actual
WASM suites in `tests/browser/all.cjs`, and URL/recovery checks in all engines.
The shared gallery renderer needs an HTTP server only when generating covers;
`--check` validates fingerprints without launching a browser. Original SVGs in
`tests/fixtures/original-covers` continue to verify native engine output.

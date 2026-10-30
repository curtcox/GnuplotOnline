# Gnuplot Online

[Open the editor](https://curtcox.github.io/GnuplotOnline/) ·
[Sample gallery](https://curtcox.github.io/GnuplotOnline/gallery.html) ·
[gnuplot documentation](http://gnuplot.info/docs_6.0/loc1.html)

Write gnuplot scripts and see the plot update live. gnuplot **6.0 patchlevel 2** runs
as WebAssembly in a worker. Everything is static: no plotting server, API key, or
production build step. GitHub Pages deploys this repository root on pushes to `main`.

## Use it

- Edit the script; the preview updates after a short pause. Errors keep the last good
  plot visible and mark the relevant script line. Long-running scripts can be cancelled
  and are stopped automatically after five seconds.
- Set the plot size and white/transparent background in the toolbar. Your script can
  override the terminal and output file. Drag the splitter or hide the editor; on a
  phone use **Preview / Code**, **More**, and pinch/pan on the plot.
- Add UTF-8 text through **Data files**, multiple file uploads, or dropping files onto
  the editor. Names use 1–64 letters/digits/dots/underscores/hyphens, without `..`.
  `script.gp` and `out.svg` are reserved. Each file is limited to 2 MiB, with source
  and data limited to 5 MiB total. Use `plot 'data.dat' using 1:2` in your script.
- Download SVG, PNG at 2× resolution, text-terminal output, a terminal's output file,
  or the `.gp` source. **Script + inlined data** rewrites exact quoted file references
  as datablocks to make a standalone script; computed filename expressions need manual editing.
- Share the compressed URL, optionally shorten it through is.gd/AllOrigins, or make
  a QR code with SVG/PNG downloads. Source, files and size/background settings travel
  together. Local work is restored from localStorage when a URL has no source.
- After the status says **Available offline**, the editor, engine and full gallery
  work offline. Install the app through your browser's Add to Home Screen/Install action.
  New cached versions offer **Update and reload**; the current source is saved first.

The gallery contains 16 original examples: functions, file data, histograms, error bars,
filled curves, polar/parametric plots, pm3d, image heatmaps, contours, multiplot, dates,
least-squares fitting, vectors and annotations. `print` and fit diagnostics appear in
**Output**, below the preview. More examples are available in the
[official demos](https://gnuplot.sourceforge.net/demo_6.0/).

## Run and test locally

Use Node 22+ for development tools and any static HTTP server:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
# Open http://127.0.0.1:8000/ in your browser.
```

In another terminal:

```sh
npm ci
npm test
npm run check
node scripts/render-gallery.mjs --check
npx playwright install chromium firefox webkit
npm run test:browser -- http://127.0.0.1:8000/ chromium
npm run test:browser -- http://127.0.0.1:8000/ firefox
npm run test:browser -- http://127.0.0.1:8000/ webkit
```

The unit suite runs the actual vendored engine, including 50 successive runs, exact
error lines, datablocks/files, text and PostScript output. It also checks documents,
OAuth/quote/save mocks, file limits/UTF-8, QR vectors, share fallbacks, timeout/restart
behavior, gallery fingerprints and offline coverage. Browser tests exercise editing,
exports, sharing, HashBin, every gallery example, mobile layout and offline reloads with the application origin stopped.
CI runs the browser suite on Chromium, Firefox and WebKit. Deployment is independent
of tests, as specified in the plan.

After changing shipped files:

```sh
# If samples or render defaults changed:
node scripts/render-gallery.mjs
# After all runtime/asset changes:
node scripts/update-offline.mjs
npm test
npm run check
```

No npm dependencies are needed to serve the application; Playwright is development-only.
The engine loader and wasm are committed unchanged from `gnuplot-wasm@0.1.0`.
The worker uses dynamic import because that package's loader is an ES module.
PostScript prologues/encoding maps omitted by the npm package are also vendored and
mounted in the Emscripten filesystem. See [engine provenance](vendor/gnuplot/PROVENANCE.md).

## URLs and HashBin setup

The editor accepts `#<encoded script>`, `?compressed=<lz-string>`, `?doc=<compressed
JSON document>`, `?example=<id>` and `#<HashBin CID>`. Legacy source URLs can include
`?w=<width>&h=<height>&bg=white|transparent`. A document has this shape:

```json
{"format":"hashbin-diagram","version":1,"type":"gnuplot","src":"plot x","gnuplot":{"width":800,"height":600,"background":"white"},"files":{}}
```

HashBin loading and saving are configured for the registered **Gnuplot Online** app.
The public client ID is `app_69800851-cef2-4274-9c7b-b1e908965181`; it is not a
secret. The registered return URL must remain exactly:

```text
https://curtcox.github.io/GnuplotOnline/
```

Saves use HashBin Publish through the pinned SDK
(`https://hashbin.org/sdk/v0.4.0/hashbin.js`): HashBin shows the size, retention, exact
price and balance, and the user approves each save on hashbin.org. This app never holds
a HashBin credential; tokens left by the earlier OAuth flow are revoked on the next load.
A blocked popup falls back to a redirect that restores source, files and settings, even
after a cancelled save. Editing a saved plot replaces its CID URL with a link
representing the edits. Loads verify bytes against the CID. Inline CIDs and plain script
payloads also load.

Every app under `curtcox.github.io` shares this origin's storage. Share, sample and CID
links ask before replacing the plot kept in this browser. The service worker stores and
serves only bytes matching the SHA-256 hashes in `offline-assets.js`, and a
Content-Security-Policy limits scripts to this site, the pinned lz-string path and the
pinned SDK.

If the registration changes, update the `hashbin-client-id` meta tag in `index.html`,
regenerate the offline manifest, and push. A fork needs its own
[HashBin registration](https://hashbin.org/developers) matching its public return URL.

## Engine limitations

- No cairo/gd terminals: PNG export rasterizes SVG in a browser canvas. Font appearance
  follows the viewing browser's available fonts; enhanced sub/superscripts work in SVG.
- Interactive `pause`/mouse commands are unsuitable for a headless worker. The timeout
  stops scripts that wait indefinitely. Canvas-terminal interactivity is outside v1;
  non-SVG/text terminals provide downloads rather than interactive previews.
- Several plots without `set multiplot` show the last SVG page and a note.
- This experimental WASM build can report `Igamma: errno = 0` while computing fit
  statistics for some very small residuals. The diagnostic is shown rather than hidden.
  The fitting gallery sample is verified with the vendored build.
- URL shorteners and HashBin require network access; rendering and cached examples do not.
  Large source links may exceed browser/provider limits; use HashBin for a short link.

## Credits and licensing

This site is not affiliated with the gnuplot project.

- gnuplot: Thomas Williams, Colin Kelley and contributors; see
  [copyright notice](vendor/gnuplot/LICENSE-gnuplot),
  [upstream source](https://sourceforge.net/projects/gnuplot/files/gnuplot/6.0.2/), and
  [provenance](vendor/gnuplot/PROVENANCE.md).
- gnuplot-wasm: stereobooster, MIT wrapper; upstream generated files remain unmodified.
- GraphvizOnline / ManimOnline lineage: [LICENSE-graphvizonline](LICENSE-graphvizonline).
  The scheduler, HashBin controls and shortener are adapted from ManimOnline.
- Ace 1.4.1: Ajax.org, BSD; [ace/LICENSE](ace/LICENSE).
- svg-pan-zoom 3.6.1: [LICENSE-svg-pan-zoom](LICENSE-svg-pan-zoom).
- lz-string 1.5.0: [vendor/LICENSE-lz-string](vendor/LICENSE-lz-string). A vendored
  fallback also supports offline preparation when cdnjs is unavailable.
- QR encoder: Project Nayuki, MIT; full notice retained in `src/qr.js`, ported from modl.
- All gallery scripts were written for this site; they are not copies of the official demos.

## Canonical HashBin address

The production app is [https://gnuplot.hashbin.page/](https://gnuplot.hashbin.page/). The GitHub Pages copy is kept for moving old drafts through **Move saved work** or **Download backup**. Transfers copy only this app's documents and public settings, keep the old copy, and never copy HashBin credentials or Python filesystem permissions. Deployment is managed by [HashBin's first-party deployment tool](https://github.com/curtcox/hashbin.org/blob/main/scripts/deploy-owned-apps.mjs).

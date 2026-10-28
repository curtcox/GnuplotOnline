# Gnuplot Online — master plan

A static GitHub Pages site where people write gnuplot scripts in the browser and see the plot
update live, in the way GraphvizOnline and [ManimOnline](https://curtcox.github.io/ManimOnline/)
work for their languages. No server: gnuplot runs in the page as WebAssembly.

Published at **https://curtcox.github.io/GnuplotOnline/**. The GitHub repo is named
`GnuplotOnline` and the Pages path follows that casing. The HashBin return URL must match it exactly.

## Decisions (agreed)

| Topic | Decision |
|---|---|
| Languages | gnuplot only. No Graphviz, modl or Manim, and no language detector. |
| Engine | Commit the prebuilt files from `gnuplot-wasm@0.1.0` (npm, by stereobooster, MIT wrapper): gnuplot **6.0 patchlevel 2**, `gnuplot.js` 177 KB + `gnuplot.wasm` 1.8 MB. Our own runner replaces the package's `index.js`. |
| Publishing | Same `deploy.yml` as ManimOnline: on push to `main`, upload the repo root with `actions/upload-pages-artifact@v3` and deploy with `actions/deploy-pages@v4`. No build step. |
| HashBin | The user registers a new "Gnuplot Online" app. The code ships with a placeholder client ID in the `hashbin-client-id` meta tag. |
| v1 extras | Data file upload, offline/PWA, is.gd link shortener, Playwright CI on Chromium/Firefox/WebKit. |

## What I checked before planning

I ran the vendored engine in Node 22 from the scratchpad:

- `gnuplot --version` reports `gnuplot 6.0 patchlevel 2`.
- Available terminals: `svg`, `canvas`, `dumb`, `postscript`, `epslatex`, `pict2e`, `pstricks`, `context`, `dxf`, `emf`, `cgm`, `fig`, and others. **No png/pngcairo/pdfcairo** (no cairo or gd). PNG export therefore rasterizes the SVG in the browser.
- A simple `plot sin(x)` renders to 12 KB of SVG in **about 16 ms** after start-up.
- Datablocks (`$D << EOD … EOD`) work, and so do files written to the Emscripten FS (`plot 'data.csv'`).
- Errors come back on stderr with the real line number (`"s.gp" line 9: invalid command`). This holds when the terminal setup goes in a `-e` argument rather than being prepended to the script. The package's own `render()` prepends a line, which shifts every line number by one. That is the main reason to write our own runner.
- `set term dumb` output arrives on stdout as ASCII art.
- The engine does not free memory between runs. The package works around this by snapshotting `HEAPU8` before `callMain` and restoring it afterwards. We keep that approach.

## Lineage features to carry over (from ManimOnline / modl)

1. **Links to docs and gallery.** The toolbar has *Docs ↗* (http://gnuplot.info/docs_6.0/loc1.html, plus the PDF), *Official demos ↗* (https://gnuplot.sourceforge.net/demo_6.0/) and *Sample gallery ↗* (our `gallery.html`).
2. **Mobile friendly.** Port ManimOnline's `@media (max-width: 760px), (max-height: 500px)` layout: Preview/Code tabs, the preview first, rarely used controls behind a *More* toggle, 40 px touch targets, 16 px inputs so iOS does not zoom, and `100dvh`. Add pinch-zoom/pan on the SVG preview with `svg-pan-zoom.min.js`, copied from ManimOnline.
3. **HashBin load/save.** Copy `src/hashbin.js` and `src/hashbin-panel.js` from ManimOnline and adapt them (see the HashBin section). `#<cid>` URLs load automatically, and source survives the OAuth redirect.
4. **QR code of the URL.** Port modl's `encodeQr` (Project Nayuki, MIT, condensed) and its QR dialog into `src/qr.js`. It warns when the URL is local or above version 20 (hard to scan), and suggests HashBin for a short link.
5. Also inherited from GraphvizOnline: the Ace editor, live render on edit (debounced), a draggable splitter, a hide-editor toggle, a share-link box, *Download*, and the GitHub fork ribbon. Keep `LICENSE-graphvizonline`.

## Repository layout

```
.github/workflows/deploy.yml     # copied from ManimOnline unchanged
.github/workflows/test.yml       # unit tests + node --check + Playwright matrix
index.html                       # editor page: layout, CSS, toolbar, glue script
gallery.html                     # sample gallery
service-worker.js                # offline cache (versioned)
offline-assets.js                # list of files to precache (shared by SW and tests)
ace/                             # copied from ManimOnline, trimmed to the files used (ace.js, theme, ext-language_tools)
svg-pan-zoom.min.js              # copied from ManimOnline
vendor/gnuplot/gnuplot.js        # from gnuplot-wasm@0.1.0, unmodified
vendor/gnuplot/gnuplot.wasm      # from gnuplot-wasm@0.1.0, unmodified
vendor/gnuplot/PROVENANCE.md     # package, version, sha512 integrity, gnuplot version, how to update
vendor/gnuplot/LICENSE-gnuplot   # gnuplot's Copyright file
vendor/gnuplot/LICENSE-gnuplot-wasm  # MIT
src/gnuplot-worker.js            # Web Worker: loads engine, runs scripts, manages FS
src/gnuplot-client.js            # main-thread API: run(), cancel(), timeouts, worker restart
src/render-scheduler.js          # copied from ManimOnline (debounce + stale-callback guard)
src/share-links.js               # adapted from ManimOnline (ShareLinks + ShareClient/is.gd)
src/hashbin.js                   # adapted from ManimOnline
src/hashbin-panel.js             # copied from ManimOnline (element IDs unchanged)
src/qr.js                        # encodeQr + qrSvg + dialog wiring, from modl
src/data-files.js                # in-memory data file set: add/rename/remove/limits
src/export.js                    # SVG/PNG/text download
src/examples.js                  # gallery catalog (id, label, tags, source, files)
src/gallery.js, src/gallery.css  # gallery page (pattern from ManimOnline)
src/offline.js                   # SW registration + status (from ManimOnline)
src/mode-gnuplot.js              # Ace syntax highlighting for gnuplot (Ace has none built in)
examples/*.gp, examples/*.dat    # sample sources
gallery/previews/*.svg           # pre-rendered gallery covers (generated, committed)
scripts/render-gallery.mjs       # regenerates previews with the vendored engine in Node
tests/*.test.js                  # node --test unit tests
tests/browser/*.cjs              # Playwright checks
README.md, AGENTS.md, LICENSE-graphvizonline, todo/master_plan.md
```

`index.html` loads plain `<script>` files with `?v=N` cache busters, and modules export via
`module.exports` or `globalThis`, as in ManimOnline. That way the same files run in the browser and
under `node --test` without a bundler. lz-string comes from cdnjs, as in ManimOnline, and is
precached for offline use.

## Engine design

**Worker (`src/gnuplot-worker.js`)**

- `importScripts('../vendor/gnuplot/gnuplot.js')`, then instantiate with `noInitialRun`, `noFSInit`,
  stdin disabled, and print/printErr collected separately.
- Message `{ id, script, files: {name: text}, options: {width, height, background, font, fontscale, terminal} }`:
  1. Clear `/work`, then write `script.gp` and each data file there (names are validated with no
     `/` and no `..`). Set the working directory to `/work`.
  2. Snapshot the heap.
  3. Run `callMain(['-e', setup, 'script.gp'])`. `setup` is
     `set term svg size W,H dynamic enhanced background rgb '…' font '…'; set output 'out.svg'`.
  4. Restore the heap, then read `out.svg`.
  5. Reply `{ id, svg, stdout, stderr, exitCode, ms, terminal }`.
- **Terminal handling.** If the script sets its own terminal, honour it where we can:
  - `dumb`: show the stdout text in a `<pre>`.
  - `svg` with its own `set output`: read whichever file was named.
  - Other terminals (postscript, epslatex, tikz, …): offer the produced file as a download and show
    a note saying that the format has no preview.

  Detect this with a cheap scan for `set term`/`set terminal`/`set output`. Fall back to whatever
  files appear in `/work` after the run.
- Several `plot` commands without `multiplot`: show the last page. If the SVG holds several
  pages, keep only the last one, and note "N plots; showing the last. Use `set multiplot` to combine."
- Interactive commands: `pause`/`pause mouse` are not supported. The worker wraps them by
  defining a no-op through a `-e` prefix where possible. Otherwise the client timeout catches a hang.

**Client (`src/gnuplot-client.js`)**

- A single worker. Each `run()` cancels the previous pending one by ID (latest edit wins).
- A hard timeout (default 5 s; one user-visible "Still running… Cancel" after 1.5 s). On timeout,
  `worker.terminate()` and start a new worker, so infinite loops (`while (1) {}`, `reread`)
  never freeze the page.
- Start-up cost is paid once: load the wasm with `WebAssembly.instantiateStreaming` (the default for
  Emscripten) and show "Loading gnuplot…" until the first run.

**Error display.** Parse `"script.gp" line N: message` (and `"data.csv" line N`). Show the message
under the preview, add an Ace annotation and gutter marker on line N, and keep the last good plot
visible but dimmed, as GraphvizOnline does.

## Editor page (`index.html`)

Toolbar, in order:

- Mobile only: Preview/Code tabs.
- *Size* (width × height presets: 640×480, 800×600, 1000×500, 1200×800, plus custom).
- *Background* (white/transparent).
- *Data files* button with a count badge.
- *Download* (SVG / PNG / text when the terminal is dumb).
- *Share*, the share URL box and *Shorten link*.
- *QR code*.
- *Save to HashBin*, the CID box and *Load from HashBin*.
- *Docs ↗*, *Official demos ↗* and *Sample gallery ↗*.
- The offline status.

The preview pane injects the SVG with `svg-pan-zoom`, and has *Fit*, *1:1*, and zoom buttons on
phones.

Default source on first visit: a small, attractive example that uses a datablock, a function, a
legend and a title, so a first-time visitor sees what gnuplot can do. If there is unsaved work in
`localStorage` (wrapped in try/catch), restore it unless the URL carries source.

## Sharing and URLs

Use the same scheme as ManimOnline, so its habits and code carry over:

| URL form | Meaning |
|---|---|
| `#<url-encoded source>` | Plain source (long form). |
| `?compressed=<lz-string>` | Source compressed with `LZString.compressToEncodedURIComponent`. The default link. |
| `?doc=<lz-string>` | Compressed JSON document (same shape as the HashBin document). Used only when data files or non-default options exist. |
| `#<cid>` | Load from HashBin (`HashBinDocuments.isCID` tells it apart from source). |
| `?example=<id>` | Load a gallery sample. |
| `?w=&h=&bg=` | Preview options when not in `doc`. |

*Shorten link* posts to is.gd through AllOrigins, as `ShareClient` does now, with the same bounded
timeout and error guidance that points to HashBin. Links that is.gd rejects as too long
fall back to the full link.

## HashBin

- `hashbin.js`: keep `HashBinStore` unchanged apart from the transaction-key prefix
  (`gnuplotonline:hashbin:return:`).
- Change `HashBinDocuments.serialize`/`parse` to this document shape:
  ```json
  { "format": "hashbin-diagram", "version": 1, "type": "gnuplot",
    "src": "...", "gnuplot": { "width": 800, "height": 600, "background": "white" },
    "files": { "data.csv": "1,2\n..." } }
  ```
  Plain-text CIDs (a bare script) also load. Unknown `type` values load as plain source. The 5 MiB
  limit covers the source plus files.
- `hashbin-panel.js`: copy it with the same element IDs. Snapshot = `{src, gnuplot, files}`.
- Saving puts `#<cid>` in the address bar. Editing turns it back into a source link (same
  fingerprint logic as ManimOnline).
- **User action:** register the "Gnuplot Online" app at https://hashbin.org/developers with the
  return URL `https://curtcox.github.io/GnuplotOnline/` (trailing slash, no `index.html`). Then
  put the public client ID in `index.html`. Until then, loading works and saving shows "HashBin
  sign-in needs a registered client ID."

## QR code

Copy `encodeQr` from modl with its Nayuki MIT notice, plus `qrSvg` and the `refreshQr` logic.
The dialog shows the code for the current share link: the CID link if one was saved, otherwise the
compressed link. It also offers *Download QR (SVG/PNG)*. It warns about local hosts, dense codes
(version > 20) and URLs that are too long, and suggests HashBin in each case.

## Data files

- The *Data files* dialog lists files with name, size and *Remove*. Files come in through
  *Add file* (input type=file, multiple), drag-and-drop onto the editor, or *New file* (an inline
  textarea editor).
- Limits: text files only (decode as UTF-8 with `fatal: true`), 2 MiB each and 5 MiB total, with
  names matching `^[A-Za-z0-9._-]{1,64}$`.
- Files travel with every render, and with Share (`?doc=`), HashBin and localStorage.
- Gallery samples can include files (for example `examples/temperature.dat`).

## Export

- **SVG**: the rendered SVG as it is (`plot.svg`).
- **PNG**: draw the SVG onto a canvas at 2× scale, then `toBlob` (`plot.png`). SVG fonts fall back to
  browser sans-serif, which is acceptable and documented.
- **Text**: dumb-terminal output (`plot.txt`).
- **Other terminal output**: the file the script wrote, under its own name.
- **Source**: `plot.gp`. When data files exist, v1 offers *Download script with data inlined as
  datablocks*. A single self-contained file is simpler than a zip.

## Gallery

- `src/examples.js` holds a catalog of about 16 samples covering line plots, functions, data from
  a file, histograms, error bars, filled curves, polar, parametric, `splot` surfaces with pm3d, a
  heat map (`with image`), contours, multiplot, a time series, fitting with `fit` (stats printed
  to the output panel), vectors, and labels/arrows.
- Each sample is written for this site. They are not copied from gnuplot's demo directory, which
  is under gnuplot's own licence. The gallery page links to the official demos for more.
- `gallery.html` uses ManimOnline's card grid, search box and tag filter. Covers come from
  `gallery/previews/<id>.svg`, generated by `node scripts/render-gallery.mjs` with the same vendored
  engine. CI checks that previews are up to date with a source fingerprint, as ManimOnline does.
- A card links to `./?example=<id>`.

## Offline / PWA

- Copy ManimOnline's pattern. `offline-assets.js` lists every shipped file (engine, Ace, scripts,
  examples, previews, lz-string CDN URL). The versioned `service-worker.js` precaches them and
  activates only after the whole cache is saved. `src/offline.js` shows "Available offline"
  or *Retry offline setup*.
- Add `manifest.webmanifest` and an icon, so phones can "Add to Home Screen".
- A unit test checks that `offline-assets.js` covers every file referenced by `index.html` and
  `gallery.html`.

## Syntax highlighting

Ace has no gnuplot mode. Write a small `src/mode-gnuplot.js` that highlights comments, strings,
numbers, commands (`plot splot set unset fit do for while if print …`), common `set` options,
`with` styles, datablock bodies (`<< EOD … EOD` in a muted colour), and `$name` variables. Add
autocomplete for keywords through `ext-language_tools`. This is useful, but nothing else depends
on it, so it can come last in its phase.

## Tests

**Unit (`node --test tests/*.test.js`)**

- Engine in Node through the worker logic (factored so the core runs without `Worker`):
  - render succeeds;
  - an error reports the right line number;
  - datablocks and data files work;
  - dumb output arrives;
  - the heap restore lets 50 runs in a row succeed;
  - an infinite loop is cut off by the client timeout (using a fake worker).
- `share-links`: build/parse round trip, `?doc=` with files, and CID detection.
- `hashbin`: serialize/parse round trip, limits, plain-text CIDs, and unknown types. Port
  ManimOnline's mocked OAuth/quote/save tests.
- `qr`: known vectors (text → expected module grid hash), `null` for overlong input, and version
  selection.
- `data-files`: name validation, size limits and UTF-8 rejection.
- `examples`: every sample renders without errors, and every preview fingerprint matches.
- `offline-assets`: coverage, as described above.

**Browser (Playwright, `tests/browser/*.cjs`, served by `python3 -m http.server`)**

- `smoke`: the page loads, the default plot renders, an edit re-renders, an error shows a
  gutter marker, and SVG and PNG downloads work.
- `sharing`: Share → open the link in a new page → the same source renders. Also covers
  `?doc=` with files, QR dialog contents, and a mocked is.gd.
- `hashbin`: mocked HashBin (route interception) for the OAuth return, quote, save and `#cid` load,
  including stale-load protection.
- `gallery`: every card loads and renders in the editor.
- `mobile`: in a 375×812 viewport, check the tabs, the *More* menu, no horizontal scroll, and
  touch-target sizes.
- `offline`: once the SW is installed, take the context offline, reload, and check that a render
  still works.

**CI (`.github/workflows/test.yml`)**: copy ManimOnline's structure. One job runs the unit tests and
`node --check` on every script. A matrix job runs the browser checks on chromium, firefox and webkit.
`deploy.yml` stays independent, as in ManimOnline. Deployment does not wait for tests, so a test
failure blocks nothing. Branch protection could be added later if wanted.

## Phases

1. **Skeleton and deploy.**
   - Add `deploy.yml`, a minimal `index.html` that renders a hard-coded plot through the
     vendored engine in a worker, `vendor/gnuplot/` with provenance and licences, and the README.
   - Push, and confirm the site is live at `https://curtcox.github.io/GnuplotOnline/`.
   - *User action:* repo Settings → Pages → Source = "GitHub Actions". I can do this with
     `gh api` if you approve it.
2. **Editor core.**
   - Ace, live render with `render-scheduler`, the client with timeouts, error markers, the
     splitter, the editor toggle, the size and background options, and the preview with pan/zoom.
   - Downloads (SVG/PNG/text/script), localStorage restore, and Ace mode-gnuplot.
3. **Sharing.** `share-links` (`#`, `?compressed=`, `?doc=`, `?example=`), the share box, is.gd
   shortening, and the QR dialog.
4. **Data files.** The dialog, drag-and-drop, limits, and inclusion in renders, shares and saves.
5. **HashBin.** Port the store and panel, the document format, `#cid` auto-load, OAuth return,
   and the placeholder client ID. Swap in the real ID once you have registered the app.
6. **Mobile layout.** Port the phone CSS and tabs/More, touch pan/zoom, and check on WebKit and
   Chromium mobile viewports.
7. **Gallery and docs links.** Samples, `gallery.html`, the preview generator, and the toolbar
   links.
8. **Offline/PWA.** Asset list, service worker, manifest, status UI.
9. **Tests and CI.** Unit tests are written alongside each phase, and the Playwright suite and
   `test.yml` are finished here. Write `AGENTS.md`, like ManimOnline's but short, for future agent
   sessions.

Each phase is one commit (or a few) on a branch, with a PR into `main`. Merging deploys it.

## Licensing notes

- gnuplot's licence lets anyone distribute binaries built from unmodified source, provided the
  licence and copyright notices come with them and the source is available. `PROVENANCE.md`
  records the upstream source tarball (gnuplot 6.0.2 on SourceForge) and the gnuplot-wasm build
  recipe (`stereobooster/gnuplot-wasm`, `build.sh`). The README credits gnuplot and says this
  site is not affiliated with the gnuplot project.
- The QR encoder is MIT (Project Nayuki); keep its notice in `src/qr.js`.
- GraphvizOnline lineage: keep `LICENSE-graphvizonline` and the credit, as ManimOnline does.

## Risks and open items

- **Engine provenance.** gnuplot-wasm 0.1.0 is an experiment, and its author's TODO list
  includes "test in browser". If it fails in a real browser (for example, WebKit memory limits
  with the heap snapshot), the fallback is to build gnuplot 6.0.x ourselves with the same
  `build.sh` in Docker, once, and commit the output. That would still not be a CI build.
- **Fonts.** SVG text uses the viewer's fonts, so plots look slightly different across devices.
  Enhanced-text features such as sub/superscripts work in SVG.
- **No `canvas` interactivity in v1.** The engine includes the `canvas` terminal (with mouse
  tracking through `gnuplot_mouse.js`). It is a possible v2 option for rotating `splot` surfaces
  with the mouse.
- **`fit` and `print` output** goes to an output panel under the preview, so it needs a place in
  the UI on phones too: put it inside the Preview tab, collapsed by default.
- **Name casing.** The GitHub repo is `GnuplotOnline`, while the local folder and README say
  `GnuPlotOnline`. The site name is set to "Gnuplot Online" (gnuplot's own spelling), and URLs
  use the repo's casing.

## Implementation status — 2026-10-24

- [x] Vendored WASM, shared runner, worker/client and GitHub Pages workflow.
- [x] Ace mode/autocomplete, live rendering, line diagnostics, splitter, preview controls and exports.
- [x] Source/document links, shortener, QR display and SVG/PNG downloads.
- [x] UTF-8 data upload/drop/edit/rename/remove, validation, local persistence and document sharing.
- [x] HashBin document/store/panel, verified CID loading, HashBin Publish saves (OAuth replaced 2026-10-28) and stale-load guards.
- [x] Phone tabs/More layout, touch pan/pinch, custom sizing and touch controls.
- [x] Sixteen original samples, searchable/tagged gallery, generated covers and fingerprint checks.
- [x] Atomic offline precache, update/retry status, manifest and install icons.
- [x] Node tests, cross-browser Playwright suite, CI, README and AGENTS.md.
- [x] User: register the HashBin application and replace the empty public client ID (completed 2026-10-25).

The user requested direct commits/pushes on `main`, superseding the branch/PR phase
workflow above. Pages was already configured with `build_type: workflow`.

Implementation findings: the npm loader is ES module output, so the worker dynamically
imports it rather than using importScripts on that file. PostScript support files were
missing from npm and have been vendored separately with provenance. Some low-residual
fits expose the upstream build's `Igamma` diagnostic; the limitation is documented and
the original fitting sample is verified against this engine. The unmodified engine
binaries remain from the exact pinned npm tarball.

HashBin registration completed on 2026-10-25. Public client ID:
`app_69800851-cef2-4274-9c7b-b1e908965181`. The editor meta tag and offline cache
now include the registered configuration.

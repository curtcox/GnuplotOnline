# Vendored gnuplot

- Package: `gnuplot-wasm@0.1.0`, author stereobooster; package metadata declares MIT.
- Registry tarball: https://registry.npmjs.org/gnuplot-wasm/-/gnuplot-wasm-0.1.0.tgz
- Tarball integrity: `sha512-1Ud4tea/J9qQa1Mt7JzSa59v7gPYRP1jLVzgFCpyG44V+wVYOUL2rDt/IqU8OCNlW+Y41KIcdoJGqLptXixyZg==`
- `gnuplot.js` and `gnuplot.wasm` are copied byte for byte from `package/src/`.
- Runtime: gnuplot 6.0 patchlevel 2. No cairo/gd terminals are compiled in.
- Upstream source: https://sourceforge.net/projects/gnuplot/files/gnuplot/6.0.2/gnuplot-6.0.2.tar.gz/download
- Build recipe: https://github.com/stereobooster/gnuplot-wasm/blob/main/build.sh
- gnuplot copyright notice: `LICENSE-gnuplot` (upstream `Copyright`).
- The npm distribution contains no MIT notice file; `LICENSE-gnuplot-wasm` supplies the standard MIT terms with the package author's attribution.

To update: download an explicitly versioned npm tarball, verify its registry integrity,
copy the two files without editing, update this record, and run all engine/browser tests
and `node scripts/render-gallery.mjs`. Keep `package.json` here so Node recognizes the
upstream ES module. Our worker dynamically imports it; `importScripts` cannot load ES modules.

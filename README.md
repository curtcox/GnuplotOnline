# Gnuplot Online

A static, browser-based gnuplot editor. The gnuplot 6.0.2 WebAssembly engine runs in a
worker, with no plotting server or build step.

Open https://curtcox.github.io/GnuplotOnline/ or serve this checkout:

```sh
python3 -m http.server 8000
```

Test the engine with `node --test tests/*.test.js` (Node 22 or later).
GitHub Pages deploys the repository root on every push to `main`.

The engine is vendored from `gnuplot-wasm@0.1.0`; see
[vendor/gnuplot/PROVENANCE.md](vendor/gnuplot/PROVENANCE.md) for source, integrity and licensing.
This site is not affiliated with the gnuplot project. Editor lineage: GraphvizOnline
and ManimOnline (see `LICENSE-graphvizonline`).

/* The core and SDK prelude run first. Runtime bytes come through the verified parent cache. */
const runtime = new URL('../vendor/gnuplot/', hashbinSandbox.base).href;
const ready = Promise.all([
  hashbinSandbox.import(runtime + 'gnuplot.js'),
  fetch(runtime + 'gnuplot.wasm').then(async response => {
    if (!response.ok) throw new Error('Could not load the plotting engine.');
    return new Uint8Array(await response.arrayBuffer());
  }),
  Promise.all(GnuplotCore.SUPPORT_FILES.map(async name => {
    const response = await fetch(runtime + 'PostScript/' + name);
    if (!response.ok) throw new Error('Could not load gnuplot support file: ' + name);
    return [name, new Uint8Array(await response.arrayBuffer())];
  }))
]).then(([{ default: factory }, wasmBinary, files]) => GnuplotCore.create(factory, { wasmBinary, locateFile: file => runtime + file }, Object.fromEntries(files)));
// Loading can fail before the first run message arrives; report it through the run's error path.
ready.catch(() => {});
self.onmessage = async ({ data: { id, script, files, options } }) => {
  try { self.postMessage({ id, ...(await ready).run(script, files, options) }); }
  catch (error) { self.postMessage({ id, error: error.message }); }
};

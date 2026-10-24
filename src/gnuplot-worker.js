/* The upstream loader is ES module output; dynamic import keeps its bytes unmodified. */
importScripts('gnuplot-core.js');
const ready = Promise.all([
  import('../vendor/gnuplot/gnuplot.js'),
  Promise.all(GnuplotCore.SUPPORT_FILES.map(async name => {
    const response = await fetch('../vendor/gnuplot/PostScript/' + name);
    if (!response.ok) throw new Error('Could not load gnuplot support file: ' + name);
    return [name, new Uint8Array(await response.arrayBuffer())];
  }))
]).then(([{ default: factory }, files]) => GnuplotCore.create(factory, {}, Object.fromEntries(files)));
self.onmessage = async ({ data: { id, script, files, options } }) => {
  try { self.postMessage({ id, ...(await ready).run(script, files, options) }); }
  catch (error) { self.postMessage({ id, error: error.message }); }
};

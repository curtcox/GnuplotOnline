/* The upstream loader is ES module output; dynamic import keeps its bytes unmodified. */
importScripts('gnuplot-core.js');
const ready = import('../vendor/gnuplot/gnuplot.js').then(({ default: factory }) => GnuplotCore.create(factory));
self.onmessage = async ({ data: { id, script, files, options } }) => {
  try { self.postMessage({ id, ...(await ready).run(script, files, options) }); }
  catch (error) { self.postMessage({ id, error: error.message }); }
};

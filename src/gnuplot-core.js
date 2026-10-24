/** Shared runner, exercised in Node and inside the dedicated browser worker. */
const GnuplotCore = (() => {
  const SUPPORT_FILES = ['prologue.ps','utf-8.ps','8859-1.ps','8859-15.ps','8859-2.ps','8859-9.ps','cp1250.ps','cp1251.ps','cp1252.ps','cp437.ps','cp850.ps','cp852.ps','koi8r.ps','koi8u.ps','aglfn.txt'];
  const validName = name => /^[A-Za-z0-9._-]{1,64}$/.test(name) && !name.includes('..') && !['script.gp', 'out.svg', '.', '..'].includes(name);
  const quote = value => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/[\r\n]/g, ' ');
  function options(input = {}) {
    const dimension = (n, fallback) => Number.isFinite(+n) ? Math.max(100, Math.min(4096, Math.round(+n))) : fallback;
    return { width: dimension(input.width, 800), height: dimension(input.height, 600),
      background: input.background === 'transparent' ? 'transparent' : 'white',
      font: String(input.font || 'sans,12'), fontscale: Math.max(.1, Math.min(5, Number(input.fontscale) || 1)) };
  }
  function errors(stderr) {
    const result = [];
    const regex = /["']([^"'\n]+)["'] line (\d+):\s*([^\n]*)/g;
    for (const match of stderr.matchAll(regex)) result.push({ file: match[1], line: +match[2], message: match[3] });
    return result;
  }
  async function create(factory, config = {}, supportFiles = null) {
    if (supportFiles === null && typeof module !== 'undefined') {
      const fs = await import('node:fs/promises');
      supportFiles = Object.fromEntries(await Promise.all(SUPPORT_FILES.map(async name => [name, await fs.readFile(__dirname + '/../vendor/gnuplot/PostScript/' + name)])));
    }
    let stdout = [], stderr = [];
    const engine = await factory({ noInitialRun: true, noFSInit: true,
      print: text => stdout.push(text), printErr: text => stderr.push(text), ...config });
    const FS = engine.FS;
    FS.init(() => null, null, null);
    FS.mkdir('/runtime'); FS.mkdir('/runtime/PostScript');
    for (const [name, bytes] of Object.entries(supportFiles || {})) FS.writeFile('/runtime/PostScript/' + name, bytes);
    FS.mkdir('/work');
    FS.chdir('/work');
    function clear(path) {
      for (const name of FS.readdir(path)) {
        if (name === '.' || name === '..') continue;
        const file = path + '/' + name;
        if (FS.isDir(FS.stat(file).mode)) { clear(file); FS.rmdir(file); } else FS.unlink(file);
      }
    }
    function run(script, files = {}, input = {}) {
      const start = performance.now();
      const settings = options(input);
      clear('/work');
      for (const [name, text] of Object.entries(files)) {
        if (!validName(name) || typeof text !== 'string') throw new Error('Invalid data file: ' + name);
        FS.writeFile(name, text);
      }
      FS.writeFile('script.gp', script);
      stdout = []; stderr = [];
      const snapshot = Uint8Array.from(engine.HEAPU8);
      const bg = settings.background === 'transparent' ? '' : " background rgb 'white'";
      const setup = `set loadpath '/runtime/PostScript'; set term svg size ${settings.width},${settings.height} dynamic enhanced${bg} font '${quote(settings.font)}' fontscale ${settings.fontscale}; set output 'out.svg'`;
      let exitCode = 0;
      try { exitCode = engine.callMain(['-e', setup, 'script.gp']); }
      catch (error) { if (typeof error.status === 'number') exitCode = error.status; else throw error; }
      finally { engine.HEAPU8.set(snapshot); }
      const outputs = [];
      for (const name of FS.readdir('/work')) {
        if (name === '.' || name === '..' || name === 'script.gp' || Object.hasOwn(files, name) || FS.isDir(FS.stat(name).mode)) continue;
        const bytes = FS.readFile(name);
        if (bytes.length) outputs.push({ name, bytes });
      }
      // The terminal may write many SVG documents to one file. Display only the last page.
      let svg = '', pages = 0;
      for (const output of outputs) {
        const text = new TextDecoder().decode(output.bytes);
        const documents = text.match(/<svg\b[\s\S]*?<\/svg>/g);
        if (documents) { svg = documents.at(-1); pages = documents.length; }
      }
      const termMatches = [...script.matchAll(/(?:^|[;\n])\s*set\s+term(?:inal)?\s+([a-z0-9]+)/gi)];
      const terminal = termMatches.at(-1)?.[1]?.toLowerCase() || 'svg';
      if (terminal !== 'svg') svg = '';
      if (terminal === 'dumb' && !stdout.length) {
        const text = outputs.find(output => output.name === 'out.svg') || outputs[0];
        if (text) stdout.push(new TextDecoder().decode(text.bytes));
      }
      return { svg, stdout: stdout.join('\n'), stderr: stderr.join('\n'), exitCode,
        terminal, outputs, pages, errors: errors(stderr.join('\n')), ms: performance.now() - start };
    }
    return { run };
  }
  return { create, options, errors, validName, SUPPORT_FILES };
})();
if (typeof module !== 'undefined') module.exports = GnuplotCore;
else globalThis.GnuplotCore = GnuplotCore;

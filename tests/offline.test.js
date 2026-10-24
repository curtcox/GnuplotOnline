const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const assets = require('../offline-assets.js').assets;
test('offline manifest covers HTML resources, worker dependencies and gallery files', () => {
  for (const html of ['index.html', 'gallery.html']) {
    const source = fs.readFileSync(html, 'utf8');
    for (const match of source.matchAll(/(?:src|href)="([^"<>]+)"/g)) {
      const url = match[1].split('?')[0];
      if (url === './' || /^https?:/.test(url)) continue;
      assert.ok(assets.includes(url), `${html}: ${url}`);
    }
  }
  for (const name of ['src/gnuplot-worker.js','src/gnuplot-core.js','vendor/gnuplot/gnuplot.js','vendor/gnuplot/gnuplot.wasm','vendor/lz-string.min.js']) assert.ok(assets.includes(name), name);
  for (const folder of ['examples','gallery/previews']) for (const file of fs.readdirSync(folder)) assert.ok(assets.includes(folder + '/' + file), file);
  for (const asset of assets.filter(x => !x.startsWith('https:'))) assert.ok(fs.existsSync(asset), asset);
});

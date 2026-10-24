const { test } = require('node:test');
const assert = require('node:assert/strict');
const DataFiles = require('../src/data-files.js');
const PlotExport = require('../src/export.js');
const { HashBinDocuments: D, HashBinStore } = require('../src/hashbin.js');
const { ShareLinks, ShareClient } = require('../src/share-links.js');
const LZ = require('../vendor/lz-string.min.js');
const { encodeQr, qrNotes } = require('../src/qr.js');
const { createHash } = require('node:crypto');
const doc = { src: "plot 'data.dat' using 1:2", files: { 'data.dat': '1 2\n2 4' }, gnuplot: { width: 640, height: 480, background: 'transparent' } };
test('documents preserve source, files, settings and plain or unknown payloads', () => {
  const parsed = D.parse(D.serialize(doc));
  assert.equal(parsed.src, doc.src); assert.deepEqual(parsed.files, doc.files); assert.equal(parsed.gnuplot.width, 640);
  assert.equal(D.parse('plot x').src, 'plot x');
  const unknown = JSON.stringify({ format: 'hashbin-diagram', version: 1, type: 'other', src: 'plot x' });
  assert.equal(D.parse(unknown).src, unknown);
  assert.throws(() => D.serialize({ src: 'x'.repeat(D.MAX_BYTES), files: {} }), /limit/);
  assert.throws(() => D.parse(JSON.stringify({ ...JSON.parse(D.serialize(doc)), version: 9 })), /version/);
});
test('share links round trip all URL forms and recognize inline CIDs', () => {
  for (const input of [doc, { src: 'plot sin(x)\n# café ☀', files: {}, gnuplot: {} }]) {
    const link = ShareLinks.build({ url: 'https://example.org/GnuplotOnline/?example=x#stale', ...input, compress: LZ.compressToEncodedURIComponent });
    const parsed = ShareLinks.parse(link.fallback, LZ.decompressFromEncodedURIComponent);
    assert.equal(parsed.src, input.src); assert.deepEqual(parsed.files, input.files);
    assert.equal(ShareLinks.parse(link.long, LZ.decompressFromEncodedURIComponent).src, input.src);
  }
  assert.equal(ShareLinks.parse('https://x/#plot%20x').src, 'plot x');
  assert.equal(ShareLinks.parse('https://x/?example=wave').id, 'wave');
  const cid = 'AAAAAAAG' + Buffer.from('plot x').toString('base64url');
  assert.equal(D.isCID(cid), true); assert.equal(ShareLinks.parse('https://x/#' + cid).cid, cid);
  assert.equal(D.isCID('plotx'), false);
  assert.equal(new URL(D.link('https://x/?doc=stale&w=4&code=bad#x', cid)).search, '');
});
test('data file validation, rename, UTF-8 rejection and transactional limits', async () => {
  const files = new DataFiles(); files.add('a.dat', '1 2'); files.rename('a.dat', 'b.dat');
  assert.equal(files.files['b.dat'], '1 2');
  for (const name of ['../x', 'a..b', 'a/b', 'script.gp', '__proto__', '']) assert.throws(() => files.add(name, 'x'));
  assert.throws(() => files.add('huge', 'x'.repeat(DataFiles.MAX_FILE + 1)), /2 MiB/);
  assert.throws(() => DataFiles.validate({ a: 'x'.repeat(DataFiles.MAX_FILE), b: 'x'.repeat(DataFiles.MAX_FILE), c: 'x'.repeat(DataFiles.MAX_FILE) }), /5 MiB/);
  await assert.rejects(files.upload({ name: 'bad', size: 2, arrayBuffer: async () => new Uint8Array([0xc3, 0x28]).buffer }), /UTF-8/);
  assert.equal(Object.keys(files.files).length, 1);
});
test('standalone exports inline exact filenames with safe datablock delimiters', () => {
  const result = PlotExport.inlineData(doc.src, doc.files);
  assert.match(result, /\$GPO_DATA_0 << GPO_END_1/); assert.match(result, /plot \$GPO_DATA_0 using 1:2/);
  assert.match(result, /1 2\n2 4/);
});
test('QR encoder known module grids, smallest versions and excessive input', () => {
  const qr = encodeQr('hello'); assert.equal(qr.version, 1);
  const hash = createHash('sha256').update(qr.modules.map(row => row.map(Number).join('')).join('\n')).digest('hex');
  assert.equal(hash, '69eec149521d0daf8dd3263acf22740ee26b4a844714a559cabedbf5de3f1bad');
  assert.ok(encodeQr('x'.repeat(500)).version > 1);
  assert.equal(encodeQr('x'.repeat(4000)), null);
  assert.match(qrNotes('http://localhost/', qr), /computer/);
  assert.match(qrNotes('https://example.org/', { version: 21 }), /dense/);
});
test('shortener falls back safely and accepts only real is.gd URLs', async () => {
  const links = { long: 'https://example.org/#plot', fallback: 'https://example.org/?compressed=x' };
  const ok = new ShareClient({ fetchLink: async () => ({ ok: true, json: async () => ({ contents: 'https://is.gd/abc' }) }) });
  assert.equal((await ok.shorten(links)).shortened, true);
  const bad = new ShareClient({ fetchLink: async () => ({ ok: true, json: async () => ({ contents: 'https://evil.example/abc' }) }) });
  assert.equal((await bad.shorten(links)).url, links.fallback);
  const timeout = new ShareClient({ timeout: 5, fetchLink: () => new Promise(() => {}) });
  assert.match((await timeout.shorten(links)).error.message, /within/);
});
test('HashBin local CIDs load offline and placeholder configuration explains setup', async () => {
  const store = new HashBinStore();
  const cid = 'AAAAAAAG' + Buffer.from('plot x').toString('base64url');
  assert.equal((await store.load(cid)).src, 'plot x');
  await assert.rejects(store.init(), /registered client ID/);
});

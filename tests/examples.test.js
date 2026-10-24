const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const examples = require('../src/examples.js');
const core = require('../src/gnuplot-core.js');
test('all original samples render and their committed covers match the source fingerprint', async () => {
  const runner = await core.create((await import('../vendor/gnuplot/gnuplot.js')).default);
  assert.equal(examples.catalog.length, 16);
  for (const sample of examples.catalog) {
    const rendered = runner.run(sample.source, sample.files, { width: 640, height: 480 });
    assert.equal(rendered.exitCode, 0, sample.id + ': ' + rendered.stderr); assert.match(rendered.svg, /<svg/);
    const hash = createHash('sha256').update(JSON.stringify({ source: sample.source, files: sample.files, engine: 'gnuplot-wasm@0.1.0', width: 640, height: 480 })).digest('hex');
    const preview = fs.readFileSync(`gallery/previews/${sample.id}.svg`, 'utf8');
    assert.ok(preview.startsWith(`<!-- source-sha256: ${hash} -->`), sample.id);
    assert.equal(fs.readFileSync(`examples/${sample.id}.gp`, 'utf8'), sample.source + '\n');
    for (const [name, text] of Object.entries(sample.files)) assert.equal(fs.readFileSync(`examples/${name}`, 'utf8'), text);
  }
});

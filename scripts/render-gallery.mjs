import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import factory from '../vendor/gnuplot/gnuplot.js';
const require = createRequire(import.meta.url);
const core = require('../src/gnuplot-core.js'), examples = require('../src/examples.js');
export function fingerprint(sample) {
  return createHash('sha256').update(JSON.stringify({ source: sample.source, files: sample.files, engine: 'gnuplot-wasm@0.1.0', width: 640, height: 480 })).digest('hex');
}
const runner = await core.create(factory);
for (const sample of examples.catalog) {
  const result = runner.run(sample.source, sample.files, { width: 640, height: 480 });
  if (result.exitCode || result.errors.length || !result.svg) throw new Error(`${sample.id}: ${result.stderr}`);
  const svg = `<!-- source-sha256: ${fingerprint(sample)} -->\n${result.svg}\n`;
  const target = new URL(`../gallery/previews/${sample.id}.svg`, import.meta.url);
  if (process.argv.includes('--check')) {
    if (await fs.readFile(target, 'utf8') !== svg) throw new Error(`Stale gallery preview: ${sample.id}. Run npm run previews.`);
  } else await fs.writeFile(target, svg);
  console.log(`${sample.id}: ${Math.round(result.ms)} ms`);
}

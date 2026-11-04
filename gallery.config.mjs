import { createRequire } from 'node:module';
import { urlState } from './src/fragment-config.mjs';
const examples = createRequire(import.meta.url)('./src/examples.js');
export default {
  catalog: examples.catalog.map(sample => ({ id: sample.id, title: sample.label, tags: sample.tags,
    description: sample.description, document: {src: sample.source, files: sample.files, gnuplot:{width:640,height:480}} })),
  output: 'gallery/previews',
  dependencies: ['index.html','fragment-kit.config.json','src/gnuplot-sandbox.js','src/app.js','src/app.css','src/fragment-config.mjs','src/examples.js','src/gnuplot-core.js','vendor/gnuplot/gnuplot.js','vendor/gnuplot/gnuplot.wasm','vendor/fragment-kit-v0.3.3/src/core/url-state.js','vendor/fragment-kit-v0.3.3/vendor/hashbin-sdk-v0.4.0.mjs'],
  async renderCover(page, example) {
    await page.goto(urlState.build(example.document, {url:process.env.GALLERY_BASE_URL ?? 'http://127.0.0.1:8000/'}).href);
    await page.waitForFunction(() => /^Rendered in/.test(document.getElementById('status').textContent));
    await page.locator('#preview svg').waitFor();
    return page.locator('#preview');
  }
};

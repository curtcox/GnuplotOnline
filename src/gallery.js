import { mountGallery } from '../vendor/fragment-kit-v0.3.3/src/index.js';
import { urlState } from './fragment-config.mjs';
const gallery = mountGallery({ container: document.getElementById('gallery'), catalog: GnuplotExamples.catalog.map(sample => ({
  id: sample.id, title: sample.label, tags: sample.tags, description: sample.description,
  document: { src: sample.source, files: sample.files || {} }, cover: 'gallery/previews/' + sample.id + '.png'
})), urlState: { build: doc => urlState.build(doc, { url: new URL('./', location.href).href }) } });
document.querySelector('.fk-gallery-filters input').id = 'search';
document.querySelector('.fk-gallery-filters select').id = 'tag';

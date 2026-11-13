import {mountGalleryAi,aiCallback} from './ai-client.js';
import {config,type} from './fragment-config.mjs';
if(aiCallback()) await new Promise(()=>{});
function mountGallery(options){const gallery=mountOriginalGallery(options);queueMicrotask(()=>void mountGalleryAi({config,type,...options}).catch(error=>{const p=document.createElement('p');p.setAttribute('role','status');p.textContent=error.message;options.container.before(p);}));return gallery;}
import { mountGallery as mountOriginalGallery } from '../vendor/fragment-kit-v0.4.3/src/index.js';
import { urlState } from './fragment-config.mjs';
const gallery = mountGallery({ container: document.getElementById('gallery'), catalog: GnuplotExamples.catalog.map(sample => ({
  id: sample.id, title: sample.label, tags: sample.tags, description: sample.description,
  document: { src: sample.source, files: sample.files || {} }, cover: 'gallery/previews/' + sample.id + '.png'
})), urlState: { build: doc => urlState.build(doc, { url: new URL('./', location.href).href }) } });
document.querySelector('.fk-gallery-filters input').id = 'search';
document.querySelector('.fk-gallery-filters select').id = 'tag';

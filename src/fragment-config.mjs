import * as Core from './gnuplot-core.js';
import * as Files from './data-files.js';
import { createConfig, createUrlState, HashBinStore as Store, createStorage, compress, decompress } from '../vendor/fragment-kit-v0.3.5/src/index.js';
const GnuplotCore = Core.default ?? globalThis.GnuplotCore;
const DataFiles = Files.default ?? globalThis.DataFiles;
import appConfig from '../fragment-kit.config.json' with { type: 'json' };
export const config = createConfig(appConfig);
export const type = { type: 'gnuplot', settingsKeys: ['w', 'h', 'bg'], fileName: 'plot.json', contentType: 'application/json',
  normalize(value) {
    if (typeof value?.src !== 'string') throw new Error('Source must be text.');
    const files = value.files ?? {}; DataFiles.validate(files, value.src);
    const options = value.gnuplot ?? { width: value.w, height: value.h, background: value.bg };
    const { width, height, background } = GnuplotCore.options(options);
    return { src: value.src, gnuplot: { width, height, background }, files: { ...files } };
  },
  isDefault(doc) { return !Object.keys(doc.files).length && doc.gnuplot.width === 800 && doc.gnuplot.height === 600 && doc.gnuplot.background === 'white'; }
};
// Keep the existing writer until all ten apps have shipped the v1 reader.
export function legacyWriter(doc, { url, run, view, compress, documents }) {
  const plain = type.isDefault(doc);
  url.searchParams.set(plain ? 'compressed' : 'doc', compress(plain ? doc.src : documents.serialize(doc)));
  if (run === false) url.searchParams.set('run', '0');
  if (view) url.searchParams.set('view', view);
  return url.href;
}
export const urlState = createUrlState({ config, type, legacyWriter, legacyReaders: [(url, { documents, decompress, settings }) => {
  const hash = url.hash.slice(1);
  if (hash.startsWith('src=')) return { src: decompress(hash.slice(4)), ...settings };
  if (!hash && url.searchParams.has('compressed') && !url.searchParams.has('doc')) return { src: decompress(url.searchParams.get('compressed')), ...settings };
  if (hash && !hash.startsWith('h1=')) {
    let text; try { text = decodeURIComponent(hash); } catch { throw new Error('Invalid source fragment encoding.'); }
    const doc = documents.parse(text);
    return Object.keys(settings).length ? { ...doc, gnuplot: { width: settings.w ?? doc.gnuplot.width, height: settings.h ?? doc.gnuplot.height, background: settings.bg ?? doc.gnuplot.background } } : doc;
  }
  return null;
}] });
export const HashBinDocuments = { ...urlState.documents, MAX_BYTES: config.maxBytes, link: urlState.link };
// Node tests and existing URL fixtures use the same production adapter.
export function publishTransactions(storage,clientId=config.hashbinClientId){
 if(!storage)return undefined;
 const current=createStorage({prefix:config.storagePrefix,storage}),owned=key=>key.startsWith('hashbin:publish:'+clientId+':');
 return {getItem(key){const value=current.getItem(key);if(value!=null||!owned(key))return value;try{return storage.getItem(key);}catch{return null;}},setItem:(key,value)=>current.setItem(key,value),removeItem(key){current.removeItem(key);if(owned(key))try{storage.removeItem(key);}catch{}}};
}
export class HashBinStore extends Store { constructor(options = {}) { let storage;try{storage=globalThis.sessionStorage;}catch{}super({ config, type,transactionStorage:publishTransactions(storage,options.clientId??config.hashbinClientId), ...options }); } }
export { compress, decompress };

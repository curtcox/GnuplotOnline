import { renderGallery } from '../vendor/fragment-kit-v0.3.1/tools/render-gallery.mjs';
await renderGallery('gallery.config.mjs', process.argv.includes('--check'));

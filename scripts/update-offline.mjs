import { generateOffline } from '../vendor/fragment-kit-v0.3.1/tools/offline-assets.mjs';
console.log((await generateOffline('offline.config.json', process.argv.includes('--check'))).version);

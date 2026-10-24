import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
for (const dir of ['src','scripts','tests','tests/browser']) for (const file of await fs.readdir(dir)) {
  if (!/\.(js|cjs|mjs)$/.test(file)) continue;
  const result = spawnSync(process.execPath,['--check',dir+'/'+file],{stdio:'inherit'}); if(result.status) process.exit(result.status);
}
for (const file of ['offline-assets.js','service-worker.js']) { const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(result.status)process.exit(result.status); }
const result=spawnSync(process.execPath,['scripts/update-offline.mjs','--check'],{stdio:'inherit'});process.exit(result.status);

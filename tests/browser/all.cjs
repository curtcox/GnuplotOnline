/* End-to-end checks against an actual static server and the vendored WASM. */
const { chromium, firefox, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const base = process.argv[2] || 'http://127.0.0.1:8000/';
const name = process.argv[3] || 'chromium';
const { HashBinDocuments: Docs } = require('../../src/hashbin.js');
const examples = require('../../src/examples.js');
fs.mkdirSync('test-results', { recursive: true });
let browser;
const errors = [];
async function context(options = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true, ...options });
  await context.route('https://cdnjs.cloudflare.com/**', route => route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync('vendor/lz-string.min.js','utf8') }));
  // Content-Security-Policy violations count as page errors: the policy must not block the app itself.
  await context.exposeBinding('__cspViolation', (_, text) => errors.push('CSP: ' + text));
  await context.addInitScript(() => addEventListener('securitypolicyviolation', event => globalThis.__cspViolation?.(`${event.violatedDirective} ${event.blockedURI} ${location.pathname}`)));
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  return { context, page };
}
async function rendered(page) {
  await page.waitForFunction(() => /^Rendered in/.test(document.getElementById('status').textContent), null, { timeout: 20000 });
  await page.waitForSelector('#preview svg');
}
async function edit(page, source) {
  await page.evaluate(source => editor.setValue(source, -1), source);
  await page.waitForFunction(() => /^Rendered in/.test(document.getElementById('status').textContent), null, { timeout: 20000 });
}
const isCIDHash = hash => Docs.isCID(hash.slice(1));
function cidFor(text) {
  const n = Buffer.byteLength(text), prefix = Buffer.alloc(6); prefix.writeUIntBE(n, 0, 6);
  return prefix.toString('base64url') + (n <= 64 ? Buffer.from(text) : Buffer.alloc(64, 7)).toString('base64url');
}
async function run(label, task) { const start = Date.now(); await task(); console.log(`${name}: ${label} (${Date.now()-start} ms)`); }
(async () => {
  browser = await ({ chromium, firefox, webkit }[name]).launch({ headless: true });
  await run('actual plotting sandbox has an opaque origin and cannot read editor storage', async () => {
    const { context: c, page: p } = await context();
    await p.goto(base); await rendered(p);
    assert.equal(await p.locator('iframe[title="Code sandbox"]').getAttribute('sandbox'), 'allow-scripts');
    const result = await p.evaluate(async () => {
      const cache = await caches.open('gnuplot-isolation-probe');
      await cache.put('/private-sentinel', new Response('editor-only'));
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('gnuplot-isolation-probe', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('secrets').put('editor-only', 'key');
        request.onsuccess = () => { request.result.close(); resolve(); };
        request.onerror = () => reject(request.error);
      });
      const probe = `
        (async () => {
          let cacheReadable = false, databaseReadable = false;
          try { cacheReadable = await caches.has('gnuplot-isolation-probe'); } catch (_) {}
          try {
            databaseReadable = await new Promise(resolve => {
              const request = indexedDB.open('gnuplot-isolation-probe');
              request.onerror = () => resolve(false);
              request.onsuccess = () => { request.result.close(); resolve(true); };
            });
          } catch (_) {}
          postMessage({ probe: true, origin: self.origin, reported: hashbinSandbox.origin, cacheReadable, databaseReadable });
        })();
`;
      const worker = GnuplotSandbox.factory({ fetchSource: async url => {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Probe runtime load failed');
        return (url.endsWith('gnuplot-worker.js') ? probe : '') + await response.text();
      } })();
      try {
        return await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Isolation probe timed out')), 15000);
          let isolation;
          worker.onerror = event => { clearTimeout(timer); reject(new Error(event.message)); };
          worker.onmessage = ({ data }) => {
            if (data.probe) isolation = data;
            if (data.id === 99) {
              clearTimeout(timer);
              resolve({ isolation, svg: data.svg, error: data.error });
            }
          };
          worker.postMessage({ id: 99, script: 'plot x', files: {}, options: {} });
        });
      } finally {
        worker.terminate();
        await caches.delete('gnuplot-isolation-probe');
        indexedDB.deleteDatabase('gnuplot-isolation-probe');
      }
    });
    assert.deepEqual(result.isolation, { probe: true, origin: 'null', reported: 'null', cacheReadable: false, databaseReadable: false });
    assert.equal(result.error, undefined); assert.match(result.svg, /<svg/);
    assert.equal(await p.locator('iframe[title="Code sandbox"]').count(), 1, 'probe termination removes its frame');
    await c.close();
  });
  await run('smoke, diagnostics, terminals and downloads', async () => {
    const { context: c, page: p } = await context();
    await p.goto(base); await rendered(p);
    assert.match(await p.locator('#preview').innerText(), /A little signal/);
    await edit(p, 'set title "Live edit"\nplot cos(x) lw 3'); assert.match(await p.locator('#preview').innerText(), /Live edit/);
    for (const format of ['svg', 'png', 'source']) {
      await p.selectOption('#export-format', format);
      const pending = p.waitForEvent('download'); await p.click('#download'); const download = await pending;
      assert.equal(download.suggestedFilename(), 'plot.' + (format === 'source' ? 'gp' : format));
      const content = fs.readFileSync(await download.path()); assert.ok(content.length > (format === 'source' ? 10 : 50));
      if (format === 'png') assert.equal(content.subarray(1,4).toString(), 'PNG');
    }
    await p.evaluate(() => editor.setValue('set title "Oops"\ninvalid_command', -1));
    await p.waitForSelector('#error:not([hidden])'); assert.match(await p.locator('#error').innerText(), /line 2/);
    await p.waitForSelector('.ace_gutter-cell.plot-error'); assert.ok(await p.locator('#preview.stale svg').count());
    await edit(p, 'set term dumb\nplot x'); await p.waitForSelector('#preview pre'); assert.match(await p.locator('#preview pre').innerText(), /\+/);
    await p.selectOption('#export-format','text'); const download = p.waitForEvent('download'); await p.click('#download'); assert.equal((await download).suggestedFilename(),'plot.txt');
    await edit(p, "set term postscript\nset output 'figure.ps'\nplot x"); assert.match(await p.locator('#note').innerText(), /postscript/);
    await p.selectOption('#export-format','other'); const other=p.waitForEvent('download'); await p.click('#download'); assert.equal((await other).suggestedFilename(),'figure.ps');
    await edit(p, "set output 'custom.svg'\nplot sin(x)\nplot cos(x)"); assert.match(await p.locator('#note').innerText(), /2 plots/);
    await p.evaluate(() => editor.setValue('while (1) {}', -1)); await p.waitForSelector('#cancel:not([hidden])'); await p.click('#cancel');
    await edit(p,'plot x'); await p.waitForSelector('#preview svg');
    await c.close();
  });
  await run('sharing, files, QR and shortener', async () => {
    const { context: c, page: p } = await context(); await p.goto(base); await rendered(p);
    await edit(p,'set title "Shared wave"\nplot sin(x)'); await p.click('#share');
    let link=await p.inputValue('#share-url'); assert.ok(new URL(link).searchParams.has('compressed'));
    const p2=await c.newPage(); p2.on('dialog',dialog=>dialog.accept()); await p2.goto(link); await rendered(p2); assert.match(await p2.locator('#preview').innerText(), /Shared wave/);
    await p.click('#data-open'); await p.click('#file-new'); await p.fill('#file-name','observations.dat'); await p.fill('#file-text','1 2\n2 5\n3 4'); await p.click('#file-save');
    await p.click('[data-close="data-dialog"]'); await edit(p,"plot 'observations.dat' using 1:2 with lines"); await p.click('#share');
    link=await p.inputValue('#share-url'); assert.ok(new URL(link).searchParams.has('doc'));
    await p2.goto(link); await rendered(p2); assert.equal(await p2.locator('#file-count').innerText(),'1');
    await p.click('#qr-open'); await p.waitForSelector('#qr-code svg'); assert.equal(await p.locator('#qr-url').innerText(),link); assert.match(await p.locator('#qr-message').innerText(),/computer/);
    const download=p.waitForEvent('download'); await p.click('#qr-svg'); assert.equal((await download).suggestedFilename(),'plot-qr.svg'); await p.click('[data-close="qr-dialog"]');
    await p.route('https://api.allorigins.win/**', route => route.fulfill({ json: { contents:'https://is.gd/test123' } }));
    await p.click('#shorten'); await p.waitForFunction(()=>document.getElementById('share-url').value==='https://is.gd/test123');
    // Uploaded data and settings survive localStorage restore in the same context.
    await p.goto(base); await rendered(p); assert.equal(await p.locator('#file-count').innerText(),'1');
    await c.close();
  });
  await run('HashBin inline CIDs, stale loads, links that ask first and mocked Publish saves', async () => {
    const { context: c, page: p } = await context();
    const bare='set title "CID plot"\nplot x', inline=cidFor(bare);
    await p.goto(base+'#'+inline); await rendered(p); assert.match(await p.locator('#preview').innerText(),/CID plot/);
    // The policy is live: a script from an unlisted host is refused and reported.
    await p.evaluate(()=>{const script=document.createElement('script');script.src='https://example.invalid/injected.js';document.head.append(script);});
    await new Promise(resolve=>{const wait=()=>errors.some(e=>e.includes('example.invalid'))?resolve():setTimeout(wait,50);wait();});
    errors.splice(0,errors.length,...errors.filter(e=>!e.includes('example.invalid')));
    const registeredClient = /name="hashbin-client-id" content="([^"]+)"/.exec(fs.readFileSync('index.html','utf8'))[1];
    await p.route('https://hashbin.org/sdk/v0.4.0/hashbin.js', route=>route.fulfill({ contentType:'application/javascript', body: `export class HashBinClient {
      constructor(options) { if (options.clientId !== ${JSON.stringify(registeredClient)} || options.redirectUri !== ${JSON.stringify(new URL('./',base).href)}) throw new Error('Incorrect HashBin registration configuration'); }
    }` }));
    await p.click('#hashbin-save'); await p.waitForFunction(()=>document.getElementById('hashbin-confirm').textContent==='Review on HashBin' && !document.getElementById('hashbin-confirm').disabled); assert.match(await p.locator('#hashbin-message').innerText(),/approve the save on hashbin\.org/); await p.click('#hashbin-close');
    const payload=Docs.serialize({ src:'set title "Slow old plot"\nplot x', files:{}, gnuplot:{} }), remote=cidFor(payload);
    let release; const pending=new Promise(resolve=>{release=resolve});
    await p.route('https://256t.us/'+remote,async route=>{await pending; await route.fulfill({body:payload})});
    await p.fill('#hashbin-cid',remote); await p.click('#hashbin-load'); await edit(p,'set title "Newer edit"\nplot cos(x)'); release();
    await p.waitForTimeout(250); assert.match(await p.evaluate(()=>editor.getValue()),/Newer edit/);
    // A link that would replace work kept in this browser asks first.
    await p.waitForTimeout(300); p.once('dialog',dialog=>dialog.dismiss()); await p.goto(base+'?example='+require('../../src/examples.js').catalog[1].id); await rendered(p);
    assert.match(await p.evaluate(()=>editor.getValue()),/Newer edit/); assert.ok(!p.url().includes('example='));
    await c.close();
    const { context: auth, page: a }=await context();
    await auth.route(base+'**',async route=>{
      if (route.request().isNavigationRequest()) { const html=fs.readFileSync('index.html','utf8').replace(/name="hashbin-client-id" content="[^"]*"/,'name="hashbin-client-id" content="test-client"'); await route.fulfill({ contentType:'text/html',body:html }); } else await route.continue();
    });
    // Stands in for the pinned SDK: popup approval, cancellation, a blocked popup's redirect round trip and revocation.
    const sdk=`const encode=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
    async function cid(text){const bytes=new TextEncoder().encode(text),size=new Uint8Array(6);new DataView(size.buffer).setUint32(2,bytes.length);return encode(size)+encode(bytes.length<=64?bytes:new Uint8Array(await crypto.subtle.digest('SHA-512',bytes)));}
    export class HashBinClient {
      constructor(options){this.options=options}
      publish(content,{clientState}){const mode=localStorage.getItem('test:publish')||'approve';return cid(content).then(saved=>{
        if(mode==='cancel')throw new Error('access_denied');
        if(mode==='redirect'){sessionStorage.setItem('test:state',JSON.stringify(clientState));location.href=this.options.redirectUri+'#hashbin_publish=t&cid='+saved;return {redirected:true};}
        return {cid:saved};});}
      async handlePublishCallback({hash}){const clientState=JSON.parse(sessionStorage.getItem('test:state'));return {cid:new URLSearchParams(hash.slice(1)).get('cid'),clientState};}
      async disconnect(){localStorage.removeItem('hashbin:tokens:test-client');localStorage.setItem('test:revoked','yes');}
    }`;
    await auth.route('https://hashbin.org/sdk/v0.4.0/hashbin.js', route=>route.fulfill({contentType:'application/javascript',body:sdk}));
    await auth.addInitScript(()=>{ if (window !== window.top) return; if (!sessionStorage.getItem('test:seeded')) { sessionStorage.setItem('test:seeded','1'); localStorage.setItem('hashbin:tokens:test-client','{"refreshToken":"old"}'); } });
    await a.goto(base); await rendered(a); await a.waitForFunction(()=>localStorage.getItem('test:revoked')==='yes' && !localStorage.getItem('hashbin:tokens:test-client'));
    const save=async()=>{await a.click('#hashbin-save'); await a.waitForFunction(()=>document.getElementById('hashbin-confirm').textContent==='Review on HashBin' && !document.getElementById('hashbin-confirm').disabled);};
    await edit(a,'set title "Popup save"\nplot x'); await a.waitForTimeout(300);
    await save(); await a.click('#hashbin-confirm'); await a.waitForFunction(()=>document.getElementById('hashbin-status').textContent==='Saved to HashBin.'); assert.ok(isCIDHash(new URL(a.url()).hash), a.url()); await a.click('#hashbin-close');
    await a.evaluate(()=>localStorage.setItem('test:publish','cancel')); await edit(a,'set title "Cancelled"\nplot x'); await save(); await a.click('#hashbin-confirm');
    await a.waitForFunction(()=>/cancelled on HashBin/.test(document.getElementById('hashbin-message').textContent)); await a.click('#hashbin-close');
    await a.evaluate(()=>localStorage.setItem('test:publish','redirect')); await edit(a,'set title "Restored source"\nplot x'); await a.waitForTimeout(300); await save();
    await Promise.all([a.waitForURL('**#hashbin_publish=*'),a.click('#hashbin-confirm')]); await rendered(a);
    await a.waitForFunction(()=>document.getElementById('hashbin-status').textContent==='Saved to HashBin.'); assert.match(await a.evaluate(()=>editor.getValue()),/Restored source/); assert.ok(isCIDHash(new URL(a.url()).hash));
    await a.evaluate(()=>localStorage.removeItem('test:publish'));
    await edit(a,'plot x*x'); await a.waitForFunction(()=>!location.hash); assert.ok(new URL(a.url()).searchParams.has('compressed'));
    await auth.close();
  });
  await run('gallery: all sixteen cards render in the editor', async () => {
    const { context: c, page: p }=await context(); await p.goto(new URL('gallery.html',base).href);
    assert.equal(await p.locator('.card').count(),16); await p.fill('#search','surface'); assert.equal(await p.locator('.card').count(),1); await p.fill('#search','');
    await p.selectOption('#tag','data'); assert.ok(await p.locator('.card').count()>3);
    for(const sample of examples.catalog){await p.goto(base+'?example='+sample.id);await rendered(p);assert.equal(await p.evaluate(()=>editor.getValue()),sample.source);assert.equal(await p.locator('#error').isVisible(),false,sample.id)}
    await c.close();
  });
  await run('mobile tabs, More menu, sizing and no horizontal overflow', async () => {
    const { context: c, page: p }=await context({viewport:{width:375,height:812},hasTouch:true,isMobile:name!=='firefox'});
    await p.goto(base);await rendered(p);assert.equal(await p.locator('#editor-pane').isVisible(),false);
    await p.click('#tab-code');assert.equal(await p.locator('#editor-pane').isVisible(),true);assert.equal(await p.locator('#preview-pane').isVisible(),false);
    await edit(p, 'set title "Phone edit"\nplot cos(x)');
    await p.click('#tab-preview');assert.match(await p.locator('#preview').innerText(), /Phone edit/);await p.click('#more');assert.equal(await p.locator('#more').getAttribute('aria-expanded'),'true');assert.equal(await p.locator('#hashbin-save').isVisible(),true);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    for(const selector of ['#tab-code','#tab-preview','#more','#data-open','#download','#qr-open','#fit','#zoom-in']){const box=await p.locator(selector).boundingBox();assert.ok(box.height>=40,selector)}
    await p.screenshot({path:`test-results/${name}-mobile.png`,fullPage:true}); await c.close();
  });
  await run('offline reload and render with the origin stopped', async () => {
    // Real origin failure avoids browser-specific offline-emulation behavior:
    // https://github.com/microsoft/playwright/issues/42775
    const root = path.resolve(__dirname, '../..');
    const server = http.createServer((request, response) => {
      try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
        if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
        const types = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
        response.setHeader('Content-Type', types[path.extname(file)] || 'text/plain'); response.end(fs.readFileSync(file));
      } catch (_) { response.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const offlineBase = `http://127.0.0.1:${server.address().port}/`;
    const {context:c,page:p}=await context({serviceWorkers:'allow'});
    try {
      await p.goto(offlineBase);await rendered(p);
      await p.waitForFunction(()=>document.getElementById('offline-status').textContent==='Available offline',null,{timeout:45000});
      await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
      await p.reload();await rendered(p);
      // A sibling app on the same origin can write this app's Cache Storage; altered entries are never served.
      await p.evaluate(async()=>{const cache=await caches.open((await caches.keys()).find(name=>name.startsWith('gnuplot-')));await cache.put(new URL('src/qr.js',location.href).href,new Response('globalThis.poisonedCache=true;',{headers:{'Content-Type':'text/javascript'}}));});
      await p.reload();await rendered(p);assert.equal(await p.evaluate(()=>globalThis.poisonedCache),undefined);
      await p.waitForFunction(()=>document.getElementById('offline-status').textContent==='Offline setup incomplete',null,{timeout:45000});
      await p.click('#offline-action');await p.waitForFunction(()=>document.getElementById('offline-status').textContent==='Available offline',null,{timeout:45000});
      await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
      await assert.rejects(fetch(offlineBase));
      await p.reload();await rendered(p);
      await edit(p,'set title "Offline works"\nplot cos(x)');assert.match(await p.locator('#preview').innerText(),/Offline works/);
      await p.goto(new URL('gallery.html',offlineBase).href);assert.equal(await p.locator('.card').count(),16);
    } finally { await c.close(); if (server.listening) await new Promise(resolve=>server.close(resolve)); }
  });
  assert.deepEqual(errors,[],'Unexpected page errors');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{await browser?.close()});

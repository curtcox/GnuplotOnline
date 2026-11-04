export default {
  ready: 'body[data-ready="true"]', editor: '#editor', status: '#status', draftKey: 'gnuplotonline:document',
  more: '#more', share: '#share', qr: '#qr-open', tabs: ['Code', 'Preview'], example: 'damped-wave',
  kitURL: './vendor/fragment-kit-v0.3.3/src/index.js', cachePrefix: 'gnuplot-', offlineAsset: 'src/app.css',
  isWrittenURL: href => { const u = new URL(href); return u.searchParams.has('compressed') || u.searchParams.has('doc'); },
  getSource: page => page.evaluate(() => editor.getValue()),
  getDocument: page => page.evaluate(() => ({ src: editor.getValue() })),
  edit: (page, src) => page.evaluate(src => editor.setValue(src, -1), src),
  openMore: async page => { if (!await page.locator('#fk-more-drawer').isVisible()) await page.locator('#more').click(); },
  installHashBinMock: async (context, source) => context.route('**/vendor/hashbin-sdk-v0.4.0.mjs', async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace(/\bHashBinClient\b/g, 'OriginalHashBinClient').replace('export class OriginalHashBinClient', 'class OriginalHashBinClient') + '\n' + source }); }),
  configureHashBin: async (context, clientId) => {
    await context.route('**/index.html', async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace(/name="hashbin-client-id" content="[^"]*"/, `name="hashbin-client-id" content="${clientId}"`) }); });
    await context.route('**/', async route => { const response = await route.fetch(); const body = await response.text(); await route.fulfill({ response, body: body.replace(/name="hashbin-client-id" content="[^"]*"/, `name="hashbin-client-id" content="${clientId}"`) }); });
  },
  build: (page, doc, canonical = false) => page.evaluate(async ({doc,canonical}) => {
    const {urlState,config} = await import('./src/fragment-config.mjs'); return urlState.build(doc, canonical ? {url:config.canonicalOrigin}:{}).href;
  }, {doc,canonical})
};

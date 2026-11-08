import { LocalDrafts, RenderScheduler, HashBinPanel, ShareClient, compactShell,createShell, mountMobileTabs,
  createQrDialog, createShareDialog } from '../vendor/fragment-kit-v0.3.5/src/index.js';
import { config, type, urlState, HashBinDocuments, HashBinStore, compress, decompress } from './fragment-config.mjs';
// Keep legacy test/document entry points during this migration; production uses imports.
import * as Kit from '../vendor/fragment-kit-v0.3.5/src/index.js';
Object.assign(globalThis, { HashBinDocuments: { ...HashBinDocuments, ...Object.fromEntries(['isCID','cidLength','bytes','encode64','decode64','verify'].map(key => [key, Kit[key]])) },
  LZString: { compressToEncodedURIComponent: compress, decompressFromEncodedURIComponent: decompress } });
/* Browser glue. The engine, documents and exports stay independent of the UI. */
(async () => {
  'use strict';
  const $ = id => document.getElementById(id);
  const editor = ace.edit('editor');
  globalThis.editor = editor;
  editor.setTheme('ace/theme/tomorrow'); editor.session.setMode('ace/mode/gnuplot');
  editor.setOptions({ enableBasicAutocompletion: true, enableLiveAutocompletion: true, showPrintMargin: false, tabSize: 2, useSoftTabs: true });
  ace.require('ace/ext/language_tools').addCompleter({ getCompletions(_editor, _session, _position, _prefix, callback) {
    callback(null, 'plot splot set unset reset fit stats do for while if else print pause replot title xlabel ylabel xrange yrange zrange grid key terminal output samples isosamples multiplot polar parametric palette pm3d using with lines points linespoints boxes histograms yerrorbars filledcurves vectors image sin cos exp log sqrt'.split(' ').map(value => ({ caption: value, value, meta: 'gnuplot', score: 800 })));
  } });
  let files = new DataFiles(), settings = GnuplotCore.options(), revision = 0, applying = false, result = null, pan = null;
  let saved = null, persistTimer, editingName = null, pendingQrSave = false, autorun = true;
  const snapshot = () => ({ src: editor.getValue(), gnuplot: { width: settings.width, height: settings.height, background: settings.background }, files: files.snapshot() });
  const fingerprint = () => JSON.stringify(snapshot());
  const links = () => urlState.build(snapshot());
  const currentLink = () => saved?.fingerprint === fingerprint() ? saved.link : links().fallback;
  const safeStorage = name => { try { return window[name]; } catch (_) { return undefined; } };
  const local = safeStorage('localStorage');
  const drafts = new LocalDrafts({ storage: local, key: 'gnuplotonline:document', serialize: value => HashBinDocuments.serialize(value), parse: value => HashBinDocuments.parse(value) });
  const setError = message => { $('error').textContent = message; $('error').hidden = !message; $('preview').classList.toggle('stale', !!message); };
  const client = new GnuplotClient({ onSlow: () => { $('status').textContent = 'Still running…'; $('cancel').hidden = false; } });
  const scheduler = new RenderScheduler({ detect: () => {}, render: render, renderDelay: 350 });
  let annotations = [];
  function clearAnnotations() {
    for (const row of annotations) editor.session.removeGutterDecoration(row, 'plot-error');
    annotations = []; editor.session.clearAnnotations();
  }
  function annotate(errors) {
    clearAnnotations();
    const scriptErrors = errors.filter(error => error.file === 'script.gp');
    editor.session.setAnnotations(scriptErrors.map(error => ({ row: error.line - 1, column: 0, text: error.message, type: 'error' })));
    for (const error of scriptErrors) { annotations.push(error.line - 1); editor.session.addGutterDecoration(error.line - 1, 'plot-error'); }
  }
  function cleanSvg(svg) {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw new Error('gnuplot produced an invalid SVG.');
    doc.querySelectorAll('script,foreignObject,iframe,object,embed,style,animate,set').forEach(node => node.remove());
    for (const node of doc.querySelectorAll('*')) for (const attr of [...node.attributes]) {
      if (/^on/i.test(attr.name) || (/(?:href|src)$/i.test(attr.name) && !attr.value.startsWith('#')) || /(?:javascript:|url\(\s*["']?(?!#))/i.test(attr.value)) node.removeAttribute(attr.name);
    }
    return new XMLSerializer().serializeToString(doc.documentElement);
  }
  function mountSvg(svg) {
    pan?.destroy(); pan = null; $('preview').innerHTML = svg;
    initPan();
  }
  function initPan() {
    if (!$('preview').getBoundingClientRect().width || !$('preview').getBoundingClientRect().height || !$('preview').querySelector('svg')) return;
    pan = svgPanZoom($('preview').querySelector('svg'), { zoomEnabled: true, controlIconsEnabled: false, fit: true, center: true,
      minZoom: .1, maxZoom: 40, preventMouseEventsDefault: true });
  }
  async function render() {
    const ownRevision = revision;
    $('status').textContent = result ? 'Rendering…' : 'Loading gnuplot…'; $('cancel').hidden = true;
    try {
      DataFiles.validate(files.files, editor.getValue());
      const next = await client.run(editor.getValue(), files.snapshot(), settings);
      if (ownRevision !== revision) return;
      $('cancel').hidden = true;
      annotate(next.errors);
      const failed = next.exitCode !== 0 || next.errors.length;
      if (failed) { setError(next.stderr || `gnuplot exited with code ${next.exitCode}.`); $('status').textContent = 'Check your script'; return; }
      setError(''); result = next;
      if (next.svg) { next.svg = cleanSvg(next.svg); mountSvg(next.svg); }
      else {
        pan?.destroy(); pan = null; $('preview').replaceChildren();
        const pre = document.createElement('pre'); pre.textContent = next.terminal === 'dumb' ? next.stdout : 'This terminal has no browser preview. Download its output below.'; $('preview').append(pre);
      }
      const notes = [];
      if (next.pages > 1) notes.push(`${next.pages} plots; showing the last. Use set multiplot to combine.`);
      if (!next.svg && next.terminal !== 'dumb') notes.push(`${next.terminal} output: choose Terminal file → Download.`);
      $('note').textContent = notes.join(' '); $('note').hidden = !notes.length;
      $('output').textContent = [next.stdout, next.stderr].filter(Boolean).join('\n'); $('output-panel').hidden = !$('output').textContent;
      $('status').textContent = `Rendered in ${Math.round(next.ms)} ms`;
      $('export-format').value = next.svg ? 'svg' : next.terminal === 'dumb' ? 'text' : 'other';
      window.dispatchEvent(new Event('gnuplot-rendered'));
    } catch (error) {
      if (ownRevision !== revision || error.message === 'Cancelled') return;
      setError(error.message); $('status').textContent = 'Rendering stopped'; $('cancel').hidden = true;
    }
  }
  function persist(edit = false) { drafts.attempt(snapshot(), edit === true); }
  function refreshShare({ address = false } = {}) {
    try {
      const url = currentLink();
      if (address) { urlState.cancel(); history.replaceState(null, '', url); }
      if (qr.dialog.open) qr.setLink(url);
    } catch (error) { $('status').textContent = error.message; }
  }
  function changed() {
    if (applying) return;
    revision++; client.cancel(); hashbin.cancelLoad(); urlState.cancel(); shareClient.cancel(); saved = null; persist(true);
     $('cancel').hidden = true; $('status').textContent = 'Waiting for edits…';
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => { persist(); refreshShare({ address: true }); }, 180);
    scheduler.schedule({ detect: false });
    $('file-count').textContent = Object.keys(files.files).length;
  }
  function syncOptions() {
    $('width').value = settings.width; $('height').value = settings.height; $('background').value = settings.background;
    const preset = `${settings.width}×${settings.height}`;
    $('size').value = [...$('size').options].some(option => option.value === preset) ? preset : 'custom';
    $('custom-size').hidden = $('size').value !== 'custom';
  }
  function apply(doc, { run = true } = {}) {
    clearTimeout(persistTimer); urlState.cancel(); shareClient.cancel(); drafts.opened();
    const nextFiles = new DataFiles(doc.files || {}); DataFiles.validate(nextFiles.files, doc.src);
    applying = true;
    try { files = nextFiles; settings = GnuplotCore.options(doc.gnuplot); editor.setValue(doc.src, -1); editor.session.setUndoManager(new ace.UndoManager()); syncOptions(); }
    finally { applying = false; }
    revision++; scheduler.cancel(); client.cancel(); saved = null;
    $('file-count').textContent = Object.keys(files.files).length; listFiles(); if (run) render();
  }
  const shareClient = new ShareClient();
  const oldHeader = document.querySelector('header');
  const brand = oldHeader.querySelector('.brand'); oldHeader.remove();
  const shell = createShell({ config });
  shell.header.querySelector('.fk-brand').replaceChildren(...brand.childNodes);
  shell.toolbar.remove(); shell.status.remove();
  compactShell({header:shell.header,toolbar:document.querySelector(".toolbar"),status:document.querySelector("body > footer")});
  shell.header.querySelector('.fk-more').id = 'more';
  document.querySelector('.mobile-tabs').remove(); document.querySelector('.toolbar > #more').remove();
  for (const id of ['share','qr-open']) document.querySelector('.toolbar').insertBefore($(id), $('extra-tools'));
  const extra = $('extra-tools'); shell.drawer.body.append(extra); extra.classList.add('kit-tools');
  for (const id of ['hashbin-save','hashbin-load','hashbin-cid','hashbin-status','hashbin-dialog','qr-dialog']) $(id).remove();
  const store = new HashBinStore({ legacyStorage: local });
  const hashbin = new HashBinPanel({ store, urlState, container: extra, getSnapshot: snapshot, getFingerprint: fingerprint,
    onLoad: (doc, cid) => { apply(doc, {run:autorun}); const link = cid ? urlState.link(location.href, cid) : links().href; saved = cid ? { fingerprint: fingerprint(), link } : null; history.replaceState(null, '', link); refreshShare(); },
    onSaved: (_cid, value, link) => {
      clearTimeout(persistTimer); urlState.cancel(); saved = { fingerprint: value, link }; history.replaceState(null, '', link); refreshShare();
      if (pendingQrSave) { pendingQrSave = false; hashbin.dialog.close(); qr.open(link); }
    } });
  const openSave = () => hashbin.openSave();
  hashbin.saveButton.onclick = openSave;
  const shareDialog = createShareDialog({ urlState, getSnapshot: snapshot, onSave: openSave });
  const qr = createQrDialog({ config, urlState, onLoad: async outcome => {
    shell.drawer.dialog.close();
    if (outcome.kind === 'cid') await hashbin.load(outcome.cid);
    else { const parsed = outcome.intent; autorun = parsed.run; if (parsed.kind === 'source') { hashbin.cancelLoad(); apply(parsed.doc, { run: parsed.run }); refreshShare({ address: true }); }
      else if (parsed.kind === 'cid') await hashbin.load(parsed.cid);
      else if (parsed.kind === 'example') { const sample = GnuplotExamples.catalog.find(item => item.id === parsed.id); if (!sample) throw new Error('Unknown example.'); hashbin.cancelLoad(); apply({ src: sample.source, files: sample.files || {} }, { run: parsed.run }); refreshShare({ address: true }); }
    }
  }, onSave: () => { pendingQrSave = true; qr.dialog.close(); openSave(); } });
  // Closing the snapshot approval also cancels the pending QR handoff.
  hashbin.dialog.addEventListener('close', () => { pendingQrSave = false; });
  editor.session.on('change', changed);
  $('render').onclick = () => { scheduler.cancel(); render(); };
  $('cancel').onclick = () => { revision++; scheduler.cancel(); client.cancel(); $('cancel').hidden = true; $('status').textContent = 'Cancelled'; };
  $('size').onchange = () => {
    $('custom-size').hidden = $('size').value !== 'custom';
    if ($('size').value !== 'custom') { const [width, height] = $('size').value.split('×').map(Number); settings = GnuplotCore.options({ ...settings, width, height }); syncOptions(); changed(); }
  };
  for (const id of ['width', 'height', 'background']) $(id).onchange = () => { settings = GnuplotCore.options({ ...settings, width: $('width').value, height: $('height').value, background: $('background').value }); syncOptions(); changed(); };
  $('hide-editor').onclick = () => tabs.select(1);
  $('show-editor').onclick = () => tabs.select('split');
  const resize = () => {
    editor.resize();
    if (!$('preview').getBoundingClientRect().width || !$('preview').getBoundingClientRect().height) return;
    if (!pan) initPan();
    else { pan.resize(); pan.fit(); pan.center(); }
  };
  let drag = false;
  $('splitter').onpointerdown = event => { drag = true; $('splitter').setPointerCapture(event.pointerId); };
  $('splitter').onpointermove = event => { if (!drag) return; const rect = document.querySelector('.workspace').getBoundingClientRect(); setSplit((event.clientX - rect.left) / rect.width * 100); };
  $('splitter').onpointerup = () => { drag = false; };
  $('splitter').onpointercancel = () => { drag = false; };
  function setSplit(value) { const width = Math.max(20, Math.min(75, value)); $('editor-pane').style.width = width + '%'; $('splitter').setAttribute('aria-valuenow', Math.round(width)); resize(); }
  $('splitter').onkeydown = event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); setSplit(parseFloat($('splitter').getAttribute('aria-valuenow')) + (event.key === 'ArrowLeft' ? -2 : 2)); } };
  window.addEventListener('resize', resize);
  const tabs = mountMobileTabs({desktop:true, panels: [{ label: 'Code', panel: $('editor-pane') }, { label: 'Preview', panel: $('preview-pane') }],
    container: document.querySelector('.toolbar'), onChange: index => { document.body.classList.remove('editor-hidden');$('show-editor').hidden=index!==1;document.body.dataset.tab = index===-1?'split':index ? 'preview' : 'code'; resize(); } });
  if(matchMedia('(max-width:767px)').matches)tabs.select(1);
  const tabButtons = document.querySelectorAll('.fk-tabs button'); tabButtons[0].id = 'tab-code'; tabButtons[1].id = 'tab-preview';
  $('editor-pane').setAttribute('aria-labelledby', 'tab-code'); $('preview-pane').setAttribute('aria-labelledby', 'tab-preview');
  $('fit').onclick = () => { pan?.resize(); pan?.fit(); pan?.center(); };
  $('actual').onclick = () => { if (pan) { pan.zoom(pan.getZoom() / pan.getSizes().realZoom); pan.center(); } };
  $('zoom-in').onclick = () => pan?.zoomIn(); $('zoom-out').onclick = () => pan?.zoomOut();
  // Native Pointer Events provide touch pan and pinch on top of svg-pan-zoom's mouse support.
  const pointers = new Map(); let gesture = null;
  $('preview').addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || !pan) return;
    event.preventDefault(); $('preview').setPointerCapture(event.pointerId); pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); gesture = null;
  });
  $('preview').addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId) || !pan) return;
    const previous = pointers.get(event.pointerId); pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const values = [...pointers.values()];
    if (values.length === 1) pan.panBy({ x: event.clientX - previous.x, y: event.clientY - previous.y });
    else {
      const [a, b] = values, distance = Math.hypot(a.x-b.x, a.y-b.y), center = { x: (a.x+b.x)/2, y: (a.y+b.y)/2 };
      if (gesture) { const rect = $('preview').getBoundingClientRect(); pan.zoomAtPointBy(distance / gesture.distance, { x: center.x-rect.left, y: center.y-rect.top }); pan.panBy({ x: center.x-gesture.center.x, y: center.y-gesture.center.y }); }
      gesture = { distance, center };
    }
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) $('preview').addEventListener(event, e => { pointers.delete(e.pointerId); gesture = null; });
  async function download() {
    try {
      const format = $('export-format').value;
      if (format === 'source' || format === 'inline') return PlotExport.download(format === 'inline' ? PlotExport.inlineData(editor.getValue(), files.files) : editor.getValue(), 'plot.gp');
      if (!result) throw new Error('Render a plot first.');
      if (format === 'svg' || format === 'png') {
        if (!result.svg) throw new Error('This terminal does not produce an SVG. Choose Text output or Terminal file.');
        PlotExport.download(format === 'png' ? await PlotExport.png(result.svg) : result.svg, 'plot.' + format, 'image/svg+xml');
      } else if (format === 'text') PlotExport.download(result.stdout, 'plot.txt');
      else {
        const outputs = result.outputs.filter(output => !result.svg || !output.name.endsWith('.svg'));
        if (!outputs.length) throw new Error('The script did not produce another output file.');
        // Related terminal files (e.g. epslatex) are all needed to use the result.
        outputs.forEach(output => PlotExport.download(output.bytes, output.name, 'application/octet-stream'));
      }
    } catch (error) { setError(error.message); }
  }
  $('download').onclick = download;
  $('share').onclick = () => { shell.drawer.dialog.close(); refreshShare({ address: true }); shareDialog.open(); };
  $('qr-open').onclick = () => { shell.drawer.dialog.close(); qr.open(currentLink()); };
  document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => $(button.dataset.close).close());
  function listFiles() {
    $('file-list').replaceChildren();
    for (const [name, text] of Object.entries(files.files)) {
      const row = document.createElement('div'); row.className = 'file-row';
      const title = document.createElement('span'); title.textContent = name;
      const size = document.createElement('small'); size.textContent = `${DataFiles.bytes(text).toLocaleString()} bytes`;
      const edit = document.createElement('button'); edit.textContent = 'Edit / rename'; edit.onclick = () => openFile(name);
      const remove = document.createElement('button'); remove.textContent = 'Remove'; remove.setAttribute('aria-label', 'Remove ' + name); remove.onclick = () => { files.remove(name); changed(); listFiles(); };
      row.append(title, size, edit, remove); $('file-list').append(row);
    }
  }
  function openFile(name = null) { editingName = name; $('file-name').value = name || ''; $('file-text').value = name ? files.files[name] : ''; $('file-editor').hidden = false; $('file-name').focus(); }
  $('data-open').onclick = () => { listFiles(); $('data-message').textContent = ''; $('data-dialog').showModal(); };
  $('file-new').onclick = () => openFile(); $('file-add').onclick = () => $('file-upload').click();
  $('file-cancel').onclick = () => { $('file-editor').hidden = true; };
  $('file-save').onclick = () => {
    try {
      const name = $('file-name').value, next = files.snapshot();
      if (name !== editingName && Object.hasOwn(next, name)) throw new Error('A file with that name already exists.');
      if (editingName) delete next[editingName]; next[name] = $('file-text').value;
      DataFiles.validate(next, editor.getValue()); files = new DataFiles(next); changed(); listFiles(); $('file-editor').hidden = true; $('data-message').textContent = '';
    } catch (error) { $('data-message').textContent = error.message; }
  };
  async function upload(list) {
    // A failed batch does not partly replace existing files.
    try {
      const next = new DataFiles(files.snapshot()); for (const file of list) await next.upload(file);
      DataFiles.validate(next.files, editor.getValue()); files = next; changed(); listFiles(); $('data-message').textContent = '';
    } catch (error) { $('data-message').textContent = error.message; if (!$('data-dialog').open) $('data-dialog').showModal(); }
  }
  $('file-upload').onchange = async event => { await upload(event.target.files); event.target.value = ''; };
  $('editor-pane').addEventListener('dragover', event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); });
  $('editor-pane').addEventListener('drop', event => { if (event.dataTransfer.files.length) { event.preventDefault(); event.stopPropagation(); upload(event.dataTransfer.files); } }, true);
  drafts.mount($('extra-tools'), doc => { hashbin.cancelLoad(); apply(doc, { run: false }); refreshShare({ address: true }); $('status').textContent = 'Saved work restored — press Render.'; });
  window.addEventListener('pagehide', persist);
  window.addEventListener('offline-before-reload', persist);
  async function loadUrl({ initial = false } = {}) {
    hashbin.cancelLoad();
    try {
      clearTimeout(persistTimer); scheduler.cancel(); client.cancel(); revision++; saved = null;
      drafts.opened();
      if (initial) store.retireLegacyTokens().catch(() => {});
      const loadRevision = revision;
      const parsed = urlState.parse(location.href); autorun = parsed.run;
      if (parsed?.kind === 'publish') {
        const published = await store.published(location.hash);
        // Edits made while the return was verified win over it.
        const current = loadRevision === revision;
        if (published?.snapshot && current) apply(published.snapshot);
        if (published?.cid && current) saved = { fingerprint: fingerprint(), link: HashBinDocuments.link(location.href, published.cid) };
        if (saved) history.replaceState(null, '', saved.link); else refreshShare({ address: true });
        $('hashbin-status').textContent = published?.error || 'Saved to HashBin.';
      } else if (parsed.kind === 'source') apply(parsed.doc, { run: parsed.run });
      else if (parsed?.kind === 'example') {
        const sample = GnuplotExamples.catalog.find(item => item.id === parsed.id);
        if (!sample) throw new Error('Unknown example. Choose a sample from the gallery.');
        const doc = { src: sample.source, files: sample.files || {} };
        apply(doc, { run: parsed.run }); refreshShare({ address: true });
      } else if (parsed?.kind === 'cid') {
        await hashbin.load(parsed.cid);
        if (loadRevision === revision && hashbin.status.textContent !== 'Loaded from HashBin.') { setError(hashbin.status.textContent); $('status').textContent = hashbin.status.textContent; }
        return;
      }
      if (parsed.kind === 'none') { const params = new URL(location.href).searchParams; apply({ src: GnuplotExamples.defaultSource, gnuplot: { width: params.get('w') || 800, height: params.get('h') || 600, background: params.get('bg') } }, {run:parsed.run}); }
      refreshShare();
    } catch (error) { setError(error.message); $('status').textContent = error.message; }
    finally { document.body.dataset.ready = 'true'; }
  }
  let lastNavigation = location.href;
  const navigate = event => { if (event.type === 'hashchange' && event.newURL !== location.href) return; if (location.href === lastNavigation) return; lastNavigation = location.href; void loadUrl(); };
  window.addEventListener('hashchange', navigate); window.addEventListener('popstate', navigate);
  await loadUrl({ initial: true });
})();

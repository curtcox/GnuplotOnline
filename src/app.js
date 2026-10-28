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
  let saved = null, persistTimer, editingName = null;
  const snapshot = () => ({ src: editor.getValue(), gnuplot: { width: settings.width, height: settings.height, background: settings.background }, files: files.snapshot() });
  const fingerprint = () => JSON.stringify(snapshot());
  const links = () => ShareLinks.build({ url: location.href, ...snapshot(), compress: LZString.compressToEncodedURIComponent });
  const currentLink = () => saved?.fingerprint === fingerprint() ? saved.link : links().fallback;
  const safeStorage = name => { try { return window[name]; } catch (_) { return undefined; } };
  const local = safeStorage('localStorage');
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
  function persist() {
    try { local?.setItem('gnuplotonline:document', HashBinDocuments.serialize(snapshot())); } catch (_) { /* Storage can be unavailable or full; editing continues. */ }
  }
  function refreshShare({ address = false } = {}) {
    try {
      const url = currentLink(); $('share-url').value = url;
      if (address) history.replaceState(null, '', url);
      refreshQr();
    } catch (error) { $('share-status').textContent = error.message; }
  }
  function changed() {
    if (applying) return;
    revision++; client.cancel(); hashbin.cancelLoad(); shareClient.cancel(); saved = null;
    $('share-status').textContent = ''; $('cancel').hidden = true; $('status').textContent = 'Waiting for edits…';
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
  function apply(doc) {
    const nextFiles = new DataFiles(doc.files || {}); DataFiles.validate(nextFiles.files, doc.src);
    applying = true;
    try { files = nextFiles; settings = GnuplotCore.options(doc.gnuplot); editor.setValue(doc.src, -1); editor.session.setUndoManager(new ace.UndoManager()); syncOptions(); }
    finally { applying = false; }
    revision++; scheduler.cancel(); client.cancel(); saved = null;
    $('file-count').textContent = Object.keys(files.files).length; listFiles(); persist(); render();
  }
  const shareClient = new ShareClient();
  const redirect = new URL('./', location.href); redirect.search = ''; redirect.hash = '';
  const store = new HashBinStore({ clientId: document.querySelector('meta[name="hashbin-client-id"]').content.trim(),
    redirectUri: redirect.href, storage: local, transactionStorage: safeStorage('sessionStorage') });
  // Links can come from anyone; never let one silently replace work kept in this browser.
  let linkLoad = false;
  function acceptLink(doc) {
    const same = (a, b) => a.src === b.src && JSON.stringify(a.files || {}) === JSON.stringify(b.files || {}), current = snapshot();
    if (same(current, doc) || current.src === GnuplotExamples.defaultSource || GnuplotExamples.catalog.some(sample => same(current, { src: sample.source, files: sample.files || {} }))) return true;
    if (confirm('This link opens a different plot. Replace the plot saved in this browser?\n\nChoose Cancel to keep your current work.')) return true;
    refreshShare({ address: true });
    return false;
  }
  const hashbin = new HashBinPanel({ store, getSnapshot: snapshot, getFingerprint: fingerprint,
    onLoad: (doc, cid) => { if (linkLoad && !acceptLink(doc)) return false; apply(doc); const link = HashBinDocuments.link(location.href, cid); saved = { fingerprint: fingerprint(), link }; history.replaceState(null, '', link); refreshShare(); },
    onSaved: (_cid, value, link) => { saved = { fingerprint: value, link }; history.replaceState(null, '', link); refreshShare(); } });
  editor.session.on('change', changed);
  $('cancel').onclick = () => { revision++; scheduler.cancel(); client.cancel(); $('cancel').hidden = true; $('status').textContent = 'Cancelled'; };
  $('size').onchange = () => {
    $('custom-size').hidden = $('size').value !== 'custom';
    if ($('size').value !== 'custom') { const [width, height] = $('size').value.split('×').map(Number); settings = GnuplotCore.options({ ...settings, width, height }); syncOptions(); changed(); }
  };
  for (const id of ['width', 'height', 'background']) $(id).onchange = () => { settings = GnuplotCore.options({ ...settings, width: $('width').value, height: $('height').value, background: $('background').value }); syncOptions(); changed(); };
  $('hide-editor').onclick = () => { document.body.classList.add('editor-hidden'); $('show-editor').hidden = false; resize(); };
  $('show-editor').onclick = () => { document.body.classList.remove('editor-hidden'); $('show-editor').hidden = true; resize(); };
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
  for (const tab of ['preview', 'code']) $('tab-' + tab).onclick = () => { document.body.dataset.tab = tab; for (const name of ['preview', 'code']) $('tab-' + name).setAttribute('aria-selected', name === tab); resize(); if (tab === 'code') editor.focus(); };
  $('more').onclick = () => { const open = document.body.classList.toggle('more-open'); $('more').setAttribute('aria-expanded', open); resize(); };
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
  $('share').onclick = async () => { refreshShare({ address: true }); $('share-url').select(); try { await navigator.clipboard.writeText($('share-url').value); $('share-status').textContent = 'Link copied.'; } catch (_) { $('share-status').textContent = 'Select and copy the link above.'; } };
  $('share-url').onclick = () => $('share-url').select();
  $('shorten').onclick = async () => {
    const ownRevision = revision; $('share-status').textContent = 'Shortening…'; refreshShare();
    const response = await shareClient.shorten(saved ? { long: currentLink(), fallback: currentLink() } : links());
    if (ownRevision !== revision || !response) return;
    $('share-url').value = response.url; $('share-status').textContent = response.error?.message || 'Short link ready to copy.';
  };
  let qrMarkup = '';
  function refreshQr() {
    if (!$('qr-dialog').open) return;
    const url = currentLink(), qr = encodeQr(url); qrMarkup = qr ? qrSvg(qr) : '';
    $('qr-code').innerHTML = qrMarkup; $('qr-message').textContent = qrNotes(url, qr); $('qr-url').textContent = url;
    $('qr-svg').disabled = $('qr-png').disabled = !qr;
  }
  $('qr-open').onclick = () => { $('qr-dialog').showModal(); refreshQr(); };
  $('qr-svg').onclick = () => PlotExport.download(qrMarkup, 'plot-qr.svg', 'image/svg+xml');
  $('qr-png').onclick = async () => { try { PlotExport.download(await PlotExport.png(qrMarkup, 1), 'plot-qr.png'); } catch (error) { $('qr-message').textContent = error.message; } };
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
  window.addEventListener('pagehide', persist);
  window.addEventListener('offline-before-reload', persist);
  async function loadUrl({ initial = false } = {}) {
    hashbin.cancelLoad();
    try {
      if (initial) {
        store.retireLegacyTokens().catch(() => { /* Retried on the next load. */ });
        let restored = null; try { const text = local?.getItem('gnuplotonline:document'); if (text) restored = HashBinDocuments.parse(text); } catch (_) { /* Ignore invalid or unavailable storage. */ }
        const params = new URL(location.href).searchParams;
        apply(restored || { src: GnuplotExamples.defaultSource, gnuplot: { width: params.get('w') || 800, height: params.get('h') || 600, background: params.get('bg') } });
      }
      const loadRevision = revision;
      const parsed = ShareLinks.parse(location.href, LZString.decompressFromEncodedURIComponent);
      if (parsed?.kind === 'publish') {
        const published = await store.published(location.hash);
        // Edits made while the return was verified win over it.
        const current = loadRevision === revision;
        if (published.snapshot && current) apply(published.snapshot);
        if (published.cid && current) saved = { fingerprint: fingerprint(), link: HashBinDocuments.link(location.href, published.cid) };
        if (saved) history.replaceState(null, '', saved.link); else refreshShare({ address: true });
        $('hashbin-status').textContent = published.error || 'Saved to HashBin.';
      } else if (parsed?.kind === 'source') { if (acceptLink(parsed)) apply(parsed); }
      else if (parsed?.kind === 'example') {
        const sample = GnuplotExamples.catalog.find(item => item.id === parsed.id);
        if (!sample) throw new Error('Unknown example. Choose a sample from the gallery.');
        const doc = { src: sample.source, files: sample.files || {} };
        if (acceptLink(doc)) apply(doc);
      } else if (parsed?.kind === 'cid') {
        linkLoad = true;
        try { await hashbin.load(parsed.cid); } finally { linkLoad = false; }
        return;
      }
      refreshShare();
    } catch (error) { if (initial && !editor.getValue()) apply({ src: GnuplotExamples.defaultSource }); setError(error.message); }
  }
  window.addEventListener('hashchange', () => loadUrl());
  await loadUrl({ initial: true });
})();

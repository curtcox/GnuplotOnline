const PlotExport = {
  download(content, name, type = 'text/plain;charset=utf-8') {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },
  async png(svg, scale = 2) {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Could not rasterize the SVG. Download SVG instead.')); image.src = url; });
      const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
      const viewBox = root.getAttribute('viewBox')?.split(/[ ,]+/).map(Number);
      const width = parseFloat(root.getAttribute('width')) || viewBox?.[2] || image.width || 800;
      const height = parseFloat(root.getAttribute('height')) || viewBox?.[3] || image.height || 600;
      const canvas = document.createElement('canvas'); canvas.width = width * scale; canvas.height = height * scale;
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed.')), 'image/png'));
    } finally { URL.revokeObjectURL(url); }
  },
  inlineData(source, files) {
    let prefix = '', index = 0;
    for (const [name, text] of Object.entries(files)) {
      let block; do { block = '$GPO_DATA_' + index++; } while (source.includes(block));
      let end = 'GPO_END_' + index; while (text.split('\n').includes(end)) end += '_';
      prefix += `${block} << ${end}\n${text}${text.endsWith('\n') ? '' : '\n'}${end}\n`;
      // Only quoted exact filenames are replaced; arbitrary gnuplot expressions remain intact.
      source = source.replace(/(["'])([^"'\n]*)\1/g, (whole, quote, value) => value === name ? block : whole);
    }
    return prefix + source;
  }
};
if (typeof module !== 'undefined') module.exports = PlotExport;
else globalThis.PlotExport = PlotExport;

(() => {
  const gallery = document.getElementById('gallery'), search = document.getElementById('search'), tag = document.getElementById('tag');
  for (const name of [...new Set(GnuplotExamples.catalog.flatMap(sample => sample.tags))].sort()) {
    const option = document.createElement('option'); option.value = option.textContent = name; tag.append(option);
  }
  function refresh() {
    gallery.replaceChildren();
    const query = search.value.toLowerCase().trim();
    const samples = GnuplotExamples.catalog.filter(sample => (!tag.value || sample.tags.includes(tag.value)) && [sample.label,sample.description,...sample.tags].join(' ').toLowerCase().includes(query));
    for (const sample of samples) {
      const card = document.createElement('a'); card.className = 'card'; card.href = './?example=' + encodeURIComponent(sample.id);
      const cover = document.createElement('img'); cover.src = 'gallery/previews/' + sample.id + '.svg'; cover.alt = sample.label + ' plot'; cover.loading = 'lazy'; cover.width = 640; cover.height = 480;
      const body = document.createElement('div'); body.className = 'card-body'; const title = document.createElement('h2'); title.textContent = sample.label;
      const description = document.createElement('p'); description.textContent = sample.description;
      const tags = document.createElement('div'); tags.className = 'tags'; for (const name of sample.tags) { const chip = document.createElement('span'); chip.textContent = name; tags.append(chip); }
      body.append(title,description,tags); card.append(cover,body); gallery.append(card);
    }
    document.getElementById('count').textContent = samples.length + ' samples'; document.getElementById('empty').hidden = !!samples.length;
  }
  search.oninput = tag.onchange = refresh; refresh();
})();

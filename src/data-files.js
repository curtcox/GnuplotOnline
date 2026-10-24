/** UTF-8 files shared by renders, saved documents and URL payloads. */
class DataFiles {
  static MAX_FILE = 2 * 1024 * 1024;
  static MAX_TOTAL = 5 * 1024 * 1024;
  static validName(name) {
    return /^[A-Za-z0-9._-]{1,64}$/.test(name) && !name.includes('..') && !['.', 'script.gp', 'out.svg', '__proto__', 'constructor', 'prototype'].includes(name);
  }
  static bytes(text) { return new TextEncoder().encode(text).length; }
  static validate(files, source = '') {
    if (!files || typeof files !== 'object' || Array.isArray(files)) throw new Error('Data files must be a name-to-text object.');
    let total = this.bytes(source);
    for (const [name, text] of Object.entries(files)) {
      if (!this.validName(name)) throw new Error(`Invalid filename: ${name}. Use 1–64 letters, digits, dots, underscores or hyphens; no '..'.`);
      if (typeof text !== 'string' || text.includes('\0')) throw new Error(`${name}: only UTF-8 text files are supported.`);
      const size = this.bytes(text);
      if (size > this.MAX_FILE) throw new Error(`${name} exceeds the 2 MiB file limit.`);
      total += size;
    }
    if (total > this.MAX_TOTAL) throw new Error('Source and data exceed the 5 MiB total limit.');
    return total;
  }
  constructor(files = {}) { DataFiles.validate(files); this.files = { ...files }; }
  add(name, text) { const next = { ...this.files, [name]: text }; DataFiles.validate(next); this.files = next; }
  remove(name) { delete this.files[name]; }
  rename(from, to) {
    if (!Object.hasOwn(this.files, from)) throw new Error('File not found.');
    if (from !== to && Object.hasOwn(this.files, to)) throw new Error('A file with that name already exists.');
    const next = { ...this.files }; delete next[from]; next[to] = this.files[from]; DataFiles.validate(next); this.files = next;
  }
  async upload(file) {
    if (file.size > DataFiles.MAX_FILE) throw new Error(`${file.name} exceeds the 2 MiB file limit.`);
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); }
    catch (_) { throw new Error(`${file.name}: only UTF-8 text files are supported.`); }
    this.add(file.name, text);
  }
  snapshot() { return { ...this.files }; }
}
if (typeof module !== 'undefined') module.exports = DataFiles;
else globalThis.DataFiles = DataFiles;

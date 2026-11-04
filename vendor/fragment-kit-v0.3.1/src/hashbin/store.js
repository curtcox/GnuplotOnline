import { bytes, bounded, decode64, readResponse, text } from '../core/bytes.js';
import { cid, cidLength, isCID, verify } from '../core/cid.js';
import { createDocuments } from '../core/envelope.js';
import { createStorage } from '../core/storage.js';
import { redirectUri } from '../core/config.js';

export class HashBinStore {
  constructor({ config, type, clientId = config?.hashbinClientId, redirectUri: redirect,
    storage, transactionStorage, legacyStorage, fetchSource = (...args) => fetch(...args),
    loadSDK = () => import('../../vendor/hashbin-sdk-v0.4.0.mjs'), timeout = 20000, timers = globalThis }) {
    Object.assign(this, { config, type, clientId, fetchSource, loadSDK, timeout, timers, legacyStorage });
    this.redirectUri = redirect ?? redirectUri(config);
    this.documents = createDocuments(type, config.maxBytes);
    // Publish doesn't need credential persistence. Never give it localStorage as a default.
    this.storage = storage ?? { getItem: () => null, setItem: () => { throw new Error('HashBin credentials cannot be stored on this app origin.'); }, removeItem() {} };
    this.transactionStorage = transactionStorage ?? createStorage({ prefix: config.storagePrefix, kind: 'sessionStorage' });
  }
  async bounded(work) {
    const controller = new AbortController(); let timer;
    try { return await Promise.race([Promise.resolve().then(() => work(controller.signal)), new Promise((_, reject) => {
      timer = this.timers.setTimeout(() => { controller.abort(); reject(new Error('HashBin request timed out. Try again.')); }, this.timeout);
    })]); } finally { this.timers.clearTimeout(timer); }
  }
  cid(input) { return cid(input, this.config.allowedHosts); }
  async load(input) {
    const value = this.cid(input);
    if (!value) throw new Error('Enter a valid HashBin CID or saved link.');
    const length = cidLength(value);
    if (length > this.config.maxBytes) throw new Error('Saved source exceeds the 5 MiB limit.');
    return this.bounded(async signal => {
      let content;
      if (length <= 64) content = decode64(value.slice(8), 64);
      else {
        const response = await this.fetchSource(`https://256t.us/${value}`, { signal });
        if (!response.ok) throw new Error(response.status === 404 ? 'Saved source was not found. It may have expired or been deleted.' : `HashBin load failed (HTTP ${response.status}).`);
        content = await readResponse(response, Math.min(length, this.config.maxBytes));
      }
      await verify(value, content);
      return this.documents.parse(text(content));
    });
  }
  async init() {
    if (this.client) return this.client;
    if (!this.clientId) throw new Error('HashBin saving needs a registered client ID.');
    if (!this.initializing) this.initializing = this.bounded(async () => {
      const { HashBinClient } = await this.loadSDK();
      return new HashBinClient({ clientId: this.clientId, redirectUri: this.redirectUri,
        baseUrl: 'https://hashbin.org', contentBaseUrl: 'https://256t.us', storage: this.storage,
        transactionStorage: this.transactionStorage, fetch: this.fetchSource });
    }).then(client => (this.client = client)).finally(() => { this.initializing = null; });
    return this.initializing;
  }
  /** Deliberately not async: SDK opens window.open before returning its promise. */
  publish(payload, snapshot) {
    if (!this.client) return Promise.reject(new Error('HashBin is still loading. Try again.'));
    bounded(payload, this.config.maxBytes);
    return this.client.publish(payload, { contentType: this.type.contentType ?? 'application/json',
      fileName: this.type.fileName ?? 'document.json', clientState: { snapshot } }).then(async result => {
      if (result.redirected) return result;
      await verify(result.cid, bytes(payload)); return result;
    }, error => { throw new Error(this.message(error)); });
  }
  message(error) {
    if (error.message === 'access_denied') return 'The save was cancelled on HashBin.';
    if (error.message === 'Publish window closed.') return 'The HashBin window was closed before the save was approved.';
    return error.message;
  }
  async published(hash) {
    if (!new URLSearchParams(hash.replace(/^#/, '')).has('hashbin_publish')) return null;
    let snapshot;
    try {
      const { cid, clientState } = await (await this.init()).handlePublishCallback({ hash });
      snapshot = clientState?.snapshot;
      if (!isCID(cid)) throw new Error('HashBin returned an invalid CID.');
      if (clientState?.snapshot) await verify(cid, bytes(this.documents.serialize(clientState.snapshot)));
      return { cid, snapshot: clientState?.snapshot };
    } catch (error) { return { error: this.message(error), snapshot: error.clientState?.snapshot ?? snapshot ?? null }; }
  }
  async retireLegacyTokens() {
    const key = `hashbin:tokens:${this.clientId}`;
    if (!this.clientId || !this.legacyStorage?.getItem(key)) return false;
    // Give the SDK access solely for revocation, then immediately remove that access.
    await this.bounded(async () => {
      const { HashBinClient } = await this.loadSDK();
      const client = new HashBinClient({ clientId: this.clientId, redirectUri: this.redirectUri,
        storage: this.legacyStorage, transactionStorage: this.transactionStorage, fetch: this.fetchSource });
      await client.disconnect();
    });
    return true;
  }
}

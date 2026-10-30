const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const Sandbox = require('../src/gnuplot-sandbox.js');
const base = 'https://gnuplot.hashbin.page/src/';
const tick = () => new Promise(resolve => setImmediate(resolve));
test('plotting SDK matches the published v0.4.0 release', () => {
  const hash = createHash('sha256').update(fs.readFileSync('vendor/hashbin-sdk-v0.4.0.mjs')).digest('hex');
  assert.equal(hash, '82f25ffe41a0ff79a060fb593754a286e1c85c2502878ab387c3d0045b749fa5');
});
test('sandbox queues runs, proxies only the runtime and removes the frame on cancellation', async () => {
  let load, options, terminated = false;
  const sent = [], events = [];
  const sandbox = { postMessage(data) { sent.push(data); }, terminate() { terminated = true; } };
  const worker = Sandbox.factory({ base, loadSDK: () => new Promise(resolve => { load = resolve; }), fetchSource: async url => url })();
  worker.onmessage = event => events.push(event.data);
  worker.postMessage({ id: 1 });
  await tick(); assert.deepEqual(sent, []);
  load({ createSandbox(config) { options = config; return sandbox; } });
  await tick();
  assert.equal(options.origin, 'opaque'); assert.equal(options.base, base);
  assert.deepEqual(options.proxy, ['https://gnuplot.hashbin.page/vendor/gnuplot/']);
  assert.match(await options.source, /gnuplot-core.js[\s\S]*gnuplot-worker.js/);
  assert.deepEqual(sent, [{ id: 1 }]);
  sandbox.onmessage({ data: 'result' }); assert.deepEqual(events, ['result']);
  worker.terminate(); assert.equal(terminated, true);
  sandbox.onmessage({ data: 'late' }); worker.postMessage({ id: 2 });
  assert.deepEqual(events, ['result']); assert.deepEqual(sent, [{ id: 1 }]);
});
test('cancellation during SDK loading never creates a frame or delivers errors', async () => {
  let load, calls = 0, errors = 0;
  const worker = Sandbox.factory({ base, loadSDK: () => new Promise(resolve => { load = resolve; }) })();
  worker.onerror = () => errors++;
  worker.postMessage({ id: 1 }); await tick(); worker.terminate();
  load({ createSandbox() { calls++; } }); await tick();
  assert.equal(calls, 0); assert.equal(errors, 0); assert.deepEqual(worker.queue, []);
});
test('SDK failure reaches the client error handler and can be retried', async () => {
  let attempt = 0;
  const factory = Sandbox.factory({ base, loadSDK: () => { attempt++; throw new Error('SDK unavailable'); } });
  for (let i = 0; i < 2; i++) {
    const worker = factory();
    const error = new Promise(resolve => { worker.onerror = resolve; });
    worker.postMessage({ id: i }); assert.match((await error).message, /SDK unavailable/); worker.terminate();
  }
  assert.equal(attempt, 2);
});

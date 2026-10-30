/** Terminating the worker also interrupts synchronous WASM and infinite loops. */
class GnuplotClient {
  constructor({ workerFactory = () => GnuplotSandbox.factory()(), timeout = 5000,
    onSlow = () => {}, timers = globalThis } = {}) {
    Object.assign(this, { workerFactory, timeout, onSlow, timers });
    this.sequence = 0;
  }
  cancel(reason = 'Cancelled') {
    if (!this.pending) return;
    const pending = this.pending;
    this.pending = null;
    this.timers.clearTimeout(pending.timer); this.timers.clearTimeout(pending.slow);
    this.worker?.terminate(); this.worker = null;
    pending.reject(new Error(reason));
  }
  run(script, files = {}, options = {}) {
    this.cancel();
    if (!this.worker) this.worker = this.workerFactory();
    const worker = this.worker;
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const finish = (error, result) => {
        if (this.pending?.id !== id) return;
        this.timers.clearTimeout(this.pending.timer); this.timers.clearTimeout(this.pending.slow);
        this.pending = null;
        if (error) { worker.terminate(); this.worker = null; reject(error); } else resolve(result);
      };
      this.pending = { id, reject,
        slow: this.timers.setTimeout(() => { if (this.pending?.id === id) this.onSlow(); }, 1500),
        timer: this.timers.setTimeout(() => this.cancel(`Rendering timed out after ${this.timeout / 1000} seconds. Simplify the script and try again.`), this.timeout) };
      worker.onmessage = ({ data }) => { if (data.id === id) finish(data.error ? new Error(data.error) : null, data); };
      worker.onerror = event => finish(new Error(event.message || 'Could not start gnuplot. Reload and try again.'));
      worker.postMessage({ id, script, files, options });
    });
  }
}
if (typeof module !== 'undefined') module.exports = GnuplotClient;
else globalThis.GnuplotClient = GnuplotClient;

const { test } = require('node:test');
const assert = require('node:assert/strict');
const GnuplotClient = require('../src/gnuplot-client.js');
const RenderScheduler = require('../src/render-scheduler.js');
test('a hard timeout terminates a stuck worker and a new run uses a fresh worker', async () => {
  const workers = [];
  const client = new GnuplotClient({ timeout: 15, workerFactory: () => { const worker = { postMessage() {}, terminate() { this.terminated = true; } }; workers.push(worker); return worker; } });
  await assert.rejects(client.run('while (1) {}'), /timed out/); assert.equal(workers[0].terminated, true);
  const next = client.run('plot x'); workers[1].onmessage({ data: { id: 2, svg: '<svg/>' } }); assert.equal((await next).svg, '<svg/>');
});
test('latest edit cancels old work and ignores late messages', async () => {
  const workers=[]; const client=new GnuplotClient({workerFactory:()=>{const worker={postMessage(){},terminate(){this.stopped=true}};workers.push(worker);return worker}});
  const first=client.run('plot x');const rejected=assert.rejects(first,/Cancelled/);const second=client.run('plot y');
  workers[0].onmessage({data:{id:1,svg:'stale'}});workers[1].onmessage({data:{id:2,svg:'current'}});
  await rejected;assert.equal((await second).svg,'current');assert.equal(workers[0].stopped,true);
});
test('scheduler suppresses stale callbacks even after a timer has been queued', () => {
  const callbacks=[];const timers={setTimeout(callback){callbacks.push(callback);return callbacks.length},clearTimeout(){}};let rendered=0;
  const scheduler=new RenderScheduler({detect(){},render(){rendered++},timers});scheduler.schedule();scheduler.schedule();callbacks.forEach(callback=>callback());assert.equal(rendered,1);
});

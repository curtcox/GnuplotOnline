const { test } = require('node:test');
const assert = require('node:assert/strict');
const { HashBinStore, HashBinDocuments: Docs } = require('../src/hashbin.js');
function storage(){const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}}
function cid(text){const size=Buffer.alloc(6);size.writeUIntBE(Buffer.byteLength(text),0,6);return size.toString('base64url')+(text.length<=64?Buffer.from(text):Buffer.alloc(64,1)).toString('base64url')}
function fullCID(text){const data=Buffer.from(text),size=Buffer.alloc(6);size.writeUIntBE(data.length,0,6);return size.toString('base64url')+(data.length<=64?data:require('node:crypto').createHash('sha512').update(data).digest()).toString('base64url')}
test('saves go through HashBin Publish with the pinned SDK and verify the returned CID',async()=>{
 const snapshot={src:'plot x',files:{'x.dat':'1 2'},gnuplot:{width:640}},payload=Docs.serialize(snapshot);let options;
 const store=new HashBinStore({clientId:'test',loadSDK:async()=>({HashBinClient:class{publish(content,opts){assert.equal(content,payload);options=opts;return Promise.resolve({cid:fullCID(payload)})}}})});
 await assert.rejects(store.publish(payload,snapshot),/still loading/);await store.init();
 assert.equal((await store.publish(payload,snapshot)).cid,fullCID(payload));assert.deepEqual(options,{contentType:'application/json',clientState:{snapshot}});
 store.client.publish=async()=>({cid:fullCID(payload+' ')});await assert.rejects(store.publish(payload,snapshot),/does not match its CID/);
 await assert.rejects(new HashBinStore().init(),/registered client ID/);
 assert.match(require('node:fs').readFileSync(require('node:path').join(__dirname,'../src/hashbin.js'),'utf8'),/hashbin\.org\/sdk\/v0\.4\.0\/hashbin\.js/);
});
test('redirect saves restore source and files after approval or cancellation; legacy tokens are revoked',async()=>{
 const transactionStorage=storage(),snapshot={src:'plot x',files:{'x.dat':'1 2'},gnuplot:{width:640}},payload=Docs.serialize(snapshot);let outcome='approve';
 const store=new HashBinStore({clientId:'test',transactionStorage,loadSDK:async()=>({HashBinClient:class{publish(){return Promise.resolve({redirected:true})}async handlePublishCallback(){if(outcome!=='approve')throw Object.assign(new Error('access_denied'),{clientState:{snapshot}});return {cid:fullCID(payload),clientState:{snapshot}}}}})});
 await store.init();assert.equal(await store.published('#'+cid('plot x')),null);
 await store.publish(payload,snapshot);assert.deepEqual(await store.published('#hashbin_publish=s&cid=x'),{cid:fullCID(payload),snapshot});
 await store.publish(payload,snapshot);outcome='cancel';assert.deepEqual(await store.published('#hashbin_publish=s&error=access_denied'),{error:'The save was cancelled on HashBin.',snapshot});
 const local=storage();let revoked=0,loaded=0;const legacy=new HashBinStore({clientId:'test',storage:local,loadSDK:async()=>{loaded++;return {HashBinClient:class{async disconnect(){revoked++;local.removeItem('hashbin:tokens:test')}}}}});
 assert.equal(await legacy.retireLegacyTokens(),false);assert.equal(loaded,0);local.setItem('hashbin:tokens:test','{"refreshToken":"old"}');assert.equal(await legacy.retireLegacyTokens(),true);assert.equal(revoked,1);
});
test('remote loads verify bytes against the CID',async()=>{
 const text=Docs.serialize({src:'plot sin(x)'+' '.repeat(80),files:{},gnuplot:{}}),served=body=>new HashBinStore({fetchSource:async()=>({ok:true,status:200,arrayBuffer:async()=>new TextEncoder().encode(body).buffer})});
 assert.match((await served(text).load(fullCID(text))).src,/^plot sin/);
 await assert.rejects(served(text.replace('sin','cos')).load(fullCID(text)),/does not match its CID/);
});
test('network loads validate size and UTF-8, time out, and report not-found errors',async()=>{
 const remote=cid('x'.repeat(200));
 const missing=new HashBinStore({fetchSource:async()=>({ok:false,status:404})});await assert.rejects(missing.load(remote),/not found/);
 const timeout=new HashBinStore({timeout:5,fetchSource:()=>new Promise(()=>{})});await assert.rejects(timeout.load(remote),/timed out/);
 const bad=Buffer.from([0xc3,0x28]);const prefix=Buffer.alloc(6);prefix.writeUIntBE(2,0,6);await assert.rejects(new HashBinStore().load(prefix.toString('base64url')+bad.toString('base64url')),/encoded data/);
});

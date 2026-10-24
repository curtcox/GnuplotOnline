const { test } = require('node:test');
const assert = require('node:assert/strict');
const { HashBinStore, HashBinDocuments: Docs } = require('../src/hashbin.js');
function storage(){const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}}
function cid(text){const size=Buffer.alloc(6);size.writeUIntBE(Buffer.byteLength(text),0,6);return size.toString('base64url')+(text.length<=64?Buffer.from(text):Buffer.alloc(64,1)).toString('base64url')}
test('OAuth preserves source and files, restores once and rejects expired returns',async()=>{
 const transactionStorage=storage();const snapshot={src:'plot x',files:{'x.dat':'1 2'},gnuplot:{width:640}};
 class SDK{async authorize(){return {state:'state',url:'https://hashbin.org/authorize'}}async handleCallback(){this.done=true}}
 const store=new HashBinStore({clientId:'test',transactionStorage,loadSDK:async()=>({HashBinClient:SDK})});
 assert.equal(await store.connect(snapshot),'https://hashbin.org/authorize');
 const restored=await store.callback('?code=test&state=state');assert.deepEqual(restored.snapshot,snapshot);assert.equal(restored.connected,true);
 assert.match((await store.callback('?code=test&state=state')).error,/could not be restored/);
 transactionStorage.setItem('gnuplotonline:hashbin:return:old',JSON.stringify({snapshot,createdAt:0}));assert.match((await store.callback('?code=test&state=old')).error,/could not be restored/);
});
test('HashBin quote and save use account settings, refresh authorization and validate CID',async()=>{
 const requests=[];let refreshed=0;const payload=Docs.serialize({src:'plot x',files:{},gnuplot:{}}),savedCid=cid(payload);
 class SDK{
 getTokens(){return {refreshToken:'mock',expiresAt:0}}
 async refreshAccessToken(){refreshed++}
 async authorizedFetch(path,options){requests.push([path,options]);return {ok:true,status:200,json:async()=>path.endsWith('/settings')?{default_retention_months:3}:path.endsWith('/balance')?{balance_cents:200}:{cid:savedCid}}}
 }
 const store=new HashBinStore({clientId:'test',loadSDK:async()=>({HashBinClient:SDK}),fetchSource:async(_url,options)=>{assert.equal(JSON.parse(options.body).retention_months,3);return {ok:true,json:async()=>({cost_cents:2})}}});
 assert.deepEqual(await store.quote(payload),{months:3,cost:2,balance:200,size:Buffer.byteLength(payload)});
 assert.equal((await store.save(payload)).cid,savedCid);assert.ok(refreshed>=3);assert.equal(requests.at(-1)[0],'/api/content');assert.ok(requests.at(-1)[1].body instanceof FormData);
});
test('network loads validate size and UTF-8, time out, and report not-found errors',async()=>{
 const remote=cid('x'.repeat(200));
 const missing=new HashBinStore({fetchSource:async()=>({ok:false,status:404})});await assert.rejects(missing.load(remote),/not found/);
 const timeout=new HashBinStore({timeout:5,fetchSource:()=>new Promise(()=>{})});await assert.rejects(timeout.load(remote),/timed out/);
 const bad=Buffer.from([0xc3,0x28]);const prefix=Buffer.alloc(6);prefix.writeUIntBE(2,0,6);await assert.rejects(new HashBinStore().load(prefix.toString('base64url')+bad.toString('base64url')),/encoded data/);
});

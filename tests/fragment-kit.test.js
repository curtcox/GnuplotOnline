const {test}=require('node:test'), assert=require('node:assert/strict');
const {urlState,type,HashBinDocuments,HashBinStore}=require('../src/fragment-config.mjs');
const corpus=require('./fixtures/legacy-urls.json'), core=require('../src/gnuplot-core.js');
for(const entry of corpus.cases)test('production adapter preserves baseline '+entry.label,async()=>{
  const intent=urlState.parse(entry.href);assert.equal(intent.kind,entry.kind);
  if(entry.src)assert.equal(intent.doc.src,entry.src);
  if(entry.raw){const before=JSON.parse(entry.raw);assert.equal(intent.doc.src,before.src);assert.deepEqual(intent.doc.files,before.files);assert.deepEqual(core.options(intent.doc.gnuplot),core.options(before.gnuplot));}
  if(entry.kind==='example')assert.equal(intent.id,entry.id);
  if(entry.kind==='cid'){assert.equal(intent.cid,entry.cid);assert.equal((await new HashBinStore({fetchSource:async()=>new Response(corpus.example.source)}).load(intent.cid)).src,corpus.example.source);}
});
test('read-first rollout writes legacy URLs and accepts v1 documents with files',()=>{
  const before={src:"plot 'data.dat'",files:{'data.dat':'1 2'},gnuplot:{width:640,height:480,background:'transparent'}};
  const link=urlState.build(before,{url:'https://gnuplot.hashbin.page/?example=stale',run:false});assert.ok(new URL(link.href).searchParams.has('doc'));
  assert.equal(urlState.parse(link.href).run,false);assert.deepEqual(urlState.parse(link.href).doc,type.normalize(before));
  const {createUrlState}=require('../vendor/fragment-kit-v0.3.3/src/index.js');const {config}=require('../src/fragment-config.mjs');
  const modern=createUrlState({config,type}).build(before).href;assert.deepEqual(urlState.parse(modern).doc,type.normalize(before));
  assert.throws(()=>HashBinDocuments.parse('{"format":"hashbin-diagram","type":"other","version":1,"src":"plot x"}'),/Saved document is for/);
});

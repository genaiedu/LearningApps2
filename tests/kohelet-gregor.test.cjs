'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../scripts/kohelet-core.js'),V=require('../scripts/kohelet-inhalte.js'),T=require('../tools/kohelet-text.cjs');
const root=path.resolve(__dirname,'..'),corpus=require('../data/kohelet-gregor/lesetexte.json'),el=require('../data/kohelet-gregor/gregor-original.json'),de=require('../data/kohelet-gregor/gregor-de.json');
test('complete corpus and visible editorial Greek paragraphs, without text loss',()=>{
  const compact=s=>s.replace(/\s/gu,'');
  assert.equal(corpus.kohelet.flatMap(c=>c.verses).length,222);assert.equal(corpus.gregor.length,8);
  assert.equal(compact(corpus.gregor.flatMap(h=>h.chunks.flatMap(c=>c.el.map(p=>p.text))).join(' ')),compact(el.map(p=>p.el).join(' ')));
  assert.equal(compact(corpus.gregor.flatMap(h=>h.chunks.flatMap(c=>c.de.map(p=>p.text))).join(' ')),compact(Object.values(de).flat().join(' ')));
  assert.ok(corpus.gregor.flatMap(h=>h.chunks.flatMap(c=>c.el)).length>200);
  const first=T.greekParagraphs(el[0].el);assert.ok(first.some(p=>p.text.startsWith("πλὴν ἀλλ' ἐπειδὴ")));assert.ok(first.some(p=>p.text.startsWith('Καὶ πρῶτόν γε')));
  const refs=corpus.gregor.flatMap(h=>h.chunks.flatMap(c=>[...c.el,...c.de].flatMap(p=>p.refs)));assert.equal(refs.length,226);
});
test('sixteen genuine text-work tasks in four progressive paths, all text anchors valid',()=>{
  assert.deepEqual(V.tasks.map(t=>t.id),C.taskIds);assert.equal(V.paths.length,4);
  for(const p of V.paths)assert.equal(V.tasks.filter(t=>t.path===p.id).length,4);
  for(const t of V.tasks){assert.ok(t.steps.length>=3);assert.ok(t.hint&&t.product&&t.comparison);assert.ok(t.checks.length>=3);
    for(const r of t.texts)if(r.work==='gregor')assert.ok(T.locate(corpus.gregor[r.unit-1].chunks.flatMap(c=>c.de.map(p=>p.text)).join(' '),r.anchor)>=0,t.id);
  }
  assert.ok(V.essay.some(s=>s.id==='juedisch'));assert.ok(V.tasks.find(t=>t.id==='sabbat').supplement);assert.ok(V.tasks.find(t=>t.id==='feind').supplement);
});
test('all authored texts downloadable and no irrelevant labels, generator or material-hub backlink',()=>{
  const html=fs.readFileSync(path.join(root,'kohelet-gregor.html'),'utf8'),js=fs.readFileSync(path.join(root,'scripts/kohelet-gregor.js'),'utf8');
  assert.doesNotMatch(html+js,/text.to.speech|text.to.speach|\btts\b|Vorlagenseite|lerncode\.html|heft65wl2\.html|materialien\.html/i);
  for(const name of ['kohelet-deutsch.pdf','gregor-deutsch.pdf','kohelet-hebraeisch-deutsch.pdf','gregor-griechisch-deutsch.pdf','begleittext.pdf','arbeitsauftraege.pdf','kohelet-deutsch.txt','gregor-deutsch.txt','begleittext.txt','arbeitsauftraege.txt'])assert.ok(fs.statSync(path.join(root,'material/kohelet',name)).size>100,name);
});
test('local work, checklist, reading location and slides round trip without credentials',()=>{
  const state=C.fresh();state.currentTask='schluss';state.answers.schluss={text:'Ein begründetes Urteil <script>kein HTML</script>',checks:[0,3],done:true};state.reading={work:'gregor',unit:8,mode:'parallel'};state.slide=34;
  assert.deepEqual(C.restore(C.backup(state)),state);assert.ok(C.answerText(state,V.tasks).includes(state.answers.schluss.text));
  const bad=C.backup(state);bad.data.answers.schluss.code='secret';assert.throws(()=>C.restore(bad));
  for(const mutate of [s=>s.reading.unit=9,s=>s.answers.invalid=C.blankAnswer(),s=>s.slide=NaN,s=>s.answers.schluss.text='x'.repeat(20001),s=>s.answers.schluss.checks=[0,0],s=>s.version=2]){const copy=structuredClone(state);mutate(copy);assert.throws(()=>C.validate(copy));}
});
test('shared presentation uses the same task data and every slide has an illustration',()=>{
  const js=fs.readFileSync(path.join(root,'scripts/kohelet-gregor.js'),'utf8');assert.ok(js.includes('...V.tasks.map'));assert.ok(js.includes('visual(s.visual)'));assert.equal(V.slides.length,19);
  const css=fs.readFileSync(path.join(root,'styles/kohelet-gregor.css'),'utf8');assert.ok(css.includes('.presentation-stage:fullscreen .presentation-bar'));assert.ok(css.includes('prefers-reduced-motion'));
});

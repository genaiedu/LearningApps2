const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../scripts/kunsttresor-core.js');
const curator=require('../scripts/kunst-kurator.js');
const knowledge=require('../data/kunst-glossar.json');
const archive=require('../data/kunstarchiv.json');
const titles=require('../data/kunst-titel-de.json');
const pool=archive.works.map(work=>({...work,titleDe:titles.titles[work.id]}));
const fixtures=[
  {id:'point',date:'1890',style:'Pointillismus',artist:'Georges Seurat',technique:'Öl auf Holz'},
  {id:'ren',date:'1500',style:'Renaissance',artist:'Sandro Botticelli',technique:'Tempera'},
  {id:'bar',date:'1650',style:'Barock',artist:'Rembrandt van Rijn',technique:'Radierung'},
  {id:'blue',date:'1912',style:'Der Blaue Reiter',artist:'Gabriele Münter',technique:'Öl auf Leinwand'}
].map(work=>({...work,title:'Testwerk '+work.id,imageId:'test-image',source:'https://example.org/work',medium:work.technique,styleOriginal:work.style,publicDomain:true,artistDeath:1900}));
function initial() {
  return {version:1,ids:fixtures.map(work=>work.id),options:Object.fromEntries(core.fields.map(field=>[field,fixtures.map(work=>work[field])])),choices:{},attemptLog:[],attempts:0,escaped:0,phase:'playing',recent:[]};
}
function answer(state,shifts={}) {
  for(const field of core.fields) for(const id of state.ids) state=core.choose(state,id,field,'');
  for(const field of core.fields) for(let index=0;index<4;index++) state=core.choose(state,state.ids[index],field,fixtures[(index+(shifts[field]||0))%4][field]);
  return state;
}
function swapDates(state) {
  state=answer(state); state=core.choose(state,'point','date','');state=core.choose(state,'ren','date','');
  state=core.choose(state,'point','date','1500');return core.choose(state,'ren','date','1890');
}
function allText(explanation) { return [explanation.opening,explanation.temporal,explanation.mistake,explanation.workNote,...explanation.sections.flatMap(section=>section.paragraphs)].join(' '); }
test('the 81 sourced profiles cover every technique and style of all 1505 works',()=>{
  assert.equal(Object.keys(knowledge.techniques).length,26);assert.equal(Object.keys(knowledge.styles).length,55);
  for(const group of ['techniques','styles']) for(const [name,profile] of Object.entries(knowledge[group])) {
    assert.ok(profile.definition&&profile.period&&profile.caution,name);assert.equal(profile.clues.length,3,name);
    assert.ok(profile.artists.length>=1,name);assert.ok(profile.sources.length>=1,name);
    for(const source of profile.sources) { assert.ok(knowledge.sources[source],source);assert.equal(new URL(knowledge.sources[source].url).protocol,'https:'); }
    if(profile.origin) assert.ok(Number.isInteger(profile.origin.year)&&profile.origin.statement,name);
  }
  for(const work of pool) assert.ok(knowledge.styles[work.style]&&knowledge.techniques[work.technique],work.id);
});
test('each work has a bounded explanation with actual names, date, both fields and sources',()=>{
  for(const work of pool) {
    const choices={[work.id]:Object.fromEntries(core.fields.map(field=>[field,work[field]]))};
    const state={ids:[work.id],escaped:1,phase:'unlocked',attempts:1,choices,review:{choices},attemptLog:[{attempt:1,choices}]};
    const explanation=curator.explain(work,state,knowledge,pool), text=allText(explanation);
    assert.equal(explanation.sections.length,2,work.id);assert.ok(text.includes(work.artist)&&text.includes(work.date),work.id);
    assert.deepEqual(new Set(explanation.sections.map(section=>section.answer)),new Set([work.style,work.technique]));
    assert.ok(explanation.sources.length>0,work.id);assert.ok(text.split(/\s+/).length<440,work.id);
    assert.doesNotMatch(text,/undefined|\[object Object\]|NaN/);
  }
});
test('no explanations or glossary data are exposed by the engine while playing',()=>{
  assert.equal(curator.explain(fixtures[0],initial(),knowledge,fixtures),null);
  assert.equal(curator.explain(fixtures[0],{...initial(),phase:'lost'},null,fixtures),null);
  const js=fs.readFileSync(require.resolve('../scripts/kunsttresor.js'),'utf8');
  assert.match(js,/function showArtGlossary[\s\S]*?if\(!state \|\| state.phase==='playing'\) return;/);
  assert.match(js,/function solutions\(\)[\s\S]*?if \(!state \|\| state.phase === 'playing'\) return;/);
});
test('the first-check chronology hint remains global, cryptic and based on checked answers',()=>{
  const unchecked=swapDates(initial());assert.equal(curator.roomHint(unchecked,knowledge),'');
  const checked=core.inspect(unchecked,fixtures).state,hint=curator.roomHint(checked,knowledge);
  assert.ok(hint.length>30);assert.doesNotMatch(hint,/\d|Testwerk|Pointillismus|Seurat|Renaissance|Botticelli|Blauer Reiter|Münter/);
  assert.equal(curator.roomHint(answer(checked),knowledge),hint,'editing does not silently recheck answers');
  const final=core.inspect(answer(checked),fixtures).state;
  assert.equal(curator.roomHint(final,knowledge),'');
  const explanation=curator.explain(fixtures[0],final,knowledge,fixtures);
  assert.match(explanation.temporal,/Pointillismus/);assert.match(explanation.temporal,/1500/);assert.match(explanation.temporal,/188/);
  assert.match(explanation.temporal,/ersten|erster|Zunächst|zunächst/);
});
test('near boundaries and vague eras do not get impossible-time hints',()=>{
  assert.ok(curator.temporalConflict({style:'Der Blaue Reiter',date:'1500'},knowledge));
  assert.equal(curator.temporalConflict({style:'Der Blaue Reiter',date:'1905'},knowledge),null);
  assert.equal(curator.temporalConflict({style:'Realismus',date:'1500'},knowledge),null);
  assert.equal(curator.temporalConflict({style:'Kubismus',date:'after 1500'},knowledge),null);
  assert.equal(curator.temporalConflict({style:'unknown',date:'1500'},knowledge),null);
});
test('dates account for abbreviated ranges, approximation, later frames and open dates',()=>{
  assert.deepEqual(curator.dateSpan('1457–60'),{min:1457,max:1460,approximate:false});
  assert.deepEqual(curator.dateSpan('ca. 1535'),{min:1530,max:1540,approximate:true});
  assert.deepEqual(curator.dateSpan('1890/95'),{min:1890,max:1895,approximate:false});
  assert.deepEqual(curator.dateSpan('1900–1'),{min:1900,max:1901,approximate:false});
  assert.deepEqual(curator.dateSpan('1880s'),{min:1880,max:1889,approximate:true});
  assert.deepEqual(curator.dateSpan('1500, frame 1700'),{min:1500,max:1500,approximate:false});
  assert.equal(curator.dateSpan('undatiert'),null);
  assert.equal(curator.stage('after 1500',knowledge.styles.Renaissance),'open');
  assert.equal(curator.stage('1800',knowledge.styles.Renaissance),'after');
});
test('both checks are immutable snapshots; corrections, regressions and loss are distinct',()=>{
  const first=core.inspect(swapDates(initial()),fixtures).state,firstCopy=JSON.stringify(first.attemptLog);
  const corrected=answer(first),final=core.inspect(corrected,fixtures).state;
  assert.equal(JSON.stringify(first.attemptLog),firstCopy);assert.equal(final.attemptLog.length,2);
  const outcome=curator.outcomes(fixtures[0],final,fixtures);
  assert.equal(outcome.firstCount,3);assert.equal(outcome.finalCount,4);assert.deepEqual(outcome.fixed,['date']);
  const regressed=core.inspect(answer(first,{technique:1}),fixtures).state;
  assert.equal(regressed.phase,'lost');assert.deepEqual(curator.outcomes(fixtures[0],regressed,fixtures).regressed,['technique']);
  assert.match(curator.explain(fixtures[0],regressed,knowledge,fixtures).opening,/zunächst|Zunächst|ursprüngliche|richtige Antwort|erste Zuordnung passte/);
  const loss=core.inspect(swapDates(first),fixtures).state;
  assert.equal(loss.phase,'lost');assert.equal(curator.outcomes(fixtures[0],loss,fixtures).soleObstacle,false);
  assert.match(curator.explain(fixtures[0],loss,knowledge,fixtures).opening,/Raum|Spielende|Runde|Tür|Schloss|Prüfung/);
});
test('saved history survives reload; old saves never invent a first attempt',()=>{
  const state=core.inspect(answer(core.inspect(swapDates(initial()),fixtures).state),fixtures).state;
  const restored=core.restore(JSON.parse(JSON.stringify(state)),fixtures);
  assert.deepEqual(restored.attemptLog,state.attemptLog);
  assert.deepEqual(curator.explain(fixtures[0],restored,knowledge,fixtures),curator.explain(fixtures[0],state,knowledge,fixtures));
  const legacy={...state};delete legacy.attemptLog;
  const old=core.restore(legacy,fixtures),explanation=curator.explain(fixtures[0],old,knowledge,fixtures);
  assert.equal(explanation.outcome.firstCount,null);assert.equal(explanation.temporal,'');assert.doesNotMatch(explanation.opening,/nicht aufging|ersten|erster|auf Anhieb/);
  const corrupt=core.restore({...state,attemptLog:[{attempt:1,choices:{}}]},fixtures);
  assert.equal(corrupt.phase,'unlocked');assert.deepEqual(corrupt.attemptLog,[]);
});
test('work replacement migrates both checked snapshots without changing past answers',()=>{
  const state=core.inspect(answer(core.inspect(swapDates(initial()),fixtures).state),fixtures).state;
  const previous=fixtures[0],replacement={...previous,id:'replacement',date:'1891'};
  const migrated=core.restoreUpdated(state,[replacement,...fixtures.slice(1)],[{id:replacement.id,previous}]);
  assert.equal(migrated.updated,true);assert.equal(migrated.newRoom,false);
  assert.equal(migrated.state.attemptLog[0].choices.replacement.date,'1500');
  assert.equal(migrated.state.attemptLog[1].choices.replacement.date,'1891');
  assert.equal(state.attemptLog[1].choices.point.date,'1890');
});
test('many stable narrative routes, varied openings and no identical adjacent introductions',()=>{
  const base=core.inspect(answer(initial()),fixtures).state,work=fixtures[0];
  const texts=new Set(),openings=new Set(),routes=new Set();
  for(let escaped=1;escaped<=120;escaped++) {
    const state={...base,escaped},explanation=curator.explain(work,state,knowledge,fixtures);
    texts.add(allText(explanation));openings.add(explanation.opening);routes.add(explanation.sections.map(section=>section.field).join(','));
    assert.deepEqual(explanation,curator.explain(work,state,knowledge,fixtures));
  }
  assert.ok(texts.size>=100,texts.size);assert.equal(openings.size,8);assert.equal(routes.size,2);
  const starts=fixtures.map(work=>curator.explain(work,base,knowledge,fixtures).opening.replace(/„[^“]+“/g,'[Werk]').replaceAll(work.artist,'[Name]'));
  assert.equal(new Set(starts).size,4);
});
test('specific museum work notes and archive claims do not invent a whole oeuvre',()=>{
  assert.ok(knowledge.workNotes['wd-Q698487'].sources.some(id=>new URL(knowledge.sources[id].url).hostname==='sammlung.belvedere.at'));
  const state={ids:['x'],escaped:0,phase:'lost',attempts:2,choices:{x:{}},review:{choices:{x:{}}}};
  const work={...fixtures[0],id:'x',artist:'Testname'};
  const text=allText(curator.explain(work,state,knowledge,[work]));
  assert.match(text,/einzelne Arbeit|offen|Œuvre/);assert.doesNotMatch(text,/typisch für Testname|seltenste|Epigone|erfand den Stil/);
});

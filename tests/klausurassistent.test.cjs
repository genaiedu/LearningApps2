const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const D=require('../scripts/klausurassistent-core.js'),root=path.resolve(__dirname,'..');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/klausurassistent-sources.js'),'utf8'),context);
const sources=context.window.KLAUSUR_SOURCES;
const state=overrides=>({subject:'chemie',version:'2022',phase:'Q2-GK',half:'2',mode:'abitur',year:'2026',minutes:'255',topics:'',aids:'',contextChoice:'ai',context:'',files:[],...overrides});
test('all three full Abitur modes use the verified GK/LK total including selection time',()=>{
  for(const subject of ['chemie','physik','biologie'])for(const phase of ['Q2-GK','Q2-LK'])for(const year of ['2026','2027','2028']){
    const info=D.duration(state({subject,phase,year,half:'1'}),sources);
    assert.equal(info.minutes,phase.endsWith('LK')?300:255);assert.equal(info.selection,true);assert.equal(info.provisional,false);assert.equal(info.source,'https://bass.schule.nrw/6083.htm');
  }
});
test('later cohorts receive a usable planning value without fabricated official confirmation',()=>{
  for(const subject of ['chemie','physik','biologie']){
    const s=state({subject,version:'2026',year:'2029',phase:'Q2-LK'}),info=D.duration(s,sources);
    assert.equal(info.minutes,300);assert.equal(info.provisional,true);assert.match(info.note,/nicht als verbindlich bestätigt/);assert.match(info.note,/keinen eigenen Nachweis/);
    const pre=D.duration({...s,mode:'school'},sources);assert.equal(pre.minutes,300);assert.equal(pre.provisional,true);
  }
  assert.equal(D.minimumYear(state({version:'2026'})),2029);
  assert.equal(D.proposal('exam-year',state({version:'2026'}),D.duration(state({version:'2026'}),sources)).value,'2030');
});
test('school exam durations remain subject-, phase- and half-year-specific',()=>{
  const school=overrides=>D.duration(state({mode:'school',phase:'Q1-GK',half:'1',...overrides}),sources).minutes;
  assert.equal(school({}),90);assert.equal(school({phase:'Q1-LK'}),135);assert.equal(school({subject:'physik',phase:'Q2-LK'}),225);
  assert.equal(school({subject:'biologie'}),110);assert.equal(school({subject:'biologie',half:'2'}),135);assert.equal(school({subject:'biologie',phase:'Q1-LK'}),155);assert.equal(school({subject:'biologie',phase:'Q1-LK',half:'2'}),180);
});
test('missing Abitur themes mean the entire official breadth, never confirmed teaching',()=>{
  for(const subject of ['chemie','physik','biologie']){
    const text=D.topics(state({subject}));assert.match(text,/Keine thematische Einschränkung/);assert.match(text,/vollständige prüfungsrelevante Breite/);assert.match(text,/keine Bestätigung des tatsächlich erteilten Unterrichts/);assert.match(text,/nicht allein wegen einer fehlenden Themenliste/);
    assert.ok(!D.completionIds(state({subject,aids:'Keine'}),[]).includes('topics'));
  }
});
test('school suggestions acknowledge missing teaching facts instead of inventing them',()=>{
  const s=state({mode:'school',phase:'EF'}),text=D.topics(s);
  assert.match(text,/Planungsentwurf/);assert.match(text,/keine konkreten Angaben/);assert.match(text,/Behaupte nicht/);assert.match(D.aids(s),/Originalvorgaben prüfen/);
  assert.equal(D.comparison('unspecified'),'nicht angegeben · keine bestätigte Aussage über frühere Klausuren');assert.equal(D.comparison('no'),'nein');assert.match(D.comparison('yes'),/^ja/);
});
test('completion proposes only missing or invalid fields and retains existing choices',()=>{
  const s=state({mode:'school',topics:'Elektrochemie',aids:'Nur Taschenrechner'}),copy=JSON.stringify(s);
  assert.deepEqual(D.completionIds(s,[]),[]);assert.equal(JSON.stringify(s),copy);
  const missing=state({mode:'school',topics:'',minutes:'',aids:'',contextChoice:'teacher'});
  assert.deepEqual(D.completionIds(missing,['minutes','topics']),['minutes','topics','aids','context']);
  const p=D.proposal('context',missing,D.duration(missing,sources));assert.equal(p.id,'context-choice');assert.equal(p.value,'ai');
  assert.equal(D.proposal('apps',missing,D.duration(missing,sources)),null);
});
test('the common UI replaces successive native errors with one editable completion dialog',()=>{
  const html=fs.readFileSync(path.join(root,'klausurassistent.html'),'utf8'),ui=fs.readFileSync(path.join(root,'scripts/klausurassistent.js'),'utf8');
  assert.match(html,/<form id="form" novalidate>/);assert.match(html,/id="fill-rest"/);assert.match(html,/id="completion-dialog"/);assert.match(html,/id="exam-year"/);
  for(const id of ['practice','previous','aids']){const control=html.match(new RegExp('<(?:select|textarea)[^>]*id="'+id+'"[^>]*>'))[0];assert.ok(!control.includes('required'));}
  assert.ok(!html.includes('duration-confirm'));assert.ok(!ui.includes('reportValidity'));
  assert.match(ui,/elements\]\.filter\(e=>e\.willValidate&&!e\.validity\.valid\)/);assert.match(ui,/topics'\)\.required=!isAbitur\(\)/);
  assert.ok(html.indexOf('klausurassistent-core.js')<html.indexOf('scripts/klausurassistent.js'));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const subject of ['chemie','physik','biologie'])assert.ok(fs.readFileSync(path.join(root,subject+'-curriculum.html'),'utf8').includes('klausurassistent.html?fach='+subject));
});

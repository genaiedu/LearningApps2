const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const E=require('../scripts/saeuren-basen-einstieg-core.js'),C=require('../scripts/saeuren-basen-core.js'),T=require('../scripts/saeuren-basen-aufgaben.js');
const root=path.join(__dirname,'..'),KEY='protonen-mission-einstieg-v1';
function setup(t,{saved,hash='',blocked=false}={}){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'saeuren-basen-mission.html'),'utf8'),{url:'https://test.invalid/LearningApps2/saeuren-basen-mission.html'+hash,runScripts:'outside-only'}),w=dom.window,q=s=>w.document.querySelector(s);
  w.matchMedia=()=>({matches:true,addEventListener(){}});w.requestAnimationFrame=()=>1;w.HTMLElement.prototype.scrollIntoView=function(){};
  w.AcidTypeset={replace(root,html){root.innerHTML=html;w.AcidNotation?.decorate(root);},update(root,write){write();},typeset(){return Promise.resolve();}};
  w.setTimeout=()=>1;w.clearTimeout=()=>{};
  const round=T.select(123456),full={version:3,seed:123456,ids:round.map(task=>task.id),answers:{[round[0].id]:{value:String(round[0].answer),attempts:1,done:true,solved:true}},lewis:false};
  w.localStorage.setItem('protonen-mission-v1',JSON.stringify(full));if(saved)w.localStorage.setItem(KEY,JSON.stringify(saved));
  if(blocked)Object.defineProperty(w,'localStorage',{get(){throw Error('Blocked storage');}});
  for(const file of ['schreibweise','core','rechenwege','transfer','aufgaben','titration','reaktionen','mission','vertiefung','navigation','einstieg-core','einstieg','titrationsstart'])w.eval(fs.readFileSync(path.join(root,'scripts/saeuren-basen-'+file+'.js'),'utf8'));
  t.after(()=>w.close());
  return {w,q,full,simple(){q('#acid-mode-switch').click();},state(){return JSON.parse(w.localStorage.getItem(KEY));},submit(slot,value){const input=q('#simple-input-'+slot);input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));q('#simple-task-'+slot+' form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));}};
}
test('six ordered lessons select 24 valid reproducible exercises with formulas and no Lewis prerequisite',()=>{
  assert.equal(E.lessons.length,6);assert.equal(E.slots.length,24);assert.equal(new Set(E.slots.map(s=>s.stem)).size,24);
  for(const seed of [0,1,123456,0xffffffff])for(const {stem,lesson} of E.slots){
    const task=E.task(stem,seed);assert.equal(task.lesson,lesson);assert.equal(task.prompt,E.task(stem,seed).prompt);assert.ok(E.accepts(task,String(task.answer)));assert.ok(!task.extension);
    if(task.kind==='number'){assert.ok(task.math.includes('\\['));assert.ok(task.symbols);assert.ok(task.calculationSteps.length);assert.ok(Number.isFinite(task.answer));}
  }
});
test('weak partner questions stay inside the root approximation and phosphate uses the stage factor',()=>{
  for(let seed=1;seed<=60;seed++){
    for(const stem of ['saeuren-1','basen-1']){const t=E.task(stem,seed),acid=stem.startsWith('saeuren'),c=t.parameters[acid?'cApproxAcid':'cApproxBase'],k=t.parameters[acid?'ka':'kb'];assert.ok(Math.sqrt(k*c)/c<=.05);}
    const task=E.task('titration-transfer_phosphate',seed),p=task.parameters;assert.ok(Math.abs(task.answer-p.j*p.c*p.volume/p.ct)<1e-10);assert.ok([1,2].includes(p.j));
  }
});
test('restoration validates state and roundings, dropping unknown or invalid solved entries',()=>{
  const item=E.task('ph-0',8),value=String(Number(item.answer.toPrecision(3)));
  assert.ok(E.accepts(item,value));assert.equal(E.restore({version:99},123).seed,123);
  const restored=E.restore({version:1,seed:8,mode:'simple',entries:{'ph-0':{value,solved:true,attempts:2},'ph-1':{value:'not a number',solved:true},unknown:{}}},9);
  assert.equal(restored.mode,'simple');assert.equal(restored.entries['ph-0'].solved,true);assert.equal(restored.entries['ph-1'].solved,false);assert.equal(restored.entries.unknown,undefined);
});
test('top switch keeps every full lesson, round, lab node and duplicate ID intact',t=>{
  const {w,q,simple,full}=setup(t),lab=q('#titration-lab'),reaction=q('#concept-lab'),fullBefore=w.localStorage.getItem('protonen-mission-v1');
  assert.equal(q('#acid-simple').hidden,true);simple();assert.equal(q('#acid-simple').hidden,false);assert.equal(q('#start').hidden,true);assert.equal(q('#reset-open').hidden,true);
  assert.equal(q('#simple-titration-slot').firstElementChild,lab);assert.equal(q('#simple-reaction-slot').firstElementChild,reaction);assert.equal(w.document.querySelectorAll('.simple-task').length,24);
  assert.equal(q('#simple-curve-chart').querySelectorAll('path').length,2);assert.equal(q('#simple-curve-chart').querySelectorAll('circle').length,2);assert.doesNotMatch(q('#simple-curve-chart').innerHTML,/NaN|Infinity/);
  const ids=Array.from(w.document.querySelectorAll('[id]'),el=>el.id);assert.equal(new Set(ids).size,ids.length);
  assert.equal(q('#acid-nav-links').querySelectorAll('a').length,7);assert.ok(q('#acid-nav-links a[href="#simple-puffer"]'));
  simple();assert.equal(q('#acid-simple').hidden,true);assert.equal(q('#start').hidden,false);assert.ok(q('#titration').contains(lab));assert.ok(q('#konzepte').contains(reaction));
  assert.equal(q('#score').textContent,'1 / 32');assert.equal(w.localStorage.getItem('protonen-mission-v1'),fullBefore);assert.deepEqual(JSON.parse(fullBefore).answers,full.answers);
  assert.ok(q('#acid-nav-links a[href="#puffer"]'));assert.equal(w.document.querySelectorAll('.task-card').length,32);
});
test('entry allows repeated mistakes, saves drafts, and reveals a complete solution only on request or success',t=>{
  const s=setup(t);s.simple();const slot='puffer-1',card=()=>s.q('#simple-task-'+slot),item=E.task(slot,s.state().seed);
  assert.equal(card().querySelector('.simple-solution').hidden,true);
  for(let i=0;i<4;i++)s.submit(slot,'99');assert.equal(card().querySelector('input').disabled,false);assert.equal(card().querySelector('.simple-solution').hidden,true);
  card().querySelectorAll('button')[1].click();assert.equal(card().querySelector('.simple-hint').hidden,false);assert.equal(card().querySelector('.simple-solution').hidden,true);
  s.submit(slot,String(item.answer));assert.equal(card().querySelector('input').disabled,true);assert.equal(card().querySelector('.simple-solution').hidden,false);
  assert.ok(card().querySelector('.math').textContent.includes('n_'));assert.match(s.q('#simple-progress').textContent,/1 \/ 24 geübt · 1 selbst gelöst/);assert.equal(s.state().entries[slot].value,String(item.answer));
});
test('solution access counts as practice, not independent success; closing it never loses practice',t=>{
  const s=setup(t);s.simple();const card=s.q('#simple-task-ph-0'),button=card.querySelectorAll('button')[2];button.click();
  assert.match(s.q('#simple-progress').textContent,/1 \/ 24 geübt · 0 selbst gelöst/);button.click();assert.equal(card.querySelector('.simple-solution').hidden,true);
  assert.match(s.q('#simple-progress').textContent,/1 \/ 24 geübt · 0 selbst gelöst/);assert.equal(s.state().entries['ph-0'].studied,true);
  s.submit('ph-0',String(E.task('ph-0',s.state().seed).answer));assert.match(s.q('#simple-progress').textContent,/1 \/ 24 geübt · 0 selbst gelöst/);
});
test('independently solved work stays independent after restoration and mode switching',t=>{
  const s=setup(t);s.simple();const item=E.task('ph-0',s.state().seed);s.submit('ph-0',String(item.answer));
  const reloaded=setup(t,{saved:s.state()});assert.match(reloaded.q('#simple-progress').textContent,/1 \/ 24 geübt · 1 selbst gelöst/);
  reloaded.simple();reloaded.simple();assert.match(reloaded.q('#simple-progress').textContent,/1 \/ 24 geübt · 1 selbst gelöst/);
});
test('new variant changes only its own card, leaves other drafts and full score intact',t=>{
  const s=setup(t);s.simple();s.submit('ph-1','99');const before=s.state().entries['ph-1'].value,full=s.w.localStorage.getItem('protonen-mission-v1'),card=s.q('#simple-task-ph-0');
  card.querySelectorAll('button')[2].click();card.querySelectorAll('button')[3].click();
  assert.notEqual(s.q('#simple-task-ph-0'),card);assert.equal(s.q('#simple-task-ph-0 .simple-solution').hidden,true);assert.equal(s.state().entries['ph-1'].value,before);assert.equal(s.w.localStorage.getItem('protonen-mission-v1'),full);
});
test('remembered mode and revealed work reload, but full deep links override the mode',t=>{
  const saved={version:1,seed:15,mode:'simple',entries:{'ph-1':{seed:15,value:'0,01',hint:true,revealed:true,attempts:1}}};
  const s=setup(t,{saved});assert.equal(s.q('#acid-simple').hidden,false);assert.equal(s.q('#simple-input-ph-1').value,'0,01');assert.equal(s.q('#simple-task-ph-1 .simple-solution').hidden,false);
  const full=setup(t,{saved,hash:'#ks-derivation'});assert.equal(full.q('#acid-simple').hidden,true);assert.equal(full.q('#saeuren').hidden,false);
});
test('hash navigation and explicit deep-reading links select the corresponding visible mode',t=>{
  const s=setup(t,{hash:'#simple-puffer'});assert.equal(s.q('#acid-simple').hidden,false);
  s.q('[data-full-target="blutpuffer"]').click();assert.equal(s.w.location.hash,'#blutpuffer');assert.equal(s.q('#puffer').hidden,false);assert.equal(s.q('#acid-mode-switch').getAttribute('aria-checked'),'false');
  s.w.history.replaceState(null,'','#simple-ph');s.w.dispatchEvent(new s.w.Event('hashchange'));assert.equal(s.q('#acid-simple').hidden,false);assert.equal(s.q('#ph').hidden,true);
});
test('blocked storage leaves both modes usable with a clear warning',t=>{
  const s=setup(t,{blocked:true});s.simple();assert.equal(s.q('#simple-storage-warning').hidden,false);assert.equal(s.w.document.querySelectorAll('.simple-task').length,24);s.simple();assert.equal(s.q('#start').hidden,false);
});
test('both learning modes explain the apparatus and experiment before the calculation, without hydronium shorthand',t=>{
  const s=setup(t);s.simple();
  assert.equal(s.w.document.querySelectorAll('.titration-primer').length,2);
  assert.ok(s.q('#simple-titration').contains(s.q('#simple-titrationsversuch')));
  for(const id of ['simple-titration','titration']){
    const section=s.q('#'+id),primer=section.querySelector('.titration-primer');assert.ok(primer);
    assert.ok(primer.compareDocumentPosition(section.querySelector(id==='titration'?'.two':'.simple-formulas'))&s.w.Node.DOCUMENT_POSITION_FOLLOWING);
    assert.match(primer.textContent,/bekannt/);assert.match(primer.textContent,/gesucht/);assert.match(primer.textContent,/Endpunkt ist nicht exakt Äquivalenzpunkt/);
    assert.doesNotMatch(primer.textContent,/(?<![\p{L}])h(?![\p{L}\p{N}])/u);
  }
  const visibleText=Array.from(s.w.document.querySelectorAll('.math')).map(el=>el.textContent).join('\n');
  assert.doesNotMatch(visibleText,/(?<![\p{L}])h(?![\p{L}\p{N}])/u);
});
test('the three illustrated stages change locally, use explicit states, and never alter the real experiment',t=>{
  const s=setup(t);s.simple();const primer=s.q('#simple-titration .titration-primer'),before=s.q('#tit-added-label').textContent,full=s.w.localStorage.getItem('protonen-mission-v1');
  for(const phase of ['adding','endpoint','ready']){
    primer.querySelector('[data-primer-phase="'+phase+'"]').click();assert.equal(primer.dataset.phase,phase);
    assert.equal(primer.querySelectorAll('[aria-pressed=true]').length,1);assert.match(primer.querySelector('.primer-scene-status').textContent,/Hahn/);
  }
  assert.equal(s.q('#tit-added-label').textContent,before);assert.equal(s.w.localStorage.getItem('protonen-mission-v1'),full);
});
test('the deliberate demonstration start opens the existing experiment, resets only that lab, and preserves task progress',t=>{
  const s=setup(t);s.simple();s.submit('ph-0',String(E.task('ph-0',s.state().seed).answer));const entryBefore=s.w.localStorage.getItem(KEY),fullBefore=s.w.localStorage.getItem('protonen-mission-v1');
  const lab=s.q('#titration-lab');s.q('#simple-titration [data-titration-start]').click();
  assert.equal(s.q('#simple-titrationsversuch').open,true);assert.equal(s.q('#titration-lab'),lab);assert.equal(s.q('#tit-substance').value,'hcl');assert.equal(s.q('#tit-indicator').value,'phenolphthalein');assert.equal(s.q('#tit-added-label').textContent,'0 mL');
  assert.equal(s.q('[data-practical=hcl]').getAttribute('aria-pressed'),'true');assert.equal(s.q('#tit-c-label').hidden,true);assert.equal(s.w.location.hash,'#simple-titrationsversuch');assert.equal(s.w.localStorage.getItem(KEY),entryBefore);assert.equal(s.w.localStorage.getItem('protonen-mission-v1'),fullBefore);
  s.simple();s.q('#titration [data-titration-start]').click();assert.equal(s.w.location.hash,'#titration-lab');assert.equal(s.q('#acid-simple').hidden,true);assert.equal(s.q('#titration-lab'),lab);
});

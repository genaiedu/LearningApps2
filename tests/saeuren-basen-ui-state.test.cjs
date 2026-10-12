// NODE_PATH=<jsdom node_modules> node --test tests/saeuren-basen-ui-state.test.cjs
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),root=path.join(__dirname,'..');
function setup(t){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'saeuren-basen-mission.html'),'utf8'),{url:'https://test.invalid/LearningApps2/',runScripts:'outside-only'}),w=dom.window,q=s=>w.document.querySelector(s),timers=[];
  w.matchMedia=()=>({matches:true,addEventListener(){}});w.HTMLElement.prototype.scrollIntoView=function(){};w.MathJax={typesetClear(){},typesetPromise(){return Promise.resolve();}};
  w.setTimeout=callback=>{timers.push(callback);return timers.length;};w.clearTimeout=()=>{};
  for(const file of ['saeuren-basen-core','saeuren-basen-rechenwege','saeuren-basen-aufgaben','saeuren-basen-titration','saeuren-basen-mission','saeuren-basen-vertiefung'])w.eval(fs.readFileSync(path.join(root,'scripts',file+'.js'),'utf8'));
  const click=id=>q('#'+id).click(),set=(id,value)=>{q('#'+id).value=String(value);q('#'+id).dispatchEvent(new w.Event('change',{bubbles:true}));},dose=(value,custom=false)=>{set(custom?'tit-dose-custom':'tit-dose',value);click('tit-add');assert.ok(q('#titration-lab').classList.contains('is-pouring'));timers.shift()();assert.ok(!q('#titration-lab').classList.contains('is-pouring'));};
  t.after(()=>w.close());return{w,q,click,set,dose,timers};
}
test('full curve, pH and calculations are immediately visible; overshoot never forces restart',t=>{
  const {q,dose}=setup(t);assert.ok(!q('#tit-analysis').hidden);assert.ok(!q('#tit-results').hidden);assert.ok(!q('#tit-point-math').hidden);assert.match(q('#flask-ph').textContent,/^pH /);
  const curve=()=>q('#titration-chart').querySelector('path[stroke-width="3"]');assert.ok(curve().getAttribute('d').length>5000);
  for(const d of [5,5,5,5,5,5,5])dose(d);
  assert.ok(!q('#tit-add').disabled);assert.equal(q('#tit-added-label').textContent,'35 mL');assert.doesNotMatch(q('#tit-status').textContent,/Wiederhole|übersprungen|Zu großer Schritt/);assert.ok(curve());
  assert.equal(q('#tit-measure'),null);assert.equal(q('#tit-next'),null);assert.equal(q('#tit-finish'),null);
});

test('page opens without disclaimer; Wikipedia stays consent-gated until an article is requested',async t=>{
  const {w,q}=setup(t),requests=[];
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  w.HTMLDialogElement.prototype.close=function(value){if(value!==undefined)this.returnValue=value;this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
  w.fetch=async url=>{requests.push(String(url));return{ok:true,json:async()=>({parse:{title:'Gilbert Newton Lewis',revid:1,text:'<p>Testartikel.</p>'}})};};
  w.eval(fs.readFileSync(path.join(root,'scripts','schroedinger-wikipedia.js'),'utf8'));
  assert.ok(!q('#consent').open);assert.ok(!w.document.documentElement.hasAttribute('data-awaiting-consent'));assert.equal(requests.length,0);
  q('[data-wiki="Gilbert Newton Lewis"]').click();assert.ok(q('#consent').open);assert.equal(requests.length,0);
  q('#consent').close('offline');await Promise.resolve();assert.equal(requests.length,0);assert.ok(!q('#wiki-reader').open);
  q('[data-wiki="Gilbert Newton Lewis"]').click();assert.ok(q('#consent').open);q('#consent').close('allow');
  for(let i=0;i<8;i++)await Promise.resolve();
  assert.equal(requests.length,1);assert.ok(requests[0].startsWith('https://de.wikipedia.org/w/api.php'));assert.ok(q('#wiki-reader').open);
});
test('slider returns to earlier volumes; point shortcuts, free doses and automatic pouring stay available',t=>{
  const {w,q,click,dose,timers}=setup(t);dose(5);q('#tit-added').value=2;q('#tit-added').dispatchEvent(new w.Event('input'));assert.equal(q('#tit-added-label').textContent,'2 mL');
  q('[data-point=eq]').click();assert.equal(q('#tit-added-label').textContent,'25 mL');assert.match(q('#flask-ph').textContent,/pH 7/);assert.match(q('#tit-point-math').textContent,/\\mathrm\{pH\}=7/);
  click('tit-play');assert.ok(q('#titration-lab').classList.contains('is-pouring'));assert.match(q('#tit-play').textContent,/Anhalten/);assert.ok(q('#titration-chart').querySelector('path[stroke-width="3"]'));
  click('tit-play');assert.ok(!q('#titration-lab').classList.contains('is-pouring'));assert.ok(!q('#tit-add').disabled);
  click('tit-reset');assert.equal(q('#tit-added-label').textContent,'0 mL');
});
test('all practice cases are selectable; phosphate consumption includes the chosen stoichiometric stage',t=>{
  const {w,q,click,set}=setup(t);
  for(const b of w.document.querySelectorAll('[data-practical]'))assert.ok(!b.disabled);
  q('[data-practical=phosphate2]').click();assert.ok(q('#tit-c-label').hidden);assert.ok(!q('#tit-endpoint').hidden);assert.ok(!q('#tit-analysis').hidden);
  set('tit-indicator','phenolphthalein');q('#tit-added').value=31;q('#tit-added').dispatchEvent(new w.Event('input'));click('tit-endpoint');
  assert.ok(!q('#practical-answer').hidden);assert.match(q('#practical-solution').textContent,/Stufe 2/);assert.ok(q('#practical-solution').textContent.includes('2\\,V_0'));assert.ok(q('#practical-solution').textContent.includes('0{,}062'));
  set('tit-indicator','bromthymol');assert.equal(q('#tit-added-label').textContent,'31 mL','indicator change must not reset volume');click('tit-endpoint');assert.match(q('#practical-solution').textContent,/nicht am gewünschten Sprung/);assert.ok(!q('#tit-add').disabled);
  q('[data-practical=phosphate1]').click();set('tit-indicator','bromocresol');q('#tit-added').value=15.5;q('#tit-added').dispatchEvent(new w.Event('input'));click('tit-endpoint');assert.match(q('#practical-solution').textContent,/Stufe 1/);
  click('tit-free');assert.ok(q('#practical-answer').hidden);assert.ok(!q('#tit-c-label').hidden);assert.ok(!q('#tit-substance').disabled);assert.ok(q('#tit-endpoint').hidden);
});
test('blood simplification appears only after hint request; solutions and Hagg remain separate',t=>{
  const {q,click}=setup(t);assert.ok(q('#blood-hint').hidden);assert.ok(q('#blood-solution').hidden);click('blood-hint-button');assert.ok(!q('#blood-hint').hidden);assert.match(q('#blood-hint').textContent,/starken einprotonigen Säure/);assert.ok(q('#blood-solution').hidden);click('blood-solution-button');assert.ok(!q('#blood-solution').hidden);assert.match(q('#blood-solution').textContent,/119/);assert.ok(q('#hagg-chart').querySelectorAll('path').length>10);
});

test('free portions work at very small equivalence volumes and negative inputs stay rejected',t=>{
  const {w,q,click,set,dose}=setup(t);set('tit-c',.001);set('tit-v',5);set('tit-ct',.2);
  dose(.03,true);assert.equal(q('#tit-added-label').textContent,'0,03 mL');assert.ok(!q('#tit-add').disabled);
  q('#tit-added').value=.02;q('#tit-added').dispatchEvent(new w.Event('input'));dose(.001,true);assert.equal(q('#tit-added-label').textContent,'0,021 mL');
  set('tit-dose-custom',-1);click('tit-add');assert.match(q('#tit-status').textContent,/positive Portionsgröße/);assert.ok(!q('#titration-lab').classList.contains('is-pouring'));
  dose(.1,true);assert.ok(Math.abs(Number(q('#tit-added').value)-.05)<1e-12,'large dose is bounded only by the chart extent');assert.ok(!q('#tit-add').disabled);assert.ok(q('#practical-answer').hidden);
});

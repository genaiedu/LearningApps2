// NODE_PATH=<jsdom node_modules> node --test tests/saeuren-basen-ui-state.test.cjs
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),root=path.join(__dirname,'..');
function setup(t){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'saeuren-basen-mission.html'),'utf8'),{url:'https://test.invalid/LearningApps2/',runScripts:'outside-only'}),w=dom.window,q=s=>w.document.querySelector(s),timers=[];
  w.matchMedia=()=>({matches:true,addEventListener(){}});w.HTMLElement.prototype.scrollIntoView=function(){};w.MathJax={typesetClear(){},typesetPromise(){return Promise.resolve();}};
  w.setTimeout=callback=>{timers.push(callback);return timers.length;};w.clearTimeout=()=>{};
  for(const file of ['saeuren-basen-core','saeuren-basen-rechenwege','saeuren-basen-aufgaben','saeuren-basen-titration','saeuren-basen-mission','saeuren-basen-vertiefung'])w.eval(fs.readFileSync(path.join(root,'scripts',file+'.js'),'utf8'));
  const click=id=>q('#'+id).click(),set=(id,value)=>{q('#'+id).value=String(value);q('#'+id).dispatchEvent(new w.Event('change',{bubbles:true}));},dose=(value,custom=false)=>{set(custom?'tit-dose-custom':'tit-dose',value);click('tit-add');assert.ok(q('#titration-lab').classList.contains('is-pouring'));timers.shift()();assert.ok(!q('#titration-lab').classList.contains('is-pouring'));};
  t.after(()=>w.close());return{w,q,click,set,dose};
}
test('flask-only trial hides pH and curve; overshoot locks doses until restart',t=>{
  const {q,click,dose}=setup(t);assert.ok(q('#tit-measurement').hidden);assert.ok(q('#tit-results').hidden);assert.equal(q('#flask-ph').textContent,'Indikator');
  for(const d of [5,5,5,5,5,5])dose(d);assert.ok(q('#tit-add').disabled);assert.match(q('#tit-status').textContent,/Zu großer Schritt/);click('tit-reset');assert.ok(!q('#tit-add').disabled);assert.equal(q('#tit-added-label').textContent,'0 mL');
});
test('successful visual endpoint, sufficient sampling and analysis are three distinct stages',t=>{
  const {q,click,dose}=setup(t);for(const d of [5,5,5,5,5,.05])dose(d);click('tit-endpoint');assert.ok(!q('#tit-next').hidden);assert.ok(q('#tit-results').hidden);
  click('tit-next');click('tit-measure');for(const d of [5,5,5,5,2,2,.5,.2,.2,.1,.1]){dose(d);click('tit-measure');}assert.ok(q('#tit-analysis').hidden);click('tit-finish');assert.ok(!q('#tit-analysis').hidden);assert.ok(!q('#tit-results').hidden);assert.ok(q('#titration-chart').querySelectorAll('circle').length>=10);assert.match(q('#tit-point-math').textContent,/\\frac/);
});
test('manual tasks require indicator choice and distinguish phosphate stage 1 from stage 2',t=>{
  const {q,click,set,dose}=setup(t);q('[data-practical=hcl]').click();assert.ok(!q('#indicator-preview').hidden);assert.ok(q('#tit-workspace').hidden);assert.ok(q('#tit-c-label').hidden);click('tit-begin');for(const d of [5,5,5,2,1,.5,.05])dose(d);click('tit-endpoint');assert.ok(!q('[data-practical=acetic]').disabled);
  q('[data-practical=acetic]').click();click('tit-begin');for(const d of [5,5,5,5,1,.5])dose(d);click('tit-endpoint');q('[data-practical=phosphate1]').click();set('tit-indicator','bromthymol');click('tit-begin');for(const d of [5,5,5,.5])dose(d);click('tit-endpoint');assert.match(q('#tit-status').textContent,/passt nicht/);assert.ok(q('[data-practical=phosphate2]').disabled);
  set('tit-indicator','bromocresol');click('tit-begin');for(const d of [5,5,5,.5])dose(d);click('tit-endpoint');q('[data-practical=phosphate2]').click();set('tit-indicator','phenolphthalein');click('tit-begin');for(const d of [5,5,5,5,5,5,1])dose(d);click('tit-endpoint');assert.match(q('#tit-status').textContent,/passend erfasst/);assert.match(q('#practical-solution').textContent,/Stufe 2/);assert.ok(q('#practical-solution').textContent.includes('2\\,V_0'));
});
test('blood simplification appears only after hint request; solutions and Hagg remain separate',t=>{
  const {q,click}=setup(t);assert.ok(q('#blood-hint').hidden);assert.ok(q('#blood-solution').hidden);click('blood-hint-button');assert.ok(!q('#blood-hint').hidden);assert.match(q('#blood-hint').textContent,/starken einprotonigen Säure/);assert.ok(q('#blood-solution').hidden);click('blood-solution-button');assert.ok(!q('#blood-solution').hidden);assert.match(q('#blood-solution').textContent,/119/);assert.ok(q('#hagg-chart').querySelectorAll('path').length>10);
});

test('free dose supports very small equivalence volumes without accepting gross overshoot',t=>{
  const {q,click,set,dose}=setup(t);set('tit-c',.001);set('tit-v',5);set('tit-ct',.2);dose(5);assert.ok(q('#tit-add').disabled);click('tit-reset');
  for(const value of [.01,.01,.001,.001,.001,.001,...Array(11).fill(.0001)])dose(value,true);
  click('tit-endpoint');assert.ok(!q('#tit-next').hidden);click('tit-next');assert.ok(q('#practical-answer').hidden,'free lab must not show manual-task answer');
  click('tit-measure');for(const value of [.01,.01,.001,.001,.001,.001,...Array(11).fill(.0001)]){dose(value,true);click('tit-measure');}click('tit-finish');assert.ok(!q('#tit-analysis').hidden);
});

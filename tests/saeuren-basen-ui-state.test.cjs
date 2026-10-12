// NODE_PATH=<jsdom node_modules> node --test tests/saeuren-basen-ui-state.test.cjs
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),root=path.join(__dirname,'..');
function setup(t,saved){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'saeuren-basen-mission.html'),'utf8'),{url:'https://test.invalid/LearningApps2/',runScripts:'outside-only'}),w=dom.window,q=s=>w.document.querySelector(s),timers=[];
  w.matchMedia=()=>({matches:true,addEventListener(){}});w.HTMLElement.prototype.scrollIntoView=function(){};w.MathJax={typesetClear(){},typesetPromise(){return Promise.resolve();}};
  // These tests cover immediate UI/calculation state; the real async renderer
  // and its startup/restore ordering are exercised in saeuren-basen-math.test.
  w.AcidTypeset={replace(root,html){root.innerHTML=html;w.AcidNotation?.decorate(root);},update(root,write){write();},typeset(){return Promise.resolve();}};
  w.setTimeout=callback=>{timers.push(callback);return timers.length;};w.clearTimeout=()=>{};
  if(saved)w.localStorage.setItem('protonen-mission-v1',JSON.stringify(saved));
  for(const file of ['saeuren-basen-schreibweise','saeuren-basen-core','saeuren-basen-rechenwege','saeuren-basen-transfer','saeuren-basen-aufgaben','saeuren-basen-titration','saeuren-basen-reaktionen','saeuren-basen-mission','saeuren-basen-vertiefung'])w.eval(fs.readFileSync(path.join(root,'scripts',file+'.js'),'utf8'));
  const click=id=>q('#'+id).click(),set=(id,value)=>{q('#'+id).value=String(value);q('#'+id).dispatchEvent(new w.Event('change',{bubbles:true}));},dose=(value,custom=false)=>{set(custom?'tit-dose-custom':'tit-dose',value);click('tit-add');assert.ok(q('#titration-lab').classList.contains('is-pouring'));timers.shift()();assert.ok(!q('#titration-lab').classList.contains('is-pouring'));};
  t.after(()=>w.close());return{w,q,click,set,dose,timers};
}
test('all learner-facing hydronium labels use the full concentration notation',t=>{
  const {q,set}=setup(t);
  const alias=/(?<![\p{L}])h(?![\p{L}\p{N}])/u;
  for(const id of ['hcl','acetic','ammonia','phosphoric']){
    set('tit-substance',id);
    for(const point of ['start','half','eq','after']){
      q('[data-point="'+point+'"]').click();
      const text=q('#tit-point-math').textContent;
      assert.doesNotMatch(text,alias,id+' / '+point);
      assert.ok(text.includes('c(\\mathrm{H_3O^+})'));
      assert.doesNotMatch(text,/c\(\\mathrm\{H_3O\^\+\}\)=c\(\\mathrm\{H_3O\^\+\}\)/);
    }
  }
  for(const id of ['eq-calculation','buf-calculation','hagg-derivation'])assert.doesNotMatch(q('#'+id).textContent,alias,id);
  for(const task of require('../scripts/saeuren-basen-aufgaben.js').bank(123456)){
    for(const key of ['prompt','hint','explanation','symbols','math'])if(task[key])assert.doesNotMatch(task[key],alias,task.id+' / '+key);
  }
});
test('changed square-root tasks migrate without discarding unrelated answers',t=>{
  const T=require('../scripts/saeuren-basen-aufgaben.js'),bank=T.bank(123456);
  const ids=T.groups.flatMap(([g])=>bank.filter(t=>t.group===g&&/^[^-]+-\d+-0$/.test(t.id)).slice(0,4).map(t=>t.id));
  const changed=ids.find(id=>/^(saeuren|basen)-1-/.test(id)),unchanged=ids.find(id=>id.startsWith('ph-'));
  assert.ok(changed);assert.ok(unchanged);
  const saved={version:1,seed:123456,ids,answers:{[changed]:{done:true},[unchanged]:{done:true}}};
  const {w}=setup(t,saved),restored=JSON.parse(w.localStorage.getItem('protonen-mission-v1'));
  assert.equal(restored.version,3);assert.equal(restored.answers[changed],undefined);assert.deepEqual(restored.answers[unchanged],{done:true});
});
test('phosphate and near-endpoint calculations replace invalid shortcuts with defined balances',t=>{
  const {w,q,set}=setup(t);
  set('tit-substance','phosphoric');q('[data-point=half]').click();
  assert.match(q('#tit-point-math').textContent,/Hier reicht die einfache Näherung nicht/);
  assert.ok(q('#tit-point-math').textContent.includes('α₀ bis α₃'));
  set('tit-substance','acetic');q('#tit-added').value=24.9999;q('#tit-added').dispatchEvent(new w.Event('input'));
  const text=q('#tit-point-math').textContent;
  assert.match(text,/Hier reicht die einfache Näherung nicht/);assert.doesNotMatch(text,/NaN|Infinity/);
  assert.ok(text.includes('c(\\mathrm{H_3O^+})+c_\\mathrm{Z}'));
});
test('round code is absent while a saved task set and its progress are preserved',t=>{
  const tasks=require('../scripts/saeuren-basen-aufgaben.js').select(123456);
  const saved={version:1,seed:123456,ids:tasks.map(t=>t.id),answers:{[tasks[0].id]:{attempts:1,value:String(tasks[0].answer),done:true,solved:true}}};
  const {w,q}=setup(t,saved),restored=JSON.parse(w.localStorage.getItem('protonen-mission-v1'));
  assert.equal(q('#round-code'),null);assert.equal(q('.dashboard').querySelectorAll(':scope > div').length,3);
  assert.equal(q('#score').textContent,'1 / 32');assert.equal(w.document.querySelectorAll('.task-card').length,32);
  assert.equal(restored.seed,saved.seed);assert.deepEqual(restored.ids,saved.ids);assert.deepEqual(restored.answers,saved.answers);
});
test('full curve, pH and calculations are immediately visible; overshoot never forces restart',t=>{
  const {q,dose}=setup(t);assert.ok(!q('#tit-analysis').hidden);assert.ok(!q('#tit-results').hidden);assert.ok(!q('#tit-point-math').hidden);assert.match(q('#flask-ph').textContent,/^pH /);
  const curve=()=>q('#titration-chart').querySelector('path[stroke-width="3"]');assert.ok(curve().getAttribute('d').length>5000);
  for(const d of [5,5,5,5,5,5,5])dose(d);
  assert.ok(!q('#tit-add').disabled);assert.equal(q('#tit-added-label').textContent,'35 mL');assert.doesNotMatch(q('#tit-status').textContent,/Wiederhole|übersprungen|Zu großer Schritt/);assert.ok(curve());
  assert.equal(q('#tit-measure'),null);assert.equal(q('#tit-next'),null);assert.equal(q('#tit-finish'),null);
});

test('point calculations define the initial sample amount and distinguish it from the titrant',t=>{
  const {q,set}=setup(t);set('tit-substance','acetic');q('[data-point=half]').click();
  let text=q('#tit-point-math').textContent;
  assert.ok(text.indexOf('n₀ ist die anfänglich eingesetzte Stoffmenge der Säure')<text.indexOf('Rechenansatz'));
  assert.ok(text.includes('n_0=c_0V_0'));assert.ok(text.includes('n_0=0{,}1\\ \\mathrm{mol/L}\\cdot0{,}025\\ \\mathrm{L}=0{,}0025\\ \\mathrm{mol}'));assert.ok(text.includes('n_\\mathrm{Maßlösung}=0{,}1\\ \\mathrm{mol/L}\\cdot0{,}0125\\ \\mathrm{L}=0{,}00125\\ \\mathrm{mol}'));
  assert.ok(text.includes('nicht die frei im Kolben verbliebenen Ionen'));
  set('tit-substance','ammonia');q('[data-point=half]').click();text=q('#tit-point-math').textContent;
  assert.ok(text.includes('anfänglich eingesetzte Stoffmenge der Base'));assert.ok(text.includes('zugegebene HCl'));
});

test('half-point explicitly shows acid pKa or base pKb, never an acid identity for strong or polyprotic samples',t=>{
  const {q,set}=setup(t),half=()=>{q('[data-point=half]').click();return q('#tit-point-math').textContent;};
  set('tit-substance','acetic');let text=half();
  assert.equal(q('#tit-added-label').textContent,'12,5 mL');
  assert.ok(text.includes('Halbäquivalenzpunkt (HÄP)'));
  assert.ok(text.includes('\\boxed{\\mathrm{pH(HÄP)}\\approx\\mathrm{p}K_\\mathrm{S}=4{,}76}'));
  assert.ok(text.includes('n(\\mathrm{HA})\\approx n_0-n_\\mathrm{umgesetzt}\\\\&=0{,}00125'));
  assert.ok(text.includes('n(\\mathrm{A^-})\\approx n_\\mathrm{umgesetzt}\\\\&=0{,}00125'));
  assert.ok(text.includes('vollständige\\ Bilanz'));
  set('tit-substance','formic');text=half();
  assert.ok(text.includes('\\boxed{\\mathrm{pH(HÄP)}\\approx\\mathrm{p}K_\\mathrm{S}=3{,}75}'));
  set('tit-substance','ammonia');text=half();
  assert.ok(text.includes('\\mathrm{pOH(HÄP)}&\\approx\\mathrm{p}K_\\mathrm{B}'));
  assert.ok(text.includes('\\boxed{\\mathrm{pH(HÄP)}\\approx\\mathrm{p}K_\\mathrm{W}-\\mathrm{p}K_\\mathrm{B}=14-4{,}75=9{,}25}'));
  for(const id of ['hcl','phosphoric']){
    set('tit-substance',id);text=half();
    assert.ok(!text.includes('\\boxed{\\mathrm{pH(HÄP)}\\approx\\mathrm{p}K_\\mathrm{S}'),id);
    assert.ok(text.includes('vollständige\\ Bilanz'),id);
  }
});

test('live equivalence names the conjugate partner, mixture volume and units of the inserted quantities',t=>{
  const {q,set}=setup(t);set('tit-substance','acetic');q('[data-point=eq]').click();
  let text=q('#tit-point-math').textContent;
  for(const meaning of ['bei Essigsäure ist das Acetat','Probe plus Maßlösung',
    'V_\\mathrm{gesamt}=V_0+V_\\mathrm{Ä}\\\\&=0{,}05\\ \\mathrm{L}',
    '\\frac{0{,}0025\\ \\mathrm{mol}}{0{,}05\\ \\mathrm{L}}',
    'pKB gehört zum konjugierten Partner, nicht zur Maßlösung',
    '\\mathrm{p}K_\\mathrm{B}(\\mathrm{A^-})=\\mathrm{p}K_\\mathrm{W}-\\mathrm{p}K_\\mathrm{S}=14-4{,}76=9{,}24'
  ])assert.ok(text.includes(meaning),meaning);
  set('tit-substance','ammonia');q('[data-point=eq]').click();text=q('#tit-point-math').textContent;
  assert.ok(text.includes('bei Ammoniak ist das Ammonium'));
  assert.ok(text.includes('\\mathrm{p}K_\\mathrm{S}(\\mathrm{BH^+})=\\mathrm{p}K_\\mathrm{W}-\\mathrm{p}K_\\mathrm{B}=14-4{,}75=9{,}25'));
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
  q('[data-point=eq]').click();assert.equal(q('#tit-added-label').textContent,'25 mL');assert.match(q('#flask-ph').textContent,/pH 7/);assert.ok(q('#tit-point-math').textContent.includes('\\mathrm{pH}=\\frac{\\mathrm{p}K_\\mathrm{W}}2=\\frac{14}{2}=7'));
  click('tit-play');assert.ok(q('#titration-lab').classList.contains('is-pouring'));assert.match(q('#tit-play').textContent,/Anhalten/);assert.ok(q('#titration-chart').querySelector('path[stroke-width="3"]'));
  click('tit-play');assert.ok(!q('#titration-lab').classList.contains('is-pouring'));assert.ok(!q('#tit-add').disabled);
  click('tit-reset');assert.equal(q('#tit-added-label').textContent,'0 mL');
});
test('all practice cases are selectable; phosphate consumption includes the chosen stoichiometric stage',t=>{
  const {w,q,click,set}=setup(t);
  for(const b of w.document.querySelectorAll('[data-practical]'))assert.ok(!b.disabled);
  q('[data-practical=phosphate2]').click();assert.ok(q('#tit-c-label').hidden);assert.ok(!q('#tit-endpoint').hidden);assert.ok(!q('#tit-analysis').hidden);
  set('tit-indicator','phenolphthalein');q('#tit-added').value=31;q('#tit-added').dispatchEvent(new w.Event('input'));click('tit-endpoint');
  assert.ok(!q('#practical-answer').hidden);assert.match(q('#practical-solution').textContent,/Stufe 2/);assert.ok(q('#practical-solution').textContent.includes('jV_0'));assert.ok(q('#practical-solution').textContent.includes('0{,}062'));assert.ok(q('#practical-solution').textContent.includes('j = 2'));
  set('tit-indicator','bromthymol');assert.equal(q('#tit-added-label').textContent,'31 mL','indicator change must not reset volume');click('tit-endpoint');assert.match(q('#practical-solution').textContent,/nicht am gewünschten Sprung/);assert.ok(!q('#tit-add').disabled);
  q('[data-practical=phosphate1]').click();set('tit-indicator','bromocresol');q('#tit-added').value=15.5;q('#tit-added').dispatchEvent(new w.Event('input'));click('tit-endpoint');assert.match(q('#practical-solution').textContent,/Stufe 1/);
  click('tit-free');assert.ok(q('#practical-answer').hidden);assert.ok(!q('#tit-c-label').hidden);assert.ok(!q('#tit-substance').disabled);assert.ok(q('#tit-endpoint').hidden);
});
test('blood simplification appears only after hint request; solutions and Hagg remain separate',t=>{
  const {q,click}=setup(t);assert.ok(q('#blood-hint').hidden);assert.ok(q('#blood-solution').hidden);click('blood-hint-button');assert.ok(!q('#blood-hint').hidden);assert.match(q('#blood-hint').textContent,/starken einprotonigen Säure/);assert.ok(q('#blood-solution').hidden);click('blood-solution-button');assert.ok(!q('#blood-solution').hidden);assert.match(q('#blood-solution').textContent,/119/);assert.ok(q('#hagg-chart').querySelectorAll('path').length>10);
});
test('equilibrium and buffer panels explain their quantities before symbolic and numeric working',t=>{
  const {w,q}=setup(t),setChange=value=>{q('#buf-change').value=value;q('#buf-change').dispatchEvent(new w.Event('input'));};
  const eq=q('#eq-calculation').textContent;
  assert.ok(eq.indexOf('c₀ ist die Anfangskonzentration')<eq.indexOf('K_\\mathrm{S}'));
  assert.ok(eq.includes('K_\\mathrm{S}=10^{-\\mathrm{p}K_\\mathrm{S}}'));
  assert.ok(eq.includes('\\mathrm{pH}=-\\lg c(\\mathrm{H_3O^+})'));
  setChange(-1);const buffer=q('#buf-calculation').textContent;
  assert.ok(buffer.indexOf('vorzeichenbehaftete Zugabe')<buffer.indexOf('n_{\\mathrm{HA},1}'));
  assert.ok(buffer.includes('n_{\\mathrm{HA},1}=n_{\\mathrm{HA},0}-\\Delta n'));
  assert.ok(buffer.includes('5\\ \\mathrm{mmol}-(-1\\ \\mathrm{mmol})=6\\ \\mathrm{mmol}'));
  setChange(12);assert.ok(q('#buf-calculation').textContent.includes('Puffergleichung wird hier nicht eingesetzt'));
});

test('free portions work at very small equivalence volumes and negative inputs stay rejected',t=>{
  const {w,q,click,set,dose}=setup(t);set('tit-c',.001);set('tit-v',5);set('tit-ct',.2);
  dose(.03,true);assert.equal(q('#tit-added-label').textContent,'0,03 mL');assert.ok(!q('#tit-add').disabled);
  q('#tit-added').value=.02;q('#tit-added').dispatchEvent(new w.Event('input'));dose(.001,true);assert.equal(q('#tit-added-label').textContent,'0,021 mL');
  set('tit-dose-custom',-1);click('tit-add');assert.match(q('#tit-status').textContent,/positive Portionsgröße/);assert.ok(!q('#titration-lab').classList.contains('is-pouring'));
  dose(.1,true);assert.ok(Math.abs(Number(q('#tit-added').value)-.05)<1e-12,'large dose is bounded only by the chart extent');assert.ok(!q('#tit-add').disabled);assert.ok(q('#practical-answer').hidden);
});
test('practice mode keeps the complete curve but conceals unknown amounts and calculation shortcuts until evaluation',t=>{
  const {w,q,click}=setup(t);
  for(const name of ['hcl','acetic','phosphate1','phosphate2']){
    q('[data-practical='+name+']').click();
    assert.ok(q('#titration-chart').querySelector('path[stroke-width="3"]').getAttribute('d').length>5000);
    assert.ok(q('#tit-point-math').hidden);assert.equal(q('#tit-point-math').textContent,'');
    assert.doesNotMatch(q('#tit-results').textContent,/Anfangsmenge|VÄ/);
    assert.ok(q('[data-point=eq]').hidden&&q('[data-point=eq]').disabled);
    assert.equal(q('#tit-added').max,'100');assert.equal(q('#tit-added').step,'0.05');
    assert.equal([...q('#titration-chart').querySelectorAll('text')].filter(e=>/ÄP/.test(e.textContent)).length,0);
    q('#tit-added').value=20;q('#tit-added').dispatchEvent(new w.Event('input'));click('tit-endpoint');
    assert.ok(!q('#tit-point-math').hidden);assert.match(q('#practical-solution').textContent,/Modellwert/);
    click('tit-reset');assert.ok(q('#tit-point-math').hidden);assert.ok(q('#practical-answer').hidden);
  }
});

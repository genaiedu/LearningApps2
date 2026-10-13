'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const core=require('../scripts/ki-auf-webseiten-core.js');
function setup(t,{blocked=false}={}){
  const dom=new JSDOM(read('ki-auf-webseiten.html'),{url:'https://test.invalid/LearningApps2/ki-auf-webseiten.html',runScripts:'outside-only'}),w=dom.window,q=selector=>w.document.querySelector(selector);
  let network=0;w.fetch=()=>{network++;throw Error('Explanation must never call a provider');};
  w.matchMedia=()=>({matches:false,addEventListener(){}});w.requestAnimationFrame=()=>1;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  if(blocked)Object.defineProperty(w,'localStorage',{get(){throw Error('storage blocked');}});
  w.eval(read('scripts/ki-auf-webseiten-core.js'));w.eval(read('scripts/ki-auf-webseiten.js'));w.eval(read('../LearningApps/atelier-tools.js'));
  t.after(()=>w.close());return{w,q,click:selector=>q(selector).click(),changeCase(value){q('#journey-case').value=value;q('#journey-case').dispatchEvent(new w.Event('change',{bubbles:true}));},network:()=>network};
}
test('five local scenarios distinguish success, repetition, disabled AI, outage and unfinished play',()=>{
  assert.deepEqual(Object.keys(core.cases),['solved','repeat','off','failure','playing']);
  for(const [name,steps] of Object.entries(core.cases)){
    assert.ok(Object.isFrozen(steps));assert.equal(steps.at(-1).done,true);
    for(const step of steps){assert.ok(step.title.length>10);assert.ok(step.text.length>50);assert.match(step.key,/nicht im Browser/);}
    if(['off','playing'].includes(name))assert.ok(steps.every(step=>step.node==='browser'));
    else for(const node of ['browser','server','model'])assert.ok(steps.some(step=>step.node===node));
  }
  assert.match(core.cases.repeat[1].text,/kein Beweis/);assert.match(core.cases.repeat.at(-1).example,/früheren Prüfung/);
  assert.match(core.cases.failure.at(-1).text,/nicht endlos/);
});
test('navigation is bounded and defaults to the first safe, local example',()=>{
  assert.equal(core.at('solved',-100).index,0);assert.equal(core.at('solved',100).index,5);
  assert.equal(core.at('untrusted',NaN).index,0);assert.equal(core.at('off',Infinity).index,0);
});
test('real page controls work through every scenario with zero API calls',t=>{
  const s=setup(t);assert.equal(s.q('#journey-back').disabled,true);
  for(const [scenario,steps] of Object.entries(core.cases)){
    s.changeCase(scenario);
    for(let i=0;i<steps.length;i++){
      assert.equal(s.q('#journey-title').textContent,steps[i].title);
      assert.equal(s.q('[aria-current="step"]').dataset.journeyNode,steps[i].node);
      assert.equal(s.q('#journey-next').disabled,i===steps.length-1);
      if(i<steps.length-1)s.click('#journey-next');
    }
    assert.equal(s.q('#journey-result').hidden,!steps.at(-1).example);
    s.click('#journey-reset');assert.equal(s.q('#journey-counter').textContent,'Schritt 1 von '+steps.length);
  }
  assert.equal(s.network(),0);
  const js=read('scripts/ki-auf-webseiten.js')+read('scripts/ki-auf-webseiten-core.js');
  assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/);
});
test('answers are revisable, explain mistakes and never need an AI service',t=>{
  const s=setup(t);
  for(const [question,correct,wrong] of [['secret','server','browser'],['origin','limits','safe'],['fallback','local','retry']]){
    const form=s.q('[data-question="'+question+'"]'),feedback=form.querySelector('.check-feedback');
    form.dispatchEvent(new s.w.Event('submit',{bubbles:true,cancelable:true}));assert.match(feedback.textContent,/Wähle zuerst/);
    for(const value of [wrong,correct]){
      const input=form.querySelector('[value="'+value+'"]');input.checked=true;input.dispatchEvent(new s.w.Event('change',{bubbles:true}));assert.equal(feedback.textContent,'');
      form.dispatchEvent(new s.w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(feedback.dataset.correct,String(value===correct));assert.ok(feedback.textContent.length>70);
    }
  }
  assert.equal(s.network(),0);
});
test('collapsible chapter menu closes on selection and Escape',t=>{
  const s=setup(t),menu=s.q('#chapter-menu');menu.open=true;s.click('#chapter-menu a');assert.equal(menu.open,false);
  menu.open=true;s.w.document.dispatchEvent(new s.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(menu.open,false);assert.equal(s.w.document.activeElement,menu.querySelector('summary'));
});
test('Graphit/light defaults and all ten appearances remain usable without browser storage',t=>{
  for(const blocked of [false,true]){
    const s=setup(t,{blocked});assert.equal(s.w.document.documentElement.dataset.palette,'graphite');assert.equal(s.w.document.documentElement.dataset.theme,'light');
    assert.deepEqual([...s.q('#design-palette').options].map(option=>option.value),['graphite','atelier','slate','plum','bordeaux']);
    for(const palette of ['graphite','atelier','slate','plum','bordeaux'])for(const theme of ['light','dark']){
      s.q('#design-palette').value=palette;s.q('#design-palette').dispatchEvent(new s.w.Event('change'));
      const radio=s.q('[name="design-theme"][value="'+theme+'"]');radio.checked=true;radio.dispatchEvent(new s.w.Event('change'));
      assert.equal(s.w.document.documentElement.dataset.palette,palette);assert.equal(s.w.document.documentElement.dataset.theme,theme);
    }
    assert.equal(s.w.document.querySelectorAll('.page-watermark').length,7);assert.equal(s.network(),0);
  }
});
test('public explanation does not claim a hidden endpoint, perfect CORS protection or a global IP quota',()=>{
  const html=read('ki-auf-webseiten.html'),text=html.toLowerCase();
  for(const phrase of ['nicht automatisch missbrauchssicher','keine Authentifizierung','kein globaler Tagesdeckel','nur pro laufender Serverinstanz','beweist weder','keine Kunstbilder','nicht automatisch den KI-Server'])assert.ok(text.includes(phrase.toLowerCase()),phrase);
  assert.ok(html.includes('keine Live-Prüfung'));assert.ok(html.includes('18 Sekunden'));assert.ok(html.includes('22 Sekunden'));assert.ok(html.includes('15 Minuten'));
  assert.match(html,/vorformulierte Beispiele/);assert.doesNotMatch(html,/gsk_[A-Za-z0-9]{8,}/);
});
test('cross-links are in the actual AI hub section and the art launch screen, with valid local assets and unique anchors',()=>{
  const dom=new JSDOM(read('ki-auf-webseiten.html')),doc=dom.window.document,ids=[...doc.querySelectorAll('[id]')].map(el=>el.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const anchor of doc.querySelectorAll('a[href^="#"]'))assert.ok(doc.getElementById(anchor.hash.slice(1)),anchor.href);
  for(const element of doc.querySelectorAll('script[src],link[rel="stylesheet"]')){
    const value=(element.getAttribute('src')||element.getAttribute('href')).split('?')[0];assert.ok(fs.existsSync(path.resolve(root,value)),value);assert.doesNotMatch(value,/^https?:/);
  }
  assert.ok(doc.querySelectorAll('a[href^="kunsttresor.html"]').length>=3);
  for(const anchor of doc.querySelectorAll('a[target="_blank"]'))assert.match(anchor.rel,/noopener/);
  const art=new JSDOM(read('kunsttresor.html')).window.document;
  assert.ok(art.querySelector('.launch-ai a[href="ki-auf-webseiten.html"]'));assert.ok(art.querySelector('.wiki-privacy a[href="ki-auf-webseiten.html"]'));
  const hub=new JSDOM(read('../LearningApps/heft65wl2.html')).window.document,section=hub.querySelector('#kuenstliche-intelligenz');
  assert.ok(section.querySelector('a[href="https://genaiedu.github.io/LearningApps2/ki-auf-webseiten.html"]'));
  assert.equal(section.querySelectorAll('.app-card:not(.app-card--placeholder)').length,4);assert.equal(section.querySelector('.section__count').textContent,'4 Anwendungen');
  dom.window.close();
});
test('editorial font originals retain German characters, ligatures and proportional oldstyle figures',()=>{
  const audit=JSON.parse(read('data/typografie-fontaudit.json'));
  for(const family of ['firasans','ebgaramond'])for(const file of audit.families.find(f=>f.id===family).files){
    assert.equal(file.germanMissing,'');for(const feature of ['liga','onum','pnum'])assert.ok(file.features.includes(feature));
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file.path))).digest('hex'),file.sha256);
  }
  assert.match(read('styles/app-editorial.css'),/font-variant-ligatures:common-ligatures/);
  assert.match(read('styles/app-editorial.css'),/oldstyle-nums proportional-nums/);
});

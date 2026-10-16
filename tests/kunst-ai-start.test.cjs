const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),AI_CONSENT='kunsttresor-ai-consent-v2',AI_ENABLED='kunsttresor-ai-enabled-v1';
const datasets=new Map(['kunstarchiv','kunstbilder','kunst-wikipedia','kunst-hauptwerke','kunst-titel-de','kunst-glossar','kunst-filmtexte'].map(name=>[name,JSON.parse(fs.readFileSync(path.join(root,'data',name+'.json'),'utf8'))]));
function completedRoom(){
  const core=require('../scripts/kunsttresor-core.js'),pool=datasets.get('kunstarchiv').works;let state=core.newState(pool);
  for(const id of state.ids)for(const field of core.fields)state=core.choose(state,id,field,pool.find(work=>work.id===id)[field]);
  return core.inspect(state,pool).state;
}
async function setup(t,{saved={},blocked=false,forgeryEveryRoom=false}={}){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'kunsttresor.html'),'utf8'),{url:'https://test.invalid/LearningApps2/kunsttresor.html',runScripts:'outside-only'}),w=dom.window,q=selector=>w.document.querySelector(selector),requests=[];
  for(const [key,value] of Object.entries(saved))w.localStorage.setItem(key,value);
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
  w.matchMedia=()=>({matches:true,addEventListener(){}});w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.HTMLElement.prototype.requestFullscreen=async function(){Object.defineProperty(w.document,'fullscreenElement',{configurable:true,value:this});};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  w.Audio=class{constructor(){this.paused=true;this.volume=1;this.currentTime=0;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}addEventListener(){}removeEventListener(){}};
  w.fetch=async(url,options={})=>{
    const name=String(url).match(/^data\/(kunst[^?]+)\.json/);
    if(name&&datasets.has(name[1]))return{ok:true,json:async()=>structuredClone(datasets.get(name[1]))};
    requests.push({url,options});return{ok:false,status:503}; // Never contact Groq in tests.
  };
  if(blocked)Object.defineProperty(w,'localStorage',{get(){throw Error('storage blocked');}});
  for(const file of ['scripts/kunsttresor-core.js','scripts/kunst-kurator.js','services/kunst-kurator/lib/kunst-ki.js','scripts/kunsttresor-ki-config.js','scripts/kunsttresor-progress.js','scripts/kunsttresor-history.js','scripts/kunsttresor-gallery.js','scripts/kunsttresor-gallery-ui.js','scripts/kunsttresor-save.js','scripts/kunsttresor-zoom.js','scripts/kunsttresor-intro.js','scripts/kunsttresor.js']){ w.eval(fs.readFileSync(path.join(root,file),'utf8')); if(file==='scripts/kunsttresor-ki-config.js') w.KunstKIConfig={...w.KunstKIConfig,forgeryEveryRoom}; }
  for(let i=0;i<15;i++)await Promise.resolve();
  assert.equal(q('#launch-dialog').open,true,'archive loaded and launch is visible');
  t.after(()=>w.close());return{w,q,requests,click:id=>q('#'+id).click(),changeAI(value){q('#launch-ai-switch').checked=value;q('#launch-ai-switch').dispatchEvent(new w.Event('change',{bubbles:true}));}};
}
test('first launch preselects the tutor, names its actual server model, and sends no request before start',async t=>{
  const s=await setup(t);assert.equal(s.q('#launch-ai-switch').checked,true);assert.equal(s.q('#launch-ai-state').textContent,'Ein');
  assert.match(s.q('.launch-ai').textContent,/GPT-OSS 120B von OpenAI/);assert.match(s.q('.launch-ai').textContent,/Groq/);assert.match(s.q('.launch-ai').textContent,/Vercel/);
  assert.match(s.q('#launch-start').textContent,/KI erlauben/);assert.match(s.q('#launch-skip').textContent,/KI erlauben/);assert.equal(s.requests.length,0);assert.equal(s.w.localStorage.getItem(AI_CONSENT),null);
  const server=fs.readFileSync(path.join(root,'services/kunst-kurator/api/feedback.js'),'utf8');assert.match(server,/model:'openai\/gpt-oss-120b'/);
  assert.equal(s.q('#launch-ai-switch').getAttribute('role'),'switch');
});
test('starting with the default grants the displayed choice, enables game toggles, but never requests feedback during play',async t=>{
  const s=await setup(t);s.click('launch-skip');for(let i=0;i<4;i++)await Promise.resolve();
  assert.equal(s.q('#launch-dialog').open,false);assert.equal(s.w.localStorage.getItem(AI_CONSENT),'yes');assert.equal(s.w.localStorage.getItem(AI_ENABLED),'yes');
  for(const button of s.w.document.querySelectorAll('[data-ai-toggle]'))assert.equal(button.getAttribute('aria-pressed'),'true');
  assert.equal(s.requests.length,0);assert.equal(s.q('#art-grid').hidden,false);
});
test('switching off before start removes AI from both start labels and stores an off choice',async t=>{
  const s=await setup(t);s.changeAI(false);assert.equal(s.q('#launch-ai-state').textContent,'Aus');
  assert.doesNotMatch(s.q('#launch-start').textContent,/KI/);assert.doesNotMatch(s.q('#launch-skip').textContent,/KI/);
  s.click('launch-skip');for(let i=0;i<4;i++)await Promise.resolve();
  assert.equal(s.w.localStorage.getItem(AI_CONSENT),'no');assert.equal(s.w.localStorage.getItem(AI_ENABLED),'no');assert.equal(s.requests.length,0);
  for(const button of s.w.document.querySelectorAll('[data-ai-toggle]'))assert.equal(button.getAttribute('aria-pressed'),'false');
});
test('saved off choices, including old explicit pauses and withdrawals, are never silently replaced',async t=>{
  for(const saved of [{[AI_ENABLED]:'no'},{[AI_ENABLED]:'no',[AI_CONSENT]:'yes'},{[AI_CONSENT]:'no'},{[AI_ENABLED]:'no',[AI_CONSENT]:'no'}]){
    const s=await setup(t,{saved});assert.equal(s.q('#launch-ai-switch').checked,false);assert.doesNotMatch(s.q('#launch-start').textContent,/KI/);assert.equal(s.requests.length,0);
  }
  const on=await setup(t,{saved:{[AI_ENABLED]:'yes',[AI_CONSENT]:'yes'}});assert.equal(on.q('#launch-ai-switch').checked,true);assert.equal(on.requests.length,0);
});
test('reading rules never grants AI; the alternate start route returns to the informed launch screen',async t=>{
  const s=await setup(t);s.click('launch-read');assert.equal(s.q('#launch-dialog').open,false);assert.equal(s.w.localStorage.getItem(AI_CONSENT),null);
  s.click('start-game');assert.equal(s.q('#launch-dialog').open,true);assert.equal(s.w.localStorage.getItem(AI_CONSENT),null);assert.equal(s.requests.length,0);
  s.click('launch-read');s.click('intro-replay');assert.equal(s.q('#launch-dialog').open,true);assert.equal(s.requests.length,0);
});
test('enabling a previously off choice still waits for an informed start even if the rules are opened instead',async t=>{
  const s=await setup(t,{saved:{[AI_ENABLED]:'no',[AI_CONSENT]:'no'}});s.changeAI(true);assert.equal(s.w.localStorage.getItem(AI_CONSENT),'no');
  s.click('launch-read');s.click('start-game');assert.equal(s.q('#launch-dialog').open,true);assert.equal(s.requests.length,0);
  s.click('launch-skip');assert.equal(s.w.localStorage.getItem(AI_CONSENT),'yes');assert.equal(s.requests.length,0);
});
test('off then on in the start screen stays a preference change, not a new request',async t=>{
  const s=await setup(t);s.changeAI(false);s.changeAI(true);assert.equal(s.q('#launch-ai-switch').checked,true);assert.equal(s.w.localStorage.getItem(AI_CONSENT),null);assert.equal(s.requests.length,0);
});
test('storage restrictions do not break the default switch or starting without AI',async t=>{
  const s=await setup(t,{blocked:true});assert.equal(s.q('#launch-ai-switch').checked,true);s.changeAI(false);s.click('launch-skip');
  assert.equal(s.q('#launch-dialog').open,false);assert.equal(s.requests.length,0);assert.equal(s.q('[data-ai-toggle]').getAttribute('aria-pressed'),'false');
});
test('the default tutor requests only after reveal and keeps complete program feedback when the service fails',async t=>{
  const s=await setup(t,{saved:{'kunsttresor-game-v1':JSON.stringify(completedRoom())}});assert.equal(s.requests.length,0);
  s.click('launch-skip');assert.equal(s.requests.length,0);s.click('show-solution');for(let i=0;i<15;i++)await Promise.resolve();
  assert.equal(s.requests.length,1);assert.equal(s.requests[0].options.method,'POST');assert.equal(s.q('#ai-intro').hidden,true);assert.match(s.q('#ai-status').textContent,/nicht verfügbar/);
  assert.equal(s.w.document.querySelectorAll('[data-curator-work]').length,4);
  for(const text of s.w.document.querySelectorAll('[data-curator-work]'))assert.ok(text.textContent.length>30);
  s.q('[data-ai-toggle]').click();assert.equal(s.w.localStorage.getItem(AI_ENABLED),'no');assert.equal(s.q('#launch-ai-switch').checked,false);assert.equal(s.requests.length,1);
});
test('an off choice never sends a result, even when a completed saved room is revealed',async t=>{
  const s=await setup(t,{saved:{[AI_ENABLED]:'no','kunsttresor-game-v1':JSON.stringify(completedRoom())}});s.click('launch-skip');s.click('show-solution');for(let i=0;i<10;i++)await Promise.resolve();
  assert.equal(s.requests.length,0);assert.match(s.q('#ai-status').textContent,/ausgeschaltet/);assert.equal(s.w.document.querySelectorAll('[data-curator-work]').length,4);
});

test('every-room forgery test is on by default, attempts live generation once and reports failed generation',async t=>{const s=await setup(t,{forgeryEveryRoom:true});s.click('launch-skip');for(let i=0;i<30;i++)await Promise.resolve();assert.equal(s.requests.filter(r=>r.url.endsWith('/api/forgery')).length,1);assert.equal(s.w.document.querySelectorAll('.forgery-flag').length,4);assert.match(s.q('#feedback').textContent,/vier Originale/);assert.ok(s.q('#start-here'));});

test('the grid stays concealed after three loads and is revealed together only after the fourth',async t=>{const s=await setup(t);s.click('launch-skip');const grid=s.q('#art-grid'),images=[...grid.querySelectorAll('img')];assert.equal(images.length,4);assert.equal(grid.style.visibility,'hidden');assert.equal(grid.inert,true);assert.equal(s.q('#room-loading').hidden,false);for(let i=0;i<3;i++){Object.defineProperty(images[i],'naturalWidth',{value:960,configurable:true});images[i].onload();assert.equal(grid.style.visibility,'hidden');}Object.defineProperty(images[3],'naturalWidth',{value:960,configurable:true});images[3].onload();assert.equal(grid.style.visibility,'visible');assert.equal(grid.inert,false);assert.equal(s.q('#room-loading').hidden,true);});

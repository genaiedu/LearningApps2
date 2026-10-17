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
  w.matchMedia=()=>({matches:true,addEventListener(){}});w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};w.scrollTo=()=>{};
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
  for(const file of ['scripts/kunsttresor-core.js','scripts/kunst-kurator.js','services/kunst-kurator/lib/kunst-ki.js','scripts/kunsttresor-ki-config.js','scripts/kunsttresor-progress.js','scripts/kunsttresor-history.js','scripts/kunsttresor-gallery.js','scripts/kunsttresor-gallery-ui.js','scripts/kunsttresor-save.js','scripts/kunsttresor-zoom.js','scripts/kunsttresor-intro.js','scripts/kunsttresor.js']){ w.eval(fs.readFileSync(path.join(root,file),'utf8')); if(file==='scripts/kunsttresor-ki-config.js') if(forgeryEveryRoom) w.KunstTresor.forgeryPlan=()=>({cooldown:0,generate:true}); }
  for(let i=0;i<15;i++)await Promise.resolve();
  assert.equal(q('#launch-dialog').open,true,'archive loaded and launch is visible');
  t.after(()=>w.close());return{w,q,requests,click:id=>q('#'+id).click(),changeAI(value){q('#launch-ai-switch').checked=value;q('#launch-ai-switch').dispatchEvent(new w.Event('change',{bubbles:true}));}};
}
test('first launch keeps the tutor off, names its actual server model, and sends no request before start',async t=>{
  const s=await setup(t);assert.equal(s.q('#launch-ai-switch').checked,false);assert.equal(s.q('#launch-ai-state').textContent,'Aus');
  assert.match(s.q('.launch-ai').textContent,/GPT-OSS 120B von OpenAI/);assert.match(s.q('.launch-ai').textContent,/Groq/);assert.match(s.q('.launch-ai').textContent,/Vercel/);
  assert.doesNotMatch(s.q('#launch-start').textContent,/KI erlauben/);assert.doesNotMatch(s.q('#launch-skip').textContent,/KI erlauben/);assert.equal(s.requests.length,0);assert.equal(s.w.localStorage.getItem(AI_CONSENT),null);
  const server=fs.readFileSync(path.join(root,'services/kunst-kurator/api/feedback.js'),'utf8');assert.match(server,/model:'openai\/gpt-oss-120b'/);
  assert.equal(s.q('#launch-ai-switch').getAttribute('role'),'switch');
});
test('explicitly enabling the tutor grants the displayed choice but never requests feedback during play',async t=>{
  const s=await setup(t);s.changeAI(true);s.click('launch-skip');for(let i=0;i<4;i++)await Promise.resolve();
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
test('reading rules and starting with the default off choice never grants AI',async t=>{
  const s=await setup(t);s.click('launch-read');assert.equal(s.q('#launch-dialog').open,false);assert.equal(s.w.localStorage.getItem(AI_CONSENT),null);
  s.click('start-game');assert.equal(s.q('#launch-dialog').open,false);assert.equal(s.w.localStorage.getItem(AI_CONSENT),null);assert.equal(s.requests.length,0);
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
  const s=await setup(t,{blocked:true});assert.equal(s.q('#launch-ai-switch').checked,false);s.changeAI(false);s.click('launch-skip');
  assert.equal(s.q('#launch-dialog').open,false);assert.equal(s.requests.length,0);assert.equal(s.q('[data-ai-toggle]').getAttribute('aria-pressed'),'false');
});
test('the enabled tutor requests only after reveal and keeps complete program feedback when the service fails',async t=>{
  const s=await setup(t,{saved:{'kunsttresor-game-v1':JSON.stringify(completedRoom())}});assert.equal(s.requests.length,0);
  s.changeAI(true);s.click('launch-skip');assert.equal(s.requests.length,0);s.click('show-solution');for(let i=0;i<15;i++)await Promise.resolve();
  assert.equal(s.requests.length,1);assert.equal(s.requests[0].options.method,'POST');assert.equal(s.q('#ai-intro').hidden,true);assert.match(s.q('#ai-status').textContent,/nicht verfügbar/);
  assert.equal(s.w.document.querySelectorAll('[data-curator-work]').length,4);
  for(const text of s.w.document.querySelectorAll('[data-curator-work]'))assert.ok(text.textContent.length>30);
  s.q('[data-ai-toggle]').click();assert.equal(s.w.localStorage.getItem(AI_ENABLED),'no');assert.equal(s.q('#launch-ai-switch').checked,false);assert.equal(s.requests.length,1);
});
test('an off choice never sends a result, even when a completed saved room is revealed',async t=>{
  const s=await setup(t,{saved:{[AI_ENABLED]:'no','kunsttresor-game-v1':JSON.stringify(completedRoom())}});s.click('launch-skip');s.click('show-solution');for(let i=0;i<10;i++)await Promise.resolve();
  assert.equal(s.requests.length,0);assert.match(s.q('#ai-status').textContent,/ausgeschaltet/);assert.equal(s.w.document.querySelectorAll('[data-curator-work]').length,4);
});

test('a scheduled forgery attempts generation once and never announces an all-original fallback',async t=>{const s=await setup(t,{forgeryEveryRoom:true});s.click('launch-skip');for(let i=0;i<30;i++)await Promise.resolve();assert.equal(s.requests.filter(r=>r.url.endsWith('/api/forgery')).length,1);assert.equal(s.w.document.querySelectorAll('.forgery-flag').length,4);assert.doesNotMatch(s.q('#feedback').textContent,/KI|Fälschung|Nachahmung|Originale/);assert.ok(s.q('#start-here'));});

test('the grid stays concealed after three loads and is revealed together only after the fourth',async t=>{const s=await setup(t);s.click('launch-skip');const grid=s.q('#art-grid'),images=[...grid.querySelectorAll('img')];assert.equal(images.length,4);assert.equal(grid.style.visibility,'hidden');assert.equal(grid.inert,true);assert.equal(s.q('#room-loading').hidden,false);for(let i=0;i<3;i++){Object.defineProperty(images[i],'naturalWidth',{value:960,configurable:true});images[i].onload();assert.equal(grid.style.visibility,'hidden');}s.w.Date.now=()=>Date.now()+11000;Object.defineProperty(images[3],'naturalWidth',{value:960,configurable:true});images[3].onload();assert.equal(grid.style.visibility,'visible');assert.equal(grid.inert,false);assert.equal(s.q('#room-loading').hidden,true);});

test('even four cached loaded images stay concealed for the first ten seconds',async t=>{const s=await setup(t);s.click('launch-skip');for(const image of s.q('#art-grid').querySelectorAll('img')){Object.defineProperty(image,'naturalWidth',{value:960,configurable:true});image.onload();}assert.equal(s.q('#art-grid').style.visibility,'hidden');assert.equal(s.q('#room-loading').hidden,false);});

test('the curator compares original and forgery, offers a download, and removes the old image when moving on',async t=>{const saved=completedRoom(),id=saved.ids[0];saved.forgery={id,image:'data:image/jpeg;base64,/9j/',prompt:'Historical style description'};saved.forgeryMarks={[id]:true};const s=await setup(t,{saved:{'kunsttresor-game-v1':JSON.stringify(saved)}});s.click('launch-skip');s.click('show-solution');const comparison=s.q('.forgery-comparison');assert.ok(comparison);assert.equal(comparison.querySelectorAll('img').length,2);assert.ok(comparison.querySelector('img[src^="data:image/"]'));const download=comparison.querySelector('a[download]');assert.ok(download.download.includes(id));assert.equal(download.href,saved.forgery.image);s.click('next-room');for(let i=0;i<10;i++)await Promise.resolve();assert.equal(s.q('#solutions').children.length,0);const next=JSON.parse(s.w.localStorage.getItem('kunsttresor-game-v1'));assert.equal(next.forgery,undefined);assert.ok(!s.w.document.querySelector('img[src="'+saved.forgery.image+'"]'));});

test('image actions share one layout row without unusable hearts in the quiz',async t=>{const s=await setup(t);s.click('launch-skip');for(const card of s.w.document.querySelectorAll('.art-card')){assert.equal(card.children.length,4);assert.ok(card.children[2].classList.contains('artwork-actions'));assert.ok(card.children[2].querySelector('.forgery-flag'));assert.equal(card.children[2].querySelector('.gallery-like'),null);assert.ok(card.children[2].querySelector('.joker-use'));assert.ok(card.children[3].classList.contains('assignments'));}});
test('a correct check automatically opens the curator, with a next-room button',async t=>{const s=await setup(t);s.click('launch-skip');const state=JSON.parse(s.w.localStorage.getItem('kunsttresor-game-v1')),works=datasets.get('kunstarchiv').works;s.w.Date.now=()=>Date.now()+11000;for(const image of s.q('#art-grid').querySelectorAll('img')){Object.defineProperty(image,'naturalWidth',{value:960,configurable:true});image.onload();}for(const id of state.ids)for(const field of ['date','style','artist','technique']){const select=s.w.document.querySelector('select[data-work="'+id+'"][data-field="'+field+'"]');select.value=works.find(w=>w.id===id)[field];select.dispatchEvent(new s.w.Event('change'));}s.click('check');assert.equal(s.q('#solution-dialog').open,true);assert.equal(s.q('#result-dialog').open,false);assert.equal(s.q('#solution-next').hidden,false);});
test('forged works receive factual original notes and a marking result, never personalized original-recognition prose',async t=>{const saved=completedRoom(),id=saved.ids[0];saved.forgery={id,image:'data:image/jpeg;base64,/9j/'};saved.forgeryMarks={[id]:true};saved.attemptLog[0].forgeryMarks={[id]:true};const s=await setup(t,{saved:{'kunsttresor-game-v1':JSON.stringify(saved)}});s.click('launch-skip');s.click('show-solution');assert.match(s.q('.curator-forgery-result').textContent,/ersten Prüfung/);assert.equal(s.w.document.querySelector('[data-curator-work="'+id+'"]'),null);assert.match(s.q('.curator-forgery-result').parentElement.textContent,/Das Original zeigen wir dir erst jetzt/);});

test('loading a new room resets both the fullscreen scroll position and the page position immediately',async t=>{const saved=completedRoom(),s=await setup(t,{saved:{'kunsttresor-game-v1':JSON.stringify(saved)}}),calls=[];s.q('#spiel').scrollIntoView=options=>calls.push(options);s.click('launch-skip');s.q('#spiel').scrollTop=900;s.click('next-room');assert.equal(s.q('#spiel').scrollTop,0);assert.ok(calls.length>0);assert.ok(calls.every(call=>call.behavior==='instant'&&call.block==='start'));assert.equal(s.q('#room-loading').hidden,false);});

test('private gallery and film remain reachable from both the game and the automatic curator',async t=>{const saved=completedRoom(),s=await setup(t,{saved:{'kunsttresor-game-v1':JSON.stringify(saved)}});s.click('launch-skip');assert.equal(s.q('#game-gallery').disabled,false);s.click('game-gallery');assert.equal(s.q('#gallery-dialog').open,true);s.q('#gallery-dialog').close();s.click('show-solution');for(const id of ['solution-gallery','solution-gallery-bottom']){assert.equal(s.q('#'+id).disabled,false);s.click(id);assert.equal(s.q('#gallery-dialog').open,true);assert.ok(s.q('#gallery-play'));assert.ok(s.q('#gallery-edit-open'));s.q('#gallery-dialog').close();assert.equal(s.q('#solution-dialog').open,true);}});

test('winning starts the next forgery during curator reading and advancing reuses the in-flight room',async t=>{
 const saved=completedRoom();saved.phase='playing';saved.attempts=0;saved.escaped=0;saved.attemptLog=[];delete saved.review;saved.forgeryPrepared=true;saved.forgeryEveryRoom=true;
 const s=await setup(t,{forgeryEveryRoom:true,saved:{'kunsttresor-game-v1':JSON.stringify(saved)}});s.changeAI(false);s.click('launch-skip');
 s.w.Date.now=()=>Date.now()+11000;
 for(const image of s.q('#art-grid').querySelectorAll('img')){Object.defineProperty(image,'naturalWidth',{value:960,configurable:true});image.onload();}
 let finish;const calls=[];s.w.fetch=(url,options)=>{calls.push({url,options});return new Promise(resolve=>{finish=resolve;});};
 s.click('check');assert.equal(s.q('#solution-dialog').open,true);assert.equal(calls.length,1);assert.match(calls[0].url,/forgery$/);
 const selected=JSON.parse(calls[0].options.body).id;
 s.click('solution-next');assert.equal(calls.length,1);assert.ok(JSON.parse(s.w.localStorage.getItem('kunsttresor-game-v1')).ids.includes(selected));assert.equal(s.q('#art-grid').style.visibility,'hidden');
 finish({ok:false});for(let i=0;i<20;i++)await Promise.resolve();assert.equal(calls.length,1);assert.doesNotMatch(s.q('#feedback').textContent,/KI|Fälschung|Nachahmung|Originale/);
});

test('legacy test preferences and config cannot activate an every-room test',async t=>{
 const s=await setup(t,{saved:{'kunsttresor-forgery-test-v1':'yes'}});
 assert.equal(s.q('#forgery-test-switch'),null);s.click('launch-skip');
 for(let i=0;i<20;i++)await Promise.resolve();
 assert.equal(s.requests.filter(r=>r.url.endsWith('/api/forgery')).length,0);
});
test('the sticky curator next button advances a won room and stays hidden after a loss',async t=>{
 const saved=completedRoom(),s=await setup(t,{saved:{'kunsttresor-game-v1':JSON.stringify(saved)}});s.click('launch-skip');s.click('show-solution');
 const button=s.q('.curator-gallery-access #solution-next-bottom');assert.ok(button);assert.equal(button.hidden,false);
 s.click('solution-next-bottom');assert.equal(s.q('#solution-dialog').open,false);assert.equal(JSON.parse(s.w.localStorage.getItem('kunsttresor-game-v1')).phase,'playing');
 const lost={...saved,phase:'lost',attempts:2};const other=await setup(t,{saved:{'kunsttresor-game-v1':JSON.stringify(lost)}});other.click('launch-skip');other.click('show-solution');assert.equal(other.q('#solution-next-bottom').hidden,true);
});

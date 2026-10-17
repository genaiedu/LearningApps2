const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),{webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const data=Object.fromEntries(['kunstarchiv','kunstbilder','kunst-wikipedia','kunst-hauptwerke','kunst-titel-de','kunst-glossar','kunst-filmtexte'].map(name=>[name,JSON.parse(read('data/'+name+'.json'))]));
const model=vm.createContext({KunstWallEnabled:true,crypto:webcrypto});
for(const file of ['core','progress','history','gallery'])vm.runInContext(read('scripts/kunsttresor-'+file+'.js'),model);
const pool=data.kunstarchiv.works.map(w=>({...w,artistIdentity:data['kunst-wikipedia'].artists[w.artist].language+':'+data['kunst-wikipedia'].artists[w.artist].title}));
function fixture(attempts=1){
 const c=model.KunstTresor;let s=c.newState(pool);s.roomToken='a'.repeat(32);s.historyToken=s.roomToken;s.runToken='b'.repeat(32);s.parentRoomToken=null;
 let h=model.KunstHistory.fresh();for(const id of s.ids)h=model.KunstHistory.track(h,s,pool,{shownId:id});
 for(let n=1;n<=attempts;n++){
  for(const field of c.fields)for(const id of s.ids)s=c.choose(s,id,field,'');
  const ids=[...s.ids];for(const [i,id]of ids.entries())for(const field of c.fields)s=c.choose(s,id,field,pool.find(w=>w.id===ids[(i+(n===attempts?0:1))%7])[field]);
  s=c.inspect(s,pool).state;h=model.KunstHistory.track(h,s,pool);
 }
 return JSON.parse(JSON.stringify({s,h}));
}
async function setup(t,{state,history,gallery,preferences={},forgeryResponse,url='https://example.test/kunsttresor.html'}={}){
 const dom=new JSDOM(read('kunsttresor.html'),{url,runScripts:'outside-only'}),w=dom.window,q=s=>w.document.querySelector(s),requests=[];
 w.localStorage.setItem('kunsttresor-images-v2','yes');
 for(const [key,value]of Object.entries(preferences))w.localStorage.setItem(key,value);
 if(state)w.localStorage.setItem('kunsttresor-game-v1-wall',JSON.stringify(state));
 if(history)w.localStorage.setItem('kunsttresor-history-v1-wall',JSON.stringify(history));
 if(gallery)w.localStorage.setItem('kunsttresor-wall-gallery-v1',JSON.stringify(gallery));
 w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.scrollTo=()=>{};
 w.matchMedia=()=>({matches:true,addEventListener(){}});w.ResizeObserver=class{observe(){}};w.requestAnimationFrame=()=>0;w.cancelAnimationFrame=()=>{};
 w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLElement.prototype.requestFullscreen=async()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.Audio=class{constructor(){this.paused=true;this.volume=1;this.currentTime=0;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}addEventListener(){}removeEventListener(){}};
 if(forgeryResponse)w.Image=function(){const img=w.document.createElement('img');Object.defineProperty(img,'src',{get(){return img.getAttribute('src');},set(value){img.setAttribute('src',value);if(value.startsWith('data:'))queueMicrotask(()=>img.onload?.());}});return img;};
 w.fetch=async(url,options={})=>{
  const name=String(url).match(/^data\/(kunst[^?]+)\.json/);if(name&&data[name[1]])return{ok:true,json:async()=>structuredClone(data[name[1]])};
  requests.push({url,options});if(String(url).endsWith('/api/forgery'))return forgeryResponse?forgeryResponse(url,options):{ok:false,status:503};
  const input=JSON.parse(options.body);
  return{ok:true,text:async()=>JSON.stringify({intro:'Wir betrachten die sieben Werke gemeinsam und gehen ihren gestalterischen Spuren nach.',works:input.room.ids.map(id=>({id,text:'Deine Zuordnungen sind ein Ausgangspunkt für den zweiten Blick. Prüfe die beschriebenen Merkmale am Werk und vergleiche die belegte Technik mit dem sichtbaren Eindruck.'}))})};
 };
 const files=['scripts/kunsttresor-mode.js','scripts/kunsttresor-layout.js','scripts/kunsttresor-core.js','scripts/kunst-kurator.js','services/kunst-kurator/lib/kunst-ki.js','scripts/kunsttresor-ki-config.js','scripts/kunsttresor-progress.js','scripts/kunsttresor-history.js','scripts/kunsttresor-gallery.js','scripts/kunsttresor-gallery-ui.js','scripts/kunsttresor-save.js','scripts/kunsttresor-zoom.js','scripts/kunsttresor-intro.js','scripts/kunsttresor.js','scripts/kunsttresor-wall.js'];
 for(const file of files)w.eval(read(file));
 for(let i=0;i<30;i++)await Promise.resolve();
 assert.equal(q('#launch-dialog').open,true);t.after(()=>w.close());return{w,q,requests,click:id=>q('#'+id).click()};
}
const secretKey='kunsttresor-forgery-every-series-v1',gameKey='kunsttresor-game-v1-wall';
const settle=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
const generated=(image='data:image/jpeg;base64,/9j/')=>({ok:true,json:async()=>({image,model:'test model'})});
const roomOf=app=>JSON.parse(app.w.localStorage.getItem(gameKey));
function solveWall(app){
 const elapsed=60000*(roomOf(app).escaped+1);app.w.Date.now=()=>Date.now()+elapsed;
 for(const img of app.q('#art-grid').querySelectorAll('img')){Object.defineProperty(img,'naturalWidth',{value:600,configurable:true});Object.defineProperty(img,'naturalHeight',{value:400,configurable:true});img.onload();}
 for(const select of app.q('#art-grid').querySelectorAll('select')){select.value=pool.find(w=>w.id===select.dataset.work)[select.dataset.field];select.dispatchEvent(new app.w.Event('change',{bubbles:true}));}
 const forgery=roomOf(app).forgery;if(forgery)app.q('#art-grid [data-id="'+forgery.id+'"] .forgery-flag').click();
 app.click('check');
}
test('03 is a persistent secret switch; it makes no request before a room starts and can restore rare mode',async t=>{
 const app=await setup(t);assert.equal(app.q('#forgery-secret').tagName,'BUTTON');assert.equal(app.q('#forgery-secret').getAttribute('aria-pressed'),'false');
 app.click('launch-read');app.click('forgery-secret');assert.equal(app.requests.length,0);assert.equal(app.q('#forgery-secret').textContent,'03');
 assert.equal(app.q('#forgery-secret').getAttribute('aria-pressed'),'true');assert.match(app.q('#forgery-frequency').textContent,/jeder neuen Bilderserie/);
 const again=await setup(t,{preferences:{[secretKey]:app.w.localStorage.getItem(secretKey)}});assert.equal(again.q('#forgery-secret').getAttribute('aria-pressed'),'true');
 again.click('forgery-secret');assert.equal(again.w.localStorage.getItem(secretKey),'no');assert.match(again.q('#forgery-frequency').textContent,/jedem siebten/);
});
test('a newly prepared but unentered first room gets one forgery and so does each following room',async t=>{
 const app=await setup(t,{forgeryResponse:async()=>generated()});app.click('launch-skip');assert.equal(app.requests.length,0);
 app.click('forgery-secret');await settle();app.click('start-game');
 for(let i=0;i<3;i++){
  await settle();const room=roomOf(app);assert.equal(room.forgeryEverySeries,true);assert.ok(room.ids.includes(room.forgery.id));
  assert.equal(app.q('#art-grid').querySelectorAll('img[src^="data:"]').length,1);assert.equal(room.attempts,0);
  solveWall(app);assert.equal(roomOf(app).phase,'unlocked');app.click('solution-next');
 }
 await settle();assert.equal(app.requests.filter(r=>r.url.endsWith('/api/forgery')).length,4);assert.equal(app.w.localStorage.getItem('kunsttresor-forgery-cooldown-v3'),'5');
});
test('a failed mandatory forgery waits for a successful retry without consuming a check or substituting originals',async t=>{
 let count=0;const app=await setup(t,{preferences:{[secretKey]:'yes'},forgeryResponse:async()=>++count===1?{ok:false,status:503}:generated()});
 app.click('launch-skip');app.click('start-game');await settle();const ids=roomOf(app).ids;
 assert.equal(app.q('#art-grid').hidden,true);assert.equal(app.q('#lock-panel').hidden,true);assert.equal(app.q('#retry-forgery').hidden,false);
 assert.equal(app.q('#room-loading').hidden,true);assert.equal(roomOf(app).attempts,0);
 app.click('retry-forgery');await settle();assert.equal(app.q('#art-grid').hidden,false);assert.equal(app.q('#retry-forgery').hidden,true);
 assert.deepEqual(roomOf(app).ids,ids);assert.ok(roomOf(app).forgery);assert.equal(roomOf(app).attempts,0);assert.equal(count,2);
});
test('switching the secret on never changes a started or restored room, even when it has no answers yet',async t=>{
 const app=await setup(t,{forgeryResponse:async()=>generated()});app.click('launch-skip');app.click('start-game');const before=roomOf(app);
 app.click('forgery-secret');await settle();assert.deepEqual(roomOf(app),before);assert.equal(app.requests.length,0);
 const again=await setup(t,{state:before,preferences:{[secretKey]:'yes'},forgeryResponse:async()=>generated()});again.click('launch-skip');await settle();assert.deepEqual(roomOf(again).ids,before.ids);assert.equal(roomOf(again).forgery,undefined);assert.equal(again.requests.length,0);
});
test('stale image generation cannot overwrite a fresh secret request or a switched-off room',async t=>{
 const pending=[];const app=await setup(t,{forgeryResponse:()=>new Promise(resolve=>pending.push(resolve))});app.click('launch-skip');
 app.click('forgery-secret');await settle();assert.equal(pending.length,1);
 app.click('forgery-secret');app.click('forgery-secret');await settle();assert.equal(pending.length,2);
 pending[1](generated('data:image/jpeg;base64,Yg=='));await settle();assert.equal(roomOf(app).forgery.image,'data:image/jpeg;base64,Yg==');
 pending[0](generated('data:image/jpeg;base64,YQ=='));await settle();assert.equal(roomOf(app).forgery.image,'data:image/jpeg;base64,Yg==');
 app.click('forgery-secret');await settle();assert.equal(roomOf(app).forgery,undefined);assert.equal(roomOf(app).forgeryEverySeries,false);
});
test('opening an artwork by scrolling to the wall also protects it from later secret toggles',async t=>{
 const app=await setup(t,{forgeryResponse:async()=>generated()});app.click('launch-skip');
 const picture=app.q('#art-grid .artwork-button');picture.disabled=false;picture.click();const before=roomOf(app);
 app.click('forgery-secret');await settle();assert.deepEqual(roomOf(app),before);assert.equal(app.requests.length,0);
});
test('changing the secret setting discards a prefetched next room, including its late image response',async t=>{
 let finishNext;const app=await setup(t,{preferences:{[secretKey]:'yes'},forgeryResponse:()=>finishNext===undefined?(finishNext=null,Promise.resolve(generated())):new Promise(resolve=>{finishNext=resolve;})});
 app.click('launch-skip');await settle();app.click('start-game');solveWall(app);await settle();assert.equal(typeof finishNext,'function');
 app.click('forgery-secret');app.click('solution-next');await settle();const fresh=roomOf(app);assert.equal(fresh.forgeryEverySeries,false);assert.equal(fresh.forgery,undefined);
 finishNext(generated('data:image/jpeg;base64,b2xk'));await settle();assert.deepEqual(roomOf(app),fresh);
});
test('the base URL and old mode bookmarks all use the seven-work white wall',async t=>{
 for(const suffix of ['', '?modus=wand','?modus=klassisch']){
  const app=await setup(t,{url:'https://example.test/kunsttresor.html'+suffix});
  assert.equal(app.w.KunstWallEnabled,true);assert.ok(app.w.document.documentElement.classList.contains('kunst-wall'));
  app.click('launch-skip');assert.equal(app.q('#art-grid').children.length,7);
 }
});
test('all seven works can be liked after a third-attempt win, stored and restored',async t=>{
 const {s,h}=fixture(3);assert.equal(s.phase,'unlocked');assert.equal(s.attempts,3);
 const app=await setup(t,{state:s,history:h});app.click('launch-skip');app.click('show-solution');
 const buttons=[...app.q('#solutions').querySelectorAll('[data-gallery-like]')];assert.equal(buttons.length,7);
 for(const b of buttons){assert.equal(b.disabled,false);b.click();assert.equal(b.getAttribute('aria-pressed'),'true');}
 const saved=JSON.parse(app.w.localStorage.getItem('kunsttresor-wall-gallery-v1'));assert.equal(saved.liked.length,7);
 app.click('solution-gallery');assert.equal(app.q('#gallery-dialog').open,true);assert.equal(app.q('#gallery-grid').children.length,7);
 assert.equal(app.q('#gallery-grid').querySelectorAll('.gallery-card-details').length,7);
 const grid=app.q('#gallery-grid'),cards=[...grid.children];Object.defineProperty(grid,'clientWidth',{value:1200});
 cards.forEach((card,i)=>{card.getBoundingClientRect=()=>({height:180+i*37});});app.w.dispatchEvent(new app.w.Event('resize'));
 const boxes=cards.map((card,i)=>({x:parseFloat(card.style.left),y:parseFloat(card.style.top),w:parseFloat(card.style.width),h:Math.max(180+i*37,parseFloat(card.querySelector('.gallery-image').style.height))}));
 assert.ok(Math.abs(Math.max(...boxes.map(b=>b.x+b.w))-1200)<.01,'collection fills the complete width');
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.x+a.w<=b.x+.01||b.x+b.w<=a.x+.01||a.y+a.h<=b.y+.01||b.y+b.h<=a.y+.01,'pictures never overlap');}
 const again=await setup(t,{state:s,history:h,gallery:saved});again.click('launch-skip');again.click('game-gallery');assert.equal(again.q('#gallery-grid').children.length,7);
});
test('the tutor can be enabled for the first time from the curator after starting without AI',async t=>{
 const {s,h}=fixture(3),app=await setup(t,{state:s,history:h});assert.equal(app.q('#launch-ai-switch').checked,false);
 app.click('launch-skip');app.click('show-solution');assert.equal(app.requests.length,0);
 app.q('#solution-dialog [data-ai-toggle]').click();assert.equal(app.q('#ai-dialog').open,true);assert.equal(app.requests.length,0);
 app.click('ai-enable');for(let i=0;i<30;i++)await Promise.resolve();
 assert.equal(app.requests.length,1);const input=JSON.parse(app.requests[0].options.body);
 assert.equal(input.room.ids.length,7);assert.equal(input.room.attempts,3);assert.equal(input.room.attemptLog.length,3);
 assert.equal(app.q('#ai-intro').hidden,false);assert.equal(app.q('#solutions').querySelectorAll('.is-ai').length,7);
 assert.equal(app.w.localStorage.getItem('kunsttresor-ai-consent-v2-wall'),'yes');
 app.q('#solution-dialog [data-ai-toggle]').click();assert.equal(app.requests.length,1);assert.equal(app.q('#ai-intro').hidden,true);
});
test('the feedback service accepts seven-work technique quotas and a third attempt',async()=>{
 const ki=require('../services/kunst-kurator/lib/kunst-ki.js'),curator=require('../scripts/kunst-kurator.js'),{createHandler}=require('../services/kunst-kurator/api/feedback.js');
 const {s}=fixture(3),input=ki.payload(s,{events:[]}),ctx=ki.context(input,pool,data['kunst-glossar'],curator);assert.equal(ctx.works.length,7);
 assert.equal(input.room.fieldCount,5);assert.ok(ctx.works.every(w=>w.outcome.total===5&&w.outcome.finalCount===5&&w.currentEncounter.finalCorrectFields.includes('title')));
 const texts={intro:'Wir gehen noch einmal gemeinsam zu diesen sieben Werken und betrachten ihre gestalterischen Merkmale.',works:s.ids.map(id=>({id,text:'Die dokumentierten Werkangaben geben uns einen Ausgangspunkt. Vergleiche die Merkmale der Technik mit dem sichtbaren Eindruck und lies die Hinweise des Kurators.'}))};
 const handler=createHandler({env:{GROQ_API_KEY:'test-only',AI_ENABLED:'true'},sources:{pool,knowledge:data['kunst-glossar'],curator},fetcher:async()=>({ok:true,text:async()=>JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(texts)}}]})})});
 const res={code:null,body:null,setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{origin:'https://genaiedu.github.io','content-type':'application/json'},body:input},res);
 assert.equal(res.code,200);assert.equal(res.body.works.length,7);
 const bad=structuredClone(input),ids=bad.room.ids;bad.room.choices[ids[0]].technique=bad.room.choices[ids[1]].technique;
 if(pool.find(w=>w.id===ids[0]).technique!==pool.find(w=>w.id===ids[1]).technique)assert.throws(()=>ki.validatePayload(bad,pool));
});
test('title assignments use localized options without revealing the correct label on the wall or in the inspector',async t=>{
 const app=await setup(t);app.click('launch-skip');
 assert.equal(app.q('#art-grid').querySelectorAll('select').length,35);
 assert.equal(app.q('#art-grid').querySelectorAll('select[data-field="title"]').length,7);
 const card=app.q('#art-grid .art-card'),work=pool.find(w=>w.id===card.dataset.id);
 assert.equal(card.querySelector('.work-title').textContent,'Beschriftung gesucht');
 assert.equal(card.querySelector('.work-title').title,'Beschriftung gesucht');
 assert.equal(card.querySelector('img').alt,'Werk A · zu untersuchende Kunstabbildung');
 assert.equal(card.querySelector('.artwork-button').getAttribute('aria-label'),'Werk A vergrößern');
 const select=card.querySelector('select[data-field="title"]'),option=[...select.options].find(o=>o.value===work.title);
 assert.equal(option.textContent,data['kunst-titel-de'].titles[work.id]);
 card.querySelector('.artwork-button').disabled=false;card.querySelector('.artwork-button').click();
 assert.equal(app.q('#zoom-image').alt,'Vergrößerte Ansicht: Werk A');
 assert.equal(app.q('#wall-work-title').textContent,'Werk A · Beschriftung gesucht');
 assert.equal(app.q('#wall-work-controls select').dataset.field,'title');
});
test('two swapped titles prevent winning and collecting, then can be corrected without losing the other 28 answers',()=>{
 const c=model.KunstTresor;let s=c.newState(pool);s.roomToken='c'.repeat(32);s.runToken='d'.repeat(32);
 for(const [i,id]of s.ids.entries())for(const f of c.fields)s=c.choose(s,id,f,pool.find(w=>w.id===(f==='title'&&i<2?s.ids[1-i]:id))[f]);
 let h=model.KunstHistory.fresh();for(const id of s.ids)h=model.KunstHistory.track(h,s,pool,{shownId:id});
 let checked=c.inspect(s,pool);s=checked.state;h=model.KunstHistory.track(h,s,pool);
 assert.equal(checked.correct,33);assert.equal(s.phase,'playing');
 assert.equal(model.KunstGallery.winningRoom({...s,phase:'unlocked'},pool),false);
 assert.deepEqual(JSON.parse(JSON.stringify(h.rooms[0].checks[0])),[15,15,31,31,31,31,31]);
 for(const id of s.ids.slice(0,2))s=c.choose(s,id,'title','');
 for(const id of s.ids.slice(0,2))s=c.choose(s,id,'title',pool.find(w=>w.id===id).title);
 checked=c.inspect(s,pool);s=checked.state;h=model.KunstHistory.track(h,s,pool);
 assert.equal(checked.correct,35);assert.equal(s.phase,'unlocked');assert.equal(s.attempts,2);
 assert.ok(c.restore(JSON.parse(JSON.stringify(s)),pool));assert.ok(model.KunstHistory.restore(JSON.parse(JSON.stringify(h))));
 const gallery=model.KunstGallery.like(model.KunstGallery.fresh(),s.ids[0],s,pool);
 assert.ok(model.KunstGallery.restore(gallery,pool,h));
 assert.equal(model.KunstHistory.summarize(h,s.ids,'other')[0].lastChecked.fieldCount,5);
 assert.match(model.KunstHistory.note(model.KunstHistory.summarize(h,s.ids,'other')[0]),/alle fünf/);
 const save=require('../scripts/kunsttresor-save.js'),profile=model.KunstProgress.recordWin(model.KunstProgress.fresh(),s,pool).profile;
 const restored=save.validate(JSON.parse(JSON.stringify({app:'kunsttresor',version:1,savedAt:Date.now(),state:s,best:1,progress:profile,history:h,gallery})),pool,[],c,model.KunstProgress,model.KunstHistory,model.KunstGallery);
 assert.equal(restored.state.options.title.length,7);assert.equal(restored.history.rooms[0].fieldCount,5);assert.equal(restored.gallery.liked.length,1);
});
test('earlier 28-answer rooms and their collected works remain valid; the next room has 35 answers',async t=>{
 const {s,h}=fixture(1);delete s.options.title;
 for(const choices of [s.choices,s.review.choices,...s.attemptLog.map(e=>e.choices)])for(const id of s.ids)delete choices[id].title;
 for(const room of h.rooms){delete room.fieldCount;room.checks=room.checks.map(check=>check?.map(mask=>mask&15));}
 const gallery=model.KunstGallery.like(model.KunstGallery.fresh(),s.ids[0],s,pool);
 assert.ok(model.KunstTresor.restore(s,pool));assert.ok(model.KunstGallery.restore(gallery,pool,h));
 const app=await setup(t,{state:s,history:h,gallery});app.click('launch-skip');
 assert.equal(app.q('#art-grid').querySelectorAll('select').length,28);
 assert.match(app.q('#archive-update').textContent,/Ab dem nächsten Raum/);
 app.click('next-room');assert.equal(app.q('#art-grid').querySelectorAll('select').length,35);assert.equal(app.q('#archive-update').hidden,true);
 assert.equal(app.q('#gallery-count').textContent,'1');
});

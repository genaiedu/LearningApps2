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
async function setup(t,{state,history,gallery,url='https://example.test/kunsttresor.html'}={}){
 const dom=new JSDOM(read('kunsttresor.html'),{url,runScripts:'outside-only'}),w=dom.window,q=s=>w.document.querySelector(s),requests=[];
 w.localStorage.setItem('kunsttresor-images-v2','yes');
 if(state)w.localStorage.setItem('kunsttresor-game-v1-wall',JSON.stringify(state));
 if(history)w.localStorage.setItem('kunsttresor-history-v1-wall',JSON.stringify(history));
 if(gallery)w.localStorage.setItem('kunsttresor-wall-gallery-v1',JSON.stringify(gallery));
 w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.scrollTo=()=>{};
 w.matchMedia=()=>({matches:true,addEventListener(){}});w.ResizeObserver=class{observe(){}};w.requestAnimationFrame=()=>0;w.cancelAnimationFrame=()=>{};
 w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLElement.prototype.requestFullscreen=async()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.Audio=class{constructor(){this.paused=true;this.volume=1;this.currentTime=0;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}addEventListener(){}removeEventListener(){}};
 w.fetch=async(url,options={})=>{
  const name=String(url).match(/^data\/(kunst[^?]+)\.json/);if(name&&data[name[1]])return{ok:true,json:async()=>structuredClone(data[name[1]])};
  requests.push({url,options});const input=JSON.parse(options.body);
  return{ok:true,text:async()=>JSON.stringify({intro:'Wir betrachten die sieben Werke gemeinsam und gehen ihren gestalterischen Spuren nach.',works:input.room.ids.map(id=>({id,text:'Deine Zuordnungen sind ein Ausgangspunkt für den zweiten Blick. Prüfe die beschriebenen Merkmale am Werk und vergleiche die belegte Technik mit dem sichtbaren Eindruck.'}))})};
 };
 const files=['scripts/kunsttresor-mode.js','scripts/kunsttresor-layout.js','scripts/kunsttresor-core.js','scripts/kunst-kurator.js','services/kunst-kurator/lib/kunst-ki.js','scripts/kunsttresor-ki-config.js','scripts/kunsttresor-progress.js','scripts/kunsttresor-history.js','scripts/kunsttresor-gallery.js','scripts/kunsttresor-gallery-ui.js','scripts/kunsttresor-save.js','scripts/kunsttresor-zoom.js','scripts/kunsttresor-intro.js','scripts/kunsttresor.js','scripts/kunsttresor-wall.js'];
 for(const file of files)w.eval(read(file));
 for(let i=0;i<30;i++)await Promise.resolve();
 assert.equal(q('#launch-dialog').open,true);t.after(()=>w.close());return{w,q,requests,click:id=>q('#'+id).click()};
}
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
 const texts={intro:'Wir gehen noch einmal gemeinsam zu diesen sieben Werken und betrachten ihre gestalterischen Merkmale.',works:s.ids.map(id=>({id,text:'Die dokumentierten Werkangaben geben uns einen Ausgangspunkt. Vergleiche die Merkmale der Technik mit dem sichtbaren Eindruck und lies die Hinweise des Kurators.'}))};
 const handler=createHandler({env:{GROQ_API_KEY:'test-only',AI_ENABLED:'true'},sources:{pool,knowledge:data['kunst-glossar'],curator},fetcher:async()=>({ok:true,text:async()=>JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(texts)}}]})})});
 const res={code:null,body:null,setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 await handler({method:'POST',headers:{origin:'https://genaiedu.github.io','content-type':'application/json'},body:input},res);
 assert.equal(res.code,200);assert.equal(res.body.works.length,7);
 const bad=structuredClone(input),ids=bad.room.ids;bad.room.choices[ids[0]].technique=bad.room.choices[ids[1]].technique;
 if(pool.find(w=>w.id===ids[0]).technique!==pool.find(w=>w.id===ids[1]).technique)assert.throws(()=>ki.validatePayload(bad,pool));
});

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const pool=require('../data/kunstarchiv.json').works,titles=require('../data/kunst-titel-de.json').titles;
const settle=async()=>{for(let i=0;i<300;i++)await Promise.resolve();};
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return{promise,resolve};}
async function setup(t,{count=8,motto='PRIVATE eigenes Schlussmotto',caption='both',fetcher}={}){
 const dom=new JSDOM(read('kunsttresor.html'),{url:'https://example.test/LearningApps2/kunsttresor.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,q=s=>w.document.querySelector(s);
 const works=pool.slice(0,28).map(work=>({...work,titleDe:titles[work.id]}));
 let value={version:1,liked:works.map(work=>({id:work.id,source:'curated',at:Date.now()})),film:{name:'PRIVATE Filmname',motto,items:works.slice(0,count).map((work,i)=>({id:work.id,caption,text:'PRIVATE vorheriger Text '+i,variant:i%2}))}};
 let allowed=true,permissionRequests=0,writes=0,failSave=false;const requests=[];
 const errors=[];w.addEventListener('error',event=>errors.push(event.message));
 w.structuredClone=structuredClone;w.AbortController=AbortController;w.matchMedia=()=>({matches:true,addEventListener(){}});w.requestAnimationFrame=()=>0;w.cancelAnimationFrame=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.Audio=class{constructor(){this.paused=true;}pause(){}addEventListener(){}removeEventListener(){}};
 const answer=body=>({id:body.id,text:'Material und Gestaltung eröffnen verschiedene Möglichkeiten – ein Gedanke zu Werk '+(works.findIndex(w=>w.id===body.id)+1)+'.',...(body.withMotto?{motto:'Ein neuer Blick auf diese Sammlung.'}:{})});
 const response=body=>({ok:true,text:async()=>JSON.stringify(answer(body))});
 w.fetch=async(url,options)=>{const body=JSON.parse(options.body);requests.push(body);return fetcher?fetcher(body,response):response(body);};
 for(const file of ['scripts/kunsttresor-core.js','scripts/kunsttresor-gallery.js','scripts/kunsttresor-layout.js','services/kunst-kurator/lib/kunst-film-ki.js','scripts/kunsttresor-gallery-ui.js'])w.eval(read(file));
 const ui=w.KunstGalleryUI.create({pool:works,getGallery:()=>value,setGallery:next=>{
  if(failSave)throw Error('Test: Speichern abgewiesen.');
  const checked=w.KunstGallery.restore(next,works,{rooms:[]});assert.ok(checked);value=checked;writes++;w.localStorage.setItem('fixture-gallery',JSON.stringify(value));
 },getState:()=>null,imagesAllowed:()=>false,requestImages(){},showImage(){},stopIntro(){},saveFile:async()=>'',texts:{},aiAllowed:()=>allowed,requestAIConsent:()=>{permissionRequests++;},filmAIEndpoint:'https://example.test/api/feedback'});
 ui.open();q('#gallery-edit-open').click();
 t.after(async()=>{ui.stopTextAI();await settle();w.close();assert.deepEqual(errors,[]);});
 return{w,q,ui,requests,answer,response,click:id=>q('#'+id).click(),get value(){return value;},set value(next){value=next;},get writes(){return writes;},get permissions(){return permissionRequests;},set allowed(v){allowed=v;},set failSave(v){failSave=v;}};
}
test('one click immediately opens own/AI fields without mutating saved state, then fills and saves all captions',async t=>{
 const pending=deferred(),app=await setup(t,{fetcher:(body,response)=>body.position===0?pending.promise:response(body)}),before=JSON.stringify(app.value);
 assert.equal(app.requests.length,0);app.click('film-ai-generate');
 assert.equal(app.requests.length,1);assert.equal(app.writes,0);assert.equal(JSON.stringify(app.value),before);assert.equal(app.q('#gallery-export').disabled,true);
 for(const card of app.w.document.querySelectorAll('.film-edit-card')){
  assert.equal(card.querySelector('select').value,'custom');assert.equal(card.querySelector('textarea').parentElement.hidden,false);assert.equal(card.querySelector('textarea').readOnly,true);assert.equal(card.querySelector('textarea').getAttribute('aria-busy'),'true');
  assert.match(card.querySelector('.film-caption-preview').textContent,/wird erstellt|Wartet/);
 }
 assert.deepEqual(Object.keys(app.requests[0]).sort(),['id','kind','position','variation','version','withMotto']);assert.doesNotMatch(JSON.stringify(app.requests[0]),/PRIVATE/);
 pending.resolve(app.response(app.requests[0]));await settle();assert.equal(app.writes,8);assert.equal(app.requests.length,8);
 assert.ok(app.value.film.items.every((item,i)=>item.caption==='custom'&&item.text===app.answer(app.requests[i]).text));
 const stored=JSON.parse(app.w.localStorage.getItem('fixture-gallery'));assert.equal(stored.film.items[0].text,app.value.film.items[0].text);
 assert.equal(app.value.film.motto,'PRIVATE eigenes Schlussmotto');assert.equal(app.q('#film-ai-undo').hidden,false);assert.match(app.q('#film-ai-status').textContent,/KI-Filmtexte eingesetzt/);assert.equal(app.q('#gallery-export').disabled,false);
 for(const card of app.w.document.querySelectorAll('.film-edit-card')){
  const item=app.value.film.items.find(item=>item.id===card.dataset.work);assert.equal(card.querySelector('select').value,'custom');assert.equal(card.querySelector('textarea').value,item.text);assert.equal(card.querySelector('textarea').readOnly,false);assert.equal(card.querySelector('.film-caption-preview').textContent,item.text);
 }
 assert.equal(app.q('#film-ai-apply'),null,'no second adoption step');
});
test('direct adoption works for six and ten works; own texts remain editable and drive film captions',async t=>{
 for(const count of [6,10]){
  const app=await setup(t,{count,caption:'custom'});app.click('film-ai-generate');await settle();assert.equal(app.writes,count);assert.equal(app.value.film.items.length,count);
  const input=app.q('#film-selection textarea');input.value='Meine überarbeitete Einblendung.';input.dispatchEvent(new app.w.Event('input'));
  assert.equal(app.value.film.items[0].text,input.value);assert.equal(app.q('.film-caption-preview').textContent,input.value);assert.equal(app.q('#film-ai-undo').hidden,true,'do not undo over newer edits');
  assert.equal(app.w.KunstGallery.caption(pool[0],app.value.film.items[0],{}),input.value);
 }
});
test('undo restores exact previous texts, caption choices, order, variants and motto in one saved change',async t=>{
 const app=await setup(t,{caption:'style'}),before=JSON.stringify(app.value);app.click('film-ai-generate');await settle();app.click('film-ai-undo');
 assert.equal(JSON.stringify(app.value),before);assert.equal(app.writes,9);assert.equal(app.q('#film-ai-undo').hidden,true);assert.equal(app.q('#film-selection select').value,'style');
});
test('optional motto choice is honored for default and custom mottos',async t=>{
 const cases=[{motto:undefined,check:true},{motto:'Mein Motto bleibt.',check:false},{motto:'Mein Motto wird ersetzt.',check:true}];
 for(const entry of cases){const app=await setup(t,{motto:entry.motto??'Bilder bleiben. Ihr Blick gehört dir.'});if(entry.motto===undefined){app.value={...app.value,film:{...app.value.film,motto:app.w.KunstGallery.fresh().film.motto}};app.ui.open();}
  app.q('#film-ai-use-motto').checked=entry.check;const before=app.value.film.motto;app.click('film-ai-generate');assert.equal(app.q('#film-ai-use-motto').checked,entry.check);await settle();assert.equal(app.value.film.motto,entry.check?'Ein neuer Blick auf diese Sammlung.':before);
 }
});
test('consent is required; quota, unavailable and malformed responses keep previous state and restore controls',async t=>{
 const denied=await setup(t);denied.allowed=false;denied.click('film-ai-generate');await settle();assert.equal(denied.requests.length,0);assert.equal(denied.permissions,1);assert.equal(denied.q('#film-selection select').value,'both');
 for(const [response,notice] of [[{ok:false,status:429},/ausgelastet/],[{ok:false,status:502},/nicht erstellt/],[{ok:true,text:async()=>'{broken'},/unvollständig/]]){
  const app=await setup(t,{fetcher:async()=>response}),before=JSON.stringify(app.value);app.click('film-ai-generate');await settle();assert.equal(app.writes,0);assert.equal(JSON.stringify(app.value),before);assert.equal(app.q('#film-selection select').value,'both');assert.equal(app.q('#film-selection textarea').parentElement.hidden,true);assert.equal(app.q('#film-ai-generate').disabled,false);assert.match(app.q('#film-ai-status').textContent,notice);
 }
});
test('cancel, close and revoked permission prevent late responses from changing any text',async t=>{
 for(const action of [app=>app.click('film-ai-cancel'),app=>app.q('#gallery-dialog').close(),app=>{app.allowed=false;app.ui.stopTextAI();}]){
  const pending=deferred(),app=await setup(t,{fetcher:()=>pending.promise}),before=JSON.stringify(app.value);app.click('film-ai-generate');action(app);pending.resolve(app.response(app.requests[0]));await settle();assert.equal(app.writes,0);assert.equal(JSON.stringify(app.value),before);assert.equal(app.q('#film-ai-undo').hidden,true);
 }
});
test('editing or reordering during a request cancels it; unrelated new likes are not rolled back',async t=>{
 const pending=deferred(),app=await setup(t,{fetcher:()=>pending.promise});app.click('film-ai-generate');const input=app.q('#gallery-motto');input.value='Während der Anfrage geändert.';input.dispatchEvent(new app.w.Event('input'));const changed=JSON.stringify(app.value);pending.resolve(app.response(app.requests[0]));await settle();assert.equal(JSON.stringify(app.value),changed);assert.equal(app.q('#film-ai-cancel').hidden,true);
 const next=deferred(),other=await setup(t,{fetcher:(body,response)=>body.position===0?next.promise:response(body)});other.value={...other.value,liked:other.value.liked.slice(0,24)};other.click('film-ai-generate');other.value={...other.value,liked:[...other.value.liked,{id:pool[24].id,source:'curated',at:Date.now()}]};other.ui.refresh();next.resolve(other.response(other.requests[0]));await settle();assert.equal(other.value.liked.length,25);assert.equal(other.writes,8);
});
test('save failure does not claim success and leaves the previous film untouched',async t=>{
 const app=await setup(t),before=JSON.stringify(app.value);app.failSave=true;app.click('film-ai-generate');await settle();assert.equal(JSON.stringify(app.value),before);assert.equal(app.writes,0);assert.equal(app.q('#film-ai-undo').hidden,true);assert.match(app.q('#film-ai-status').textContent,/nicht gespeichert/);
});
test('editorial labels are removed before a generated text reaches fields, storage or film',async t=>{
 const app=await setup(t,{fetcher:async(body,response)=>{const result=await response(body),data=JSON.parse(await result.text());data.text='Antwort 1: Vorschlag 2: '+data.text;return{ok:true,text:async()=>JSON.stringify(data)};}});
 app.click('film-ai-generate');await settle();assert.equal(app.writes,8);
 assert.ok(app.value.film.items.every(item=>!item.text.startsWith('Vorschlag ')));assert.doesNotMatch(app.q('#film-selection textarea').value,/Vorschlag/);assert.doesNotMatch(app.q('.film-caption-preview').textContent,/Vorschlag/);
});
test('each picture has its own KI button: one request, direct adoption, no other changes',async t=>{
 const app=await setup(t,{caption:'style'}),before=structuredClone(app.value),buttons=app.w.document.querySelectorAll('[data-film-ai-work]');assert.equal(buttons.length,8);
 buttons[3].click();await settle();
 assert.equal(app.requests.length,1);assert.equal(app.requests[0].id,before.film.items[3].id);assert.equal(app.requests[0].withMotto,false);assert.equal(app.writes,1);
 assert.equal(app.value.film.items[3].caption,'custom');assert.equal(app.value.film.items[3].text,app.answer(app.requests[0]).text);
 for(let i=0;i<8;i++)if(i!==3)assert.equal(JSON.stringify(app.value.film.items[i]),JSON.stringify(before.film.items[i]));
 assert.equal(app.value.film.motto,before.film.motto);assert.match(app.q('#film-ai-status').textContent,/Alle anderen Bildtexte bleiben unverändert/);
 app.click('film-ai-undo');assert.equal(JSON.stringify(app.value),JSON.stringify(before));
});
test('bulk requests are strictly sequential and each response is saved before the next request',async t=>{
 let app;const pending=[];
 app=await setup(t,{fetcher:(body,response)=>{if(app.requests.length>1)assert.equal(app.value.film.items[body.position-1].caption,'custom');const d=deferred();pending.push({d,body,response});return d.promise;}});
 const before=structuredClone(app.value);app.click('film-ai-generate');assert.equal(pending.length,1);
 pending[0].d.resolve(pending[0].response(pending[0].body));await settle();assert.equal(pending.length,2);assert.equal(app.writes,1);
 assert.equal(app.q('#film-selection textarea').value,app.answer(pending[0].body).text);assert.equal(app.value.film.items[1].text,before.film.items[1].text);
 pending[1].d.resolve({ok:false,status:502,text:async()=>JSON.stringify({reason:'invalid_response'})});await settle();assert.equal(pending.length,2);assert.equal(app.writes,1);assert.match(app.q('#film-ai-status').textContent,/1 bereits eingesetzte Texte bleiben gespeichert/);assert.equal(app.q('#film-ai-undo').hidden,false);
 app.click('film-ai-undo');assert.equal(JSON.stringify(app.value),JSON.stringify(before));
});

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),{webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const data=Object.fromEntries(['kunstarchiv','kunstbilder','kunst-wikipedia','kunst-hauptwerke','kunst-titel-de','kunst-glossar','kunst-filmtexte'].map(name=>[name,JSON.parse(read('data/'+name+'.json'))]));
const model=vm.createContext({KunstWallEnabled:true,crypto:webcrypto});
for(const file of ['core','progress','history','gallery'])vm.runInContext(read('scripts/kunsttresor-'+file+'.js'),model);
const pool=data.kunstarchiv.works.map(w=>({...w,artistIdentity:data['kunst-wikipedia'].artists[w.artist].language+':'+data['kunst-wikipedia'].artists[w.artist].title}));
function fixture(attempts=1){
 const c=model.KunstTresor;let s=c.newState(pool,null,Math.random,true);s.roomToken='a'.repeat(32);s.historyToken=s.roomToken;s.runToken='b'.repeat(32);s.parentRoomToken=null;
 let h=model.KunstHistory.fresh();for(const id of s.ids)h=model.KunstHistory.track(h,s,pool,{shownId:id});
 for(let n=1;n<=attempts;n++){
  for(const field of c.fields)for(const id of s.ids)s=c.choose(s,id,field,'');
  const ids=[...s.ids];for(const [i,id]of ids.entries())for(const field of c.fields)s=c.choose(s,id,field,pool.find(w=>w.id===ids[(i+(n===attempts||field!=='artist'?0:n))%7])[field]);
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
 w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.structuredClone=structuredClone;w.scrollTo=()=>{};
 Object.defineProperty(w,'crypto',{value:webcrypto});
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
 const files=['scripts/kunsttresor-mode.js','scripts/kunsttresor-layout.js','scripts/kunsttresor-core.js','scripts/kunst-kurator.js','services/kunst-kurator/lib/kunst-ki.js','scripts/kunsttresor-ki-config.js','scripts/kunsttresor-progress.js','scripts/kunsttresor-history.js','scripts/kunsttresor-gallery.js','scripts/kunsttresor-gallery-ui.js','scripts/kunsttresor-save.js','scripts/kunsttresor-zoom.js','scripts/kunsttresor-intro.js','scripts/kunsttresor-reset.js','scripts/kunsttresor.js','scripts/kunsttresor-wall.js'];
 for(const file of files)w.eval(read(file));
 for(let i=0;i<30;i++)await Promise.resolve();
 assert.equal(q('#launch-dialog').open,true);t.after(()=>w.close());return{w,q,requests,click:id=>q('#'+id).click()};
}
const secretKey='kunsttresor-forgery-every-series-v1',gameKey='kunsttresor-game-v1-wall';
const settle=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
const generated=(image='data:image/jpeg;base64,/9j/')=>({ok:true,json:async()=>({image,model:'test model'})});
const roomOf=app=>JSON.parse(app.w.localStorage.getItem(gameKey));
function lostFixture(markingOnly=false) {
 const c=model.KunstTresor;let s=c.newState(pool);s.roomToken='c'.repeat(32);s.runToken='d'.repeat(32);s.parentRoomToken=null;
 for(const id of s.ids)for(const field of c.fieldsFor(s))s=c.choose(s,id,field,pool.find(w=>w.id===id)[field]);
 if(markingOnly){s.forgery={id:s.ids[4],image:'data:image/jpeg;base64,/9j/'};s.forgeryMarks={[s.ids[1]]:true};}
 else {const b=s.ids[1],e=s.ids[4];s=c.choose(s,b,'title','');s=c.choose(s,e,'title','');s=c.choose(s,b,'title',pool.find(w=>w.id===e).title);s=c.choose(s,e,'title',pool.find(w=>w.id===b).title);}
 s=c.inspect({...s,attempts:2},pool).state;assert.equal(s.phase,'lost');return JSON.parse(JSON.stringify(s));
}
test('lost curator starts with final errors, keeps original work letters and prioritizes the affected works even with AI',async t=>{
 const state=lostFixture(),app=await setup(t,{state,preferences:{'kunsttresor-ai-consent-v2-wall':'yes','kunsttresor-ai-enabled-v1-wall':'yes'}});app.click('launch-read');app.click('show-solution');await settle();
 const summary=app.q('#solution-review');assert.equal(summary.hidden,false);assert.match(summary.textContent,/2 falsche Zuordnungen/);assert.match(app.q('#solution-title').textContent,/Warum die Tür/);
 assert.ok(summary.compareDocumentPosition(app.q('.curator-ai'))&app.w.Node.DOCUMENT_POSITION_FOLLOWING);
 assert.deepEqual([...app.q('#solutions').children].map(card=>card.dataset.solutionWork),['1','4','0','2','3','5','6']);
 assert.match(app.q('#solutions .solution-overview .eyebrow').textContent,/Werk B/);
 const correction=app.q('#solutions .solution-card').firstElementChild;assert.equal(correction.className,'curator-corrections');
 assert.match(correction.textContent,/Werktitel.*Deine Wahl:.*Richtig:/);assert.doesNotMatch(correction.textContent,/\[object Object\]|undefined/);
 assert.equal(app.q('#ai-intro').hidden,false);app.q('.curator-review-links button').click();assert.equal(app.w.document.activeElement,app.q('#solutions .solution-card'));
 const before=summary.textContent;app.q('#solution-dialog [data-ai-toggle]').click();assert.equal(summary.textContent,before);
 assert.equal(app.q('#solutions [data-gallery-like]'),null);
});
test('lost curator explains missed forgeries and falsely marked originals even when every label was correct',async t=>{
 const app=await setup(t,{state:lostFixture(true)});app.click('launch-read');app.click('show-solution');
 assert.match(app.q('#solution-review').textContent,/2 falsche Original-\/Fälschungsmarkierungen/);assert.doesNotMatch(app.q('#solution-review').textContent,/falsche Zuordnungen/);
 const blocks=[...app.q('#solutions').querySelectorAll('.curator-corrections')];assert.equal(blocks.length,2);
 assert.match(blocks[0].textContent,/Original als Fälschung markiert/);assert.match(blocks[1].textContent,/KI-Fälschung nicht als solche markiert/);
});
test('won curator keeps normal order and does not show a failure review',async t=>{
 const {s}=fixture(),app=await setup(t,{state:s});app.click('launch-read');app.click('show-solution');
 assert.equal(app.q('#solution-review').hidden,true);assert.equal(app.q('.curator-corrections'),null);
 assert.deepEqual([...app.q('#solutions').children].map(card=>card.dataset.solutionWork),['0','1','2','3','4','5','6']);
});
test('gallery-only import previews and merges curated works without changing game, badges, record or history',async t=>{
 const app=await setup(t);app.click('launch-skip');const before=stored(app.w.localStorage),ids=pool.slice(0,24).map(w=>w.id),at=Date.now();
 const gallery={...app.w.KunstGallery.fresh(),liked:ids.map(id=>({id,source:'curated',at})),film:{name:'Testgalerie',motto:'Test',items:ids.slice(0,10).map(app.w.KunstGallery.item)}};
 const payload={app:'kunsttresor',version:1,kind:'gallery',savedAt:at,gallery},encoded=await app.w.KunstSave.encode(payload);
 app.click('open-save');Object.defineProperty(app.q('#save-file'),'files',{configurable:true,value:[{size:encoded.length,text:async()=>encoded}]});await app.q('#save-file').onchange();
 assert.equal(app.q('#import-preview').hidden,false);assert.match(app.q('#import-description').textContent,/keine Spielerfolge/);assert.equal(app.q('#confirm-import').textContent,'Galerie übernehmen');
 assert.deepEqual(stored(app.w.localStorage),before);app.click('confirm-import');assert.equal(app.q('#save-dialog').open,false,app.q('#save-status').textContent);
 const after=stored(app.w.localStorage);assert.equal(JSON.parse(after['kunsttresor-wall-gallery-v1']).liked.length,24);delete after['kunsttresor-wall-gallery-v1'];delete before['kunsttresor-wall-gallery-v1'];assert.deepEqual(after,before);
 const restored=await setup(t,{state:roomOf(app),gallery:JSON.parse(app.w.localStorage.getItem('kunsttresor-wall-gallery-v1'))});assert.equal(JSON.parse(restored.w.localStorage.getItem('kunsttresor-wall-gallery-v1')).liked.length,24);
});
const stored=storage=>Object.fromEntries(Array.from({length:storage.length},(_,i)=>{const key=storage.key(i);return[key,storage.getItem(key)];}));
test('gallery filter controls combine, count, sort and reset without changing likes, film or game',async t=>{
 const at=Date.now(),gallery={...model.KunstGallery.fresh(),liked:pool.map(w=>({id:w.id,source:'curated',at}))};gallery.film.items=pool.slice(0,10).map(w=>model.KunstGallery.item(w.id));
 const app=await setup(t,{gallery});app.click('launch-read');app.click('game-gallery');
 const before=stored(app.w.localStorage),cards=()=>[...app.q('#gallery-grid').querySelectorAll('.gallery-card')].map(c=>c.dataset.work);
 assert.equal(cards().length,1807);assert.match(app.q('#gallery-results').textContent,/1\.807 von 1\.807/);
 const choose=(id,value)=>{app.q('#'+id).value=value;app.q('#'+id).dispatchEvent(new app.w.Event('change'));};
 const target=pool.find(w=>w.artist==='Claude Monet');assert.ok(target);
 choose('gallery-filter-artist',target.artist);assert.ok(cards().length>1);assert.ok(cards().every(id=>pool.find(w=>w.id===id).artist===target.artist));
 choose('gallery-filter-style',target.style);choose('gallery-filter-technique',target.technique);
 const expected=pool.filter(w=>w.artist===target.artist&&w.style===target.style&&w.technique===target.technique);
 assert.equal(cards().length,expected.length);
 app.q('#gallery-search').value='NOT A REAL WORK';choose('gallery-sort','title');assert.equal(cards().length,0);assert.match(app.q('.gallery-empty').textContent,/Keine Werke/);
 assert.equal(app.q('#gallery-filter-reset').disabled,false);app.click('gallery-filter-reset');assert.deepEqual(cards(),pool.map(w=>w.id));
 choose('gallery-sort','date-desc');const dates=cards().map(id=>{const w=pool.find(w=>w.id===id);return w.dateStart??model.KunstTresor.dateWindow(w.date)?.start;}).filter(Number.isFinite);assert.ok(dates.every((date,i)=>!i||date<=dates[i-1]));
 app.q('#gallery-dialog').close();app.click('game-gallery');assert.equal(app.q('#gallery-sort').value,'date-desc');
 assert.deepEqual(stored(app.w.localStorage),before);assert.equal(app.q('#art-grid [data-gallery-like]'),null);
});
const pressRule=(app,n)=>app.q('.rule-steps > li:nth-child('+n+') > button').click();
test('1 → 2 → 4 opens a safely focused reset confirmation; cancellation keeps every saved value',async t=>{
 const app=await setup(t,{preferences:{[secretKey]:'yes','kunsttresor-best-v1-wall':'9'}});app.click('launch-read');
 const before=stored(app.w.localStorage);pressRule(app,1);pressRule(app,4);assert.equal(app.q('#reset-dialog').open,false);
 pressRule(app,1);pressRule(app,2);assert.equal(app.q('#reset-dialog').open,false);pressRule(app,4);
 assert.equal(app.q('#reset-dialog').open,true);assert.equal(app.w.document.activeElement,app.q('#reset-dialog [data-close]'));
 assert.match(app.q('#reset-description').textContent,/Spielstand, Rekord, Abzeichen, Bildverlauf/);
 assert.deepEqual(stored(app.w.localStorage),before);app.q('#reset-dialog [data-close]').click();
 assert.equal(app.q('#reset-dialog').open,false);assert.deepEqual(stored(app.w.localStorage),before);
 pressRule(app,1);pressRule(app,2);pressRule(app,4);assert.equal(app.q('#reset-dialog').open,true);
});
test('rule 03 keeps its old forgery toggle and interrupts an incomplete reset code',async t=>{
 const app=await setup(t);app.click('launch-read');pressRule(app,1);pressRule(app,2);pressRule(app,3);pressRule(app,4);
 assert.equal(app.q('#reset-dialog').open,false);assert.equal(app.w.localStorage.getItem(secretKey),'yes');
 pressRule(app,1);pressRule(app,2);pressRule(app,4);assert.equal(app.q('#reset-dialog').open,true);
});
test('reset reports blocked browser storage and allows cancellation or a retry without claiming success',async t=>{
 const app=await setup(t);app.click('launch-read');const before=stored(app.w.localStorage);
 Object.defineProperty(app.w,'sessionStorage',{configurable:true,get(){throw Error('blocked');}});
 pressRule(app,1);pressRule(app,2);pressRule(app,4);app.click('reset-confirm');
 assert.equal(app.q('#reset-dialog').open,true);assert.equal(app.q('#reset-confirm').disabled,false);
 assert.match(app.q('#reset-status').textContent,/nicht vollständig zurückgesetzt/);assert.deepEqual(stored(app.w.localStorage),before);
 app.q('#reset-dialog [data-close]').click();assert.equal(app.q('#reset-dialog').open,false);
});
test('confirmed reset clears both app versions, preferences and session data; a pending forgery cannot recreate them',async t=>{
 let respond;const app=await setup(t,{preferences:{'kunsttresor-gallery-v1':'old','kunsttresor-history-v0':'old','other-app':'keep',[secretKey]:'yes'},forgeryResponse:()=>new Promise(resolve=>{respond=resolve;})});
 app.click('launch-skip');await settle();assert.equal(typeof respond,'function');
 app.w.sessionStorage.setItem('kunsttresor-session-v0','old');app.w.sessionStorage.setItem('other-session','keep');
 // jsdom deliberately cannot navigate; observe the requested reload without
 // changing or deleting any real browser data.
 let reloaded=false;app.w._virtualConsole.removeAllListeners('jsdomError');app.w._virtualConsole.on('jsdomError',error=>{if(/navigation/.test(error.message))reloaded=true;else throw error;});
 pressRule(app,1);pressRule(app,2);pressRule(app,4);app.click('reset-confirm');
 assert.equal(reloaded,true);assert.equal(app.q('#reset-confirm').disabled,true);
 assert.deepEqual(stored(app.w.localStorage),{'other-app':'keep'});assert.deepEqual(stored(app.w.sessionStorage),{'other-session':'keep'});
 respond({ok:false,status:503});await settle();assert.deepEqual(stored(app.w.localStorage),{'other-app':'keep'});
});
function readyWall(app){
 app.w.Date.now=()=>Date.now()+600000;
 for(const img of app.q('#art-grid').querySelectorAll('img')){Object.defineProperty(img,'naturalWidth',{value:600,configurable:true});Object.defineProperty(img,'naturalHeight',{value:400,configurable:true});img.onload();}
}
function selectAnswer(app,letter,field,value){const select=app.q('#answer-'+letter+'-'+field);select.value=value;select.dispatchEvent(new app.w.Event('change',{bubbles:true}));return select;}
test('joker confirmation can be cancelled, solves the selected work and survives reload and file transfer',async t=>{
 const app=await setup(t);assert.equal(app.q('#open-joker').textContent,'Joker einsetzen');app.click('launch-skip');readyWall(app);const initial=roomOf(app),id=initial.ids[2];
 assert.equal(app.q('#open-joker').textContent,'Joker einsetzen');
 assert.equal(app.q('#art-grid [data-gallery-like]'),null);app.click('open-joker');assert.equal(app.q('#joker-dialog').open,true);app.click('joker-cancel');assert.deepEqual(roomOf(app),initial);
 app.q('#art-grid [data-id="'+id+'"] .artwork-button').click();assert.equal(app.q('#wall-settings [data-gallery-like]'),null);
 app.q('#wall-settings .joker-use').click();assert.equal(app.q('#joker-work').value,id);app.click('joker-confirm');
 const used=roomOf(app),work=pool.find(w=>w.id===id);assert.equal(used.joker,0);assert.equal(used.attempts,0);assert.deepEqual(used.jokerUsed,[id]);
 for(const field of model.KunstTresor.fieldsFor(used))assert.equal(app.q('#answer-C-'+field).value,work[field]);
 assert.equal(app.q('#open-joker').disabled,true);assert.equal(app.q('#open-joker').textContent,'Joker verwendet');assert.equal(app.q('#wall-settings .joker-use').textContent,'Joker verwendet');
 const again=await setup(t,{state:used});again.click('launch-skip');assert.equal(roomOf(again).joker,0);assert.deepEqual(roomOf(again).jokerUsed,[id]);assert.equal(again.q('#open-joker').textContent,'Joker verwendet');
 const payload={app:'kunsttresor',version:1,savedAt:Date.now(),state:used,best:0,progress:model.KunstProgress.fresh(),history:model.KunstHistory.fresh(),gallery:model.KunstGallery.fresh()};
 const transfer=app.w.KunstSave.validate(await app.w.KunstSave.decode(await app.w.KunstSave.encode(payload)),pool,[],app.w.KunstTresor,app.w.KunstProgress,app.w.KunstHistory,app.w.KunstGallery);
 assert.equal(transfer.state.joker,0);assert.deepEqual(JSON.parse(JSON.stringify(transfer.state.jokerUsed)),[id]);
 again.click('restart-game');again.click('restart-confirm');assert.equal(roomOf(again).joker,1);assert.equal(roomOf(again).escaped,0);assert.equal(again.q('#open-joker').textContent,'Joker einsetzen');
});
test('two failed checks strike and disable both sets of wrong answers only for their artwork',async t=>{
 const app=await setup(t);app.click('launch-skip');readyWall(app);const room=roomOf(app),id=room.ids[0];
 for(let offset=1;offset<=2;offset++){
  for(const field of model.KunstTresor.fieldsFor(room))for(let i=0;i<7;i++)selectAnswer(app,'ABCDEFG'[i],field,'');
  for(const [i,workId]of room.ids.entries())for(const field of model.KunstTresor.fieldsFor(room))selectAnswer(app,'ABCDEFG'[i],field,pool.find(w=>w.id===(field!=='artist'?workId:room.ids[(i+offset)%7]))[field]);
  assert.equal(app.q('#check').disabled,false);app.click('check');assert.equal(roomOf(app).attempts,offset);
  assert.equal(app.q('#answer-A-artist').value,'');assert.equal(app.q('#answer-A-artist-excluded').querySelectorAll('s').length,offset);
  for(let n=1;n<=offset;n++){const value=pool.find(w=>w.id===room.ids[n]).artist,option=[...app.q('#answer-A-artist').options].find(o=>o.value===value);assert.equal(option.disabled,true);assert.match(option.textContent,/^✕ /);assert.match(option.title,/ausgeschlossen/);}
  assert.equal(app.q('#answer-A-technique').value,pool.find(w=>w.id===id).technique);
 }
 const saved=roomOf(app),again=await setup(t,{state:saved});again.click('launch-skip');assert.equal(again.q('#answer-A-artist-excluded').querySelectorAll('s').length,2);
 const payload={app:'kunsttresor',version:1,savedAt:Date.now(),state:saved,best:0,progress:model.KunstProgress.fresh(),history:model.KunstHistory.fresh(),gallery:model.KunstGallery.fresh()};
 const transfer=app.w.KunstSave.validate(payload,pool,[],app.w.KunstTresor,app.w.KunstProgress,app.w.KunstHistory,app.w.KunstGallery);assert.equal(transfer.state.excluded[id].artist.length,2);assert.equal(transfer.state.attempts,2);
});
test('curator hearts appear only for a won room and joker commentary stays visible with AI',async t=>{
 const c=model.KunstTresor;let state=c.newState(pool),id=state.ids[0];state=c.useJoker(state,id,pool);
 state.roomToken='e'.repeat(32);state.runToken='f'.repeat(32);state.parentRoomToken=null;
 for(const workId of state.ids)for(const field of c.fieldsFor(state))state=c.choose(state,workId,field,pool.find(w=>w.id===workId)[field]);
 state=c.inspect(state,pool).state;assert.equal(state.phase,'unlocked');assert.ok(c.restore(state,pool));const app=await setup(t,{state:JSON.parse(JSON.stringify(state))});app.click('launch-skip');assert.equal(roomOf(app).phase,'unlocked');app.click('show-solution');
 assert.equal(app.q('#art-grid [data-gallery-like]'),null);const hearts=[...app.q('#solutions').querySelectorAll('[data-gallery-like]')];assert.equal(hearts.length,7);assert.ok(hearts.every(b=>!b.disabled&&!b.hidden));
 assert.match(app.q('.curator-joker-note').textContent,/Joker eingesetzt/);assert.match(app.q('.curator-opening').textContent,/Joker eingesetzt/);
 app.q('#solution-dialog [data-ai-toggle]').click();app.click('ai-enable');await settle();assert.match(app.q('.curator-joker-note').textContent,/automatisch gelöst/);
 const request=app.requests.find(r=>r.url.endsWith('/api/feedback'));assert.deepEqual(JSON.parse(request.options.body).room.jokerUsed,[id]);
 let lost=c.newState(pool);for(let offset=1;offset<=3;offset++){for(const field of c.fieldsFor(lost))for(const workId of lost.ids)lost=c.choose(lost,workId,field,'');for(const [i,workId]of lost.ids.entries())for(const field of c.fieldsFor(lost))lost=c.choose(lost,workId,field,pool.find(w=>w.id===(field!=='artist'?workId:lost.ids[(i+offset)%7]))[field]);lost=c.inspect(lost,pool).state;}
 assert.equal(lost.phase,'lost');const other=await setup(t,{state:JSON.parse(JSON.stringify(lost))});other.click('launch-skip');other.click('show-solution');assert.equal(other.q('#solutions [data-gallery-like]'),null);
});
test('taken choices stay selectable, identify their owners and only move after confirmation',async t=>{
 const app=await setup(t);app.click('launch-skip');readyWall(app);
 const room=roomOf(app),value=room.options.artist[0];selectAnswer(app,'C','artist',value);
 const select=app.q('#answer-A-artist'),option=[...select.options].find(o=>o.value===value);
 assert.equal(option.disabled,false);assert.match(option.textContent,/Bild C/);
 const before=roomOf(app);selectAnswer(app,'A','artist',value);
 assert.equal(app.q('#assignment-dialog').open,true);assert.equal(app.q('#assignment-title').textContent,'Von Bild C entfernen?');
 assert.deepEqual(roomOf(app),before);assert.equal(select.value,'');assert.equal(app.q('#assignment-owner-label').hidden,true);
 app.click('assignment-cancel');assert.deepEqual(roomOf(app),before);assert.equal(app.w.document.activeElement,select);
 selectAnswer(app,'A','artist',value);app.click('assignment-confirm');
 const moved=roomOf(app);assert.equal(moved.choices[room.ids[2]].artist,'');assert.equal(moved.choices[room.ids[0]].artist,value);assert.equal(moved.attempts,0);
 assert.equal(option.textContent,option.dataset.label);assert.doesNotMatch(option.textContent,/Bild C/);assert.equal(app.q('#filled-label').textContent,'1 / 35 zugeordnet');
 assert.equal(app.q('#assignment-dialog').open,false);
});
test('full technique quotas allow choosing exactly which owner releases a place',async t=>{
 let room,value;for(let n=0;n<100;n++){room=model.KunstTresor.newState(pool);value=room.options.technique.find(v=>{const count=room.options.technique.filter(x=>x===v).length;return count>1&&count<7;});if(value)break;}
 assert.ok(value);const app=await setup(t,{state:JSON.parse(JSON.stringify(room))});app.click('launch-skip');readyWall(app);
 const count=room.options.technique.filter(v=>v===value).length;
 for(let n=0;n<count;n++)selectAnswer(app,'ABCDEFG'[n],'technique',value);
 const target='ABCDEFG'[count],select=app.q('#answer-'+target+'-technique'),option=[...select.options].find(o=>o.value===value);
 assert.match(option.textContent,/0 frei · Bild A, B/);assert.equal(option.disabled,false);
 selectAnswer(app,target,'technique',value);assert.equal(app.q('#assignment-owner-label').hidden,false);
 app.q('#assignment-owner').value=room.ids[1];app.q('#assignment-owner').dispatchEvent(new app.w.Event('change'));assert.equal(app.q('#assignment-title').textContent,'Von Bild B entfernen?');
 app.click('assignment-confirm');const moved=roomOf(app);
 assert.equal(moved.choices[room.ids[0]].technique,value);assert.equal(moved.choices[room.ids[1]].technique,'');assert.equal(moved.choices[room.ids[count]].technique,value);
 assert.equal(model.KunstTresor.remaining(moved,'technique',value),0);assert.ok(model.KunstTresor.restore(moved,pool));
});
test('confirmed green answers cannot be cleared or overwritten by moving an unchecked answer',async t=>{
 const c=model.KunstTresor;let state=c.newState(pool);
 for(const [n,id]of state.ids.entries())for(const field of c.fields)state=c.choose(state,id,field,pool.find(w=>w.id===(field==='artist'&&n<2?state.ids[1-n]:id))[field]);
 state=c.inspect(state,pool).state;assert.equal(state.phase,'playing');
 const app=await setup(t,{state:JSON.parse(JSON.stringify(state))});app.click('launch-skip');readyWall(app);
 const [a,b]=state.ids,value=pool.find(w=>w.id===a).artist,oldTarget=pool.find(w=>w.id===b).artist;
 selectAnswer(app,'A','artist',value);selectAnswer(app,'B','artist',oldTarget);const before=roomOf(app);
 // A newly selected artist is still untested, but C already has a green answer.
 const target='C',oldC=app.q('#answer-C-artist').value;
 assert.equal(app.q('#answer-C-artist').disabled,true);
 selectAnswer(app,target,'artist',value);assert.equal(app.q('#answer-C-artist').value,oldC);assert.equal(app.q('#assignment-dialog').open,false);assert.deepEqual(roomOf(app),before);
 selectAnswer(app,target,'artist','');assert.equal(app.q('#answer-C-artist').value,oldC);assert.deepEqual(roomOf(app),before);
 assert.match(app.q('#answer-C-artist-result').textContent,/Richtig bestätigt.*bleibt fest/);assert.ok(app.q('#answer-C-artist').closest('label').classList.contains('is-correct'));
 assert.equal(app.q('#filled-label').textContent,'35 / 35 zugeordnet');
});
test('date hints appear above struck entries outside the compact dropdown and survive file transfer',async t=>{
 const c=model.KunstTresor,ids=['wd-Q3889232','wd-Q11945371','wd-Q3904392','wd-Q3842489','wd-Q18338577','wd-Q18579139','wd-Q18602436'],selected=ids.map(id=>pool.find(w=>w.id===id));
 let state=c.newState(selected);state.ids=ids;state.roomToken='8'.repeat(32);state.runToken='9'.repeat(32);state.parentRoomToken=null;
 for(const id of ids)for(const field of c.fieldsFor(state))state=c.choose(state,id,field,pool.find(w=>w.id===id)[field]);
 for(const id of ids.slice(0,2))state=c.choose(state,id,'date','');state=c.choose(state,ids[0],'date',selected[1].date);state=c.choose(state,ids[1],'date',selected[0].date);
 state=c.inspect(state,pool).state;assert.equal(state.phase,'playing');
 const app=await setup(t,{state:JSON.parse(JSON.stringify(state))});app.click('launch-skip');readyWall(app);app.q('#art-grid .artwork-button').click();
 const a=app.q('#answer-A-date'),b=app.q('#answer-B-date');assert.equal(a.disabled,false);assert.equal(app.q('#answer-A-artist').disabled,true);
 const entry=[...app.q('#answer-A-date-excluded').querySelectorAll('.excluded-answer')].find(e=>e.querySelector('s').textContent==='1450');
 assert.ok(entry);assert.equal(entry.firstElementChild.className,'date-feedback');assert.equal(entry.firstElementChild.textContent,'zu genau');assert.equal(entry.lastElementChild.tagName,'S');
 assert.equal(app.q('#answer-B-date-excluded .date-feedback').textContent,'zu ungenau');
 assert.equal(app.q('#answer-B-date-excluded .excluded-list').firstElementChild.querySelector('.date-feedback').textContent,'zu ungenau');
 assert.doesNotMatch([...a.options,...b.options].map(o=>o.textContent).join(' '),/zu genau|zu ungenau|ausgeschlossen|bestätigt/);
 const owned=[...a.options].find(o=>o.value===selected[2].date);assert.equal(owned.disabled,true);assert.match(owned.textContent,/^✕ .*Bild C$/);
 const lockedDate=app.q('#answer-C-date');assert.equal(lockedDate.disabled,true);selectAnswer(app,'C','date','');assert.equal(lockedDate.value,selected[2].date);
 const saved=roomOf(app),payload={app:'kunsttresor',version:1,savedAt:Date.now(),state:saved,best:0,progress:model.KunstProgress.fresh()};
 const transfer=app.w.KunstSave.validate(await app.w.KunstSave.decode(await app.w.KunstSave.encode(payload)),pool,[],app.w.KunstTresor,app.w.KunstProgress,app.w.KunstHistory,app.w.KunstGallery);
 assert.equal(transfer.state.locked[ids[0]].artist,selected[0].artist);assert.equal(transfer.state.dateHints[ids[0]][0].label,'zu genau');
 const again=await setup(t,{state:JSON.parse(JSON.stringify(transfer.state))});again.click('launch-skip');assert.equal(again.q('#answer-A-date-excluded .date-feedback').textContent,'zu genau');assert.equal(again.q('#answer-A-artist').disabled,true);
});
test('the count opens the first incomplete artwork and focuses its missing field without a check',async t=>{
 const app=await setup(t);assert.equal(app.q('#jump-missing').disabled,true);app.click('launch-skip');assert.equal(app.q('#jump-missing').disabled,true);readyWall(app);
 const room=roomOf(app),first=pool.find(w=>w.id===room.ids[0]);for(const field of model.KunstTresor.fields)selectAnswer(app,'A',field,first[field]);
 assert.equal(app.q('#jump-missing').disabled,false);const before=roomOf(app);app.click('jump-missing');
 assert.equal(app.q('#image-dialog').open,true);assert.match(app.q('#wall-work-title').textContent,/Werk B/);
 const missing=model.KunstTresor.fieldsFor(before)[0];assert.equal(app.w.document.activeElement,app.q('#answer-B-'+missing));assert.deepEqual(roomOf(app),before);
 app.q('#image-dialog').close();
 for(const field of model.KunstTresor.fields)for(const id of room.ids)selectAnswer(app,'ABCDEFG'[room.ids.indexOf(id)],field,'');
 for(const [i,id]of room.ids.entries())for(const field of model.KunstTresor.fields)selectAnswer(app,'ABCDEFG'[i],field,pool.find(w=>w.id===id)[field]);
 assert.equal(app.q('#filled-label').textContent,'35 / 35 zugeordnet');assert.equal(app.q('#jump-missing').disabled,true);app.click('jump-missing');assert.equal(app.q('#image-dialog').open,false);
});
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
 again.click('forgery-secret');assert.equal(again.w.localStorage.getItem(secretKey),'no');assert.match(again.q('#forgery-frequency').textContent,/fünfte bis sechste/);
});
test('a newly prepared but unentered first room gets one forgery and so does each following room',async t=>{
 const app=await setup(t,{forgeryResponse:async()=>generated()});app.click('launch-skip');assert.equal(app.requests.length,0);
 const cooldown=app.w.localStorage.getItem('kunsttresor-forgery-cooldown-v4');
 app.click('forgery-secret');await settle();app.click('start-game');
 for(let i=0;i<3;i++){
  await settle();const room=roomOf(app);assert.equal(room.forgeryEverySeries,true);assert.ok(room.ids.includes(room.forgery.id));
  assert.equal(app.q('#art-grid').querySelectorAll('img[src^="data:"]').length,1);assert.equal(room.attempts,0);
  solveWall(app);assert.equal(roomOf(app).phase,'unlocked');app.click('solution-next');
 }
 await settle();assert.equal(app.requests.filter(r=>r.url.endsWith('/api/forgery')).length,4);assert.equal(app.w.localStorage.getItem('kunsttresor-forgery-cooldown-v4'),cooldown);
});
test('a failed mandatory forgery waits for a successful retry without consuming a check or substituting originals',async t=>{
 let count=0;const app=await setup(t,{preferences:{[secretKey]:'yes'},forgeryResponse:async()=>++count===1?{ok:false,status:503}:generated()});
 app.click('launch-skip');app.click('start-game');await settle();const ids=roomOf(app).ids;
 assert.equal(app.q('#art-grid').hidden,true);assert.equal(app.q('#lock-panel').hidden,true);assert.equal(app.q('#retry-forgery').hidden,false);
 assert.equal(app.q('#room-loading').hidden,true);assert.equal(roomOf(app).attempts,0);
 app.click('retry-forgery');await settle();assert.equal(app.q('#art-grid').hidden,false);assert.equal(app.q('#retry-forgery').hidden,true);
 assert.deepEqual(roomOf(app).ids,ids);assert.ok(roomOf(app).forgery);assert.equal(roomOf(app).attempts,0);assert.equal(count,2);
});
test('normal play really inserts a single forgery in the fifth room and five or six rooms later',async t=>{
 const app=await setup(t,{preferences:{'kunsttresor-forgery-cooldown-v4':'4'},forgeryResponse:async()=>generated()});
 app.click('launch-skip');app.click('start-game');const positions=[];
 for(let i=1;i<=11;i++){
  await settle();const room=roomOf(app);assert.equal(room.forgeryEverySeries,false);
  const images=app.q('#art-grid').querySelectorAll('img[src^="data:"]');assert.equal(images.length,room.forgery?1:0);
  if(room.forgery)positions.push(i);
  if(i<11){solveWall(app);assert.equal(roomOf(app).phase,'unlocked');app.click('solution-next');}
 }
 assert.equal(positions[0],5);assert.equal(positions.length,2);assert.ok([5,6].includes(positions[1]-positions[0]));
});
test('the waiting screen and retry never disclose whether a generated image is being prepared',async t=>{
 for(const forced of [false,true]){
  let finish;const app=await setup(t,{preferences:{[secretKey]:forced?'yes':'no','kunsttresor-forgery-cooldown-v4':'0'},forgeryResponse:()=>new Promise(resolve=>{finish=resolve;})});
  app.click('launch-skip');await settle();assert.equal(typeof finish,'function');
  assert.equal(app.q('#waiting').hidden,true);assert.equal(app.q('#room-loading').hidden,false);
  assert.equal(app.q('#room-loading').textContent,'Deine Bilderserie wird vorbereitet. Das kann einen Moment dauern …');
  for(const id of ['waiting','room-loading','retry-forgery'])assert.doesNotMatch(app.q('#'+id).textContent,/KI|Fälschung|Nachahmung|Geheimmodus/);
  finish({ok:false,status:503});await settle();
  if(forced){assert.equal(app.q('#waiting').hidden,false);assert.equal(app.q('#retry-forgery').hidden,false);assert.match(app.q('#waiting').textContent,/Bilderserie/);}
  else assert.doesNotMatch(app.q('#feedback').textContent,/KI|Fälschung|Nachahmung|Originale/);
 }
});
test('the previous long cooldown is replaced without losing a saved room or changing the secret preference',async t=>{
 const {s}=fixture();const app=await setup(t,{state:s,preferences:{'kunsttresor-forgery-cooldown-v3':'6'}});
 app.click('launch-skip');assert.deepEqual(roomOf(app).ids,s.ids);assert.equal(roomOf(app).phase,'unlocked');
 assert.equal(app.q('#forgery-secret').getAttribute('aria-pressed'),'false');
 app.click('next-room');await settle();const remaining=Number(app.w.localStorage.getItem('kunsttresor-forgery-cooldown-v4'));assert.ok([3,4].includes(remaining));
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
test('curator original and forgery clicks pass their own image nodes to the transition, including both comparison sides',async t=>{
 const {s,h}=fixture(),id=s.ids.find(id=>model.KunstTresor.isIntroImage(pool.find(w=>w.id===id)));s.forgeryPrepared=true;s.forgeryMode=true;s.forgery={id,image:'data:image/jpeg;base64,/9j/'};s.forgeryMarks={[id]:true};
 const app=await setup(t,{state:s,history:h}),seen=[],inspect=app.w.KunstWall.inspect;
 app.w.KunstWall.inspect=(...args)=>{seen.push(args);inspect(...args);};app.click('launch-skip');app.click('show-solution');
 const regular=app.q('#solutions .solution-overview .solution-image');regular.click();assert.equal(seen.at(-1)[2],true);assert.equal(seen.at(-1)[3].image,regular.querySelector('img'));assert.equal(seen.at(-1)[3].context,'curator');
 app.q('[data-close="image-dialog"]').click();
 const pair=[...app.q('#solutions .forgery-comparison-pair').querySelectorAll('button.solution-image')];assert.equal(pair.length,2);
 for(const [index,button]of pair.entries()){
  button.click();assert.equal(seen.at(-1)[2],index===0);assert.equal(seen.at(-1)[3].image,button.querySelector('img'));assert.equal(seen.at(-1)[3].context,'curator');
  assert.equal(app.q('#wall-work-controls').children.length,0);assert.equal(app.q('#wall-next').hidden,true);
  if(index===1)assert.equal(app.q('#zoom-image').getAttribute('src'),s.forgery.image);
  app.q('[data-close="image-dialog"]').click();assert.equal(app.q('#solution-dialog').open,true);
 }
});
test('the revealed original of a correctly detected forgery can be liked after winning and survives reload and encrypted transfer',async t=>{
 const {s,h}=fixture(),id=s.ids.find(id=>model.KunstTresor.isIntroImage(pool.find(w=>w.id===id))),bit=1<<s.ids.indexOf(id);s.forgeryPrepared=true;s.forgeryMode=true;s.forgery={id,image:'data:image/jpeg;base64,/9j/'};s.forgeryMarks={[id]:true};h.rooms[0].seen&=~bit;
 const app=await setup(t,{state:s,history:h});app.click('launch-skip');app.click('show-solution');
 const figures=[...app.q('.forgery-comparison-pair').querySelectorAll('figure')],original=figures[0],fake=figures[1],heart=original.querySelector('[data-gallery-like]');
 assert.ok(heart);assert.equal(heart.hidden,true);assert.equal(fake.querySelector('[data-gallery-like]'),null);
 assert.equal(app.q('.solution-overview [data-gallery-like="'+id+'"]'),null);
 original.querySelector('img').onload();assert.equal(heart.hidden,false);assert.equal(heart.disabled,false);heart.click();
 assert.equal(heart.getAttribute('aria-pressed'),'true');const gallery=JSON.parse(app.w.localStorage.getItem('kunsttresor-wall-gallery-v1')),history=JSON.parse(app.w.localStorage.getItem('kunsttresor-history-v1-wall'));
 assert.equal(gallery.liked.length,1);assert.equal(gallery.liked[0].id,id);assert.ok(history.rooms[0].seen&bit);
 const again=await setup(t,{state:s,history,gallery});again.click('launch-skip');again.click('game-gallery');assert.equal(again.q('#gallery-grid .gallery-image img').getAttribute('src'),data.kunstbilder.images.find(w=>w.id===id).imageURL);
 const progress=model.KunstProgress.recordWin(model.KunstProgress.fresh(),s,pool).profile,payload={app:'kunsttresor',version:1,savedAt:Date.now(),state:s,best:1,progress,history,gallery};
 const restored=app.w.KunstSave.validate(await app.w.KunstSave.decode(await app.w.KunstSave.encode(payload)),pool,[],app.w.KunstTresor,app.w.KunstProgress,app.w.KunstHistory,app.w.KunstGallery);assert.equal(restored.gallery.liked[0].id,id);
 heart.click();assert.equal(heart.getAttribute('aria-pressed'),'false');
 // A genuine lost room is made by the engine, not by a forged phase flag.
 const c=model.KunstTresor;let failed=c.newState(pool);failed.roomToken='c'.repeat(32);failed.runToken='d'.repeat(32);failed.parentRoomToken=null;
 for(let n=0;n<3;n++){for(const [i,wid]of failed.ids.entries())for(const field of c.fields)failed=c.choose(failed,wid,field,pool.find(w=>w.id===failed.ids[(i+1)%7])[field]);failed=c.inspect(failed,pool).state;}
 const other=await setup(t,{state:JSON.parse(JSON.stringify(failed))});other.click('launch-skip');other.click('show-solution');assert.equal(other.q('#solutions [data-gallery-like]'),null);
});
test('an older collected work opens as an original from its actual gallery thumbnail rather than a current quiz work',async t=>{
 const {s,h}=fixture(),id=s.ids[0],gallery=model.KunstGallery.like(model.KunstGallery.fresh(),id,s,pool),next=model.KunstTresor.newState(pool,s);
 assert.equal(next.ids.includes(id),false);const app=await setup(t,{state:JSON.parse(JSON.stringify(next)),history:h,gallery:JSON.parse(JSON.stringify(gallery))}),seen=[],inspect=app.w.KunstWall.inspect;
 app.w.KunstWall.inspect=(...args)=>{seen.push(args);inspect(...args);};app.click('launch-skip');app.click('game-gallery');
 const button=app.q('#gallery-grid .gallery-image');button.click();assert.equal(seen.at(-1)[0],id);assert.equal(seen.at(-1)[2],true);assert.equal(seen.at(-1)[3].image,button.querySelector('img'));assert.equal(seen.at(-1)[3].context,'gallery');
 assert.equal(app.q('#zoom-image').getAttribute('src'),button.querySelector('img').getAttribute('src'));assert.equal(app.q('#wall-work-controls').children.length,0);
 app.q('[data-close="image-dialog"]').click();assert.equal(app.q('#gallery-dialog').open,true);assert.equal(app.w.document.activeElement,button);
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

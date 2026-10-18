const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const badge=(id='first-door')=>({...require('../scripts/kunsttresor-progress.js').badges.find(badge=>badge.id===id),earned:true});
const flush=async()=>{for(let index=0;index<12;index++)await Promise.resolve();};
function setup(t,{reduced=false,native=true}={}){
 const dom=new JSDOM(read('kunsttresor.html'),{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,q=selector=>w.document.querySelector(selector),timers=new Map(),calls=[];let now=0,id=0,hidden=false,opened=0,collections=0,deferred=false;
 Object.defineProperty(w.document,'hidden',{get:()=>hidden});w.Date.now=()=>now;w.matchMedia=()=>({matches:reduced});
 w.setTimeout=(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;};w.clearTimeout=id=>timers.delete(id);
 w.Element.prototype.animate=function(frames,options){let reject;const finished=deferred?new Promise((_,no)=>{reject=no;}):Promise.resolve();const call={element:this,frames,options,cancelled:false};calls.push(call);return {finished,cancel(){call.cancelled=true;reject?.(Error('cancelled'));}};};
 const element=q('#badge-award'),live=q('#badge-award-live'),target=q('#solution-badges'),fallback=q('#open-badges'),rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
 target.getBoundingClientRect=()=>q('#solution-dialog').open?rect(900,20,100,40):rect(0,0,0,0);fallback.getBoundingClientRect=()=>rect(1000,20,100,40);q('.badge-award-seal').getBoundingClientRect=()=>rect(550,200,112,130);
 if(native){element.showPopover=()=>{opened++;};element.hidePopover=()=>{};}
 w.localStorage.setItem('unrelated','keep');w.eval(read('scripts/kunsttresor-badge-awards.js'));
 const controller=w.KunstBadgeAwards.create({element,live,targets:[target,fallback],onOpenCollection:()=>{collections++;}});
 async function advance(ms){const end=now+ms;while(true){const next=[...timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();await flush();}now=end;await flush();}
 t.after(()=>{controller.destroy();w.close();});
 return {w,q,element,live,controller,calls,advance,shown:()=>opened,collections:()=>collections,defer:()=>{deferred=true;},visibility(value){hidden=value;w.document.dispatchEvent(new w.Event('visibilitychange'));}};
}
test('earned seals are announced without focus stealing, grouped together and never replayed',async t=>{
 const app=setup(t),focus=app.q('#open-badges');focus.focus();app.controller.show([badge(),badge('clear-eye'),badge()]);
 assert.equal(app.element.hidden,false);assert.equal(app.q('h2#badge-award-title').textContent,'2 neue Abzeichen');assert.equal(app.q('.badge-award-list').children.length,2);assert.equal(app.w.document.activeElement,focus);assert.match(app.live.textContent,/Die erste Tür.*Sicherer Blick/);assert.equal(app.shown(),1);
 app.controller.clear();app.controller.show([badge(),{...badge('second-look'),earned:false}]);assert.equal(app.element.hidden,true);assert.equal(app.shown(),1);assert.equal(app.w.localStorage.getItem('unrelated'),'keep');
});
test('a single seal shows its own title and uses literal text, not HTML',t=>{
 const app=setup(t);app.controller.show([{...badge(),title:'<img src=x>',description:'<script>keine Ausführung</script>'}]);assert.equal(app.q('#badge-award-title').textContent,'<img src=x>');assert.equal(app.q('#badge-award-title img'),null);assert.equal(app.q('.badge-award-list').hidden,true);assert.match(app.q('.badge-award-description').textContent,/script/);
});
test('after its readable hold the seal flies to the visible curator collection control and vanishes',async t=>{
 const app=setup(t);app.q('#solution-dialog').open=true;app.controller.show([badge()]);await app.advance(4599);assert.equal(app.element.hidden,false);assert.equal(app.calls.length,0);await app.advance(1);assert.equal(app.element.hidden,true);assert.equal(app.q('.badge-award-flight'),null);assert.equal(app.calls.length,2);assert.equal(app.calls[1].element.id,'solution-badges');assert.equal(app.q('#solution-dialog').open,true);
});
test('reduced motion skips the flight and pulse while still announcing and showing the award',async t=>{
 const app=setup(t,{reduced:true});app.controller.show([badge()]);assert.equal(app.element.classList.contains('is-quiet'),true);assert.match(app.live.textContent,/Neues Abzeichen/);await app.advance(4600);assert.equal(app.element.hidden,true);assert.equal(app.calls.length,0);
});
test('opening or dismissing a reward does not change the game and the collection action is explicit',t=>{
 const app=setup(t);app.controller.show([badge()]);app.q('.badge-award-open').click();assert.equal(app.collections(),1);assert.equal(app.element.hidden,true);assert.equal(app.q('#badges-dialog').open,false);
 app.controller.show([badge('clear-eye')]);app.q('.badge-award-close').click();assert.equal(app.element.hidden,true);assert.equal(app.collections(),1);
});
test('visibility and focus pause the readable hold; Escape dismisses without closing the underlying dialog',async t=>{
 const app=setup(t);app.q('#solution-dialog').open=true;app.visibility(true);app.controller.show([badge()]);assert.equal(app.element.hidden,true);app.visibility(false);assert.equal(app.element.hidden,false);
 app.q('.badge-award-open').focus();await app.advance(15000);assert.equal(app.element.hidden,false);app.q('#solution-badges').focus();app.visibility(true);await app.advance(10000);assert.equal(app.element.hidden,false);app.visibility(false);await app.advance(4600);assert.equal(app.element.hidden,true);
 app.controller.show([badge('clear-eye')]);const event=new app.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});app.w.document.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(app.element.hidden,true);assert.equal(app.q('#solution-dialog').open,true);
});
test('clearing during a flight cancels it and cannot resurrect a stale award; later awards can still appear',async t=>{
 const app=setup(t);app.controller.show([badge()]);app.defer();await app.advance(4600);assert.ok(app.q('.badge-award-flight'));app.controller.clear();await flush();assert.equal(app.element.hidden,true);assert.equal(app.q('.badge-award-flight'),null);assert.equal(app.calls[0].cancelled,true);app.controller.show([badge('clear-eye')]);assert.equal(app.element.hidden,false);
});
test('popover fallback lives in the open dialog rather than being hidden behind its top layer',t=>{
 const app=setup(t,{native:false});app.q('#solution-dialog').open=true;app.controller.show([badge()]);assert.equal(app.element.parentElement.id,'solution-dialog');assert.equal(app.element.hasAttribute('popover'),false);assert.equal(app.element.hidden,false);app.controller.clear();assert.equal(app.q('#solution-dialog').open,true);
});
test('a later independent batch queues without replacing the reward being read',async t=>{
 const app=setup(t);app.controller.show([badge()]);app.controller.show([badge('second-look')]);assert.equal(app.q('#badge-award-title').textContent,'Die erste Tür');await app.advance(4600);assert.equal(app.q('#badge-award-title').textContent,'Der zweite Blick');assert.equal(app.element.hidden,false);assert.equal(app.shown(),2);
});

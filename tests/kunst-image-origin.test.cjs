const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
const box=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
function setup(t){
 const dom=new JSDOM(read('kunsttresor.html'),{runScripts:'outside-only',url:'https://example.test/kunsttresor.html'}),w=dom.window,$=id=>w.document.getElementById(id),calls=[];
 t.after(()=>w.close());w.KunstWallEnabled=true;w.ResizeObserver=class{observe(){}};w.requestAnimationFrame=()=>0;
 w.matchMedia=()=>({matches:false});w.KunstWallZoom={layout(){},zoom:100};w.HTMLElement.prototype.scrollIntoView=function(){};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 let deferred=false;
 w.Element.prototype.animate=function(frames,options){
  let resolve,reject;const finished=deferred?new Promise((a,b)=>{resolve=a;reject=b;}):Promise.resolve();
  const call={element:this,frames,options,resolve};calls.push(call);return {finished,cancel(){reject?.(Error('cancelled'));}};
 };
 const image=$('zoom-image');image.src='https://example.test/large.jpg';image.alt='Vergrößerte Ansicht: Richtiges Werk';image.decode=async()=>{};image.getBoundingClientRect=()=>box(100,50,800,600);
 $('zoom-view').getBoundingClientRect=()=>box(100,50,800,600);
 const card=w.document.createElement('article');card.dataset.id='same-work';card.innerHTML='<h3 class="work-title">Rätselwand</h3><button class="artwork-button"><img src="https://example.test/wall.jpg"></button><div class="artwork-actions"></div><div class="assignments"><select><option>Antwort</option></select></div>';$('art-grid').append(card);
 card.querySelector('img').getBoundingClientRect=()=>box(20,30,100,75);
 w.eval(read('scripts/kunsttresor-layout.js'));w.eval(read('scripts/kunsttresor-wall.js'));
 $('image-dialog').addEventListener('close',()=>w.KunstWall.restoreControls());
 function source(parent,id,rect){const button=w.document.createElement('button');button.innerHTML='<img src="https://example.test/'+id+'.jpg">';$(parent).append(button);button.querySelector('img').getBoundingClientRect=()=>rect;return button;}
 async function open(trigger,original=true,id='same-work'){const origin=w.KunstWall.captureOrigin(trigger);$('image-dialog').open=true;w.KunstWall.inspect(id,'A',original,origin);await flush();return origin;}
 async function close(){w.document.querySelector('[data-close="image-dialog"]').click();await flush();}
 return {w,$,calls,card,image,source,open,close,defer:()=>{deferred=true;}};
}
test('curator originals animate both ways to the clicked source, never to the same work on the quiz wall',async t=>{
 const app=setup(t),button=app.source('solution-dialog','original',box(420,180,150,200));app.$('solution-dialog').open=true;
 await app.open(button);assert.equal(app.calls.length,1);assert.match(app.calls[0].frames[0].transform,/translate\(320px,130px\) scale\(0.1875,0.3333333333333333\)/);
 assert.equal(app.$('wall-back').textContent,'← Kuratoransicht');assert.equal(app.$('wall-work-controls').children.length,0);assert.ok(app.card.querySelector('select'));
 assert.match(app.$('wall-settings').textContent,/zurück zur Kuratoransicht/);assert.doesNotMatch(app.$('wall-settings').textContent,/freien Plätze/);
 await app.close();assert.match(app.calls[1].frames[1].transform,/translate\(320px,130px\)/);assert.equal(app.$('solution-dialog').open,true);assert.equal(app.$('image-dialog').open,false);
 assert.equal(app.w.document.activeElement,button);assert.equal(button.querySelector('img').style.visibility,'');
});
test('original and forgery in a curator comparison retain separate return destinations',async t=>{
 const app=setup(t),original=app.source('solution-dialog','original',box(180,100,180,240)),fake=app.source('solution-dialog','fake',box(650,100,220,220));
 await app.open(original,true);await app.close();assert.match(app.calls[1].frames[1].transform,/translate\(80px,50px\)/);
 await app.open(fake,false);assert.equal(app.$('wall-work-controls').children.length,0);assert.equal(app.$('wall-next').hidden,true);
 await app.close();assert.match(app.calls[3].frames[1].transform,/translate\(550px,50px\)/);assert.equal(app.w.document.activeElement,fake);
});
test('a gallery work absent from the current quiz animates back into the personal gallery',async t=>{
 const app=setup(t),button=app.source('gallery-dialog','collected',box(200,250,180,240));app.$('gallery-dialog').open=true;
 await app.open(button,true,'older-work');assert.equal(app.calls.length,1);assert.equal(app.$('wall-back').textContent,'← Meine Galerie');
 assert.match(app.$('wall-settings').textContent,/zurück zur Galerie/);
 await app.close();assert.match(app.calls[1].frames[1].transform,/translate\(100px,200px\)/);assert.equal(app.$('gallery-dialog').open,true);assert.equal(app.w.document.activeElement,button);
});
test('return geometry is measured again after the source moves or the viewport changes',async t=>{
 const app=setup(t);let target=box(200,250,180,240);const button=app.source('gallery-dialog','resize',target);
 button.querySelector('img').getBoundingClientRect=()=>target;
 await app.open(button);target=box(530,160,90,120);await app.close();assert.match(app.calls[1].frames[1].transform,/translate\(430px,110px\) scale\(0.1125,0.2\)/);
});
test('gallery information enlargement returns to its own preview and keeps both parent dialogs open',async t=>{
 const app=setup(t),button=app.source('gallery-info-content','info-preview',box(250,150,300,220));app.$('gallery-dialog').open=true;app.$('gallery-info-dialog').open=true;
 await app.open(button,true,'older-work');assert.equal(app.$('wall-back').textContent,'← Bildinformationen');assert.match(app.$('wall-settings').textContent,/zurück zur Bildinformation/);assert.equal(app.$('wall-work-controls').children.length,0);
 await app.close();assert.match(app.calls[1].frames[1].transform,/translate\(150px,100px\)/);assert.equal(app.$('gallery-dialog').open,true);assert.equal(app.$('gallery-info-dialog').open,true);assert.equal(app.w.document.activeElement,button);
});
test('contain images use the actual painted rectangle instead of the empty letterbox',async t=>{
 const app=setup(t),button=app.source('solution-dialog','portrait',box(100,200,400,300)),img=button.querySelector('img');
 img.style.objectFit='contain';img.style.objectPosition='50% 50%';Object.defineProperty(img,'naturalWidth',{value:200});Object.defineProperty(img,'naturalHeight',{value:400});
 const origin=app.w.KunstWall.captureOrigin(button);assert.deepEqual(JSON.parse(JSON.stringify(origin.rect)),{left:225,top:200,width:150,height:300});
 await app.open(button);await app.close();assert.match(app.calls[1].frames[1].transform,/translate\(125px,150px\) scale\(0.1875,0.5\)/);
});
test('closing a panned enlargement starts from its clipped visible area and returns the whole image',async t=>{
 const app=setup(t),button=app.source('solution-dialog','zoomed',box(420,180,150,200));await app.open(button);
 app.image.getBoundingClientRect=()=>box(-200,-100,1200,900);app.$('zoom-view').getBoundingClientRect=()=>box(0,0,900,600);
 await app.close();const frames=app.calls[1].frames;assert.equal(frames[0].clipPath,'inset(100px 100px 200px 200px)');assert.equal(frames[1].clipPath,'inset(0px 0px 0px 0px)');assert.match(frames[1].transform,/translate\(620px,280px\)/);
});
test('removing the origin never redirects the animation to the underlying quiz picture',async t=>{
 const app=setup(t),button=app.source('solution-dialog','removed',box(420,180,150,200));await app.open(button);button.remove();await app.close();
 assert.equal(app.calls.length,1);assert.equal(app.$('image-dialog').open,false);assert.equal(app.w.document.querySelector('.wall-image-flight'),null);
});
test('repeated closing requests run one return animation and interrupted flights restore hidden pictures',async t=>{
 const app=setup(t),button=app.source('solution-dialog','interrupt',box(420,180,150,200));await app.open(button);app.defer();
 const close=app.w.document.querySelector('[data-close="image-dialog"]');close.click();close.click();assert.equal(app.calls.length,2);assert.equal(button.querySelector('img').style.visibility,'hidden');
 app.w.KunstWall.restoreControls();await flush();assert.equal(button.querySelector('img').style.visibility,'');assert.equal(app.w.document.querySelector('.wall-image-flight'),null);assert.equal(app.$('image-dialog').classList.contains('is-returning'),false);
});
test('reduced motion skips flying but returns to the clicked gallery control',async t=>{
 const app=setup(t),button=app.source('gallery-dialog','reduced',box(200,250,180,240));app.w.matchMedia=()=>({matches:true});await app.open(button);await app.close();
 assert.equal(app.calls.length,0);assert.equal(app.w.document.activeElement,button);assert.equal(app.$('image-dialog').open,false);
});
test('ending a two-finger touch is never mistaken for a tap on the loupe',t=>{
 const app=setup(t);let clicks=0;app.$('zoom-in').onclick=()=>{clicks++;};
 function emit(type,id){const event=new app.w.Event(type);Object.assign(event,{pointerId:id,pointerType:'touch',clientX:200,clientY:200,button:0});app.$('zoom-view').dispatchEvent(event);}
 emit('pointerdown',1);emit('pointerdown',2);emit('pointerup',2);emit('pointerup',1);assert.equal(clicks,0);
 emit('pointerdown',3);emit('pointerup',3);assert.equal(clicks,2);
});
test('a pinch can take over an opening animation immediately without closing or leaving a hidden image',async t=>{
 const app=setup(t),button=app.source('gallery-dialog','pinch',box(200,250,180,240));app.defer();await app.open(button);
 assert.ok(app.w.document.querySelector('.wall-image-flight'));app.w.KunstWall.interruptOpening();await flush();
 assert.equal(app.w.document.querySelector('.wall-image-flight'),null);assert.equal(app.image.style.opacity,'');assert.equal(app.$('image-dialog').open,true);
});

'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const intro=require('../scripts/kunsttresor-intro.js');
const js=fs.readFileSync(path.join(__dirname,'../scripts/kunsttresor.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../kunsttresor.html'),'utf8');
const works=Array.from({length:6},(_,i)=>({id:'work-'+i,imageURL:'small-'+i,imageLargeURL:'large-'+i,artist:'Artist '+i}));
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
class Element {
  constructor() {
    this.children=[];this.attributes={};this.textContent='';this.hidden=false;this.open=false;this.dataset={};
    const values=new Set();
    this.classList={add:(...names)=>names.forEach(n=>values.add(n)),remove:(...names)=>names.forEach(n=>values.delete(n)),contains:n=>values.has(n),toggle:(n,on)=>on?values.add(n):values.delete(n)};
    this.style={setProperty:(name,value)=>{this.style[name]=value;}};
  }
  append(child){this.children.push(child);}
  replaceChildren(){this.children=[];}
  setAttribute(name,value){this.attributes[name]=value;}
  removeAttribute(name){delete this.attributes[name];}
  focus(){}
}
class ImageStub extends Element {
  constructor(){super();this.naturalWidth=0;this.requests=[];this.decode=async()=>{};}
  set src(value){this.requests.push(value);this.attributes.src=value;}
  get src(){return this.attributes.src;}
  loaded(){this.naturalWidth=1200;return this.onload?.();}
  failed(){return this.onerror?.();}
}
function createFilm({consent=true}={}) {
  const elements=new Map(),images=[],timers=new Map(),events=[];
  let timerId=0;
  const context={
    imagesAllowed:consent,pool:works,landmarkIds:[],previousIntro:[],introPreparation:null,
    introEpoch:0,launchEpoch:0,introAudioEpoch:0,introWaitTimer:null,introTimer:null,introFadeTimer:null,
    introSoundEnabled:true,introSeconds:46,state:{escaped:2,attempts:1},keys:{images:'images'},
    aiAllowed:false,aiEnabled:true,aiChoiceConfirmed:false,aiEndpoint:'',aiConsentKey:'ai-consent',
    setAIEnabled:enabled=>{context.aiEnabled=enabled;},
    introAudio:{volume:.65,currentTime:0,pause:()=>events.push('pause')},
    $:id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},
    core:{introSelection:()=>{events.push('selection');return works;},shuffle:a=>a,galleryTitle:w=>w.id},
    window:{KunstIntro:{prepare:selected=>intro.prepare(selected,{createImage:()=>{const image=new ImageStub();images.push(image);return image;}})}},
    node:()=>new Element(),imageURL:w=>w.imageURL,
    clearTimeout:id=>timers.delete(id),setTimeout:(callback,ms)=>{const id=++timerId;timers.set(id,{callback,ms});return id;},
    clearInterval:id=>timers.delete(id),setInterval:()=>{throw Error('Unexpected fade before the finale.');},
    performance:{now:()=>0},
    open:id=>{context.$(id).open=true;events.push('open:'+id);},close:id=>{context.$(id).open=false;},
    startIntroAudio:()=>events.push('music'),enterFullscreen:async()=>events.push('fullscreen'),
    store:{set:()=>{}},heroImages:()=>{},render:()=>{},save:()=>{},toGame:()=>events.push('game')
  };
  vm.createContext(context);
  vm.runInContext(js.slice(js.indexOf('function prepareIntro()'),js.indexOf('function start()')),context);
  return {context,elements,images,timers,events};
}
test('first image is prepared in the background, without an external request before image consent',()=>{
  for(const consent of [false,true]) {
    const film=createFilm({consent});film.context.prepareLaunch();
    assert.equal(film.context.$('launch-dialog').open,true);
    assert.equal(film.images.length,consent?1:0);
    assert.equal(film.events.includes('selection'),consent);
    if(consent) {
      assert.deepEqual(film.images[0].requests,['large-0']);
      assert.equal(film.images[0].referrerPolicy,'no-referrer');
      assert.equal(film.images[0].fetchPriority,'high');
      assert.equal(film.context.introPreparation.status,'loading');
    }
  }
});
test('downloaded pixels must also finish decoding before the first image is ready',async()=>{
  let decoded;const image=new ImageStub();image.decode=()=>new Promise(resolve=>{decoded=resolve;});
  const prepared=intro.prepare(works,{createImage:()=>image});
  const loading=image.loaded();await flush();assert.equal(prepared.status,'loading');
  decoded();await loading;
  assert.equal(await prepared.ready,'ready');assert.equal(prepared.image,image);
});
test('a slow image holds the film clock, chapter, pan and music; hourglass appears after a short wait',async()=>{
  const film=createFilm(),c=film.context;c.prepareLaunch();
  const first=film.images[0];
  await c.launchGallery();
  assert.equal(film.images.length,1); // Reuse the launch-screen image, not a fresh selection or request.
  assert.deepEqual(first.requests,['large-0']);
  assert.equal(c.$('intro-slides').children[0].children[0],first);
  assert.equal(c.$('intro-dialog').classList.contains('is-loading'),true);
  assert.equal(c.$('intro-slides').attributes['aria-busy'],'true');
  assert.equal(c.$('intro-dialog').classList.contains('is-running'),false);
  assert.equal(c.$('intro-progress-bar').style.width,'0%');
  assert.equal(c.$('intro-slides').children.some(slide=>slide.classList.contains('is-started')),false);
  assert.equal(c.introAudio.volume,0);
  assert.equal(c.introTimer,null);
  assert.equal(c.$('intro-loading').hidden,true);
  const wait=[...film.timers.values()].find(timer=>timer.ms===450);wait.callback();
  assert.equal(c.$('intro-loading').hidden,false);
  assert.equal(c.introTimer,null); // Waiting can take arbitrarily long; no film chapter has elapsed.
  c.introAudio.currentTime=12;await first.loaded();await flush();
  assert.equal(c.$('intro-dialog').classList.contains('is-running'),true);
  assert.equal(c.$('intro-dialog').classList.contains('is-loading'),false);
  assert.equal(c.$('intro-loading').hidden,true);
  assert.equal(c.$('intro-slides').attributes['aria-busy'],'false');
  assert.equal(c.$('intro-slides').children[0].classList.contains('is-started'),true);
  assert.equal(film.timers.get(c.introTimer).ms,7000);
  assert.equal(c.introAudio.currentTime,0);assert.equal(c.introAudio.volume,.65);
  assert.equal(c.previousIntro.length,6);
});
test('an already decoded preloaded image starts without showing a loading panel',async()=>{
  const film=createFilm(),c=film.context;c.prepareLaunch();
  await film.images[0].loaded();await flush();
  assert.equal(c.introPreparation.status,'ready');
  await c.launchGallery();await flush();
  assert.equal(c.$('intro-loading').hidden,true);
  assert.equal(c.$('intro-dialog').classList.contains('is-running'),true);
  assert.equal(film.images.length,1);assert.equal(c.introWaitTimer,null);
});
test('skip during loading cancels decoding and never restarts the film on a late image',async()=>{
  const film=createFilm(),c=film.context;c.prepareLaunch();
  let decoded;film.images[0].decode=()=>new Promise(resolve=>{decoded=resolve;});
  await c.launchGallery();const loading=film.images[0].loaded();await flush();
  c.finishIntro({enterGame:true});decoded();await loading;await flush();
  assert.equal(c.$('intro-dialog').open,false);assert.equal(c.introPreparation,null);
  assert.equal(c.introTimer,null);assert.equal(c.introWaitTimer,null);
  assert.equal(film.images[0].src,undefined);
  assert.equal(film.events.at(-1),'game');assert.equal(c.previousIntro.length,0);
  assert.equal(film.events.filter(event=>event==='music').length,1); // Only the silent initial unlock.
});
test('direct play does not wait for the background image and preserves the saved room',async()=>{
  const film=createFilm(),c=film.context;c.prepareLaunch();const saved=c.state;
  await c.launchGallery(false);await flush();
  assert.equal(c.state,saved);assert.equal(saved.escaped,2);assert.equal(saved.attempts,1);
  assert.equal(film.events.includes('game'),true);assert.equal(film.events.includes('music'),false);
  assert.equal(c.introPreparation,null);assert.equal(c.$('intro-dialog').open,false);
});
test('image failure tries the smaller original, then retains a retry/skip screen instead of a blank film',async()=>{
  const film=createFilm(),c=film.context;c.prepareLaunch();await c.launchGallery();
  const first=film.images[0];first.failed();assert.deepEqual(first.requests,['large-0','small-0']);
  first.failed();await flush();
  assert.equal(c.introPreparation.status,'failed');
  assert.equal(c.$('intro-dialog').open,true);assert.equal(c.$('intro-loading').hidden,false);
  assert.equal(c.$('intro-retry').hidden,false);assert.equal(c.introTimer,null);
  assert.match(c.$('intro-loading-title').textContent,/nicht erreichbar/);
  assert.equal(c.introAudio.volume,0);
});
test('decode failure also falls back; no-source and double-failure promises settle without rejection',async()=>{
  const image=new ImageStub();image.decode=async()=>{throw Error('decode');};
  const prepared=intro.prepare(works,{createImage:()=>image});await image.loaded();
  assert.deepEqual(image.requests,['large-0','small-0']);image.failed();
  assert.equal(await prepared.ready,'failed');
  const empty=intro.prepare([{id:'missing'}],{createImage:()=>new ImageStub()});
  assert.equal(await empty.ready,'failed');
});
test('cancelling a background request settles it and ignores old load/error callbacks',async()=>{
  const image=new ImageStub(),prepared=intro.prepare(works,{createImage:()=>image});
  const oldLoad=image.onload,oldError=image.onerror;
  prepared.cancel();image.naturalWidth=1200;await oldLoad();oldError();
  assert.equal(await prepared.ready,'cancelled');assert.deepEqual(image.requests,['large-0']);
  assert.equal(image.src,undefined);
});
test('revocation or cancellation while fullscreen is pending must not reopen the film',async()=>{
  const film=createFilm(),c=film.context;let fullscreenDone;
  c.enterFullscreen=()=>new Promise(resolve=>{fullscreenDone=resolve;});
  const launch=c.launchGallery();c.imagesAllowed=false;c.finishIntro();fullscreenDone();
  await launch;await flush();
  assert.equal(c.$('intro-dialog').open,false);assert.equal(c.introPreparation,null);
  assert.equal(c.introTimer,null);
});
test('the loading screen has an accessible hourglass/status, skip and retry, with no pre-start pan',()=>{
  assert.ok(html.includes('id="intro-loading-skip"'));
  assert.ok(html.includes('class="intro-hourglass"'));
  assert.ok(html.includes('role="status" aria-live="polite" aria-atomic="true"'));
  assert.ok(js.includes("$('intro-loading-skip').onclick = $('intro-skip').onclick"));
  assert.ok(js.includes("$('intro-retry').onclick = () => { finishIntro(); void launchGallery(); }"));
  assert.ok(html.indexOf('scripts/kunsttresor-intro.js')<html.indexOf('scripts/kunsttresor.js'));
  const prep=js.slice(js.indexOf('function prepareIntro()'),js.indexOf('function prepareLaunch()'));
  assert.doesNotMatch(prep,/rememberWork|save\(/); // Background pictures are not played-room history.
});

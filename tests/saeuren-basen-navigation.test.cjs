const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
function setup(t){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'saeuren-basen-mission.html'),'utf8'),{url:'https://test.invalid/LearningApps2/saeuren-basen-mission.html',runScripts:'outside-only'});
  const w=dom.window,q=s=>w.document.querySelector(s),frames=[];let top=0,scrolls=[];
  w.matchMedia=()=>({matches:true});w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
  w.HTMLElement.prototype.scrollIntoView=function(options){scrolls.push({id:this.id,options});};
  q('.app-header').getBoundingClientRect=()=>({height:72});
  const sections=['start','konzepte','ph','saeuren','basen','verknuepfung','titration','puffer','training'];
  sections.forEach((id,index)=>{q('#'+id).getBoundingClientRect=()=>({top:index*1000-top});});
  w.localStorage.setItem('protonen-mission-v1','{"answers":{"test":"unchanged"}}');
  w.eval(fs.readFileSync(path.join(root,'scripts/saeuren-basen-navigation.js'),'utf8'));
  t.after(()=>w.close());
  return {w,q,scrolls,scroll(value){top=value;w.dispatchEvent(new w.Event('scroll'));while(frames.length)frames.shift()();}};
}
test('right navigation starts collapsed, preserves the original route, and links only to existing destinations',t=>{
  const {w,q}=setup(t);
  assert.ok(w.document.documentElement.classList.contains('acid-nav-ready'));
  assert.equal(q('#acid-side-nav').hidden,false);assert.equal(q('#acid-nav-panel').hidden,true);
  assert.equal(q('#acid-nav-toggle').getAttribute('aria-expanded'),'false');
  assert.equal(q('.route').querySelectorAll('a').length,8);
  for(const a of q('#acid-nav-links').querySelectorAll('a'))assert.ok(q(a.hash),a.hash);
  for(const id of ['concept-lab','equilibrium-lab','titration-lab','buffer-lab','hagg-lab','blutpuffer'])assert.ok(q('#acid-nav-links a[href="#'+id+'"]'));
  assert.equal(w.localStorage.getItem('protonen-mission-v1'),'{"answers":{"test":"unchanged"}}');
});
test('opening, Escape and close controls communicate state and restore keyboard focus',t=>{
  const {w,q}=setup(t);q('#acid-nav-toggle').click();
  assert.equal(q('#acid-nav-panel').hidden,false);assert.equal(q('#acid-nav-toggle').getAttribute('aria-expanded'),'true');
  assert.ok(q('#acid-nav-links').contains(w.document.activeElement));
  w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(q('#acid-nav-panel').hidden,true);assert.equal(w.document.activeElement,q('#acid-nav-toggle'));
  q('#acid-nav-toggle').click();q('#acid-nav-close').click();assert.equal(q('#acid-nav-panel').hidden,true);assert.equal(w.document.activeElement,q('#acid-nav-toggle'));
});
test('jumping to a lab folds the panel, updates the hash and focuses its real heading without resetting data',t=>{
  const {w,q,scrolls}=setup(t);q('#acid-nav-toggle').click();q('#acid-nav-links a[href="#titration-lab"]').click();
  assert.equal(w.location.hash,'#titration-lab');assert.equal(q('#acid-nav-panel').hidden,true);
  assert.ok(q('#titration-lab').contains(w.document.activeElement));
  assert.ok(scrolls.some(s=>s.id==='titration-lab'&&s.options.behavior==='instant'));
  assert.equal(w.localStorage.getItem('protonen-mission-v1'),'{"answers":{"test":"unchanged"}}');
});
test('scrolling marks exactly the current chapter and the menu closes when focus or a click leaves it',t=>{
  const {w,q,scroll}=setup(t);scroll(6100);
  assert.equal(q('#acid-nav-links [aria-current]').hash,'#titration');
  assert.equal(q('#acid-nav-links').querySelectorAll('[aria-current]').length,1);
  q('#acid-nav-toggle').click();q('#formula-open').focus();assert.equal(q('#acid-nav-panel').hidden,true);
  q('#acid-nav-toggle').click();q('#start').click();assert.equal(q('#acid-nav-panel').hidden,true);
});
test('native fullscreen hides the navigation and restores it without reopening the panel',t=>{
  const {w,q}=setup(t);q('#acid-nav-toggle').click();
  Object.defineProperty(w.document,'fullscreenElement',{configurable:true,value:q('#concept-lab')});
  w.document.dispatchEvent(new w.Event('fullscreenchange'));assert.equal(q('#acid-side-nav').hidden,true);assert.equal(q('#acid-nav-panel').hidden,true);
  Object.defineProperty(w.document,'fullscreenElement',{configurable:true,value:null});
  w.document.dispatchEvent(new w.Event('fullscreenchange'));assert.equal(q('#acid-side-nav').hidden,false);assert.equal(q('#acid-nav-panel').hidden,true);
});

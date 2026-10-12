const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),root=path.join(__dirname,'..');
function setup(t,{reduced=false}={}){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'saeuren-basen-mission.html'),'utf8'),{runScripts:'outside-only',url:'https://test.invalid/'}),w=dom.window,q=s=>w.document.querySelector(s),frames=new Map();let serial=0;
  w.matchMedia=query=>({matches:query.includes('reduced-motion')&&reduced,addEventListener(){}});
  w.AcidTypeset={replace(element,html){element.innerHTML=html;}};
  w.requestAnimationFrame=callback=>{const id=++serial;frames.set(id,callback);return id;};w.cancelAnimationFrame=id=>frames.delete(id);
  w.eval(fs.readFileSync(path.join(root,'scripts/saeuren-basen-reaktionen.js'),'utf8'));w.AcidReactionLab.init();
  const select=k=>q(`[data-reaction="${k}"]`).click(),step=n=>q(`[data-reaction-step="${n}"]`).click();
  const tick=time=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time));};
  const symbols=()=>[...q('#reaction-stage').querySelectorAll('.reaction-atom > text:first-child')].map(el=>el.textContent).sort();
  t.after(()=>w.close());return{w,q,frames,select,step,tick,symbols};
}
test('proton transfer conserves atoms and pairs and displays the charged conjugate products',t=>{
  const {q,select,step,symbols}=setup(t);
  for(const [kind,donor,acceptor,pairs] of [['acid','Cl⁻','H₃O⁺',6],['base','OH⁻','NH₄⁺',4]]){
    select(kind);const before=symbols();assert.equal(q('#reaction-stage').querySelectorAll('.reaction-pair').length,pairs);
    assert.ok(q('[data-bond="old-proton-bond"]'));assert.equal(q('[data-bond="new-proton-bond"]'),null);
    step(1);assert.deepEqual(symbols(),before);assert.equal(q('#reaction-stage').querySelectorAll('.reaction-pair').length,pairs);
    assert.equal(q('#reaction-stage').querySelectorAll('.reaction-electron-arrow').length,2);
    step(2);assert.deepEqual(symbols(),before);assert.equal(q('#reaction-stage').querySelectorAll('.reaction-pair').length,pairs);
    assert.equal(q('[data-bond="old-proton-bond"]'),null);assert.ok(q('[data-bond="new-proton-bond"]'));
    assert.ok(q('#reaction-left-label').textContent.startsWith(donor));assert.ok(q('#reaction-right-label').textContent.startsWith(acceptor));
    const charges=[...q('#reaction-stage').querySelectorAll('.reaction-charge')].map(e=>e.textContent).sort();assert.deepEqual(charges,['+','−']);
    assert.equal(q('#reaction-stage').querySelectorAll('.reaction-electron-arrow').length,0);
  }
});
test('Lewis addition forms a shared N-B pair with no proton transfer and a neutral formal-charge sum',t=>{
  const {q,select,step,symbols}=setup(t);select('lewis');const before=symbols();
  assert.equal(q('[data-bond="coordinate-bond"]'),null);assert.equal(q('#reaction-stage').querySelectorAll('.reaction-pair').length,1);
  step(1);assert.deepEqual(symbols(),before);assert.equal(q('#reaction-stage').querySelectorAll('.reaction-electron-arrow').length,1);
  assert.equal(q('[data-atom="transferred-hydrogen"]'),null);
  step(2);assert.deepEqual(symbols(),before);assert.ok(q('[data-bond="coordinate-bond"]'));
  assert.equal(q('#reaction-stage').querySelectorAll('.reaction-pair').length,1);
  assert.equal(q('[data-atom="nitrogen"] .reaction-charge').textContent,'+');assert.equal(q('[data-atom="boron"] .reaction-charge').textContent,'−');
  assert.match(q('#reaction-explanation').textContent,/insgesamt neutrale/);assert.match(q('#reaction-explanation').textContent,/keine zwei getrennten Ionen/);
});
test('playback finishes once, holds products, and cancels cleanly on step or reaction changes',t=>{
  const {q,select,step,tick,frames}=setup(t);q('#reaction-play').click();assert.equal(frames.size,1);
  tick(0);tick(3250);assert.equal(q('[data-reaction-step="1"]').getAttribute('aria-pressed'),'true');
  tick(6500);assert.equal(frames.size,0);assert.equal(q('#reaction-stage').dataset.progress,'1');assert.match(q('#reaction-play').textContent,/Noch einmal/);
  q('#reaction-play').click();tick(10000);tick(11500);step(0);assert.equal(frames.size,0);assert.equal(q('#reaction-stage').dataset.progress,'0');
  q('#reaction-play').click();tick(12000);tick(13000);select('lewis');assert.equal(frames.size,0);assert.equal(q('#reaction-stage').dataset.reactionKind,'lewis');
  q('#reaction-play').click();tick(14000);tick(15000);q('#reaction-play').click();assert.equal(frames.size,0);const paused=q('#reaction-stage').dataset.progress;
  q('#reaction-play').click();tick(16000);assert.equal(q('#reaction-stage').dataset.progress,paused);tick(22500);assert.equal(frames.size,0);assert.equal(q('#reaction-stage').dataset.progress,'1');
});
test('reduced motion retains all states and reveals products without starting movement',t=>{
  const {q,step,frames}=setup(t,{reduced:true});assert.equal(q('#reaction-play').textContent,'Produkte zeigen');q('#reaction-play').click();assert.equal(frames.size,0);assert.equal(q('#reaction-stage').dataset.progress,'1');step(1);assert.equal(q('#reaction-stage').dataset.progress,'0.5');
});
test('all three scientists open the existing Wikipedia reader with their actual article titles',t=>{
  const {q}=setup(t);
  for(const title of ['Svante Arrhenius','Johannes Nicolaus Brønsted','Gilbert Newton Lewis'])assert.ok(q(`.scientist-row [data-wiki="${title}"]`));
});

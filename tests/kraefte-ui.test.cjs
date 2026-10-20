const{test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const{JSDOM}=require('jsdom');const dir=path.resolve(__dirname,'..');
const tick=ms=>new Promise(r=>setTimeout(r,ms));
function fixture(blocked=false,start=true){
 const dom=new JSDOM(fs.readFileSync(path.join(dir,'kraefte-labor.html'),'utf8'),{url:'https://example.test/LearningApps2/kraefte-labor.html',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,$=id=>w.document.getElementById(id);
 w.matchMedia=()=>({matches:true});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 if(blocked)Object.defineProperty(w,'localStorage',{get(){throw new Error('blocked')}});
 for(const f of['kraefte-core.js','kraefte-inhalte.js','kraefte-labor.js'])w.eval(fs.readFileSync(path.join(dir,'scripts',f),'utf8'));
 if(start)$('start-without-images').click();
 return{w,$,dom};
}
test('default theme, shared question pool and fixed example, all teaching resources available',async()=>{
 const f=fixture();assert.equal(f.w.document.documentElement.dataset.palette,'graphite');assert.equal(f.w.KraefteApp.round().length,10);assert.equal(f.$('slide-select').options.length,57);assert.equal(f.w.KraefteApp.slides().filter(s=>s.role==='prompt').length,10);assert.ok(f.$('example-solution').textContent.includes('4,91 N/m'));assert.ok(f.w.document.querySelector('a[download][href^="material/kraefte-arbeitsblatt.pdf"]'));await tick(150);f.dom.window.close();
});
test('at most 30 g in integer steps; samples deduplicate, all spring modes remain independent',async()=>{
 const f=fixture();f.$('mass-range').value='30';f.$('mass-range').dispatchEvent(new f.w.Event('input'));assert.equal(f.$('mass-more').disabled,true);assert.equal(f.w.KraefteApp.snapshot().lab.mass,30);f.$('measure').click();f.$('measure').click();assert.equal(f.w.KraefteApp.snapshot().lab.records.length,1);f.w.document.querySelector('[data-mode=series]').click();f.$('measure').click();assert.equal(f.w.KraefteApp.snapshot().lab.records.length,2);assert.equal(f.$('force-value').textContent,'0,2943 N');await tick(150);f.dom.window.close();
});
test('after two mistakes the worked solution appears automatically; answered tasks cannot be farmed',async()=>{
 const f=fixture(),task=f.w.KraefteApp.round()[0];const wrong=(task.correctIndex+1)%task.options.length;
 f.$('answer-form').querySelector('[value="'+wrong+'"]').checked=true;f.$('answer-form').dispatchEvent(new f.w.Event('submit',{cancelable:true}));assert.equal(f.w.KraefteApp.snapshot().results[task.id].attempts,1);assert.ok(!f.$('task-card').textContent.includes('Vollständige Musterlösung'));
 f.$('answer-form').querySelector('[value="'+wrong+'"]').checked=true;f.$('answer-form').dispatchEvent(new f.w.Event('submit',{cancelable:true}));assert.equal(f.w.KraefteApp.snapshot().results[task.id].attempts,2);assert.ok(f.$('task-card').textContent.includes('Vollständige Musterlösung'));f.$('answer-form').dispatchEvent(new f.w.Event('submit',{cancelable:true}));assert.equal(f.w.KraefteApp.snapshot().results[task.id].attempts,2);await tick(150);f.dom.window.close();
});
test('all numeric fields show decimal places, gray-format examples and two-percent tolerance; unit changes keep typed text',async()=>{
 const f=fixture(),C=f.w.KraefteCore,tasks=f.w.KraefteApp.round();
 assert.equal(f.$('answer-format'),null);assert.equal(f.$('example-rounding').textContent,C.answerFormat(C.example()).instruction);
 for(let i=2;i<tasks.length;i++){
  f.w.document.querySelector('[data-task="'+i+'"]').click();const task=tasks[i];
  for(const u of C.units[task.dimension]){
   f.$('answer-number').value='2,345';f.$('answer-unit').value=u[0];f.$('answer-unit').dispatchEvent(new f.w.Event('change'));
   const format=C.answerFormat(task,u[0]);assert.equal(f.$('answer-number').placeholder,format.example);assert.equal(f.$('answer-format').textContent,format.instruction);assert.match(f.$('answer-note').textContent,/±2 %/);assert.equal(f.$('answer-number').value,'2,345');
  }
  assert.equal(f.w.KraefteApp.snapshot().results[task.id],undefined);
 }
 const task=tasks.at(-1),u=C.units[task.dimension][0];f.$('answer-unit').value=u[0];f.$('answer-unit').dispatchEvent(new f.w.Event('change'));f.$('answer-number').value=String(task.expectedSI/u[1]*1.019).replace('.',',');f.$('answer-form').dispatchEvent(new f.w.Event('submit',{cancelable:true}));assert.equal(f.w.KraefteApp.snapshot().results[task.id].status,'correct');
 assert.equal(f.$('answer-format').textContent,C.answerFormat(task,u[0]).instruction);await tick(150);f.dom.window.close();
});
test('reset confirmation creates new selection and clears this round, keeping appearance and fixed example',async()=>{
 const f=fixture();const before=f.w.KraefteApp.snapshot().seed,example=f.w.KraefteApp.example();f.$('palette').value='plum';f.$('palette').dispatchEvent(new f.w.Event('change'));f.$('measure').click();f.$('reset-open').click();assert.equal(f.$('reset-dialog').open,true);assert.equal(f.w.KraefteApp.snapshot().seed,before);f.$('reset-confirm').click();assert.notEqual(f.w.KraefteApp.snapshot().seed,before);assert.equal(f.w.KraefteApp.snapshot().lab.records.length,0);assert.equal(f.$('palette').value,'plum');assert.deepEqual(f.w.KraefteApp.example(),example);await tick(150);f.dom.window.close();
});
test('blocked storage still permits learning, settings and reset; fullscreen fallback can be left with Escape',async()=>{
 const f=fixture(true);f.$('presentation-fullscreen').click();await tick(10);assert.equal(f.$('presentation').classList.contains('is-fullscreen'),true);f.w.document.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'ArrowRight'}));assert.equal(f.w.KraefteApp.snapshot().slide,1);f.w.document.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(f.$('presentation').classList.contains('is-fullscreen'),false);f.$('reset-confirm').click();assert.equal(f.w.KraefteApp.round().length,10);await tick(150);f.dom.window.close();
});
test('Wikimedia photos never load before consent and can be switched off, including future slides',async()=>{
 const f=fixture();assert.equal(f.w.document.querySelectorAll('img[src]').length,0);f.$('media-toggle').click();assert.equal(f.w.document.querySelectorAll('img[src]').length,4);for(const image of f.w.document.querySelectorAll('img')){assert.equal(image.crossOrigin,'anonymous');assert.equal(image.referrerPolicy,'no-referrer');assert.match(image.src,/^https:\/\/upload\.wikimedia\.org\//);}f.$('slide-select').value='2';f.$('slide-select').dispatchEvent(new f.w.Event('change'));assert.ok(f.$('slide').querySelector('img'));f.$('media-toggle').click();assert.equal(f.w.document.querySelectorAll('img').length,0);f.$('slide-select').value='11';f.$('slide-select').dispatchEvent(new f.w.Event('change'));assert.equal(f.$('slide').querySelectorAll('img').length,0);await tick(150);f.dom.window.close();
});
test('disclaimer precedes the hidden app; either start choice opens it, consent stays visit-only',async()=>{
 for(const allowed of[false,true]){
  const f=fixture(allowed,false);assert.equal(f.$('entry-screen').hidden,false);assert.equal(f.$('app-shell').hidden,true);assert.equal(f.$('app-shell').hasAttribute('inert'),true);assert.equal(f.w.document.querySelectorAll('img[src]').length,0);
  f.$(allowed?'start-with-images':'start-without-images').click();assert.equal(f.$('entry-screen').hidden,true);assert.equal(f.$('app-shell').hidden,false);assert.equal(f.$('app-shell').hasAttribute('inert'),false);assert.equal(f.w.document.querySelectorAll('img[src]').length,allowed?4:0);assert.ok(f.$('view-dialog').contains(f.$('media-toggle')));await tick(150);f.dom.window.close();
 }
});

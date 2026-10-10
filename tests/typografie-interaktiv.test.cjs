'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../scripts/typografie-bewegung-core.js'),root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8'),html=read('typografie-atelier.html'),ui=read('scripts/typografie-bewegung.js');
test('eight approved margin voices appear once, in the intended chapters, without attribution',()=>{
  const places={modern:'word',plakat:'richtung',proportion:'komposition',bild:'bild-und-text',format:'bildschirmformate',hintergrund:'hintergrund',hero:'herobereiche',bewegung:'bewegte-grafik'};
  assert.equal((html.match(/data-randstimme=/g)||[]).length,8);
  for(const [name,id]of Object.entries(places)){
    const tail=html.slice(html.indexOf('id="'+id+'"'));
    const chapter=tail.slice(0,tail.indexOf('<section class="chapter'));
    const voice=chapter.match(new RegExp('<aside class="author-essay author-comment" data-randstimme="'+name+'"[\\s\\S]*?</aside>'))[0];
    assert.equal((voice.match(/aria-hidden="true">„<\/span>/g)||[]).length,1);
    assert.ok(!/Claus|Unterberg|Autorenkommentar|Meinung|“|”/.test(voice));
  }
  const order=['data-randstimme="proportion"','id="asymmetrie-raster"'];assert.ok(html.indexOf(order[0])<html.indexOf(order[1]));
});
test('the composition score has four held decisions and a finite, seekable end',()=>{
  assert.equal(M.duration,24);assert.deepEqual(M.scenes.map(s=>s.at),[0,6,12,20]);
  for(const s of M.scenes){
    const f=M.frame(s.at);assert.equal(f.index,M.scenes.indexOf(s));assert.deepEqual(f.words,s.words);assert.deepEqual(M.frame(s.at+1).words,s.words);
  }
  assert.equal(M.time(-4),0);assert.equal(M.time(500),24);assert.equal(M.time(NaN),0);assert.equal(M.time('bad'),0);
  assert.deepEqual(M.frame(24),M.frame(500));
  assert.deepEqual(M.frame(6).words.map(w=>w[0]),[94,94,94]);
  assert.ok(M.frame(20).paper[2]<M.frame(12).paper[2]);
  assert.equal(M.frame(20).copy[0],335);assert.equal(M.frame(20).action[0],335);
});
test('every intermediate composition stays finite and in its designed viewport',()=>{
  for(let t=0;t<=24;t+=.05)for(const narrow of [false,true]){
    const f=M.frame(t,narrow),nums=['paper','words','kicker','copy','action','color','amp','camera'].flatMap(k=>f[k].flat(Infinity));
    assert.ok(nums.every(Number.isFinite));assert.ok(f.paper[2]>=350&&f.paper[2]<=880);assert.ok(f.camera[2]>=400&&f.camera[2]<=960);
    assert.ok(f.guides>=0&&f.guides<=.5);assert.ok(f.annotation>=0&&f.annotation<=1);
    for(const word of f.words){assert.ok(word[0]>0&&word[0]<960);assert.ok(word[1]>0&&word[1]<620);assert.ok(word[3]>=56&&word[3]<=110);}
  }
  assert.deepEqual(M.frame(20,true).camera,[280,0,400,620]);assert.deepEqual(M.frame(20,false).camera,[0,0,960,620]);
});
test('motion requires consent, visibility and both movement permissions; sleep never skips the sequence',()=>{
  const o={requested:true,reduced:false,paused:false,visible:true,hidden:false,time:6};assert.equal(M.running(o),true);
  for(const override of [{requested:false},{reduced:true},{paused:true},{visible:false},{hidden:true},{time:24}])assert.equal(M.running({...o,...override}),false);
  assert.equal(M.advance(6,60),6.12);assert.equal(M.advance(6,-1),6);assert.equal(M.advance(6,NaN),6);assert.equal(M.advance(23.95,.12),24);
  assert.ok(ui.includes('cancelAnimationFrame(raf)'));assert.ok(ui.includes('last=null'));assert.ok(ui.includes('IntersectionObserver'));assert.ok(ui.includes('visibilitychange'));
});
test('static alternatives, keyboard seeking, reset and controls are retained under reduced motion',()=>{
  for(const id of ['kinetic-time','kinetic-time-help','kinetic-reset','kinetic-scene-note','image-motion-toggle'])assert.ok(html.includes('id="'+id+'"'));
  assert.equal((html.match(/data-kinetic-scene="[0-3]"/g)||[]).length,4);
  assert.ok(html.includes('Die vier Entscheidungen ohne Animation lesen'));assert.ok(html.includes('keine Simulation eines Browserumbruchs'));
  assert.ok(ui.includes('play.disabled=s.reduced||s.paused'));assert.ok(ui.includes("slider.addEventListener('input'"));assert.ok(ui.includes("$('kinetic-reset').addEventListener('click'"));
  assert.ok(!/fetch\(|localStorage|setInterval|innerHTML/.test(ui));assert.ok(!html.includes('flow-dot'));
});
test('interaction chapter uses the actual labs and live page appearance rather than screenshots',()=>{
  const chapter=html.match(/<section[^>]*id="interaktiv"[^>]*>([\s\S]*?)<\/section>/)[1];
  for(const target of ['details','satzlabor','farbe','bildschirmformate','texatelier','entscheidungen','webwerkstatt'])assert.ok(chapter.includes('href="#'+target+'"'));
  for(const term of ['Vermuten','Verändern','Beobachten','Begründen','Hell und Dunkel','Browserzoom','Tastaturfokus','nicht dauerhaft gespeichert'])assert.ok(chapter.includes(term));
  for(const control of ['data-page-theme','data-page-glyphs','data-page-motion'])assert.ok(chapter.includes(control));
  assert.ok(read('scripts/typografie-atelier.js').includes("querySelectorAll('#motion-toggle,[data-page-motion]')"));
  assert.ok(read('scripts/typografie-ansicht.js').includes("$('reader-appearance-state')"));
  for(const source of ['keyboard.html','on-input.html','contrast-minimum.html'])assert.ok(chapter.includes(source));
});

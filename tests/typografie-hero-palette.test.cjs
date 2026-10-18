'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),A=require('../scripts/typografie-ansicht-core.js'),H=require('../scripts/typografie-hero-core.js');
function setup(t,{query='',stored,blocked=false}={}){
 const dom=new JSDOM(read('typografie-atelier.html'),{runScripts:'outside-only',url:'https://example.test/typografie-atelier.html'+query,pretendToBeVisual:true}),w=dom.window;
 t.after(()=>w.close());w.matchMedia=()=>({matches:false,addEventListener(){}});w.requestAnimationFrame=()=>1;w.lucide={createIcons(){}};
 w.ResizeObserver=class{observe(){}};w.IntersectionObserver=class{observe(){}};
 Object.defineProperty(w.document,'fonts',{value:{ready:Promise.resolve(),load:async()=>[]}});
 if(stored!==undefined)w.localStorage.setItem('typografie-atelier-appearance',stored);
 if(blocked)Object.defineProperty(w,'localStorage',{get(){throw Error('Storage blocked');}});
 w.eval(read('scripts/typografie-ansicht-core.js'));
 return {w,q:s=>w.document.querySelector(s)};
}
test('Graphite/light is the first paint and validated default; explicit choices survive a visit',t=>{
 const s=setup(t);assert.equal(s.q('html').dataset.palette,'graphite');s.w.eval(read('scripts/typografie-ansicht.js'));
 assert.equal(s.w.TypoAppearance.current().palette,'graphite');assert.equal(s.w.TypoAppearance.current().theme,'light');
 s.q('[data-palette-choice="plum"][data-theme-choice="dark"]').click();
 const stored=s.w.localStorage.getItem('typografie-atelier-appearance');assert.equal(JSON.parse(stored).palette,'plum');
 const again=setup(t,{stored});again.w.eval(read('scripts/typografie-ansicht.js'));
 assert.equal(again.q('html').dataset.palette,'plum');assert.equal(again.q('html').dataset.theme,'dark');
});
test('bad or blocked storage cannot prevent changing the appearance, and previews never overwrite saved choices',t=>{
 for(const options of [{stored:'{broken'},{stored:JSON.stringify({palette:'unknown',theme:'evil'})},{blocked:true}]){
  const s=setup(t,options);s.w.eval(read('scripts/typografie-ansicht.js'));assert.equal(s.q('html').dataset.palette,'graphite');
  s.q('[data-palette-choice="slate"][data-theme-choice="dark"]').click();assert.equal(s.q('html').dataset.palette,'slate');
 }
 const stored=JSON.stringify({palette:'bordeaux',theme:'dark'}),s=setup(t,{query:'?format-preview=1',stored});
 s.w.eval(read('scripts/typografie-ansicht.js'));assert.equal(s.q('html').dataset.palette,'graphite');
 s.w.TypoAppearance.apply({palette:'slate',theme:'dark'},false);assert.equal(s.q('html').dataset.palette,'slate');
 assert.equal(s.w.localStorage.getItem('typografie-atelier-appearance'),stored);
});
test('four distinct hero choices keep the palette-bound alternative and the original studies independent',t=>{
 const s=setup(t);s.w.TypoImages=require('../scripts/typografie-bild-core.js');s.w.eval(read('scripts/typografie-bilder.js'));
 assert.deepEqual([...s.q('#hero-study').options].map(o=>o.value),['palette','new','previous','image']);
 for(const kind of ['palette','new','previous','image','palette']){
  s.q('#hero-study').value=kind;s.q('#hero-study').dispatchEvent(new s.w.Event('change'));
  assert.equal(Boolean(s.q('#hero-example-proof [data-hero-palette="reading"]')),kind==='palette');
  assert.equal(s.w.document.querySelectorAll('h1').length,1);assert.equal(s.w.document.querySelectorAll('#hero-letter').length,1);
 }
 assert.match(s.q('#hero-study-note').textContent,/Hell und Dunkel/);
});
test('the live hero follows all five palettes in both modes while the comparison keeps its autonomous cycle',t=>{
 const s=setup(t);s.w.TypoHero=H;
 const clone=s.q('#start').cloneNode(true);clone.removeAttribute('id');clone.removeAttribute('data-hero-palette');s.q('#hero-example-proof').append(clone);
 for(const node of clone.querySelectorAll('[id]'))node.removeAttribute('id');
 s.w.SVGElement.prototype.getComputedTextLength=function(){return this.textContent.length*6;};
 let tick;s.w.requestAnimationFrame=callback=>{tick=callback;return 1;};
 s.w.IntersectionObserver=class{constructor(callback){this.callback=callback;}observe(target){this.callback([{target,isIntersecting:true}]);}unobserve(){}};
 s.w.fetch=()=>new Promise(()=>{});s.w.eval(read('scripts/typografie-hero.js'));
 for(const palette of A.palettes)for(const mode of ['light','dark']){
  s.q('html').dataset.palette=palette.id;s.q('html').dataset.theme=mode;s.w.dispatchEvent(new s.w.Event('typography-appearance-change'));
  for(const element of s.q('#start').querySelectorAll('[data-hero-color]'))assert.equal(element.getAttribute('fill'),palette[mode][element.dataset.heroColor]);
  assert.equal(s.q('#start [data-hero-palette-label]').textContent,palette.name+' / '+(mode==='dark'?'Dunkel':'Hell'));
 }
 s.q('html').dataset.palette='graphite';s.q('html').dataset.theme='light';s.w.dispatchEvent(new s.w.Event('typography-appearance-change'));
 const original=clone.querySelector('[data-hero-color="paper"]').getAttribute('fill');
 for(let i=1;i<=65;i++)tick(i*100);
 assert.equal(s.q('#start [data-hero-palette-label]').textContent,'Graphit / Hell');
 assert.equal(s.q('#start [data-hero-color="paper"]').getAttribute('fill'),A.palettes.find(p=>p.id==='graphite').light.paper);
 assert.notEqual(clone.querySelector('[data-hero-color="paper"]').getAttribute('fill'),original);
 assert.notEqual(s.q('#start [data-hero-satz-label]').textContent,'Blocksatz','the text-setting animation is retained');
 const css=read('styles/typografie-hero.css');for(const role of ['--white','--surface','--line','--muted','--ink','--red'])assert.ok(css.includes('var('+role+')'));
});

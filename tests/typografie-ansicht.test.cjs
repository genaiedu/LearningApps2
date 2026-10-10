'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../scripts/typografie-ansicht-core.js'),C=require('../scripts/typografie-core.js');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('typografie-atelier.html'),ui=read('scripts/typografie-ansicht.js'),css=read('styles/typografie-ansicht.css');
test('twenty chapter-specific local glyphs alternate cropped left and right',()=>{
  assert.equal(A.chapters.length,20);assert.equal(new Set(A.chapters.map(c=>c.id)).size,20);
  A.chapters.forEach((c,i)=>{assert.ok(html.includes('id="'+c.id+'"'));assert.equal(c.side,i%2?'right':'left');assert.ok(['Cardo','Source Sans 3'].includes(c.font));assert.equal([...c.glyph].length,1);assert.ok(c.meaning);});
  assert.equal(A.chapters.find(c=>c.id==='details').glyph,'&');assert.equal(A.chapters.find(c=>c.id==='mathematiksatz').glyph,'π');
  assert.ok(css.includes('left:5%'));assert.ok(css.includes('left:95%'));assert.ok(css.includes('overflow:hidden'));assert.ok(css.includes('pointer-events:none'));
});
test('appearance accepts only known settings and never needs storage or external files',()=>{
  assert.deepEqual(A.settings(),{theme:'light',glyphs:true});assert.deepEqual(A.settings({theme:'dark',glyphs:false}),{theme:'dark',glyphs:false});
  assert.deepEqual(A.settings({theme:'url(evil)',glyphs:'false'}),A.settings());
  assert.ok(!/fetch\(|localStorage|sessionStorage|innerHTML/.test(ui));assert.ok(!/url\(https?:/.test(css));
  for(const id of ['theme-toggle','page-glyph-toggle','appearance-status'])assert.ok(html.includes('id="'+id+'"'));
  assert.ok(ui.includes("setAttribute('aria-hidden','true')"));assert.ok(ui.includes('glyph.textContent=chapter.glyph'));
});
test('bounded parallax responds to scroll while reduced motion and pause remove extra movement',()=>{
  assert.equal(A.shift(0,900),157.5);assert.equal(A.shift(100,900),107.5);
  assert.equal(A.shift(-9000,900),220);assert.equal(A.shift(9000,900),-140);
  assert.equal(A.shift(100,900,false),0);assert.equal(A.shift(NaN,900),0);
  for(const marker of ['prefers-reduced-motion: reduce',"classList.contains('motion-paused')",'IntersectionObserver','requestAnimationFrame','{passive:true}',"addEventListener('typography-motion-change',schedule)"])assert.ok(ui.includes(marker));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));assert.ok(css.includes('@media print'));assert.ok(!ui.includes('setInterval'));
});
test('both themes maintain reading contrast even over decorative glyphs',()=>{
  for(const theme of [{bg:'#f5f1e8',mark:'#e3e0d7',ink:'#202823',muted:'#56635b',accent:'#a83424'},{bg:'#17241f',mark:'#2b3832',ink:'#f0ece1',muted:'#bac5bb',accent:'#eea38c'}]){
    for(const fg of [theme.ink,theme.muted,theme.accent])for(const bg of [theme.bg,theme.mark])assert.ok(C.contrast(fg,bg)>=4.5,fg+' / '+bg);
  }
  assert.ok(C.contrast('#17241f','#d9957d')>=4.5);
  for(const selector of ['.poster','.book-proof','.study-sheet','.gi-page','.wt-root','.web-color-example:not(.dark)'])assert.ok(css.includes(selector));
  assert.ok(!/filter:\s*invert/.test(css));
});
test('device previews inherit validated theme and glyph settings from the same-origin parent',()=>{
  const formats=read('scripts/typografie-formate.js');
  assert.ok(formats.includes('event.source!==parent||event.origin!==origin'));
  assert.ok(formats.includes('TypoAppearance.apply(event.data.appearance,false)'));
  assert.ok(formats.includes('appearance:window.TypoAppearance?.current?.()'));
  assert.ok(formats.includes("addEventListener('typography-appearance-change',()=>config())"));
});
test('right-cropped preset mirrors left and exists in the offline laboratory',()=>{
  const bgUI=read('scripts/typografie-hintergrund.js'),offline=read('downloads/typografie/hintergrund/hintergrund-werkstatt.html');
  for(const doc of [html,offline])assert.ok(doc.includes('data-bg-preset="right">Rechts &amp; angeschnitten'));
  assert.ok(bgUI.includes('edge:{...B.defaults,x:5,size:230,strength:10},right:{...B.defaults,x:95,size:230,strength:10}'));
  assert.ok(!offline.includes('data-page-theme'));assert.ok(!offline.includes('page-appearance-note'));
});

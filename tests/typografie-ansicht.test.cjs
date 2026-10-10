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
  assert.deepEqual(A.settings(),{palette:'atelier',theme:'light',glyphs:true});assert.deepEqual(A.settings({palette:'slate',theme:'dark',glyphs:false}),{palette:'slate',theme:'dark',glyphs:false});
  assert.deepEqual(A.settings({palette:'url(evil)',theme:'url(evil)',glyphs:'false'}),A.settings());
  assert.deepEqual(A.settings(null),A.settings());assert.deepEqual(A.settings({palette:'constructor'}),A.settings());
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
test('all four palettes have genuine light and dark versions and reproducible local CSS',()=>{
  const paletteCSS=read('styles/typografie-palettes.css');
  assert.equal(A.palettes.length,4);assert.equal(new Set(A.palettes.map(p=>p.id)).size,4);assert.ok(Object.isFrozen(A.palettes));
  for(const p of A.palettes){
    assert.ok(p.name&&p.note);assert.ok(Object.isFrozen(p));assert.notEqual(p.light.paper,p.dark.paper);
    for(const mode of ['light','dark']){
      const s=A.settings({palette:p.id,theme:mode,glyphs:false});assert.equal(s.palette,p.id);assert.equal(s.theme,mode);assert.equal(s.glyphs,false);
      const rule=paletteCSS.match(new RegExp('html\\[data-palette="'+p.id+'"\\]\\[data-theme="'+mode+'"\\]\\{([^}]+)\\}'))?.[1];assert.ok(rule);
      assert.ok(Object.isFrozen(p[mode]));assert.equal(Object.keys(p[mode]).length,16);
      for(const [key,value] of Object.entries(p[mode])){assert.match(value,/^#[0-9a-f]{6}$/);assert.ok(rule.includes('--'+key+':'+value+';'));}
    }
  }
  assert.ok(html.includes('styles/typografie-palettes.css'));assert.ok(!/url\(|@import/.test(paletteCSS));
});
test('all eight versions maintain reading contrast on every reading surface and decorative glyph',()=>{
  for(const p of A.palettes)for(const mode of ['light','dark']){
    const t=p[mode];
    for(const fg of [t.ink,t.muted,t.red])for(const bg of [t.paper,t.white,t.surface,t['page-mark'],t['hero-bg'],t['quote-bg']])assert.ok(C.contrast(fg,bg)>=4.5,p.id+' '+mode+' '+fg+' / '+bg);
    for(const bg of [t['button-bg'],t['button-hover']])assert.ok(C.contrast(t['button-ink'],bg)>=4.5);
  }
  for(const selector of ['.poster','.book-proof','.study-sheet','.gi-page','.wt-root','.web-color-example:not(.dark)'])assert.ok(css.includes(selector));
  assert.ok(css.includes('html[data-palette] :is(.poster'));assert.ok(css.includes('@media print{html[data-palette][data-theme]'));
  assert.ok(!/filter:\s*invert/.test(css));
});
test('appearance control opens an accessible selection dialog rather than blindly toggling darkness',()=>{
  for(const id of ['appearance-dialog','appearance-title','appearance-help','appearance-choices','appearance-current','appearance-close'])assert.ok(html.includes('id="'+id+'"'));
  assert.ok(html.includes('aria-haspopup="dialog" aria-controls="appearance-dialog" aria-expanded="false"'));
  for(const marker of ['dialog.showModal()',"dialog.addEventListener('close'",'lastOpener?.focus()',"querySelector('[data-palette-choice][aria-pressed=true]')?.focus()",'root.dataset.palette=current.palette','next.palette!==current.palette',"setAttribute('aria-pressed',String(button.dataset.paletteChoice===current.palette&&button.dataset.themeChoice===current.theme))"]){assert.ok(ui.includes(marker),marker);}
  assert.ok(!ui.includes("theme:current.theme==='dark'?'light':'dark'"));
  assert.ok(css.includes('max-height:calc(100dvh - 32px)'));assert.ok(css.includes('@media(max-width:480px)'));
});
test('generic reading surfaces do not outrank the paired code foreground and background',()=>{
  const general=css.match(/html\[data-palette\] :is\(([^)]*\bpre\b[^)]*)\)/)?.[1];
  assert.ok(general);assert.ok(!general.includes('#'),'An ID in :is() would boost every generic code background');
  assert.ok(css.includes('html[data-palette] #wiki-status{background:var(--surface)}'));
  assert.ok(css.includes('html[data-palette] .code-card pre{background:var(--dark);color:var(--cream)}'));
  assert.ok(css.includes('html[data-palette] .tex-results pre{background:var(--white);color:var(--ink)}'));
  for(const p of A.palettes)for(const mode of ['light','dark']){
    assert.ok(C.contrast(p[mode].cream,p[mode].dark)>=4.5,p.id+' '+mode+' lesson code');
    assert.ok(C.contrast(p[mode].ink,p[mode].white)>=4.5,p.id+' '+mode+' generated code');
  }
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

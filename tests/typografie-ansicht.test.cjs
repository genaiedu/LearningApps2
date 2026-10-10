'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const A=require('../scripts/typografie-ansicht-core.js'),C=require('../scripts/typografie-core.js');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('typografie-atelier.html'),ui=read('scripts/typografie-ansicht.js'),css=read('styles/typografie-ansicht.css');
test('twenty chapter-specific local glyphs alternate cropped left and right',()=>{
  assert.equal(A.chapters.length,20);assert.equal(new Set(A.chapters.map(c=>c.id)).size,20);
  A.chapters.forEach((c,i)=>{assert.ok(html.includes('id="'+c.id+'"'));assert.equal(c.side,i%2?'right':'left');assert.ok(['Cardo','Source Sans 3'].includes(c.font));assert.equal([...c.glyph].length,1);assert.ok(c.meaning);});
  assert.equal(A.chapters.find(c=>c.id==='details').glyph,'&');assert.equal(A.chapters.find(c=>c.id==='mathematiksatz').glyph,'π');
  assert.ok(css.includes('left:var(--page-glyph-x,5%)'));assert.ok(css.includes('left:var(--page-glyph-x,95%)'));assert.ok(css.includes('overflow:hidden'));assert.ok(css.includes('pointer-events:none'));
});
test('appearance accepts only known settings and never needs storage or external files',()=>{
  const positionDefaults={glyphPosition:'alternating',glyphInset:5,glyphHeight:34,sansFont:'firasans',serifFont:'original'};
  assert.deepEqual(A.settings(),{palette:'atelier',theme:'light',glyphs:true,...positionDefaults});assert.deepEqual(A.settings({palette:'slate',theme:'dark',glyphs:false}),{palette:'slate',theme:'dark',glyphs:false,...positionDefaults});
  assert.deepEqual(A.settings({palette:'url(evil)',theme:'url(evil)',glyphs:'false'}),A.settings());
  assert.deepEqual(A.settings(null),A.settings());assert.deepEqual(A.settings({palette:'constructor'}),A.settings());
  assert.ok(!/fetch\(|localStorage|sessionStorage|innerHTML/.test(ui));assert.ok(!/url\(https?:/.test(css));
  for(const id of ['theme-toggle','page-glyph-toggle','appearance-status'])assert.ok(html.includes('id="'+id+'"'));
  assert.ok(ui.includes("setAttribute('aria-hidden','true')"));assert.ok(ui.includes('glyph.textContent=chapter.glyph'));
});
test('reading fonts are independently selectable, validated and locally available',()=>{
  assert.ok(Object.isFrozen(A.readingFonts));
  for(const choices of Object.values(A.readingFonts)){
    assert.ok(Object.isFrozen(choices));for(const font of choices)assert.ok(Object.isFrozen(font));
  }
  for(const sans of ['sourcesans3','firasans'])for(const serif of ['original','librebaskerville']){
    const settings=A.settings({sansFont:sans,serifFont:serif,palette:'plum',theme:'dark'}),pair=A.fontPair(settings);
    assert.equal(settings.sansFont,sans);assert.equal(settings.serifFont,serif);
    assert.equal(pair.sans.id,sans);assert.equal(pair.serif.id,serif);
    assert.equal(settings.palette,'plum');assert.equal(settings.theme,'dark');
  }
  for(const bad of ['constructor','url(https://example.org/font)',null,{},[],true,23]){
    assert.equal(A.settings({sansFont:bad}).sansFont,'firasans');
    assert.equal(A.settings({serifFont:bad}).serifFont,'original');
    assert.deepEqual(A.fontPair({sansFont:bad,serifFont:bad}),A.fontPair());
  }
  assert.equal(A.fontPair().serif.editorialStack,'Cardo,Georgia,serif');
  assert.equal(A.fontPair({serifFont:'librebaskerville'}).serif.editorialStack,'"Libre Baskerville",Georgia,serif');
  const fontCSS=read('styles/typografie-fonts.css');
  for(const family of ['Source Sans 3','Fira Sans','EB Garamond','Cardo','Libre Baskerville']){
    const rules=fontCSS.split(/\n/).filter(line=>line.includes('font-family:"'+family+'"'));
    assert.ok(rules.length>=2,family+' has local normal and italic cuts');
    for(const rule of rules){
      const asset=rule.match(/src:url\("([^"]+)"\)/)?.[1];
      assert.ok(asset&&!/^https?:/.test(asset));
      assert.ok(fs.existsSync(path.resolve(root,'styles',asset)));
    }
  }
  for(const id of ['appearance-sans','appearance-serif','appearance-sans-reset','appearance-serif-reset'])assert.ok(html.includes('id="'+id+'"'));
  for(const marker of ["root.style.setProperty('--sans',fonts.sans.stack)","root.style.setProperty('--serif',fonts.serif.stack)","root.style.setProperty('--editorial-serif',fonts.serif.editorialStack)","apply({sansFont:$('appearance-sans').value})","apply({serifFont:$('appearance-serif').value})"])assert.ok(ui.includes(marker));
  assert.ok(css.includes('.appearance-position-ranges,.appearance-font-grid{grid-template-columns:1fr'));
  assert.ok(css.includes('.author-comment h3'));
  const editorialSelector=css.match(/:is\(([^}]*?)\)\{font-family:var\(--editorial-serif/)?.[1];
  assert.ok(editorialSelector);assert.ok(!/\.cardo\b|\.ligature-proof\b|\.figure-proof\b|\.font-sample\b/.test(editorialSelector),'Named comparison samples keep their fonts');
});
test('Fira Sans is the initial reading font with explicit prose shaping and protected numeric specimens',()=>{
  assert.equal(A.fontPair().sans.name,'Fira Sans');
  assert.equal(A.fontPair().serif.name,'EB Garamond / Cardo');
  assert.ok(read('styles/typografie-atelier.css').includes('--sans:"Fira Sans",Arial,sans-serif'));
  assert.ok(html.includes('<body class="prose-typography">'));
  assert.ok(html.includes('<option value="firasans">Fira Sans · Standard</option>'));
  assert.ok(css.includes('font-variant-ligatures:common-ligatures'));
  assert.ok(css.includes('font-variant-numeric:oldstyle-nums proportional-nums'));
  assert.ok(css.includes('output,code,pre'));
  assert.ok(css.includes('.figure-line,.origin-model,.origin-glyph'));
  const audit=JSON.parse(read('data/typografie-fontaudit.json'));
  for(const family of ['firasans','ebgaramond'])for(const file of audit.families.find(f=>f.id===family).files){
    for(const feature of ['liga','onum','lnum','pnum','tnum'])assert.ok(file.features.includes(feature),file.path+' '+feature);
  }
});
test('global glyph positions are bounded, mirror correctly and retain the chapter default',()=>{
  assert.deepEqual(A.positions.map(p=>p.id),['alternating','left','right','center']);assert.ok(Object.isFrozen(A.positions));
  assert.deepEqual(A.placement('left'),{side:'left',x:5,y:34});assert.deepEqual(A.placement('right'),{side:'right',x:95,y:34});
  for(const side of ['left','right']){
    assert.deepEqual(A.placement(side,{glyphPosition:'right',glyphInset:20,glyphHeight:60}),{side:'right',x:80,y:60});
    assert.deepEqual(A.placement(side,{glyphPosition:'left',glyphInset:20,glyphHeight:60}),{side:'left',x:20,y:60});
    assert.deepEqual(A.placement(side,{glyphPosition:'center',glyphInset:20,glyphHeight:60}),{side:'center',x:50,y:60});
  }
  const safe=A.settings({glyphPosition:'url(evil)',glyphInset:-999,glyphHeight:Infinity});
  assert.equal(safe.glyphPosition,'alternating');assert.equal(safe.glyphInset,0);assert.equal(safe.glyphHeight,34);
  assert.equal(A.settings({glyphInset:999,glyphHeight:999}).glyphInset,40);assert.equal(A.settings({glyphHeight:-999}).glyphHeight,10);
  for(const value of [null,false,{},[],NaN,'calc(100%)','']){
    assert.equal(A.settings({glyphInset:value}).glyphInset,5);assert.equal(A.settings({glyphHeight:value}).glyphHeight,34);
  }
  for(const id of ['appearance-position','appearance-inset','appearance-height','appearance-glyphs','appearance-position-reset'])assert.ok(html.includes('id="'+id+'"'));
  assert.ok(ui.includes('A.placement(chapter.side,current)'));assert.ok(ui.includes("layer.style.setProperty('--page-glyph-x'"));assert.ok(ui.includes("layer.style.setProperty('--page-glyph-y'"));
  assert.ok(ui.includes("current.glyphPosition==='center'"));assert.ok(css.includes('top:var(--page-glyph-y,34%)'));
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
test('reading accents have a distinct hue rather than disappearing into the base palette',()=>{
  function hue(hex){
    const [r,g,b]=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255),high=Math.max(r,g,b),low=Math.min(r,g,b),delta=high-low;
    return {angle:delta===0?0:((high===r?(g-b)/delta:high===g?(b-r)/delta+2:(r-g)/delta+4)*60+360)%360,saturation:high===0?0:delta/high};
  }
  const difference=(a,b)=>Math.min(Math.abs(a-b),360-Math.abs(a-b));
  for(const p of A.palettes.filter(p=>p.id!=='atelier'))for(const mode of ['light','dark']){
    const t=p[mode],accent=hue(t.red),base=hue(t.ink);
    assert.ok(accent.saturation>=.3,p.id+' '+mode+' uses a visibly colored accent');
    if(p.id!=='graphite')assert.ok(difference(accent.angle,base.angle)>=120,p.id+' '+mode+' separates base and accent hues');
    assert.equal(t['button-bg'],t.red,p.id+' '+mode+' applies the same accent to primary actions');
  }
  assert.equal(A.palettes.find(p=>p.id==='atelier').light.red,'#a83424');
});
test('appearance control opens an accessible selection dialog rather than blindly toggling darkness',()=>{
  for(const id of ['appearance-dialog','appearance-title','appearance-help','appearance-choices','appearance-current','appearance-close'])assert.ok(html.includes('id="'+id+'"'));
  assert.ok(html.includes('aria-haspopup="dialog" aria-controls="appearance-dialog" aria-expanded="false"'));
  for(const marker of ['dialog.showModal()',"dialog.addEventListener('close'",'lastOpener?.focus()',"$('appearance-sans').focus()",'root.dataset.palette=current.palette','Object.keys(next).some(key=>next[key]!==current[key])',"setAttribute('aria-pressed',String(button.dataset.paletteChoice===current.palette&&button.dataset.themeChoice===current.theme))"]){assert.ok(ui.includes(marker),marker);}
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

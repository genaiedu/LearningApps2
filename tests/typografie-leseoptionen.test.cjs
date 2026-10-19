'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),A=require('../scripts/typografie-ansicht-core.js');
function setup(t,{stored,preview=false}={}){
 const dom=new JSDOM(read('typografie-atelier.html'),{url:'https://example.test/typografie-atelier.html'+(preview?'?format-preview=1':''),runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,frames=[];
 t.after(()=>w.close());const reduced={matches:false,addEventListener(){}};
 w.matchMedia=()=>reduced;w.lucide={createIcons(){}};w.ResizeObserver=class{observe(){}};w.IntersectionObserver=class{observe(){}};
 w.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
 Object.defineProperty(w.document,'fonts',{value:{ready:Promise.resolve()}});
 w.Element.prototype.getBoundingClientRect=()=>({top:120,width:1280,height:1100});
 if(stored)w.localStorage.setItem('typografie-atelier-appearance',stored);
 w.eval(read('scripts/typografie-ansicht-core.js'));w.eval(read('scripts/typografie-ansicht.js'));
 const flush=()=>{while(frames.length)frames.shift()();},q=s=>w.document.querySelector(s);flush();
 return {w,q,flush,reduced};
}
test('appearance initializes without any standalone glyph switch',t=>{
 const s=setup(t);assert.equal(s.q('#page-glyph-toggle'),null);assert.equal(s.q('[data-page-glyphs]'),null);
 assert.equal(s.w.document.querySelectorAll('.page-glyph-window').length,20);
 assert.equal(s.q('#appearance-glyphs').checked,true);assert.equal(s.q('#appearance-alignment').value,'justify');
});
test('repeated hide/show restores every glyph without a new intersection callback',t=>{
 const s=setup(t),layers=[...s.w.document.querySelectorAll('.page-glyph-window')],glyphs=layers.map(e=>e.firstElementChild),texts=glyphs.map(e=>e.textContent);
 for(let i=0;i<4;i++)for(const visible of [false,true]){
  const control=s.q('#appearance-glyphs');control.checked=visible;control.dispatchEvent(new s.w.Event('change'));s.flush();
  assert.equal(s.q('html').classList.contains('page-glyphs-off'),!visible);
  assert.equal(s.q('#appearance-position').disabled,!visible);
  for(const glyph of glyphs)assert.equal(glyph.style.getPropertyValue('--page-drift'),(visible?A.shift(120,s.w.innerHeight):0)+'px');
 }
 assert.deepEqual(glyphs.map(e=>e.textContent),texts);assert.ok(glyphs.every(e=>e.isConnected));
 const css=read('styles/typografie-ansicht.css');assert.ok(css.includes('.page-glyphs-off .page-glyph-window{visibility:hidden}'));assert.ok(!css.includes('.page-glyphs-off .page-glyph-window{display:none}'));
});
test('saved hidden glyphs can be shown again, and motion pause only stops their drift',t=>{
 const s=setup(t,{stored:JSON.stringify({glyphs:false})});assert.equal(s.q('#appearance-glyphs').checked,false);
 s.w.TypoAppearance.apply({glyphs:true});s.w.document.body.classList.add('motion-paused');s.flush();
 assert.ok(!s.q('html').classList.contains('page-glyphs-off'));assert.equal(s.q('.page-glyph').style.getPropertyValue('--page-drift'),'0px');
 s.w.document.body.classList.remove('motion-paused');s.w.dispatchEvent(new s.w.Event('typography-motion-change'));s.flush();
 // No intersection event has fired; changing the position still refreshes all layers.
 s.w.TypoAppearance.apply({glyphPosition:'right'});s.flush();assert.notEqual(s.q('.page-glyph').style.getPropertyValue('--page-drift'),'0px');
 s.reduced.matches=true;s.w.TypoAppearance.apply({glyphInset:10});s.flush();assert.equal(s.q('.page-glyph').style.getPropertyValue('--page-drift'),'0px');
});
test('reading alignment is validated, remembered and inherited by previews without overwriting storage',t=>{
 for(const bad of ['center','url(evil)',{},null])assert.equal(A.settings({readingAlignment:bad}).readingAlignment,'justify');
 const s=setup(t),control=s.q('#appearance-alignment');control.value='justify';control.dispatchEvent(new s.w.Event('change'));
 assert.equal(s.q('html').dataset.readingAlignment,'justify');assert.match(s.q('#reader-appearance-state').textContent,/Blocksatz/);
 const stored=s.w.localStorage.getItem('typografie-atelier-appearance'),again=setup(t,{stored});
 assert.equal(again.q('#appearance-alignment').value,'justify');assert.equal(again.q('html').dataset.readingAlignment,'justify');
 const preview=setup(t,{stored,preview:true});assert.equal(preview.q('#appearance-alignment').value,'justify');
 preview.w.TypoAppearance.apply({readingAlignment:'left'},false);assert.equal(preview.q('html').dataset.readingAlignment,'left');assert.equal(preview.w.localStorage.getItem('typografie-atelier-appearance'),stored);
 const css=read('styles/typografie-ansicht.css');assert.ok(css.includes('text-align:justify;text-align-last:left;hyphens:auto;-webkit-hyphens:auto;hyphenate-limit-chars:6 3 3'));
 assert.match(s.q('#appearance-alignment-help').textContent,/Trennwörterbücher hängen vom Browser ab/);
});
test('the new default replaces the legacy alignment once, but preserves all other preferences and later choices',t=>{
 const stored=JSON.stringify({readingAlignment:'left',palette:'plum',theme:'dark',glyphs:false,sansFont:'sourcesans3',serifFont:'librebaskerville'}),s=setup(t,{stored});
 const current=s.w.TypoAppearance.current();assert.equal(current.readingAlignment,'justify');
 for(const [key,value]of Object.entries(JSON.parse(stored)))if(key!=='readingAlignment')assert.equal(current[key],value);
 assert.equal(JSON.parse(s.w.localStorage.getItem('typografie-atelier-appearance')).readingLayoutVersion,2);
 const control=s.q('#appearance-alignment');control.value='left';control.dispatchEvent(new s.w.Event('change'));
 const again=setup(t,{stored:s.w.localStorage.getItem('typografie-atelier-appearance')});assert.equal(again.q('html').dataset.readingAlignment,'left');
});
test('justified reading copy includes deeply nested explanations, but never rewrites fixed type studies',t=>{
 const s=setup(t),css=read('styles/typografie-ansicht.css'),selector=css.match(/(html\[data-reading-alignment="justify"\][\s\S]*?)\{text-align:justify;/)[1];
 const copy=[...s.w.document.querySelectorAll(selector)];
 for(const target of ['#fira-height-title+p','#fira-height-title~p','.history-raster-study>div>p:not(.eyebrow,.small)','.fondamento-portrait>p:not(.fondamento-cut)','.history-copy>p:not(.history-era)']){
  const paragraphs=[...s.w.document.querySelectorAll(target)];assert.ok(paragraphs.length,target);
  for(const paragraph of paragraphs)assert.ok(copy.includes(paragraph),target+' '+paragraph.textContent.slice(0,45));
 }
 for(const target of ['.text-proof p','.book-body p','.study-sheet p','.grauwert-sample','.classification-sample','.fondamento-cut','.kerning-proof','.serif-example','.sans-example','.ligature-proof','.author-comment p']){
  for(const paragraph of s.w.document.querySelectorAll(target))assert.ok(!copy.includes(paragraph),'Fixed specimen: '+target);
 }
 const host=s.w.document.createElement('div');host.dataset.readingFixed='';host.innerHTML='<p>A later-created designed document stays independent.</p>';s.q('main').append(host);
 assert.equal(host.firstElementChild.matches(selector),false);
 assert.ok(copy.length>500,'Reading copy must not depend on a handful of parent classes');
 assert.ok(css.includes('.part-heading>div:has(>h2){display:contents}'),'Phone introductions receive the full available reading width');
});
test('all personal voices stay ragged right regardless of reading alignment or palette',t=>{
 const s=setup(t),css=read('styles/typografie-ansicht.css'),selector=css.match(/(html\[data-reading-alignment="justify"\][\s\S]*?)\{text-align:justify;/)[1],voices=[...s.w.document.querySelectorAll('.author-comment')];
 assert.equal(voices.length,19);
 assert.ok(css.includes('.author-comment,.author-comment :is(p,blockquote,li,dd,figcaption){text-align:left;text-align-last:auto;hyphens:manual;-webkit-hyphens:manual}'));
 for(const readingAlignment of ['left','justify'])for(const palette of A.palettes)for(const theme of ['light','dark']){
  s.w.TypoAppearance.apply({readingAlignment,palette:palette.id,theme});s.flush();
  for(const voice of voices)for(const paragraph of voice.querySelectorAll('p'))assert.equal(paragraph.matches(selector),false);
 }
 assert.ok(s.q('#word-ligaturen .note-reading-copy p').matches(selector),'Factual notes keep the selected justified alignment');
});
test('kerning is explicit on real text, while its teaching switch remains genuinely reversible',()=>{
 const css=read('styles/typografie-ansicht.css'),source=read('scripts/typografie-atelier.js');
 assert.match(css,/html\[data-palette\] body\.prose-typography :where\(h1,[^}]+\{font-kerning:normal\}/);
 assert.ok(css.includes('mjx-container *,math *,svg *'));assert.ok(!/font-kerning:normal!important/.test(css));
 const fragment=source.slice(source.indexOf('  const updateKerning='),source.indexOf('  const palettes='));
 const controls={'kerning-toggle':{checked:true},'kerning-proof':{style:{}}};vm.runInNewContext(fragment,{$:id=>controls[id]});
 assert.equal(controls['kerning-proof'].style.fontKerning,'normal');
 for(const enabled of [false,true,false,true]){controls['kerning-toggle'].checked=enabled;controls['kerning-toggle'].onchange();assert.equal(controls['kerning-proof'].style.fontKerning,enabled?'normal':'none');}
});
test('long Word guidance has a distinct reading column and individually wrapping sources',t=>{
 const s=setup(t),note=s.q('#word-ligaturen'),copy=note.querySelector('.note-reading-copy'),css=read('styles/typografie-ansicht.css');
 assert.equal(copy.querySelectorAll(':scope>p').length,3);
 assert.match(copy.textContent,/Nein, darauf kannst du dich nicht verlassen/);
 assert.match(copy.textContent,/Auf\|lage/);assert.match(copy.textContent,/Druckvorschau und exportiertes PDF/);
 assert.equal(note.querySelectorAll('.reading-cards>article').length,2);
 assert.equal(note.querySelectorAll('.reading-cards ol[data-reading-fixed]').length,2,'Short numbered actions must not acquire stretched word spaces');
 assert.equal(note.querySelector('.note-reading-section').firstElementChild.tagName,'H4');
 assert.equal(note.querySelectorAll('.note-sources>a').length,3);
 assert.ok(note.querySelector('.note-sources').hasAttribute('data-reading-fixed'));
 assert.ok(css.includes('.note>p:not([class]){max-width:70ch}'));
 assert.match(css,/\.note-reading-section\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(0,2\.2fr\)[^}]*border-top:1px solid var\(--line\)/);
 assert.match(css,/@media\(max-width:900px\)\{\.note-reading-section\{grid-template-columns:1fr/);
});

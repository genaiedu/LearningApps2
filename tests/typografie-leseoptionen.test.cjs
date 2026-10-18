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
 assert.equal(s.q('#appearance-glyphs').checked,true);assert.equal(s.q('#appearance-alignment').value,'left');
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
 for(const bad of ['center','url(evil)',{},null])assert.equal(A.settings({readingAlignment:bad}).readingAlignment,'left');
 const s=setup(t),control=s.q('#appearance-alignment');control.value='justify';control.dispatchEvent(new s.w.Event('change'));
 assert.equal(s.q('html').dataset.readingAlignment,'justify');assert.match(s.q('#reader-appearance-state').textContent,/Blocksatz/);
 const stored=s.w.localStorage.getItem('typografie-atelier-appearance'),again=setup(t,{stored});
 assert.equal(again.q('#appearance-alignment').value,'justify');assert.equal(again.q('html').dataset.readingAlignment,'justify');
 const preview=setup(t,{stored,preview:true});assert.equal(preview.q('#appearance-alignment').value,'left');
 preview.w.TypoAppearance.apply({readingAlignment:'justify'},false);assert.equal(preview.q('html').dataset.readingAlignment,'justify');assert.equal(preview.w.localStorage.getItem('typografie-atelier-appearance'),stored);
 const css=read('styles/typografie-ansicht.css');assert.ok(css.includes('text-align:justify;text-align-last:left;hyphens:auto;-webkit-hyphens:auto;hyphenate-limit-chars:6 3 3'));
 assert.match(s.q('#appearance-alignment-help').textContent,/Trennwörterbücher hängen vom Browser ab/);
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

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom'),G=require('../scripts/typografie-satzspiegel-core.js'),C=require('../scripts/typografie-core.js'),P=require('../scripts/typografie-seite-core.js');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('photocopy approximation changes every nested graphic color, never the underlying screen colors',()=>{
 for(const study of P.studies){const original=P.scene(study.id),copy=P.scene(study.id,{photocopy:true});
  const colors=ops=>ops.flatMap(op=>[...(op.color?[op.color]:[]),...(op.children?colors(op.children):[])]);
  assert.ok(colors(copy.ops).every(c=>['#000000','#ffffff'].includes(c)));
  assert.equal(copy.foreground,original.foreground);assert.equal(copy.background,original.background);
 }
});
test('single-sided margins redistribute only lateral space; originals and input geometry remain intact',()=>{
 for(const format of Object.keys(G.formats))for(const id of ['classic','raster10','raster12']){
  const spread=G.geometry(format,id),single=G.geometry(format,id,'single'),asymmetric=G.geometry(format,id,'single-asymmetric');
  assert.equal(single.inner,single.outer);assert.equal(single.textWidth,spread.textWidth);assert.equal(single.textHeight,spread.textHeight);
  assert.equal(single.top,spread.top);assert.equal(single.bottom,spread.bottom);assert.equal(asymmetric.inner,spread.inner);assert.equal(asymmetric.outer,spread.outer);
  assert.ok(Math.abs(single.inner+single.textWidth+single.outer-single.width)<1e-8);
 }
 assert.equal(G.geometry('a4','raster12','single').inner,26.25);
 assert.equal(G.pageMode('untrusted'),'spread');
});
test('both applications expose the same real one-sided choice and reset it',t=>{
 for(const file of ['typografie-atelier.html','schriftsetzer.html']){
  const dom=new JSDOM(read(file),{url:'https://example.test/'+file,runScripts:'outside-only'}),w=dom.window;t.after(()=>w.close());
  w.eval(read('scripts/typografie-satzspiegel-core.js'));w.eval(read('scripts/typografie-satzspiegel.js'));
  const select=w.document.getElementById('longtext-page-mode');
  assert.equal(select.options.length,3);select.value='single';select.dispatchEvent(new w.Event('change'));
  assert.equal(w.TypoSatzspiegelControls.settings().pageMode,'single');
  assert.match(w.document.querySelector('.longtext-satzspiegel .satz-recipe').textContent,/links 1,88 cm, rechts 1,88 cm/);
  assert.equal(w.document.getElementById('longtext-spread').checked,false);
  w.TypoSatzspiegelControls.reset();assert.equal(select.value,'spread');
 }
});
test('all generated TeX variants are control-character-free, use the two named fonts and explicit geometry',()=>{
 for(const kind of ['bericht','brief','einladung','protokoll'])for(const variant of ['classic','modern'])for(const engine of ['pdftex','luatex']){
  const text=C.texDocument({kind,variant,engine,body:'Ein Absatz.\n\nEin zweiter Absatz.'});
  assert.doesNotMatch(text,/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/);
  assert.ok(text.includes('\\usepackage[type1]{ebgaramond}'));assert.ok(text.includes('{FiraSans}'));
  assert.ok(text.includes('top=24.75mm,bottom=49.5mm'));assert.ok(text.includes('BCOR=0mm'));
  assert.equal(text.includes('inner=17.5mm,outer=35mm'),['bericht','protokoll'].includes(kind));
  if(variant==='modern')assert.ok(text.includes('\\setlength{\\parskip}{.5\\baselineskip}'));
 }
});
test('school chapter retains twelve numbered chapters, previous examples and the actual Abitur downloads',()=>{
 const html=read('typografie-atelier.html'),section=html.slice(html.indexOf('id="word">'),html.indexOf('id="richtung">'));
 assert.equal((section.match(/downloads\/typografie\/[^"]*zw12[^"]*\.docx/g)||[]).length,12);
 assert.ok(section.includes('downloads/Blankoklausur_Naturwissenschaften.docx'));
 assert.ok(section.includes('design=abitur2025&amp;seite=1'));assert.ok(!section.includes('klausur-a4-zw12'));
 for(const id of ['word-formatvorlagen','word-zugaenglich','word-archiv','register','satzspiegel-einseitig','tabellen-gestalten','blatt-nach-kopierer'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(html.includes('13 Wordvorlagen'));assert.ok(html.includes('7,8 pt'));assert.ok(html.includes('8,5 pt'));
 assert.ok(html.includes('Diese Mac-Option verwendet laut Microsoft einen Onlinedienst und überträgt das Dokument'));
 assert.doesNotMatch(html,/tokens truncated|bytes omitted/);
});
test('the print essay is not an anti-Word verdict and points to Part I instead of repeating its steps',()=>{
 const essay=read('typografie-atelier.html').split('id="word-randstimme"')[1].split('</aside>')[0];
 assert.ok(essay.includes('Was Word nicht von selbst macht'));
 assert.ok(essay.includes('href="#word-ligaturen"'));assert.ok(essay.includes('href="#register"'));
 assert.ok(essay.includes('Word kann'));assert.ok(!essay.includes('scheußlich'));assert.ok(!essay.includes('Bloß kein Word'));
});

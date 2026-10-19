const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom'),S=require('../scripts/typografie-schulpraxis.js');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),data=JSON.parse(read('data/typografie-fonts.json')),anatomy=JSON.parse(read('data/typografie-anatomy.json')),html=read('typografie-atelier.html'),script=read('scripts/typografie-schulpraxis.js');
const family=id=>data.families.find(f=>f.id===id),reference=id=>S.referenceFile(family(id));
test('coverage is per actual file, ordered, hashed and reproducible for all 41 families',()=>{
 assert.equal(data.families.length,41);assert.equal(data.coverageAudit.files,103);assert.equal(data.coverageAudit.cuts,103);
 assert.equal(new Set(data.families.flatMap(f=>f.files.map(s=>s.path))).size,103);
 for(const f of data.families)for(const s of f.files){
  assert.equal(s.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root,s.path))).digest('hex'));
  let previous=-2;for(const [a,b]of s.coverage.ranges){assert.ok(Number.isInteger(a)&&a>=0&&a<=b&&b<=0x10ffff);assert.ok(a>previous+1);previous=b;}
  for(const [name,text]of Object.entries(data.coverageAudit.tests))assert.equal(S.probe(text,s.coverage.ranges).missing.join(''),s.coverage.testMissing[name]);
 }
});
test('full local originals close Latin subset gaps, without fabricating Cyrillic',()=>{
 for(const id of ['poppins','outfit','bangers','zillaslab','dmmono','oswald','bebasneue','dancingscript','dmsans','plusjakartasans','forum','caveat','nunito','archivoblack'])for(const [label,missing]of Object.entries(reference(id).coverage.testMissing))if(label!=='Kyrillisch')assert.equal(missing,'',id+' '+label);
 assert.notEqual(reference('poppins').coverage.testMissing.Kyrillisch,'');
 assert.notEqual(reference('fondamento').coverage.testMissing.Rumänisch,'');
 for(const id of ['firasans','ebgaramond','arimo','tinos','sourcesans3'])assert.ok(Object.values(reference(id).coverage.testMissing).every(x=>!x));
});
test('binary lookup includes endpoints and reports real Unicode characters, not UTF-16 halves',()=>{
 assert.ok(S.hasCodepoint([[65,90]],65));assert.ok(S.hasCodepoint([[65,90]],90));assert.ok(!S.hasCodepoint([[65,90]],91));
 assert.equal(S.codepoint('😀'),'U+1F600');assert.deepEqual(S.probe('😀',[[32,126]]).missing,['😀']);
 assert.equal(S.probe('S\u0326tefan',reference('firasans').coverage.ranges).parts[0].text,'Ș');
 assert.deepEqual(S.probe('S\u0326tefan',reference('firasans').coverage.ranges).missing,[]);
 assert.ok(S.probe('Șț',reference('fondamento').coverage.ranges).missing.length===2);
});
test('Word size table is derived from verified baseline-to-x contours, not guessed percentages',()=>{
 const f=id=>anatomy.families.find(f=>f.id===id);assert.equal(f('arimo').glyphs.x.bounds[3],1082);
 assert.ok(Math.abs(S.matchingSize(f('arimo'),f('ebgaramond'),11)-14.3494405864)<1e-9);
 assert.ok(Math.abs(S.matchingSize(f('arimo'),f('firasans'),11)-11.0275587049)<1e-9);
 assert.ok(html.includes('etwa 14,3 pt'));assert.ok(html.includes('etwa 11,0 pt'));assert.throws(()=>S.matchingSize(f('arimo'),f('firasans'),0));
});
function setup(t,load=async()=>[{}]){
 const dom=new JSDOM(html,{runScripts:'outside-only'}),w=dom.window;Object.defineProperty(w.document,'fonts',{value:{load}});w.eval(script);w.TypoSchool.setCatalogue(data);t.after(()=>w.close());return w;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('name workshop selects all local families and actual cuts, marks absent glyphs and uses text only',async t=>{
 const w=setup(t),q=id=>w.document.getElementById(id);await tick();assert.equal(q('name-font').options.length,41);assert.equal(q('name-proof').hidden,false);
 assert.equal(q('name-proof').querySelectorAll('.coverage-missing').length,0);
 q('name-font').value='fondamento';q('name-font').dispatchEvent(new w.Event('change'));await tick();assert.equal(q('name-cut').options.length,2);assert.ok(q('name-proof').querySelector('.coverage-missing'));assert.ok(q('name-missing').textContent.includes('U+'));
 q('name-probe').value='<img src=x onerror=alert(1)>';q('name-probe').dispatchEvent(new w.Event('input'));await tick();assert.equal(q('name-proof').querySelector('img'),null);assert.equal(q('name-proof').textContent,'<img src=x onerror=alert(1)>');
});
test('failed loading cannot masquerade as a verified font specimen',async t=>{
 const w=setup(t,async()=>{throw Error('missing')});await tick();assert.equal(w.document.getElementById('name-proof').hidden,true);assert.ok(w.document.getElementById('name-status').textContent.includes('nicht verifiziert'));
});
test('late font promises cannot overwrite a newer selection',async t=>{
 let finish;const w=setup(t,()=>new Promise(resolve=>{finish=resolve})),q=id=>w.document.getElementById(id),first=finish;
 q('name-font').value='poppins';q('name-font').dispatchEvent(new w.Event('change'));const second=finish;first([{}]);await tick();assert.equal(q('name-proof').hidden,true);second([{}]);await tick();assert.equal(q('name-proof').hidden,false);assert.ok(q('name-status').textContent.startsWith('Poppins'));
});
test('static fallbacks, references, glossary, formula distinction and source consent remain in place',()=>{
 const dom=new JSDOM(html),d=dom.window.document;assert.equal(d.querySelectorAll('#coverage-overview tbody tr').length,41);
 for(const id of ['namen-sonderzeichen','besondere-lesebeduerfnisse','schriftgroesse-word','naturwissenschaftliche-zeichen','word-standardschriften'])assert.ok(d.querySelector('nav.part-contents a[href="#'+id+'"]'));
 assert.ok(d.querySelector('#namen-werkstatt noscript'));assert.equal(d.querySelector('#name-probe').maxLength,160);
 assert.ok(html.includes('getrennt von den 41 Schriftfamilien'));assert.ok(!html.includes('30 gewöhnlichen'));
 for(const term of ['glossar-codepunkt','glossar-nfc','glossar-diakritisch','glossar-ersatzschrift','glossar-formatvorlage','glossar-prime'])assert.ok(d.getElementById(term));
 const voice=d.getElementById('schriftwahl-randstimme');assert.ok(voice.textContent.includes('Calibri oder Aptos'));assert.ok(!voice.textContent.includes('kaum noch etwas gedruckt'));assert.ok(!voice.textContent.includes('Zumutung'));assert.equal(voice.querySelectorAll('p').length,11);
 assert.equal((html.match(/class="author-essay author-comment/g)||[]).length,16);
 assert.ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon|\.innerHTML\s*=/.test(script));
 for(const a of d.querySelectorAll('.source-note a[data-source-external]'))assert.ok(a.href.startsWith('https://'));
 dom.window.close();
});

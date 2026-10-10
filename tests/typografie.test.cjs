const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../scripts/typografie-core.js');
const vm=require('node:vm');
test('WCAG luminance and contrast',()=>{assert.equal(C.contrast('#000000','#ffffff'),21);assert.equal(C.contrast('#333333','#333333'),1);assert.ok(Math.abs(C.contrast('#777777','#ffffff')-4.478)<.001);assert.throws(()=>C.contrast('red','#ffffff'));});
test('all TeX metacharacters escaped, user input cannot become commands',()=>{assert.equal(C.escapeTex('A&B_50%'), 'A\\&B\\_50\\%');assert.equal(C.escapeTex('\\input{secret}'), '\\textbackslash{}input\\{secret\\}');assert.equal(C.escapeTex('#$~^'), '\\#\\$\\textasciitilde{}\\textasciicircum{}');assert.equal(C.escapeTex('Grüße — ÄÖÜ'), 'Grüße — ÄÖÜ');});
test('paragraphs survive and physical lines do not force line breaks',()=>{assert.equal(C.paragraphs('eins\nzwei\r\n\r\ndrei'),'eins zwei\n\ndrei');});
test('four standalone templates and two engines',()=>{for(const kind of ['bericht','brief','einladung','protokoll'])for(const engine of ['pdftex','luatex']){const s=C.texDocument({kind,engine,title:'100% & Mut',body:'\\write18{test}\n\nZweiter Absatz',recipient:'Straße 1\nOrt'});assert.ok(s.includes('a4paper'));assert.ok(s.includes('100\\% \\& Mut'));assert.ok(!s.includes('\\write18'));assert.ok(s.endsWith('\\end{document}\n'));assert.equal(s.includes('fontspec'),engine==='luatex');if(kind==='brief')assert.ok(s.includes('Straße 1\\\\\nOrt'));}});
test('canon preserves proportions, margins sum to paper size',()=>{const c=C.canon();assert.equal(c.inner+c.textWidth+c.outer,210);assert.equal(c.top+c.textHeight+c.bottom,297);assert.ok(Math.abs(c.textWidth/c.textHeight-210/297)<1e-12);});
test('shuffle no duplicates, no mutation',()=>{const a=[1,2,3,4],b=C.shuffle(a,()=>0);assert.deepEqual(a,[1,2,3,4]);assert.deepEqual([...b].sort(),a);assert.notDeepEqual(a,b);});
test('use existing font weights, not fake cuts',()=>{assert.equal(C.fontWeight({files:[{style:'normal',weight:400},{style:'normal',weight:700}]},500),400);assert.equal(C.fontWeight({files:[{style:'normal',weight:[200,900]}]},612),612);});
test('catalogue local paths resolve and fonts are documented',()=>{const root=path.resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'data/typografie-fonts.json')));assert.equal(data.families.length,24);assert.equal(data.existingFamilies,18);for(const f of data.families){assert.ok(f.designer);assert.ok(f.files.length);for(const file of f.files)assert.ok(fs.existsSync(path.resolve(root,file.path)),file.path);assert.ok(fs.existsSync(path.resolve(root,f.licensePath)));if(f.desktop)assert.ok(fs.existsSync(path.resolve(root,f.desktop)));}});
test('Venetian specimen uses the actual local Goudy font and offers its desktop package',()=>{const root=path.resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'data/typografie-fonts.json'))),font=data.families.find(f=>f.id==='goudybookletter1911');assert.equal(font.name,'Goudy Bookletter 1911');assert.equal(font.files.length,1);assert.equal(font.files[0].weight,400);assert.equal(font.files[0].style,'normal');assert.ok(font.desktop.endsWith('goudybookletter1911-desktop.zip'));const html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8'),css=fs.readFileSync(path.join(root,'styles/typografie-fonts.css'),'utf8');assert.ok(html.includes('classification-sample goudy'));assert.ok(!html.includes('axis-drawing'));assert.ok(html.includes(font.desktop));assert.ok(css.includes('font-family:"Goudy Bookletter 1911";src:url("../fonts/typografie/goudybookletter1911/'));assert.ok(!/https?:\/\//.test(css));});
test('ligature control initializes and updates both real-text samples',()=>{
  const source=fs.readFileSync(path.resolve(__dirname,'../scripts/typografie-atelier.js'),'utf8');
  const code=source.slice(source.indexOf('  function updateLigatures(){'),source.indexOf("  $('kerning-toggle')"));
  for(const initiallyEnabled of [false,true]){
    const elements={};
    for(const id of ['ligature-toggle','ligature-pairs','ligature-proof','ligature-status']){
      const classes=new Set();elements[id]={checked:initiallyEnabled,textContent:'',classes,classList:{toggle(name,force){force?classes.add(name):classes.delete(name);}}};
    }
    vm.runInNewContext(code,{$:id=>elements[id]});
    for(const enabled of [initiallyEnabled,!initiallyEnabled,initiallyEnabled]){
      elements['ligature-toggle'].checked=enabled;elements['ligature-toggle'].onchange();
      for(const id of ['ligature-pairs','ligature-proof'])assert.equal(elements[id].classes.has('ligatures-off'),!enabled);
      assert.equal(elements['ligature-status'].textContent,enabled?'Probe mit Ligaturen':'Probe ohne Ligaturen');
    }
  }
});
test('feature specimens override font shorthand resets and show a true baseline',()=>{
  const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8'),css=fs.readFileSync(path.join(root,'styles/typografie-atelier.css'),'utf8');
  assert.ok(html.includes('id="ligature-reference">fi fl ffi'));
  assert.ok(html.includes('id="ligature-pairs">fi fl ffi'));
  assert.ok(css.includes('.feature-panel .ligatures-off{font-variant-ligatures:none;font-feature-settings:"liga" 0'));
  assert.ok(css.includes('.figure-proof .oldstyle{font-family:Cardo,Georgia,serif;font-variant-numeric:oldstyle-nums'));
  assert.ok(css.lastIndexOf('.figure-proof .oldstyle')>css.indexOf('.figure-proof p{font:'));
  assert.ok(css.includes('vertical-align:baseline;width:0;height:0'));
  assert.equal((html.match(/class="baseline-anchor"/g)||[]).length,2);
});
test('Word guidance distinguishes syllables from word parts and links all desktop downloads',()=>{
  const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8'),data=JSON.parse(fs.readFileSync(path.join(root,'data/typografie-fonts.json')));
  for(const phrase of ['id="word-ligaturen"','Format → Schriftart … → Erweitert','Nur Standard','Strg + D','Auf|lage','Af-fe','Ligaturen → Keine','Nein, darauf kannst du dich nicht verlassen.'])assert.ok(html.includes(phrase),phrase);
  assert.ok(html.includes(data.desktopCollection));
  for(const font of data.families){assert.ok(font.desktop);assert.ok(html.includes(font.desktop));}
});

test('three parts keep characters, print and screen in a continuous reading order',()=>{
  const html=fs.readFileSync(path.resolve(__dirname,'../typografie-atelier.html'),'utf8');
  const parts=[...html.matchAll(/<div class="atelier-part" data-part="([^"]+)">([\s\S]*?)(?=<div class="atelier-part"|<section class="chapter wrap" id="entscheidungen")/g)];
  assert.deepEqual(parts.map(p=>p[1]),['zeichen','papier','bildschirm']);
  assert.deepEqual([...parts[0][2].matchAll(/<section[^>]*id="([^"]+)"/g)].map(m=>m[1]),['schriftformen','details','lucide','mathematiksatz','beginn','lokal','katalog','schrift-downloads']);
  assert.deepEqual([...parts[1][2].matchAll(/<section[^>]*id="([^"]+)"/g)].map(m=>m[1]),['tschichold','haltung','satzlabor','buchsatz','word','latex','texatelier']);
  assert.deepEqual([...parts[2][2].matchAll(/<section[^>]*id="([^"]+)"/g)].map(m=>m[1]),['farbe']);
  assert.equal((html.match(/data-part-link=/g)||[]).length,3);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const [,hash] of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(hash),hash);
});

test('approved margin voice is anonymous, serif, with one lowered opening quote',()=>{
  const html=fs.readFileSync(path.resolve(__dirname,'../typografie-atelier.html'),'utf8'),css=fs.readFileSync(path.resolve(__dirname,'../styles/typografie-atelier.css'),'utf8');
  const comment=html.match(/<aside class="author-essay author-comment"[\s\S]*?<\/aside>/)[0];
  assert.ok(html.includes('class="margin-conversation"'));
  assert.equal((comment.match(/class="comment-opening"/g)||[]).length,1);
  assert.ok(comment.includes('aria-hidden="true">„</span>'));
  assert.ok(!/Claus|Unterberg|Meinung|Autorenkommentar|comment-signature|“|”/.test(comment));
  assert.ok(css.includes('font:400 22px/1.48 Cardo,Georgia,serif'));
  assert.ok(css.includes('left:10px;top:-68px;font:400 136px/1 Cardo'));
});

test('part navigation stays active deep inside a part and has one current location',()=>{
  const source=fs.readFileSync(path.resolve(__dirname,'../scripts/typografie-atelier.js'),'utf8');
  const code=source.slice(source.indexOf('  function updatePartNavigation(){'),source.indexOf("  addEventListener('resize'"));
  const regions=['zeichen','papier','bildschirm'].map((part,i)=>({dataset:{part},top:[-1200,2000,6000][i],getBoundingClientRect(){return {top:this.top};}}));
  const links=regions.map(r=>({dataset:{partLink:r.dataset.part},active:false,current:null,classList:{toggle(name,force){links.find(l=>l.classList===this).active=force;}},setAttribute(n,v){this.current=v;},removeAttribute(){this.current=null;}}));
  const context={partRegions:regions,navLinks:links};vm.runInNewContext(code,context);
  for(const [expected,positions] of [[0,[-200,2000,6000]],[1,[-9000,-600,3000]],[2,[-15000,-9000,-300]]]){
    positions.forEach((v,i)=>regions[i].top=v);context.updatePartNavigation();
    assert.equal(links.filter(l=>l.active).length,1);
    links.forEach((l,i)=>{assert.equal(l.active,i===expected);assert.equal(l.current,i===expected?'location':null);});
  }
});

test('Lucide comparison shows emoji, integrated and emphasized variants and adjustable appearance',()=>{
  const html=fs.readFileSync(path.resolve(__dirname,'../typografie-atelier.html'),'utf8'),source=fs.readFileSync(path.resolve(__dirname,'../scripts/typografie-atelier.js'),'utf8');
  for(const id of ['icon-color','icon-font','icon-text-lab'])assert.ok(html.includes('id="'+id+'"'));
  for(const cls of ['emoji-example','icon-adjustable','icon-emphasis'])assert.ok(html.includes(cls));
  assert.ok(html.includes('SVG-Symbolen allgemein'));
  assert.ok(source.includes("on(['icon-size','icon-stroke','icon-color','icon-font'],updateIcons)"));
  assert.ok(source.includes('s.style.color=color'));
});

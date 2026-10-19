'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../scripts/typografie-schulbildschirm-core.js'),root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8');
const main=html.slice(html.indexOf('<div class="atelier-part" data-part="bildschirm">'),html.indexOf('<div class="atelier-part" data-part="web">'));
test('the school reading track has eight chapters, a closing essay and a separate technical track',()=>{
  const chapters=[...main.matchAll(/<section class="chapter[^>]*id="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(chapters,['webtext','projektion','tablet-pdf','lernplattformen','schriften-mitreisen','text-als-bild','bildschirm-darstellung','bildschirm-kurzcheck','handschrift-der-seite']);
  for(let n=1;n<=8;n++)assert.ok(main.includes('>III.'+n+' <span>'));
  for(const word of ['CSS-Pixel','devicePixelRatio','<code>','PowerPoint','Keynote','Die Folie ist kein Handout'])assert.ok(!main.includes(word),word);
  for(const id of ['webtext','bildschirmformate','webrichtung','farbe','hintergrund','weblayout','webgrafik','herobereiche','bewegte-grafik','interaktiv','websteuerung','webwerkstatt','webstudien'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  for(const id of ['projection-distance','projection-width','projection-font','tablet-font','school-spacing'])assert.ok(main.includes('id="'+id+'"'));
  assert.ok(html.includes('webstudien-13-html.zip'));assert.ok(html.includes('>Alle 13<'));
});
test('tablet factors derive from manufacturer resolution and pixel density, not browser pixels',()=>{
  const portrait=C.tabletPage({size:12});assert.ok(Math.abs(portrait.width-157.7878788)<1e-6);assert.ok(Math.abs(portrait.factor-.7513708514)<1e-9);assert.ok(Math.abs(portrait.effective-9.01645)<.00001);assert.equal(portrait.scroll,false);
  const landscape=C.tabletPage({size:12,landscape:true}),whole=C.tabletPage({size:12,landscape:true,whole:true});
  assert.ok(landscape.effective>12);assert.equal(landscape.scroll,true);assert.ok(Math.abs(whole.effective-6.3752678)<1e-6);assert.equal(whole.scroll,false);
  for(const size of [11,12,14,16])for(const landscape of [false,true]){const r=C.tabletPage({size,landscape,whole:true});assert.ok(r.pageHeight<=r.height+1e-8);assert.ok(210*r.factor<=r.width+1e-8);}
  assert.throws(()=>C.tabletPage({size:0}),RangeError);assert.throws(()=>C.tabletPage({size:Infinity}),RangeError);
});
test('projection converts the published band to visible size and then explicit document/font assumptions',()=>{
  const f=C.projection({distance:8,width:2.4,aspect:'16:9',font:'fira'}),g=C.projection({distance:8,width:2.4,aspect:'16:9',font:'garamond'});
  assert.equal(f.supported,true);assert.equal(f.elementFraction,.03);assert.ok(Math.abs(f.elementMm-40.5)<1e-9);assert.ok(g.points>f.points);
  assert.ok(Math.abs(f.points*f.enlargement*f.xHeight*25.4/72-f.elementMm)<1e-9);
  assert.ok(C.projection({document:'landscape'}).points>f.points);
  assert.equal(C.projection({distance:30,width:.3}).supported,false);assert.equal(C.projection({distance:.5,width:10}).supported,false);
  assert.throws(()=>C.projection({distance:NaN}),RangeError);assert.throws(()=>C.projection({width:-2}),RangeError);
  assert.equal(C.projection({font:'toString'}).font,'Fira Sans');
});
test('font height constants match the actual local Regular TTF tables',()=>{
  for(const [id,file]of [['fira','firasans/FiraSans-Regular.ttf'],['garamond','ebgaramond/static/EBGaramond-Regular.ttf']]){
    const b=fs.readFileSync(path.join(root,'fonts/typografie',file)),tabs={};
    for(let i=0;i<b.readUInt16BE(4);i++){const n=12+i*16;tabs[b.toString('ascii',n,n+4)]=b.readUInt32BE(n+8);}
    assert.equal(C.fonts[id].xHeight,b.readInt16BE(tabs['OS/2']+86)/b.readUInt16BE(tabs.head+18));
  }
});
test('the three supplied author voices remain word-for-word, including linked passages',()=>{
  const hashes={'seite-gehoert':'e8de49ae687675454acf8a1f384377b2eabf17349870a36604e6275cb3e8e0d9','papier-bildschirm':'ade37f6a55267eefefd7bbb574c558a9e8c6ca66bc50851b9eff1fb32cc89a02','handschrift':'3fcc417707852030ca57f1c785d052a318f575dd27a0abaa730f470861286f87'};
  for(const [name,hash]of Object.entries(hashes)){
    const aside=main.match(new RegExp('<aside[^>]*data-randstimme="'+name+'"[\\s\\S]*?</aside>'))[0];
    const text=[...aside.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m=>m[1].replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')).join('\n\n');
    assert.equal(crypto.createHash('sha256').update(text).digest('hex'),hash,name);
  }
  for(const id of ['gedankenstrich-randstimme','satzspiegel-sparsam','haltung'])assert.ok(main.includes('href="#'+id+'"'));
  assert.ok(main.includes('nicht auf unmittelbar gemessene Gewöhnung'));assert.ok(main.includes('eine Garantie für fehlerfreien Satz folgt daraus nicht'));
});
test('source limits, progressive fallback and palette-aware examples remain explicit',()=>{
  for(const phrase of ['keine Normprüfung','keine maßstäbliche Projektion','kein Versprechen für jede PDF-App','keine zusätzliche Metaanalyse','Keine garantierte Mindestlesegröße']){
    const ui=fs.readFileSync(path.join(root,'scripts/typografie-schulbildschirm.js'),'utf8');
    assert.ok((main+ui).includes(phrase),phrase);
  }
  assert.ok(main.includes('<noscript>'));assert.ok(main.includes('nicht pauschal für jede ältere Mac-Version'));
  const css=fs.readFileSync(path.join(root,'styles/typografie-schulbildschirm.css'),'utf8');
  for(const s of ['var(--white)','var(--line)','prefers-reduced-motion'])assert.ok(css.includes(s));
  assert.ok(!/https?:\/\//.test(fs.readFileSync(path.join(root,'scripts/typografie-schulbildschirm.js'),'utf8')));
});

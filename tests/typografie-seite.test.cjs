'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../scripts/typografie-seite-core.js'),C=require('../scripts/typografie-core.js');
const dest=path.join(__dirname,'../downloads/typografie/seitenstudien');
test('18 original A4 studies form three coherent groups with real downloads',()=>{
  assert.equal(P.studies.length,18);assert.equal(new Set(P.studies.map(s=>s.id)).size,18);
  for(const group of ['richtung','farbe','raum'])assert.equal(P.studies.filter(s=>s.group===group).length,6);
  for(const s of P.studies){const p=P.scene(s);assert.ok(Math.abs(p.width/p.height-210/297)<1e-10);assert.ok(s.note&&s.task);for(const ext of ['pdf','svg'])assert.ok(fs.statSync(path.join(dest,s.id+'.'+ext)).size>2000);}
});
test('shear keeps a horizontal baseline, rotation preserves glyph shape and rail turns 90 degrees',()=>{
  const group=mode=>P.scene(mode).ops.find(o=>o.kind==='group');
  assert.equal(group('skew').matrix[1],0);assert.equal(group('skew').matrix[0],1);assert.notEqual(group('skew').matrix[2],0);
  const [a,b,c,d]=group('rotate').matrix;assert.ok(Math.abs(a*a+b*b-1)<1e-12);assert.ok(Math.abs(c*c+d*d-1)<1e-12);assert.ok(Math.abs(a*c+b*d)<1e-12);
  assert.ok(Math.abs(group('rail').matrix[0])<1e-12);
});
test('banner is painted above the background claim and has a readable alternative in HTML',()=>{
  const p=P.scene('banner'),first=p.ops.findIndex(o=>o.kind==='text'&&o.text==='MEHR IST'),overlay=p.ops.findIndex(o=>o.kind==='group');assert.ok(overlay>first);
  const h=fs.readFileSync(path.join(__dirname,'../typografie-atelier.html'),'utf8');assert.ok(h.includes('Den absichtlich verdeckten Beispieltext vollständig lesen'));assert.ok(h.includes('erfundener Werbespruch'));
});
test('the rotation guide follows the real baseline and positive angles leave room for body text',()=>{
  for(const angle of [-25,0,25]){
    const p=P.scene('rotate',{angle,guides:true}),group=p.ops.find(o=>o.kind==='group');
    assert.ok(group.children.some(o=>o.kind==='line'&&o.y1===0&&o.y2===0));
    const body=p.ops.find(o=>o.kind==='text'&&o.text.startsWith('Eine gute Diskussion'));
    assert.ok(body.y>=425);
    if(angle>0)assert.ok(body.y>480);
  }
  assert.equal(P.scene('skew',{angle:25,guides:true}).ops.find(o=>o.kind==='group').matrix[1],0);
});
test('bad hue contrast really fails, good colored pair passes and polarity swaps are reciprocal',()=>{
  const bad=P.scene('bad'),good=P.scene('good'),pos=P.scene('positive'),neg=P.scene('negative');assert.ok(C.contrast(bad.foreground,bad.background)<1.6);assert.ok(C.contrast(good.foreground,good.background)>7);assert.equal(C.contrast(pos.foreground,pos.background),C.contrast(neg.foreground,neg.background));
  for(const hex of ['#249b65','#d64545','#142f4f','#fffaf0'])assert.ok(Math.abs(C.luminance(P.gray(hex))-C.luminance(hex))<.005);
});
test('golden split uses usable width and A4 is not claimed to be golden',()=>{
  assert.ok(Math.abs(P.PHI**2-P.PHI-1)<1e-12);const p=P.scene('golden');const panel=p.ops.find(o=>o.kind==='rect'&&o.color==='#eee1c5');assert.ok(Math.abs((panel.x-50)/(P.W-100)-1/P.PHI)<1e-12);
  const h=fs.readFileSync(path.join(__dirname,'../typografie-atelier.html'),'utf8');for(const text of ['DIN A4 ist kein goldenes Rechteck','keine Drucknorm','keine Simulation jeder Farbsehschwäche','nicht die Papierbreite'])assert.ok(h.includes(text));
});
test('construction lines can be removed without changing underlying typography',()=>{
  for(const s of P.studies.filter(s=>s.group==='raum')){const a=P.scene(s),b=P.scene(s,{guides:true});assert.ok(b.ops.length>a.ops.length);assert.deepEqual(b.ops.filter(o=>!(o.kind==='line'||o.kind==='text'&&['61,8 %','38,2 %'].includes(o.text))),a.ops);}
});
test('exports use outlines or embedded local fonts, not Google downloads or dependencies',()=>{
  for(const s of P.studies){const svg=fs.readFileSync(path.join(dest,s.id+'.svg'),'utf8');assert.ok(svg.includes('<path'));assert.ok(!/<text|@font-face|<image|<script/.test(svg));}
  const offline=fs.readFileSync(path.join(dest,'seitenstudien-offline.html'),'utf8');assert.equal((offline.match(/data:font\/woff2;base64,/g)||[]).length,2);assert.ok(!/<script[^>]+src=|<link[^>]+href=|fetch\(|localStorage|sessionStorage/.test(offline));assert.ok(offline.includes('SIL OPEN FONT LICENSE'));
});
test('the page chapter documents sources and resettable semantic controls',()=>{
  const h=fs.readFileSync(path.join(__dirname,'../typografie-atelier.html'),'utf8'),j=fs.readFileSync(path.join(__dirname,'../scripts/typografie-seite.js'),'utf8');for(const [,url] of P.sources)assert.ok(h.includes(url),url);
  for(const id of ['page-direction-reset','page-color-reset','page-composition-reset','page-study-dialog','page-grayscale','page-composition-guides'])assert.ok(h.includes('id="'+id+'"'));
  assert.ok(j.includes('ratio>=4.5'));assert.ok(!/Math\.round\(ratio|localStorage|fetch\(/.test(j));
});
test('color explanations and shared thresholds have distinct responsive reading areas',()=>{
  const root=path.resolve(__dirname,'..'),h=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8'),css=fs.readFileSync(path.join(root,'styles/typografie-seite.css'),'utf8');
  const reading=h.slice(h.indexOf('id="farbkontrast-lesen"'),h.indexOf('id="kontrast-massstab"'));
  assert.equal((reading.match(/<article /g)||[]).length,2);
  assert.ok(!reading.includes('Die Messung in dieser Werkstatt'));
  const note=h.slice(h.indexOf('id="kontrast-massstab"'),h.indexOf('<section class="chapter wrap page-chapter" id="komposition"'));
  assert.equal((note.match(/<dt>/g)||[]).length,2);
  for(const text of ['4,5:1','3:1','18 pt','14 pt fett','ungerundeten Wert','keine Drucknorm','keine vollständige Barrierefreiheitsprüfung','contrast-minimum.html','use-of-color.html'])assert.ok(note.includes(text),text);
  assert.ok(!note.includes('author-comment'));
  assert.ok(css.includes('.page-color-reading{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
  assert.ok(css.includes('@media(max-width:900px){.page-color-reading,.page-color-standard-body{grid-template-columns:1fr}'));
  assert.ok(css.includes('@media(max-width:450px)'));
  assert.ok(!/(?:^|[;{])(?:position:absolute|height:)/.test(css.slice(css.indexOf('/* Keep the explanatory'),css.indexOf('.page-pair{'))));
});

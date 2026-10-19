const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const A=require('../scripts/typografie-anatomy.js');
const root=path.resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'data/typografie-anatomy.json')));
const illustrated=data.families.filter(f=>f.glyphs.x.path);
test('all 41 measurements refer to the exact existing local font files',()=>{
  assert.equal(data.families.length,41);assert.equal(illustrated.length,10);
  for(const f of data.families){
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root,f.source))).digest('hex'),f.sha256);
    assert.equal(f.license,['robotoslab','specialelite'].includes(f.id)?'Apache 2.0':'SIL OFL 1.1');assert.ok(fs.existsSync(path.resolve(root,f.licensePath)));
    assert.ok(f.unitsPerEm>=1000);if('wght' in f.axes)assert.equal(f.axes.wght,400);
    for(const glyph of Object.values(f.glyphs)){assert.equal(glyph.bounds.length,4);assert.ok(glyph.advance>0);assert.ok(glyph.bounds[3]>glyph.bounds[1]);}
  }
});
test('baseline is always zero and guides follow actual glyph outlines, not percentages',()=>{
  for(const f of illustrated){
    const m=A.layout(f,'abgpx');assert.equal(m.y(0),m.baseline);
    for(const c of 'abgpx'){
      const [left,bottom,right,top]=f.glyphs[c].bounds;
      assert.ok(m.y(top)>=0);assert.ok(m.y(bottom)<=m.height);assert.ok(m.scale>0);
      assert.ok(f.glyphs[c].path.startsWith('M'));assert.ok(!/https?:|script|<|>/.test(f.glyphs[c].path));
    }
  }
  const css=fs.readFileSync(path.join(root,'styles/typografie-atelier.css'),'utf8'),js=fs.readFileSync(path.join(root,'scripts/typografie-atelier.js'),'utf8');
  assert.ok(!css.includes('.anatomy-word{'));assert.ok(!js.includes("$('anatomy-font').onchange"));
});
test('all ten demonstrated fonts really contain the stated round-form overshoots',()=>{
  for(const f of illustrated)for(const [flat,round] of [['H','O'],['x','o']]){
    const v=A.overshoot(f,flat,round);assert.ok(v.top>0,f.name);assert.ok(v.belowBaseline>0,f.name);
    assert.equal(v.top,f.glyphs[round].bounds[3]-f.glyphs[flat].bounds[3]);
  }
  const cardo=illustrated.find(f=>f.id==='cardo');assert.deepEqual(A.overshoot(cardo,'H','O'),{top:42,belowBaseline:27,belowFlat:27,upm:2048});
});
test('Fira Sans shows taller l and f, a high i-dot and the shorter t in the actual local outlines',()=>{
  const f=data.families.find(font=>font.id==='firasans');
  assert.equal(f.unitsPerEm,1000);
  assert.deepEqual(Object.fromEntries([...'Hliftx'].map(c=>[c,f.glyphs[c].bounds[3]])),{H:689,l:750,i:780,f:750,t:657,x:527});
  for(const c of 'lif')assert.ok(f.glyphs[c].bounds[3]>f.glyphs.H.bounds[3]);
  assert.ok(f.glyphs.t.bounds[3]>f.glyphs.x.bounds[3]);
  assert.ok(f.glyphs.t.bounds[3]<f.glyphs.H.bounds[3]);
  // The first contour is the i's stem: its top, unlike the dot, equals x-height.
  assert.ok(f.glyphs.i.path.startsWith('M187 527V0H95V527Z'));
  const m=A.layout(f,'Hliftx');
  assert.ok(m.y(f.glyphs.i.bounds[3])<m.y(f.glyphs.H.bounds[3]));
  assert.ok(m.y(f.glyphs.H.bounds[3])<m.y(f.glyphs.t.bounds[3]));
  assert.ok(m.y(f.glyphs.t.bounds[3])<m.y(f.glyphs.x.bounds[3]));
  for(const c of 'Hliftx'){assert.ok(m.y(f.glyphs[c].bounds[3])>=0);assert.ok(m.y(f.glyphs[c].bounds[1])<=m.height);}
});
test('the anatomy study explains the i-dot and shorter t before distinguishing overshoot',()=>{
  const html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8');
  const study=html.slice(html.indexOf('id="fira-oberlaengen"'),html.indexOf('id="overshoot"'));
  for(const wording of ['Versalhöhe und Oberlängenhöhe','Punkt','nicht der Stamm','verkürzte Oberlänge','oberhalb des x, aber unterhalb des H','Kein bloßer Overshoot'])assert.ok(study.includes(wording));
  for(const id of ['fira-height-word','fira-height-status','fira-height-details'])assert.ok(study.includes('id="'+id+'"'));
  assert.ok(study.includes('glyphsapp.com/learn/font-info-settings-in-glyphs-mini#vertical-metrics'));
  const source=fs.readFileSync(path.join(root,'scripts/typografie-anatomy.js'),'utf8');
  assert.ok(source.includes("characters='Hliftx'"));
  assert.ok(source.includes('updateAnatomy();showFiraHeights();updateOvershoot();'));
});
test('upper highlight bands measure each real overhang without recolouring glyph contours',()=>{
  const f=data.families.find(font=>font.id==='firasans'),bands=A.upperBands(f,'Hliftx','H');
  assert.deepEqual(bands.map(({character,top,bottom})=>({character,top,bottom})),[
    {character:'l',top:750,bottom:689},{character:'i',top:780,bottom:689},{character:'f',top:750,bottom:689}
  ]);
  assert.equal(bands[0].x,f.glyphs.H.advance);
  assert.equal(bands[1].x,f.glyphs.H.advance+f.glyphs.l.advance);
  assert.ok(bands[2].width>=f.glyphs.f.bounds[2]); // The f extends beyond its advance.
  for(const font of illustrated){
    const [band]=A.upperBands(font,'HO','H');
    assert.equal(band.character,'O');assert.equal(band.top-band.bottom,A.overshoot(font,'H','O').top);
  }
  const source=fs.readFileSync(path.join(root,'scripts/typografie-anatomy.js'),'utf8');
  assert.ok(!source.includes('fira-above-capital'));assert.ok(!source.includes('above-capital'));
});
test('explanation describes a common type-design principle, naming Fira only as the specimen',()=>{
  const html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8');
  const study=html.slice(html.indexOf('id="fira-oberlaengen"'),html.indexOf('id="overshoot"'));
  const explanation=study.slice(study.indexOf('<div>'),study.indexOf('<figure'));
  assert.ok(explanation.includes('In vielen Schriftarten'));assert.ok(explanation.includes('in vielen Schriften'));
  assert.ok(!explanation.includes('Fira Sans'));assert.ok(study.includes('BEISPIEL: FIRA SANS'));
  for(const wording of ['optische Ausgleich im Fließtext','Grauwert','großgeschriebenen Substantiven','keine zwingende Regel','x-Höhe, Abstand und Punktgröße'])assert.ok(explanation.includes(wording));
  assert.ok(study.includes('tug.org/TUGboat/tb20-2/tb63geld.pdf#page=4'));
});
test('outline illustrations and enlarged crops preserve source contours',()=>{
  const source=fs.readFileSync(path.join(root,'scripts/typografie-anatomy.js'),'utf8');
  assert.ok(source.includes('d:font.glyphs[c].path'));assert.ok(source.includes('svg.cloneNode(true)'));
  assert.ok(source.includes("crop.setAttribute('viewBox'"));
  assert.ok(source.includes('keine geschätzten Hilfslinien'));
  const html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8');
  for(const id of ['anatomy-status','overshoot-font','overshoot-highlight','overshoot-status','overshoot-upper-detail','overshoot-lower-detail'])assert.ok(html.includes('id="'+id+'"'));
  assert.ok(html.includes('Overshoot'));assert.ok(html.includes('Gewicht 400'));
});

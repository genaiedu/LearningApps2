const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const A=require('../scripts/typografie-anatomy.js');
const root=path.resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'data/typografie-anatomy.json')));
const illustrated=data.families.filter(f=>f.glyphs.x.path);
test('all 24 measurements refer to the exact existing local webfonts',()=>{
  assert.equal(data.families.length,24);assert.equal(illustrated.length,9);
  for(const f of data.families){
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root,f.source))).digest('hex'),f.sha256);
    assert.equal(f.license,'SIL OFL 1.1');assert.ok(fs.existsSync(path.resolve(root,f.licensePath)));
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
test('all nine demonstrated fonts really contain the stated round-form overshoots',()=>{
  for(const f of illustrated)for(const [flat,round] of [['H','O'],['x','o']]){
    const v=A.overshoot(f,flat,round);assert.ok(v.top>0,f.name);assert.ok(v.belowBaseline>0,f.name);
    assert.equal(v.top,f.glyphs[round].bounds[3]-f.glyphs[flat].bounds[3]);
  }
  const cardo=illustrated.find(f=>f.id==='cardo');assert.deepEqual(A.overshoot(cardo,'H','O'),{top:42,belowBaseline:27,belowFlat:27,upm:2048});
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

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../scripts/typografie-schriftenraum-core.js');
const F=require('../scripts/typografie-fontlinks.js');
const root=path.resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'data/typografie-schriftenraum.json')));
test('four binary features yield 16 unique fields; rounded is not a fifth axis',()=>{
 assert.equal(C.cells.length,8);assert.equal(C.fields.length,16);
 assert.equal(new Set(C.fields.map(f=>f.cell+'-'+f.layer)).size,16);
 assert.equal(new Set(C.cells.map(c=>[c.serif,c.dynamic,c.contrast].join())).size,8);
 assert.equal(C.fields.filter(f=>!f.specimen).length,6);
 assert.equal(C.empty,'Keine überzeugenden Beispiele gefunden – möglicherweise gestalterisch wenig sinnvoll.');
 for(const f of C.fields)if(f.specimen)assert.ok(C.specimens[f.specimen].edge);
});
test('Podkova comparison proves an angled t, never claims Form is the evidence',()=>{
 const p=C.specimens.podkova;assert.equal(p.glyph,'t');assert.ok(p.note.includes('kein Beleg'));
 const [x,y,a,b]=p.edge;assert.ok(a>x&&b>y);assert.ok((b-y)/(a-x)>.2);
 assert.deepEqual(C.specimens.robotoslab.edge.slice(1).filter((n,i)=>i%2===0),[1343,1343]);
 assert.equal(C.cells.find(c=>c.schraeg==='podkova').quer,'robotoslab');
});
test('every specimen refers to the exact loaded webfont, original glyph and local license',()=>{
 assert.equal(data.families.length,10);
 for(const f of data.families){
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root,f.source))).digest('hex'),f.sha256);
  assert.ok(fs.existsSync(path.resolve(root,f.licensePath)));
  if('wght' in f.axes)assert.equal(f.axes.wght,400);
  for(const c of 'HOagcefrst'){assert.ok(f.glyphs[c].path.startsWith('M'));assert.ok(f.glyphs[c].bounds[3]>f.glyphs[c].bounds[1]);}
 }
 for(const [id,s] of Object.entries(C.specimens)){
  const f=data.families.find(f=>f.id===(s.fontId||id));assert.ok(f,id);assert.equal(s.name,f.name);
  if(s.edge){const [l,b,r,t]=f.glyphs[s.glyph].bounds;for(let i=0;i<4;i+=2){assert.ok(s.edge[i]>=l-.00001&&s.edge[i]<=r+.00001,id);assert.ok(s.edge[i+1]>=b-.00001&&s.edge[i+1]<=t+.00001,id);}}
 }
});
test('default coordinates show exactly four real examples, top row dynamic and right column serif',()=>{
 const q=C.quadrants(C.defaultView());
 assert.equal(q.length,4);assert.deepEqual(q.map(e=>e.specimen.name),['Source Sans 3','Bree Serif','Poppins','Roboto Slab']);
 assert.deepEqual(q.map(e=>[e.x,e.y]),[[false,true],[true,true],[false,false],[true,false]]);
 for(const e of q){assert.equal(e.cell.serif,e.x);assert.equal(e.cell.dynamic,e.y);assert.equal(e.cell.contrast,false);assert.equal(e.layer,'all');}
 assert.deepEqual(C.fixedLabels(C.defaultView()),['geringer Kontrast','Strichabschluss: Gesamtform']);
});
test('all 60 coordinate slices retain four unique fields and every fixed attribute',()=>{
 let count=0;
 for(const x of Object.keys(C.dimensions))for(const y of Object.keys(C.dimensions)){
  if(x===y)continue;
  const rest=Object.keys(C.dimensions).filter(k=>k!==x&&k!==y),values=k=>k==='terminal'?['all','quer','schraeg']:[false,true];
  for(const a of values(rest[0]))for(const b of values(rest[1])){
   const v=C.defaultView();v.x=x;v.y=y;v.fixed[rest[0]]=a;v.fixed[rest[1]]=b;
   const q=C.quadrants(v);assert.equal(q.length,4);assert.equal(new Set(q.map(e=>e.id)).size,4);
   for(const e of q){
    const got={serif:e.cell.serif,dynamic:e.cell.dynamic,contrast:e.cell.contrast,terminal:e.layer};
    for(const k of rest)assert.equal(got[k],v.fixed[k]);
    assert.equal(got[x],x==='terminal'?(e.x?'schraeg':'quer'):e.x);
    assert.equal(got[y],y==='terminal'?(e.y?'schraeg':'quer'):e.y);
    assert.equal(e.specimen,e.key?C.specimens[e.key]:null);
   }
   count++;
  }
 }
 assert.equal(count,60);
});
test('choosing the other axis swaps axes without mutating the input or losing fixed choices',()=>{
 const v=C.defaultView();v.fixed.contrast=true;v.fixed.terminal='schraeg';
 const next=C.changeAxis(v,'x','dynamic');assert.equal(next.x,'dynamic');assert.equal(next.y,'serif');
 assert.equal(v.x,'serif');assert.deepEqual(next.fixed,v.fixed);
 assert.deepEqual(C.changeAxis(next,'y','dynamic'),v);
 for(const bad of [null,{}, {x:'invalid',y:'invalid'}, {x:'terminal',y:'terminal',fixed:{contrast:'true',terminal:'evil'}}]){
  const normalized=C.normalizeView(bad);assert.notEqual(normalized.x,normalized.y);assert.equal(C.quadrants(bad).length,4);
 }
 assert.deepEqual(C.changeAxis(v,'z','dynamic'),v);assert.deepEqual(C.changeAxis(v,'x','__proto__'),v);
});
test('unsupported combinations stay visibly open, never acquire an invented font',()=>{
 const v=C.defaultView();v.fixed.contrast=true;v.fixed.terminal='quer';
 const q=C.quadrants(v);assert.equal(q.filter(e=>e.specimen).length,1);assert.equal(q[0].specimen.name,'Belleza');
 for(const e of q.slice(1)){assert.equal(e.specimen,null);assert.equal(e.key,null);}
 v.fixed.terminal='schraeg';assert.equal(C.quadrants(v)[0].specimen.name,'Belleza');
});
test('new families appear in catalogue and official Google links, correct Apache license',()=>{
 const catalogue=JSON.parse(fs.readFileSync(path.join(root,'data/typografie-fonts.json'))),html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8');
 for(const id of ['breeserif','robotoslab','belleza','limelight','podkova','abel']){const f=catalogue.families.find(f=>f.id===id);assert.ok(f);assert.ok(html.includes(F.url(f.name)));}
 assert.equal(catalogue.families.find(f=>f.id==='robotoslab').license,'Apache 2.0');
 for(const id of ['strichkontrast','strichabschluesse','schriftenraum'])assert.ok(html.indexOf('id="'+id+'"')<html.indexOf('id="auszeichnung"'));
 const css=fs.readFileSync(path.join(root,'styles/typografie-schriftenraum.css'),'utf8');assert.ok(css.includes('max-width:600px'));assert.ok(!/https?:\/\//.test(css));
});
test('all font download offers use Google with one explicit first-opening notice',()=>{
 const html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8'),ui=fs.readFileSync(path.join(root,'scripts/typografie-schriftenraum.js'),'utf8'),archive=fs.readFileSync(path.join(root,'scripts/typografie-atelier.js'),'utf8'),gate=fs.readFileSync(path.join(root,'scripts/typografie-fontlinks.js'),'utf8'),css=fs.readFileSync(path.join(root,'styles/typografie-schriftenraum.css'),'utf8');
 assert.ok(!/<a\b[^>]*href="fonts\/[^\"]+\.(?:zip|ttf|woff2|otf)"/i.test(html));assert.ok(!/a\.href=(?:f\.desktop(?!Static)|file\.path)/.test(archive));
 assert.ok(ui.includes('space-field-download'));assert.ok(ui.includes('space-quadrant-download'));assert.ok(archive.includes('font-google-download'));
 assert.ok(gate.includes("if(!anchor||acknowledged)return"));assert.ok(gate.includes('dialog.showModal()'));assert.ok(gate.includes('open.href=pending'));assert.ok(html.includes('id="font-external-open" class="primary" target="_blank" rel="noopener noreferrer"'));assert.ok(!gate.includes('window.open('));
 assert.ok(html.includes('id="font-external-dialog"'));assert.ok(!html.includes('data-space-rotate'));assert.ok(!ui.includes('ArrowLeft'));
 assert.ok(html.includes('id="space-x"'));assert.ok(html.includes('id="space-y"'));assert.ok(html.includes('id="space-fixed"'));assert.ok(html.includes('id="space-quadrants"'));
 assert.ok(!html.includes('id="font-space-solid"'));assert.ok(!html.includes('id="space-flat-toggle"'));assert.ok(!css.includes('preserve-3d'));assert.ok(!ui.includes('trackball'));assert.ok(!ui.includes('pointermove'));
 assert.ok(ui.includes('changeAxis'));assert.ok(ui.includes('aria-pressed'));assert.ok(html.includes('Der Abstand')||html.includes('der Abstand'));assert.equal(F.url('Goudy Bookletter 1911'),'https://fonts.google.com/specimen/Goudy+Bookletter+1911?preview.script=Latn');
 const googleLinks=[...html.matchAll(/href="(https:\/\/fonts\.google\.com\/specimen\/[^\"]+)"/g)];assert.ok(googleLinks.length>=30);for(const [,href] of googleLinks)assert.equal(new URL(href).searchParams.get('preview.script'),'Latn');
});

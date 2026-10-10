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
test('octahedron has eight equilateral face planes, six vertices and twelve shared edges',()=>{
 const vertices=new Set(),edges=new Map();
 for(const c of C.cells){const f=C.faceFrame(c,200);for(const p of f.vertices)vertices.add(p.join());
  assert.ok(Math.abs(C.dot(C.cross(f.u,f.v),f.normal)-1)<1e-12);
  assert.ok(Math.abs(C.dot(f.u,f.v))<1e-12);
  for(let i=0;i<3;i++){const a=f.vertices[i],b=f.vertices[(i+1)%3],key=[a.join(),b.join()].sort().join('|');edges.set(key,(edges.get(key)||0)+1);assert.ok(Math.abs(Math.hypot(...a.map((n,j)=>n-b[j]))-200*Math.SQRT2)<1e-10);assert.ok(Math.abs(C.dot(f.normal,a)-200/Math.sqrt(3))<1e-10);}
  // CSS local triangle vertices must map back onto the exact solid plane.
  for(const [x,y] of [[f.width/2,f.down?f.height:0],[0,f.down?0:f.height],[f.width,f.down?0:f.height]]){
   const p=f.origin.map((n,i)=>n+f.u[i]*x+f.v[i]*y);assert.ok(f.vertices.some(v=>Math.hypot(...p.map((n,i)=>n-v[i]))<1e-10));
  }
 }
 assert.equal(vertices.size,6);assert.equal(edges.size,12);for(const count of edges.values())assert.equal(count,2);
});
test('trackball rotation is unbounded and retains true three-dimensional geometry',()=>{
 const a=C.trackball(0,0,200),b=C.trackball(170,-120,200),q=C.turnBetween(a,b),p=C.rotatePoint(a,q);
 assert.ok(Math.hypot(...p.map((n,i)=>n-b[i]))<1e-12);
 let orientation=[0,0,0,1];for(let i=0;i<40;i++)orientation=C.multiply(C.axisAngle([1,0,0],.4),orientation);
 for(const point of [[200,0,0],[0,-200,0],[0,0,200]])assert.ok(Math.abs(Math.hypot(...C.rotatePoint(point,orientation))-200)<1e-10);
 const opposite=C.rotatePoint([0,0,1],C.turnBetween([0,0,1],[0,0,-1]));assert.ok(Math.abs(opposite[2]+1)<1e-12);
 assert.equal(C.rotationMatrix(orientation).length,16);
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
 assert.ok(ui.includes('space-field-download'));assert.ok(ui.includes('space-flat-download'));assert.ok(archive.includes('font-google-download'));
 assert.ok(gate.includes("if(!anchor||acknowledged)return"));assert.ok(gate.includes('dialog.showModal()'));assert.ok(gate.includes('open.href=pending'));assert.ok(html.includes('id="font-external-open" class="primary" target="_blank" rel="noopener noreferrer"'));assert.ok(!gate.includes('window.open('));
 assert.ok(html.includes('id="font-external-dialog"'));assert.ok(!html.includes('data-space-rotate'));assert.ok(!ui.includes('ArrowLeft'));
 assert.ok(css.includes('transform-style:preserve-3d'));assert.ok(css.includes('rgba(122,133,128'));assert.ok(ui.includes("if(flat||drag||e.button!==0)return"));
 assert.ok(!ui.includes("e.target.closest('button')||"));assert.equal(F.url('Goudy Bookletter 1911'),'https://fonts.google.com/specimen/Goudy+Bookletter+1911?preview.script=Latn');
 const googleLinks=[...html.matchAll(/href="(https:\/\/fonts\.google\.com\/specimen\/[^\"]+)"/g)];assert.ok(googleLinks.length>=30);for(const [,href] of googleLinks)assert.equal(new URL(href).searchParams.get('preview.script'),'Latn');
});

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../scripts/typografie-schriftenraum-core.js');
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
test('cube has 12 edges and rotation preserves its geometry',()=>{
 let edges=0;for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)if(C.adjacent(C.cells[i],C.cells[j]))edges++;assert.equal(edges,12);
 for(const c of C.cells)for(const [yaw,pitch] of [[0,0],[-.64,-.4],[2,1],[-1,-.8]]){const p=C.project(c,yaw,pitch);assert.ok(Math.abs(p.x*p.x+p.y*p.y+p.z*p.z-3)<1e-12);}
 for(const n of [-200,0,200])assert.ok(Math.abs(C.normalize(n))<=Math.PI);
});
test('new families appear in catalogue and installation downloads, correct Apache license',()=>{
 const catalogue=JSON.parse(fs.readFileSync(path.join(root,'data/typografie-fonts.json'))),html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8');
 for(const id of ['breeserif','robotoslab','belleza','limelight','podkova','abel']){const f=catalogue.families.find(f=>f.id===id);assert.ok(f);assert.ok(html.includes(f.desktop));}
 assert.equal(catalogue.families.find(f=>f.id==='robotoslab').license,'Apache 2.0');
 for(const id of ['strichkontrast','strichabschluesse','schriftenraum'])assert.ok(html.indexOf('id="'+id+'"')<html.indexOf('id="auszeichnung"'));
 const css=fs.readFileSync(path.join(root,'styles/typografie-schriftenraum.css'),'utf8');assert.ok(css.includes('max-width:600px'));assert.ok(!/https?:\/\//.test(css));
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(base,f),'utf8'),C=require('../scripts/moehne-inhalte.js'),D=require('../scripts/moehne-zeichnungen.js');
const html=read('moehnetalsperre.html'),css=read('styles/moehnetalsperre.css'),js=read('scripts/moehnetalsperre.js'),model=JSON.parse(read('assets/moehne/moehne-modell.json'));
test('a history learning app without tasks, points, login or hidden analytics',()=>{
  assert.equal(C.timeline.length,12);assert.equal(C.build.length,6);assert.equal(C.attack.length,5);assert.equal(C.slides.length,26);
  assert.ok(!html.includes('id="training"'));assert.ok(!/Math\.random|fetch\(|analytics|gtag\(|firebase/i.test(js));
  assert.ok(html.includes('Ohne externe Inhalte starten'));assert.ok(html.includes('hidden inert'));assert.ok(html.indexOf('id="entry"')<html.indexOf('id="app"'));
  for(const s of C.slides)assert.ok(s.text.length>30);
});
test('source distinctions, figures and current maps are explicit',()=>{
  assert.match(C.build[1].text,/stollen/i);assert.ok(C.build[1].detail.includes('305'));assert.match(C.build[2].detail,/nicht rekonstruiert/);
  assert.ok(html.includes('526'));assert.ok(html.includes('1.284'));assert.ok(html.includes('1.579'));assert.ok(html.includes('über 1.600'));
  assert.ok(html.includes('keine historische Karte'));assert.ok(html.includes('keine Hochwasservorhersage'));
  for(const [id,s]of Object.entries(C.sources)){assert.ok(new URL(s.url).protocol==='https:',id);assert.ok(s.note.length>20);}
  for(const t of C.timeline)assert.ok(C.sources[t.source]);
  for(const m of C.mapViews){assert.equal(m.bbox.length,4);assert.ok(m.bbox[0]<m.bbox[2]);assert.ok(m.bbox[1]<m.bbox[3]);assert.equal(m.marker.length,2);}
});
test('every photograph has checked source, author, dimensions and rights; no remote sources in initial HTML',()=>{
  assert.equal(C.photos.length,12);assert.equal(new Set(C.photos.map(p=>p.id)).size,12);
  for(const p of C.photos){assert.ok(p.artist&&p.license&&p.page&&p.alt&&p.caption,p.id);assert.ok(p.width>0&&p.height>0);assert.ok(p.url.startsWith('https://upload.wikimedia.org/'));assert.ok(p.page.startsWith('https://commons.wikimedia.org/')||p.page.startsWith('https://de.wikipedia.org/'));if(!p.license.startsWith('Gemeinfrei'))assert.ok(p.licenseUrl?.startsWith('https://creativecommons.org/'));}
  assert.ok(!/<(?:img|iframe)[^>]+src="https?:/.test(html));assert.ok(!/preconnect|dns-prefetch|fonts\.googleapis|fonts\.gstatic/.test(html+css+js));
  assert.ok(js.includes('img.src=p.url'));assert.ok(js.indexOf('if(!state.images)return')<js.indexOf('img.src=p.url'));
  assert.ok(js.includes('if(state.maps&&state.started)'));assert.ok(!/sessionStorage/.test(js));
});
test('local font assets, real cuts, palette roles and licenses are present',()=>{
  const audited=JSON.parse(read('data/typografie-fontaudit.json')).families.flatMap(f=>f.files),crypto=require('node:crypto');
  for(const m of css.matchAll(/src:url\("([^"]+)"\)/g)){const p=path.resolve(base,'styles',m[1]);assert.ok(fs.existsSync(p));const bytes=fs.readFileSync(p);assert.equal(bytes.subarray(0,4).toString(),'wOF2');const entry=audited.find(f=>f.sha256===crypto.createHash('sha256').update(bytes).digest('hex'));assert.ok(entry);assert.equal(entry.germanMissing,'');for(const feature of['kern','liga','onum','pnum','lnum','tnum'])assert.ok(entry.features.includes(feature));}
  for(const feature of['font-synthesis:none','font-kerning:normal','font-variant-ligatures:common-ligatures','font-variant-numeric:oldstyle-nums proportional-nums','font-variant-numeric:lining-nums tabular-nums'])assert.ok(css.includes(feature));
  for(const palette of['graphite','atelier','slate','plum','bordeaux'])assert.ok(html.includes('value="'+palette+'"'));
  for(const file of['firasans-OFL.txt','ebgaramond-OFL.txt'])assert.ok(fs.existsSync(path.resolve(base,'../LearningApps/fonts/kanban',file)));
  assert.ok(fs.existsSync(path.resolve(base,'../LearningApps/fonts/chess/THREE-LICENSE.txt')));
});
test('all schema states are finite, local SVG and carry distinct marker ids',()=>{
  let combined='';for(const kind of['build','attack'])for(let i=0;i<C[kind].length;i++){const out=D[kind](i);assert.ok(out.includes('<path'));assert.ok(!/NaN|Infinity|https?:|<script|<image/.test(out));combined+=out;}
  for(const n of[0,5,50,75,100]){const out=D.wall(n);assert.ok(!/NaN|Infinity/.test(out));combined+=out;}
  combined+=D.rivers();const ids=[...combined.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});
test('Blender scene, GLB and Web mesh are genuine and consistent in documented scope',()=>{
  let blend=fs.readFileSync(path.join(base,'assets/moehne/moehnetalsperre.blend'));if(blend.subarray(0,4).toString('hex')==='28b52ffd')blend=require('node:zlib').zstdDecompressSync(blend);assert.equal(blend.subarray(0,7).toString(),'BLENDER');
  assert.equal(fs.readFileSync(path.join(base,'assets/moehne/moehnetalsperre.glb')).subarray(0,4).toString(),'glTF');
  assert.match(model.generator,/Blender 5/);assert.deepEqual(model.dimensions,{crestLength:650,maxHeight:40.3,baseWidth:34.2,crestWidth:6.25});
  assert.equal(model.pois.length,6);assert.equal(model.spots.length,4);assert.ok(model.meshes.length>=8);
  for(const m of model.meshes){assert.equal(m.positions.length%9,0);assert.ok(m.positions.every(Number.isFinite));assert.ok(m.color.every(n=>n>=0&&n<=1));}
  for(const p of [...model.pois,...model.spots]){assert.equal(p.position.length,3);assert.ok(C.photos.some(f=>f.id===p.photo));}
  for(const s of model.spots){assert.equal(s.target.length,3);assert.ok(s.focal>=s.range[0]&&s.focal<=s.range[1]);assert.ok(Math.hypot(...s.position.map((n,i)=>n-s.target[i]))>10);}
  assert.match(read('tools/build-moehne-model.py'),/Darstellungsannahme/);
});

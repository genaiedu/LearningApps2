const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),vm=require('node:vm');
const archive=require('../data/kunstarchiv.json'),media=require('../data/kunstbilder.json'),wiki=require('../data/kunst-wikipedia.json'),titles=require('../data/kunst-titel-de.json'),knowledge=require('../data/kunst-glossar.json'),plan=require('../data/kunst-portraets-2026.json');
const imageById=new Map(media.images.map(w=>[w.id,w])),pool=archive.works.map(w=>({...w,...imageById.get(w.id),titleDe:titles.titles[w.id],artistIdentity:wiki.artists[w.artist].language+':'+wiki.artists[w.artist].title}));
const ctx={KunstWallEnabled:true,URL};vm.runInNewContext(fs.readFileSync(require.resolve('../scripts/kunsttresor-core.js'),'utf8'),ctx);const core=ctx.KunstTresor;
const added=pool.slice(1505),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
test('302 additions from 89 artists preserve all 1505 published works and images exactly',()=>{
  assert.equal(pool.length,1807);assert.equal(added.length,302);assert.equal(new Set(added.map(w=>w.artist)).size,89);
  assert.equal(hash(archive.works.slice(0,1505)),'c5820f89b44ffcc671c8fe9c3a6edea4651ae8e90fb1ce7739279328f4be0087');
  assert.equal(hash(media.images.slice(0,1505)),'a74906e6ae3e24984e8ddce51d66ef8406b35a9f3566aed099980d107021b2f8');
  const planned=[...plan.works.map(w=>'wd-'+w[0]),...Object.values(plan.supplement).flat().map(id=>'wd-'+id)];assert.equal(new Set(planned).size,302);assert.deepEqual(new Set(added.map(w=>w.id)),new Set(planned));
  assert.equal(new Set(pool.map(w=>w.imageOriginalURL)).size,pool.length);
});
test('each added work has individually reviewed PD/CC0 image metadata, German display title and covered catalogue fields',()=>{
  for(const w of added){assert.ok(core.validWork(w),w.id);assert.ok(core.canDownload(w),w.id);assert.equal(w.downloadRightsChecked,'2026-10-17');assert.match(w.imageLicense,/^(Public domain|CC0)$/);assert.equal(new URL(w.imageSource).hostname,'commons.wikimedia.org');assert.equal(new URL(w.imageOriginalURL).hostname,'upload.wikimedia.org');assert.ok(w.imageWidth&&w.imageHeight&&w.imageBytes);assert.ok(knowledge.styles[w.style]&&knowledge.techniques[w.technique]);assert.ok(w.dateStart<=w.dateEnd&&w.dateEnd<=w.artistDeath);assert.ok(w.titleDe&&!/^Q\d+$/.test(w.artist));assert.ok(wiki.artists[w.artist]);assert.ok(w.styleTerms.includes(w.styleOriginal));if(w.styleSource.startsWith('Redaktionell'))assert.match(w.styleSource,/kein P135-Befund/);}
  assert.equal(added.filter(w=>w.artist==='Édouard Manet').length,56);assert.equal(added.filter(w=>w.artist==='Henri de Toulouse-Lautrec').length,22);assert.equal(added.filter(w=>w.artist==='Gustav Klimt').length,26);
});
test('the three requested reproductions use their exact files and concrete artwork identities',()=>{
  for(const[qid,file]of Object.entries(plan.requestedFiles)){const w=pool.find(w=>w.id==='wd-'+qid);assert.ok(w);assert.equal(decodeURIComponent(new URL(w.imageSource).pathname).replaceAll('_',' '),'/wiki/'+file);}
  const hope=pool.find(w=>w.id==='wd-Q19883512');assert.equal(hope.date,'1907–1908');assert.equal(hope.technique,'Öl und Metallauflage');assert.match(hope.medium,/Gold und Platin/);
  assert.equal(pool.find(w=>w.id==='wd-Q19801071').date,'1800');assert.match(pool.find(w=>w.id==='wd-Q19801071').museum,/Malmaison/);
  assert.equal(pool.find(w=>w.id==='wd-Q26250').date,'1866');assert.equal(pool.find(w=>w.id==='wd-Q3824633').date,'1889');
  assert.ok(!added.some(w=>/Kokoschka|Segar|Gower/.test(w.artist)));
});
test('old saved rooms remain valid, and every new work can participate in an unambiguous room',()=>{
  const old=core.newState(pool.slice(0,1505));assert.ok(core.restore(old,pool));
  for(const work of added){const chosen=[work];for(const other of pool)if(chosen.length<7&&core.compatible(chosen,other))chosen.push(other);assert.equal(chosen.length,7,work.id);const state=core.newState(chosen,null,Math.random,false,{});assert.ok(state.ids.includes(work.id));assert.ok(core.restore(state,pool));}
});

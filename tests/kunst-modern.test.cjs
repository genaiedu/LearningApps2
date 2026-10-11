const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../scripts/kunsttresor-core.js');
const curator=require('../scripts/kunst-kurator.js');
const ki=require('../services/kunst-kurator/lib/kunst-ki.js');
const progress=require('../scripts/kunsttresor-progress.js');
const save=require('../scripts/kunsttresor-save.js');
const history=require('../scripts/kunsttresor-history.js');
const crypto=require('node:crypto');
const archive=require('../data/kunstarchiv.json');
const media=require('../data/kunstbilder.json');
const titles=require('../data/kunst-titel-de.json');
const wiki=require('../data/kunst-wikipedia.json');
const knowledge=require('../data/kunst-glossar.json');
const plan=require('../data/kunst-erweiterung-2026.json');
const byId=new Map(media.images.map(w=>[w.id,w]));
const pool=archive.works.map(w=>({...w,...byId.get(w.id),titleDe:titles.titles[w.id],artistIdentity:wiki.artists[w.artist].language+':'+wiki.artists[w.artist].title}));
const added=pool.slice(1438);
function rng(seed){return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
function solved(works){let state=core.newState(works,null,rng(29));state.roomToken='a'.repeat(32);state.runToken='b'.repeat(32);state.parentRoomToken=null;
  for(const id of state.ids)for(const field of core.fields)state=core.choose(state,id,field,works.find(w=>w.id===id)[field]);
  return core.inspect(state,works).state;
}
const mixed=()=>['met-204758','cma-2019.22','aic-142570','cma-1943.279'].map(id=>pool.find(w=>w.id===id));
test('67 reviewed modern/photo/sculptural works extend rather than replace the old archive',()=>{
  assert.equal(archive.works.length,1505);assert.equal(added.length,67);
  assert.equal(Object.values(plan).filter(Array.isArray).reduce((n,v)=>n+v.length,0),67);
  assert.deepEqual(Object.fromEntries([...new Set(added.map(w=>w.artForm))].map(k=>[k,added.filter(w=>w.artForm===k).length])),{painting:31,collage:1,photograph:14,sculpture:18,relief:3});
  for(const w of added){assert.ok(core.validWork(w),w.id);assert.ok(core.canDownload(w),w.id);assert.equal(w.downloadRightsChecked,'2026-10-11');assert.ok(knowledge.styles[w.style]&&knowledge.techniques[w.technique]);}
  assert.equal(new Set(pool.map(w=>w.imageOriginalURL)).size,pool.length);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(archive.works.slice(0,1438))).digest('hex'),'6c23e75e289a302ef72614a5c764f49981f6bde9189e7f9dd470cc1aa339206a');
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(media.images.slice(0,1438))).digest('hex'),'9a72a1d33ae9efcdb6821067bec204672457972e7907de85654cb5356e840322');
  assert.doesNotMatch(added.map(w=>w.title).join(' '),/mummy|mummie|mumia|mummy mask|sarcophagus|coffin|human remains|funerary mask/i);
});
test('anonymous ancient works are explicit and cannot become an invented common artist or modern copyright exception',()=>{
  const ancient=added.filter(w=>w.attribution==='unknown');assert.equal(ancient.length,14);
  for(const w of ancient){assert.equal(w.artistDeath,null);assert.equal(w.artist,'Unbekannter Künstler');assert.ok(w.dateEnd<=600);assert.equal(w.imageLicense,'CC0');}
  const w=ancient[0];for(const change of [{attribution:'named'},{artistDeath:0},{dateEnd:2020},{dateStart:-10001},{rightsBasis:'assumed public domain'},{artist:'Unknown'}])assert.equal(core.validWork({...w,...change}),false);
  assert.equal(core.compatible([ancient[0]],ancient[1]),false,'two identical anonymous answer labels would be ambiguous');
  for(const work of ancient){const room=[work];for(const other of pool)if(room.length<4&&core.compatible(room,other))room.push(other);
    const state=solved(room);const explanation=curator.explain(work,state,knowledge,pool);
    assert.match(explanation.opening,/Unbekannter Künstler/);assert.doesNotMatch(explanation.opening,/von Unbekannter Künstler/);
    assert.doesNotMatch(explanation.sections.flatMap(s=>s.paragraphs).join(' '),/Unbekannter Künstler gehört selbst|weitere Arbeiten von Unbekannter/);
  }
});
test('cinematic and hero selection never use sculpture or relief, including every fallback path',()=>{
  const landmarks=require('../data/kunst-hauptwerke.json').works.map(w=>w.id);
  const random=rng(17);for(let i=0;i<200;i++)for(const w of [...core.introSelection(pool,landmarks,[],random),...core.heroSelection(pool,pool.map(w=>w.id),random)])assert.ok(core.isIntroImage(w),w.id);
  const images=pool.filter(core.isIntroImage).slice(0,6),objects=added.filter(w=>!core.isIntroImage(w));
  const mini=[...objects,...images];const film=core.introSelection(mini,images.map(w=>w.id),[],rng(1));assert.equal(film.length,6);assert.ok(film.every(core.isIntroImage));
  assert.ok(core.heroSelection(mini,mini.map(w=>w.id),rng(2)).every(core.isIntroImage));
});
test('museum downloads require individually reviewed CC0 and the corresponding trusted museum source',()=>{
  for(const provider of ['Cleveland Museum of Art','Metropolitan Museum of Art']){
    const w=added.find(w=>w.metadataProvider===provider);assert.ok(core.canDownload(w));
    for(const change of [{imageLicense:'CC BY-SA 4.0'},{metadataProvider:'Unverified'},{downloadRightsChecked:null},{imageOriginalURL:'https://example.org/free.jpg'},{imageDownloadAllowed:false}])assert.equal(core.canDownload({...w,...change}),false);
  }
});
test('ancient chronology is signed and later prints or casts do not overwrite the model/negative date',()=>{
  assert.deepEqual(curator.dateSpan('486–465 v. Chr.'),{min:-486,max:-465,approximate:false});
  assert.deepEqual(curator.dateSpan('um 2950 v. Chr.'),{min:-2950,max:-2950,approximate:true});
  assert.deepEqual(curator.dateSpan('1–200 n. Chr.'),{min:1,max:200,approximate:false});
  assert.deepEqual(curator.dateSpan('1907; Druck 1915'),{min:1907,max:1907,approximate:false});
  assert.deepEqual(curator.dateSpan('Modell 1881; Guss um 1924'),{min:1881,max:1881,approximate:false});
  assert.equal(curator.stage('486–465 v. Chr.',knowledge.styles['Achämenidische Kunst']),'within');
});
test('mixed four-category rooms retain exact answers, anonymous attribution and encrypted portability',async()=>{
  const works=mixed();assert.ok(works.every(Boolean));const state=solved(works);assert.equal(state.phase,'unlocked');
  for(const field of core.fields)assert.equal(new Set(state.options[field]).size,4);
  const profile=progress.recordWin(progress.fresh(),state,pool).profile;
  let encounters=history.fresh();for(const id of state.ids)encounters=history.track(encounters,state,pool,{shownId:id});
  assert.deepEqual(history.restore(JSON.parse(JSON.stringify(encounters))),encounters,'museum accession IDs containing dots survive reload');
  const payload={app:'kunsttresor',version:1,savedAt:Date.now(),best:1,state,progress:profile,history:encounters};
  const restored=save.validate(await save.decode(await save.encode(payload)),pool,archive.replacements,core,progress,history);assert.deepEqual(restored.state.ids,state.ids);assert.deepEqual(restored.history,encounters);
});
test('new art forms have accurate local openings and reach AI as trusted catalogue facts without a live request',()=>{
  const works=mixed(),state=solved(works),context=ki.context(ki.payload(state,progress.fresh()),pool,knowledge,curator);
  assert.equal(context.works.length,4);
  for(const item of context.works){const w=pool.find(w=>w.id===item.id);assert.equal(item.artForm,w.artForm);assert.equal(item.medium,w.medium);assert.equal(item.attribution,w.attribution||'named');assert.ok(item.programText.includes(w.artist));}
  const photo=works.find(w=>w.artForm==='photograph');assert.doesNotMatch(curator.explain(photo,state,knowledge,pool).opening,/Malweise|Pinsel|Malerei/);
  const statue=works.find(w=>w.artForm==='sculpture');assert.match(curator.explain(statue,state,knowledge,pool).opening,/plastische|räumliche|Körper|Volumen/);
  assert.match(ki.instructions,/attribution=unknown/);
});
test('renewed external image permission explains every new museum host, and unknown artists have no fake article',()=>{
  const html=fs.readFileSync(require.resolve('../kunsttresor.html'),'utf8'),js=fs.readFileSync(require.resolve('../scripts/kunsttresor.js'),'utf8');
  for(const host of ['thumb.wikimedia.org','openaccess-cdn.clevelandart.org','images.metmuseum.org'])assert.ok(html.includes(host));
  assert.match(js,/kunsttresor-images-v2/);assert.match(js,/artistArticle && !artistArticle.unknown/);
  assert.match(html,/Metropolitan Museum of Art/);
  const css=fs.readFileSync(require.resolve('../styles/kunsttresor.css'),'utf8');assert.match(css,/grid-template-rows:minmax\(0,1fr\)/);
  const bust=byId.get('aic-102591');assert.equal(bust.imageLicense,'CC0');assert.match(bust.imageCredit,/Daderot/);
});

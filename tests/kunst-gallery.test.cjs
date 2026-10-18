const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const core=require('../scripts/kunsttresor-core.js'),progress=require('../scripts/kunsttresor-progress.js'),history=require('../scripts/kunsttresor-history.js'),save=require('../scripts/kunsttresor-save.js'),gallery=require('../scripts/kunsttresor-gallery.js');
const archive=require('../data/kunstarchiv.json'),pool=archive.works,texts=require('../data/kunst-filmtexte.json'),knowledge=require('../data/kunst-glossar.json');
const seeded=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function room(seed=8){return {...core.newState(pool,null,seeded(seed)),roomToken:progress.token(),runToken:progress.token(),parentRoomToken:null};}
function win(state){for(const id of state.ids)for(const field of core.fields)state=core.choose(state,id,field,pool.find(work=>work.id===id)[field]);return core.inspect(state,pool).state;}
function fixture(count=24){let g=gallery.fresh(),h=history.fresh(),p=progress.fresh(),s;for(let i=1;g.liked.length<count;i++){
  s=win(room(i));for(const id of s.ids)h=history.track(h,s,pool,{shownId:id});p=progress.recordWin(p,s,pool).profile;
  for(const id of s.ids)g=gallery.like(g,id,s,pool);
}return {g,h,p,s};}
test('curated gallery imports need no fictional winning history and survive complete save exports',async()=>{
 const at=Date.now(),ids=pool.slice(0,24).map(w=>w.id),g={...gallery.fresh(),liked:ids.map(id=>({id,source:'curated',at}))};g.film.items=ids.slice(0,10).map(gallery.item);
 const h=history.fresh(),p=progress.fresh(),payload={app:save.APP,version:save.VERSION,kind:'gallery',savedAt:at,gallery:g};
 const decoded=save.validate(await save.decode(await save.encode(payload)),pool,[],core,progress,history,gallery);assert.equal(decoded.galleryOnly,true);assert.deepEqual(decoded.gallery,g);
 const full=save.validate({app:save.APP,version:1,savedAt:at,state:null,best:0,progress:p,history:h,gallery:g},pool,[],core,progress,history,gallery);
 assert.deepEqual(full.gallery,g);assert.equal(full.history.rooms.length,0);assert.equal(full.progress.events.length,0);
 for(const mutate of [x=>x.gallery.liked[0].id='unknown',x=>x.gallery.liked[0].source='pretend-won',x=>x.gallery.liked.push(x.gallery.liked[0]),x=>x.gallery.film.items[0].id='outside']){const bad=structuredClone(payload);mutate(bad);assert.throws(()=>save.validate(bad,pool,[],core,progress,history,gallery));}
});
test('liking is a reward only after every assignment in a room is correct',()=>{
  const initial=room(),won=win(initial),g=gallery.fresh();
  assert.throws(()=>gallery.like(g,initial.ids[0],initial,pool),/gewonnenen/);
  for(const phase of ['lost','playing'])assert.throws(()=>gallery.like(g,won.ids[0],{...won,phase},pool));
  assert.throws(()=>gallery.like(g,pool.find(w=>!won.ids.includes(w.id)).id,won,pool));
  const added=gallery.like(g,won.ids[0],won,pool);assert.equal(added.liked.length,1);assert.equal(gallery.like(added,won.ids[0],won,pool),added);
});
test('gallery validation requires an observed and entirely won room, not one correct work in a lost room',()=>{
  const f=fixture(),bad=structuredClone(f.h);bad.rooms[0].checks[0][3]=11;
  assert.ok(gallery.restore(f.g,pool,f.h));assert.equal(gallery.restore(f.g,pool,bad),null);
  const unseen=structuredClone(f.h);unseen.rooms[0].seen=0;assert.equal(gallery.restore(f.g,pool,unseen),null);
  const before=JSON.stringify(f.g),invalid=structuredClone(f.g);invalid.liked[0].id='outside';assert.equal(gallery.restore(invalid,pool,f.h),null);assert.equal(JSON.stringify(f.g),before);
});
test('20 likes unlock the film; deleting below the threshold locks it again',()=>{
  const f=fixture(),g={...f.g,liked:f.g.liked.slice(0,19)};assert.throws(()=>gallery.automatic(g));
  const twenty={...g,liked:f.g.liked.slice(0,20)},auto=gallery.automatic(twenty,seeded(7));assert.equal(auto.film.items.length,8);assert.ok(gallery.validateFilm(auto));
  assert.throws(()=>gallery.validateFilm(gallery.remove(auto,twenty.liked[0].id)),/fehlen/);
});
test('film bounds are 6–10 unique liked works; selection is editable without discarding the collection',()=>{
  const f=fixture(),auto=gallery.automatic(f.g,seeded(4));
  for(const n of [6,8,10])assert.ok(gallery.validateFilm({...auto,film:{...auto.film,items:f.g.liked.slice(0,n).map(x=>gallery.item(x.id))}}));
  for(const n of [5,11])assert.throws(()=>gallery.validateFilm({...auto,film:{...auto.film,items:f.g.liked.slice(0,n).map(x=>gallery.item(x.id))}}));
  const duplicate=structuredClone(auto);duplicate.film.items[1]=duplicate.film.items[0];assert.equal(gallery.restore(duplicate,pool,f.h),null);
  const outside=structuredClone(auto);outside.film.items[0].id=pool.find(w=>!auto.liked.some(x=>x.id===w.id)).id;assert.equal(gallery.restore(outside,pool,f.h),null);
  const removed=gallery.remove(auto,auto.film.items[0].id);assert.equal(removed.liked.length,auto.liked.length-1);assert.equal(removed.film.items.length,7);
});
test('film runs for the actual complete soundtrack with every detail before every full view',()=>{
  for(const count of [6,8,10]){const items=Array.from({length:count},(_,i)=>gallery.item('id'+i)),frames=gallery.timeline(items,128.4);
    assert.equal(frames.length,count*2+2);assert.equal(frames[0].start,0);assert.equal(frames.at(-1).end,128.4);
    assert.deepEqual(frames.slice(1,1+count).map(f=>f.phase),Array(count).fill('detail'));
    assert.deepEqual(frames.slice(1+count,-1).map(f=>f.id),items.map(i=>i.id));
    frames.slice(0,-1).forEach((frame,i)=>assert.ok(Math.abs(frame.end-frames[i+1].start)<1e-8));
    assert.ok(frames.filter(f=>f.phase==='full').every(f=>f.end-f.start>=4.5));
    assert.equal(gallery.frameAt(frames,128.4).phase,'ending');
  }
});
test('removing from the film preserves the liked gallery, remaining order and all other editing',()=>{
  const f=fixture(),g=gallery.automatic(f.g,seeded(4));
  g.film.name='Meine Sammlung';g.film.motto='Ein eigener Blick';
  g.film.items[1]={...g.film.items[1],caption:'custom',text:'Mein unveränderter Text',variant:1};
  const before=structuredClone(g),removed=gallery.removeFromFilm(g,g.film.items[0].id);
  assert.deepEqual(g,before);assert.deepEqual(removed.liked,g.liked);
  assert.deepEqual(removed.film,{...g.film,items:g.film.items.slice(1)});
  assert.ok(gallery.restore(removed,pool,f.h));assert.ok(gallery.validateFilm(removed));
  assert.deepEqual(gallery.removeFromFilm(removed,g.film.items[0].id),removed);
  const short={...g,film:{...g.film,items:g.film.items.slice(0,6)}};
  const draft=gallery.removeFromFilm(short,short.film.items[0].id);
  assert.deepEqual(draft.liked,g.liked);assert.ok(gallery.restore(draft,pool,f.h));
  assert.throws(()=>gallery.validateFilm(draft),/6 bis 10/);
  const ui=fs.readFileSync(require.resolve('../scripts/kunsttresor-gallery-ui.js'),'utf8');
  assert.equal((ui.match(/model\.removeFromFilm\(/g)||[]).length,2);
  assert.doesNotMatch(ui,/add\.disabled=selected\.has/);
});
test('editor name, motto, text modes, variants and exact ordering survive encrypted JSON and reload',async()=>{
  const f=fixture();f.g=gallery.automatic(f.g,seeded(4));f.g.film.name='Licht & Körper – meine Galerie';f.g.film.motto='Ein eigener Blick. ÄÖÜß';
  f.g.film.items.reverse();f.g.film.items[0]={...f.g.film.items[0],caption:'custom',text:'Mein Text <bleibt Text>',variant:1};
  const payload={app:save.APP,version:1,savedAt:Date.now(),state:f.s,best:1,progress:f.p,history:f.h,gallery:f.g},sealed=await save.encode(payload);
  assert.doesNotMatch(sealed,/Licht|liked|motto|Körper/);
  const restored=save.validate(await save.decode(sealed),pool,archive.replacements||[],core,progress,history);
  assert.deepEqual(restored.gallery,f.g);assert.equal(restored.legacyGallery,false);
  assert.deepEqual(gallery.restore(JSON.parse(JSON.stringify(f.g)),pool,f.h),f.g);
});
test('legacy files have no gallery replacement and merged imports preserve all existing likes',()=>{
  const f=fixture(),payload={app:save.APP,version:1,savedAt:Date.now(),state:f.s,best:1,progress:f.p,history:f.h};
  assert.equal(save.validate(payload,pool,[],core,progress,history).legacyGallery,true);
  const left={...f.g,liked:f.g.liked.slice(0,12)},right={...f.g,liked:f.g.liked.slice(8)};right.film.name='Importierte Galerie';
  const merged=gallery.merge(left,right);assert.equal(merged.liked.length,f.g.liked.length);assert.equal(merged.film.name,right.film.name);assert.ok(gallery.restore(merged,pool,f.h));
  assert.deepEqual(gallery.merge(merged,right),merged);
});
test('all archive styles and materials have two reviewed film phrases; personal captions are literal',()=>{
  for(const key of Object.keys(knowledge.styles))assert.equal(texts.styles[key]?.length,2,key);
  for(const key of Object.keys(knowledge.techniques))assert.equal(texts.techniques[key]?.length,2,key);
  for(const work of pool){assert.ok(texts.styles[work.style]);assert.ok(texts.techniques[work.technique]);}
  const work=pool[0],item=gallery.item(work.id);assert.ok(gallery.caption(work,item,texts));assert.equal(gallery.caption(work,{...item,caption:'none'},texts),'');
  assert.equal(gallery.caption(work,{...item,caption:'custom',text:'<script>literal</script>'},texts),'<script>literal</script>');
});
test('the film admits sculpture, relief and photographs while the existing intro stays two-dimensional',()=>{
  const works=pool.filter(w=>['sculpture','relief','photograph'].includes(w.artForm));assert.ok(works.length);
  const frames=gallery.timeline(works.slice(0,8).map(w=>gallery.item(w.id)),128.4);assert.ok(frames.some(f=>f.id===works[0].id));
  assert.ok(core.introSelection(pool,archive.works.slice(0,100).map(w=>w.id)).every(w=>core.isIntroImage(w)));
});
test('movie playback never calls AI, waits for all decoded pictures and follows the soundtrack clock',()=>{
  const ui=fs.readFileSync(require.resolve('../scripts/kunsttresor-gallery-ui.js'),'utf8');
  assert.doesNotMatch(ui,/fetch\(|api\/feedback|Groq|requestAI/);assert.match(ui,/await Promise\.all\(tasks\)/);assert.match(ui,/audio\.currentTime/);assert.match(ui,/audio\.duration/);assert.match(ui,/textContent/);
});
test('the reward heart has its own aligned card row and shows the remaining film threshold locally',()=>{
  const css=fs.readFileSync(require.resolve('../styles/kunsttresor.css'),'utf8'),ui=fs.readFileSync(require.resolve('../scripts/kunsttresor-gallery-ui.js'),'utf8');
  assert.match(css,/\.art-card\{display:grid;grid-row:span 4;grid-template-rows:subgrid/);
  assert.match(ui,/gallery-like-note/);assert.match(ui,/Lieblingswerke bis zum Kunstfilm/);
});

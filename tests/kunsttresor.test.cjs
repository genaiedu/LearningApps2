const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../scripts/kunsttresor-core.js');
const archive = require('../data/kunstarchiv.json');
const media = require('../data/kunstbilder.json');
const wiki = require('../data/kunst-wikipedia.json');
const landmarks = require('../data/kunst-hauptwerke.json');
const titles = require('../data/kunst-titel-de.json');
const byId = new Map(media.images.map(image => [image.id,image]));
const pool = archive.works.filter(work => byId.has(work.id) && wiki.artists[work.artist]).map(work=>({...work,...byId.get(work.id),titleDe:titles.titles[work.id],titleDeTranslated:titles.ownTranslations.includes(work.id),artistIdentity:wiki.artists[work.artist].language+':'+wiki.artists[work.artist].title}));
function seeded(seed) { return () => { seed = (Math.imul(1664525,seed) + 1013904223) >>> 0; return seed / 4294967296; }; }
function answer(state,correct = true) {
  for (const field of core.fields) for (const id of state.ids) state = core.choose(state,id,field,'');
  for (const field of core.fields) for (let i = 0; i < 4; i++) {
    const id = state.ids[i], work = pool.find(w => w.id === state.ids[correct ? i : (i + 1) % 4]);
    state = core.choose(state,id,field,work[field]);
  }
  return state;
}
test('large documented metadata-only archive, public domain images and named artists', () => {
  assert.equal(pool.length,1000);
  assert.equal(archive.works.length,1000);
  assert.equal(new Set(pool.map(work => work.id)).size,pool.length);
  for (const work of pool) {
    assert.ok(core.validWork(work),work.id);
    assert.ok(work.styleTerms.includes(work.styleOriginal),work.id);
    assert.ok(work.artistDeath > 1300 && work.artistDeath <= 1955);
    assert.ok(['www.artic.edu','www.wikidata.org'].includes(new URL(work.source).hostname));
    if (work.metadataProvider==='Wikidata') {
      assert.equal(work.styleSource,'P135 am Werk, nicht vom Künstler abgeleitet');
      assert.ok(work.materialIds.length>=1);
      assert.match(work.wikidata,/\/Q\d+$/);
    }
    assert.equal(work.rights,'CC0 / Public Domain');
    assert.ok(['upload.wikimedia.org','thumb.wikimedia.org'].includes(new URL(work.imageURL).hostname));
    assert.equal(new URL(work.imageSource).hostname,'commons.wikimedia.org');
    assert.match(work.imageLicense,/public domain|cc0/i);
    assert.ok(wiki.artists[work.artist]);
  }
});
test('image download is offered only for individually verified Public Domain / CC0 originals', () => {
  assert.equal(pool.filter(core.canDownload).length,1000);
  for (const work of pool.filter(core.canDownload)) {
    assert.equal(new URL(work.imageOriginalURL).hostname,'upload.wikimedia.org');
    assert.match(work.downloadRightsChecked,/^2026-10-09$/);
    assert.ok(work.imageBytes > 0); assert.ok(work.imageMime.startsWith('image/'));
  }
  const free=pool.find(core.canDownload);
  for (const invalid of [{...free,imageDownloadAllowed:false},{...free,imageLicense:'CC BY-SA 4.0'},{...free,imageOriginalURL:'https://example.org/image.jpg'},{...free,imageOriginalURL:'http://upload.wikimedia.org/image.jpg'},{...free,imageOriginalURL:null}]) assert.equal(core.canDownload(invalid),false);
});
test('1000 random rooms: four unique answers in all four categories', () => {
  const random = seeded(420), combinations = new Set();
  for (let i = 0; i < 1000; i++) {
    const room = core.room(pool,[],random);
    assert.equal(room.works.length,4);
    assert.equal(new Set(room.works.map(w=>w.artistIdentity)).size,4);
    combinations.add(room.works.map(w => w.id).sort().join(','));
    for (const field of core.fields) {
      assert.equal(new Set(room.works.map(work => work[field])).size,4);
      assert.deepEqual([...room.options[field]].sort(),room.works.map(w => w[field]).sort());
    }
  }
  assert.ok(combinations.size > 900);
});
test('different name forms of the same artist cannot masquerade as two room answers', () => {
  const legacy=pool.find(w=>w.artist==='Paul Cezanne');
  const alternative=pool.find(w=>w.artist==='Paul Cézanne');
  assert.ok(legacy && alternative);
  assert.equal(legacy.artistIdentity,alternative.artistIdentity);
  assert.equal(core.compatible([legacy],{...alternative,date:'another date',style:'another style',technique:'another technique'}),false);
});
test('100 documented closing masterpieces are playable works with their own Wikipedia article', () => {
  assert.equal(landmarks.works.length,100);
  assert.equal(new Set(landmarks.works.map(w=>w.id)).size,100);
  for (const featured of landmarks.works) {
    const work=pool.find(w=>w.id===featured.id);
    assert.ok(work,featured.id);
    assert.equal(work.title,featured.title); assert.equal(work.artist,featured.artist);
    assert.deepEqual(wiki.works[work.id],featured.wikipedia);
    assert.ok(featured.wikimediaSitelinks>=5);
    assert.ok(core.canDownload(work));
  }
});
test('material additions and dated ranges are preserved, not flattened into misleading exact years', () => {
  assert.equal(pool.find(w=>w.id==='wd-Q698487').date,'1907–1908');
  assert.equal(pool.find(w=>w.id==='wd-Q698487').technique,'Öl und Metallauflage');
  assert.equal(pool.find(w=>w.id==='wd-Q354396').technique,'Öl und Metallauflage');
  for (const series of ['Q637414','Q157541','Q59201','Q669994']) assert.ok(!pool.some(w=>w.id==='wd-'+series));
});
test('every intro ends with a selected masterpiece, with six distinct images and varied repeat finales', () => {
  const featured=landmarks.works.map(w=>w.id), endings=new Set(), random=seeded(991);
  let recent=[];
  for (let i=0;i<500;i++) {
    const intro=core.introSelection(pool,featured,recent,random);
    assert.equal(intro.length,6);
    assert.equal(new Set(intro.map(w=>w.id)).size,6);
    assert.ok(featured.includes(intro.at(-1).id));
    assert.ok(!recent.includes(intro.at(-1).id));
    endings.add(intro.at(-1).id); recent=intro.map(w=>w.id);
  }
  assert.ok(endings.size>=90);
  assert.throws(()=>core.introSelection(pool,[],[],random));
});
test('46-second film finishes uncropped, with a large title, local handwriting and fading soundtrack', () => {
  const js=fs.readFileSync(path.join(__dirname,'../scripts/kunsttresor.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../styles/kunsttresor.css'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'../kunsttresor.html'),'utf8');
  assert.match(js,/introSeconds=46/);
  assert.match(js,/durations=\[7000,7000,7000,7000,7000,11000\]/);
  assert.match(js,/title:'1000 Kunstwerke',text:'Quiz Edition'/);
  assert.match(js,/introAudio\.volume=Math\.max\(0/);
  assert.match(css,/\.intro-slide--full img\{object-fit:contain;transform:none!important;animation:none!important;filter:none\}/);
  assert.match(css,/Caveat[\s\S]*caveat-v23-latin-700\.woff2/);
  assert.ok(html.includes('id="intro-art-caption"'));
  assert.ok(js.includes('data/kunst-hauptwerke.json'));
});
test('gallery headings display the documented title, without appending artist credits', () => {
  assert.ok(pool.every(work=>typeof work.title==='string' && work.title.trim()));
  assert.ok(pool.every(work=>!core.galleryTitle(work).toLowerCase().includes(work.artist.toLowerCase())));
  const js=fs.readFileSync(path.join(__dirname,'../scripts/kunsttresor.js'),'utf8');
  const render=js.slice(js.indexOf('function render()'),js.indexOf('function nextRoom()'));
  assert.ok(render.includes("node('h3','work-title',core.galleryTitle(work))"));
  assert.ok(render.includes('heading.append(marker,title)'));
  assert.doesNotMatch(render,/heading\.append\([^\n]*work\.artist/);
  assert.doesNotMatch(render,/Original · Museum/);
});
test('all 1000 works have localized display titles, while source titles and saved answers stay intact', () => {
  assert.equal(Object.keys(titles.titles).length,1000);
  assert.equal(new Set(titles.ownTranslations).size,titles.ownTranslations.length);
  assert.ok(titles.ownTranslations.length>500);
  for (const work of pool) {
    assert.ok(work.titleDe.trim(),work.id);
    const original=archive.works.find(x=>x.id===work.id);
    assert.equal(work.title,original.title);
    for (const field of core.fields) assert.equal(work[field],original[field]);
    if (work.titleDeTranslated) assert.notEqual(work.titleDe,work.title);
    assert.equal(core.galleryTitle(work),work.titleDe);
  }
  for (const [id,title] of [['wd-Q61903346','Stillende Madonna'],['wd-Q3793426','Der Zyklop'],['wd-Q127651776','Tod eines Ulanen'],['aic-21937','Anbetung der Könige'],['wd-Q29117166','Versöhnung'],['wd-Q17304998','Pygmalion und Galatea']]) assert.equal(core.galleryTitle(pool.find(x=>x.id===id)),title);
  assert.equal(core.galleryTitle({title:'Original'}),'Original');
  assert.equal(core.galleryTitle({title:'Original',galleryTitle:'Quiztitel'}),'Quiztitel');
  const previous=core.newState(pool,null,seeded(34));
  const restored=core.restore(previous,pool.map(({titleDe,titleDeTranslated,...work})=>work));
  assert.deepEqual(restored,{...previous,review:null});
});
test('own translations are disclosed only in the solution and article targets are not translated', () => {
  const js=fs.readFileSync(path.join(__dirname,'../scripts/kunsttresor.js'),'utf8');
  assert.ok(js.includes("Originaltitel der Werkquelle: "));
  assert.ok(js.includes("Eigene deutsche Übersetzung; kein offizieller Museumstitel."));
  assert.match(js,/chosen\[index\]\)\+' · '\+chosen\[index\]\.artist/);
  assert.ok(js.includes("workArticle.title,workArticle.language"));
  const render=js.slice(js.indexOf('function render()'),js.indexOf('function nextRoom()'));
  assert.doesNotMatch(render,/titleDeTranslated|Originaltitel/);
});
test('three entrance artworks vary between visits, with distinct artists and styles', () => {
  const random=seeded(212), combinations=new Set();
  let recent=[];
  for(let i=0;i<100;i++) {
    const chosen=core.heroSelection(pool,recent,random);
    assert.equal(chosen.length,3);
    assert.equal(new Set(chosen.map(w=>w.id)).size,3);
    assert.equal(new Set(chosen.map(w=>w.artistIdentity)).size,3);
    assert.equal(new Set(chosen.map(w=>w.style)).size,3);
    assert.ok(chosen.every(w=>!recent.includes(w.id)));
    combinations.add(chosen.map(w=>w.id).sort().join(',')); recent=chosen.map(w=>w.id);
  }
  assert.equal(combinations.size,100);
  const js=fs.readFileSync(path.join(__dirname,'../scripts/kunsttresor.js'),'utf8');
  assert.ok(js.includes('heroWorks=core.heroSelection(pool,recent)'));
  assert.doesNotMatch(js,/id === 'aic-28560'|id === 'aic-20684'/);
});
test('one explicit start click unlocks music before fullscreen, then opens the film above it', async () => {
  const js=fs.readFileSync(path.join(__dirname,'../scripts/kunsttresor.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'../kunsttresor.html'),'utf8');
  const launch=js.slice(js.indexOf('async function launchGallery()'),js.indexOf('function finishIntro('));
  const events=[],context={
    imagesAllowed:false,state:null,pool:[],introSoundEnabled:false,introAudio:{},keys:{images:'images'},
    close:id=>events.push('close:'+id),store:{set:()=>events.push('consent')},heroImages:()=>events.push('images'),
    core:{newState:()=>({})},save:()=>{},render:()=>{},$:()=>({focus:()=>events.push('focus')}),
    startIntroAudio:()=>events.push('music'),enterFullscreen:async()=>events.push('fullscreen'),
    showIntro:options=>{events.push('film');assert.equal(options.audioPrimed,true);}
  };
  const vm=require('node:vm'); vm.createContext(context); vm.runInContext(launch,context);
  const started=context.launchGallery();
  assert.ok(events.indexOf('music')<events.indexOf('fullscreen'));
  assert.ok(!events.includes('film'));
  await started;
  assert.ok(events.indexOf('fullscreen')<events.indexOf('film'));
  assert.equal(context.introSoundEnabled,true);
  assert.equal(context.imagesAllowed,true);
  assert.ok(html.includes('id="launch-privacy" hidden'));
  assert.ok(js.includes("imagesAllowed ? 'Vollbild & Musik starten →' : 'Kunstbilder erlauben & starten →'"));
  assert.ok(js.includes('prepareLaunch();'));
});
test('unsupported fullscreen has a reversible browser-filling fallback', async () => {
  const js=fs.readFileSync(path.join(__dirname,'../scripts/kunsttresor.js'),'utf8');
  const implementation=js.slice(js.indexOf('async function enterFullscreen()'),js.indexOf("document.addEventListener('fullscreenchange'"));
  for(const unsupported of [true,false]) {
    const gameClasses=new Set(),bodyClasses=new Set(),document={fullscreenElement:null},game={classList:{contains:n=>gameClasses.has(n),add:n=>gameClasses.add(n),remove:n=>gameClasses.delete(n)}};
    if(!unsupported) game.requestFullscreen=async()=>{document.fullscreenElement=game;};
    document.body={classList:{add:n=>bodyClasses.add(n),remove:n=>bodyClasses.delete(n)}};
    document.exitFullscreen=async()=>{document.fullscreenElement=null;};
    const context={document,$:()=>game,fullscreenLabel:()=>{}};
    const vm=require('node:vm'); vm.createContext(context); vm.runInContext(implementation,context);
    await context.enterFullscreen();
    assert.equal(gameClasses.has('fullscreen-fallback'),unsupported);
    assert.equal(document.fullscreenElement===game,!unsupported);
    await context.fullscreen();
    assert.equal(document.fullscreenElement,null); assert.equal(gameClasses.size,0); assert.equal(bodyClasses.size,0);
  }
});
test('a successful image load after the warning recovers, but stale rooms do not', () => {
  const js=fs.readFileSync(path.join(__dirname,'../scripts/kunsttresor.js'),'utf8');
  const implementation=js.slice(js.indexOf('function loadWorkImage('),js.indexOf('function render()'));
  const vm=require('node:vm');
  for(const stale of [false,true]) {
    let timeout,loading=null;
    const image={naturalWidth:0},button={disabled:true,querySelector:()=>loading,append:e=>{if(e!==image)loading=e;}};
    const context={imageEpoch:5,imagesAllowed:true,imageTimers:new Set(),ready:new Set(),failed:new Set(),core,
      node:tag=>tag==='img'?image:{remove:()=>{loading=null;}},update:()=>{},imageURL:w=>w.imageURL,
      setTimeout:fn=>{timeout=fn;return 17;},clearTimeout:()=>{}};
    vm.createContext(context);vm.runInContext(implementation,context);
    context.loadWorkImage(pool[0],button,5); timeout();
    assert.equal(button.disabled,true);assert.ok(context.failed.has(pool[0].id));
    if(stale)context.imageEpoch++;
    image.naturalWidth=960;image.onload();
    assert.equal(button.disabled,stale);assert.equal(context.ready.has(pool[0].id),!stale);
    if(!stale){assert.equal(context.failed.size,0);assert.equal(loading,null);image.onerror();assert.equal(button.disabled,false);}
  }
  const madonna=pool.find(w=>w.title==='Nursing Madonna');
  assert.match(madonna.imageURL,/\/960px-/);
  assert.notEqual(madonna.imageURL,madonna.imageLargeURL);
  assert.ok(js.includes("$('zoom-image').src = imageURL(work)"));
  assert.ok(js.includes("epoch === zoomEpoch && $('image-dialog').open && imagesAllowed"));
});
test('recent artworks are avoided when the fresh pool permits a room', () => {
  let state = core.newState(pool,null,seeded(302));
  for (let i = 0; i < 30; i++) {
    const previous = state; state = core.newState(pool,state,seeded(i + 987));
    const blocked = [...previous.recent,...previous.ids].slice(-24);
    assert.ok(state.ids.every(id => !previous.ids.includes(id)), 'do not repeat the immediately previous room');
    let freshPossible = true;
    try { core.room(pool.filter(work=>!blocked.includes(work.id)),[],seeded(i+7)); } catch { freshPossible = false; }
    if (freshPossible) assert.ok(state.ids.every(id => !blocked.includes(id)));
  }
});
test('incomplete inputs consume no attempts', () => {
  const state = core.newState(pool,null,seeded(3));
  const result = core.inspect(state,pool);
  assert.equal(result.checked,false); assert.equal(result.incomplete,true); assert.equal(result.state.attempts,0);
});
test('second incorrect check loses, terminal state cannot be checked again', () => {
  let state = answer(core.newState(pool,null,seeded(4)),false);
  state = core.inspect(state,pool).state; assert.equal(state.attempts,1); assert.equal(state.phase,'playing');
  state = core.inspect(state,pool).state; assert.equal(state.attempts,2); assert.equal(state.phase,'lost');
  assert.equal(core.inspect(state,pool).checked,false);
  assert.equal(core.choose(state,state.ids[0],'date',state.options.date[0]),state);
});
test('perfect assignment unlocks exactly once; new room resets only its own attempts', () => {
  let state = answer(core.newState(pool,null,seeded(8)));
  let result = core.inspect(state,pool); state = result.state;
  assert.equal(result.correct,16); assert.equal(state.escaped,1); assert.equal(state.phase,'unlocked');
  assert.equal(core.inspect(state,pool).state.escaped,1);
  let next = core.newState(pool,state,seeded(9));
  assert.equal(next.attempts,0); assert.equal(next.escaped,1); assert.equal(core.filled(next),0);
  next = core.inspect(answer(next,false),pool).state;
  next = core.inspect(answer(next),pool).state;
  assert.equal(next.escaped,2); assert.equal(next.attempts,2); assert.equal(next.phase,'unlocked');
});
test('taken answers are blocked, never silently erase another assignment, and are released by clearing', () => {
  let state = core.newState(pool,null,seeded(30)); const value = state.options.artist[0];
  state = core.choose(state,state.ids[0],'artist',value);
  assert.equal(core.takenBy(state,state.ids[1],'artist',value),state.ids[0]);
  assert.equal(core.takenBy(state,state.ids[0],'artist',value),null);
  const taken = state;
  state = core.choose(state,state.ids[1],'artist',value);
  assert.equal(state,taken); assert.equal(state.choices[state.ids[0]].artist,value);
  assert.equal(state.choices[state.ids[1]]?.artist,undefined);
  assert.equal(core.filled(state),1);
  state = core.choose(state,state.ids[0],'artist','');
  assert.equal(core.takenBy(state,state.ids[1],'artist',value),null);
  state = core.choose(state,state.ids[1],'artist',value);
  assert.equal(state.choices[state.ids[1]].artist,value);
});
test('first failed check retains exact feedback, but changed choices are not evaluated early', () => {
  let state = answer(core.newState(pool,null,seeded(94)));
  const [a,b] = state.ids, first = state.choices[a].date, second = state.choices[b].date;
  state = core.choose(state,a,'date',''); state = core.choose(state,b,'date','');
  state = core.choose(state,a,'date',second); state = core.choose(state,b,'date',first);
  assert.deepEqual(core.review(state,pool),[]);
  const checked = core.inspect(state,pool); state = checked.state;
  assert.equal(checked.correct,14); assert.equal(state.phase,'playing');
  const review = core.review(state,pool);
  assert.equal(review.length,16); assert.equal(review.filter(result=>!result.correct).length,2);
  assert.ok(review.every(result=>!result.changed));
  const snapshot = JSON.stringify(state.review);
  state = core.choose(state,a,'date',''); state = core.choose(state,b,'date','');
  state = core.choose(state,a,'date',first); state = core.choose(state,b,'date',second);
  assert.equal(JSON.stringify(state.review),snapshot);
  assert.equal(core.review(state,pool).filter(result=>result.changed).length,2);
  assert.equal(core.review(state,pool).filter(result=>!result.correct).length,2);
  const restored = core.restore(JSON.parse(JSON.stringify(state)),pool);
  assert.equal(restored.attempts,1); assert.deepEqual(restored.review,state.review);
  assert.equal(core.review(restored,pool).filter(result=>result.changed).length,2);
  const won = core.inspect(state,pool).state;
  assert.equal(won.phase,'unlocked'); assert.ok(core.review(won,pool).every(result=>result.correct && !result.changed));
  assert.deepEqual(core.review(core.newState(pool,won,seeded(95)),pool),[]);
});
test('saved game restores attempts and terminal state; corrupt storage fails safely', () => {
  const initial = core.newState(pool,null,seeded(31));
  let state = core.inspect(answer(initial,false),pool).state;
  assert.equal(core.restore(JSON.parse(JSON.stringify(state)),pool).attempts,1);
  state = core.inspect(state,pool).state;
  assert.equal(core.restore(state,pool).phase,'lost');
  const won = core.inspect(answer(initial),pool).state; assert.equal(core.restore(won,pool).phase,'unlocked');
  for (const bad of [null,{}, {...won,choices:null}, {...initial,choices:[]}, {...initial,ids:['x']}, {...initial,attempts:2}, {...initial,options:{}}, {...initial,phase:'unlocked'}]) assert.equal(core.restore(bad,pool),null);
});
test('Wikipedia is offered only after a room ends and uses the established full-article reader', () => {
  const js = fs.readFileSync(path.join(__dirname,'../scripts/kunsttresor.js'),'utf8');
  const html = fs.readFileSync(path.join(__dirname,'../kunsttresor.html'),'utf8');
  assert.ok(js.includes("if (!state || state.phase === 'playing') return;"));
  assert.ok(js.includes("wikiButton(work.style,styleArticle[work.style] || work.style)"));
  assert.ok(js.includes("if (workArticle) links.append(wikiButton('Wikipedia zum Werk: ' + core.galleryTitle(work),workArticle.title,workArticle.language))"));
  assert.equal(Object.keys(wiki.works).length,482);
  assert.ok(Object.values(wiki.works).every(article=>article.title && ['de','en'].includes(article.language)));
  assert.ok(html.includes('scripts/schroedinger-wikipedia.js'));
  assert.ok(html.includes('id="consent" data-defer-initial'));
  assert.doesNotMatch(html,/https:\/\/fonts\.(googleapis|gstatic)/);
  assert.doesNotMatch(html,/href="[^"]*materialien\.html/);
  assert.ok(html.indexOf('So funktioniert dein Rundgang') < html.indexOf('id="start-game"'));
  assert.ok(html.includes('id="review-summary"'));
  assert.ok(js.includes('option.disabled = Boolean(owner)'));
  assert.ok(html.includes('id="intro-skip"'));
  assert.ok(html.includes('id="intro-count"'));
  assert.ok(js.includes('previousIntro=chosen.map(work=>work.id)'));
  assert.ok(js.includes("view.setPointerCapture(event.pointerId)"));
  assert.ok(js.includes('work.imageLargeURL || imageURL(work)'));
  assert.ok(js.includes('if (core.canDownload(work))'));
});

test('the outgoing intro image keeps its pan animation during the crossfade', () => {
  const js = fs.readFileSync(path.join(__dirname,'../scripts/kunsttresor.js'),'utf8');
  const css = fs.readFileSync(path.join(__dirname,'../styles/kunsttresor.css'),'utf8');
  const update = js.match(/slides\.forEach\(\(slide,i\)=>\{[\s\S]*?\n      \}\);/)[0];
  const slides = Array.from({length:5}, () => {
    const classes = new Set();
    return {classes,classList:{add:name=>classes.add(name),toggle:(name,on)=>on?classes.add(name):classes.delete(name)}};
  });
  const vm = require('node:vm');
  const context = {slides,index:0};
  vm.runInNewContext(update,context);
  assert.ok(slides[0].classes.has('is-started'));
  assert.ok(slides[0].classes.has('is-active'));
  for (context.index=1;context.index<5;context.index++) {
    vm.runInNewContext(update,context);
    assert.ok(slides[context.index-1].classes.has('is-started'), 'outgoing motion persists');
    assert.ok(!slides[context.index-1].classes.has('is-active'), 'only outgoing opacity changes');
    assert.ok(slides[context.index].classes.has('is-started'));
    assert.ok(slides[context.index].classes.has('is-active'));
    assert.equal(slides.filter(s=>s.classes.has('is-active')).length,1);
  }
  assert.doesNotMatch(css,/\.intro-slide\.is-active img/);
  assert.match(css,/\.intro-slide\.is-started img\{animation:art-film-pan calc\(var\(--chapter-duration,6s\) \+ var\(--crossfade-duration,1\.5s\)\) ease-in-out both\}/);
  assert.match(css,/transition:opacity var\(--crossfade-duration,1\.5s\) ease/);
});

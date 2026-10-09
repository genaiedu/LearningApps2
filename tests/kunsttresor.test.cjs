const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../scripts/kunsttresor-core.js');
const archive = require('../data/kunstarchiv.json');
const media = require('../data/kunstbilder.json');
const wiki = require('../data/kunst-wikipedia.json');
const byId = new Map(media.images.map(image => [image.id,image]));
const pool = archive.works.filter(work => byId.has(work.id) && wiki.artists[work.artist]).map(work=>({...work,...byId.get(work.id)}));
function seeded(seed) { return () => { seed = (Math.imul(1664525,seed) + 1013904223) >>> 0; return seed / 4294967296; }; }
function answer(state,correct = true) {
  for (const field of core.fields) for (let i = 0; i < 4; i++) {
    const id = state.ids[i], work = pool.find(w => w.id === state.ids[correct ? i : (i + 1) % 4]);
    state = core.choose(state,id,field,work[field]);
  }
  return state;
}
test('large documented metadata-only archive, public domain images and named artists', () => {
  assert.ok(pool.length >= 200);
  assert.equal(new Set(pool.map(work => work.id)).size,pool.length);
  for (const work of pool) {
    assert.ok(core.validWork(work),work.id);
    assert.ok(work.styleTerms.includes(work.styleOriginal),work.id);
    assert.ok(work.artistDeath > 1300 && work.artistDeath <= 1955);
    assert.equal(new URL(work.source).hostname,'www.artic.edu');
    assert.equal(work.rights,'CC0 / Public Domain');
    assert.ok(['upload.wikimedia.org','thumb.wikimedia.org'].includes(new URL(work.imageURL).hostname));
    assert.equal(new URL(work.imageSource).hostname,'commons.wikimedia.org');
    assert.match(work.imageLicense,/public domain|cc0/i);
    assert.ok(wiki.artists[work.artist]);
  }
});
test('1000 random rooms: four unique answers in all four categories', () => {
  const random = seeded(420), combinations = new Set();
  for (let i = 0; i < 1000; i++) {
    const room = core.room(pool,[],random);
    assert.equal(room.works.length,4);
    combinations.add(room.works.map(w => w.id).sort().join(','));
    for (const field of core.fields) {
      assert.equal(new Set(room.works.map(work => work[field])).size,4);
      assert.deepEqual([...room.options[field]].sort(),room.works.map(w => w[field]).sort());
    }
  }
  assert.ok(combinations.size > 900);
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
test('each answer is assigned at most once within its category', () => {
  let state = core.newState(pool,null,seeded(30)); const value = state.options.artist[0];
  state = core.choose(state,state.ids[0],'artist',value);
  state = core.choose(state,state.ids[1],'artist',value);
  assert.equal(state.choices[state.ids[0]].artist,''); assert.equal(state.choices[state.ids[1]].artist,value);
  assert.equal(core.filled(state),1);
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
  assert.ok(html.includes('scripts/schroedinger-wikipedia.js'));
  assert.ok(html.includes('id="consent" data-defer-initial'));
  assert.doesNotMatch(html,/https:\/\/fonts\.(googleapis|gstatic)/);
  assert.doesNotMatch(html,/href="[^"]*materialien\.html/);
});

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function wall(file){const context={KunstWallEnabled:true};vm.runInNewContext(fs.readFileSync(require.resolve('../scripts/'+file),'utf8'),context);return context;}
const c=wall('kunsttresor-core.js').KunstTresor,h=wall('kunsttresor-history.js').KunstHistory;
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const works=n=>Array.from({length:n},(_,i)=>({id:'w'+i,title:'Werk '+i,artist:'Person '+i,artistIdentity:'de:Person '+i,artistDeath:1900,date:String(1400+i),style:'Stil '+i,styleOriginal:'belegt',technique:'Technik '+i%3,medium:'Katalogmaterial',imageId:'image'+i,source:'https://example.org/'+i,publicDomain:true}));
function shown(history,state,pool,indices=state.ids.map((_,i)=>i)) {state={...state,roomToken:history.rooms.length.toString(16).padStart(32,'0')};for(const i of indices)history=h.track(history,state,pool,{shownId:state.ids[i]});return history;}
test('three complete compatible rooms exhaust a 21-work pool without a single repeat',()=>{
  const pool=works(21),seen=new Set();let history=h.fresh(),state=null;
  for(let i=0;i<3;i++){state=c.newState(pool,state,rng(i+1),false,h.encounterCounts(history));for(const id of state.ids){assert.ok(!seen.has(id),id);seen.add(id);}history=shown(history,state,pool);}
  assert.equal(seen.size,21);assert.ok(Object.values(h.encounterCounts(history)).every(n=>n===1));
  const next=c.newState(pool,state,rng(8),false,h.encounterCounts(history));history=shown(history,next,pool);
  const counts=h.encounterCounts(history),later=c.newState(pool,next,rng(13),false,counts);assert.ok(later.ids.every(id=>counts[id]===1),'finish the next least-seen tier before using any work a third time');
});
test('reload, merged saves and a new round retain the complete no-repeat history',()=>{
  const pool=works(28),first=c.newState(pool,null,rng(1),false,{}),second=c.newState(pool,first,rng(2),false,Object.fromEntries(first.ids.map(id=>[id,1])));
  const left=shown(h.fresh(),first,pool),right=shown({...h.fresh(),rooms:[...left.rooms]},second,pool);
  const imported=h.merge(h.restore(JSON.parse(JSON.stringify(left))),right),next=c.newState(pool,null,rng(4),false,h.encounterCounts(imported));
  assert.ok(next.ids.every(id=>!first.ids.includes(id)&&!second.ids.includes(id)));
  assert.equal(imported.rooms.length,2);assert.equal(h.merge(imported,right).rooms.length,2);
});
test('unseen newly added works are prioritised and a final partial tier needs only minimal fillers',()=>{
  const pool=works(21),counts=Object.fromEntries(pool.map(w=>[w.id,1]));for(const w of pool.slice(-3))delete counts[w.id];
  const state=c.newState(pool,null,rng(3),false,counts);assert.equal(state.ids.filter(id=>!counts[id]).length,3);
  const withAdded=[...pool,...works(28).slice(21)],next=c.newState(withAdded,null,rng(5),false,Object.fromEntries(pool.map(w=>[w.id,1])));
  assert.ok(next.ids.every(id=>Number(id.slice(1))>=21));
});
test('end-of-tier technique variety never forces an avoidable image repeat',()=>{
  const pool=works(21).map((w,i)=>({...w,technique:i<7?'Öl auf Leinwand':w.technique})),counts=Object.fromEntries(pool.slice(7).map(w=>[w.id,1]));
  const state=c.newState(pool,null,rng(2),false,counts);assert.ok(state.ids.every(id=>!counts[id]));assert.equal(state.options.technique.length,7);
  for(const id of state.ids)assert.equal(pool.find(w=>w.id===id).technique,'Öl auf Leinwand');
});
test('uniqueness stays mandatory when the remaining fresh works have the same artist or style',()=>{
  const pool=works(21).map((w,i)=>i<3?{...w,artist:'Same',artistIdentity:'de:Same'}:w),counts=Object.fromEntries(pool.slice(3).map(w=>[w.id,1]));
  const state=c.newState(pool,null,rng(3),false,counts);assert.equal(state.ids.filter(id=>!counts[id]).length,1);assert.equal(new Set(state.ids.map(id=>pool.find(w=>w.id===id).artist)).size,7);
});
test('partial/failed images and prefetched rooms do not consume unseen works',()=>{
  const pool=works(21),state=c.newState(pool,null,rng(1),false,{}),history=shown(h.fresh(),state,pool,[0,1]);
  assert.deepEqual(Object.keys(h.encounterCounts(history)).sort(),[state.ids[0],state.ids[1]].sort());
  assert.equal(h.track(history,state,pool,{shownId:'hero-only'}),history);
  c.newState(pool,state,rng(2),false,h.encounterCounts(history));assert.equal(Object.keys(h.encounterCounts(history)).length,2);
});
test('a checked imitation counts its source for rotation without claiming its original was viewed',()=>{
  const pool=works(7),state=c.newState(pool,null,rng(1),false,{});let history=shown(h.fresh(),state,pool,[0,1,2,3,4,5]);
  history.rooms[0].checks=[Array(7).fill(31)];assert.equal(h.encounterCounts(history)[state.ids[6]],1);
  assert.equal(h.summarize(history,[state.ids[6]],'other')[0].encounters,0);
  assert.equal(history.rooms[0].seen,63);
});
test('every runtime generation path uses the same persisted history and import invalidates prefetched rooms',()=>{
  const js=fs.readFileSync(require.resolve('../scripts/kunsttresor.js'),'utf8');assert.equal((js.match(/core\.newState\(/g)||[]).length,1);assert.match(js,/history\.encounterCounts\(workHistory\)/);
  const importer=js.slice(js.indexOf('function confirmImport'),js.indexOf('function confirmImport')+6000);assert.match(importer,/upcomingRoom=null;[\s\S]*workHistory=mergedHistory/);
});
test('the complete archive progresses through every least-seen tier, including strongly correlated remaining categories',()=>{
  const pool=require('../data/kunstarchiv.json').works,counts={},random=rng(999);let state=null;
  for(let i=0;i<450;i++){
    const minimum=Math.min(...pool.map(w=>counts[w.id]||0));state=c.newState(pool,state,random,false,counts);
    assert.ok(state.ids.some(id=>(counts[id]||0)===minimum),'each room makes progress through the least-seen tier');
    for(const id of state.ids)counts[id]=(counts[id]||0)+1;
  }
  assert.equal(Object.keys(counts).length,pool.length);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../scripts/kunsttresor-core.js');
const progress = require('../scripts/kunsttresor-progress.js');
const transfers = require('../scripts/kunsttresor-save.js');
const archive = require('../data/kunstarchiv.json');
const pool = archive.works;
function seeded(seed) { return () => { seed = (Math.imul(1664525,seed)+1013904223)>>>0; return seed/4294967296; }; }
function room(seed = 7, previous = null) { return {...core.newState(pool,previous,seeded(seed)),roomToken:progress.token(),runToken:previous?.runToken || progress.token(),parentRoomToken:previous?.phase === 'unlocked' ? previous.roomToken : previous?.parentRoomToken || null}; }
function answer(state, right = true) {
  for (const field of core.fields) for (const id of state.ids) state=core.choose(state,id,field,'');
  for (const field of core.fields) for (let i=0;i<4;i++) state=core.choose(state,state.ids[i],field,pool.find(work=>work.id===state.ids[right?i:(i+1)%4])[field]);
  return state;
}
function won(seed = 7, depth = 1) { let state=room(seed);state.escaped=depth-1;return core.inspect(answer(state),pool).state; }
function payload(state = won(), profile = null) {
  profile = profile || progress.recordWin(progress.fresh(),state,pool).profile;
  return {app:transfers.APP,version:1,savedAt:Date.now(),state,best:Math.max(state?.escaped||0,profile.record),progress:profile};
}
const validate = input => transfers.validate(input,pool,archive.replacements||[],core,progress);
test('twelve badges have explicit tiers and criteria; accuracy and successful correction are rewarded',()=>{
  assert.equal(progress.badges.length,12);
  assert.equal(progress.collection(progress.fresh()).filter(badge=>badge.earned).length,0);
  const first=progress.recordWin(progress.fresh(),won(),pool);
  assert.deepEqual(first.earned.map(badge=>badge.id),['first-door','clear-eye']);
  let state=room(17); state=core.inspect(answer(state,false),pool).state;
  assert.equal(progress.recordWin(first.profile,state,pool).profile,first.profile);
  state=core.inspect(answer(state),pool).state;
  const corrected=progress.recordWin(first.profile,state,pool);
  assert.equal(corrected.profile.events.at(-1).corrected,true);
  assert.ok(corrected.earned.some(badge=>badge.id==='second-look'));
  assert.equal(progress.statistics(corrected.profile).wins,2);
});
test('incomplete, failed and fake successes never earn badges; no invented first check',()=>{
  const fresh=progress.fresh(), initial=room();
  assert.equal(progress.recordWin(fresh,initial,pool).profile,fresh);
  const fake={...initial,phase:'unlocked',attempts:1,escaped:1};
  assert.equal(progress.recordWin(fresh,fake,pool).profile,fresh);
  const old={...won(),attempts:2,attemptLog:undefined};
  assert.equal(progress.recordWin(fresh,old,pool).profile.events[0].corrected,false);
  assert.equal(progress.recordWin(fresh,old,pool).profile.events[0].first,false);
});
test('winning once, reloading and repeatedly merging a file never double-count a room',()=>{
  const state=won(), first=progress.recordWin(progress.fresh(),state,pool).profile;
  const restored=progress.restore(JSON.parse(JSON.stringify(first)));
  assert.equal(progress.recordWin(restored,state,pool).profile,restored);
  assert.equal(progress.merge(restored,first).events.length,1);
  assert.equal(progress.merge(progress.merge(first,restored),restored).events.length,1);
  const replay=core.inspect(answer({...room(),roomToken:state.roomToken}),pool).state;
  assert.equal(progress.recordWin(restored,replay,pool).profile.events.length,1);
});
test('different round identities count separately and earned badges survive a new round',()=>{
  let profile=progress.fresh();
  for (let n=1;n<=25;n++) profile=progress.recordWin(profile,won(n+15,n),pool).profile;
  const ids=progress.collection(profile).filter(badge=>badge.earned).map(badge=>badge.id);
  assert.ok(ids.includes('twenty-five-doors') && ids.includes('five-firsts'));
  assert.ok(!ids.includes('hundred-rooms') && !ids.includes('five-hundred'));
  assert.ok(progress.statistics(profile).styles>=12);
  assert.deepEqual(progress.restore(JSON.parse(JSON.stringify(profile))),profile);
  assert.ok(progress.collection(progress.fresh(25)).find(badge=>badge.id==='twenty-five-doors').earned,'known legacy records count without inventing wins');
  assert.equal(progress.statistics(progress.fresh(10)).wins,0);
});
test('Meisterblick requires 25 consecutive first-check wins in one connected round, not 25 isolated wins',()=>{
  let profile=progress.fresh(), state=null;
  for (let n=1;n<=25;n++) {
    state=core.inspect(answer(room(300+n,state)),pool).state;
    const result=progress.recordWin(profile,state,pool);profile=result.profile;
    assert.equal(progress.statistics(profile).perfectStreak,n);
    assert.equal(result.earned.some(badge=>badge.id==='master-eye'),n===25);
  }
  assert.ok(progress.collection(profile).find(badge=>badge.id==='master-eye').earned);
  assert.equal(progress.statistics(progress.merge(profile,profile)).perfectStreak,25);
  let separate=progress.fresh();
  for(let n=0;n<30;n++) separate=progress.recordWin(separate,won(500+n),pool).profile;
  assert.equal(progress.statistics(separate).perfectStreak,1);
  assert.ok(!progress.collection(separate).find(badge=>badge.id==='master-eye').earned);
});
test('a second-check win breaks the perfect series but cannot revoke any earned badge',()=>{
  let profile=progress.fresh(), state=null;
  for(let n=1;n<=26;n++) {
    let next=room(600+n,state);
    if(n===13) next=core.inspect(answer(next,false),pool).state;
    state=core.inspect(answer(next),pool).state;
    profile=progress.recordWin(profile,state,pool).profile;
  }
  assert.equal(progress.statistics(profile).perfectStreak,13);
  assert.ok(!progress.collection(profile).find(badge=>badge.id==='master-eye').earned);
  for(let n=27;n<=38;n++) {state=core.inspect(answer(room(600+n,state)),pool).state;profile=progress.recordWin(profile,state,pool).profile;}
  assert.equal(progress.statistics(profile).perfectStreak,25);
  let next=core.inspect(answer(room(700,state),false),pool).state;
  next=core.inspect(answer(next),pool).state;profile=progress.recordWin(profile,next,pool).profile;
  assert.ok(progress.collection(profile).find(badge=>badge.id==='master-eye').earned);
});
test('the lifetime master badge is unavailable at 499 and awarded exactly at 500 wins',()=>{
  let profile=progress.fresh();
  for(let n=1;n<=500;n++) {
    const result=progress.recordWin(profile,won(900+n),pool);profile=result.profile;
    if(n===499) assert.ok(!progress.collection(profile).find(badge=>badge.id==='five-hundred').earned);
    if(n===500) assert.deepEqual(result.earned.map(badge=>badge.id),['five-hundred']);
  }
});
test('combining branches does not concatenate unrelated perfect series',()=>{
  let state=core.inspect(answer(room(1600)),pool).state;
  const shared=progress.recordWin(progress.fresh(),state,pool).profile;
  let a=shared,b=shared, left=state,right=state;
  for(let n=2;n<=13;n++) {
    left=core.inspect(answer(room(1600+n,left)),pool).state;a=progress.recordWin(a,left,pool).profile;
    right=core.inspect(answer(room(1800+n,right)),pool).state;b=progress.recordWin(b,right,pool).profile;
  }
  const merged=progress.merge(a,b);
  assert.equal(merged.events.length,25);assert.equal(progress.statistics(merged).perfectStreak,13);
  assert.ok(!progress.collection(merged).find(badge=>badge.id==='master-eye').earned);
});
test('a saved connected series continues after transfer; technical replacement retains its parent',async()=>{
  let state=null, profile=progress.fresh();
  for(let n=0;n<12;n++){state=core.inspect(answer(room(1900+n,state)),pool).state;profile=progress.recordWin(profile,state,pool).profile;}
  const playing=room(2000,state), restored=validate(await transfers.decode(await transfers.encode(payload(playing,profile))));
  assert.equal(restored.state.runToken,playing.runToken);assert.equal(restored.state.parentRoomToken,state.roomToken);
  assert.equal(progress.statistics(restored.progress).perfectStreak,12);
  const wonAgain=core.inspect(answer(restored.state),pool).state;
  const continued=progress.recordWin(restored.progress,wonAgain,pool).profile;
  assert.equal(progress.statistics(continued).perfectStreak,13);
  const technical=core.newState(pool,playing,seeded(2100));
  assert.equal(technical.runToken,playing.runToken);assert.equal(technical.parentRoomToken,playing.parentRoomToken);
});
test('cyclic parents and conflicting imported round identities cannot forge a perfect series',()=>{
  const state=won(), profile=progress.recordWin(progress.fresh(),state,pool).profile;
  const event=profile.events[0];
  assert.equal(progress.restore({...profile,events:[{...event,parentRoomToken:event.id}]}),null);
  const badChild={...event,id:progress.token(),runToken:progress.token(),parentRoomToken:event.id,depth:2};
  const separate=progress.restore({version:1,record:2,events:[badChild]});
  assert.ok(separate);
  assert.throws(()=>progress.merge(profile,separate),/widersprüchliche/);
});
test('profiles reject duplicates, impossible counters, future dates and contradictory replay events',()=>{
  const profile=progress.recordWin(progress.fresh(),won(),pool).profile;
  for (const input of [null,{}, {...profile,record:-1}, {...profile,record:Infinity}, {...profile,events:[profile.events[0],profile.events[0]]}, {...profile,events:[{...profile.events[0],first:true,corrected:true}]}, {...profile,events:[{...profile.events[0],at:Date.now()+600000}]}, {...profile,events:[{...profile.events[0],depth:3}]}]) assert.equal(progress.restore(input),null);
  assert.throws(()=>progress.merge(profile,{...profile,events:[{...profile.events[0],first:false}]}),/widersprüchliche/);
});
test('AES-GCM JSON is opaque, nondeterministic, portable and losslessly preserves Unicode',async()=>{
  const input=payload(), a=await transfers.encode(input), b=await transfers.encode(input);
  assert.notEqual(a,b); assert.equal(JSON.parse(a).protection,'AES-256-GCM');
  for (const plain of ['escaped','choices','attemptLog',input.state.ids[0],input.state.options.artist[0]]) assert.ok(!a.includes(plain));
  assert.deepEqual(await transfers.decode(a),input);
  assert.equal(validate(await transfers.decode(a)).state.phase,'unlocked');
  assert.deepEqual(validate(await transfers.decode(a)).progress,input.progress);
});
test('edited ciphertext, IV, tag, format or version are rejected before replacing anything',async()=>{
  const text=await transfers.encode(payload()), envelope=JSON.parse(text);
  const flip=value=>(value[0]==='A'?'B':'A')+value.slice(1);
  await assert.rejects(()=>transfers.decode(JSON.stringify({...envelope,data:flip(envelope.data)})),/verändert|beschädigt/);
  await assert.rejects(()=>transfers.decode(JSON.stringify({...envelope,iv:flip(envelope.iv)})),/verändert|beschädigt/);
  for (const changed of [{...envelope,version:2},{...envelope,app:'other'},{...envelope,data:'?'},{...envelope,extra:'ignored?'},{...envelope,iv:''}]) await assert.rejects(()=>transfers.decode(JSON.stringify(changed)));
  await assert.rejects(()=>transfers.decode('{broken'),/JSON/);
  await assert.rejects(()=>transfers.decode(' '.repeat(transfers.MAX_FILE_BYTES+1)),/groß/);
});
test('large legitimate authenticated files do not overflow base64 decoding',async()=>{
  const input={text:'ÄÖÜß'.repeat(150000)}, encoded=await transfers.encode(input);
  assert.deepEqual(await transfers.decode(encoded),input);
});
test('playing, revised, won and lost states retain attempts, review and curator history on import',async()=>{
  const initial=room(), failed=core.inspect(answer(initial,false),pool).state;
  const revised=answer(failed), lost=core.inspect(failed,pool).state, success=core.inspect(revised,pool).state;
  for (const state of [initial,failed,revised,lost,success]) {
    const input=payload(state,progress.fresh(state.escaped));
    const restored=validate(await transfers.decode(await transfers.encode(input))).state;
    assert.equal(restored.attempts,state.attempts); assert.equal(restored.phase,state.phase);
    assert.deepEqual(restored.choices,Object.fromEntries(state.ids.map(id=>[id,state.choices[id]||{}])));
    assert.deepEqual(restored.attemptLog,state.attemptLog);
    if (state.phase!=='playing') assert.equal(core.inspect(restored,pool).checked,false);
  }
  assert.equal(validate(payload(null,progress.fresh(5))).state,null);
});
test('structural checks reject forged counters, unknown works/styles and invalid terminal state',()=>{
  const input=payload();
  for (const change of [{...input,best:Infinity},{...input,best:-1},{...input,best:0},{...input,state:{...input.state,ids:['not-a-work']}},{...input,state:{...input.state,roomToken:'<script>'}},{...input,state:{...input.state,recent:Array(25).fill('a')}},{...input,state:{...input.state,attempts:0}}]) assert.throws(()=>validate(change));
  assert.throws(()=>validate({...input,progress:{...input.progress,events:[{...input.progress.events[0],styles:['unknown','b','c','d']}]}}),/Werkarchiv/);
  const clean=validate({...input,state:{...input.state,unexpected:'must be removed'}}).state;
  assert.equal(clean.unexpected,undefined);
});
test('import combines records and badges only after confirmation; failed storage rolls back',()=>{
  const script=fs.readFileSync(require.resolve('../scripts/kunsttresor.js'),'utf8');
  const saved=won();
  for(const withGallery of [false,true]) {
  const candidate=validate({...payload(saved),...(withGallery?{gallery:require('../scripts/kunsttresor-gallery.js').fresh()}:{})});
  for (const fail of [false,'progress','history',...(withGallery?['gallery']:[])]) {
    const values=new Map([['game','old-round'],['best','5'],['progress','old-progress'],['history','old-history'],['gallery','old-gallery']]), nodes=new Map();
    const original=room(90), local=progress.fresh(5);
    const history=require('../scripts/kunsttresor-history.js');
    const galleryModel=require('../scripts/kunsttresor-gallery.js');
    const context={galleryModel,personalGallery:galleryModel.fresh(),galleryKey:'gallery',galleryBlocked:false,galleryUI:null,pendingImport:candidate,transferBusy:false,progress,playerProgress:local,history,workHistory:history.fresh(),historyBlocked:false,aiClient:{clear:()=>{}},state:original,best:5,keys:{game:'game',best:'best',progress:'progress',history:'history'},
      store:{get:key=>values.get(key)||null,remove:key=>values.delete(key),set:(key,value)=>{if(fail&&key===fail&&value!=='old-'+fail)return false;values.set(key,value);return true;}},
      localStorage:{removeItem:key=>values.delete(key)},$:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);},finishIntro:()=>{},close:()=>{},refreshBadges:()=>{},refreshHistory:()=>{},render:()=>{},toGame:()=>{}};
    context.pool=pool;
    vm.createContext(context);
    vm.runInContext(script.slice(script.indexOf('function confirmImport()'),script.indexOf('function open(')),context);
    assert.equal(context.state,original);
    vm.runInContext('confirmImport()',context);
    if(fail){assert.equal(context.state,original);assert.equal(context.best,5);assert.equal(values.get('game'),'old-round');assert.equal(values.get('progress'),'old-progress');assert.equal(values.get('history'),'old-history');assert.match(nodes.get('save-status').textContent,/nicht dauerhaft/);}
    else{assert.equal(context.state,candidate.state);assert.equal(context.best,5);assert.equal(context.playerProgress.events.length,1);assert.equal(context.playerProgress.record,5);assert.equal(context.pendingImport,null);}
    if(fail || !withGallery)assert.equal(values.get('gallery'),'old-gallery');
    else assert.deepEqual(JSON.parse(values.get('gallery')),candidate.gallery);
  }
  }
});

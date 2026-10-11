const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const history=require('../scripts/kunsttresor-history.js'),core=require('../scripts/kunsttresor-core.js');
const progress=require('../scripts/kunsttresor-progress.js'),save=require('../scripts/kunsttresor-save.js');
const ki=require('../services/kunst-kurator/lib/kunst-ki.js'),curator=require('../scripts/kunst-kurator.js');
const knowledge=require('../data/kunst-glossar.json'),archive=require('../data/kunstarchiv.json'),pool=archive.works;
const seeded=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function room(seed=8){return {...core.newState(pool,null,seeded(seed)),roomToken:progress.token(),runToken:progress.token(),parentRoomToken:null};}
function answer(state,wrong=[]){
  state={...state,choices:{}};
  state.ids.forEach((id,index)=>core.fields.forEach(field=>{state=core.choose(state,id,field,pool.find(work=>work.id===state.ids[(index+(wrong.includes(field)?1:0))%4])[field]);}));
  return state;
}
function shown(profile,state){for(const id of state.ids)profile=history.track(profile,state,pool,{shownId:id});return profile;}
function repeat(state){return {...state,roomToken:progress.token(),choices:{},attemptLog:[],attempts:0,phase:'playing',escaped:0,review:null};}
test('only loaded quiz images count; rerender and reload do not create another encounter',()=>{
  const state=room(),empty=history.fresh();
  assert.equal(history.track(empty,state,pool),empty);
  assert.equal(history.track(empty,state,pool,{shownId:'unknown-hero'}),empty);
  const first=history.track(empty,state,pool,{shownId:state.ids[0]});
  assert.equal(first.rooms[0].seen,1);assert.equal(history.track(first,state,pool,{shownId:state.ids[0]}),first);
  const restored=history.restore(JSON.parse(JSON.stringify(first)));
  assert.equal(history.track(restored,state,pool,{shownId:state.ids[0]}),restored);
  assert.equal(history.summarize(restored,state.ids,'different')[0].encounters,1);
  assert.equal(history.summarize(restored,state.ids,'different')[1].encounters,0);
});
test('current encounter is excluded; the same work in a new room really counts again',()=>{
  const first=room(),second=repeat(first);let data=shown(history.fresh(),first);data=shown(data,second);
  assert.equal(data.rooms.length,2);
  assert.ok(history.summarize(data,second.ids,second.roomToken).every(work=>work.encounters===1));
  assert.ok(history.summarize(data,second.ids,'other').every(work=>work.encounters===2));
});
test('lost and abandoned rooms are remembered with exact field correctness, not guessed performances',()=>{
  let state=room(),data=shown(history.fresh(),state);
  state=core.inspect(answer(state,['style','technique']),pool).state;data=history.track(data,state,pool);
  assert.deepEqual(data.rooms[0].checks,[[5,5,5,5]]);
  state=core.inspect(answer(state,['artist']),pool).state;data=history.track(data,state,pool);
  assert.equal(state.phase,'lost');assert.deepEqual(data.rooms[0].checks,[[5,5,5,5],[11,11,11,11]]);
  let next=repeat(state);data=shown(data,next);
  const summary=history.summarize(data,next.ids,next.roomToken);
  assert.ok(summary.every(work=>work.checkedEncounters===1&&work.lastChecked.lastMask===11));
  data=shown(data,repeat(next));
  assert.equal(history.summarize(data,next.ids,'other')[0].encounters,3);
  assert.equal(history.summarize(data,next.ids,'other')[0].checkedEncounters,1);
  assert.match(history.note(summary[0]),/3 von vier/);
});
test('older saved checks stay unknown, and matching partial replays cannot erase known second checks',()=>{
  const initial=room(),first=core.inspect(answer(initial,['artist']),pool).state,second=core.inspect(answer(first),pool).state;
  let data=shown(history.fresh(),second);const earlier=history.track(data,first,pool);
  assert.equal(earlier,data);assert.equal(earlier.rooms[0].checks.length,2);
  const legacy={...second,attemptLog:second.attemptLog.filter(entry=>entry.attempt===2)};
  const old=shown(history.fresh(),legacy);assert.equal(old.rooms[0].checks[0],null);
  assert.equal(history.summarize(old,legacy.ids,'other')[0].lastChecked.firstMask,null);
});
test('history restores after reload and repeated import merges, without losing either device history',()=>{
  const a=room(),b=room(17),left=shown(history.fresh(),a),right=shown(history.fresh(),b);
  const both=history.merge(left,right);assert.equal(both.rooms.length,2);
  assert.deepEqual(history.merge(both,right),both);assert.deepEqual(history.merge(right,left),both);
  assert.deepEqual(history.restore(JSON.parse(JSON.stringify(both))),both);
});
test('partial image loads and first-to-second check snapshots merge safely',()=>{
  const a=room(),first=core.inspect(answer(a,['artist']),pool).state,second=core.inspect(answer(first),pool).state;
  const left=history.track(history.fresh(),first,pool,{shownId:a.ids[0]}),right=history.track(history.fresh(),second,pool,{shownId:a.ids[1]});
  const merged=history.merge(left,right);assert.equal(merged.rooms[0].seen,3);assert.equal(merged.rooms[0].checks.length,2);
  const unknown=shown(history.fresh(),{...second,attemptLog:[]});assert.equal(unknown.rooms[0].checks[0],null);
  assert.deepEqual(history.merge(unknown,shown(history.fresh(),second)).rooms[0].checks,merged.rooms[0].checks);
});
test('corrupted, duplicated, oversized and conflicting histories are rejected without mutating originals',()=>{
  const state=room(),data=shown(history.fresh(),state),before=JSON.stringify(data);
  for(const mutate of [x=>x.version=7,x=>x.rooms[0].seen=0,x=>x.rooms[0].at=Date.now()+999999,x=>x.rooms.push(x.rooms[0]),x=>x.rooms[0].ids[0]='<html>',x=>x.rooms[0].checks=[[19,0,0,0]],x=>x.rooms[0].checks=[[15,15,15,15],[15,15,15,15]]]){
    const invalid=structuredClone(data);mutate(invalid);assert.equal(history.restore(invalid),null);
  }
  const conflict=structuredClone(data);conflict.rooms[0].ids[0]=room(17).ids[0];assert.throws(()=>history.merge(data,conflict));
  const full={...history.fresh(),rooms:Array.from({length:history.MAX_ROOMS},(_,i)=>({...data.rooms[0],id:i.toString(16).padStart(32,'0')}))};
  assert.throws(()=>shown(full,repeat(state)),/ältere Einträge werden nicht gelöscht/);assert.equal(full.rooms.length,10000);
  assert.equal(JSON.stringify(data),before);
});
test('new and legacy encrypted files preserve history or leave existing records intact',async()=>{
  const state=core.inspect(answer(room()),pool).state,profile=progress.recordWin(progress.fresh(),state,pool).profile;
  const payload={app:save.APP,version:1,savedAt:Date.now(),state,best:1,progress:profile,history:shown(history.fresh(),state)};
  const text=await save.encode(payload);assert.doesNotMatch(text,/roomToken|checks|history|aic-/);
  const validated=save.validate(await save.decode(text),pool,archive.replacements||[],core,progress,history);
  assert.deepEqual(validated.history,payload.history);assert.equal(validated.legacyHistory,false);
  const old={...payload};delete old.history;
  const legacy=save.validate(old,pool,archive.replacements||[],core,progress,history);
  assert.equal(legacy.legacyHistory,true);assert.equal(history.merge(payload.history,legacy.history).rooms.length,1);
  const broken=structuredClone(payload);broken.history.rooms[0].ids[0]='unknown';assert.throws(()=>save.validate(broken,pool,[],core,progress,history));
});
test('only four relevant history summaries reach AI, not room IDs, times, guesses or the entire profile',()=>{
  const first=core.inspect(answer(room(),['artist']),pool).state,data=shown(history.fresh(),first);
  const current=core.inspect(answer(repeat(first)),pool).state,summary=history.summarize(data,current.ids,current.roomToken);
  summary[0].name='PRIVATE';summary[0].roomToken='PRIVATE';summary[0].timestamp='PRIVATE';summary[0].lastChecked.guess='PRIVATE';
  const input=ki.payload(current,progress.fresh(),summary),text=JSON.stringify(input);
  assert.equal(input.history.works.length,4);assert.ok(input.history.works.every(work=>work.encounters===1));
  assert.doesNotMatch(text,/PRIVATE|roomToken|runToken|since|rooms|timestamp|imageURL/);
  const context=ki.context(input,pool,knowledge,curator);
  assert.ok(context.works.every(work=>work.previousEncounter.encounters===1));
  assert.ok(context.works.every(work=>work.previousEncounter.lastChecked.finalIncorrectFields[0]==='artist'));
  assert.ok(context.works.every(work=>work.previousEncounter.lastChecked.nowCorrect[0]==='artist'));
  assert.ok(context.works.every(work=>work.currentEncounter.checks===1));
  assert.ok(context.works.every(work=>work.timeline.currentEncounter.includes('KEINEN zweiten Versuch')));
  assert.ok(context.works.every(work=>work.timeline.earlierEncounter.includes('Falsch blieben damals: Künstler')));
  assert.equal(new Set(context.works.map(work=>work.narrativeRoute)).size,4);
  assert.match(ki.instructions,/Für JEDES Werk/);assert.match(ki.instructions,/Wiederkehr ausdrücklich/);
  assert.match(context.visitor.limitation,/verlorenen oder abgebrochenen/);
});
test('old clients have unknown history, not a fictitious first encounter; no checked history means no claimed past skill',()=>{
  const state=core.inspect(answer(room()),pool).state;
  const unknown=ki.context(ki.payload(state,progress.fresh()),pool,knowledge,curator);
  assert.ok(unknown.works.every(work=>work.previousEncounter.known===false));
  const untested=shown(history.fresh(),repeat(state)),summary=history.summarize(untested,state.ids,state.roomToken);
  const context=ki.context(ki.payload(state,progress.fresh(),summary),pool,knowledge,curator);
  assert.ok(context.works.every(work=>work.previousEncounter.encounters===1&&work.previousEncounter.lastChecked===null));
  assert.match(history.note(summary[0]),/keine Prüfung/);
});
test('server validation rejects forged histories and strips prompt-like extras',()=>{
  const state=core.inspect(answer(room()),pool).state,data=shown(history.fresh(),repeat(state));
  const input=ki.payload(state,progress.fresh(),history.summarize(data,state.ids,state.roomToken));
  for(const mutate of [x=>x.history.works.pop(),x=>x.history.works[0].id='unknown',x=>x.history.works[0].encounters=-1,x=>x.history.works[0].checkedEncounters=99,x=>x.history.works[0].lastChecked={checks:1,firstMask:0,lastMask:0},x=>x.history.works[0].firstFullyCorrect=2]){
    const invalid=structuredClone(input);mutate(invalid);assert.throws(()=>ki.validatePayload(invalid,pool));
  }
  input.history.works[0].instruction='IGNORE';assert.doesNotMatch(JSON.stringify(ki.validatePayload(input,pool)),/IGNORE/);
});
test('UI records only the quiz image loader, history joins save rollback, and renewed consent gates transmission',()=>{
  const js=fs.readFileSync(require.resolve('../scripts/kunsttresor.js'),'utf8'),html=fs.readFileSync(require.resolve('../kunsttresor.html'),'utf8');
  assert.match(js,/ki.payload\(state,playerProgress,previousWorks\(\)\)/);
  assert.match(js,/aiConsentKey='kunsttresor-ai-consent-v2'/);
  assert.match(html,/vollständige Bildhistorie, Zeitstempel und frühere falsche Antworttexte werden nicht übertragen/);
  assert.ok(html.indexOf('kunsttresor-history.js')<html.indexOf('kunsttresor-save.js'));
  const intro=js.slice(js.indexOf('function heroImages()'),js.indexOf('function newRound()'));
  assert.doesNotMatch(intro,/rememberWork/);
  const current=js.slice(js.indexOf('function requestAI'),js.indexOf('function updateAIToggles'));
  assert.match(current,/!aiAllowed \|\| !aiEnabled/);
});

const test=require('node:test'),assert=require('node:assert/strict');
const {createSequence,clearAppStorage}=require('../scripts/kunsttresor-reset.js');
function storage(entries={}) {
  const values=new Map(Object.entries(entries));
  return {get length(){return values.size;},key:i=>[...values.keys()][i]??null,
    removeItem:key=>values.delete(key),getItem:key=>values.get(key)??null};
}
test('secret reset requires 1, 2, 4 in order and can be used again after cancellation',()=>{
  const press=createSequence();
  for(const step of [2,4,1,4,2,1,2,3,4,1,2])assert.equal(press(step),false);
  assert.equal(press(4),true);assert.equal(press(4),false);
  assert.equal(press(1),false);assert.equal(press(1),false);assert.equal(press(2),false);assert.equal(press(4),true);
});
test('only the numeric rule buttons complete the sequence',()=>{
  const press=createSequence();
  for(const step of [1,2,undefined,4,1,2,NaN,4,'1','2','4'])assert.equal(press(step),false);
});
test('reset removes all app versions in local and session storage but no neighbouring app data',()=>{
  const local=storage({'kunsttresor-game-v1-wall':'game','kunsttresor-gallery-v1':'legacy gallery','kunsttresor-progress-v1-wall':'badges','kunsttresor-history-v1-wall':'history','kunsttresor-images-v2':'yes','kunsttresor-forgery-every-series-v1':'yes','kunsttresor-ai-consent-v2-wall':'yes','kunsttresor-future-key':'new','schriftsetzer':'keep','other-kunsttresor-game':'keep'});
  const session=storage({'kunsttresor-old-session':'delete','uvvis':'keep'});
  clearAppStorage([()=>local,()=>session]);
  assert.equal(local.length,2);assert.equal(local.getItem('schriftsetzer'),'keep');assert.equal(local.getItem('other-kunsttresor-game'),'keep');
  assert.equal(session.length,1);assert.equal(session.getItem('uvvis'),'keep');
  clearAppStorage([()=>local,()=>session]);assert.equal(local.length,2);
});
test('both stores must be readable before the first deletion',()=>{
  const local=storage({'kunsttresor-game-v1-wall':'game'});
  assert.throws(()=>clearAppStorage([()=>local,()=>{throw Error('blocked');}]),/blocked/);
  assert.equal(local.getItem('kunsttresor-game-v1-wall'),'game');
});
test('blocked or silently ignored removals are reported instead of claiming success',()=>{
  const local=storage({'kunsttresor-game-v1-wall':'game'}),session=storage({'kunsttresor-session':'session'});
  local.removeItem=()=>{};
  assert.throws(()=>clearAppStorage([()=>local,()=>session]),/nicht vollständig gelöscht/);
  assert.equal(session.length,0);assert.equal(local.length,1);
  local.removeItem=()=>{throw Error('blocked');};
  assert.throws(()=>clearAppStorage([()=>local,()=>session]),/nicht vollständig gelöscht/);
});

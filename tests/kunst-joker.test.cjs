const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const sandbox=vm.createContext({KunstWallEnabled:true});
vm.runInContext(read('scripts/kunsttresor-core.js'),sandbox);const core=sandbox.KunstTresor;
const archive=require('../data/kunstarchiv.json').works,knowledge=require('../data/kunst-glossar.json');
const curator=require('../scripts/kunst-kurator.js'),ki=require('../services/kunst-kurator/lib/kunst-ki.js');
const works=archive.slice(0,7).map((w,i)=>({...w,id:'joker-'+i,title:'Titel '+i,artist:'Künstler '+i,artistIdentity:'test:'+i,date:'Jahr '+i,style:'Stil '+i,technique:i<3?'Öl auf Leinwand':i<5?'Aquarell':'Holzschnitt'}));
const plain=value=>JSON.parse(JSON.stringify(value)),byId=id=>works.find(w=>w.id===id);
function fill(state,offset=0){
 for(const field of core.fieldsFor(state))for(const id of state.ids)state=core.choose(state,id,field,'');
 for(const [i,id]of state.ids.entries())for(const field of core.fieldsFor(state))state=core.choose(state,id,field,byId(field==='technique'?id:state.ids[(i+offset)%7])[field]);
 return state;
}
test('a joker solves all five fields and the image mark atomically without consuming a check',()=>{
 let state=core.newState(works),id=state.ids[0],other=state.ids[1];assert.equal(state.joker,1);
 state=core.choose(state,other,'artist',byId(id).artist);state.forgery={id,image:'data:image/jpeg;base64,/9j/'};
 const before=plain(state),next=core.useJoker(state,id,works);
 for(const field of core.fieldsFor(state))assert.equal(next.choices[id][field],byId(id)[field]);
 assert.equal(next.choices[other].artist,'');assert.equal(next.forgeryMarks[id],true);assert.equal(next.joker,0);assert.deepEqual(plain(next.jokerUsed),[id]);
 assert.equal(next.attempts,0);assert.equal(next.attemptLog,state.attemptLog);assert.deepEqual(plain(state),before);assert.ok(core.restore(plain(next),works));
 assert.equal(core.useJoker(next,other,works),next);assert.equal(core.useJoker({...state,phase:'lost'},id,works).phase,'lost');
});
test('joker transfers a full repeated-technique quota only from an incorrect owner',()=>{
 let state=core.newState(works);const target=works[0].id,right=works[1].id,right2=works[2].id,wrong=works[3].id;
 for(const id of [right,right2,wrong])state=core.choose(state,id,'technique','Öl auf Leinwand');
 state=core.useJoker(state,target,works);
 assert.equal(state.choices[right].technique,'Öl auf Leinwand');assert.equal(state.choices[right2].technique,'Öl auf Leinwand');assert.equal(state.choices[wrong].technique,'');assert.equal(state.choices[target].technique,'Öl auf Leinwand');assert.equal(core.remaining(state,'technique','Öl auf Leinwand'),0);
});
test('wrong answers are released per image, accumulate after the second check and survive restoration',()=>{
 let state=core.newState(works);const id=state.ids[0],first=byId(state.ids[1]).artist,second=byId(state.ids[2]).artist;
 state=core.inspect(fill(state,1),works).state;assert.equal(state.attempts,1);assert.equal(state.choices[id].artist,'');assert.equal(state.choices[id].technique,byId(id).technique);
 assert.equal(core.isExcluded(state,id,'artist',first),true);assert.equal(core.choose(state,id,'artist',first),state);
 const firstSnapshot=plain(state.attemptLog[0]);state=core.inspect(fill(state,2),works).state;assert.equal(state.attempts,2);
 assert.deepEqual(plain(state.excluded[id].artist),[first,second]);assert.deepEqual(plain(state.attemptLog[0]),firstSnapshot);
 const restored=core.restore(plain(state),works);assert.deepEqual(plain(restored.excluded),plain(state.excluded));assert.equal(core.choose(restored,id,'artist',first),restored);
 const other=state.ids[3];assert.equal(core.isExcluded(state,other,'artist',first),false);
 const invalidTransfer=core.transferChoice(state,id,'artist',first,other);assert.equal(invalidTransfer,state);
 state=core.inspect(fill(state),works).state;assert.equal(state.phase,'unlocked');assert.equal(core.filled(state),35);assert.deepEqual(plain(state.excluded[id].artist),[first,second]);
});
test('legacy reviews migrate without inventing attempts or losing prior exclusions',()=>{
 let state=core.inspect(fill(core.newState(works),1),works).state;const id=state.ids[0];
 delete state.joker;delete state.jokerUsed;delete state.excluded;
 const restored=core.restore(plain(state),works);assert.equal(restored.joker,1);assert.equal(restored.attempts,1);assert.equal(restored.choices[id].artist,'');assert.equal(restored.excluded[id].artist.length,1);
 assert.equal(core.restore({...plain(state),joker:2},works),null);assert.equal(core.restore({...plain(state),jokerUsed:['missing']},works),null);
});
test('joker refills at 3, 6 and 9 wins, never stacks and cannot be claimed by rechecking',()=>{
 let state=core.newState(works);state=core.useJoker(state,state.ids[0],works);assert.equal(state.joker,0);
 for(let n=1;n<=9;n++){
  state=core.inspect(fill(state),works).state;assert.equal(state.phase,'unlocked');assert.equal(state.escaped,n);
  assert.equal(state.joker,n<3||n===7||n===8?0:1);assert.equal(core.inspect(state,works).checked,false);
  assert.equal(core.restore(plain(state),works).joker,state.joker);
  if(n<9){state=core.newState(works,state);assert.equal(state.jokerUsed.length,0);if(n===6)state=core.useJoker(state,state.ids[0],works);}
 }
});
test('the editorial and AI curator know exactly which work was solved with a joker',()=>{
 let state=core.newState(archive);const id=state.ids[0];state=core.useJoker(state,id,archive);
 for(const field of core.fieldsFor(state))for(const workId of state.ids)state=core.choose(state,workId,field,archive.find(w=>w.id===workId)[field]);
 state=core.inspect(state,archive).state;const work=archive.find(w=>w.id===id),explanation=curator.explain(work,state,knowledge,archive);
 assert.equal(explanation.outcome.jokerUsed,true);assert.match(explanation.opening,/Joker eingesetzt/);assert.equal(explanation.mistake,'');assert.equal(explanation.temporal,'');
 const input=ki.payload(state,{events:[]}),valid=ki.validatePayload(input,archive),context=ki.context(input,archive,knowledge,curator);
 assert.deepEqual(valid.room.jokerUsed,[id]);assert.equal(context.works.find(w=>w.id===id).currentEncounter.jokerUsed,true);assert.match(context.works.find(w=>w.id===id).timeline.currentEncounter,/automatisch gelöst/);
 assert.match(ki.instructions,/Lobe oder tadle diese automatisch gelösten Angaben nicht/);
 assert.throws(()=>ki.validatePayload({...input,room:{...input.room,jokerUsed:['missing']}},archive),/joker/);
 assert.throws(()=>ki.validatePayload({...input,room:{...input.room,jokerUsed:[id,state.ids[1]]}},archive),/joker/);
});
test('forgery commentary never attributes the automatic joker mark to independent recognition',()=>{
 const info={id:'test',jokerUsed:true,firstMarked:true,finalMarked:true,markingCorrect:true};
 assert.match(ki.forgeryComment(info),/automatisch richtig/);assert.match(ki.forgeryComment(info),/nicht selbstständig erkannt/);
});

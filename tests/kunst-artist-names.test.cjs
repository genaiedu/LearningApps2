const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const archive=require('../data/kunstarchiv.json'),wiki=require('../data/kunst-wikipedia.json'),titles=require('../data/kunst-titel-de.json'),knowledge=require('../data/kunst-glossar.json'),ki=require('../services/kunst-kurator/lib/kunst-ki.js'),curator=require('../scripts/kunst-kurator.js');
const scope={KunstWallEnabled:true,URL};vm.runInNewContext(fs.readFileSync(require.resolve('../scripts/kunsttresor-core.js'),'utf8'),scope);const core=scope.KunstTresor;
const oldName='Domenico Theotokópoulos, called El Greco',original=archive.works.map(w=>({...w,titleDe:titles.titles[w.id],artistIdentity:wiki.artists[w.artist].language+':'+wiki.artists[w.artist].title})),pool=original.map(core.normalizeArtistWork);
function oldRoom(){const chosen=[original.find(w=>w.artist===oldName)];for(const w of original)if(chosen.length<7&&core.compatible(chosen,w))chosen.push(w);return core.newState(chosen,null,Math.random,false,{});}
function fill(s){for(const id of s.ids)for(const f of core.fieldsFor(s))s=core.choose(s,id,f,original.find(w=>w.id===id)[f]);return s;}
test('El Greco has one display name for all 24 works without rewriting source records',()=>{
 assert.equal(original.filter(w=>w.artist===oldName).length,3);assert.equal(pool.filter(w=>w.artist==='El Greco').length,24);assert.equal(pool.filter(w=>w.artist===oldName).length,0);
 for(const w of pool.filter(w=>w.artistOriginal===oldName)){assert.equal(w.artist,'El Greco');assert.equal(archive.works.find(x=>x.id===w.id).artist,oldName);}
 const w=core.normalizeArtistWork({artist:oldName,imageCredit:oldName+' (Greek, 1541–1614)'});assert.equal(w.imageCredit,'El Greco (Greek, 1541–1614)');
});
test('old solved saves retain choices, green confirmations, attempts, joker and score after the name migration',()=>{
 const old=core.inspect(fill(oldRoom()),original).state,before=JSON.stringify(old),next=core.restore(old,pool);assert.ok(next);assert.equal(next.phase,'unlocked');assert.equal(next.attempts,old.attempts);assert.equal(next.escaped,old.escaped);assert.equal(next.joker,old.joker);assert.deepEqual([...next.ids],[...old.ids]);assert.equal(JSON.stringify(old),before);
 const id=old.ids.find(id=>original.find(w=>w.id===id).artist===oldName);assert.equal(next.choices[id].artist,'El Greco');assert.equal(next.review.choices[id].artist,'El Greco');assert.equal(next.attemptLog[0].choices[id].artist,'El Greco');assert.equal(next.locked[id].artist,'El Greco');assert.ok(!next.options.artist.includes(oldName));
});
test('incorrect artist exclusions from older attempts are migrated, not reset',()=>{
 let s=fill(oldRoom());const id=s.ids.find(id=>original.find(w=>w.id===id).artist===oldName),other=s.ids.find(x=>x!==id),otherName=original.find(w=>w.id===other).artist;
 s=core.choose(s,id,'artist','');s=core.choose(s,other,'artist','');s=core.choose(s,id,'artist',otherName);s=core.choose(s,other,'artist',oldName);s=core.inspect(s,original).state;
 const next=core.restore(s,pool);assert.ok(next);assert.equal(next.phase,'playing');assert.equal(next.attempts,1);assert.equal(core.isExcluded(next,other,'artist','El Greco'),true);assert.equal(next.options.artist.includes(oldName),false);
});
test('curator accepts legacy payloads but only receives the canonical display name',()=>{
 const state=core.inspect(fill(oldRoom()),original).state,input=ki.payload(state,{events:[]}),checked=ki.validatePayload(input,pool),context=ki.context(input,pool,knowledge,curator),id=state.ids.find(id=>original.find(w=>w.id===id).artist===oldName);
 assert.equal(checked.room.choices[id].artist,'El Greco');assert.equal(context.works.find(w=>w.id===id).artist,'El Greco');assert.ok(!JSON.stringify(context).includes(oldName));
});

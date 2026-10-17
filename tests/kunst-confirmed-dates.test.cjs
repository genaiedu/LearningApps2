const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scope=vm.createContext({KunstWallEnabled:true});vm.runInContext(fs.readFileSync(require.resolve('../scripts/kunsttresor-core.js'),'utf8'),scope);
const c=scope.KunstTresor,archive=require('../data/kunstarchiv.json').works,plain=value=>JSON.parse(JSON.stringify(value));
function works(dates=['1500','1600','1700','1800','1900','2000','2100']) {return archive.slice(0,7).map((w,i)=>({...w,id:'date-test-'+i,title:'Titel '+i,artist:'Maler '+i,artistIdentity:'test-'+i,style:'Stil '+i,date:dates[i],technique:i<3?'Öl':i<5?'Aquarell':'Tempera'}));}
function start(pool){return c.newState(pool,null,()=>.5);}
function fill(state,pool,shift=0,field='artist'){
  for(const f of c.fieldsFor(state))for(const id of state.ids)state=c.choose(state,id,f,'');
  for(const [n,id]of state.ids.entries())for(const f of c.fieldsFor(state))state=c.choose(state,id,f,pool.find(w=>w.id===state.ids[(n+(f===field?shift:0))%7])[f]);
  return state;
}
function checkSwap(pool,a,b){let state=fill(start(pool),pool);const first=pool[a],second=pool[b];state=c.choose(state,first.id,'date','');state=c.choose(state,second.id,'date','');state=c.choose(state,first.id,'date',second.date);state=c.choose(state,second.id,'date',first.date);return c.inspect(state,pool).state;}
test('correct-looking choices stay movable until checked; green answers then lock at the model boundary',()=>{
  const pool=works();let s=fill(start(pool),pool,1),id=s.ids[0],work=pool.find(w=>w.id===id);
  assert.equal(c.isLocked(s,id,'date'),false);s=c.inspect(s,pool).state;assert.equal(s.phase,'playing');assert.equal(c.isLocked(s,id,'date'),true);assert.equal(c.isLocked(s,id,'artist'),false);
  for(const value of ['',...s.options.date])assert.equal(c.choose(s,id,'date',value),s);
  const other=s.ids[1];assert.equal(c.isExcluded(s,other,'date',work.date),true);assert.equal(c.choose(s,other,'date',work.date),s);
  assert.equal(c.transferChoice(s,other,'date',work.date,id),s);
  // A locked target cannot receive an unchecked value either.
  assert.equal(c.transferChoice(s,id,'date',s.options.date.find(v=>v!==work.date),other),s);
});
test('one confirmed technique uses only its share of a repeated quota',()=>{
  const pool=works();let s=start(pool);const a=pool[0].id,b=pool[1].id,d=pool[3].id;
  s=c.useJoker(s,a,pool);assert.equal(c.isLocked(s,a,'technique'),true);assert.equal(c.isExcluded(s,b,'technique','Öl'),false);
  assert.equal(c.remaining(s,'technique','Öl'),2);s=c.choose(s,b,'technique','Öl');assert.equal(s.choices[b].technique,'Öl');
  // All three intended owners confirmed: none of the other works can use it.
  s=c.inspect(fill(s,pool),pool).state;assert.equal(c.confirmedOwners(s,d,'technique','Öl').length,3);assert.equal(c.isExcluded(s,d,'technique','Öl'),true);assert.equal(c.choose(s,d,'technique','Öl'),s);
});
test('joker solutions are green and fixed immediately without consuming a check',()=>{
  const pool=works();let s=start(pool);const id=s.ids[0];s=c.useJoker(s,id,pool);
  assert.equal(s.attempts,0);for(const f of c.fieldsFor(s)){assert.equal(c.isLocked(s,id,f),true);assert.equal(c.choose(s,id,f,''),s);}
  const restored=c.restore(plain(s),pool);assert.deepEqual(plain(restored.locked),plain(s.locked));
});
test('restoring an older moved confirmation reinstates it and frees the conflicting unconfirmed value',()=>{
  const pool=works();let s=c.inspect(fill(start(pool),pool,1),pool).state;const a=s.ids[0],b=s.ids[1],value=s.choices[a].date;
  const old=plain(s);delete old.locked;old.choices[a].date='';old.choices[b].date=value;
  const restored=c.restore(old,pool);assert.ok(restored);assert.equal(restored.choices[a].date,value);assert.equal(restored.choices[b].date,pool.find(w=>w.id===b).date);
  assert.equal(restored.attempts,1);assert.deepEqual(plain(restored.attemptLog),plain(s.attemptLog));
});
test('restoration never overfills a repeated-technique quota when putting an old green value back',()=>{
  const pool=works();let s=fill(start(pool),pool,1);s=c.inspect(s,pool).state;
  const old=plain(s),a=pool[0].id,b=pool[3].id;old.choices[a].technique='Aquarell';old.choices[b].technique='Öl';delete old.locked;
  const restored=c.restore(old,pool);assert.ok(restored);assert.equal(restored.choices[a].technique,'Öl');assert.equal(restored.choices[b].technique,'Aquarell');assert.ok(c.restore(plain(restored),pool));
});
test('unverified saved locks and date hints are ignored instead of trusting imported assertions',()=>{
  const pool=works(),s=start(pool),id=s.ids[0];s.locked={[id]:{artist:pool.find(w=>w.id===id).artist}};s.dateHints={[id]:[{kind:'late',cutoff:1,label:'PRIVATE'}]};s.excluded={[id]:{date:[pool.find(w=>w.id===id).date]}};
  const restored=c.restore(plain(s),pool);assert.deepEqual(plain(restored.locked),{});assert.deepEqual(plain(restored.dateHints),{});assert.deepEqual(plain(restored.excluded),{});
});
test('displayed date parsing covers the complete archive, abbreviations, BCE and separate later changes',()=>{
  for(const w of archive)assert.ok(c.dateWindow(w.date),w.date);
  for(const [label,start,end]of [['1434–35',1434,1435],['ca. 1600–3',1600,1603],['1490/95',1490,1495],['1899–00',1899,1900],['1880s',1880,1889],['um 1391–1353 v. Chr.',-1391,-1353],['40–68 n. Chr.',40,68],['18. Januar 1911',1911,1911],['1906; Druck 1908',1906,1906],['1884–86, Rahmen ergänzt 1888–89',1884,1886],['1855, reworked 1857–59',1855,1855],['Modell 1875–1876',1875,1876]]){
    const actual=c.dateWindow(label);assert.equal(actual.start,start,label);assert.equal(actual.end,end,label);
  }
  assert.equal(c.dateWindow('unbekannt'),null);assert.equal(c.dateWindow('Jahr 1'),null);assert.equal(c.dateWindow('um 1500').start,1500);
});
test('the four time hints distinguish ordering, containment, precision and uncertain overlap',()=>{
  for(const [guess,actual,label]of [['1490','1500–1520','zu früh'],['1530','1500–1520','zu spät'],['1510','1500–1520','zu genau'],['1500','1500–1520','zu genau'],['1505–1515','1500–1520','zu genau'],['1490–1530','1510','zu ungenau'],['1490–1530','1500–1520','zu ungenau'],['1500','um 1500','zu genau'],['um 1500','1500','zu ungenau'],['1500–1510','um 1500–1510','zu genau'],['um 1500–1510','1500–1510','zu ungenau'],['1490–1510','1500–1520','Zeitspannen überlappen']])assert.equal(c.dateHint(guess,actual).label,label,guess+' / '+actual);
  assert.equal(c.dateHint('1500','1500'),null);assert.equal(c.dateHint('unbekannt','1500'),null);
});
test('too early excludes only equally early or earlier whole windows, not overlapping later periods',()=>{
  const pool=works(['1500–1520','1450–1470','1400','1460','1460–1510','1530','1600']);const s=checkSwap(pool,0,1),id=pool[0].id;
  assert.equal(c.dateHintFor(s,id,pool[1].date).label,'zu früh');
  for(const value of ['1450–1470','1400','1460'])assert.ok(s.excluded[id].date.includes(value),value);
  for(const value of ['1500–1520','1460–1510','1530','1600'])assert.ok(!s.excluded[id].date.includes(value),value);
});
test('too late excludes only equally late or later whole windows and works before the common era',()=>{
  for(const dates of [['1500–1520','1550–1570','1600','1560','1510–1560','1490','1400'],['500–450 v. Chr.','400–350 v. Chr.','300 v. Chr.','375 v. Chr.','475–375 v. Chr.','600 v. Chr.','700 v. Chr.']]){
    const pool=works(dates),s=checkSwap(pool,0,1),id=pool[0].id;assert.equal(c.dateHintFor(s,id,pool[1].date).label,'zu spät');
    for(const value of dates.slice(1,4))assert.ok(s.excluded[id].date.includes(value),value);for(const value of [dates[0],...dates.slice(4)])assert.ok(!s.excluded[id].date.includes(value),value);
  }
});
test('too precise, too broad and partial overlap eliminate only the selected date',()=>{
  for(const [actual,guess,label]of [['1500–1520','1510','zu genau'],['1510','1500–1520','zu ungenau'],['1500–1520','1490–1510','Zeitspannen überlappen']]){
    const pool=works([actual,guess,'1400','1450','1600','1650','1700']),s=checkSwap(pool,0,1),id=pool[0].id;
    assert.equal(c.dateHintFor(s,id,guess).label,label);assert.deepEqual(plain(s.excluded[id].date),[guess]);
  }
});
test('both rounds of date advice survive restore and do not reveal newly selected dates early',()=>{
  const pool=works(['1500–1600','1505–1595','1510–1590','1515–1585','1520–1580','1525–1575','1530–1570']);let s=start(pool);
  for(const shift of [1,2]){s=c.inspect(fill(s,pool,shift,'date'),pool).state;assert.equal(s.attempts,shift);assert.equal(s.phase,'playing');}
  const id=s.ids[0],hints=plain(s.dateHints[id]);assert.equal(hints.length,2);assert.equal(s.choices[id].date,'');
  const restored=c.restore(plain(s),pool);assert.deepEqual(plain(restored.dateHints[id]),hints);
  const next=c.choose(restored,id,'date',pool.find(w=>w.id===id).date);assert.deepEqual(plain(next.dateHints[id]),hints);assert.equal(c.isLocked(next,id,'date'),false);
  const won=c.inspect(fill(next,pool),pool).state;assert.equal(won.phase,'unlocked');assert.equal(won.attempts,3);assert.ok(c.restore(plain(won),pool));
});
test('the real answer remains selectable after many different first attempts, and the room remains solvable',()=>{
  for(let n=1;n<=30;n++){
    let seed=n;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};let s=c.newState(archive,null,random);
    s=c.inspect(fill(s,archive,n%6+1,'date'),archive).state;
    for(const id of s.ids){const work=archive.find(w=>w.id===id);for(const field of c.fieldsFor(s))assert.equal(c.isExcluded(s,id,field,work[field]),false);}
    s=fill(s,archive);assert.equal(c.filled(s),35);assert.equal(c.inspect(s,archive).state.phase,'unlocked');
  }
});

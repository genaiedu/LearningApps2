const{test}=require('node:test');const assert=require('node:assert/strict');
const C=require('../scripts/kraefte-core.js'),V=require('../scripts/kraefte-inhalte.js');
test('forty distinct templates; ten progressively ordered, diverse and reproducible tasks',()=>{
  assert.equal(C.pool.length,40);assert.equal(new Set(C.pool.map(x=>x.id)).size,40);
  const seen=new Set();
  for(let seed=1;seed<=1500;seed++){
    const tasks=C.round(seed);C.validate(tasks);assert.deepEqual(tasks.map(t=>t.level),[1,1,2,2,3,3,4,4,5,5]);
    assert.deepEqual(tasks,C.round(seed));tasks.forEach(t=>seen.add(t.id));
    assert.match(tasks[2].kind,/weight/);assert.match(tasks[6].kind,/series/);assert.match(tasks[7].kind,/parallel/);
    tasks.filter(t=>t.type==='number').forEach(t=>{
      const preferred=C.friendly(t.expectedSI,t.dimension);assert.ok(preferred.value>=1&&preferred.value<=1000,JSON.stringify(preferred));assert.equal(C.check(t,String(preferred.value),preferred.unit).correct,true);
      assert.equal(C.check(t,String(t.expectedSI),C.units[t.dimension][0][0]).correct,true);
      assert.deepEqual(t.solution.map(x=>x.label),['Gegeben · in SI','Gesucht','Formel aus der Formelsammlung','Umstellen','Einsetzen · ausschließlich SI','Lösung · SI','Antwortsatz']);
      assert.ok(t.solution[4].tex.includes('\\mathrm'));assert.ok(!t.solution[4].tex.includes('\\mathrm{mm}'));assert.ok(!t.solution[4].tex.includes('\\mathrm g'));
    });
  }
  assert.equal(seen.size,40);assert.notDeepEqual(C.round(1),C.round(2));
});
test('all 31 masses and all arrangements obey Hooke and static equilibrium; invalid loads rejected',()=>{
  for(let m=0;m<=30;m++)for(const mode of['single','series','parallel']){
    const s=C.springState(m,mode);assert.ok(Math.abs(s.force-m/1000*C.G)<1e-12);assert.ok(Math.abs(s.D*s.extension-s.force)<1e-12);
    assert.equal(s.D,mode==='single'?5:mode==='series'?2.5:10);
  }
  for(const m of[-1,31,.5,NaN,Infinity])assert.throws(()=>C.springState(m),RangeError);
  assert.throws(()=>C.springState(2,'other'));assert.throws(()=>C.effectiveD(0,5,'series'));
  const a=C.springState(30),b=C.springState(30,'series'),c=C.springState(30,'parallel');assert.equal(b.extension,a.extension*2);assert.equal(c.extension,a.extension/2);
});
test('different springs compose correctly and a fitted constant requires actual distinct nonzero samples',()=>{
  assert.equal(C.effectiveD(4,12,'series'),3);assert.equal(C.effectiveD(4,12,'parallel'),16);
  assert.equal(C.fit([C.springState(0),C.springState(5)]),null);assert.equal(C.fit([C.springState(5),C.springState(5)]),null);
  assert.ok(Math.abs(C.fit([C.springState(5),C.springState(10),C.springState(25)])-5)<1e-10);
});
test('same fixed worked example and same ten tasks in presentation, not a second random draw',()=>{
  const t=C.example();assert.equal(t.expectedSI,4.905);assert.equal(t.solution.at(-1).text,'Die Federkonstante beträgt 4,91 N/m.');
  assert.deepEqual(C.example(),t);
  for(const seed of[1,33,999]){const tasks=C.round(seed),slides=V.createSlides(tasks);assert.equal(slides.length,57);assert.deepEqual(slides.filter(s=>s.role==='prompt').map(s=>s.taskId),tasks.map(t=>t.id));for(const task of tasks)assert.ok(slides.find(s=>s.taskId===task.id&&s.role==='prompt').html.includes(V.esc(task.prompt)));assert.ok(slides.find(s=>s.id==='beispiel-rechnung').html.includes('4,91 N/m'));}
});
test('two valid attempts, reduced second-attempt credit, no third attempt, no penalty for malformed input',()=>{
  const t=C.example();let r={attempts:0,status:'open',points:0};const invalid=C.grade(t,'abc','N/m',r);assert.equal(invalid.attempts,0);assert.equal(invalid.invalid,true);
  r=C.grade(t,'0','N/m',r);assert.equal(r.attempts,1);assert.equal(r.status,'open');r=C.grade(t,'4,905','N/m',r);assert.equal(r.status,'correct');assert.equal(r.points,.5);assert.equal(C.grade(t,'0','N/m',r),r);
  let fail=C.grade(t,'0','N/m');fail=C.grade(t,'0','N/m',fail);assert.equal(fail.status,'solved');assert.equal(fail.attempts,2);assert.equal(C.grade(t,'4.905','N/m',fail),fail);
  assert.equal(C.grade(t,'4.905','N/m').points,1);assert.equal(C.parseNumber('1 000,5'),1000.5);assert.equal(C.parseNumber('2,5e-3'),.0025);
});
test('TeX commands have one actual backslash and line-breaks remain two',()=>{
  const tex=C.example().solution[0].tex;assert.ok(tex.startsWith('\\begin{aligned}'));assert.ok(tex.includes('\\\\S='));assert.ok(V.math('D=5').includes('\\[D=5\\]'));
});
test('axioms are named, generic balance is not mislabeled spring force, carts start touching',()=>{
 const slides=V.createSlides(C.round(1));for(let i=1;i<=3;i++)assert.match(slides.find(s=>s.id==='axiom'+i).title,new RegExp(i+'\\. Newtonsches Axiom'));assert.match(V.visual('balance'),/Haltekraft/);assert.doesNotMatch(V.visual('balance'),/Federkraft/);assert.match(slides.find(s=>s.id==='gleichgewicht').html,/Seilkraft/);const rectangles=[...V.visual('reaction').matchAll(/<rect x="(\d+)"[^>]*width="(\d+)"/g)];assert.equal(Number(rectangles[0][1])+Number(rectangles[0][2]),Number(rectangles[1][1]));assert.equal(Object.keys(V.media).length,4);for(const id of Object.keys(V.media))assert.doesNotMatch(V.photo(id),/<img[^>]+src=/);
});
test('capital S denotes extension everywhere; seconds and acceleration units keep lowercase s',()=>{
 assert.equal(C.example().given[1].symbol,'S');assert.equal(C.units.time[0][0],'s');assert.equal(C.units.speed[0][0],'m/s');assert.equal(C.units.accel[0][0],'m/s²');
 const check=tex=>assert.doesNotMatch(tex.replace(/\\mathrm(?:\{[^}]*\}| s)/g,'UNIT'),/(^|[^A-Za-z\\])s(?=[^A-Za-z]|$)/);
 V.formulas.forEach(f=>check(f.tex));C.example().solution.filter(x=>x.tex).forEach(x=>check(x.tex));
 for(const html of[V.knowledge(),...V.createSlides(C.round(42)).map(x=>x.html)])for(const match of html.matchAll(/\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g))check(match[1]||match[2]);
 for(let seed=1;seed<=1500;seed++)for(const t of C.round(seed)){
  if(t.dimension==='length')assert.match(t.symbol,/^S(?:_|$)/);
  for(const q of t.given||[])if(q.type==='length')assert.match(q.symbol,/^S(?:_|$)/);
  t.solution.filter(x=>x.tex).forEach(x=>check(x.tex));
 }
 assert.match(V.visual('graph'),/>S \/ m</);assert.match(V.visual('graph'),/>ΔS</);
});

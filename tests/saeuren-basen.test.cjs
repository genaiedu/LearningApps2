const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const C=require('../scripts/saeuren-basen-core.js'),T=require('../scripts/saeuren-basen-aufgaben.js');
const close=(actual,expected,tol=1e-6)=>assert.ok(Math.abs(actual-expected)<tol,`${actual} ≠ ${expected}`);
test('water, strong acids and bases include autoprotolysis',()=>{
  close(C.solve().pH,7);close(C.solution('hcl',.01).pH,2,1e-7);close(C.solution('naoh',.01).pH,12,1e-7);
  const diluted=C.solution('hcl',1e-8);assert.ok(diluted.pH<7&&diluted.pH>6.97);close(diluted.h*diluted.oh,C.KW,1e-25);
  for(const s of C.substances)for(const c of [1e-8,1e-5,.001,.1]){const r=C.solution(s.id,c);close(r.pH+r.pOH,14,1e-10);assert.ok(s.type.endsWith('acid')?r.pH<7:r.pH>7);assert.ok(Math.abs(r.residual)<1e-12);}
});
test('weak partner fractions obey mass balance, not complete dissociation',()=>{
  const r=C.solution('acetic',.1),k=10**(-4.76);close(r.pH,2.88,.01);close(r.h*r.acidIon/(.1-r.acidIon),k,1e-12);assert.ok(r.acidIon/.1<.02);
  close(C.solution('ammonia',.1).pH,11.13,.01);
  for(const k of [1e-3,1e-5,1e-10]){const x=C.quadratic(k,.1);close(x*x/(.1-x),k,1e-12);}
});
test('all titration types are continuous at equivalence and have correct half/equivalence pH',()=>{
  for(const id of ['hcl','acetic','formic','naoh','ammonia']){
    const base={id,c:.1,v:25,ct:.1},start=C.titration(base),half=C.titration({...base,added:12.5}),eq=C.titration({...base,added:25});
    close(start.pH,C.solution(id,.1).pH);close(eq.veq,25);
    if(id==='hcl'||id==='naoh')close(eq.pH,7);else if(id==='ammonia'){close(half.pH,9.25,.01);assert.ok(eq.pH<7);}else{close(half.pH,C.get(id).pK,.01);assert.ok(eq.pH>7);}
    const before=C.titration({...base,added:25-1e-7}),after=C.titration({...base,added:25+1e-7});assert.ok(Math.abs(before.pH-after.pH)<.002);
    let last=start.pH;for(let added=.25;added<=50;added+=.25){const r=C.titration({...base,added});assert.ok(C.get(id).type.endsWith('acid')?r.pH>=last:r.pH<=last);last=r.pH;}
  }
});
test('titration volumes and concentration changes are accounted for',()=>{
  const r=C.titration({id:'hcl',c:.1,v:25,ct:.1,added:10});close(r.pH,-Math.log10(.0015/.035),1e-7);
  close(C.titration({id:'hcl',c:.075,v:20,ct:.1}).veq,15);
});
test('buffers survive small changes, have finite capacity and exact solver beyond HH',()=>{
  const initial=C.buffer(),acid=C.buffer({change:-1}),base=C.buffer({change:1});close(initial.pH,4.76,.002);close(acid.pH,4.76+Math.log10(4/6),.002);assert.ok(base.pH>initial.pH);
  assert.ok(C.buffer({change:6}).exhausted);assert.equal(C.buffer({change:6}).hh,null);assert.ok(C.buffer({change:6}).pH>11);
  assert.ok(C.buffer({change:-6}).pH<3);assert.equal(C.buffer({change:-5}).hh,null);
  close(C.buffer({volume:100}).pH,C.buffer({volume:200}).pH,.002);
});
test('240 variants are complete; 32 selected with all eight topics and no repeated IDs',()=>{
  for(let seed=0;seed<100;seed++){
    const bank=T.bank(seed);assert.equal(bank.length,240);assert.equal(new Set(bank.map(t=>t.id)).size,240);assert.deepEqual(T.bank(seed),bank);
    for(const t of bank){assert.ok(t.prompt&&t.hint&&t.explanation);if(t.kind==='choice'){assert.ok(t.options.includes(t.answer),t.id);assert.equal(new Set(t.options).size,t.options.length,t.id);}else{assert.ok(Number.isFinite(t.answer),t.id);assert.ok(C.accepts(t,String(t.answer)),t.id);}}
    const chosen=T.select(seed);assert.equal(chosen.length,32);T.groups.forEach(([g])=>{const group=chosen.filter(t=>t.group===g);assert.equal(group.length,4);assert.equal(new Set(group.map(t=>t.id.split('-')[1])).size,4);});
    const next=T.select(seed+100,chosen.map(t=>t.id));assert.equal(next.filter(t=>chosen.some(o=>o.id===t.id)).length,0);
  }
});
test('number validation allows commas and scientific notation but rejects expressions',()=>{
  close(C.parseNumber(' 1,2e-3 '),.0012);assert.ok(Number.isNaN(C.parseNumber('2+3')));assert.ok(Number.isNaN(C.parseNumber('')));
  const t={kind:'number',answer:3,absolute:.03,relative:0};assert.ok(C.accepts(t,'3,02'));assert.ok(!C.accepts(t,'3,05'));
  assert.ok(!C.accepts({kind:'number',answer:1e-11,relative:.02},'0'));assert.ok(C.accepts({kind:'number',answer:1e-11,relative:.02},'1,01e-11'));
  assert.throws(()=>C.solution('missing',1));assert.throws(()=>C.solve({acid:-1}));assert.throws(()=>C.titration({c:0}));
});
test('page includes the complete curriculum, local assets, four full-screen modules and reset',()=>{
  const html=fs.readFileSync(require.resolve('../saeuren-basen-mission.html'),'utf8');
  for(const word of ['Arrhenius','Brønsted','Lewis','Henderson','Äquivalenzpunkt','Autoprotolyse','K_\\mathrm c','K_\\mathrm s','K_\\mathrm b','Pufferkapazität','5-%'])assert.ok(html.includes(word),word);
  assert.equal((html.match(/data-fullscreen=/g)||[]).length,4);assert.ok(html.includes('id="reset-dialog"'));assert.ok(html.includes('data-defer-initial'));assert.ok(html.includes('240'));assert.doesNotMatch(html,/fonts\.googleapis|fonts\.gstatic|materialien\.html/);
  const css=fs.readFileSync(require.resolve('../styles/saeuren-basen-mission.css'),'utf8');assert.ok(css.includes('prefers-reduced-motion'));assert.ok(css.includes('color:#163b38'));
});

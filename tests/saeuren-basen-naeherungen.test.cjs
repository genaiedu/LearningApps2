const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../scripts/saeuren-basen-core.js'),T=require('../scripts/saeuren-basen-aufgaben.js');

test('all randomized square-root tasks satisfy the 5-percent criterion and their stated answer',()=>{
  for(let seed=0;seed<100;seed++)for(const task of T.bank(seed).filter(t=>/^(saeuren|basen)-1-/.test(t.id))){
    const p=task.parameters,base=task.group==='basen',c=base?p.cApproxBase:p.cApproxAcid,k=base?p.kb:p.ka;
    const estimated=Math.sqrt(k*c),quadratic=(-k+Math.sqrt(k*k+4*k*c))/2;
    assert.ok(estimated/c<=.05,task.id);
    assert.ok(estimated>100*Math.sqrt(C.KW));
    assert.ok(Math.abs(task.answer-(base?14+Math.log10(estimated):-Math.log10(estimated)))<1e-10);
    assert.ok(Math.abs(Math.log10(estimated/quadratic))<.012);
    assert.ok(task.symbols.includes('geschätzte protolysierte Anteil'));
  }
});
test('titration shortcut guard accepts ordinary points but rejects phosphate and near-endpoint misuse',()=>{
  const conf={c:.1,v:25,ct:.1};
  for(const id of ['hcl','naoh','acetic','ammonia'])for(const added of [0,12.5,25,32.5])assert.ok(C.titrationEstimate({...conf,id,added}).usable,id+' '+added);
  for(const [id,added] of [['phosphoric',12.5],['phosphoric',50],['acetic',24.9999],['ammonia',25.0001]])assert.equal(C.titrationEstimate({...conf,id,added}).usable,false,id+' '+added);
  for(const s of [...C.substances,...C.polySubstances])for(const c of [.001,.01,.1,.2])for(const q of [0,.0001,.1,.5,.9,.999999,1,1.000001,1.5,2,2.5,3,3.3]){
    const r=C.titrationEstimate({...conf,id:s.id,c,added:q*c*25/.1});
    assert.ok(Number.isFinite(r.exactPH));assert.equal(r.usable,Number.isFinite(r.pH)&&r.error<=.05);
  }
});

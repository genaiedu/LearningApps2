const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../scripts/saeuren-basen-core.js'),T=require('../scripts/saeuren-basen-aufgaben.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10, a+' != '+b);
test('every new round mixes basis and transfer; seven numerical topics require multi-step transfer',()=>{
  const reached=new Set();
  for(let seed=0;seed<150;seed++){
    const selected=T.select(seed);
    for(const [group] of T.groups){
      const items=selected.filter(t=>t.group===group);
      assert.equal(items.filter(t=>t.level==='Transfer').length,2,group);
      assert.equal(items.filter(t=>t.level==='Basis').length,2,group);
      if(group!=='begriffe')assert.ok(items.some(t=>t.level==='Transfer'&&t.kind==='number'),group);
    }
    assert.ok(!selected.some(t=>t.extension));
    assert.ok(T.select(seed,[],{lewis:true}).some(t=>t.extension==='lewis'));
    selected.filter(t=>t.level==='Transfer').forEach(t=>reached.add(t.id.split('-')[1]));
  }
  for(const key of new Set(T.bank(1).filter(t=>t.level==='Transfer').map(t=>t.id.split('-')[1])))assert.ok(reached.has(key),'Unreachable template '+key);
});
test('multi-step transfer answers follow independent amounts and equilibrium checks',()=>{
  for(let seed=0;seed<20;seed++)for(const t of T.bank(seed).filter(t=>t.kind==='number'&&t.level==='Transfer')){
    const p=t.parameters,key=t.id.split('-')[1],v=Number(t.id.split('-')[2]);
    switch(key){
      case 'transfer_mixture':{const d=(p.acidC*p.acidV-p.baseC*p.baseV)/(p.acidV+p.baseV);near(t.answer,d>0?-Math.log10(d):14+Math.log10(-d));break;}
      case 'transfer_infer':{
        if(t.group==='saeuren'){const x=10**(-p.measuredPH),k=x*x/(p.initialC-x),z=10**(-t.answer);near(z*z/(p.newC-z),k);}
        else{const y=10**(p.basePH-14),k=y*y/(p.originalBaseC-y),z=10**(t.answer-14);near(z*z/(p.originalBaseC/p.factor-z),k);}
        break;
      }
      case 'transfer_measurement':{const x=10**(-p.measuredPH);near(t.answer,C.KW/(x*x/(p.initialC-x)));break;}
      case 'transfer_phosphate':near(t.answer,p.j*p.c*p.volume/p.ct);break;
      case 'transfer_dilution':near(t.answer,.1*p.consumption/(2*25)*p.dilution);break;
      case 'transfer_equivalence':{const y=10**(t.answer-14);near(y*y/(p.saltC-y),p.acetateKb);break;}
      case 'transfer_design':near(t.answer/(p.startAmount-t.answer),10**(p.targetPH-4.76));assert.ok(t.answer>0&&t.answer<p.startAmount);break;
      case 'transfer_hagg':near(t.answer,p.total*C.fractions(p.pH,[4.76])[1]);break;
      case 'transfer_blood':near(t.answer,6.1+Math.log10((120-p.load)/(p.closed?6+p.load:6)));assert.doesNotMatch(t.prompt,/starke einprotonige Säure/);assert.match(t.hint,/starke einprotonige Säure/);break;
      default:assert.fail(key);
    }
    assert.ok(t.calculationSteps.length>=1);
    assert.doesNotMatch(t.prompt,/=\s*\([^)]*√/,'closed solution formula leaked in prompt');
  }
});
test('new constants and mean tasks no longer reduce to the same fixed answer',()=>{
  const bank=T.bank(345);
  assert.deepEqual(bank.filter(t=>/^konstanten-3-/.test(t.id)).map(t=>t.answer),[13.6,14,14.4]);
  for(const t of bank.filter(t=>/^titration-8-/.test(t.id))){
    near(t.answer,t.parameters.veq+.2/3);
    assert.ok(t.math.includes('mL'));
    assert.doesNotMatch(t.hint,/gleich weit/);
  }
});
test('water-factor definitions visibly separate quantities with multiplication dots in app and reference',()=>{
  const html=fs.readFileSync(require.resolve('../saeuren-basen-mission.html'),'utf8'),ref=fs.readFileSync(require.resolve('../../LearningApps/chemie-formelsammlung.js'),'utf8');
  for(const [source,bs] of [[html,'\\'],[ref,'\\\\']]){
    for(const kind of ['S','B'])assert.ok(source.includes('K_'+bs+'mathrm{'+kind+'}:=K_{c,'+bs+'mathrm{'+kind+'}}'+bs+'cdot c_{'+bs+'mathrm{W,ref}}'));
    assert.ok(source.includes('K_'+bs+'mathrm{W}:=K_{c,'+bs+'mathrm{Auto}}'+bs+'cdot c_{'+bs+'mathrm{W,ref}}^2'));
    assert.ok(!source.includes('Kᵦ'));
  }
});

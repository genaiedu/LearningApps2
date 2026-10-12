const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const C=require('../scripts/saeuren-basen-core.js'),T=require('../scripts/saeuren-basen-aufgaben.js');
const close=(actual,expected,tol=1e-6)=>assert.ok(Math.abs(actual-expected)<tol,`${actual} ≠ ${expected}`);
test('water, strong acids and bases include autoprotolysis',()=>{
  close(C.solve().pH,7);close(C.solution('hcl',.01).pH,2,1e-7);close(C.solution('naoh',.01).pH,12,1e-7);
  const diluted=C.solution('hcl',1e-8);assert.ok(diluted.pH<7&&diluted.pH>6.97);close(diluted.h*diluted.oh,C.KW,1e-25);
  for(const s of C.substances)for(const c of [1e-8,1e-5,.001,.1]){const r=C.solution(s.id,c);close(r.pH+r.pOH,14,1e-10);assert.ok(s.type.endsWith('acid')?r.pH<7:r.pH>7);assert.ok(Math.abs(r.residual)<1e-12);}
});

test('initial acid amount and added hydroxide are defined before the titration derivations',()=>{
  const html=fs.readFileSync(require.resolve('../saeuren-basen-mission.html'),'utf8');
  assert.ok(html.indexOf('id="titration-symbols"')<html.indexOf('class="curve-guide"'));
  assert.ok(html.includes('n₀ ist die anfangs eingesetzte Stoffmenge der Säure'));
  assert.ok(html.includes('nicht die frei in der Mischung verbliebenen Hydroxidionen'));
  assert.ok(html.includes('n_{\\mathrm{B,zu}}=c_\\mathrm{B}V_\\mathrm{B}=\\frac{n_0}{2}'));
  assert.ok(!html.includes('n(\\mathrm{OH^-})=\\frac{n_0}{2}'));
  assert.ok(html.includes('Beide befinden sich im selben Gesamtvolumen'));
});

test('half-equivalence has its own numbered characteristic-point calculation',()=>{
  const html=fs.readFileSync(require.resolve('../saeuren-basen-mission.html'),'utf8');
  const points=html.slice(html.indexOf('<h3>Die charakteristischen Punkte ausrechnen</h3>'),html.indexOf('<p class="eyebrow">Mehrprotonig'));
  assert.equal((points.match(/<li(?: |>)/g)||[]).length,5);
  assert.ok(points.indexOf('Vor dem ÄP:')<points.indexOf('id="titration-hap-calculation"'));
  assert.ok(points.indexOf('id="titration-hap-calculation"')<points.indexOf('ÄP: Acetat'));
  const half=points.slice(points.indexOf('id="titration-hap-calculation"'),points.indexOf('ÄP: Acetat'));
  for(const step of [
    'V_\\mathrm{HÄP}=\\frac{V_\\mathrm{Ä}}{2}',
    '0{,}100\\ \\mathrm{mol/L}\\cdot0{,}0125\\ \\mathrm{L}',
    '(2{,}50-1{,}25)\\ \\mathrm{mmol}',
    '\\frac{1{,}25\\ \\mathrm{mmol}}{1{,}25\\ \\mathrm{mmol}}=1',
    '\\boxed{\\mathrm{pH(HÄP)}\\approx\\mathrm{p}K_\\mathrm{S}=4{,}76}',
    'Für HCl gilt sie nicht'
  ])assert.ok(half.includes(step),step);
});

test('equivalence defines acetate, total volume and each constant before inserting numbers',()=>{
  const html=fs.readFileSync(require.resolve('../saeuren-basen-mission.html'),'utf8');
  const eq=html.slice(html.indexOf('<li id="titration-equivalence-calculation"'),html.indexOf('<li><strong>Überschuss:'));
  for(const meaning of [
    'Acetat-Ion CH₃COO⁻', 'V_\\mathrm{gesamt}=V_0+V_\\mathrm{Ä}',
    '\\frac{0{,}00250\\ \\mathrm{mol}}{0{,}0500\\ \\mathrm{L}}',
    'Gleicher Zahlenwert, andere Größe', 'Basenstärke ihres konjugierten Partners',
    'Ionenprodukt des Wassers bei 25 °C', 'gehört zum Acetat, nicht zur zugegebenen starken NaOH',
    '\\boxed{\\mathrm{pH(ÄP)}\\approx8{,}73}'
  ])assert.ok(eq.includes(meaning),meaning);
  assert.ok(eq.indexOf('Acetat-Ion CH₃COO⁻')<eq.indexOf('c(\\mathrm{A^-})'));
  assert.ok(eq.indexOf('Basenstärke ihres konjugierten Partners')<eq.indexOf('14{,}00-4{,}76'));
});

test('scientist overview keeps historical context without portraits or automatic image requests',()=>{
  const html=fs.readFileSync(require.resolve('../saeuren-basen-mission.html'),'utf8');
  assert.doesNotMatch(html,/data-portrait=|class="portrait|Wissenschaftlerporträts/);
  for(const name of ['Svante Arrhenius','Johannes N. Brønsted','Gilbert N. Lewis','Thomas M. Lowry'])assert.ok(html.includes(name));
  assert.ok(html.includes('Wikipedia-Artikel mit Abbildungen und Formeln laden erst beim Öffnen des Lesefensters.'));
});
test('weak partner fractions obey mass balance, not complete dissociation',()=>{
  const r=C.solution('acetic',.1),k=10**(-4.76);close(r.pH,2.88,.01);close(r.h*r.acidIon/(.1-r.acidIon),k,1e-12);assert.ok(r.acidIon/.1<.02);
  close(C.solution('ammonia',.1).pH,11.13,.01);
  for(const k of [1e-3,1e-5,1e-10]){const x=C.quadratic(k,.1);close(x*x/(.1-x),k,1e-12);}
});
test('Hagg distribution formulas are derived from equilibrium and the two-form mass balance',()=>{
  const html=fs.readFileSync(require.resolve('../saeuren-basen-mission.html'),'utf8');
  const start=html.indexOf('<section id="hagg-derivation"');
  assert.ok(start>=0);
  const derivation=html.slice(start,html.indexOf('</section>',start));
  assert.equal((derivation.match(/<li>/g)||[]).length,4);
  for(const step of [
    'K_\\mathrm{S}=\\frac{c(\\mathrm{H_3O^+})\\cdot c(\\mathrm{A^-})}{c(\\mathrm{HA})}',
    'c(\\mathrm{A^-})=\\frac{K_\\mathrm{S}}{c(\\mathrm{H_3O^+})}\\cdot c(\\mathrm{HA})',
    'c_\\mathrm{ges}=c(\\mathrm{HA})+c(\\mathrm{A^-})',
    'c(\\mathrm{HA})\\cdot \\left(1+\\frac{K_\\mathrm{S}}{c(\\mathrm{H_3O^+})}\\right)',
    '\\boxed{c(\\mathrm{HA})=\\frac{c_\\mathrm{ges}\\cdot c(\\mathrm{H_3O^+})}{c(\\mathrm{H_3O^+})+K_\\mathrm{S}}}',
    '\\boxed{c(\\mathrm{A^-})=\\frac{c_\\mathrm{ges}\\cdot K_\\mathrm{S}}{c(\\mathrm{H_3O^+})+K_\\mathrm{S}}}',
    'K_\\mathrm{S}\\cdot c_\\mathrm{ges}\\cdot c(\\mathrm{H_3O^+})',
    'c(\\mathrm{H_3O^+})\\cdot \\bigl(c(\\mathrm{H_3O^+})+K_\\mathrm{S}\\bigr)',
    'c(\\mathrm{HA})=c(\\mathrm{A^-})=\\frac{c_\\mathrm{ges}}{2}',
    'Aktivitätskorrekturen bleiben unberücksichtigt',
    'alle vier Formen gemeinsam bilanziert'
  ])assert.ok(derivation.includes(step),step);
  assert.ok(derivation.indexOf('analytische Gesamtkonzentration')<derivation.indexOf('Massenwirkungsgesetz aufstellen'));
  assert.ok(derivation.indexOf('Die Stoffbilanz ergänzen')<derivation.indexOf('\\boxed{c(\\mathrm{HA})'));
  for(const c of [.001,.01,.1])for(const pK of [2.15,3.75,4.76,9.25])for(const pH of [0,2,4.76,7,12,14]){
    const h=10**(-pH),k=10**(-pK),ha=c*h/(h+k),a=c*k/(h+k),fractions=C.fractions(pH,[pK]);
    close(ha+a,c,c*1e-12);close(h*a/ha,k,k*1e-12);
    close(ha/c,fractions[0],1e-12);close(a/c,fractions[1],1e-12);
    const atHalf=C.fractions(pK,[pK]);close(atHalf[0],.5);close(atHalf[1],.5);
  }
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
test('315 variants are complete; 32 selected with all eight topics and no repeated IDs',()=>{
  for(let seed=0;seed<100;seed++){
    const bank=T.bank(seed);assert.equal(bank.length,315);assert.equal(new Set(bank.map(t=>t.id)).size,315);assert.deepEqual(T.bank(seed),bank);
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
  for(const word of ['Arrhenius','Brønsted','Lewis','Henderson','Äquivalenzpunkt','Autoprotolyse','K_{c,\\mathrm{Auto}}','K_{c,\\mathrm{S}}','K_{c,\\mathrm{B}}','K_\\mathrm S','K_\\mathrm B','Pufferkapazität','5-%'])assert.ok(html.includes(word),word);
  assert.equal((html.match(/data-fullscreen=/g)||[]).length,4);assert.ok(html.includes('id="reset-dialog"'));assert.ok(html.includes('id="consent" data-defer-initial'));assert.ok(!html.includes('data-awaiting-consent'));assert.ok(html.includes('Abbrechen · ohne Wikipedia weiterlesen'));assert.ok(html.includes('data-task-count'));assert.doesNotMatch(html,/fonts\.googleapis|fonts\.gstatic|materialien\.html/);
  const css=fs.readFileSync(require.resolve('../styles/saeuren-basen-mission.css'),'utf8');assert.ok(css.includes('prefers-reduced-motion'));assert.ok(css.includes('color:#163b38'));
});

test('polyprotic phosphate satisfies all mass, charge and stepwise equilibrium balances',()=>{
  for(const c of [.001,.01,.1,.2])for(const ct of [.001,.1,.2])for(const fraction of [0,.25,.5,.99,1,1.01,1.5,1.99,2,2.01,2.5,3,3.5]){
    const r=C.titration({id:'phosphoric',c,v:25,ct,added:fraction*c*25/ct});
    close(r.alpha.reduce((a,b)=>a+b,0),1,1e-12);assert.ok(Math.abs(r.residual)<1e-11);close(r.h*r.oh,C.KW,1e-24);
    r.alpha.slice(1).forEach((a,i)=>close(r.h*a/r.alpha[i],10**(-[2.15,7.21,12.35][i]),1e-12));
  }
  const conf={id:'phosphoric',c:.1,v:25,ct:.1};close(C.titration({...conf,added:25}).pH,4.68,.04);close(C.titration({...conf,added:50}).pH,9.6679472915,1e-9);assert.ok(Math.abs(C.titration({...conf,added:50}).pH-9.78)>.1,'ampholyte approximation has water correction');
  assert.ok(Math.abs(C.titration({...conf,added:12.5}).pH-2.15)>.05,'first half point is not blindly pKa');
  let previous=0;for(let v=0;v<=87.5;v+=.125){const r=C.titration({...conf,added:v});assert.ok(r.pH>=previous);previous=r.pH;}
});
test('blood buffer model distinguishes closed and CO2-regulated calculation',()=>{
  const closed=C.bloodBuffer({load:.2}),open=C.bloodBuffer({load:.2,ventilated:true});
  close(closed.before,6.1+Math.log10(120/6));close(closed.after,6.1+Math.log10(119/7));close(open.after,6.1+Math.log10(119/6));
  assert.ok(Math.abs(open.delta)<Math.abs(closed.delta));assert.throws(()=>C.bloodBuffer({load:24}));
});
test('every numeric task includes real mathematical solution markup',()=>{
  for(let seed=0;seed<25;seed++)for(const task of T.bank(seed).filter(t=>t.kind==='number')){assert.ok(task.math.charCodeAt(0)===92&&task.math[1]==='[',task.id);assert.ok(task.math.includes('boxed'),task.id);assert.ok(!task.math.includes('undefined'),task.id);}
});
test('every generated numeric solution explains symbols and puts general formulas before unit-bearing substitutions',()=>{
  for(let seed=0;seed<12;seed++)for(const task of T.bank(seed).filter(t=>t.kind==='number')){
    assert.ok(task.parameters,task.id);assert.ok(task.symbols.length>80,task.id);assert.ok(task.calculationSteps.length,task.id);
    for(const {formula,substitution} of task.calculationSteps){
      assert.ok(formula&&substitution,task.id);assert.ok(task.math.indexOf(formula.split(/,\\quad |\\qquad/)[0])<task.math.indexOf(substitution.split(/,\\quad |\\qquad/)[0]),task.id);
      // A dimensionless intermediate ratio has no concentration/mole unit.
      if(['mol/L','mL','mmol','%'].includes(task.unit)&&!formula.startsWith('r=10'))assert.match(substitution,/\\mathrm|\\%/,task.id);
    }
    assert.doesNotMatch(task.explanation,/\d\s*[+·/−-]\s*\d/,task.id);
  }
});
test('blood, buffer and excess calculations identify symbols before numeric arithmetic',()=>{
  const html=fs.readFileSync(require.resolve('../saeuren-basen-mission.html'),'utf8');
  const blood=html.slice(html.indexOf('id="blutpuffer"'),html.indexOf('id="blood-task"'));
  assert.ok(blood.indexOf('Löslichkeitskoeffizient')<blood.indexOf('0{,}0300'));
  assert.ok(blood.indexOf('c(\\mathrm{CO_2^*})=\\alpha_{\\mathrm{CO_2}}p_{\\mathrm{CO_2}}')<blood.indexOf('0{,}0300'));
  assert.ok(blood.includes('\\frac{\\mathrm{mmol}}{\\mathrm{L}\\cdot\\mathrm{mmHg}}'));
  const solution=html.slice(html.indexOf('id="blood-solution"'),html.indexOf('id="hagg-lab"'));
  for(const expression of ['n_{\\mathrm{HCO_3},0}=c_{\\mathrm{HCO_3},0}V','n_{\\mathrm{CO_2},0}=c_{\\mathrm{CO_2},0}V','\\Delta\\mathrm{pH}_1=\\mathrm{pH}_1-\\mathrm{pH}_0','c_{\\mathrm{HCO_3},2}=\\frac{n_{\\mathrm{HCO_3},1}}{V}'])assert.ok(solution.includes(expression),expression);
  assert.ok(html.includes('\\Delta n=c_\\mathrm{B}V_\\mathrm{B}-n_0'));assert.ok(html.includes('id="eq-calculation"'));assert.ok(html.includes('id="buf-calculation"'));
});
test('new lesson has hidden milk-acid hint, diagram, four manual cases and window tools',()=>{
  const html=fs.readFileSync(require.resolve('../saeuren-basen-mission.html'),'utf8');
  for(const id of ['blood-hint','blood-solution','hagg-chart','titration-chart','tit-analysis'])assert.ok(html.includes('id="'+id+'"'));
  assert.ok(html.includes('id="blood-hint" hidden'));assert.equal((html.match(/data-practical=/g)||[]).length,4);
  assert.ok(html.includes('data-chemistry-formulas'));assert.ok(html.includes('data-scicalc-open'));assert.ok(html.includes('data-watermarks'));assert.ok(html.includes('p-q-Formel'));
  const tit=fs.readFileSync(require.resolve('../scripts/saeuren-basen-titration.js'),'utf8');assert.ok(tit.includes("helpers.chart('titration-chart'"));assert.ok(!tit.includes('measurementsComplete'));assert.ok(!tit.includes('C.crossing'));assert.ok(!html.includes('id="tit-analysis" hidden'));
});

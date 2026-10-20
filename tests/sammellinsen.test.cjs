const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const C=require('../scripts/sammellinsen-core.js'),V=require('../scripts/sammellinsen-inhalte.js'),root=path.resolve(__dirname,'..');
const near=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(1e-12,Math.abs(b)*1e-10),`${a} ≠ ${b}`);
function independent(t){const v=Object.fromEntries(t.given.map(q=>[q.symbol,q.si])),{f,g,b,G,B,A,L,x_G,x_L,x_S}=v;switch(t.kind){
 case'gPosition':return x_L-x_G;case'bPosition':return x_S-x_L;case'span':return g+b;case'gFromSpan':return L-b;case'bFromSpan':return L-g;case'ratioHeights':return B/G;case'ratioDistances':return b/g;case'heightDirect':case'BfromG':return G*b/g;
 case'bFG':case'bFG2':return 1/(1/f-1/g);case'gFB':case'gFB2':return 1/(1/f-1/b);case'fGB':case'fGB2':return 1/(1/g+1/b);case'GfromB':return B*g/b;
 case'Bcombined':return G*f/(g-f);case'Gcombined':return B*(g-f)/f;case'gAF':return f*(1+A)/A;case'bAF':return f*(1+A);case'fAg':return g*A/(1+A);case'fAb':return b/(1+A);case'spanAF':return f*(1+A)*(1+1/A);case'Afg':return f/(g-f);
 case'minSpan':return 4*f;case'fSpanA':return L*A/(1+A)**2;case'swap':return b;case'shift':return Math.abs(g-b);case'secondHeight':return G*g/b;case'gHeights':return f*(B+G)/B;case'bHeights':return f*(B+G)/G;case'remaining':return L-g-1/(1/f-1/g);default:throw Error(t.kind);
}}
test('1000 reproducible rounds cover all 40 templates, five levels and independently calculated SI answers',()=>{
 assert.equal(C.pool.length,40);const seen=new Set();for(let seed=1;seed<=1000;seed++){
  const ts=C.round(seed);assert.equal(ts.length,10);assert.equal(new Set(ts.map(t=>t.id)).size,10);assert.deepEqual(ts,C.round(seed));assert.deepEqual(ts.map(t=>t.level),[1,1,2,2,3,3,4,4,5,5]);
  for(const t of ts){seen.add(t.id);if(t.type==='number'){assert.ok(t.expectedSI>0);near(t.expectedSI,independent(t));assert.equal(t.solution.length,7);assert.equal(C.check(t,String(t.expectedSI),C.units[t.dimension][0][0]).correct,true);for(const s of t.solution)if(s.tex)assert.doesNotMatch(s.tex,/[\u0008\u000c]/);}}
 }assert.equal(seen.size,40);assert.notDeepEqual(C.round(1),C.round(2));
});
test('optical model separates real, virtual, infinite and out-of-bank image planes',()=>{
 near(C.image(.15).b,.3);near(C.image(.3).b,.15);near(C.image(.2).A,1);assert.equal(C.image(.1).kind,'infinity');assert.equal(C.image(.05).kind,'virtual');assert.ok(C.image(.05).b<0);
 for(const [g,b] of[[.15,.3],[.2,.2],[.3,.15]]){const s=C.bench(g,b);assert.ok(s.sharp&&s.reachable);near(1/C.F,1/g+1/s.b);assert.ok(s.screenX<C.BANK);}
 assert.equal(C.bench(.12,.3).reachable,false);assert.equal(C.bench(.25,.25).sharp,false);assert.equal(C.bench(.1,.2).sharp,false);assert.equal(C.bench(.05,.2).sharp,false);
 for(let i=5;i<=45;i++){const g=i/100,available=C.SCREEN_MAX-C.OBJECT_X-g;assert.ok(C.bench(g,available).screenX<=C.BANK);assert.throws(()=>C.bench(g,available+.01));}
 for(const g of[0,-1,NaN,Infinity])assert.throws(()=>C.image(g));assert.throws(()=>C.bench(.46,.02));
});
test('connection curve requires three different distances, preserves points and stays between neighboring values',()=>{
 const rows=[{g:.3,b:.15},{g:.15,b:.3},{g:.2,b:.2}],original=JSON.stringify(rows);
 for(const r of[[],rows.slice(0,1),rows.slice(0,2),[rows[0],rows[0],rows[1]]])assert.equal(C.plotData(r).curve.length,0);
 const p=C.plotData(rows);assert.equal(p.points.length,3);assert.equal(p.curve.length,41);assert.equal(JSON.stringify(rows),original);assert.deepEqual(p,C.plotData(rows.slice().reverse()));
 for(const v of p.points)assert.ok(p.curve.some(q=>Math.abs(q.g-v.g)<1e-12&&Math.abs(q.b-v.b)<1e-12));
 const collections=[rows,Array.from({length:31},(_,i)=>{const g=.13+i*.01;return{g,b:Math.round(C.image(g).b*1000)/1000};}),[{g:1,b:1},{g:1.01,b:5},{g:5,b:2},{g:10,b:2},{g:11,b:3}]];
 for(const rs of collections){const {points,curve}=C.plotData(rs);for(let i=0;i<points.length-1;i++)for(const q of curve.slice(i*20,(i+1)*20+1)){assert.ok(Number.isFinite(q.g)&&Number.isFinite(q.b));assert.ok(q.g>=points[i].g-1e-12&&q.g<=points[i+1].g+1e-12);assert.ok(q.b>=Math.min(points[i].b,points[i+1].b)-1e-12&&q.b<=Math.max(points[i].b,points[i+1].b)+1e-12);}}
 const duplicates=C.plotData([...rows,{g:.2,b:.202}]);assert.equal(duplicates.points.length,3);near(duplicates.points.find(p=>p.g===.2).b,.201);assert.deepEqual(C.plotData([{g:NaN,b:1},{g:1,b:Infinity}]),{points:[],curve:[]});
});
test('two-percent boundaries, unit conversions, precision examples and attempt accounting',()=>{
 for(let seed=1;seed<=20;seed++)for(const t of C.round(seed).filter(t=>t.type==='number'))for(const u of C.units[t.dimension]){
  const x=t.expectedSI/u[1];for(const factor of[.98,1,1.02])assert.equal(C.check(t,String(x*factor),u[0]).correct,true);for(const factor of[.97999,1.02001])assert.equal(C.check(t,String(x*factor),u[0]).correct,false);
  const f=C.answerFormat(t,u[0]);assert.ok(f.instruction.includes('Nachkommastelle'));assert.equal(C.check(t,f.text,u[0]).correct,true);assert.match(f.example,/^\d+(,\d+)?$/);
 }
 const t=C.example();assert.equal(t.expectedSI,.3);assert.equal(C.answerFormat(t,'m').decimals,3);assert.equal(C.answerFormat(t,'cm').example,'12,3');assert.equal(C.answerFormat(t,'mm').example,'123');
 assert.equal(C.grade(t,'abc','m').attempts,0);assert.equal(C.check(t,'1e999','m').valid,false);let r=C.grade(t,'0','m');assert.equal(r.attempts,1);r=C.grade(t,'30','cm',r);assert.equal(r.points,.5);assert.equal(C.grade(t,'0','m',r),r);let fail=C.grade(t,'0','m');fail=C.grade(t,'0','m',fail);assert.equal(fail.status,'solved');assert.equal(C.grade(t,'30','cm',fail),fail);
});
test('presentation uses the same round and fixed example, including precision instructions',()=>{
 const e=C.example();assert.match(e.solution.at(-1).text,/30,0 cm/);for(const seed of[1,33,999]){const ts=C.round(seed),slides=V.createSlides(ts);assert.deepEqual(slides.filter(s=>s.role==='prompt').map(s=>s.taskId),ts.map(t=>t.id));for(const t of ts){const s=slides.find(s=>s.role==='prompt'&&s.taskId===t.id);assert.ok(s.html.includes(V.esc(t.prompt)));if(t.type==='number')assert.ok(s.html.includes(V.esc(C.answerFormat(t).instruction)));}assert.ok(slides.find(s=>s.id==='beispiel-frage').html.includes(V.esc(e.prompt)));assert.ok(slides.find(s=>s.id==='beispiel-rechnung').html.includes('30,0 cm'));}
});
function fixture(blocked=false,saved){const dom=new JSDOM(fs.readFileSync(path.join(root,'sammellinsen-labor.html'),'utf8'),{url:'https://test.invalid/LearningApps2/sammellinsen-labor.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,$=id=>w.document.getElementById(id);w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};if(blocked)Object.defineProperty(w,'localStorage',{get(){throw Error('blocked');}});else if(saved)w.localStorage.setItem('sammellinsen-labor:round:v1',JSON.stringify(saved));for(const f of['sammellinsen-core.js','sammellinsen-inhalte.js','sammellinsen-labor.js'])w.eval(fs.readFileSync(path.join(root,'scripts',f),'utf8'));return{w,$,dom};}
test('fractional slider positions match the model and readouts without jumping to the midpoint',()=>{
 const f=fixture(),g=f.$('g-range'),b=f.$('b-range'),set=(el,v)=>{el.value=String(v);el.dispatchEvent(new f.w.Event('input'));};
 for(let cm=5;cm<=45;cm+=.5){
  set(g,cm);assert.equal(g.min,'5');assert.equal(g.max,'45');assert.equal(g.step,'0.5');assert.equal(g.valueAsNumber,cm,'g = '+cm);near(f.w.LensApp.snapshot().lab.g,cm/100);assert.equal(f.$('g-value').value,C.n(cm,1)+' cm');assert.equal(Number(b.max),62-cm,'available screen distance');
  for(const screen of[2,Number(((64-cm)/2).toFixed(1)),62-cm]){set(b,screen);assert.equal(b.valueAsNumber,screen,'screen = '+screen);near(f.w.LensApp.snapshot().lab.screen,screen/100);assert.equal(f.$('b-value').value,C.n(screen,1)+' cm');assert.equal(g.valueAsNumber,cm);}
 }
 set(g,15.5);set(b,30.1);const saved=f.w.LensApp.snapshot(),reloaded=fixture(false,saved);assert.equal(reloaded.$('g-range').valueAsNumber,15.5);assert.equal(reloaded.$('b-range').valueAsNumber,30.1);assert.equal(Number(reloaded.$('b-range').max),46.5);reloaded.dom.window.close();
 set(g,5);set(b,57);set(g,45);assert.equal(b.valueAsNumber,17);near(f.w.LensApp.snapshot().lab.screen,.17);f.dom.window.close();
});
test('UI enables only sharp records, all three image sizes, clear, persistence and no duplicate measurements',()=>{
 const f=fixture();assert.equal(f.$('measure').disabled,true);for(const [g,b] of[[15,30],[20,20],[30,15]]){f.$('g-range').value=g;f.$('g-range').dispatchEvent(new f.w.Event('input'));f.$('b-range').value=b;f.$('b-range').dispatchEvent(new f.w.Event('input'));assert.equal(f.$('measure').disabled,false);f.$('measure').click();f.$('measure').click();}assert.equal(f.w.LensApp.snapshot().lab.records.length,3);assert.equal(f.$('measurements').children.length,3);assert.ok(f.w.LensApp.snapshot().badges.includes('experiment'));const saved=f.w.LensApp.snapshot(),g=fixture(false,saved);assert.equal(g.w.LensApp.snapshot().seed,saved.seed);assert.equal(g.w.LensApp.snapshot().lab.records.length,3);g.$('measure-clear').click();assert.equal(g.w.LensApp.snapshot().lab.records.length,0);f.dom.window.close();g.dom.window.close();
});
test('plot switching and saved ray selection leave the live experiment and learning state unchanged',()=>{
 const f=fixture(),set=(id,v)=>{f.$(id).value=String(v);f.$(id).dispatchEvent(new f.w.Event(id==='analysis-record'?'change':'input'));};assert.equal(f.$('plot-rays-open').disabled,true);assert.equal(f.$('lens-plot').querySelector('.measurement-curve'),null);
 for(const [g,b] of[[15,30],[20,20],[30,15]]){set('g-range',g);set('b-range',b);f.$('measure').click();}
 assert.equal(f.$('lens-plot').querySelectorAll('.measurement-curve').length,1);assert.equal(f.$('lens-plot').querySelectorAll('circle').length,3);assert.equal(f.$('plot-rays-open').disabled,false);const before=JSON.stringify(f.w.LensApp.snapshot()),live=f.$('bank-scene').innerHTML;
 f.$('plot-rays-open').click();assert.equal(f.$('plot-diagram').hidden,true);assert.equal(f.$('plot-rays').hidden,false);assert.equal(f.$('plot-rays-open').getAttribute('aria-pressed'),'true');assert.equal(f.$('analysis-record').options.length,3);assert.equal(f.$('analysis-bank').querySelectorAll('.ray').length,2);
 set('analysis-record','0.2:0.2');set('analysis-record','0.3:0.15');assert.match(f.$('analysis-caption').textContent,/verkleinert/);assert.equal(f.$('bank-scene').innerHTML,live);assert.equal(JSON.stringify(f.w.LensApp.snapshot()),before);
 f.$('plot-diagram-open').click();assert.equal(f.$('plot-diagram').hidden,false);f.$('plot-rays-open').click();f.$('measure-clear').click();assert.equal(f.$('plot-diagram').hidden,false);assert.equal(f.$('plot-rays').hidden,true);assert.equal(f.$('plot-rays-open').disabled,true);assert.equal(f.$('lens-plot').querySelector('.measurement-curve'),null);f.dom.window.close();
});
test('four evaluation questions have separate hints and comparison; the derivation starts collapsed',()=>{
 const f=fixture();assert.equal(f.w.document.querySelectorAll('.evaluation-questions>li').length,4);assert.equal(f.w.document.querySelectorAll('.evaluation-questions details').length,4);assert.equal(f.w.document.querySelector('.evaluation-answer').open,false);assert.equal(f.w.document.querySelectorAll('.evaluation-answer .solution-steps>div').length,7);assert.equal(f.$('lens-derivation').open,false);assert.equal(f.$('lens-derivation').querySelectorAll('.ray').length,2);assert.match(f.$('lens-derivation').textContent,/Strahlensatz/);assert.match(f.$('plot-evaluation').textContent,/vier Nachkommastellen/);for(const html of[V.evaluation(),V.derivation()])assert.doesNotMatch(html,/[\u0008\u000c]/);f.dom.window.close();
});
test('numeric UI changes placeholders with units, accepts 1.9 percent, and reveals a solution after two errors',()=>{
 const f=fixture(),ts=f.w.LensApp.round();f.w.document.querySelector('[data-task="2"]').click();const t=ts[2];for(const u of C.units[t.dimension]){f.$('answer-number').value='2,345';f.$('answer-unit').value=u[0];f.$('answer-unit').dispatchEvent(new f.w.Event('change'));assert.equal(f.$('answer-number').placeholder,C.answerFormat(t,u[0]).example);assert.equal(f.$('answer-format').textContent,C.answerFormat(t,u[0]).instruction);assert.equal(f.$('answer-number').value,'2,345');}f.$('answer-unit').value=C.units[t.dimension][0][0];f.$('answer-number').value=String(t.expectedSI*1.019).replace('.',',');f.$('answer-form').dispatchEvent(new f.w.Event('submit',{cancelable:true}));assert.equal(f.w.LensApp.snapshot().results[t.id].status,'correct');f.w.document.querySelector('[data-task="3"]').click();for(let i=0;i<2;i++){f.$('answer-number').value='0';f.$('answer-form').dispatchEvent(new f.w.Event('submit',{cancelable:true}));}assert.match(f.$('task-card').textContent,/Vollständige Musterlösung/);const points=f.$('score').textContent;f.$('answer-form').dispatchEvent(new f.w.Event('submit',{cancelable:true}));assert.equal(f.$('score').textContent,points);f.dom.window.close();
});
test('reset, blocked storage and fullscreen fallback remain usable; central formulas are linked',()=>{
 const f=fixture(true),seed=f.w.LensApp.snapshot().seed,e=f.w.LensApp.example();f.$('palette').value='plum';f.$('palette').dispatchEvent(new f.w.Event('change'));f.$('reset-confirm').click();assert.notEqual(f.w.LensApp.snapshot().seed,seed);assert.equal(f.$('palette').value,'plum');assert.deepEqual(f.w.LensApp.example(),e);assert.ok(f.w.document.querySelector('a[href="../LearningApps/physik-formelsammlung.html#phys-optik"][target="_blank"]'));assert.ok(f.w.document.querySelector('a[download][href^="material/sammellinsen-arbeitsblatt.pdf"]'));f.dom.window.close();
});
test('every formula control directly links the full collection; no local collection remains',()=>{
 const f=fixture();f.w.document.querySelector('[data-task="2"]').click();f.$('answer-number').value='2,345';const before=JSON.stringify(f.w.LensApp.snapshot());
 const links=f.w.document.querySelectorAll('a[href*="physik-formelsammlung.html"]');assert.equal(links.length,3);
 for(const a of links){assert.equal(a.getAttribute('href'),'../LearningApps/physik-formelsammlung.html#phys-optik');assert.equal(a.target,'_blank');assert.ok(a.relList.contains('noopener'));assert.ok(a.relList.contains('noreferrer'));}
 assert.equal(f.$('formula-open').tagName,'A');assert.equal(f.$('task-formulas').tagName,'A');assert.equal(f.$('formula-dialog'),null);assert.equal(f.$('formula-content'),null);assert.equal(f.w.LensContent.formulaHTML,undefined);assert.equal(f.w.LensContent.formulas,undefined);assert.equal(JSON.stringify(f.w.LensApp.snapshot()),before);assert.equal(f.$('answer-number').value,'2,345');f.dom.window.close();
});

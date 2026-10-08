const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../scripts/gc-labor.js'),'utf8');
// Exercise the application's actual prerequisite predicates, without a DOM package.
const planSource=source.slice(source.indexOf(' function coachPlan(){'),source.indexOf(' function clearCoachTarget()'));
const doneSource=source.slice(source.indexOf(' function coachDone('),source.indexOf(' function showCoachTarget()'));
function fixture(mode='explore'){
 const state={mode,mixture:[{id:'acetone',c:35}],ready:false,blank:null,run:null,running:false,cooling:false,runPeaks:[],rows:[],pending:null,unknown:null,selectedPeakRun:null,concentrationCorrect:false,qual:[],qualRevealed:false};
 const values={'quant-analyte':'ethanol','quant-method':'external','standard-c':'25',dilution:'1'},checks=new Set();
 let matches=false,validFit=false,validMethod=true;
 const $=id=>({value:values[id]??'',querySelector(selector){if(id==='library-matches')return matches?{}:null;const match=selector.match(/input\[value="([^"]+)"\]/);return match?{checked:checks.has(match[1])}:null;},querySelectorAll(){return [...checks].map(()=>({checked:true}));}});
 const context=vm.createContext({window:{},state,$,method(){if(!validMethod)throw Error('invalid');return {detector:values.detector||'ms'};},fit:()=>validFit?{slope:1}:null});
 vm.runInContext(planSource+doneSource+'\nwindow.plan=coachPlan;window.done=coachDone;',context);
 return {state,values,checks,plan:context.window.plan(),done:context.window.done,match(){matches=true;},fit(){validFit=true;},invalid(){validMethod=false;}};
}
test('first measurement is nine concrete actions; stabilisation, blank, run, peak selection and library are checked',()=>{
 const f=fixture(),p=f.plan;
 assert.deepEqual(Array.from(p,s=>s.target),['mixture-preset','detector','method-controls','equilibrate','blank','inject','peak-table','compare-library','ms-plot']);
 assert.ok(f.done(p[0]));f.state.mixture=[];assert.equal(f.done(p[0]),false);
 assert.equal(f.done(p[3]),false);f.state.ready=true;assert.ok(f.done(p[3]));
 assert.equal(f.done(p[4]),false);f.state.blank={};assert.ok(f.done(p[4]));
 assert.equal(f.done(p[5]),false);f.state.run={number:7,job:{kind:'blank'}};f.state.runPeaks=[{}];assert.equal(f.done(p[5]),false);
 f.state.run.job.kind='sample';assert.ok(f.done(p[5]));assert.equal(f.done(p[6]),false);f.state.selectedPeakRun=7;assert.ok(f.done(p[6]));
 assert.equal(f.done(p[7]),false);f.match();assert.ok(f.done(p[7]));f.invalid();assert.equal(f.done(p[2]),false);
});
test('all courses block Weiter during an acquisition and during cooldown',()=>{
 for(const mode of ['explore','qualitative','quantitative']){
  const f=fixture(mode),observation=f.plan.at(-1);assert.ok(f.done(observation));
  f.state.running=true;assert.equal(f.done(observation),false);f.state.running=false;f.state.cooling=true;assert.equal(f.done(observation),false);
  f.state.cooling=false;assert.ok(f.done(observation));
 }
});
test('quantitative course checks all four actual standards, dilution, unknown acquisition and checked answer',()=>{
 const f=fixture('quantitative'),p=f.plan;assert.equal(p.length,23);
 for(const [i,c]of [0,25,50,100].entries()){
  const start=5+i*3;f.values['standard-c']='';assert.equal(f.done(p[start]),false);f.values['standard-c']=String(c);assert.ok(f.done(p[start]));
  f.state.pending=null;assert.equal(f.done(p[start+1]),false);f.state.pending={kind:'standard',c};assert.ok(f.done(p[start+1]));
  assert.equal(f.done(p[start+2]),false);f.state.rows.push({c});assert.ok(f.done(p[start+2]));
 }
 assert.equal(f.done(p[17]),false);f.fit();assert.ok(f.done(p[17]));f.state.rows.pop();assert.equal(f.done(p[17]),false);f.state.rows.push({c:100});
 assert.equal(f.done(p[18]),false);f.values.dilution='2';assert.ok(f.done(p[18]));
 f.state.pending={kind:'unknown',factor:1};assert.equal(f.done(p[19]),false);f.state.pending.factor=2;assert.ok(f.done(p[19]));
 assert.equal(f.done(p[20]),false);f.state.run={job:{kind:'unknown'}};f.state.unknown={area:1};assert.ok(f.done(p[20]));
 assert.equal(f.done(p[21]),false);f.state.concentrationCorrect=true;assert.ok(f.done(p[21]));
});
test('qualitative course requires three checked candidates and a successful assignment',()=>{
 const f=fixture('qualitative'),p=f.plan;assert.equal(p.length,10);f.state.qual=[{id:'a'},{id:'b'},{id:'c'}];const s=p[8];
 f.checks.add('a');f.checks.add('b');assert.equal(f.done(s),false);f.checks.add('c');assert.equal(f.done(s),false);f.state.qualRevealed=true;assert.ok(f.done(s));f.checks.add('d');assert.equal(f.done(s),false);
});
test('guide is a single in-labor region, not a modal dialog, with touch-sized navigation and print exclusion',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../gaschromatographie-labor.html'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../styles/gc-labor.css'),'utf8');
 assert.equal((html.match(/id="coach-panel"/g)||[]).length,1);assert.ok(html.includes('<aside id="coach-panel"'));assert.ok(!html.includes('id="coach-dialog"'));
 for(const id of ['coach-next','coach-back','coach-toggle','coach-progress','coach-overview'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(css.includes('.gc-module>.gc-workspace,.gc-workspace>.gc-grid'));assert.ok(css.includes('.gc-guide{display:none!important}'));
});

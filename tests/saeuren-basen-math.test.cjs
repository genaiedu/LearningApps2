const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,'scripts',name+'.js'),'utf8');
function setup(t,{page=false,startup=Promise.resolve(),fonts=Promise.resolve(),native}={}){
  const dom=new JSDOM(page?fs.readFileSync(path.join(root,'saeuren-basen-mission.html'),'utf8'):'<main id="host"></main>',{url:'https://test.invalid/LearningApps2/',runScripts:'outside-only'});
  const w=dom.window,calls=[],warnings=[];
  w.console.warn=(...args)=>warnings.push(args);
  w.matchMedia=()=>({matches:true,addEventListener(){}});
  w.HTMLElement.prototype.scrollIntoView=function(){};
  Object.defineProperty(w.document,'fonts',{value:{ready:fonts}});
  w.MathJax={startup:{promise:startup},typesetClear(nodes){calls.push({clear:nodes});},async typesetPromise(nodes){
    assert.ok(nodes.every(node=>node.isConnected),'every measured root must be attached');
    assert.ok(nodes.every(node=>!node.closest('[hidden],dialog:not([open]),details:not([open])')),'roots must be open');
    calls.push({typeset:nodes});
    if(native)await native(nodes);
  }};
  w.eval(source('saeuren-basen-math'));
  t.after(()=>w.close());
  return{w,host:w.document.getElementById('host'),calls,warnings};
}
test('waits for startup and local fonts before inserting and measuring formulas',async t=>{
  let start,load;
  const startup=new Promise(resolve=>{start=resolve;}),fonts=new Promise(resolve=>{load=resolve;});
  const {w,host,calls}=setup(t,{startup,fonts});
  w.AcidTypeset.replace(host,'\\[x=1\\]');
  await Promise.resolve();assert.equal(calls.length,0);assert.equal(host.textContent,'');
  start();for(let i=0;i<4;i++)await Promise.resolve();assert.equal(calls.length,0);
  load();await w.AcidTypeset.whenIdle();
  assert.equal(host.textContent,'\\[x=1\\]');assert.equal(calls.filter(c=>c.typeset).length,1);
});
test('restored numeric solution is inserted into the real task grid before typesetting',async t=>{
  const {w,calls,warnings}=setup(t,{page:true});
  const tasks=require('../scripts/saeuren-basen-aufgaben.js').select(123456);
  const solved=tasks.find(task=>task.kind==='number'&&task.math);
  assert.ok(solved);
  const saved={version:1,seed:123456,ids:tasks.map(task=>task.id),answers:{[solved.id]:{attempts:1,value:String(solved.answer),done:true,solved:true}}};
  w.localStorage.setItem('protonen-mission-v1',JSON.stringify(saved));
  for(const name of ['saeuren-basen-core','saeuren-basen-rechenwege','saeuren-basen-aufgaben','saeuren-basen-titration','saeuren-basen-mission','saeuren-basen-vertiefung'])w.eval(source(name));
  await w.AcidTypeset.whenIdle();
  const card=w.document.getElementById('task-'+solved.id);
  assert.equal(w.document.querySelectorAll('.task-card').length,32);
  assert.ok(card.classList.contains('is-solved'));assert.ok(!card.querySelector('.task-solution').hidden);
  assert.equal(card.querySelector('.math').textContent,solved.math);
  assert.equal(w.document.getElementById('score').textContent,'1 / 32');
  assert.deepEqual(JSON.parse(w.localStorage.getItem('protonen-mission-v1')),{...saved,version:2});
  assert.ok(calls.some(c=>c.typeset?.some(node=>node.id==='task-groups')));
  assert.equal(warnings.length,0);
});
test('shared dialog and app updates cannot run simultaneous render jobs',async t=>{
  let active=0,maxActive=0;
  const {w,host,calls}=setup(t,{native:async()=>{active++;maxActive=Math.max(maxActive,active);await new Promise(resolve=>setTimeout(resolve,5));active--;}});
  await w.AcidTypeset.whenIdle();
  const other=w.document.createElement('section');w.document.body.append(other);
  w.AcidTypeset.replace(host,'\\[a=1\\]');
  w.MathJax.typesetPromise([other]);
  w.AcidTypeset.replace(other,'\\[b=2\\]');
  await w.AcidTypeset.whenIdle();
  assert.equal(maxActive,1);assert.equal(calls.filter(c=>c.typeset).length,3);
});
test('rapid input skips outdated states and always renders the final state',async t=>{
  const {w,host,calls}=setup(t);
  for(let i=0;i<30;i++)w.AcidTypeset.replace(host,'\\[x='+i+'\\]');
  await w.AcidTypeset.whenIdle();
  assert.equal(host.textContent,'\\[x=29\\]');assert.equal(calls.filter(c=>c.typeset).length,1);
});
test('detached or closed roots are not measured; opening a panel schedules its formulas',async t=>{
  const {w,host,calls}=setup(t),removed=w.document.createElement('p');
  removed.textContent='\\[x=1\\]';w.AcidTypeset.typeset([removed]);
  host.innerHTML='<details><summary>Mehr</summary><p>\\[y=2\\]</p></details>';
  const details=host.querySelector('details');w.AcidTypeset.typeset([details]);
  await w.AcidTypeset.whenIdle();assert.equal(calls.filter(c=>c.typeset).length,0);
  details.open=true;details.dispatchEvent(new w.Event('toggle'));
  await w.AcidTypeset.whenIdle();assert.ok(calls.some(c=>c.typeset?.includes(details)));
});
test('a rejected render does not poison later updates',async t=>{
  let fail=true;
  const {w,host,warnings}=setup(t,{native:async()=>{if(fail){fail=false;throw Error('test renderer failure');}}});
  await w.AcidTypeset.replace(host,'\\[x=1\\]');
  await w.AcidTypeset.replace(host,'\\[x=2\\]');
  await w.AcidTypeset.whenIdle();assert.equal(host.textContent,'\\[x=2\\]');assert.equal(warnings.length,1);
});

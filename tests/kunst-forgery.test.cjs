const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../scripts/kunsttresor-core.js');
const pool=require('../data/kunstarchiv.json').works;
function solved(){let state=core.newState(pool);for(const id of state.ids)for(const field of core.fields)state=core.choose(state,id,field,pool.find(w=>w.id===id)[field]);return state;}
test('a forgery must be marked before a correctly assigned room unlocks',()=>{
 let state=solved();state.forgery={id:state.ids[1],image:'data:image/jpeg;base64,/9j/'};
 let result=core.inspect(state,pool);assert.equal(result.correct,16);assert.equal(result.forgeryCorrect,false);assert.equal(result.state.phase,'playing');
 state={...result.state,forgeryMarks:{[state.ids[1]]:true}};result=core.inspect(state,pool);assert.equal(result.state.phase,'unlocked');assert.equal(core.restore(result.state,pool).phase,'unlocked');
});
test('marking originals fails even when all assignments are correct',()=>{let state=solved();state.forgeryMarks={[state.ids[0]]:true};assert.equal(core.inspect(state,pool).state.phase,'playing');});
test('legacy and all-original rooms still unlock normally',()=>assert.equal(core.inspect(solved(),pool).state.phase,'unlocked'));
test('tampered forgery saves are rejected',()=>{let state=solved();state.forgery={id:'missing',image:'https://example.org/image'};assert.equal(core.restore(state,pool),null);});
const {createHandler}=require('../services/kunst-kurator/api/forgery.js');
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v},status(s){this.code=s;return this},json(v){this.body=v;return this},end(){}};}
test('unconfigured service fails closed without calling a provider',async()=>{const res=response();await createHandler({env:{},fetcher:()=>{throw Error('must not call')}})({method:'POST',headers:{origin:'https://genaiedu.github.io'}},res);assert.equal(res.code,503);});
test('a mandatory text model writes a style-grounded prompt before multipart Klein 4B generation',async()=>{
 const calls=[],res=response();
 const prompt='Period-authentic pointillist painting, with the entire image constructed from separated tiny pigment dots and optical colour mixing. '.repeat(5);
 await createHandler({env:{FORGERY_ENABLED:'true',CLOUDFLARE_ACCOUNT_ID:'account',CLOUDFLARE_API_TOKEN:'secret',GROQ_API_KEY:'text-secret'},works:pool,knowledge:{styles:{[pool[0].style]:{clues:['separated pigment dots']}}},fetcher:async(url,options)=>{calls.push({url,body:options.body instanceof FormData?Object.fromEntries(options.body):JSON.parse(options.body)});return {ok:true,json:async()=>url.includes('groq.com')?{choices:[{message:{content:JSON.stringify({style:'Clearly separated tiny pigment dots, no smooth gradients.',prompt})}}]}:{result:{image:'/9j/'}}};}})({method:'POST',headers:{origin:'https://genaiedu.github.io','content-type':'application/json'},body:{id:pool[0].id}},res);
 assert.equal(res.code,200);assert.equal(calls.length,2);assert.equal(calls[0].body.reasoning_effort,'low');assert.match(calls[0].body.messages[1].content,/separated pigment dots/);assert.match(calls[1].url,/flux-2-klein-4b$/);assert.equal(calls[1].body.width,'1024');assert.equal(calls[1].body.steps,undefined);assert.match(calls[1].body.prompt,/separated tiny pigment dots/);assert.doesNotMatch(calls[1].body.prompt,/Painted artwork/);assert.equal(res.body.image,'data:image/jpeg;base64,/9j/');assert.ok(res.body.prompt);
});
test('missing text credentials never silently fall back to a generic image prompt',async()=>{const res=response();await createHandler({env:{FORGERY_ENABLED:'true',CLOUDFLARE_ACCOUNT_ID:'account',CLOUDFLARE_API_TOKEN:'secret'},fetcher:()=>{throw Error('no call')}})({method:'POST',headers:{origin:'https://genaiedu.github.io'}},res);assert.equal(res.code,503);});

test('normal mode places one forgery every five or six rooms, with no extra lottery after the pause',()=>{
 for(const random of [()=>0,()=>.999]){
  let cooldown=core.nextForgeryCooldown(random),positions=[];
  for(let i=1;i<=1000;i++){const plan=core.forgeryPlan(cooldown,random);if(plan.generate)positions.push(i);cooldown=plan.cooldown;}
  assert.equal(positions[0],random() < .5?5:6);
  for(let i=1;i<positions.length;i++)assert.equal(positions[i]-positions[i-1],random() < .5?5:6);
 }
});
test('a due normal forgery is generated even with a high random value',()=>assert.deepEqual(core.forgeryPlan(0,()=>.999),{cooldown:5,generate:true}));
test('the secret mode always selects exactly one forgery opportunity and preserves the rare-mode cooldown',()=>{
 for(let cooldown=0;cooldown<=6;cooldown++)for(let i=0;i<25;i++)assert.deepEqual(core.forgeryPlan(cooldown,()=>{throw Error('No lottery in secret mode');},true),{cooldown,generate:true});
});
test('secret rooms always contain an eligible two-dimensional image, even if sculptures are selected first',()=>{
 const physical=core.newState(pool).ids.map(id=>({...pool.find(w=>w.id===id),artForm:'sculpture'}));
 const picture={...physical[0],id:'test-picture',artForm:'painting',introEligible:true},mixed=[...physical,picture];
 assert.equal(core.newState(mixed,null,()=>.9999).ids.includes(picture.id),false);
 assert.equal(core.newState(mixed,null,()=>.9999,true).ids.includes(picture.id),true);
});

test('the two equally likely intervals average 5.5 rooms and preserve the spacing over a long mixed run',()=>{
 let seed=7123;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 let cooldown=core.nextForgeryCooldown(random),last=0,intervals=[];
 for(let i=1;i<=100000;i++){const plan=core.forgeryPlan(cooldown,random);if(plan.generate){intervals.push(i-last);last=i;}cooldown=plan.cooldown;}
 assert.ok(intervals.every(value=>value===5||value===6));
 assert.ok(Math.abs(intervals.reduce((a,b)=>a+b,0)/intervals.length-5.5)<.02);
 assert.equal(core.nextForgeryCooldown(()=>.4999),4);assert.equal(core.nextForgeryCooldown(()=>.5),5);
});
const ki=require('../services/kunst-kurator/lib/kunst-ki.js');
test('forgery recognition records first and second marking independently of assignment correction and survives restore',()=>{
 let state=solved();const id=state.ids[0];state.forgery={id,image:'data:image/jpeg;base64,/9j/'};
 state=core.inspect(state,pool).state;state.forgeryMarks={[id]:true};state=core.inspect(state,pool).state;
 assert.equal(ki.forgeryInfo(state).firstMarked,false);assert.match(ki.forgeryComment(ki.forgeryInfo(state)),/späteren Prüfung/);
 assert.equal(ki.forgeryInfo(core.restore(state,pool)).firstMarked,false);
 const input=ki.payload(state,{events:[]});assert.equal(ki.validatePayload(input,pool).room.forgery.firstMarked,false);
 assert.ok(!JSON.stringify(input).includes('data:image'));
});
test('first-check recognition is not inferred from the total number of assignment attempts',()=>{let state=solved();const id=state.ids[0];state.forgery={id,image:'data:image/jpeg;base64,/9j/'};state.forgeryMarks={[id]:true};state=core.inspect(state,pool).state;assert.match(ki.forgeryComment(ki.forgeryInfo(state)),/ersten Prüfung/);delete state.attemptLog[0].forgeryMarks;assert.match(ki.forgeryComment(ki.forgeryInfo(state)),/nicht gespeichert/);});

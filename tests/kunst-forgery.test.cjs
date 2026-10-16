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
test('a mandatory text model writes a style-grounded prompt before eight-step Cloudflare generation',async()=>{
 const calls=[],res=response();
 const prompt='Period-authentic pointillist painting, with the entire image constructed from separated tiny pigment dots and optical colour mixing. '.repeat(5);
 await createHandler({env:{FORGERY_ENABLED:'true',CLOUDFLARE_ACCOUNT_ID:'account',CLOUDFLARE_API_TOKEN:'secret',GROQ_API_KEY:'text-secret'},works:pool,knowledge:{styles:{[pool[0].style]:{clues:['separated pigment dots']}}},fetcher:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>url.includes('groq.com')?{choices:[{message:{content:JSON.stringify({style:'Clearly separated tiny pigment dots, no smooth gradients.',prompt})}}]}:{result:{image:'/9j/'}}};}})({method:'POST',headers:{origin:'https://genaiedu.github.io','content-type':'application/json'},body:{id:pool[0].id}},res);
 assert.equal(res.code,200);assert.equal(calls.length,2);assert.equal(calls[0].body.reasoning_effort,'low');assert.match(calls[0].body.messages[1].content,/separated pigment dots/);assert.equal(calls[1].body.steps,8);assert.match(calls[1].body.prompt,/separated tiny pigment dots/);assert.doesNotMatch(calls[1].body.prompt,/Painted artwork/);assert.equal(res.body.image,'data:image/jpeg;base64,/9j/');assert.ok(res.body.prompt);
});
test('missing text credentials never silently fall back to a generic image prompt',async()=>{const res=response();await createHandler({env:{FORGERY_ENABLED:'true',CLOUDFLARE_ACCOUNT_ID:'account',CLOUDFLARE_API_TOKEN:'secret'},fetcher:()=>{throw Error('no call')}})({method:'POST',headers:{origin:'https://genaiedu.github.io'}},res);assert.equal(res.code,503);});

test('even constant winning randomness cannot insert more than one forgery in any twenty consecutive rooms',()=>{let cooldown=19,rooms=[];for(let i=0;i<1000;i++){const plan=core.forgeryPlan(cooldown,()=>0);rooms.push(plan.generate);cooldown=plan.generate?19:plan.cooldown;}for(let i=0;i<981;i++)assert.ok(rooms.slice(i,i+20).filter(Boolean).length<=1);assert.equal(rooms.filter(Boolean).length,50);});
test('randomness can produce entirely original rooms even after the cooldown expires',()=>assert.equal(core.forgeryPlan(0,()=>.8).generate,false));

test('the five percent random threshold never selects larger random values',()=>{assert.equal(core.forgeryPlan(0,()=>.049).generate,true);assert.equal(core.forgeryPlan(0,()=>.05).generate,false);});

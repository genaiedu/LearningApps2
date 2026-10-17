const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ki=require('../services/kunst-kurator/lib/kunst-ki.js');
const core=require('../scripts/kunsttresor-core.js'),progress=require('../scripts/kunsttresor-progress.js');
const {createHandler}=require('../services/kunst-kurator/api/feedback.js');
const archive=require('../data/kunstarchiv.json'),titles=require('../data/kunst-titel-de.json'),wiki=require('../data/kunst-wikipedia.json');
const pool=archive.works.map(work=>({...work,titleDe:titles.titles[work.id],artistIdentity:wiki.artists[work.artist].language+':'+wiki.artists[work.artist].title}));
const sources={pool,knowledge:require('../data/kunst-glossar.json'),curator:require('../scripts/kunst-kurator.js')};
const env={GROQ_API_KEY:'gsk_PRIVATE_SECRET_NEVER_LOG',AI_ENABLED:'true'};
function input(wall=false) {
  let engine=core;
  if(wall){const sandbox=vm.createContext({KunstWallEnabled:true});vm.runInContext(fs.readFileSync(require.resolve('../scripts/kunsttresor-core.js'),'utf8'),sandbox);engine=sandbox.KunstTresor;}
  let state=engine.newState(pool);
  for(const id of state.ids)for(const field of engine.fieldsFor(state))state=engine.choose(state,id,field,pool.find(work=>work.id===id)[field]);
  return ki.payload(engine.inspect(state,pool).state,progress.fresh());
}
function answer(ids) {return {intro:'Wir betrachten die Werke gemeinsam noch einmal und achten auf ihre unterschiedlichen Bildsprachen.',works:ids.map(id=>({id,text:'Deine Zuordnung ist ein guter Anlass für einen neuen Blick. Vergleiche die sichtbaren Einzelheiten mit den redaktionellen Erläuterungen zu Stil und Technik.'}))};}
function good(ids) {return {ok:true,text:async()=>JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(answer(ids))}}]})};}
function bad(status,code='server_error',retryAfter=null) {return {ok:false,status,headers:{get:()=>retryAfter},text:async()=>JSON.stringify({error:{code,type:'PRIVATE_PLAYER_DATA',message:'gsk_PRIVATE_SECRET_NEVER_LOG PRIVATE_PLAYER_DATA'}})};}
function req(body) {return {method:'POST',headers:{origin:'https://genaiedu.github.io','content-type':'application/json','x-forwarded-for':'PRIVATE_PLAYER_IP'},body};}
function res() {return {headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
function fixture(fetcher,options={}) {
  const logs=[],waits=[];
  const handler=createHandler({env,sources,fetcher,logger:{warn:(tag,entry)=>logs.push({tag,...entry})},wait:async ms=>{waits.push(ms);},...options});
  return {handler,logs,waits};
}
test('normal success never waits or logs player data and the room is cached',async()=>{
  const body=input();let calls=0;const f=fixture(async()=>{calls++;return good(body.room.ids);});
  for(let i=0;i<2;i++){const output=res();await f.handler(req(body),output);assert.equal(output.code,200);assert.equal(output.body.works.length,body.room.ids.length);}
  assert.equal(calls,1);assert.deepEqual(f.waits,[]);assert.deepEqual(f.logs,[]);
});
test('one transient provider failure is retried server-side and can recover',async()=>{
  const body=input();let calls=0;const f=fixture(async()=>++calls===1?bad(503):good(body.room.ids));
  const output=res();await f.handler(req(body),output);
  assert.equal(output.code,200);assert.equal(calls,2);assert.deepEqual(f.waits,[450]);
  assert.equal(f.logs.length,1);assert.equal(f.logs[0].event,'retry');assert.equal(f.logs[0].providerStatus,503);assert.equal(f.logs[0].providerCode,'server_error');
});
test('the seven-work five-field wall recovers and preserves every validated work',async()=>{
  const body=input(true);let calls=0;
  assert.equal(body.room.ids.length,7);assert.equal(body.room.fieldCount,5);
  const f=fixture(async(url,options)=>{const context=JSON.parse(JSON.parse(options.body).messages[1].content);
    assert.equal(context.works.length,7);return ++calls===1?bad(503):good(body.room.ids);});
  const output=res();await f.handler(req(body),output);assert.equal(output.code,200);assert.equal(calls,2);assert.deepEqual(output.body.works.map(work=>work.id),body.room.ids);
});
test('a permanently failing provider gets exactly two attempts and safe diagnostics',async()=>{
  const body=input();let calls=0;const f=fixture(async()=>{calls++;return bad(502,'gsk_PRIVATE_SECRET_NEVER_LOG');});
  const output=res();await f.handler(req(body),output);
  assert.equal(output.code,502);assert.equal(calls,2);assert.equal(output.body.reason,'unavailable');
  assert.deepEqual(f.logs.map(log=>log.event),['retry','failed']);assert.deepEqual(f.logs.map(log=>log.attempt),[1,2]);
  assert.equal(f.logs[0].reference,f.logs[1].reference);assert.equal(f.logs[1].reference,output.body.reference);
  const diagnostic=JSON.stringify({logs:f.logs,body:output.body});
  assert.doesNotMatch(diagnostic,/gsk_|PRIVATE|Authorization|choices|programText|roomToken|title|artist/);
  for(const id of body.room.ids)assert.ok(!diagnostic.includes(id));
  for(const log of f.logs)assert.equal(log.providerCode,'other');
});
test('authentication and invalid request errors are not retried',async()=>{
  for(const [status,code]of [[401,'invalid_api_key'],[403,'authentication_error'],[400,'invalid_request_error'],[404,'model_not_found']]){
    const body=input();let calls=0;const f=fixture(async()=>{calls++;return bad(status,code);});const output=res();await f.handler(req(body),output);
    assert.equal(output.code,502);assert.equal(calls,1);assert.equal(f.logs[0].providerCode,code);assert.deepEqual(f.waits,[]);
    assert.doesNotMatch(JSON.stringify(output.body),/invalid_api_key|model_not_found|gsk_/);
  }
});
test('a provider JSON-generation error may retry without weakening schema checks',async()=>{
  const body=input();let calls=0;const f=fixture(async()=>++calls===1?bad(400,'json_validate_failed'):good(body.room.ids));
  const output=res();await f.handler(req(body),output);assert.equal(output.code,200);assert.equal(calls,2);assert.equal(f.logs[0].providerCode,'json_validate_failed');
});
test('rate limits honor a short Retry-After and never retry through a long cooldown',async()=>{
  for(const [header,calls,delays]of [['0.8',2,[800]],['60',1,[]],[new Date(Date.now()+60000).toUTCString(),1,[]]]){
    const body=input();let count=0;const f=fixture(async()=>{count++;return bad(429,'rate_limit_exceeded',header);});
    const output=res();await f.handler(req(body),output);assert.equal(output.code,429);assert.equal(output.body.reason,'busy');
    assert.equal(count,calls);assert.deepEqual(f.waits,delays);assert.ok(Number(output.headers['Retry-After'])>=1);
  }
});
test('network errors, invalid model output and invented dates remain distinguishable and private',async()=>{
  const body=input();
  const errors=[
    ['network',async()=>{throw Error('PRIVATE_PLAYER_DATA '+env.GROQ_API_KEY);},'unavailable'],
    ['completion_json',async()=>({ok:true,text:async()=>'{ PRIVATE_PLAYER_DATA'}),'invalid_response'],
    ['incomplete',async()=>({ok:true,text:async()=>JSON.stringify({choices:[{finish_reason:'length',message:{content:'PRIVATE_PLAYER_DATA'}}]})}),'invalid_response'],
    ['response_validation',async()=>({ok:true,text:async()=>JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({...answer(body.room.ids),works:[]})}}]})}),'invalid_response'],
    ['unsupported_date',async()=>{const result=answer(body.room.ids);result.works[0].text+=' Im Jahr 9999.';return {ok:true,text:async()=>JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}]})};},'invalid_response']
  ];
  for(const [reason,fetcher,publicReason]of errors){const f=fixture(fetcher),output=res();await f.handler(req(body),output);
    assert.equal(output.code,502);assert.equal(output.body.reason,publicReason);assert.equal(f.logs.length,2);assert.equal(f.logs[1].reason,reason);
    assert.doesNotMatch(JSON.stringify({logs:f.logs,body:output.body}),/PRIVATE|gsk_|9999/);
  }
});
test('timeouts bound fetch and body reads even when abort is ignored',async()=>{
  for(const fetcher of [()=>new Promise(()=>{}),async()=>({ok:true,text:()=>new Promise(()=>{})})]){
    const body=input();let calls=0;const f=fixture((...args)=>{calls++;return fetcher(...args);},{attemptMs:8});
    const output=res();await f.handler(req(body),output);assert.equal(output.code,502);assert.equal(output.body.reason,'timeout');assert.equal(calls,2);assert.equal(f.logs[1].reason,'timeout');
  }
});
test('the retry cannot exceed the overall time budget',async()=>{
  const body=input();let time=0,calls=0;const f=fixture(async()=>{calls++;time=24950;return bad(503);},{now:()=>time});
  const output=res();await f.handler(req(body),output);assert.equal(output.code,502);assert.equal(calls,1);assert.deepEqual(f.waits,[]);
});
test('the local rate brake admits browser requests, not individual provider attempts',async()=>{
  const body=input();let calls=0;const f=fixture(async()=>{calls++;return bad(503);});
  for(let i=0;i<21;i++){const output=res();await f.handler(req(body),output);assert.equal(output.code,i===20?429:502);}
  assert.equal(calls,40);assert.equal(f.logs.at(-1).reason,'local_rate_limit');assert.equal(f.logs.at(-1).attempt,0);
  assert.doesNotMatch(JSON.stringify(f.logs),/PRIVATE_PLAYER_IP/);
});
test('the browser distinguishes safe failure reasons and never retries the whole two-attempt request',async()=>{
  const body=input();
  for(const reason of ['busy','timeout','invalid_response','unavailable','PRIVATE_PLAYER_DATA']){
    let calls=0;const client=ki.createClient({endpoint:'https://example.test',fetcher:async()=>{calls++;return {ok:false,status:502,text:async()=>JSON.stringify({reason,message:env.GROQ_API_KEY})};}});
    const output=await client.request(body,()=>{});assert.equal(calls,1);assert.equal(output.reason,reason==='PRIVATE_PLAYER_DATA'?'unavailable':reason);
    assert.match(ki.failureNotice(output.reason),/redaktionellen Kuratorenhinweise bleiben verfügbar/);assert.doesNotMatch(ki.failureNotice(output.reason),/PRIVATE|gsk_/);
  }
  for(const [fetcher,expected]of [[async()=>{throw Error('offline');},'network'],[async()=>({ok:true,text:async()=>'{bad'}),'invalid_response'],[async()=>({ok:false,status:400,text:async()=>'{bad'}),'invalid_request'],[async()=>({ok:false,status:429,text:async()=>'<html>Firewall</html>'}),'busy']]){
    const client=ki.createClient({endpoint:'https://example.test',fetcher});assert.equal((await client.request(body,()=>{})).reason,expected);
  }
  const js=fs.readFileSync(require.resolve('../scripts/kunsttresor.js'),'utf8');assert.match(js,/textContent=ki\.failureNotice\(result\.reason\)/);
});
test('closing during response-body reading prevents all late browser updates',async()=>{
  const body=input(),seen=[];let release;
  const client=ki.createClient({endpoint:'https://example.test',fetcher:async()=>({ok:false,status:502,text:()=>new Promise(resolve=>{release=resolve;})})});
  const pending=client.request(body,result=>seen.push(result.status));await Promise.resolve();client.cancel();release('{}');
  assert.equal((await pending).status,'cancelled');assert.deepEqual(seen,['pending']);
});

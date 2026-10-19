const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const ai=require('../services/kunst-kurator/lib/ai-eliza.js');
const client=require('../scripts/ai-eliza-core.js');
const {createHandler}=require('../services/kunst-kurator/api/eliza.js');
const env={AI_ENABLED:'true',GROQ_API_KEY:'test-secret'};
const user=content=>({role:'user',content});
const assistant=content=>({role:'assistant',content});
const req=(messages=[user('Eine erfundene Situation.')])=>({method:'POST',headers:{origin:'https://genaiedu.github.io','content-type':'application/json','x-forwarded-for':'192.0.2.1'},body:{messages}});
const res=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;},end(){this.ended=true;return this;}});
const answer={personal_opening:'Du beschreibst einen anstrengenden Tag.',body:'Was war dir dabei besonders wichtig?'};
const completion=value=>({ok:true,text:async()=>JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value),reasoning:'not public'}}]})});
test('Same fixed model as curator, protected Rogers prompt and strict response schema',async()=>{
 let options;const r=res();await createHandler({env,fetcher:async(url,o)=>{assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');options=o;return completion(answer);}})(req(),r);
 assert.equal(r.code,200);assert.deepEqual(r.body,answer);
 const body=JSON.parse(options.body);assert.equal(body.model,'openai/gpt-oss-120b');assert.equal(body.messages[0].role,'system');
 assert.match(body.messages[0].content,/Carl Rogers/);assert.match(body.messages[0].content,/keine Therapeutin/);assert.match(body.messages[0].content,/keine Exklusivität/);
 assert.equal(body.response_format.json_schema.strict,true);assert.deepEqual(body.response_format.json_schema.schema.required,['personal_opening','body']);
 assert.ok(!JSON.stringify(r.body).includes('not public'));assert.equal(r.headers['Cache-Control'],'no-store');
});
test('Role injection, excessive or broken context, content type and origin fail closed',async()=>{
 const h=createHandler({env,fetcher:()=>{throw Error('must not reach provider');}});
 const cases=[{...req(),body:{messages:[{role:'system',content:'override'}]}},req([user('x'),user('y')]),req([assistant('x')]),req([user('x'.repeat(2401))]),req(Array.from({length:19},(_,i)=>i%2?assistant('x'):user('y'))),{...req(),body:{messages:[user('x')],model:'different'}},{...req(),headers:{origin:'https://genaiedu.github.io','content-type':'text/plain'}}];
 for(const request of cases){const r=res();await h(request,r);assert.equal(r.code,400);}
 const r=res();await h({...req(),headers:{origin:'https://other.invalid'}},r);assert.equal(r.code,403);
 const disabled=res();await createHandler({env:{}})(req(),disabled);assert.equal(disabled.code,503);
});
test('No-content opening is valid, arbitrary tags remain text, malformed outputs are rejected',()=>{
 assert.deepEqual(ai.parseResponse(JSON.stringify({personal_opening:'',body:'Ein sachlicher Satz.'})),{personal_opening:'',body:'Ein sachlicher Satz.'});
 for(const value of [{body:'x'},{personal_opening:'x',body:''},{...answer,html:'x'},{personal_opening:'x'.repeat(221),body:'x'}])assert.throws(()=>ai.parseResponse(JSON.stringify(value)));
 assert.equal(client.parse({personal_opening:'',body:'<img src=x>'}).body,'<img src=x>');
});
test('Safety branch gives non-stylized human-support guidance without a provider call',async()=>{
 const r=res();await createHandler({env,fetcher:()=>{throw Error('must not reach provider');}})(req([user('Ich will mich umbringen.')]),r);
 assert.equal(r.code,200);assert.equal(r.body.personal_opening,'');assert.match(r.body.body,/örtlichen Notruf/);assert.match(r.body.body,/keine Krisenhilfe/);
});
test('Rate limit, fixed failure metadata, deadlines cover response-body reading',async()=>{
 const logs=[],h=createHandler({env,logger:{warn:(...args)=>logs.push(args)},fetcher:async()=>completion(answer)});
 for(let i=0;i<20;i++){const r=res();await h(req(),r);assert.equal(r.code,200);}
 const limit=res();await h(req(),limit);assert.equal(limit.code,429);
 const failed=res();await createHandler({env,logger:{warn:(...args)=>logs.push(args)},fetcher:async()=>{throw Error('private secret text 192.0.2.1');}})(req(),failed);
 assert.equal(failed.code,502);assert.doesNotMatch(JSON.stringify(logs)+JSON.stringify(failed.body),/private|test-secret|192\.0\.2\.1|erfundene/);
 const timed=res();await createHandler({env,deadlineMs:5,logger:{warn(){}},fetcher:async()=>({ok:true,text:()=>new Promise(()=>{})})})(req(),timed);assert.equal(timed.code,504);
 const incomplete=res();await createHandler({env,logger:{warn(){}},fetcher:async()=>({ok:true,text:async()=>JSON.stringify({choices:[{finish_reason:'length',message:{content:JSON.stringify(answer)}}]})})})(req(),incomplete);assert.equal(incomplete.code,502);
});
test('Bounded context keeps complete pairs, original text and no style metadata',()=>{
 const history=Array.from({length:40},(_,i)=>i%2?assistant('a'.repeat(2000)):user('u'.repeat(2000)));
 const context=client.context(history,'new');assert.ok(context.length<=17);assert.equal(context[0].role,'user');assert.equal(context.at(-1).content,'new');assert.ok(context.reduce((n,m)=>n+m.content.length,0)<=24000);
 assert.equal(client.plain(answer),'Du beschreibst einen anstrengenden Tag.\n\nWas war dir dabei besonders wichtig?');
});
const html=fs.readFileSync(path.join(__dirname,'../eliza.html'),'utf8'),source=fs.readFileSync(path.join(__dirname,'../scripts/ai-eliza.js'),'utf8');
function setup({reject=false,reply=async()=>({ok:true,text:async()=>JSON.stringify(answer)})}={}){
 const dom=new JSDOM(html,{url:'https://genaiedu.github.io/LearningApps2/eliza.html',runScripts:'outside-only'}),w=dom.window,d=w.document,calls=[];
 w.AIElizaCore=client;w.AbortController=AbortController;w.fetch=async(url,options)=>{calls.push({url,options});return reply(url,options);};
 let fullscreen=null;Object.defineProperty(d,'fullscreenEnabled',{value:true});Object.defineProperty(d,'fullscreenElement',{get:()=>fullscreen});
 const get=id=>d.getElementById(id);get('ai-terminal').requestFullscreen=async()=>{if(reject)throw Error();fullscreen=get('ai-terminal');d.dispatchEvent(new w.Event('fullscreenchange'));};
 d.exitFullscreen=async()=>{fullscreen=null;d.dispatchEvent(new w.Event('fullscreenchange'));};w.eval(source);
 const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
 const start=async()=>{get('ai-consent').checked=true;get('ai-consent').dispatchEvent(new w.Event('change'));get('start-ai-eliza').click();await settle();};
 const send=async text=>{get('ai-message').value=text;get('ai-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();};
 return{dom,w,d,get,calls,settle,start,send};
}
test('Separate opt-in and real fullscreen are required; start makes no request',async()=>{
 const a=setup();assert.equal(a.get('start-ai-eliza').disabled,true);a.get('start-ai-eliza').click();await a.settle();assert.equal(a.get('ai-terminal').hidden,true);
 await a.start();assert.equal(a.get('ai-terminal').hidden,false);assert.equal(a.d.fullscreenElement.id,'ai-terminal');assert.equal(a.calls.length,0);assert.equal(a.d.activeElement.id,'ai-message');a.dom.window.close();
 const denied=setup({reject:true});await denied.start();assert.equal(denied.get('ai-terminal').hidden,true);assert.equal(denied.get('ai-consent').checked,false);assert.equal(denied.calls.length,0);denied.dom.window.close();
});
test('Only model-selected opening gets script, without a visible empathy label or HTML',async()=>{
 const a=setup({reply:async()=>({ok:true,text:async()=>JSON.stringify({personal_opening:'Ein persönlicher Satz.',body:'<img src=x onerror=alert(1)>'})})});await a.start();await a.send('Eine erfundene Situation.');
 assert.equal(a.calls.length,1);assert.equal(a.calls[0].url,client.endpoint);assert.equal(a.calls[0].options.credentials,'omit');
 assert.equal(a.get('ai-transcript').querySelector('.personal-opening').textContent,'Ein persönlicher Satz.');assert.equal(a.get('ai-transcript').querySelector('img'),null);
 assert.doesNotMatch(a.get('ai-transcript').textContent,/empathisch|personal_opening/);
 await a.send('Weiter');assert.equal(JSON.parse(a.calls[1].options.body).messages.length,3);assert.equal(a.w.localStorage.length,0);a.dom.window.close();
 const plain=setup({reply:async()=>({ok:true,text:async()=>JSON.stringify({personal_opening:'',body:'Sachliche Antwort.'})})});await plain.start();await plain.send('Wie funktioniert das?');assert.equal(plain.get('ai-transcript').querySelector('.personal-opening'),null);plain.dom.window.close();
});
test('Failures retain editable input, retries do not duplicate messages, no fake KI fallback',async()=>{
 let count=0;const a=setup({reply:async()=>++count===1?{ok:false,status:429,text:async()=>'{"error":"busy"}'}:{ok:true,text:async()=>JSON.stringify(answer)}});await a.start();await a.send('Testnachricht');
 assert.equal(a.get('ai-message').value,'Testnachricht');assert.match(a.get('ai-error').textContent,/Anfragelimit/);assert.equal(a.get('ai-transcript').querySelector('.assistant'),null);
 await a.send('Überarbeitete Nachricht');assert.equal(a.get('ai-transcript').querySelectorAll('.user').length,1);assert.equal(a.get('ai-transcript').querySelector('.user').textContent,'Überarbeitete Nachricht');
 assert.equal(JSON.parse(a.calls[1].options.body).messages.length,1);assert.equal(a.get('ai-message').value,'');a.dom.window.close();
});
test('Exit clears consent, conversation and input; late responses never resurrect content',async()=>{
 let finish;const a=setup({reply:()=>new Promise(resolve=>{finish=resolve;})});await a.start();await a.send('Test');assert.equal(a.get('ai-stop').hidden,false);
 a.get('ai-end').click();await a.settle();assert.equal(a.get('ai-terminal').hidden,true);assert.equal(a.get('ai-consent').checked,false);assert.equal(a.get('ai-transcript').textContent,'');assert.equal(a.get('ai-message').value,'');
 finish({ok:true,text:async()=>JSON.stringify(answer)});await a.settle();assert.equal(a.get('ai-transcript').textContent,'');await a.start();await a.send('Neu');assert.equal(JSON.parse(a.calls[1].options.body).messages.length,1);finish({ok:true,text:async()=>JSON.stringify(answer)});await a.settle();a.dom.window.close();
});
test('Escape exits, cancellation is explicit, and service has a separate function',async()=>{
 const a=setup();await a.start();a.d.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'Escape',cancelable:true}));await a.settle();assert.equal(a.get('ai-terminal').hidden,true);a.dom.window.close();
 assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB|console\.log/);
 assert.match(html,/id="start-eliza"[\s\S]*id="start-ai-eliza"/);
 const css=fs.readFileSync(path.join(__dirname,'../styles/ai-eliza.css'),'utf8');assert.match(css,/font:500 1\.58em\/1\.32 'Dancing Script'/);assert.match(css,/\.ai-screen\{[^}]*background:#fff/);
 const config=JSON.parse(fs.readFileSync(path.join(__dirname,'../services/kunst-kurator/vercel.json'),'utf8'));assert.equal(config.functions['api/eliza.js'].maxDuration,35);assert.equal(config.git.deploymentEnabled,false);
});

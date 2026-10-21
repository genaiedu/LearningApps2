const test=require('node:test'),assert=require('node:assert/strict');
const film=require('../services/kunst-kurator/lib/kunst-film-ki.js');
const {createHandler}=require('../services/kunst-kurator/api/feedback.js');
const pool=require('../data/kunstarchiv.json').works,knowledge=require('../data/kunst-glossar.json');
const ids=pool.slice(0,8).map(w=>w.id),input=()=>film.payload(ids,12);
const answer=()=>({motto:'Verschiedene Materialien, verschiedene Wege zu einem eigenen Blick.',works:ids.map((id,i)=>({id,text:['Das Material ist kein stummer Träger: Es entscheidet mit, wie ein Bild entsteht.','Ein Druck macht aus einer Vorlage mehrere Begegnungen mit demselben Werk.','Nicht jede Tradition folgt denselben Vorstellungen von Raum und Wirklichkeit.','Was als Augenblick beginnt, bleibt als sorgfältig gestaltete Fläche erhalten.','Zwischen handwerklichem Verfahren und Bildidee liegt kein sauberer Trennstrich.','Eine andere Arbeitsweise verändert auch die Möglichkeiten des Ausdrucks.','Das Datum ordnet ein Werk ein; es erklärt noch nicht seine ganze Wirkung.','Am Ende steht kein gemeinsamer Stil, sondern eine bewusst gewählte Nachbarschaft.'][i]}))});
const env={GROQ_API_KEY:'synthetic-secret-never-output',AI_ENABLED:'true'};
function req(body){return {method:'POST',headers:{origin:'https://genaiedu.github.io','content-type':'application/json'},body};}
function res(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
function response(value=answer()){return {ok:true,text:async()=>JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]})};}
function fixture(fetcher,options={}){return createHandler({env,sources:{pool,knowledge},fetcher,logger:{warn(){}},wait:async()=>{},...options});}

test('film payload permits only public known ordered IDs and a bounded one-request variation',()=>{
 assert.deepEqual(film.validatePayload(input(),pool),input());
 for(const change of [x=>x.ids.pop()&&x.ids.splice(0,2),x=>x.ids.push(...ids),x=>x.ids[1]=x.ids[0],x=>x.ids[0]='outside',x=>x.prompt='my private text',x=>x.variation=-1,x=>x.variation=1000001]){const bad=input();change(bad);assert.throws(()=>film.validatePayload(bad,pool));}
 const context=film.context(input(),pool,knowledge);assert.deepEqual(context.works.map(w=>w.id),ids);assert.doesNotMatch(JSON.stringify(context),/roomToken|choices|learner|answers|galleryName/);
});
test('film response is complete, short, unique and literal text, in original order',()=>{
 const value=answer();value.works.reverse();assert.deepEqual(film.parseResponse(value,ids).works.map(w=>w.id),ids);
 for(const change of [x=>x.works.pop(),x=>x.works[1].id=x.works[0].id,x=>x.works[0].id='outside',x=>x.works[0].text='<img src=x>',x=>x.works[0].text='W'.repeat(151),x=>x.works[0].text='wort '.repeat(25),x=>x.works[1].text=x.works[0].text,x=>x.motto='W'.repeat(111),x=>x.secret='no']){const bad=answer();change(bad);assert.throws(()=>film.parseResponse(bad,ids));}
});
test('same protected feedback endpoint uses an independent film prompt and strict schema',async()=>{
 let calls=0;const handler=fixture(async(url,options)=>{calls++;const body=JSON.parse(options.body);assert.equal(body.model,'openai/gpt-oss-120b');assert.equal(body.response_format.json_schema.name,'art_film_captions');assert.equal(body.messages[0].content,film.instructions);assert.deepEqual(JSON.parse(body.messages[1].content).works.map(w=>w.id),ids);return response();});
 for(let i=0;i<2;i++){const out=res();await handler(req(input()),out);assert.equal(out.code,200);assert.equal(out.body.works.length,8);}assert.equal(calls,1);
 const out=res();await handler(req({...input(),variation:13}),out);assert.equal(out.code,200);assert.equal(calls,2);
});
test('invalid requests never call provider; unknown dates and malformed answers never reach the film',async()=>{
 let calls=0;let handler=fixture(async()=>{calls++;return response();});const denied=res();await handler(req({...input(),freeText:'private'}),denied);assert.equal(denied.code,400);assert.equal(calls,0);
 for(const mutate of [x=>x.works[0].text='Dies entstand im Jahr 9999.',x=>x.works.pop(),x=>x.motto='Im Jahr 9999 wird alles anders.']){const value=answer();mutate(value);handler=fixture(async()=>response(value));const out=res();await handler(req(input()),out);assert.equal(out.code,502);assert.equal(out.body.reason,'invalid_response');}
});
test('origin, opt-out and the existing request quota also cover film generation',async()=>{
 let calls=0;const handler=fixture(async()=>{calls++;return response();});const foreign=res();await handler({...req(input()),headers:{origin:'https://foreign.test'}},foreign);assert.equal(foreign.code,403);assert.equal(calls,0);
 const disabled=res();await fixture(async()=>{throw Error('must not run');},{env:{...env,AI_ENABLED:'false'}})(req(input()),disabled);assert.equal(disabled.code,503);
 for(let i=0;i<21;i++){const out=res();await handler(req({...input(),variation:i}),out);assert.equal(out.code,i===20?429:200);}assert.equal(calls,20);
});
test('browser generates only on request and handles invalid, offline, timeout and cancelled responses safely',async()=>{
 let calls=0;const client=film.createClient({endpoint:'https://example.test',fetcher:async()=>{calls++;return {ok:true,text:async()=>JSON.stringify(answer())};}});assert.equal(calls,0);assert.equal((await client.request(input())).status,'ready');assert.equal(calls,1);
 for(const [fetcher,reason]of [[async()=>({ok:true,text:async()=>'{broken'}),'invalid_response'],[async()=>{throw Error('sensitive');},'network'],[async()=>({ok:false,status:429}),'busy'],[()=>new Promise(()=>{}),'timeout']]){const f=film.createClient({endpoint:'https://example.test',fetcher,timeoutMs:8});assert.equal((await f.request(input())).reason,reason);assert.doesNotMatch(film.failureNotice(reason),/sensitive/);}
 let release;const slow=film.createClient({endpoint:'https://example.test',fetcher:()=>new Promise(r=>{release=r;})});const pending=slow.request(input());slow.cancel();assert.equal((await pending).status,'cancelled');release({ok:true,text:async()=>JSON.stringify(answer())});
});

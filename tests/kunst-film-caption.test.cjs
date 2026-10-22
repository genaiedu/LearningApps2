const test=require('node:test'),assert=require('node:assert/strict');
const film=require('../services/kunst-kurator/lib/kunst-film-ki.js'),{createHandler}=require('../services/kunst-kurator/api/feedback.js');
const pool=require('../data/kunstarchiv.json').works,knowledge=require('../data/kunst-glossar.json');
const input=(withMotto=false)=>film.captionPayload(pool[0].id,21,3,withMotto);
const req=body=>({method:'POST',headers:{origin:'https://genaiedu.github.io','content-type':'application/json'},body});
const res=()=>({setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
const draft=(body=input())=>({text:'Das Material trägt das Bild nicht nur: Es bestimmt seine Möglichkeiten mit.',fact:film.captionContext(body,pool,knowledge).work.facts[0],...(body.withMotto?{motto:'Ein neuer Blick beginnt beim Material.'}:{})});
const response=value=>({ok:true,text:async()=>JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]})});
const fixture=(fetcher,options={})=>createHandler({env:{AI_ENABLED:'true',GROQ_API_KEY:'synthetic-only'},sources:{pool,knowledge},logger:{warn(){}},wait:async()=>{},fetcher,...options});
test('single-picture payload admits one known public ID only, never free prompts or personal texts',()=>{
 assert.deepEqual(film.validateCaptionPayload(input(),pool),input());
 for(const edit of [x=>x.id='unknown',x=>x.ids=[pool[1].id],x=>x.prompt='PRIVATE',x=>x.position=10,x=>x.position=-1,x=>x.variation=1000001,x=>x.withMotto='yes']){const bad=input();edit(bad);assert.throws(()=>film.validateCaptionPayload(bad,pool));}
 const context=film.captionContext(input(),pool,knowledge);assert.equal(context.work.id,pool[0].id);assert.equal(context.works,undefined);assert.doesNotMatch(JSON.stringify(context),/PRIVATE|learner|roomToken/);
 assert.match(film.captionInstructions,/GENAU EINE/);assert.match(film.captionInstructions,/keine Nummerierung/);assert.match(film.captionInstructions,/Antwort 1/);
 const schema=film.captionSchema(context);assert.deepEqual(schema.properties.fact.enum,context.work.facts);assert.equal(schema.properties.text.maxLength,150);assert.equal(schema.additionalProperties,false);
});
test('one normal request means one model prompt about one work, no batch or second review',async()=>{
 let calls=0;const handler=fixture(async(url,options)=>{calls++;const body=JSON.parse(options.body);assert.equal(body.response_format.json_schema.name,'art_film_caption');assert.equal(body.reasoning_effort,'low');assert.equal(body.messages[0].content,film.captionInstructions);const context=JSON.parse(body.messages[1].content);assert.equal(context.work.id,pool[0].id);assert.equal(context.works,undefined);return response(draft());});
 const out=res();await handler(req(input()),out);assert.equal(out.code,200);assert.equal(calls,1);assert.deepEqual(out.body,{id:pool[0].id,text:draft().text});
 const cached=res();await handler(req(input()),cached);assert.equal(calls,1);assert.deepEqual(cached.body,out.body);
});
test('optional motto belongs only to the explicit single-work request',async()=>{
 const body=input(true),out=res();await fixture(async()=>response(draft(body)))(req(body),out);assert.equal(out.code,200);assert.equal(out.body.motto,draft(body).motto);
 assert.throws(()=>film.parseCaptionGenerated({...draft(),motto:'Unexpected'},input(),film.captionContext(input(),pool,knowledge)));
});
test('numbered editorial labels never reach fields; malformed or unsupported content is rejected',()=>{
 const body=input(),context=film.captionContext(body,pool,knowledge);
 assert.equal(film.parseCaptionGenerated({...draft(),text:'Antwort 1: Vorschlag 2: '+draft().text},body,context).text,draft().text);
 for(const edit of [x=>x.fact='invented',x=>x.text='<script>bad</script>',x=>x.text='W'.repeat(151),x=>x.text='wort '.repeat(25),x=>x.text=context.work.artist+' malte das.',x=>x.extra='private']){const bad=draft();edit(bad);assert.throws(()=>film.parseCaptionGenerated(bad,body,context));}
 assert.throws(()=>film.parseCaptionResponse({id:pool[1].id,text:draft().text},body));
});
test('server retains date safety and never sends invalid single-picture text to the browser',async()=>{
 for(const value of [{...draft(),text:'Dieses Werk entstand 9999.'},{...draft(),fact:'invented'}]){let calls=0;const out=res();await fixture(async()=>{calls++;return response(value);})(req(input()),out);assert.equal(out.code,502);assert.equal(out.body.reason,'invalid_response');assert.equal(out.body.text,undefined);assert.equal(calls,2);}
 let calls=0;const out=res();await fixture(async()=>{calls++;return response(draft());})(req({...input(),privateText:'PRIVATE'}),out);assert.equal(out.code,400);assert.equal(calls,0);
});
test('client adopts a single response and preserves safe service failure reasons',async()=>{
 const body=input(),client=film.createClient({endpoint:'https://example.test',fetcher:async()=>({ok:true,text:async()=>JSON.stringify({id:body.id,text:'Antwort 1: '+draft().text})})});assert.deepEqual((await client.request(body)).data,{id:body.id,text:draft().text});
 const failed=film.createClient({endpoint:'https://example.test',fetcher:async()=>({ok:false,status:502,text:async()=>JSON.stringify({reason:'invalid_response'})})});assert.equal((await failed.request(body)).reason,'invalid_response');
 assert.match(film.failureNotice('invalid_response',2),/2 bereits eingesetzte Texte bleiben gespeichert/);
});

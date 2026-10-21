'use strict';
const {createHash,randomUUID}=require('node:crypto');
const ki=require('../lib/kunst-ki.js');
const filmKi=require('../lib/kunst-film-ki.js');
const VERSION=7;
// One browser request owns both attempts. Keep the complete operation below
// Vercel's 30-second limit and the browser's 28-second deadline.
const TOTAL_MS=25000, ATTEMPT_MS=11500, RETRY_MS=450;
const providerCodes=new Set(['rate_limit_exceeded','rate_limit_error','insufficient_quota','invalid_api_key','authentication_error','invalid_request_error','model_not_found','model_decommissioned','json_validate_failed','server_error','service_unavailable']);
const finishReasons=new Set(['stop','length','content_filter','tool_calls','function_call']);
class FeedbackFailure extends Error {
  constructor(reason,{retryable=false,status=0,code='none',finish='none',delay=RETRY_MS}={}) {
    super(reason);Object.assign(this,{reason,retryable,status,code,finish,delay});
  }
}
function retryDelay(value,time) {
  if(!value)return RETRY_MS;
  const seconds=Number(value),date=Date.parse(value);
  return Number.isFinite(seconds)?Math.max(0,seconds*1000):Number.isFinite(date)?Math.max(0,date-time):RETRY_MS;
}

function loadSources() {
  const archive=require('../generated/kunstarchiv.json'), knowledge=require('../generated/kunst-glossar.json');
  const titles=require('../generated/kunst-titel-de.json'), wiki=require('../generated/kunst-wikipedia.json');
  const core=require('../generated/kunsttresor-core.js');
  const pool=archive.works.map(work=>core.normalizeArtistWork({...work,titleDe:titles.titles[work.id],artistIdentity:wiki.artists[work.artist].language+':'+wiki.artists[work.artist].title}));
  return {pool,knowledge,curator:require('../generated/kunst-kurator.js')};
}
function createHandler({env=process.env,fetcher=globalThis.fetch,sources,now=Date.now,logger=console,
  wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attemptMs=ATTEMPT_MS,totalMs=TOTAL_MS}={}) {
  const windows=new Map(), cache=new Map();
  function rateAllowed(ip) {
    const time=now();
    for (const [key,value] of windows) if (time-value.at>600000) windows.delete(key);
    const entry=windows.get(ip) || {at:time,count:0};
    if (entry.count>=20 || windows.size>=2000 && !windows.has(ip)) return false;
    entry.count++; windows.set(ip,entry); return true;
  }
  return async function handler(req,res) {
    const origin=req.headers.origin;
    const allowed=(env.ALLOWED_ORIGINS || 'https://genaiedu.github.io').split(',').map(value=>value.trim()).filter(Boolean);
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Vary','Origin');
    if (allowed.includes(origin)) { res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type'); }
    const send=(status,body)=>res.status(status).json(body);
    if (req.method==='GET') return send(200,{service:'kunst-kurator',version:VERSION,roomSizes:[4,7],fieldCounts:[4,5],filmCaptions:true,ready:Boolean(env.GROQ_API_KEY && env.AI_ENABLED==='true')});
    if (!allowed.includes(origin)) return send(403,{error:'origin'});
    if (req.method==='OPTIONS') return res.status(204).end();
    if (req.method!=='POST') return send(405,{error:'method'});
    if (env.AI_ENABLED!=='true' || !env.GROQ_API_KEY) return send(503,{error:'local_feedback_available',reason:'unavailable'});
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '') || Number(req.headers['content-length'])>48000) return send(413,{error:'payload'});
    let input,context,filmMode=false;
    try {
      const raw=typeof req.body==='string' ? req.body : JSON.stringify(req.body);
      if (!raw || Buffer.byteLength(raw)>48000) throw Error('size');
      input=JSON.parse(raw);
      const verified=sources || loadSources();filmMode=input?.kind==='film';
      context=filmMode?filmKi.context(input,verified.pool,verified.knowledge):ki.context(input,verified.pool,verified.knowledge,verified.curator);
      input=filmMode?filmKi.validatePayload(input,verified.pool):ki.validatePayload(input,verified.pool);
    } catch { return send(400,{error:'invalid_game_result'}); }
    const digest=createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const known=cache.get(digest);
    if (known && now()-known.at<900000) return send(200,known.value);
    const ip=String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const started=now(),reference=randomUUID();
    // Never log raw errors, provider bodies, keys, IPs, prompts, works or answers.
    // All diagnostic values below are locally generated or allowlisted enums.
    function diagnose(event,attempt,failure) {
      logger.warn('kunst_curator_feedback', {version:VERSION,reference,event,attempt,
        reason:failure.reason,providerStatus:failure.status,providerCode:failure.code,finishReason:failure.finish,
        elapsedMs:Math.max(0,now()-started)});
    }
    if (!rateAllowed(ip)) {
      diagnose('failed',0,new FeedbackFailure('local_rate_limit'));
      res.setHeader('Retry-After','600');return send(429,{error:'busy',reason:'busy',reference});
    }
    async function generate(signal) {
      let response;
      try { response=await fetcher('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.GROQ_API_KEY},signal,redirect:'error',
        body:JSON.stringify({model:'openai/gpt-oss-120b',messages:[{role:'system',content:filmMode?filmKi.instructions:ki.instructions},{role:'user',content:JSON.stringify(context)}],
          response_format:{type:'json_schema',json_schema:{name:filmMode?'art_film_captions':'museum_curator',strict:true,schema:filmMode?filmKi.schema(input.ids):ki.schema(input.room.ids)}},
          temperature:filmMode ? .8 : .65,reasoning_effort:'low',max_completion_tokens:filmMode?3000:6000})
      }); } catch { throw new FeedbackFailure('network',{retryable:true}); }
      if (!response.ok) {
        let code='none';
        try {
          const raw=await response.text();
          if(raw.length<=12000){const error=JSON.parse(raw)?.error;code=[error?.code,error?.type].find(value=>providerCodes.has(value))||'other';}
        } catch { /* Never print or return the provider's message. */ }
        const status=Number.isInteger(response.status)&&response.status>=100&&response.status<=599?response.status:0;
        throw new FeedbackFailure('provider_http',{status,code,
          retryable:[408,429,500,502,503,504].includes(status)||status===400&&code==='json_validate_failed',delay:retryDelay(response.headers?.get('retry-after'),now())});
      }
      let raw;
      try { raw=await response.text(); } catch { throw new FeedbackFailure('network',{retryable:true}); }
      if (raw.length>60000) throw new FeedbackFailure('response_size',{retryable:true});
      let completion;
      try { completion=JSON.parse(raw); } catch { throw new FeedbackFailure('completion_json',{retryable:true}); }
      const choice=completion?.choices?.[0];
      if (choice?.finish_reason!=='stop') throw new FeedbackFailure('incomplete',{retryable:true,finish:finishReasons.has(choice?.finish_reason)?choice.finish_reason:'other'});
      let result;
      try { result=filmMode?filmKi.parseResponse(choice.message?.content,input.ids):ki.parseResponse(choice.message?.content,input.room.ids); }
      catch { throw new FeedbackFailure('response_validation',{retryable:true}); }
      // Catch invented four-digit dates in each work's personal paragraph.
      for (const work of result.works) {
        const source=context.works.find(item=>item.id===work.id);
        const years=new Set(JSON.stringify(source).match(/\b\d{4}\b/g) || []);
        if ((work.text.match(/\b\d{4}\b/g) || []).some(year=>!years.has(year))) throw new FeedbackFailure('unsupported_date',{retryable:true});
      }
      if(filmMode){const years=new Set(JSON.stringify(context).match(/\b\d{4}\b/g)||[]);if((result.motto.match(/\b\d{4}\b/g)||[]).some(year=>!years.has(year)))throw new FeedbackFailure('unsupported_date',{retryable:true});}
      return result;
    }
    for(let attempt=1;attempt<=2;attempt++) {
      const controller=new AbortController();let timeout;
      try {
        const deadline=new Promise((_,reject)=>{timeout=setTimeout(()=>{
          reject(new FeedbackFailure('timeout',{retryable:true}));controller.abort();
        },Math.min(attemptMs,Math.max(1,totalMs-(now()-started))));});
        const result=await Promise.race([generate(controller.signal),deadline]);
        cache.set(digest,{at:now(),value:result});while(cache.size>128)cache.delete(cache.keys().next().value);
        return send(200,result);
      } catch(error) {
        const failure=error instanceof FeedbackFailure?error:new FeedbackFailure('internal');
        const retry=attempt===1&&failure.retryable&&failure.delay<=2000&&totalMs-(now()-started)-failure.delay>=1000;
        diagnose(retry?'retry':'failed',attempt,failure);
        if(retry) { clearTimeout(timeout);await wait(failure.delay);continue; }
        if(failure.status===429)res.setHeader('Retry-After',String(Math.max(1,Math.ceil(failure.delay/1000))));
        const reason=failure.status===429?'busy':failure.reason==='timeout'?'timeout':
          ['response_size','completion_json','incomplete','response_validation','unsupported_date'].includes(failure.reason)?'invalid_response':'unavailable';
        return send(failure.status===429?429:502,{error:'local_feedback_available',reason,reference});
      } finally { clearTimeout(timeout); }
    }
  };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;

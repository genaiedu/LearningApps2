'use strict';
const {createHash}=require('node:crypto');
const ki=require('../lib/kunst-ki.js');

function loadSources() {
  const archive=require('../generated/kunstarchiv.json'), knowledge=require('../generated/kunst-glossar.json');
  const titles=require('../generated/kunst-titel-de.json'), wiki=require('../generated/kunst-wikipedia.json');
  const pool=archive.works.map(work=>({...work,titleDe:titles.titles[work.id],artistIdentity:wiki.artists[work.artist].language+':'+wiki.artists[work.artist].title}));
  return {pool,knowledge,curator:require('../generated/kunst-kurator.js')};
}
function createHandler({env=process.env,fetcher=globalThis.fetch,sources,now=Date.now}={}) {
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
    if (req.method==='GET') return send(200,{service:'kunst-kurator',version:2,ready:Boolean(env.GROQ_API_KEY && env.AI_ENABLED==='true')});
    if (!allowed.includes(origin)) return send(403,{error:'origin'});
    if (req.method==='OPTIONS') return res.status(204).end();
    if (req.method!=='POST') return send(405,{error:'method'});
    if (env.AI_ENABLED!=='true' || !env.GROQ_API_KEY) return send(503,{error:'local_feedback_available'});
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '') || Number(req.headers['content-length'])>12000) return send(413,{error:'payload'});
    let input,context;
    try {
      const raw=typeof req.body==='string' ? req.body : JSON.stringify(req.body);
      if (!raw || Buffer.byteLength(raw)>12000) throw Error('size');
      input=JSON.parse(raw);
      const verified=sources || loadSources(); context=ki.context(input,verified.pool,verified.knowledge,verified.curator);
      input=ki.validatePayload(input,verified.pool);
    } catch { return send(400,{error:'invalid_game_result'}); }
    const digest=createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const known=cache.get(digest);
    if (known && now()-known.at<900000) return send(200,known.value);
    const ip=String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (!rateAllowed(ip)) { res.setHeader('Retry-After','600'); return send(429,{error:'busy'}); }
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),18000);
    try {
      const response=await fetcher('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.GROQ_API_KEY},signal:controller.signal,redirect:'error',
        body:JSON.stringify({model:'openai/gpt-oss-120b',messages:[{role:'system',content:ki.instructions},{role:'user',content:JSON.stringify(context)}],
          response_format:{type:'json_schema',json_schema:{name:'museum_curator',strict:true,schema:ki.schema(input.room.ids)}},
          temperature:.85,max_completion_tokens:3000})
      });
      if (!response.ok) return send(response.status===429 ? 429 : 502,{error:'local_feedback_available'});
      const raw=await response.text(); if (raw.length>60000) throw Error('size');
      const completion=JSON.parse(raw),choice=completion.choices?.[0];
      if (choice?.finish_reason!=='stop') throw Error('incomplete');
      const result=ki.parseResponse(choice.message?.content,input.room.ids);
      // Catch invented four-digit dates in each work's personal paragraph.
      for (const work of result.works) {
        const source=context.works.find(item=>item.id===work.id);
        const years=new Set(JSON.stringify(source).match(/\b\d{4}\b/g) || []);
        if ((work.text.match(/\b\d{4}\b/g) || []).some(year=>!years.has(year))) throw Error('unsupported date');
      }
      cache.set(digest,{at:now(),value:result}); while(cache.size>128) cache.delete(cache.keys().next().value);
      return send(200,result);
    } catch { return send(502,{error:'local_feedback_available'}); }
    finally { clearTimeout(timeout); }
  };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;

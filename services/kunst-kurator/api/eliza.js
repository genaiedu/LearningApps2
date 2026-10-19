'use strict';
const {createHash}=require('node:crypto');
const ai=require('../lib/ai-eliza.js');
const VERSION=1;
function createHandler({env=process.env,fetcher=globalThis.fetch,now=Date.now,logger=console,deadlineMs=27000}={}){
 const windows=new Map();
 return async(req,res)=>{
  const origin=req.headers.origin,allowed=(env.ALLOWED_ORIGINS||'https://genaiedu.github.io').split(',').map(s=>s.trim());
  res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Origin');res.setHeader('X-Content-Type-Options','nosniff');
  const send=(status,value)=>res.status(status).json(value);
  if(allowed.includes(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');}
  if(req.method==='GET')return send(200,{version:VERSION,ready:env.AI_ENABLED==='true'&&Boolean(env.GROQ_API_KEY),model:'GPT-OSS 120B'});
  if(!allowed.includes(origin))return send(403,{error:'origin'});
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST')return send(405,{error:'method'});
  if(env.AI_ENABLED!=='true'||!env.GROQ_API_KEY)return send(503,{error:'unavailable'});
  let messages;
  try{
   if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw Error();
   const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);
   if(!raw||Buffer.byteLength(raw)>40000)throw Error();
   messages=ai.validateMessages(JSON.parse(raw));
  }catch{return send(400,{error:'invalid_messages'});}
  const safe=ai.safetyResponse(messages.at(-1).content);
  if(safe)return send(200,safe);
  const time=now();
  for(const [key,v]of windows)if(time-v.at>=600000)windows.delete(key);
  const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  // A short-lived digest only; never persist IPs, conversation text or provider bodies.
  const key=createHash('sha256').update(ip).digest('hex'),entry=windows.get(key)||{at:time,count:0};
  if(entry.count>=20||windows.size>=2000&&!windows.has(key)){res.setHeader('Retry-After','600');return send(429,{error:'busy'});}
  entry.count++;windows.set(key,entry);
  const controller=new AbortController();let timeout;
  const started=now();
  const warn=reason=>logger.warn('ai_eliza_failure',{version:VERSION,reason,elapsedMs:Math.max(0,now()-started)});
  try{
   const operation=(async()=>{
    const response=await fetcher('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+env.GROQ_API_KEY,'Content-Type':'application/json'},signal:controller.signal,redirect:'error',body:JSON.stringify({
     model:ai.MODEL,reasoning_effort:'low',temperature:.55,max_completion_tokens:3000,
     response_format:{type:'json_schema',json_schema:{name:'ai_eliza_response',strict:true,schema:ai.schema}},
     messages:[{role:'system',content:ai.instructions},...messages]
    })});
    if(!response.ok){const error=new Error('provider');error.providerStatus=response.status;throw error;}
    const raw=await response.text();if(raw.length>30000)throw Error('invalid_response');
    const completion=JSON.parse(raw),choice=completion.choices?.[0];
    if(choice?.finish_reason!=='stop')throw Error('invalid_response');
    return ai.parseResponse(choice.message?.content);
   })();
   const deadline=new Promise((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(Error('timeout'));},deadlineMs);});
   return send(200,await Promise.race([operation,deadline]));
  }catch(error){
   if(error.providerStatus===429){warn('provider_busy');return send(429,{error:'busy'});}
   const reason=['timeout','provider','invalid_response'].includes(error.message)?error.message:'invalid_response';
   warn(reason);return send(reason==='timeout'?504:502,{error:reason==='timeout'?'timeout':'provider'});
  }finally{clearTimeout(timeout);}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;

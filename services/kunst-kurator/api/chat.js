'use strict';
function createHandler({env=process.env,fetcher=globalThis.fetch,now=Date.now}={}) {
 const limits=new Map();
 return async(req,res)=>{
  const origin=req.headers.origin,allowed=(env.ALLOWED_ORIGINS||'https://genaiedu.github.io').split(',').map(s=>s.trim());
  res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Origin');res.setHeader('X-Content-Type-Options','nosniff');
  if(allowed.includes(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');}
  const send=(status,value)=>res.status(status).json(value);
  if(req.method==='GET')return send(200,{ready:env.AI_ENABLED==='true'&&Boolean(env.GROQ_API_KEY),model:'GPT-OSS 120B'});
  if(!allowed.includes(origin))return send(403,{error:'origin'});
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST')return send(405,{error:'method'});
  if(env.AI_ENABLED!=='true'||!env.GROQ_API_KEY)return send(503,{error:'unavailable'});
  let messages;
  try{
   if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw Error();
   const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);
   if(!raw||Buffer.byteLength(raw)>50000)throw Error();
   messages=JSON.parse(raw).messages;
   if(!Array.isArray(messages)||!messages.length||messages.length>21)throw Error();
   messages=messages.map((m,i)=>{
    if(m.role!==(i%2?'assistant':'user')||typeof m.content!=='string'||!m.content.trim()||m.content.length>(m.role==='user'?4000:12000))throw Error();
    return {role:m.role,content:m.content.trim()};
   });
   if(messages.at(-1).role!=='user')throw Error();
  }catch{return send(400,{error:'invalid_messages'});}
  const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim(),time=now();
  for(const [key,v]of limits)if(time-v.at>=600000)limits.delete(key);
  const quota=limits.get(ip)||{at:time,count:0};
  if(quota.count>=20||limits.size>=2000&&!limits.has(ip)){res.setHeader('Retry-After','600');return send(429,{error:'busy'});}
  quota.count++;limits.set(ip,quota);
  try{
   const response=await fetcher('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+env.GROQ_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(25000),redirect:'error',body:JSON.stringify({model:'openai/gpt-oss-120b',reasoning_effort:'low',temperature:.6,max_completion_tokens:4000,messages:[{role:'system',content:'Du bist ein hilfreicher, sachlicher Chatassistent. Antworte standardmäßig auf Deutsch, klar und knapp. Erkläre bei Bedarf genauer. Du hast keinen Internetzugang und kannst keine externen Aktionen ausführen. Behaupte niemals, im Internet recherchiert, Dateien geöffnet oder Handlungen ausgeführt zu haben. Benenne Unsicherheit ehrlich. Verwende gut lesbaren Klartext.'},...messages]})});
   if(!response.ok)return send(response.status===429?429:502,{error:response.status===429?'busy':'provider'});
   const value=await response.json(),choice=value.choices?.[0],answer=choice?.message?.content;
   if(typeof answer!=='string'||!answer.trim()||answer.length>12000||choice.finish_reason!=='stop')throw Error();
   return send(200,{answer:answer.trim()});
  }catch{return send(502,{error:'provider'});}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;

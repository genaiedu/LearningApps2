(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIElizaCore=factory();})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const endpoint='https://kunstkurator-dienst.vercel.app/api/eliza';
 function parse(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='body,personal_opening')throw Error('invalid');
  if(typeof value.personal_opening!=='string'||value.personal_opening.length>220||typeof value.body!=='string'||!value.body.trim()||value.body.length>2000)throw Error('invalid');
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value.personal_opening+value.body))throw Error('invalid');
  return {personal_opening:value.personal_opening.trim(),body:value.body.trim()};
 }
 function context(history,text){
  const pairs=history.slice(-16).map(m=>({role:m.role,content:m.content}));
  while(pairs.length&&pairs.reduce((n,m)=>n+m.content.length,0)+text.length>24000)pairs.splice(0,2);
  return [...pairs,{role:'user',content:text}];
 }
 function plain(answer){return [answer.personal_opening,answer.body].filter(Boolean).join('\n\n');}
 function message(status,error){
  if(status===429)return 'Der KI-Dienst ist gerade ausgelastet oder das Anfragelimit ist erreicht. Bitte warte einige Minuten. Deine Nachricht bleibt hier stehen.';
  if(error==='timeout'||status===504)return 'Die Antwort hat zu lange gedauert. Du kannst dieselbe Nachricht erneut senden oder das Gespräch beenden.';
  if(status===403)return 'Diese Webseitenadresse ist für den KI-Dienst nicht freigegeben. Bitte verwende die veröffentlichte ELIZA-Seite.';
  if(status===503)return 'Die KI-Version ist momentan nicht eingeschaltet. Die klassische ELIZA funktioniert weiterhin ohne Verbindung.';
  return 'Die KI konnte gerade keine gültige Antwort liefern. Deine Nachricht bleibt erhalten; du kannst sie erneut senden. Es wird keine lokale Antwort als KI-Antwort ausgegeben.';
 }
 return Object.freeze({endpoint,parse,context,plain,message});
});

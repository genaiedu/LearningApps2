(function(root){
  'use strict';
  const VERSION=1,taskIds=['hauch','koenig','freude','miteinander','wind-geist','zwei-vierundzwanzig','zeit','deutsch','sklaverei','tod','sabbat','feind','wissen','geschlecht','sukkot','schluss'];
  const fresh=()=>({version:VERSION,currentTask:'hauch',answers:{},reading:{work:'kohelet',unit:1,mode:'de'},slide:0});
  const clone=v=>JSON.parse(JSON.stringify(v));
  const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
  function keys(v,allowed){if(!plain(v)||Object.keys(v).some(k=>!allowed.includes(k)))throw Error('Die Sicherung enthält unbekannte Datenfelder.');}
  function validate(value){
    keys(value,['version','currentTask','answers','reading','slide']);
    if(value.version!==VERSION||!taskIds.includes(value.currentTask)||!Number.isInteger(value.slide)||value.slide<0||value.slide>=40)throw Error('Die Sicherung passt nicht zu „Kohelet & Gregor“.');
    keys(value.reading,['work','unit','mode']);
    const r=value.reading;if(!['kohelet','gregor'].includes(r.work)||!Number.isInteger(r.unit)||r.unit<1||r.unit>(r.work==='kohelet'?12:8)||!['de','parallel'].includes(r.mode))throw Error('Ungültige Leseposition.');
    keys(value.answers,taskIds);
    for(const [id,a] of Object.entries(value.answers)){
      keys(a,['text','checks','done']);
      if(typeof a.text!=='string'||a.text.length>20000||typeof a.done!=='boolean'||!Array.isArray(a.checks)||a.checks.length>4||a.checks.some(n=>!Number.isInteger(n)||n<0||n>=4)||new Set(a.checks).size!==a.checks.length)throw Error('Ungültige Antwort zu '+id+'.');
    }
    return clone(value);
  }
  const blankAnswer=()=>({text:'',checks:[],done:false});
  function backup(state){return {app:'kohelet-gregor',version:1,savedAt:Date.now(),data:validate(state)};}
  function restore(payload){keys(payload,['app','version','savedAt','data']);if(payload.app!=='kohelet-gregor'||payload.version!==1||!Number.isSafeInteger(payload.savedAt)||payload.savedAt<0)throw Error('Das ist keine gültige Sicherung für „Kohelet & Gregor“.');return validate(payload.data);}
  function answerText(state,tasks){validate(state);return 'Kohelet und Gregor · Meine Textarbeit\n\n'+tasks.map((t,i)=>`${i+1}. ${t.title}\n${t.texts.map(r=>r.label).join(' · ')}\n\n${state.answers[t.id]?.text||'[Noch keine Notizen]'}\n\nArbeitsstand: ${state.answers[t.id]?.done?'als abgeschlossen markiert':'offen'}\n`).join('\n');}
  const api={VERSION,taskIds,fresh,validate,blankAnswer,backup,restore,answerText};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KoheletCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);

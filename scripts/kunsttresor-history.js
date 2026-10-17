(function(root) {
  'use strict';
  const count=root.KunstWallEnabled?7:4,limit=root.KunstWallEnabled?3:2;
  const fields=['date','style','artist','technique','title'], MAX_ROOMS=10000;
  const fieldCount=state=>state?.options?.title?5:4;
  // Museum accession numbers (e.g. cma-1943.279) legitimately contain dots.
  const roomId=/^[a-f0-9]{32}$/, workId=/^[a-zA-Z0-9_.-]{1,128}$/;
  const time=value=>Number.isSafeInteger(value)&&value>=0&&value<=Date.now()+300000;
  const vector=(value,n)=>Array.isArray(value)&&value.length===count&&value.every(mask=>Number.isInteger(mask)&&mask>=0&&mask<(1<<n));
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  function fresh(since=Date.now()) {return {version:1,since,rooms:[]};}
  function restore(raw) {
    if(!raw||raw.version!==1||!time(raw.since)||!Array.isArray(raw.rooms)||raw.rooms.length>MAX_ROOMS)return null;
    const seen=new Set(), rooms=[];
    for(const entry of raw.rooms) {
      if(!entry||!roomId.test(entry.id)||seen.has(entry.id)||!time(entry.at)||!Array.isArray(entry.ids)||entry.ids.length!==count||new Set(entry.ids).size!==count||!entry.ids.every(id=>workId.test(id))||!(Number.isInteger(entry.seen)&&entry.seen>=0&&entry.seen<(1<<count))||!entry.seen||!Array.isArray(entry.checks)||entry.checks.length>limit)return null;
      const n=entry.fieldCount??4;if(![4,5].includes(n))return null;
      if(entry.checks.some((check,index)=>!vector(check,n)&&!(check===null&&index<entry.checks.length-1&&entry.checks.length>=2))||!root.KunstWallEnabled&&entry.checks.length===2&&entry.checks[0]?.every(value=>value===15))return null;
      seen.add(entry.id);rooms.push({id:entry.id,at:entry.at,ids:[...entry.ids],seen:entry.seen,fieldCount:n,checks:entry.checks.map(check=>check&&[...check])});
    }
    return {version:1,since:raw.since,rooms};
  }
  function checkedMasks(state,pool) {
    const last=state.review?.choices;
    if(!state.attempts||!last)return [];
    const snapshots=state.attemptLog||[];
    const score=choices=>state.ids.map(id=>{
      const work=pool.find(item=>item.id===id);
      return fields.slice(0,fieldCount(state)).reduce((value,field,index)=>value+(work&&choices?.[id]?.[field]===work[field]?1<<index:0),0);
    });
    if(root.KunstWallEnabled)return Array.from({length:state.attempts},(_,i)=>{const snapshot=snapshots.find(entry=>entry.attempt===i+1);return snapshot?score(snapshot.choices):i===state.attempts-1?score(last):null;});
    const first=snapshots.find(entry=>entry.attempt===1),second=snapshots.find(entry=>entry.attempt===2);
    if(state.attempts===1)return [score(first?.choices||last)];
    return [first?.choices?score(first.choices):null,score(second?.choices||last)];
  }
  function mergeChecks(left,right) {
    const checks=[];
    for(let i=0;i<Math.max(left.length,right.length);i++) {
      const x=left[i],y=right[i];
      if(x&&y&&!same(x,y))throw Error('Die Bildhistorie enthält widersprüchliche Prüfungen.');
      checks.push(x||y||null);
    }
    return checks;
  }
  function track(profile,state,pool,{shownId,at=Date.now()}={}) {
    const token=state?.historyToken||state?.roomToken;
    if(!state||!roomId.test(token)||state.ids?.length!==count)return profile;
    const index=profile.rooms.findIndex(entry=>entry.id===token), old=profile.rooms[index];
    const shown=state.ids.indexOf(shownId);
    if(!old&&shown<0)return profile; // Never count an unloaded image or the hero film.
    if(old&&(!same(old.ids,state.ids)||(old.fieldCount??4)!==fieldCount(state)))throw Error('Der technische Ersatzraum benötigt eine eigene Bildhistorie.');
    if(!old&&profile.rooms.length>=MAX_ROOMS)throw Error('Die Bildhistorie enthält bereits 10.000 Räume. Sichere deinen Verlauf als Spielstandsdatei; ältere Einträge werden nicht gelöscht.');
    const checks=checkedMasks(state,pool);
    const next={id:token,at:old?.at??at,ids:[...state.ids],seen:(old?.seen||0)|(shown<0?0:1<<shown),fieldCount:fieldCount(state),checks:mergeChecks(old?.checks||[],checks)};
    if(old&&same(old,next))return profile;
    const rooms=[...profile.rooms];if(old)rooms[index]=next;else rooms.push(next);
    return {version:1,since:profile.since,rooms};
  }
  function merge(left,right) {
    const a=restore(left),b=restore(right);if(!a||!b)throw Error('Die Bildhistorie ist ungültig.');
    const records=new Map(a.rooms.map(entry=>[entry.id,entry]));
    for(const entry of b.rooms) {
      const old=records.get(entry.id);
      if(!old){records.set(entry.id,entry);continue;}
      if(!same(old.ids,entry.ids)||(old.fieldCount??4)!==(entry.fieldCount??4))throw Error('Die Datei enthält widersprüchliche Werk-IDs in der Bildhistorie.');
      const checks=mergeChecks(old.checks,entry.checks);
      records.set(entry.id,{...old,at:Math.min(old.at,entry.at),seen:old.seen|entry.seen,checks});
    }
    if(records.size>MAX_ROOMS)throw Error('Die zusammengeführte Bildhistorie ist zu groß. Beide bisherigen Dateien bleiben unverändert.');
    const merged=restore({version:1,since:Math.min(a.since,b.since),rooms:[...records.values()].sort((x,y)=>x.at-y.at||x.id.localeCompare(y.id))});
    if(!merged)throw Error('Die Datei enthält einen widersprüchlichen Bildverlauf.');
    return merged;
  }
  function summarize(profile,ids,currentRoomToken) {
    return ids.map(id=>{
      const entries=profile.rooms.filter(entry=>entry.id!==currentRoomToken&&entry.ids.includes(id)&&entry.seen&(1<<entry.ids.indexOf(id))).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
      const checked=entries.filter(entry=>entry.checks.length),last=checked.at(-1);
      const at=last?.ids.indexOf(id);
      return {id,encounters:entries.length,checkedEncounters:checked.length,
        firstFullyCorrect:checked.filter(entry=>entry.checks[0]?.[entry.ids.indexOf(id)]===(entry.fieldCount===5?31:15)).length,
        finalFullyCorrect:checked.filter(entry=>entry.checks.at(-1)[entry.ids.indexOf(id)]===(entry.fieldCount===5?31:15)).length,
        lastChecked:last?{fieldCount:last.fieldCount??4,checks:last.checks.length,firstMask:last.checks[0]?.[at]??null,lastMask:last.checks.at(-1)[at]}:null};
    });
  }
  function encounterCounts(profile) {
    const result={};
    for(const room of profile.rooms)for(const [index,id]of room.ids.entries()){
      // A checked room also includes a shown imitation's source work. Keep this
      // selection policy separate from AI claims about seeing the original.
      if(room.seen&(1<<index)||room.checks.length)result[id]=(result[id]||0)+1;
    }
    return result;
  }
  function note(summary) {
    if(!summary?.encounters)return '';
    const start='Dieses Werk kam in deinem gespeicherten Verlauf bereits '+summary.encounters+' Mal vor.';
    if(!summary.lastChecked)return start+' Damals ist keine Prüfung zu diesem Werk gespeichert; daraus lässt sich keine frühere Leistung ableiten.';
    const {firstMask,lastMask,checks}=summary.lastChecked,n=summary.lastChecked.fieldCount??4,full=(1<<n)-1,word=n===5?'fünf':'vier';
    const count=fields.slice(0,n).filter((_,index)=>lastMask&(1<<index)).length;
    if(firstMask===full&&lastMask===full)return start+' Bei der letzten gespeicherten Prüfung waren alle '+word+' Zuordnungen schon beim ersten Prüfen richtig.';
    if(lastMask===full&&checks===2)return start+' Bei der letzten gespeicherten Prüfung gelangen alle '+word+' Zuordnungen nach dem zweiten Versuch.';
    return start+' Bei der letzten gespeicherten Prüfung '+(count===1?'war eine':'waren '+count)+' von '+word+' Zuordnungen richtig.';
  }
  const api={fresh,restore,track,merge,summarize,note,encounterCounts,fields,MAX_ROOMS};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KunstHistory=api;
})(typeof globalThis!=='undefined'?globalThis:this);

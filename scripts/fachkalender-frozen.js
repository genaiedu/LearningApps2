/* Personal planning snapshots preserve elapsed lessons; reordering explicitly rebuilds the year. */
(function(root){
'use strict';
const P=root.Fachplan||(typeof require==='function'?require('./fachkalender-plan.js'):null);
const S=root.FachkalenderSchool||(typeof require==='function'?require('./fachkalender-school.js'):null);
const teaching=e=>e.kind==='unit'||e.kind==='prep';
const fields=['id','kind','track','groupId','groupLabel','code','title','hours','color','extraUnit','customUnitId','notes','meetingHours'];
function snapshot(events,track,asOf,revisionCount=0){
 return {asOf,revisionCount,events:events.filter(e=>teaching(e)&&e.track===track).map(e=>{
  const item={};for(const key of fields)if(e[key]!==undefined)item[key]=e[key];
  item.meetingDays=[...(e.meetingDays||[])];return item;
 })};
}
function validAnchor(a){
 if(Array.isArray(a?.events)&&a.events.some(e=>e?.meetingHours!==undefined&&(!e.meetingHours||typeof e.meetingHours!=='object'||Array.isArray(e.meetingHours)||Object.entries(e.meetingHours).some(([day,hours])=>!S.date(day)||!Number.isFinite(hours)||hours<=0||hours>2))))return false;
 return a&&S.date(a.asOf)&&(a.revisionCount===undefined||Number.isInteger(a.revisionCount)&&a.revisionCount>=0&&a.revisionCount<=100)&&Array.isArray(a.events)&&a.events.length<=100&&a.events.every(e=>e&&teaching(e)&&typeof e.id==='string'&&e.id.length<=200&&typeof e.track==='string'&&e.track.length<=30&&typeof e.title==='string'&&e.title.length<=250&&(!e.groupId||typeof e.groupId==='string'&&e.groupId.length<=100)&&(!e.groupLabel||typeof e.groupLabel==='string'&&e.groupLabel.length<=80)&&(!e.notes||typeof e.notes==='string'&&e.notes.length<=5000)&&(!e.code||typeof e.code==='string'&&e.code.length<=80)&&(!e.hours||Number.isFinite(e.hours)&&e.hours>0&&e.hours<=400)&&Array.isArray(e.meetingDays)&&e.meetingDays.length<=300&&e.meetingDays.every(S.date)&&new Set(e.meetingDays).size===e.meetingDays.length)&&new Set(a.events.map(e=>e.id)).size===a.events.length;
}
function restore(anchor,templates,subject,year){
 const byId=new Map(templates.map(e=>[e.id,e]));
 return anchor.events.map(e=>({...e,...byId.get(e.id),subject,year,meetingDays:[...e.meetingDays]}));
}
function decorate(event,days,track,schedule){
 const hasSchedule=Object.keys(schedule).length>0;
 const meetingHours=Object.fromEntries(days.map(day=>[day,event.meetingHours?.[day]??(hasSchedule?schedule[P.parse(day).getUTCDay()]||0:track.weekly/5)]));
 const amount=Object.values(meetingHours).reduce((sum,n)=>sum+n,0);
 const plannedHours=Math.round(amount*10)/10;
 let notes=event.notes||'';
 if(event.kind==='unit')notes=notes.replace(/Proportionaler Kalenderansatz: ca\. [\d.]+ UStd\./,'Proportionaler Kalenderansatz: ca. '+plannedHours+' UStd.');
 return {...event,start:days[0],end:days.at(-1),meetingDays:days,meetingHours,plannedHours,notes};
}
function redistribute(baseline,templates,data,subject,year,trackId,closures,timetable,groups,absences,cutoff){
 const track=data.subjects[subject].tracks.find(t=>t.id===trackId),config=data.years[year];
 const output=[],instances=new Map();
 for(const e of templates.filter(e=>teaching(e)&&e.track===trackId)){
  const key=e.groupId||trackId;if(!instances.has(key))instances.set(key,[]);instances.get(key).push(e);
 }
 for(const [key,items] of instances){
  const units=items.filter(e=>e.kind==='unit'),prep=items.find(e=>e.kind==='prep');
  const old=baseline.filter(e=>(e.groupId||trackId)===key),byId=new Map(old.map(e=>[e.id,e]));
  const group=groups.find(g=>g.id===key),schedule=group?.days||timetable[trackId]||{},scheduled=Object.keys(schedule).length>0;
  const lessonWeight=day=>scheduled?schedule[P.parse(day).getUTCDay()]:1;
  const end=trackId.startsWith('Q2')?(config.prepEnd||config.q2end):config.end;
  const absent=day=>absences.some(a=>a.subject===subject&&a.year===year&&a.start<=day&&a.end>=day&&a.optionIds.includes(key));
  const future=P.dates(cutoff<config.start?config.start:cutoff,end).filter(day=>!P.closed(day,trackId,closures)&&(!scheduled||lessonWeight(day))&&!absent(day));
  const prepFuture=prep?future.filter(day=>day>=prep.start):[],available=prep?future.filter(day=>day<prep.start):future;
  const past=e=>(e?.meetingDays||[]).filter(day=>day<cutoff&&!absent(day));
  const fixed=old.filter(e=>e.kind==='unit'&&past(e).length&&units.some(u=>u.id===e.id)).sort((a,b)=>a.meetingDays[0].localeCompare(b.meetingDays[0]));
  if(fixed.some((e,i)=>units[i]?.id!==e.id))throw Error('Begonnene oder abgeschlossene Vorhaben können nur mit „Gesamtes Schuljahr“ verschoben werden.');
  const lastStarted=units.reduce((n,u,i)=>past(byId.get(u.id)).length?i:n,-1);
  const started=lastStarted>=0?byId.get(units[lastStarted].id):null;
  const ongoing=started&&(started.meetingDays||[]).some(day=>day>=cutoff);
  const open=units.slice(lastStarted<0?0:lastStarted+(ongoing?0:1));
  if(available.length<open.length)throw Error('Für '+(items[0]?.groupLabel||trackId)+' bleiben zu wenige künftige Unterrichtstermine für die offenen Vorhaben.');
  const weights=open.map((u,i)=>{
   if(i===0&&ongoing){const weight=d=>started.meetingHours?.[d]??lessonWeight(d),total=started.meetingDays.reduce((n,d)=>n+weight(d),0),remaining=started.meetingDays.filter(d=>d>=cutoff).reduce((n,d)=>n+weight(d),0);return Math.max(.01,u.hours*remaining/(total||1))}
   return Math.max(.01,u.hours||1);
  });
  const usable=available.reduce((n,d)=>n+lessonWeight(d),0);
  const allocation=open.length?P.distribute(weights,usable-open.length).map(n=>n+1):[];
  const assigned=new Map();let cursor=0;
  open.forEach((u,i)=>{
   const start=cursor,left=open.length-i-1;let amount=0;
   while(cursor<available.length-left&&(i===open.length-1||amount<allocation[i]||cursor===start)){amount+=lessonWeight(available[cursor]);cursor++}
   assigned.set(u.id,available.slice(start,cursor));
  });
  const history=e=>Object.fromEntries(past(e).filter(d=>e.meetingHours?.[d]!==undefined).map(d=>[d,e.meetingHours[d]]));
  for(const u of units){const days=[...past(byId.get(u.id)),...(assigned.get(u.id)||[])].sort();if(days.length)output.push(decorate({...u,meetingHours:history(byId.get(u.id))},days,track,schedule))}
  if(prep){const days=[...past(byId.get(prep.id)),...prepFuture].sort();if(days.length)output.push(decorate({...prep,meetingHours:history(byId.get(prep.id))},days,track,schedule))}
  const currentIds=new Set(items.map(e=>e.id));
  for(const e of old){const days=past(e);if(!currentIds.has(e.id)&&days.length)output.push(decorate(e,days,track,schedule))}
 }
 for(const e of baseline.filter(e=>e.track===trackId&&!instances.has(e.groupId||trackId))){const days=e.meetingDays.filter(day=>day<cutoff);if(days.length)output.push(decorate(e,days,track,timetable[trackId]||{}))}
 return output;
}
function build(data,baseYears,settings,subject,year,orders,customUnits,timetable,groups,absences,today,options={}){
 const currentData={...data,years:{...baseYears,...settings.years}},currentClosures=S.merged(data,settings).closures;
 const current=P.plan(currentData,subject,year,currentClosures,orders,customUnits,timetable,groups);
 const revisions=settings.revisions||[],anchors=options.anchors||{},changed=new Set(options.changedTracks||[]),rebuild=new Set(options.rebuildTracks||[]);
 const cache=new Map();
 const stagePlan=setting=>{
  if(!cache.has(setting)){const d={...data,years:{...baseYears,...setting.years}};if(!d.years[year])d.years[year]=currentData.years[year];cache.set(setting,{data:d,closures:S.merged(data,setting).closures,plan:P.plan(d,subject,year,S.merged(data,setting).closures,orders,customUnits,timetable,groups)})}
  return cache.get(setting);
 };
 const events=current.events.filter(e=>!teaching(e));
 for(const track of data.subjects[subject].tracks){
  const key=subject+':'+year+':'+track.id,anchor=anchors[key],templates=current.events.filter(e=>teaching(e)&&e.track===track.id);
  let planned;
  if(rebuild.has(track.id)){
   planned=redistribute([],templates,currentData,subject,year,track.id,currentClosures,timetable,groups,absences,currentData.years[year].start);
  }else{
   const earliest=revisions[0]?.settings||settings,initial=stagePlan(earliest);
   planned=anchor?restore(anchor,templates,subject,year):initial.plan.events.filter(e=>teaching(e)&&e.track===track.id);
   const from=anchor?.asOf||initial.data.years[year].start;
   for(let i=0;i<revisions.length;i++){
    const date=revisions[i].until;if(date>today)continue;
    if(anchor?.revisionCount!==undefined?i<anchor.revisionCount:date<from)continue;
    const next=stagePlan(revisions[i+1]?.settings||settings);
    const before=stagePlan(revisions[i].settings);
    const relevant=stage=>JSON.stringify([stage.data.years[year],stage.closures.filter(c=>!c.tracks?.length||c.tracks.includes(track.id))]);
    if(relevant(before)===relevant(next))continue;
    const fullYear=revisions[i].scope==='year';
    planned=redistribute(fullYear?[]:planned,next.plan.events,next.data,subject,year,track.id,next.closures,timetable,groups,absences,fullYear?next.data.years[year].start:date);
   }
   if(changed.has(track.id)||!anchor&&absences.length)planned=redistribute(planned,templates,currentData,subject,year,track.id,currentClosures,timetable,groups,absences,today);
  }
  const groupSchedules=new Map(groups.filter(g=>g.track===track.id).map(g=>[g.id,g.days]));
  events.push(...planned.map(e=>decorate(e,e.meetingDays,track,groupSchedules.get(e.groupId)||timetable[track.id]||{})));
 }
 const stats=current.stats.map(stat=>{
  const items=events.filter(e=>teaching(e)&&e.track===stat.track&&(e.groupId||null)===(stat.groupId||null));
  const planned=items.filter(e=>e.kind==='unit').reduce((n,e)=>n+e.plannedHours,0),preparation=items.filter(e=>e.kind==='prep').reduce((n,e)=>n+e.plannedHours,0);
  return {...stat,days:items.reduce((n,e)=>n+e.meetingDays.length,0),planned:Math.round(planned*10)/10,preparation:Math.round(preparation*10)/10,factor:planned/(stat.hours+stat.extraHours||1)};
 });
 return {events,stats};
}
const api={build,snapshot,validAnchor};root.FachkalenderFrozen=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);

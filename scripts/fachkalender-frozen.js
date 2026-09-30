/* Freeze elapsed lessons across schoolwide calendar changes; redistribute only future lessons. */
(function(root){
'use strict';
const P=root.Fachplan||(typeof require==='function'?require('./fachkalender-plan.js'):null);
const S=root.FachkalenderSchool||(typeof require==='function'?require('./fachkalender-school.js'):null);
function build(data,baseYears,settings,subject,year,orders,customUnits,timetable,groups,absences,today){
 const currentData={...data,years:{...baseYears,...settings.years}};
 const currentClosures=S.merged(data,settings).closures;
 const current=P.plan(currentData,subject,year,currentClosures,orders,customUnits,timetable,groups);
 if(!(settings.revisions||[]).length&&!(absences||[]).length)return current;
 const past=new Map(),prior=new Map();
 const segments=[...(settings.revisions||[]),{until:today,settings}];
 let from=baseYears[year]?.start||currentData.years[year].start;
 for(const segment of segments){
  const until=segment.until;
  if(from>=today)break;
  if(from>=until){from=until;continue}
  const older={...data,years:{...baseYears,...segment.settings.years}};
  if(!older.years[year]){from=until;continue}
  const closures=S.merged(data,segment.settings).closures;
  const plan=P.plan(older,subject,year,closures,orders,customUnits,timetable,groups);
  for(const event of plan.events){
   if(!['unit','prep'].includes(event.kind))continue;
   prior.set(event.id,event);
   const days=(event.meetingDays||[]).filter(day=>day>=from&&day<until&&day<today);
   if(days.length)past.set(event.id,[...(past.get(event.id)||[]),...days]);
  }
  from=until;
 }
 if(from<today&&!settings.revisions?.length){
  for(const event of current.events)if(['unit','prep'].includes(event.kind))past.set(event.id,(event.meetingDays||[]).filter(day=>day<today));
 }
 const byGroup=new Map();
 for(const event of current.events.filter(e=>e.kind==='unit')){
  const key=event.track+'|'+(event.groupId||'');
  if(!byGroup.has(key))byGroup.set(key,[]);
  byGroup.get(key).push(event);
 }
 const replacement=new Map();
 for(const [key,units] of byGroup){
  const first=units[0],track=first.track,groupId=first.groupId||null;
  const config=currentData.years[year],q2=track.startsWith('Q2'),end=q2?(config.prepEnd||config.q2end):config.end;
  const group=groups.find(g=>g.id===groupId)||groups.find(g=>g.track===track&&g.id===first.groupId);
  const schedule=group?.days||timetable[track]||{};
  const hasSchedule=Object.keys(schedule).length>0;
  const absent=day=>(absences||[]).some(a=>a.subject===subject&&a.year===year&&a.start<=day&&a.end>=day&&a.optionIds.includes(groupId||track));
  const future=P.dates(today,end).filter(day=>!P.closed(day,track,currentClosures)&&(!hasSchedule||schedule[P.parse(day).getUTCDay()])&&!absent(day));
  const prep=current.events.find(e=>e.kind==='prep'&&e.track===track&&(e.groupId||null)===groupId);
  const prepCount=prep?Math.min(future.length,hasSchedule?Object.keys(schedule).length*4:20):0;
  const teaching=prepCount?future.slice(0,-prepCount):future,prepFuture=prepCount?future.slice(-prepCount):[];
  const lastStarted=units.reduce((n,u,i)=>(past.get(u.id)||[]).length?i:n,-1);
  const ongoing=lastStarted>=0&&(prior.get(units[lastStarted].id)?.meetingDays||[]).some(day=>day>=today);
  const firstOpen=lastStarted<0?0:lastStarted+(ongoing?0:1);
  const open=units.slice(firstOpen);
  if(teaching.length<open.length)throw Error('Für '+(first.groupLabel||track)+' bleiben nach den freien Tagen zu wenige künftige Unterrichtstermine.');
  const lessonWeight=day=>hasSchedule?schedule[P.parse(day).getUTCDay()]:1;
  const weights=open.map((u,i)=>{
   const old=prior.get(u.id)||u;
   if(i===0&&ongoing)return Math.max(1,(old.meetingDays||[]).filter(day=>day>=today).reduce((sum,day)=>sum+lessonWeight(day),0));
   return Math.max(1,u.hours||1);
  });
  const usable=teaching.reduce((sum,day)=>sum+lessonWeight(day),0);
  const allocation=open.length?P.distribute(weights,usable-open.length).map(n=>n+1):[];
  const assigned=new Map();let index=0;
  open.forEach((u,i)=>{const start=index,left=open.length-i-1;let amount=0;while(index<teaching.length-left&&(amount<allocation[i]||index===start)){amount+=lessonWeight(teaching[index]);index++}assigned.set(u.id,teaching.slice(start,index))});
  for(const u of units){
   const days=[...(past.get(u.id)||[]),...(assigned.get(u.id)||[])].sort();
   if(days.length)replacement.set(u.id,{...u,start:days[0],end:days.at(-1),meetingDays:days});
  }
  if(prep){
   const days=[...(past.get(prep.id)||[]),...prepFuture].sort();
   if(days.length)replacement.set(prep.id,{...prep,start:days[0],end:days.at(-1),meetingDays:days});
  }
 }
 return {...current,events:current.events.map(e=>replacement.get(e.id)||e)};
}
const api={build};root.FachkalenderFrozen=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);

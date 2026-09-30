/* Calendar-day planning shared by the browser and the verification script. */
(function(root){
'use strict';
const parse=s=>new Date(s+'T12:00:00Z');
const iso=d=>d.toISOString().slice(0,10);
const add=(s,n)=>{const d=parse(s);d.setUTCDate(d.getUTCDate()+n);return iso(d)};
function dates(a,b){const out=[];for(let d=a;d<=b;d=add(d,1))out.push(d);return out}
function closed(day,track,closures){return [0,6].includes(parse(day).getUTCDay())||closures.some(c=>day>=c.start&&day<=c.end&&(!c.tracks?.length||c.tracks.includes(track)))}
function distribute(weights,total){
 const sum=weights.reduce((a,b)=>a+b,0),raw=weights.map(w=>w/sum*total),n=raw.map(x=>Math.floor(x));
 let remaining=total-n.reduce((a,b)=>a+b,0);
 raw.map((v,i)=>({i,rest:v-n[i]})).sort((a,b)=>b.rest-a.rest||a.i-b.i).slice(0,remaining).forEach(x=>n[x.i]++);
 return n;
}
function unitsFor(data,subject,year,trackId){
 const sub=data.subjects[subject];
 let units=sub.units.filter(u=>u.track===trackId);
 if(['chemie','chemie-arbeitskopie'].includes(subject)&&((+year>=2027&&trackId==='EF')||(+year>=2028&&trackId.startsWith('Q1'))||(+year>=2029&&trackId.startsWith('Q2'))))units=sub.units2026.filter(u=>u.track===trackId);
 return units;
}
function plan(data,subject,year,closures,orders={},customUnits=[],timetable={},groups=[]){
 const config=data.years[year],sub=data.subjects[subject],events=[],stats=[],instancesByTrack=new Map();
 for(const track of sub.tracks){
  const defined=groups.filter(g=>g.track===track.id);
  const instances=defined.length?defined:[{id:track.id,label:track.label,track:track.id,days:timetable[track.id]||{}}];
  instancesByTrack.set(track.id,instances);
  for(const group of instances){
   let units=unitsFor(data,subject,year,track.id);
   const curriculumHours=units.reduce((n,u)=>n+u.hours,0);
   const additions=customUnits.filter(u=>u.track===track.id).map(u=>({code:'',title:u.title,hours:u.hours,track:track.id,customUnitId:u.id,notes:u.notes||''}));
   units=[...units,...additions];
   const unitKey=u=>u.customUnitId||u.code;
   const order=orders[`${subject}:${year}:${track.id}`],byCode=new Map(units.map(u=>[unitKey(u),u]));
   if(Array.isArray(order)){
    const seen=new Set();
    units=[...order.filter(code=>byCode.has(code)&&!seen.has(code)&&(seen.add(code),true)).map(code=>byCode.get(code)),...units.filter(u=>!seen.has(unitKey(u)))];
   }
   const groupId=group.id===track.id?null:group.id,groupLabel=group.label||track.label;
   const suffix=groupId&&!String(groupId).startsWith('legacy-')?'~'+groupId:'';
   const q2=track.id.startsWith('Q2');
   const end=q2?(config.prepEnd||config.q2end):config.end,schedule=group.days||{},scheduledWeekdays=Object.keys(schedule).map(Number).filter(d=>schedule[d]===1||schedule[d]===2),hasSchedule=scheduledWeekdays.length>0;
   const days=dates(config.start,end).filter(d=>!closed(d,track.id,closures)&&(!hasSchedule||schedule[parse(d).getUTCDay()]));
   const meetingDaysPerWeek=hasSchedule?scheduledWeekdays.length:5,preparationDateCount=q2?(hasSchedule?meetingDaysPerWeek*4:20):0;
   if(days.length-preparationDateCount<units.length)throw Error('Für '+groupLabel+' bleiben zu wenige Unterrichtstage. Bitte freie Zeiträume oder Schuljahresrahmen anpassen.');
   const teachingDays=q2?days.slice(0,-preparationDateCount):days,preparationDates=q2?days.slice(-preparationDateCount):[];
   const lessonWeight=d=>hasSchedule?schedule[parse(d).getUTCDay()]:1;
   const hours=units.reduce((n,u)=>n+u.hours,0),usable=hasSchedule?teachingDays.reduce((n,d)=>n+lessonWeight(d),0):teachingDays.length;
   if(usable<units.length)throw Error('Für '+groupLabel+' bleiben zu wenige Unterrichtsstunden. Bitte freie Zeiträume oder Schuljahresrahmen anpassen.');
   const raw=distribute(units.map(u=>u.hours),usable-units.length),allocations=raw.map(n=>n+1),assignedDays=units.map(()=>[]);let cursor=0;
   units.forEach((u,i)=>{const left=units.length-i-1,start=cursor,target=allocations[i];let amount=0;while(cursor<teachingDays.length-left&&(i===units.length-1||amount<target||cursor===start)){amount+=lessonWeight(teachingDays[cursor]);cursor++}assignedDays[i]=teachingDays.slice(start,cursor)});
   const factor=usable/hours;
   units.forEach((u,i)=>{
    const datesForUnit=assignedDays[i];if(!datesForUnit.length)return;const count=hasSchedule?datesForUnit.reduce((n,d)=>n+lessonWeight(d),0):allocations[i],plannedHours=hasSchedule?count:Math.round(count/5*track.weekly*10)/10;
    const baseId=u.customUnitId?`xuv-${subject}-${year}-${u.customUnitId}`:`uv-${subject}-${year}-${u.code}`;
    events.push({...u,id:baseId+suffix,subject,year,groupId,groupLabel,kind:'unit',extraUnit:Boolean(u.customUnitId),start:datesForUnit[0],end:datesForUnit.at(-1),meetingDays:datesForUnit,color:i%6,plannedHours,notes:u.customUnitId?`Zusätzliches persönliches Unterrichtsvorhaben · Zeitansatz ${u.hours} UStd. Die übrigen Vorhaben wurden proportional angepasst.${u.notes?' '+u.notes:''}`:`Curricularer Zeitrichtwert: ${u.hours} UStd à 45 Minuten; Anteil an den Vorhaben dieses Jahrgangs: ${Math.round(u.hours/hours*1000)/10} %. Proportionaler Kalenderansatz: ca. ${plannedHours} UStd. Übung, Vertiefung und Leistungsnachweise sind in die Vorhaben integriert.`});
   });
   const preparationHours=hasSchedule?preparationDates.reduce((n,d)=>n+lessonWeight(d),0):preparationDates.length/5*track.weekly;
   stats.push({track:track.id,groupId,groupLabel,days:days.length,weekly:hasSchedule?scheduledWeekdays.reduce((n,d)=>n+schedule[d],0):track.weekly,hours:curriculumHours,extraHours:additions.reduce((n,u)=>n+u.hours,0),planned:hasSchedule?usable:Math.round(usable/5*track.weekly*10)/10,preparation:preparationHours,factor});
   if(q2)events.push({id:`prep-${subject}-${year}-${track.id}${suffix}`,subject,year,track:track.id,groupId,groupLabel,kind:'prep',title:'Abiturvorbereitung · vier Unterrichtswochen',start:preparationDates[0],end:preparationDates.at(-1),meetingDays:preparationDates,notes:'Die letzten vier Unterrichtswochen bis zum Ende des Q2-Unterrichts bleiben für Wiederholung, Vernetzung und Abiturvorbereitung reserviert. Berücksichtigt werden die eingetragenen Einzel- und Doppelstunden sowie Ferien und freie Tage.'});
  }
 }
 for(const exam of data.exams.filter(e=>e.subject===subject&&e.start>=config.start&&e.start<=config.end)){
  for(const group of instancesByTrack.get(exam.track)||[]){
   const groupId=group.id===exam.track?null:group.id;
   events.push({...exam,id:exam.id+(groupId&&!String(groupId).startsWith('legacy-')?'~'+groupId:''),year,groupId,groupLabel:group.label});
  }
 }
 return {events,stats};
}
const api={parse,iso,add,dates,closed,distribute,unitsFor,plan};root.Fachplan=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);

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
 if(subject==='chemie'&&((+year>=2027&&trackId==='EF')||(+year>=2028&&trackId.startsWith('Q1'))||(+year>=2029&&trackId.startsWith('Q2'))))units=sub.units2026.filter(u=>u.track===trackId);
 return units;
}
function plan(data,subject,year,closures,orders={}){
 const config=data.years[year],sub=data.subjects[subject],events=[],stats=[];
 for(const track of sub.tracks){
  let units=unitsFor(data,subject,year,track.id);
  const order=orders[`${subject}:${year}:${track.id}`],byCode=new Map(units.map(u=>[u.code,u]));
  if(Array.isArray(order)){
   const seen=new Set();
   units=[...order.filter(code=>byCode.has(code)&&!seen.has(code)&&(seen.add(code),true)).map(code=>byCode.get(code)),...units.filter(u=>!seen.has(u.code))];
  }
  const q2=track.id.startsWith('Q2');
  const end=q2?(config.prepEnd||config.q2end):config.end;
  const days=dates(config.start,end).filter(d=>!closed(d,track.id,closures));
  const preparationDays=q2?20:0;
  if(days.length-preparationDays<units.length*2)throw Error('Für '+track.label+' bleiben zu wenige Unterrichtstage. Bitte freie Tage oder Schuljahresrahmen anpassen.');
  const teachingDays=q2?days.slice(0,-preparationDays):days;
  const hours=units.reduce((n,u)=>n+u.hours,0),usable=teachingDays.length;
  const allocations=distribute(units.map(u=>u.hours),usable);
  let index=0;
  const factor=usable*track.weekly/5/hours;
  units.forEach((u,i)=>{
   const count=allocations[i];if(!count)return;
   events.push({...u,id:`uv-${subject}-${year}-${u.code}`,subject,year,kind:'unit',start:teachingDays[index],end:teachingDays[index+count-1],color:i%6,plannedHours:Math.round(count/5*track.weekly*10)/10,notes:`Curricularer Zeitrichtwert: ${u.hours} UStd à 45 Minuten; Anteil an den Vorhaben dieses Jahrgangs: ${Math.round(u.hours/hours*1000)/10} %. Proportionaler Kalenderansatz: ca. ${Math.round(count/5*track.weekly*10)/10} UStd. Übung, Vertiefung und Leistungsnachweise sind in die Vorhaben integriert.`});index+=count;
  });
  stats.push({track:track.id,days:days.length,weekly:track.weekly,hours,planned:Math.round(usable/5*track.weekly*10)/10,preparation:preparationDays/5*track.weekly,factor});
  if(q2)events.push({id:`prep-${subject}-${year}-${track.id}`,subject,year,track:track.id,kind:'prep',title:'Abiturvorbereitung · vier Unterrichtswochen',start:days[days.length-preparationDays],end:days.at(-1),notes:'Die letzten 20 verfügbaren Schultage (vier Unterrichtswochen) bis zum Ende des Q2-Unterrichts bleiben für Wiederholung, Vernetzung und Abiturvorbereitung reserviert. Ferien und freie Tage zählen nicht mit. Die schulinterne Planung umfasst gegebenenfalls die anschließend amtlich ausgewiesene Vorbereitungsphase.'});
 }
 events.push(...data.exams.filter(e=>e.subject===subject&&e.start>=config.start&&e.start<=config.end).map(e=>({...e,year})));
 return {events,stats};
}
const api={parse,iso,add,dates,closed,distribute,unitsFor,plan};root.Fachplan=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);

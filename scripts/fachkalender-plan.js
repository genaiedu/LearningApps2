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
function plan(data,subject,year,closures){
 const config=data.years[year],sub=data.subjects[subject],events=[],stats=[];
 for(const track of sub.tracks){
  let units=sub.units.filter(u=>u.track===track.id);
  if(subject==='chemie'&&((+year>=2027&&track.id==='EF')||(+year>=2028&&track.id.startsWith('Q1'))||(+year>=2029&&track.id.startsWith('Q2'))))units=sub.units2026.filter(u=>u.track===track.id);
  const end=track.id.startsWith('Q2')?config.q2end:config.end;
  const days=dates(config.start,end).filter(d=>!closed(d,track.id,closures));
  if(days.length<units.length*2)throw Error('Für '+track.label+' bleiben zu wenige Unterrichtstage. Bitte freie Tage oder Schuljahresrahmen anpassen.');
  const hours=units.reduce((n,u)=>n+u.hours,0),requested=hours/track.weekly*5;
  const usable=Math.min(Math.round(requested),Math.floor(days.length*.92));
  const allocations=distribute(units.map(u=>u.hours),usable);
  const reserves=distribute(units.map(u=>u.hours),days.length-usable);
  let index=0;
  const factor=usable/requested;
  units.forEach((u,i)=>{
   const count=allocations[i];if(!count)return;
   events.push({...u,id:`uv-${subject}-${year}-${u.code}`,subject,year,kind:'unit',start:days[index],end:days[index+count-1],color:i%6,plannedHours:Math.round(count/5*track.weekly*10)/10,notes:`Curriculum: ${u.hours} UStd à 45 Minuten. Kalenderansatz: ca. ${Math.round(count/5*track.weekly*10)/10} UStd. ${factor<.97?'Zeitrahmen proportional an die verfügbaren Unterrichtstage angepasst.':'Zeitrichtwert beibehalten; verbleibende Zeit als Reserve.'}`});index+=count;
   if(reserves[i]){
    events.push({id:`buffer-${subject}-${year}-${u.code}`,subject,year,track:track.id,kind:'buffer',title:'Vertiefung, Leistungsnachweise und Reserve',start:days[index],end:days[index+reserves[i]-1],color:i%6,notes:'Zeit für Übung, Klausuren bzw. Klassenarbeiten, Rückmeldung und schulbedingte Verschiebungen. Fachliche Reihenfolge bleibt erhalten.'});index+=reserves[i];
   }
  });
  stats.push({track:track.id,days:days.length,weekly:track.weekly,hours,planned:Math.round(usable/5*track.weekly*10)/10,reserve:Math.round((days.length-usable)/5*track.weekly*10)/10,factor});
  if(track.id.startsWith('Q2')&&config.prepStart&&config.prepEnd)events.push({id:`prep-${subject}-${year}-${track.id}`,subject,year,track:track.id,kind:'prep',title:'Abiturvorbereitung',start:config.prepStart,end:config.prepEnd,notes:'Amtliche Vorbereitungsphase; konkrete Stunden werden schulisch festgelegt.',source:'https://bass.schule.nrw/192.htm'});
 }
 events.push(...data.exams.filter(e=>e.subject===subject&&e.start>=config.start&&e.start<=config.end).map(e=>({...e,year})));
 return {events,stats};
}
const api={parse,iso,add,dates,closed,distribute,plan};root.Fachplan=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);

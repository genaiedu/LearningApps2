(function(root){
'use strict';
const P=root.Fachplan||(typeof require==='function'?require('./fachkalender-plan.js'):null);
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),n=h+l-7*m+114;return `${y}-${String(Math.floor(n/31)).padStart(2,'0')}-${String(n%31+1).padStart(2,'0')}`}
async function loadYear(y,fetcher=fetch){
 if(!Number.isInteger(y)||y<2028||y>2099)throw Error('Bitte ein Startjahr zwischen 2028 und 2099 wählen.');
 const query=`countryIsoCode=DE&subdivisionCode=DE-NW&languageIsoCode=DE&validFrom=${y}-07-01&validTo=${y+1}-09-30`;
 const urls=['SchoolHolidays','PublicHolidays'].map(t=>'https://openholidaysapi.org/'+t+'?'+query);
 const all=await Promise.all(urls.map(async url=>{const r=await fetcher(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Der Feriendienst ist momentan nicht erreichbar.');const v=await r.json();if(!Array.isArray(v))throw Error('Ungültige Ferienantwort.');return v}));
 const title=x=>x.name?.find(n=>n.language==='DE')?.text||x.name?.[0]?.text||'Schulfrei';
 const school=all[0].filter(x=>x.subdivisions?.some(s=>s.code==='DE-NW'));
 const summer=school.filter(x=>/sommer/i.test(title(x)));
 const before=summer.find(x=>x.startDate.startsWith(y+'-')),after=summer.find(x=>x.startDate.startsWith((y+1)+'-'));
 const winter=school.find(x=>/weihnacht/i.test(title(x))&&x.startDate.startsWith(y+'-'));
 const spring=school.find(x=>/oster/i.test(title(x))&&x.startDate.startsWith((y+1)+'-'));
 const autumn=school.find(x=>/herbst/i.test(title(x))&&x.startDate.startsWith(y+'-'));
 if(!before||!after||!winter||!spring||!autumn||!all[1].length)throw Error('Für dieses Schuljahr liegen noch keine vollständigen NRW-Ferien- und Feiertagsdaten vor. Es wurde kein unvollständiger Kalender angelegt.');
 const closures=all.flatMap((list,i)=>list.filter(x=>i===0?x.subdivisions?.some(s=>s.code==='DE-NW'):(x.nationwide||x.subdivisions?.some(s=>s.code==='DE-NW'))).map(x=>({id:'remote-'+y+'-'+x.id,start:x.startDate,end:x.endDate,title:title(x),kind:i===0?'vacation':'holiday',source:urls[i],tracks:[]})));
 for(const yr of [y,y+1])for(const [offset,t] of [[-48,'Rosenmontag'],[-47,'Faschingsdienstag']]){const d=P.add(easter(yr),offset);closures.push({id:'carnival-'+d,start:d,end:d,title:t,kind:'school',source:'Schulische Festlegung: jährlich schulfrei',tracks:[]})}
 const nextSchool=s=>{while(P.closed(s,'EF',closures))s=P.add(s,1);return s};
 const prevSchool=s=>{while(P.closed(s,'EF',closures))s=P.add(s,-1);return s};
 const fixedHalf={2028:'2029-01-29',2029:'2030-01-28'};
 const config={label:y+'/'+String(y+1).slice(-2),start:nextSchool(P.add(before.endDate,1)),end:prevSchool(P.add(after.startDate,-1)),half:fixedHalf[y]||nextSchool(`${y+1}-02-01`),q2half:nextSchool(P.add(winter.endDate,1)),q2end:prevSchool(P.add(spring.startDate,-1)),prepStart:null,prepEnd:null,dynamic:true,halfProvisional:!fixedHalf[y],q2Provisional:true,fetchedAt:new Date().toISOString(),source:'https://www.openholidaysapi.org/de/'};
 return {config,closures};
}
const api={easter,loadYear};root.Fachferien=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);

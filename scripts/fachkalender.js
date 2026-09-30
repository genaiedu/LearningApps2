import { auth, db, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification, sendPasswordResetEmail, reload, getIdToken, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from './fachkalender-firebase.js';
'use strict';
(async()=>{
const $=id=>document.getElementById(id),P=window.Fachplan,S=window.FachkalenderSchool,F=window.FachkalenderFrozen,GUEST_KEY='thomaeum-fachkalender-v1',APP_ID='fachkalender',ACTIVITY_ID='personal-plan';
const blankState=()=>({version:4,overrides:{},added:[],customUnits:[],absences:[],filters:{},timetable:{},groups:{},cancelled:{},completed:{},orders:{},planAnchors:{}});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=s=>P.parse(s).toLocaleDateString('de-DE',{timeZone:'UTC'}),monthName=s=>P.parse(s).toLocaleDateString('de-DE',{month:'long',year:'numeric',timeZone:'UTC'});
let data;try{const r=await fetch('data/fachkalender.json?v=20260927');if(!r.ok)throw Error();data=await r.json()}catch{$('save-status').textContent='Der Kalender konnte nicht geladen werden. Bitte die Seite erneut öffnen.';return}
const publishedData=data;
let workingData=null;try{const r=await fetch('data/chemie-arbeitskopie-kalender.json?v=20260930');if(!r.ok)throw Error();const copy=await r.json();workingData={...copy,subjects:{...copy.subjects,'chemie-arbeitskopie':copy.subjects.chemie},exams:copy.exams.map(e=>({...e,subject:'chemie-arbeitskopie'}))}}catch{}
const knownSubjects={...publishedData.subjects,...(workingData?{'chemie-arbeitskopie':workingData.subjects['chemie-arbeitskopie']}: {})};
const params=new URLSearchParams(location.search);
let edition=params.get('fassung')==='arbeitsversion'&&workingData&&(!params.get('fach')||params.get('fach')==='chemie')?'arbeitsversion':'veroeffentlicht';
data=edition==='arbeitsversion'?workingData:publishedData;
let sharedSettings={version:1,years:{},closures:[]},builtinYears=structuredClone(data.years);
let state=blankState(),storageOK=true,loadWarning='',currentUser=null,authReady=false,authMode='login',cloudTimer=null,cloudQueue=Promise.resolve(),editingOrder=null,editingOrderScope=null;
const kinds=['unit','buffer','prep','exam','abitur','makeup','event','grade'];
const validDate=s=>typeof s==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(P.parse(s).getTime())&&P.iso(P.parse(s))===s;
function validConfig(c,y){
 return c&&['start','end','half','q2half','q2end'].every(k=>validDate(c[k]))&&c.start<c.end&&c.start.startsWith(y+'-')&&c.end.startsWith((+y+1)+'-')&&c.q2end>=c.start&&c.q2end<=c.end&&c.half>=c.start&&c.half<=c.end&&c.q2half>=c.start&&c.q2half<=c.q2end&&(!c.prepStart&&!c.prepEnd||validDate(c.prepStart)&&validDate(c.prepEnd)&&c.prepStart<=c.prepEnd&&c.prepStart>c.q2end&&c.prepEnd<=c.end);
}
function normalizeState(s){const {years,remoteClosures,free,...personal}=s||{};return {...blankState(),...personal,version:4,customUnits:Array.isArray(s?.customUnits)?s.customUnits:[],absences:Array.isArray(s?.absences)?s.absences:[],timetable:s?.timetable&&typeof s.timetable==='object'?s.timetable:{},groups:s?.groups&&typeof s.groups==='object'?s.groups:{},cancelled:s?.cancelled&&typeof s.cancelled==='object'?s.cancelled:{},completed:s?.completed&&typeof s.completed==='object'?s.completed:{},orders:s?.orders&&typeof s.orders==='object'?s.orders:{}}}
function validState(s){
 if(!s||![1,2,3,4].includes(s.version)||!s.overrides||typeof s.overrides!=='object'||Array.isArray(s.overrides)||!Array.isArray(s.added)||(s.free!=null&&!Array.isArray(s.free))||s.added.length>2000||(s.free||[]).length>500||Object.keys(s.overrides).length>3000)return false;
 if(Object.entries(s.years||{}).some(([y,c])=>!/^20\d{2}$/.test(y)||+y<2026||!validConfig(c,y)))return false;
 const configs={...builtinYears,...sharedSettings.years,...s.years};
 const knownYear=y=>Boolean(configs[y])||/^20\d{2}$/.test(y)&&+y>=2026&&+y<=2099;
 if(Object.entries(s.remoteClosures||{}).some(([y,cs])=>!configs[y]||!Array.isArray(cs)||cs.length>100||cs.some(c=>!validDate(c.start)||!validDate(c.end)||c.start>c.end||typeof c.title!=='string'||c.title.length>200||!Array.isArray(c.tracks))))return false;
 const bounded=(v,n)=>typeof v==='string'&&v.length<=n;
 if(s.customUnits!=null&&(!Array.isArray(s.customUnits)||s.customUnits.length>500||!s.customUnits.every(u=>u&&bounded(u.id,200)&&u.id.startsWith('uvx-')&&knownSubjects[u.subject]&&knownYear(u.year)&&knownSubjects[u.subject].tracks.some(t=>t.id===u.track)&&bounded(u.title,250)&&u.title.trim()&&Number.isFinite(u.hours)&&u.hours>=1&&u.hours<=400&&bounded(u.notes||'',2000))||new Set((s.customUnits||[]).map(u=>u.id)).size!==(s.customUnits||[]).length))return false;
 if(s.timetable!=null){
  if(!s.timetable||typeof s.timetable!=='object'||Array.isArray(s.timetable))return false;
  for(const [sub,tracks] of Object.entries(s.timetable)){
   if(!knownSubjects[sub]||!tracks||typeof tracks!=='object'||Array.isArray(tracks))return false;
   for(const [track,days] of Object.entries(tracks)){
    if(!knownSubjects[sub].tracks.some(t=>t.id===track)||!days||typeof days!=='object'||Array.isArray(days))return false;
    const entries=Object.entries(days);
    if(entries.length>5||entries.some(([weekday,periods])=>!['1','2','3','4','5'].includes(weekday)||![1,2].includes(periods)))return false;
   }
  }
 }
 if(s.groups!=null){
  if(!s.groups||typeof s.groups!=='object'||Array.isArray(s.groups))return false;
  for(const [sub,byYear] of Object.entries(s.groups)){
   if(!knownSubjects[sub]||!byYear||typeof byYear!=='object'||Array.isArray(byYear))return false;
   for(const [y,groups] of Object.entries(byYear)){
    if(!knownYear(y)||!Array.isArray(groups)||groups.length>100||new Set(groups.map(g=>g.id)).size!==groups.length)return false;
    for(const g of groups){
     if(!g||!bounded(g.id,100)||!bounded(g.label,80)||!g.label.trim()||!knownSubjects[sub].tracks.some(t=>t.id===g.track)||!g.days||typeof g.days!=='object'||Array.isArray(g.days))return false;
     const entries=Object.entries(g.days);
     if(!entries.length||entries.length>5||entries.some(([weekday,periods])=>!['1','2','3','4','5'].includes(weekday)||![1,2].includes(periods)))return false;
    }
   }
  }
 }
 if(s.cancelled!=null&&(!s.cancelled||typeof s.cancelled!=='object'||Array.isArray(s.cancelled)||Object.keys(s.cancelled).length>12000||Object.entries(s.cancelled).some(([key,value])=>!bounded(key,300)||typeof value!=='boolean')))return false;
 if(s.completed!=null&&(!s.completed||typeof s.completed!=='object'||Array.isArray(s.completed)||Object.keys(s.completed).length>12000||Object.entries(s.completed).some(([key,value])=>!bounded(key,300)||typeof value!=='boolean')))return false;
 if(s.absences!=null&&(!Array.isArray(s.absences)||s.absences.length>500||s.absences.some(a=>!a||!bounded(a.id,100)||!knownSubjects[a.subject]||!knownYear(a.year)||!validDate(a.start)||!validDate(a.end)||a.start>a.end||!bounded(a.title,200)||!Array.isArray(a.optionIds)||a.optionIds.length>100||a.optionIds.some(id=>!bounded(id,100)))))return false;
 const event=e=>e&&bounded(e.id,200)&&knownSubjects[e.subject]&&knownYear(e.year)&&knownSubjects[e.subject].tracks.some(t=>t.id===e.track)&&(!e.groupId||bounded(e.groupId,100))&&kinds.includes(e.kind)&&validDate(e.start)&&validDate(e.end)&&e.start<=e.end&&e.start>=e.year+'-07-01'&&e.end<=(+e.year+1)+'-09-30'&&bounded(e.title,250)&&bounded(e.notes||'',5000)&&(!e.time||/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time));
 if(!s.added.every(event)||new Set(s.added.map(e=>e.id)).size!==s.added.length)return false;
 if(!Object.entries(s.overrides).every(([id,e])=>bounded(id,200)&&id!=='__proto__'&&(e===null||event(e)&&e.id===id)))return false;
 if(s.orders!=null&&(!s.orders||typeof s.orders!=='object'||Array.isArray(s.orders)||Object.keys(s.orders).length>300||Object.entries(s.orders).some(([key,order])=>!/^[-a-z]+:20\d{2}:.+$/.test(key)||!Array.isArray(order)||order.length>50||!order.every(code=>bounded(code,80)))))return false;
 if(s.planAnchors!=null&&(!s.planAnchors||typeof s.planAnchors!=='object'||Array.isArray(s.planAnchors)||Object.keys(s.planAnchors).length>300||Object.entries(s.planAnchors).some(([key,a])=>!/^[-a-z]+:20\d{2}:.+$/.test(key)||!F.validAnchor(a))))return false;
 return (s.free||[]).every(c=>c&&bounded(c.id,200)&&c.id.startsWith('free-')&&bounded(c.title,200)&&validDate(c.start)&&validDate(c.end)&&c.start<=c.end&&c.start>='2026-08-01'&&c.end<='2100-08-31'&&Array.isArray(c.tracks)&&c.tracks.every(t=>['5','6','7','8','9','10','EF','Q1 GK','Q1 LK','Q2 GK','Q2 LK'].includes(t))&&(!c.subject||knownSubjects[c.subject]));
}
function profileKey(uid){return `thomaeum-fachkalender-profile-v1:${uid}`}
function loadLocal(key){try{const raw=localStorage.getItem(key);if(!raw)return blankState();const value=JSON.parse(raw);if(validState(value))return normalizeState(value);loadWarning='Gespeicherte eigene Planung konnte nicht übernommen werden. Die Curriculumsplanung wird angezeigt.'}catch{storageOK=false}return blankState()}
state=blankState();data.years={...builtinYears};
function updateYears(){ $('year').innerHTML=Object.keys(data.years).sort().map(y=>`<option value="${y}">${esc(data.years[y].label)}</option>`).join('') }
updateYears();
let subject='chemie',year=data.years[params.get('jahr')]?params.get('jahr'):'2026';
let month=data.years[year].start.slice(0,7)+'-01',view='week',events=[],stats=[],selected=new Set(),editId=null,baseEvents=[];
const weekdayNames=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag'];
function groupList(){
 const explicit=state.groups?.[subject]?.[year];
 if(Array.isArray(explicit))return explicit;
 return Object.entries(state.timetable?.[subject]||{}).filter(([,days])=>Object.keys(days).length).map(([track,days])=>({id:'legacy-'+track.toLowerCase().replace(/[^a-z0-9]+/g,'-'),track,label:data.subjects[subject].tracks.find(t=>t.id===track)?.label||track,days}));
}
function trackOptions(){
 const groups=groupList();
 return data.subjects[subject].tracks.flatMap(track=>{
  const configured=groups.filter(g=>g.track===track.id);
  return configured.length?configured.map(g=>({id:g.id,track:track.id,trackLabel:track.label,label:g.label,days:g.days,groupId:g.id})): [{id:track.id,track:track.id,trackLabel:track.label,label:track.label,days:{},groupId:null}];
 });
}
function optionFor(id){return trackOptions().find(o=>o.id===id)}
function choiceId(e){return e.groupId||e.track}
function scheduleFor(e){return optionFor(choiceId(e))?.days||{}}
function filterKey(){return subject+':'+year}
function cancelledKey(e,day){return `${subject}|${year}|${choiceId(e)}|${day}`}
function isCancelled(key){if(Object.hasOwn(state.cancelled||{},key))return state.cancelled[key];const [sub,y,id,day]=key.split('|');return (state.absences||[]).some(a=>a.subject===sub&&a.year===y&&a.start<=day&&a.end>=day&&a.optionIds.includes(id))}
function selectedTracks(){return new Set(trackOptions().filter(o=>selected.has(o.id)).map(o=>o.track))}
function clearUnitOverrides(track){const ids=[...P.unitsFor(data,subject,year,track).map(u=>`uv-${subject}-${year}-${u.code}`),...(state.customUnits||[]).filter(u=>u.subject===subject&&u.year===year&&u.track===track).map(u=>`xuv-${subject}-${year}-${u.id}`)];for(const id of Object.keys(state.overrides))if(ids.some(base=>id===base||id.startsWith(base+'~')))delete state.overrides[id]}
let weekStart=(()=>{const now=new Date(),today=P.iso(new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())));return P.add(today,-((P.parse(today).getUTCDay()+6)%7))})();
$('subject').value=publishedData.subjects[params.get('fach')]?params.get('fach'):'chemie';$('chemie-edition').value=edition;$('year').value=year;
function profileRef(uid){return doc(db,'users',uid,'workStates','fachkalender-v1')}
function save(message){
 const key=currentUser?profileKey(currentUser.uid):GUEST_KEY;
 try{const serialized=JSON.stringify(state);localStorage.setItem(key,serialized);storageOK=true;if(new TextEncoder().encode(serialized).length>850000){$('save-status').textContent='Die persönliche Planung ist für die Cloud zu groß. Exportiere eine Sicherung und entferne nicht benötigte Einträge.';return}}catch{storageOK=false}
 if(currentUser&&!currentUser.emailVerified){$('save-status').textContent='Diese Änderung bleibt vorerst auf diesem Gerät. Bitte bestätige deine E-Mail-Adresse, damit sie mit deinem Profil synchronisiert werden kann.';return}
 if(currentUser){$('save-status').textContent=message||'Änderung lokal gesichert; Synchronisierung läuft …';clearTimeout(cloudTimer);const uid=currentUser.uid,payload=normalizeState(JSON.parse(JSON.stringify(state)));cloudTimer=setTimeout(()=>{cloudQueue=cloudQueue.then(()=>setDoc(profileRef(uid),{appId:APP_ID,activityId:ACTIVITY_ID,title:'Fachkalender',payload,schemaVersion:3,updatedAt:serverTimestamp()},{merge:true})).then(()=>{if(currentUser?.uid===uid)$('save-status').textContent='Persönliche Planung mit deinem Konto synchronisiert.'}).catch(error=>{if(currentUser?.uid===uid)$('save-status').textContent='Synchronisierung nicht möglich. Die lokale Sicherung bleibt erhalten ('+friendlyError(error)+').'})},450);return}
 $('save-status').textContent=message||'Änderung nur auf diesem Gerät gespeichert. Melde dich an, um sie in deinem persönlichen Profil zu sichern.';
}
function friendlyError(error){const messages={'auth/invalid-email':'Bitte eine gültige E-Mail-Adresse eingeben.','auth/invalid-credential':'E-Mail-Adresse oder Passwort stimmen nicht.','auth/email-already-in-use':'Für diese E-Mail-Adresse gibt es bereits ein Konto.','auth/weak-password':'Das Passwort muss mindestens 8 Zeichen lang sein.','auth/too-many-requests':'Zu viele Versuche. Bitte später erneut probieren.','permission-denied':'Zugriff abgelehnt. Bitte E-Mail-Bestätigung und Anmeldung prüfen.','unavailable':'Firebase ist vorübergehend nicht erreichbar.'};return messages[error?.code]||'Bitte Verbindung und Eingaben prüfen.'}
async function activateProfile(user){
 clearTimeout(cloudTimer);currentUser=user;state=blankState();data.years=structuredClone(builtinYears);updateYears();
 if(!user){currentUser=null;state=loadLocal(GUEST_KEY);$('account').textContent='Anmelden';$('account-label').textContent='Gastmodus';$('signout').hidden=true;$('save-status').textContent='Gastmodus: Änderungen werden nur auf diesem Gerät gespeichert.';setContext();return}
 $('account').textContent=user.email||'Mein Konto';$('account-label').textContent=user.emailVerified?'Persönliches Profil':'E-Mail bestätigen';$('signout').hidden=false;setContext();
 if(!user.emailVerified){$('save-status').textContent='Bitte bestätige deine E-Mail-Adresse, um Änderungen in deinem Profil zu sichern.';setContext();return}
 try{const snapshot=await getDoc(profileRef(user.uid));let loaded=blankState();if(snapshot.exists()){const value=snapshot.data();if(value.appId!==APP_ID||value.activityId!==ACTIVITY_ID||!validState(value.payload))throw Error('invalid-profile');loaded=normalizeState(value.payload)}else{const local=loadLocal(profileKey(user.uid));if(JSON.stringify(local)!==JSON.stringify(blankState()))loaded=local}
   if(currentUser?.uid!==user.uid)return;state=loaded;$('save-status').textContent=snapshot.exists()?'Persönliche Planung aus deinem Konto geladen.':'Noch keine Kontoplanung vorhanden. Änderungen werden privat gespeichert.';setContext();
 }catch(error){$('save-status').textContent=error.message==='invalid-profile'?'Das gespeicherte Profil hat ein ungültiges Format. Angezeigt wird die unveränderte Curriculumsplanung.':'Persönliche Planung konnte nicht geladen werden. Bitte Verbindung prüfen; die gemeinsame Curriculumsplanung bleibt sichtbar.';}
}
function closureList(){const values=S.merged(data,sharedSettings).closures,seen=new Set();return values.filter(c=>{const key=[c.start,c.end,c.title,...c.tracks].join('|');if(seen.has(key))return false;seen.add(key);return true})}
function planningAbsences(){
 const blocked=new Map();
 for(const a of state.absences||[])if(a.subject===subject&&a.year===year)for(const id of a.optionIds)for(const day of P.dates(a.start,a.end))blocked.set(`${subject}|${year}|${id}|${day}`,true);
 for(const [key,value] of Object.entries(state.cancelled||{}))if(key.startsWith(subject+'|'+year+'|'))blocked.set(key,value);
 return [...blocked].filter(([,value])=>value).map(([key])=>{const [sub,y,id,day]=key.split('|');return {subject:sub,year:y,start:day,end:day,optionIds:[id]}});
}
function capturePlan(tracks,source=events){
 state.planAnchors=state.planAnchors||{};
 for(const track of tracks)state.planAnchors[orderKey(track)]=F.snapshot(source,track,new Date().toLocaleDateString('sv-SE'),(sharedSettings.revisions||[]).length);
}
function changePlan(tracks,scope,mutation,message){
 const before=structuredClone(state),affected=[...new Set(tracks)];
 if(scope==='remaining')capturePlan(affected);
 mutation();for(const track of affected)clearUnitOverrides(track);
 if(!refresh({changedTracks:affected,rebuildTracks:scope==='year'?affected:[]})){const warning=$('save-status').textContent;state=before;refresh();$('save-status').textContent=warning;return false}
 capturePlan(affected,baseEvents);save(message+(scope==='year'?' Das gesamte Schuljahr wurde neu berechnet.':' Nur die verbleibende Unterrichtszeit wurde neu verteilt.'));return true;
}
function refresh(options={}){
 const explicit=Array.isArray(state.groups?.[subject]?.[year]);
 let result;try{result=F.build(data,builtinYears,sharedSettings,subject,year,state.orders||{},(state.customUnits||[]).filter(u=>u.subject===subject&&u.year===year),explicit?{}:state.timetable?.[subject]||{},groupList(),planningAbsences(),new Date().toLocaleDateString('sv-SE'),{anchors:state.planAnchors||{},...options})}catch(e){$('calendar').innerHTML='<p class="empty">'+esc(e.message)+'</p>';$('save-status').textContent=e.message+' Die Änderung wurde nicht übernommen.';return false}baseEvents=result.events;stats=result.stats;
 events=baseEvents.filter(e=>state.overrides[e.id]!==null).map(e=>{
  const own=state.overrides[e.id];if(!own)return e;
  if(e.kind==='unit'){const schedule=scheduleFor(e);return {...e,start:own.start,end:own.end,meetingDays:P.dates(own.start,own.end).filter(d=>!P.closed(d,e.track,closureList())&&(!Object.keys(schedule).length||schedule[P.parse(d).getUTCDay()])),notes:own.notes||e.notes,custom:true};}
  return {...e,...own,custom:true};
 });
 for(const a of planningAbsences())for(const id of a.optionIds){const option=optionFor(id),day=a.start;if(!option||P.closed(day,option.track,closureList())||Object.keys(option.days).length&&!option.days[P.parse(day).getUTCDay()]||events.some(e=>['unit','prep'].includes(e.kind)&&choiceId(e)===id&&e.meetingDays?.includes(day)))continue;events.push({id:'loss-'+id+'-'+day,kind:'lesson-loss',track:option.track,groupId:option.groupId,groupLabel:option.label,start:day,end:day,title:'Unterricht ausgefallen',custom:true})}
 events.push(...state.added.filter(e=>e.subject===subject&&e.year===year).map(e=>{const option=optionFor(choiceId(e))||trackOptions().find(o=>o.track===e.track);return {...e,groupId:option?.groupId||null,groupLabel:option?.label||e.track,custom:true}}));
 render();
 return true;
}
function tracks(){
 const options=trackOptions(),stored=state.filters[filterKey()]||state.filters[subject],configured=options.filter(o=>o.groupId).map(o=>o.id);
 const chosen=Array.isArray(stored)?stored.flatMap(id=>options.some(o=>o.id===id)?[id]:options.filter(o=>o.track===id).map(o=>o.id)):configured.length?configured:options.map(o=>o.id);
 selected=new Set(chosen);
 $('tracks').innerHTML=options.map(o=>`<label><input type="checkbox" value="${esc(o.id)}" ${selected.has(o.id)?'checked':''}>${esc(o.label)}${o.groupId?` <small>· ${esc(o.trackLabel)}</small>`:''}</label>`).join('');
 $('event-track').innerHTML=options.map(o=>`<option value="${esc(o.id)}">${esc(o.label)}${o.groupId?' · '+esc(o.trackLabel):''}</option>`).join('');
 $('absence-group').innerHTML='<option value="all">Alle meine eingetragenen Lerngruppen</option>'+options.map(o=>`<option value="${esc(o.id)}">${esc(o.label)}${o.groupId?' · '+esc(o.trackLabel):''}</option>`).join('');
}
function months(){const out=[];for(let m=data.years[year].start.slice(0,7)+'-01';m<=data.years[year].end;){out.push(m);const d=P.parse(m);d.setUTCMonth(d.getUTCMonth()+1);m=P.iso(d)}return out}
function setContext(){
 const visibleSubject=$('subject').value;
 edition=visibleSubject==='chemie'&&workingData?$('chemie-edition').value:'veroeffentlicht';
 $('chemie-edition-wrap').hidden=visibleSubject!=='chemie'||!workingData;
 data=edition==='arbeitsversion'?workingData:publishedData;builtinYears=structuredClone(data.years);
 subject=edition==='arbeitsversion'?'chemie-arbeitskopie':visibleSubject;
 data.years={...builtinYears,...sharedSettings.years};updateYears();
 year=data.years[$('year').value]?$('year').value:Object.keys(data.years).sort()[0];$('year').value=year;
 month=data.years[year].start.slice(0,7)+'-01';if(weekStart<data.years[year].start||weekStart>data.years[year].end)weekStart=P.add(data.years[year].start,-((P.parse(data.years[year].start).getUTCDay()+6)%7));tracks();
 $('month').innerHTML=months().map(m=>`<option value="${m}">${monthName(m)}</option>`).join('');
 $('subtitle').textContent=data.subjects[subject].label+' · '+data.years[year].label;
 $('curriculum-link').href=data.subjects[subject].curriculum;
 const colors={chemie:'#19665d','chemie-arbeitskopie':'#19665d',physik:'#245d91',biologie:'#9c493c','mensch-und-umwelt':'#466b37'};
 document.body.dataset.subject=subject;
 if(document.documentElement.dataset.theme!=='dark')document.body.style.setProperty('--accent',colors[subject]);else document.body.style.removeProperty('--accent');
 const url=new URL(location.href);url.searchParams.set('fach',visibleSubject);url.searchParams.set('jahr',year);if(edition==='arbeitsversion')url.searchParams.set('fassung','arbeitsversion');else url.searchParams.delete('fassung');history.replaceState(null,'',url);
 $('notice').textContent=edition==='arbeitsversion'?'Arbeitsversion des schulinternen Chemiecurriculums · Die Zeiträume werden anhand der dort ausgewiesenen Zeitrichtwerte berechnet.':'Planungsvorschlag aus dem Curriculum · '+(year==='2026'?'Bekannte schulische Klausuren und amtliche Abiturtermine sind eingetragen.':'Amtliche Abiturtermine sind eingetragen; schulische Klausurtermine können ergänzt werden.')+' Jahrgänge und Kursarten sind unabhängig auswählbar.';
 $('cohort-note').textContent=edition==='arbeitsversion'?'Arbeitsversion: Sek I nach KLP 2019, Oberstufe nach dem geltenden KLP 2022. Der Kalender zeigt die dort ausgewiesenen Unterrichtsvorhaben; die Arbeitsfassung bleibt getrennt von der veröffentlichten Fassung.':+year>=2027?(subject==='chemie'?'Chemie: Die Fassung zum Kernlehrplan 2026 wird jahrgangsweise eingesetzt: EF ab 2027/28, Q1 ab 2028/29 und Q2 ab 2029/30. Frühere Jahrgänge und Sek I behalten ihre jeweilige Grundlage.':subject==='mensch-und-umwelt'?'Mensch und Umwelt: Klassen 9 und 10, jeweils drei Wochenstunden.':'Für die ab 2027/28 neu eintretenden EF-Jahrgänge und ihre späteren Q-Phasen dient die Vorhabenfolge des vorhandenen Curriculums als Übergangsplanung. Der Abgleich mit dem neuen Kernlehrplan 2026 ist vor der Umsetzung erforderlich.'):'Planungsgrundlage ist die für diese Jahrgänge bestehende Fassung des schulinternen Curriculums.';
 if(data.years[year].dynamic)$('notice').textContent='NRW-Ferien und Feiertage aus dem Netz geladen · '+(data.years[year].q2Provisional?'Q2-Unterrichtsende ist ein vorläufiger Planungswert; die Kalenderverwaltung prüft den amtlichen Rahmen. ':'Q2-Rahmen schulweit festgelegt. ')+(data.years[year].halfProvisional?'Halbjahreswechsel vorläufig. ':'')+'Schulische Klausuren und Abiturtermine bitte ergänzen.';
 $('stand').textContent=data.status;$('sources').innerHTML=data.sources.map(x=>`<p><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)} ↗</a></p>`).join('');refresh();
}
function shown(e){return selected.has(choiceId(e))&&(e.custom||e.kind!=='makeup')}
function onDay(e,d){const schedule=scheduleFor(e);if(['unit','prep'].includes(e.kind)&&Array.isArray(e.meetingDays))return e.meetingDays.includes(d);return d>=e.start&&d<=e.end&&(!['unit','buffer','prep'].includes(e.kind)||(!P.closed(d,e.track,closureList())&&(!Object.keys(schedule).length||Boolean(schedule[P.parse(d).getUTCDay()]))))}
function semesterStart(track,c,today){const boundary=track.startsWith('Q2')?c.q2half:c.half;return today>=boundary?boundary:c.start}
function semesterEnd(track,c,from){const boundary=track.startsWith('Q2')?c.q2half:c.half;return from>=boundary?(track.startsWith('Q2')?c.q2end:c.end):P.add(boundary,-1)}
function lessonCount(option,start,end){const t=data.subjects[subject].tracks.find(x=>x.id===option.track);if(!t||end<start)return {planned:0,held:0,remaining:0,cancelled:0,exact:false};const schedule=option.days||{},exact=Object.keys(schedule).length>0,today=new Date().toLocaleDateString('sv-SE');let planned=0,held=0,remaining=0,cancelled=0;for(const day of P.dates(start,end)){if(P.closed(day,option.track,closureList()))continue;const weekday=P.parse(day).getUTCDay(),periods=exact?(schedule[weekday]||0):weekday>0&&weekday<6?t.weekly/5:0;if(!periods)continue;planned+=periods;if(isCancelled(`${subject}|${year}|${option.id}|${day}`))cancelled+=periods;else if(day<today)held+=periods;else remaining+=periods}const round=n=>Math.round(n*10)/10;return {planned:round(planned),held:round(held),remaining:round(remaining),cancelled:round(cancelled),exact}}
function renderLessonSummary(){const c=data.years[year],today=new Date().toLocaleDateString('sv-SE'),rows=trackOptions().filter(o=>selected.has(o.id)).map(o=>{const from=semesterStart(o.track,c,today),to=semesterEnd(o.track,c,from),grade=events.filter(e=>e.kind==='grade'&&choiceId(e)===o.id&&e.start>=from&&e.start<=to).sort((a,b)=>a.start.localeCompare(b.start))[0],total=lessonCount(o,from,to),beforeGrade=grade?lessonCount(o,from,P.add(grade.start,-1)):null;return `<tr><th scope="row">${esc(o.label)}${o.groupId?`<small>${esc(o.trackLabel)}</small>`:''}</th><td>${from>=(o.track.startsWith('Q2')?c.q2half:c.half)?'2. Halbjahr':'1. Halbjahr'}<small>${fmt(from)}–${fmt(to)}</small></td><td>${total.planned}${total.exact?'':' · ca.'}</td><td>${total.held}${total.exact?'':' · ca.'}</td><td>${grade?`${beforeGrade.remaining}${beforeGrade.exact?'':' · ca.'}`:'–'}</td><td>${total.remaining}${total.exact?'':' · ca.'}</td><td>${total.cancelled}${total.exact?'':' · ca.'}</td><td>${grade?`<button type="button" class="grade-edit" data-event="${esc(grade.id)}">${esc(grade.title)} · ${fmt(grade.start)} bearbeiten</button>`:'<span class="hint">Kein Noteneintrag gesetzt</span>'}</td></tr>`}).join('');$('lesson-summary-table').innerHTML=rows?`<table><thead><tr><th scope="col">Lerngruppe</th><th scope="col">Halbjahr</th><th scope="col">Geplant im Halbjahr</th><th scope="col">Bisher erteilt</th><th scope="col">Noch bis Noteneintrag</th><th scope="col">Noch im Halbjahr</th><th scope="col">Ausgefallen</th><th scope="col">Noteneintrag</th></tr></thead><tbody>${rows}</tbody></table>`:'<p class="empty">Wähle mindestens eine Lerngruppe, um die Stundenübersicht zu sehen.</p>'}
function renderGradePreview(){const box=$('grade-summary');if($('event-kind').value!=='grade'){box.hidden=true;box.innerHTML='';return}const option=optionFor($('event-track').value),c=data.years[year],date=$('event-start').value||new Date().toLocaleDateString('sv-SE');if(!option){box.hidden=true;return}const from=semesterStart(option.track,c,date),to=semesterEnd(option.track,c,from),total=lessonCount(option,from,to),count=lessonCount(option,from,P.add(date,-1));box.hidden=false;box.innerHTML=`<strong>${esc(option.label)}: Unterricht vor dem Noteneintrag (${fmt(from)}–${fmt(P.add(date,-1))})</strong><br>${count.planned}${count.exact?'':' · ca.'} planmäßig; ${count.held}${count.exact?'':' · ca.'} bisher erteilt, ${count.remaining}${count.exact?'':' · ca.'} noch vorgesehen, ${count.cancelled}${count.exact?'':' · ca.'} ausgefallen. Im gesamten Halbjahr: ${total.planned}${total.exact?'':' · ca.'} Unterrichtsstunden.${count.exact?'':' Ergänze „Mein Stundenplan“ für eine taggenaue Berechnung.'}`}
function chip(e,range=false,day=null){
 const custom=e.custom?' ✎':'',title=(e.code?e.code+' · ':'')+e.title,option=optionFor(choiceId(e));
 const cancelled=day&&isCancelled(cancelledKey(e,day));
 const classes=`event-chip ${esc(e.kind)} c${Number.isInteger(e.color)?e.color%6:0} ${e.custom?'custom':''} ${cancelled?'cancelled':''}`;
 const periods=day?scheduleFor(e)?.[P.parse(day).getUTCDay()]:null;
 const body=`<strong>${esc(option?.label||e.groupLabel||e.track)}${custom}${e.time?' · '+esc(e.time):''}${periods?` · ${periods===2?'Doppelstunde':'Einzelstunde'}`:''}</strong>${esc(title)}${range?`<small>${fmt(e.start)}${e.end!==e.start?'–'+fmt(e.end):''}</small>`:''}`;
 if(e.kind==='lesson-loss')return `<div class="${classes} unit-card cancelled">${body}${day?`<button class="attendance cancelled" data-cancelled="${esc(cancelledKey(e,day))}">↶ Ausfall zurücknehmen</button>`:''}</div>`;
 const attendance=day&&['unit','prep'].includes(e.kind)?`<button class="attendance ${cancelled?'cancelled':''}" data-cancelled="${esc(cancelledKey(e,day))}" aria-label="${cancelled?'Ausfall zurücknehmen':'Stunde als ausgefallen markieren'}">${cancelled?'↶ Ausfall zurücknehmen':'☐ Als ausgefallen markieren'}</button>`:'';
 const url=baseEvents.find(x=>x.id===e.id)?.url;
 if(e.kind==='unit'&&e.extraUnit)return `<div class="${classes} unit-card"><button class="unit-link custom-unit-link" data-custom-unit="${esc(e.customUnitId)}">${body}<span class="unit-open">Persönliches Vorhaben · bearbeiten</span></button>${attendance}</div>`;
 if(e.kind==='unit'&&url)return `<div class="${classes} unit-card"><a class="unit-link" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(title+' im Curriculum öffnen')}">${body}<span class="unit-open">Im Curriculum öffnen ↗</span></a><button class="unit-edit" data-event="${esc(e.id)}" aria-label="${esc((option?.label||e.track)+' · '+title+': Zeitraum bearbeiten')}">✎ Bearbeiten</button>${attendance}</div>`;
 if(e.kind==='prep')return `<div class="${classes} unit-card"><button class="unit-link custom-unit-link" data-event="${esc(e.id)}">${body}</button>${attendance}</div>`;
 return `<button class="${classes}" data-event="${esc(e.id)}" title="${esc((option?.label||e.track)+' · '+title+' · '+fmt(e.start)+'–'+fmt(e.end))}">${body}</button>`;
}
function weekLabel(d){const date=P.parse(d);date.setUTCDate(date.getUTCDate()+4-(date.getUTCDay()||7));return Math.ceil((((date-new Date(Date.UTC(date.getUTCFullYear(),0,1)))/86400000)+1)/7)}
function render(){
 if(view==='week'){
  const config=data.years[year],visible=weekStart<config.start?config.start:weekStart>config.end?config.end:weekStart;
  month=visible.slice(0,7)+'-01';
 }
 $('period-title').textContent=view==='month'?monthName(month):view==='week'?`${fmt(weekStart)}–${fmt(P.add(weekStart,6))}`:'Schuljahr '+data.years[year].label;$('month').value=month;
 $('prev').setAttribute('aria-label',view==='week'?'Vorherige Woche':'Vorheriger Monat');$('next').setAttribute('aria-label',view==='week'?'Nächste Woche':'Nächster Monat');
 $('week-view').setAttribute('aria-pressed',String(view==='week'));$('month-view').setAttribute('aria-pressed',String(view==='month'));$('year-view').setAttribute('aria-pressed',String(view==='year'));
 const ms=months(),config=data.years[year];$('prev').disabled=view==='year'||(view==='month'?month===ms[0]:weekStart<=config.start);$('next').disabled=view==='year'||(view==='month'?month===ms.at(-1):P.add(weekStart,6)>=config.end);$('month').disabled=view!=='month';
 const display=events.filter(shown),c=data.years[year],free=closureList(),today=new Date().toLocaleDateString('sv-SE');
 if(!selected.size){$('calendar').innerHTML='<p class="empty">Keine Jahrgangsstufe ausgewählt. Oben die gewünschten Klassen oder Kurse einschalten.</p>'}
 else if(view==='month'){
  const first=P.add(month,-((P.parse(month).getUTCDay()+6)%7)),endDate=P.parse(month);endDate.setUTCMonth(endDate.getUTCMonth()+1);endDate.setUTCDate(0);
  const last=P.add(P.iso(endDate),6-((endDate.getUTCDay()+6)%7));
  let html='<div class="month-scroll"><div class="month-grid">'+['Mo','Di','Mi','Do','Fr','Sa','So'].map(x=>`<div class="weekday">${x}</div>`).join('');
  for(const day of P.dates(first,last)){
   const closures=free.filter(x=>day>=x.start&&day<=x.end&&(!x.tracks.length||x.tracks.some(t=>selectedTracks().has(t))));
   const outside=day<c.start||day>c.end||day.slice(0,7)!==month.slice(0,7);
   const items=day<c.start||day>c.end?[]:display.filter(e=>onDay(e,day));
   html+=`<div class="day ${outside?'outside':''} ${[0,6].includes(P.parse(day).getUTCDay())?'weekend':''} ${closures.length&&$('show-closures').checked?'free':''} ${today===day?'today':''}"><time class="date-number" datetime="${day}">${P.parse(day).getUTCDate()}</time>`;
   if($('show-closures').checked)html+=closures.map(x=>`<span class="closure-label">${esc(x.title)}${x.tracks.length?' · '+esc([...new Set(x.tracks.map(t=>t.split(' ')[0]))].join('/')):''}</span>`).join('');
   if(day===c.half)html+='<span class="closure-label">Beginn 2. Halbjahr · EF/Q1/Sek I</span>';
   if(day===c.q2half&&[...selectedTracks()].some(t=>t.startsWith('Q2')))html+='<span class="closure-label">Beginn Q2.2</span>';
   html+=items.map(e=>chip(e,false,day)).join('')+'</div>';
  }$('calendar').innerHTML=html+'</div></div>';
 }else if(view==='week'){
  const days=P.dates(weekStart,P.add(weekStart,6));let html='<div class="month-scroll"><div class="month-grid">'+days.map(d=>`<div class="weekday ${P.iso(P.parse(d))===today?'current-weekday':''}">${weekdayNames[(P.parse(d).getUTCDay()+6)%7]||'Wochenende'}<br>${fmt(d)}</div>`).join('');
  for(const d of days){const closures=free.filter(x=>d>=x.start&&d<=x.end&&(!x.tracks.length||x.tracks.some(t=>selectedTracks().has(t))));const items=d<config.start||d>config.end?[]:display.filter(e=>onDay(e,d));html+=`<div class="day ${[0,6].includes(P.parse(d).getUTCDay())?'weekend':''} ${closures.length&&$('show-closures').checked?'free':''} ${d===today?'today':''}"><time class="date-number" datetime="${d}">${P.parse(d).getUTCDate()}</time>`;if($('show-closures').checked)html+=closures.map(x=>`<span class="closure-label">${esc(x.title)}</span>`).join('');html+=(items.map(e=>chip(e,false,d)).join('')||(!closures.length?'<span class="hint">Keine geplante Stunde</span>':''))+'</div>'}
  $('calendar').innerHTML=html+'</div></div>';
 }else{
  const ts=trackOptions().filter(o=>selected.has(o.id));
  let html='<div class="table-scroll"><table class="year-table"><thead><tr><th scope="col">Woche</th>'+ts.map(t=>`<th scope="col">${esc(t.label)}</th>`).join('')+'</tr></thead><tbody>';
  for(let a=P.add(c.start,-((P.parse(c.start).getUTCDay()+6)%7));a<=c.end;a=P.add(a,7)){
   const b=P.add(a,6),days=P.dates(a,b),closures=free.filter(x=>x.start<=b&&x.end>=a&&(!x.tracks.length||x.tracks.some(t=>selectedTracks().has(t))));
   html+=`<tr class="${closures.length&&$('show-closures').checked?'holiday-row':''}"><td><strong>KW ${weekLabel(a)}</strong><br>${fmt(a)}<br>bis ${fmt(b)}`;
   if($('show-closures').checked)html+=closures.map(x=>`<span class="closure-label">${esc(x.title)}</span>`).join('');
   html+='</td>'+ts.map(t=>'<td>'+display.filter(e=>choiceId(e)===t.id&&days.some(d=>onDay(e,d))).map(e=>chip(e,true)).join('')+'</td>').join('')+'</tr>';
  }$('calendar').innerHTML=html+'</tbody></table></div>';
 }
 $('stats').innerHTML='<table><thead><tr><th>Jahrgang / Kurs</th><th>Wochenstunden</th><th>Verfügbare Schultage</th><th>Curriculum (UStd)</th><th>Eigene zusätzliche Vorhaben (UStd.)</th><th>Kalenderansatz (UStd)</th><th>Abiturvorbereitung (UStd)</th><th>Anpassung</th></tr></thead><tbody>'+stats.map(s=>`<tr><td>${esc(s.groupLabel||s.track)}</td><td>${s.weekly}</td><td>${s.days}</td><td>${s.hours}</td><td>${s.extraHours||0}</td><td>${s.planned}</td><td>${s.preparation}</td><td>${Math.round(s.factor*100)} % des Zeitrichtwerts</td></tr>`).join('')+'</tbody></table>';
 renderLessonSummary();
}
function eventWarning(e){
 const warnings=[];
 if(['exam','abitur','makeup','event'].includes(e.kind)&&P.dates(e.start,e.end).some(d=>P.closed(d,e.track,closureList())))warnings.push('Der Termin liegt ganz oder teilweise an einem Wochenende oder schulfreien Tag.');
 if(e.kind==='unit'&&events.some(x=>x.id!==e.id&&choiceId(x)===choiceId(e)&&x.kind==='unit'&&x.start<=e.end&&x.end>=e.start))warnings.push('Der Zeitraum überschneidet sich mit einem anderen Unterrichtsvorhaben. Die übrigen Vorhaben werden nicht automatisch verschoben.');
 return warnings.join(' ');
}
function openEvent(id,defaults={}){
 editId=id;const start=defaults.start||(month<data.years[year].start?data.years[year].start:month),choice=defaults.track||[...selected][0]||trackOptions()[0].id,option=optionFor(choice);const e=id?events.find(x=>x.id===id):{title:defaults.title||'',kind:defaults.kind||'exam',track:option?.track||data.subjects[subject].tracks[0].id,groupId:option?.groupId||null,start,end:start,notes:''};
 if(!e)return;
 $('event-heading').textContent=id?'Termin / Vorhaben bearbeiten':'Neuen Termin hinzufügen';
 for(const f of ['title','kind','start','end','time','notes'])$('event-'+f).value=e[f]||'';
 $('event-track').value=choiceId(e);
 const fixedCurriculumUnit=e.kind==='unit'&&Boolean(id);
 for(const f of ['title','track','kind'])$('event-'+f).disabled=fixedCurriculumUnit;
 for(const f of ['start','end']){$('event-'+f).min=data.years[year].start;$('event-'+f).max=data.years[year].end}
 $('event-context').textContent=data.subjects[subject].label+' · '+data.years[year].label+(e.hours?` · Richtwert: ${e.hours} UStd`:'')+(fixedCurriculumUnit?' · Titel, Jahrgang und Vorhabentyp sind durch das Curriculum vorgegeben.':'');
 const original=baseEvents.find(x=>x.id===id);let links='';
 if(original?.url)links=`<a href="${esc(original.url)}" target="_blank" rel="noopener">Unterrichtsvorhaben im Curriculum öffnen ↗</a>`;
 if(original?.source)links+='<br>Quelle: '+(original.source.startsWith('https://')?`<a href="${esc(original.source)}" target="_blank" rel="noopener">Amtliche Termine ↗</a>`:esc(original.source));
 $('event-source').innerHTML=links;$('event-delete').hidden=!id;$('event-restore').hidden=!id||!Object.hasOwn(state.overrides,id);
 $('event-warning').textContent=eventWarning(e);renderGradePreview();$('event-dialog').showModal();
}
$('event-kind').onchange=renderGradePreview;$('event-track').onchange=renderGradePreview;$('event-start').oninput=renderGradePreview;
$('event-form').onsubmit=e=>{
 e.preventDefault();const existing=events.find(x=>x.id===editId);const item={...(existing||{}),id:editId||'custom-'+crypto.randomUUID(),subject,year};
 for(const f of ['start','end','time','notes'])item[f]=$('event-'+f).value.trim();
 if(!existing||existing.kind!=='unit'){
  for(const f of ['title','kind'])item[f]=$('event-'+f).value.trim();
  const option=optionFor($('event-track').value);if(!option){$('event-warning').textContent='Bitte eine gültige Lerngruppe wählen.';return}
  item.track=option.track;item.groupId=option.groupId;
 }
 if(item.end<item.start){$('event-warning').textContent='Das Ende darf nicht vor dem Beginn liegen.';return}
 if(item.start<data.years[year].start||item.end>data.years[year].end){$('event-warning').textContent='Bitte einen Zeitraum innerhalb des gewählten Schuljahres wählen.';return}
 const index=state.added.findIndex(x=>x.id===editId);
 if(index>=0)state.added[index]=item;else if(editId)state.overrides[editId]=item;else state.added.push(item);
 save();$('event-dialog').close();refresh();const warning=eventWarning(item);if(warning)$('save-status').textContent+=' Hinweis: '+warning;
};
$('event-delete').onclick=()=>{const index=state.added.findIndex(x=>x.id===editId);if(index>=0)state.added.splice(index,1);else state.overrides[editId]=null;save();$('event-dialog').close();refresh()};
$('event-restore').onclick=()=>{delete state.overrides[editId];save();$('event-dialog').close();refresh()};
function orderKey(track){return `${subject}:${year}:${track}`}
function orderUnits(track){return [...P.unitsFor(data,subject,year,track),...(state.customUnits||[]).filter(u=>u.subject===subject&&u.year===year&&u.track===track).map(u=>({...u,code:u.id,extraUnit:true}))]}
function canonicalOrder(track){return orderUnits(track).map(x=>x.code)}
function currentOrder(track){const canonical=canonicalOrder(track),stored=state.orders?.[orderKey(track)];if(!Array.isArray(stored))return canonical;const valid=stored.filter(code=>canonical.includes(code));return [...new Set(valid),...canonical.filter(code=>!valid.includes(code))]}
function lockedOrderCount(track){
 const today=new Date().toLocaleDateString('sv-SE'),order=currentOrder(track);let last=-1;
 for(const e of events.filter(e=>e.kind==='unit'&&e.track===track))if((e.meetingDays||[]).some(day=>day<today&&!isCancelled(cancelledKey(e,day))||state.completed?.[cancelledKey(e,day)]))last=Math.max(last,order.indexOf(e.customUnitId||e.code));
 return last+1;
}
function allowedOrder(track,order){const count=lockedOrderCount(track),current=currentOrder(track);return order.slice(0,count).every((code,i)=>code===current[i])}
function renderOrderList(){
 const track=$('order-track').value,units=orderUnits(track),byCode=new Map(units.map(x=>[x.code,x])),locked=editingOrderScope==='remaining'?lockedOrderCount(track):0,list=editingOrder||currentOrder(track);
 $('order-scope-note').textContent=editingOrderScope==='year'?'Gesamtes Schuljahr: Auch begonnene und abgeschlossene Vorhaben können verschoben werden.':'Nur verbleibende Unterrichtszeit: Begonnene und abgeschlossene Vorhaben sind gesperrt. Die bereits erteilten Stunden bleiben erhalten.';
 $('order-list').innerHTML=list.map((code,index)=>{const unit=byCode.get(code);return `<li><div><strong>${unit.extraUnit?'Eigenes Vorhaben':esc(unit.code)}</strong> · ${esc(unit.title)} <small>${unit.hours} UStd${index<locked?' · bereits begonnen / abgeschlossen · gesperrt':''}</small></div><div class="actions"><button type="button" data-order-move="up" data-order-index="${index}" aria-label="${esc(unit.title)} nach oben">↑</button><button type="button" data-order-move="down" data-order-index="${index}" aria-label="${esc(unit.title)} nach unten">↓</button></div></li>`}).join('');
 $('order-list').querySelectorAll('[data-order-move]').forEach(button=>{const index=Number(button.dataset.orderIndex),direction=button.dataset.orderMove;button.disabled=index<locked||(direction==='up'?index<=locked:index===list.length-1)});
}
$('arrange-units').onclick=async()=>{
 const scope=await window.FachkalenderScope.ask();if(!scope)return;editingOrderScope=scope;
 const ts=data.subjects[subject].tracks;$('order-track').innerHTML=ts.map(t=>`<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('');
 $('order-track').value=optionFor([...selected][0])?.track||ts[0].id;$('order-status').textContent='';editingOrder=null;renderOrderList();$('order-dialog').showModal();
};
function timetableCard(group){
 const tracks=data.subjects[subject].tracks,days=group.days||{};
 const card=document.createElement('div');card.className='timetable-card';card.dataset.groupId=group.id;
 card.innerHTML=`<div class="timetable-card-head"><label>Lerngruppe<input class="tt-label" maxlength="80" required value="${esc(group.label)}" placeholder="z. B. 7a oder Q2 LK A"></label><label>Jahrgang / Kurs<select class="tt-track">${tracks.map(t=>`<option value="${esc(t.id)}" ${group.track===t.id?'selected':''}>${esc(t.label)}</option>`).join('')}</select></label><button type="button" class="tt-remove" aria-label="Lerngruppe ${esc(group.label)} entfernen">Entfernen</button></div><div class="timetable-days">${weekdayNames.map((d,i)=>{const value=days[i+1]||0;return `<label>${esc(d)}<select class="tt-day" data-day="${i+1}"><option value="0" ${value===0?'selected':''}>Kein Unterricht</option><option value="1" ${value===1?'selected':''}>Einzelstunde</option><option value="2" ${value===2?'selected':''}>Doppelstunde</option></select></label>`}).join('')}</div>`;
 $('timetable-rows').append(card);
}
function drawTimetable(){ $('timetable-rows').replaceChildren();for(const group of groupList())timetableCard(group) }
$('timetable').onclick=()=>{drawTimetable();$('timetable-status').textContent='';$('timetable-dialog').showModal()};
$('timetable-add').onclick=()=>timetableCard({id:'lg-'+crypto.randomUUID(),track:data.subjects[subject].tracks[0].id,label:'',days:{}});
$('timetable-rows').onclick=e=>{const button=e.target.closest('.tt-remove');if(button)button.closest('.timetable-card').remove()};
$('timetable-save').onclick=async()=>{
 const previous=groupList(),next=[];
 for(const card of $('timetable-rows').querySelectorAll('.timetable-card')){
  const label=card.querySelector('.tt-label').value.trim(),track=card.querySelector('.tt-track').value,days={};
  card.querySelectorAll('.tt-day').forEach(sel=>{if(Number(sel.value))days[sel.dataset.day]=Number(sel.value)});
  if(!label){$('timetable-status').textContent='Bitte jede Lerngruppe benennen.';card.querySelector('.tt-label').focus();return}
  if(!Object.keys(days).length){$('timetable-status').textContent='Bitte für '+label+' mindestens einen Unterrichtstag wählen.';return}
  let id=card.dataset.groupId;if(previous.find(g=>g.id===id)?.track!==track)id='lg-'+crypto.randomUUID();
  next.push({id,track,label,days});
 }
 if(new Set(next.map(g=>g.label.toLowerCase())).size!==next.length){$('timetable-status').textContent='Bitte verschiedene Namen für die Lerngruppen wählen.';return}
 const scope=await window.FachkalenderScope.ask();if(!scope)return;
 const affected=[...new Set([...previous,...next].map(g=>g.track))];
 if(!changePlan(affected,scope,()=>{
  state.groups=state.groups||{};state.groups[subject]=state.groups[subject]||{};state.groups[subject][year]=next;
  const available=new Set(next.map(g=>g.id));
  for(const item of state.added.filter(e=>e.subject===subject&&e.year===year&&e.groupId&&!available.has(e.groupId))){const replacement=next.find(g=>g.track===item.track);item.groupId=replacement?.id||null}
  state.filters[filterKey()]=next.length?next.map(g=>g.id):data.subjects[subject].tracks.map(t=>t.id);
 },'Persönlicher Stundenplan gespeichert. Jede Lerngruppe wird eigenständig geplant und ausgewertet.')){$('timetable-status').textContent=$('save-status').textContent;return}
 $('timetable-dialog').close();tracks();render();
};
$('timetable-clear').onclick=async()=>{const scope=await window.FachkalenderScope.ask();if(!scope)return;if(!changePlan(data.subjects[subject].tracks.map(t=>t.id),scope,()=>{state.groups=state.groups||{};state.groups[subject]=state.groups[subject]||{};state.groups[subject][year]=[];delete state.filters[filterKey()]},'Stundenplan dieses Fachs und Schuljahres gelöscht.')){$('timetable-status').textContent=$('save-status').textContent;return}$('timetable-dialog').close();tracks();render()};
$('new-unit').onclick=()=>{const ts=data.subjects[subject].tracks;$('unit-track').innerHTML=ts.map(t=>`<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('');$('unit-id').value='';$('unit-title').value='';$('unit-hours').value='10';$('unit-notes').value='';$('unit-delete').hidden=true;$('unit-status').textContent='';$('unit-dialog').showModal()};
function customUnitStarted(id){const today=new Date().toLocaleDateString('sv-SE');return events.some(e=>e.customUnitId===id&&e.meetingDays?.some(day=>day<today))}
function openCustomUnit(id){const u=state.customUnits.find(x=>x.id===id);if(!u)return;$('unit-track').innerHTML=data.subjects[subject].tracks.map(t=>`<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('');$('unit-id').value=u.id;$('unit-track').value=u.track;$('unit-title').value=u.title;$('unit-hours').value=u.hours;$('unit-notes').value=u.notes||'';$('unit-delete').hidden=false;$('unit-status').textContent='Zeitansatz und Titel lassen sich anpassen; die Verteilung wird neu berechnet.';$('unit-dialog').showModal()}
$('unit-form').onsubmit=async e=>{e.preventDefault();const id=$('unit-id').value||'uvx-'+crypto.randomUUID(),track=$('unit-track').value,item={id,subject,year,track,title:$('unit-title').value.trim(),hours:Number($('unit-hours').value),notes:$('unit-notes').value.trim()};if(!Number.isFinite(item.hours)||item.hours<1||item.hours>400){$('unit-status').textContent='Bitte einen Zeitansatz zwischen 1 und 400 Unterrichtsstunden eingeben.';return}const scope=await window.FachkalenderScope.ask();if(!scope)return;const existing=state.customUnits.findIndex(x=>x.id===id),prior=existing>=0?state.customUnits[existing]:null;if(scope==='remaining'&&prior?.track!==track&&customUnitStarted(id)){$('unit-status').textContent='Ein begonnenes Vorhaben kann nur mit „Gesamtes Schuljahr“ einem anderen Jahrgang zugeordnet werden.';return}if(!changePlan([track,...(prior?[prior.track]:[])],scope,()=>{if(existing>=0)state.customUnits[existing]=item;else state.customUnits.push(item)},'Persönliches Unterrichtsvorhaben gespeichert.')){$('unit-status').textContent=$('save-status').textContent;return}$('unit-dialog').close()};
$('unit-delete').onclick=async()=>{const id=$('unit-id').value,u=state.customUnits.find(x=>x.id===id);if(!u)return;const scope=await window.FachkalenderScope.ask();if(!scope)return;if(scope==='remaining'&&customUnitStarted(id)){$('unit-status').textContent='Ein begonnenes oder abgeschlossenes Vorhaben kann nur mit „Gesamtes Schuljahr“ entfernt werden.';return}if(!changePlan([u.track],scope,()=>{state.customUnits=state.customUnits.filter(x=>x.id!==id)},'Eigenes Unterrichtsvorhaben entfernt.')){$('unit-status').textContent=$('save-status').textContent;return}$('unit-dialog').close()};
$('order-track').onchange=()=>{editingOrder=null;renderOrderList()};
$('order-scope-change').onclick=async()=>{const scope=await window.FachkalenderScope.ask();if(!scope)return;editingOrderScope=scope;if(scope==='remaining'&&editingOrder&&!allowedOrder($('order-track').value,editingOrder))editingOrder=null;renderOrderList()};
$('order-list').onclick=e=>{const button=e.target.closest('[data-order-move]');if(!button||button.disabled)return;const track=$('order-track').value,list=editingOrder||currentOrder(track),i=Number(button.dataset.orderIndex),j=i+(button.dataset.orderMove==='up'?-1:1),locked=editingOrderScope==='remaining'?lockedOrderCount(track):0;if(j<locked||i<locked||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]];editingOrder=list;renderOrderList()};
$('order-save').onclick=()=>{
 const track=$('order-track').value,ordered=editingOrder||currentOrder(track),key=orderKey(track),canonical=canonicalOrder(track);
 if(ordered.length!==canonical.length||new Set(ordered).size!==canonical.length){$('order-status').textContent='Die Reihenfolge ist unvollständig. Bitte Dialog neu öffnen.';return}
 if(editingOrderScope==='remaining'&&!allowedOrder(track,ordered)){$('order-status').textContent='Begonnene oder abgeschlossene Vorhaben dürfen nur bei einer Neuberechnung des ganzen Schuljahres verschoben werden.';return}
 if(!changePlan([track],editingOrderScope,()=>{state.orders=state.orders||{};if(ordered.every((code,i)=>code===canonical[i]))delete state.orders[key];else state.orders[key]=ordered.slice()},'Persönliche Reihenfolge gespeichert.')){$('order-status').textContent=$('save-status').textContent;return}
 editingOrder=null;$('order-dialog').close();
};
$('order-reset').onclick=()=>{const track=$('order-track').value,key=orderKey(track);if(editingOrderScope==='remaining'&&!allowedOrder(track,canonicalOrder(track))){$('order-status').textContent='Die curriculare Reihenfolge würde ein begonnenes Vorhaben verschieben. Bitte „Gesamtes Schuljahr“ wählen.';return}if(!changePlan([track],editingOrderScope,()=>{delete state.orders[key]},'Curriculare Reihenfolge wiederhergestellt.')){$('order-status').textContent=$('save-status').textContent;return}editingOrder=null;$('order-dialog').close()};
function resetAbsence(){$('absence-form').reset();$('absence-id').value='';$('absence-start').value='';$('absence-end').value=''}
function listAbsences(){
 const relevant=(state.absences||[]).filter(a=>a.subject===subject&&a.year===year).sort((a,b)=>a.start.localeCompare(b.start));
 $('absence-list').innerHTML=relevant.map(a=>`<div class="free-row"><div><strong>${esc(a.title)}</strong><br>${fmt(a.start)}${a.end!==a.start?'–'+fmt(a.end):''} · ${esc(a.optionIds.map(id=>optionFor(id)?.label||id).join(', '))}</div><button data-absence-edit="${esc(a.id)}">Ändern</button><button data-absence-delete="${esc(a.id)}">Entfernen</button></div>`).join('')||'<p class="hint">Noch keine persönlichen Ausfälle in diesem Schuljahr.</p>';
}
$('new-absence').onclick=()=>{resetAbsence();listAbsences();$('absence-dialog').showModal()};
$('absence-reset').onclick=resetAbsence;
$('absence-form').onsubmit=async e=>{
 e.preventDefault();const start=$('absence-start').value,end=$('absence-end').value,c=data.years[year],selection=$('absence-group').value;
 if(start>end||start<c.start||end>c.end){$('absence-end').setCustomValidity('Bitte einen Zeitraum innerhalb des Schuljahres wählen.');$('absence-end').reportValidity();return}
 $('absence-end').setCustomValidity('');
 const ids=selection==='all'?groupList().map(g=>g.id):[selection];
 if(!ids.length){$('save-status').textContent='Bitte zuerst einen Stundenplan mit deinen Lerngruppen anlegen oder eine einzelne Lerngruppe auswählen.';return}
 const item={id:$('absence-id').value||'absence-'+crypto.randomUUID(),subject,year,start,end,title:$('absence-title').value.trim(),optionIds:ids};
 const scope=await window.FachkalenderScope.ask();if(!scope)return;
 const index=state.absences.findIndex(a=>a.id===item.id),old=index>=0?state.absences[index]:null,tracks=trackOptions().filter(o=>[...ids,...(old?.optionIds||[])].includes(o.id)).map(o=>o.track);
 if(!changePlan(tracks,scope,()=>{if(index>=0)state.absences[index]=item;else state.absences.push(item)},'Persönlicher Unterrichtsausfall gespeichert.'))return;
 resetAbsence();listAbsences();
};
$('absence-start').oninput=$('absence-end').oninput=()=>$('absence-end').setCustomValidity('');
$('absence-list').onclick=async e=>{
 const edit=e.target.closest('[data-absence-edit]'),remove=e.target.closest('[data-absence-delete]');
 if(edit){const a=state.absences.find(x=>x.id===edit.dataset.absenceEdit);if(!a)return;$('absence-id').value=a.id;for(const key of ['title','start','end'])$('absence-'+key).value=a[key];$('absence-group').value=a.optionIds.length===1?a.optionIds[0]:'all';$('absence-title').focus()}
 if(remove){const item=state.absences.find(a=>a.id===remove.dataset.absenceDelete);if(!item)return;const scope=await window.FachkalenderScope.ask();if(!scope)return;const tracks=trackOptions().filter(o=>item.optionIds.includes(o.id)).map(o=>o.track);if(!changePlan(tracks,scope,()=>{state.absences=state.absences.filter(a=>a.id!==item.id)},'Persönlicher Unterrichtsausfall entfernt.'))return;listAbsences();resetAbsence()}
};
$('tracks').onchange=()=>{selected=new Set([...$('tracks').querySelectorAll('input:checked')].map(x=>x.value));state.filters[filterKey()]=[...selected];save('Auswahl der Lerngruppen gespeichert.');render()};
function selectAll(on){$('tracks').querySelectorAll('input').forEach(x=>x.checked=on);$('tracks').onchange()}
$('all-tracks').onclick=()=>selectAll(true);$('no-tracks').onclick=()=>selectAll(false);
$('subject').onchange=setContext;$('chemie-edition').onchange=setContext;$('year').onchange=setContext;$('month').onchange=()=>{month=$('month').value;render()};
$('prev').onclick=()=>{if(view==='week'){weekStart=P.add(weekStart,-7)}else if(view==='month'){const ms=months();month=ms[ms.indexOf(month)-1]}render()};$('next').onclick=()=>{if(view==='week'){weekStart=P.add(weekStart,7)}else if(view==='month'){const ms=months();month=ms[ms.indexOf(month)+1]}render()};
$('week-view').onclick=()=>{view='week';render()};$('month-view').onclick=()=>{view='month';render()};$('year-view').onclick=()=>{view='year';render()};
$('show-closures').onchange=render;
$('lesson-summary-table').onclick=e=>{const button=e.target.closest('[data-event]');if(button)openEvent(button.dataset.event)};
$('calendar').onclick=async e=>{const cancelled=e.target.closest('[data-cancelled]');if(cancelled){const key=cancelled.dataset.cancelled,option=optionFor(key.split('|')[2]),value=!isCancelled(key);if(!option)return;const scope=await window.FachkalenderScope.ask();if(!scope)return;changePlan([option.track],scope,()=>{state.cancelled=state.cancelled||{};state.cancelled[key]=value},value?'Unterrichtsausfall vermerkt.':'Unterrichtsausfall zurückgenommen.');return}const custom=e.target.closest('[data-custom-unit]');if(custom){openCustomUnit(custom.dataset.customUnit);return}const el=e.target.closest('[data-event]');if(el)openEvent(el.dataset.event)};$('new-exam').onclick=()=>openEvent(null);
$('new-grade-entry').onclick=()=>{const today=new Date().toLocaleDateString('sv-SE'),c=data.years[year],start=today>=c.start&&today<=c.end?today:month<c.start?c.start:month;openEvent(null,{kind:'grade',title:'Noteneintrag',start})};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
$('export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Thomaeum_Fachkalender_Eigene_Planung.json';document.body.append(a);a.click();a.remove();$('save-status').textContent='Die Sicherungsdatei wurde zum Herunterladen bereitgestellt.';setTimeout(()=>URL.revokeObjectURL(url),30000)};
$('import').onchange=async()=>{const file=$('import').files[0];if(!file)return;try{if(file.size>2000000)throw Error();const next=JSON.parse(await file.text());if(!validState(next))throw Error();state=normalizeState(next);$('year').value=data.years[year]?year:'2026';state.filters=next.filters&&typeof next.filters==='object'?next.filters:{};save('Planung importiert und in diesem Browser gespeichert.');setContext()}catch{$('save-status').textContent='Import nicht möglich: Bitte eine gültige exportierte Fachkalender-Datei wählen. Die bestehende Planung bleibt erhalten.'}$('import').value=''};
$('reset').onclick=()=>$('confirm-dialog').showModal();$('confirm-reset').onclick=()=>{state=blankState();$('year').value='2026';save('Eigene Änderungen zurückgesetzt.');$('confirm-dialog').close();setContext()};
function theme(){const dark=document.documentElement.dataset.theme==='dark';$('theme').textContent=dark?'Helle Darstellung':'Dunkle Darstellung';if(dark)document.body.style.removeProperty('--accent');else document.body.style.setProperty('--accent',{chemie:'#19665d',physik:'#245d91',biologie:'#9c493c','mensch-und-umwelt':'#466b37'}[subject])}
$('theme').onclick=()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('chemie-curriculum-theme',document.documentElement.dataset.theme)}catch{}theme()};
function board(on){document.body.classList.toggle('board-mode',on);$('fullscreen').textContent=on?'Vollbild beenden':'Vollbild'}
$('fullscreen').onclick=async()=>{if(document.fullscreenElement){await document.exitFullscreen();return}if(document.body.classList.contains('board-mode')){board(false);return}board(true);try{await document.documentElement.requestFullscreen()}catch{}};
document.addEventListener('fullscreenchange',()=>board(!!document.fullscreenElement));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.fullscreenElement)board(false)});

function authDialogFor(user=currentUser){
 $('auth-status').textContent='';$('auth-email').value=user?.email||$('auth-email').value;
 $('auth-form').hidden=Boolean(user);
 $('verification-actions').hidden=!user;
 if(user){
  const status=$('verification-actions').querySelector('p');
  status.textContent=user.emailVerified?'Du bist mit deinem persönlichen Profil angemeldet. Änderungen werden nur unter deiner Nutzerkennung gespeichert.':'Bitte bestätige deine E-Mail-Adresse über den zugesandten Link. Erst danach kann dieses Profil in der Datenbank speichern.';
  $('resend-verification').hidden=user.emailVerified;$('check-verification').hidden=user.emailVerified;
 }
 if(!$('auth-dialog').open)$('auth-dialog').showModal();
}
function setAuthMode(mode){authMode=mode;$('auth-heading').textContent=mode==='register'?'Persönliches Konto erstellen':'Persönlich anmelden';$('auth-submit').textContent=mode==='register'?'Konto erstellen':'Anmelden';$('auth-mode').textContent=mode==='register'?'Ich habe schon ein Konto':'Neues Konto erstellen';$('auth-password').autocomplete=mode==='register'?'new-password':'current-password';$('forgot-password').hidden=mode==='register';$('auth-description').textContent=mode==='register'?'Nutze eine erreichbare E-Mail-Adresse. Firebase sendet eine Bestätigung; erst danach lässt sich dein Kalenderprofil speichern.':'Melde dich mit deiner bestätigten E-Mail-Adresse an. Deine Planung wird privat in deinem Profil gespeichert.'}
setAuthMode('login');
$('account').onclick=()=>authDialogFor();
$('auth-mode').onclick=()=>{setAuthMode(authMode==='login'?'register':'login');$('auth-status').textContent=''};
$('forgot-password').onclick=async()=>{const email=$('auth-email').value.trim();if(!email){$('auth-status').textContent='Gib zuerst deine E-Mail-Adresse ein.';return}try{await sendPasswordResetEmail(auth,email);$('auth-status').textContent='Wenn es zu dieser Adresse ein Konto gibt, wurde eine Nachricht zum Zurücksetzen des Passworts gesendet.'}catch(error){$('auth-status').textContent=friendlyError(error)}};
$('auth-form').onsubmit=async e=>{
 e.preventDefault();const email=$('auth-email').value.trim(),password=$('auth-password').value;$('auth-submit').disabled=true;$('auth-status').textContent=authMode==='register'?'Konto wird erstellt …':'Anmeldung läuft …';
 try{
  let credential;
  if(authMode==='register'){credential=await createUserWithEmailAndPassword(auth,email,password);await sendEmailVerification(credential.user);await activateProfile(credential.user);authDialogFor(credential.user);$('auth-status').textContent='Konto angelegt. Öffne die E-Mail von Firebase und bestätige die Adresse; danach hier „Ich habe bestätigt“ wählen.'}
  else{credential=await signInWithEmailAndPassword(auth,email,password);await activateProfile(credential.user);if(credential.user.emailVerified)$('auth-dialog').close();else{authDialogFor(credential.user);$('auth-status').textContent='Bitte bestätige zuerst deine E-Mail-Adresse.'}}
 }catch(error){$('auth-status').textContent=friendlyError(error)}finally{$('auth-submit').disabled=false}
};
$('resend-verification').onclick=async()=>{try{await sendEmailVerification(auth.currentUser);$('auth-status').textContent='Bestätigungsnachricht erneut gesendet.'}catch(error){$('auth-status').textContent=friendlyError(error)}};
$('check-verification').onclick=async()=>{try{await reload(auth.currentUser);const user=auth.currentUser;if(!user.emailVerified){$('auth-status').textContent='Die Adresse ist noch nicht bestätigt. Öffne bitte den Bestätigungslink aus der E-Mail.';return}await getIdToken(user,true);watchSchool(user);await activateProfile(user);authDialogFor(user);$('auth-status').textContent='E-Mail bestätigt. Deine private Kalenderplanung ist jetzt freigeschaltet.'}catch(error){$('auth-status').textContent=friendlyError(error)}};
async function leaveProfile(){try{$('save-status').textContent='Abmeldung läuft …';await signOut(auth);$('auth-dialog').close()}catch(error){$('save-status').textContent=friendlyError(error)}}
$('signout').onclick=leaveProfile;$('auth-signout').onclick=leaveProfile;
const schoolRef=doc(db,'schoolCalendar','config');
let schoolUnsubscribe=null;
function watchSchool(user){
 if(schoolUnsubscribe){schoolUnsubscribe();schoolUnsubscribe=null}
 sharedSettings={version:1,years:{},closures:[]};
 if(!user?.emailVerified){$('school-status').textContent='Melde dich mit bestätigter E-Mail-Adresse an, um schulweite Zusatztermine zu sehen.';setContext();return}
 $('school-status').textContent='Schulweite Termine werden geladen …';
 schoolUnsubscribe=onSnapshot(schoolRef,snapshot=>{const value=snapshot.exists()?snapshot.data():{version:1,years:{},closures:[]};if(!S.validSettings(value)){$('school-status').textContent='Die schulweiten Einstellungen sind ungültig; die hinterlegten Grunddaten bleiben sichtbar.';return}sharedSettings=value;$('school-status').textContent=snapshot.exists()?'Schulweite Termine sind synchronisiert.':'Schulweite Grunddaten aus dem Curriculum werden angezeigt.';setContext()},()=>{$('school-status').textContent='Schulweite Einstellungen konnten nicht geladen werden; die hinterlegten Grunddaten bleiben sichtbar.'});
}
onAuthStateChanged(auth,user=>{authReady=true;watchSchool(user);activateProfile(user)});

setContext();theme();$('save-status').textContent=loadWarning||(storageOK?'Gastmodus: Änderungen bleiben auf diesem Gerät. Melde dich an, um sie privat in deinem Profil zu speichern.':'Lokale Speicherung ist nicht verfügbar. Bitte Änderungen exportieren.');
})();

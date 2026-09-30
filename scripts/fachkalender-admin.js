import {auth,db,onAuthStateChanged,sendPasswordResetEmail,signInWithEmailAndPassword,signOut,doc,setDoc,onSnapshot,serverTimestamp} from './fachkalender-firebase.js';
'use strict';
const el=id=>document.getElementById(id),S=window.FachkalenderSchool;
const configRef=doc(db,'schoolCalendar','config');
const empty=()=>({version:1,years:{},closures:[],removedClosureIds:[],revisions:[]});
const text=value=>String(value??'');
let base,settings=empty(),lastSaved=empty(),admin=false,user=null,selectedYear='2026',unsubscribe=null;
const today=()=>new Date().toLocaleDateString('sv-SE');
function status(message){el('sync-status').textContent=message}
function datesOfYear(c,y){return c.start<=String(+y+1)+'-12-31'&&c.end>=y+'-01-01'}
function effectiveYears(){return {...base.years,...settings.years}}
function showYear(){
 const year=effectiveYears()[selectedYear];if(!year)return;
 for(const key of ['start','end','half','q2half','q2end','prepStart','prepEnd'])el(key).value=year[key]||'';
 el('confirmed').checked=!year.q2Provisional;
 renderClosures();
}
function renderYears(){
 const years=effectiveYears();el('year').replaceChildren();
 for(const key of Object.keys(years).sort()){const option=document.createElement('option');option.value=key;option.textContent=years[key].label;el('year').append(option)}
 if(!years[selectedYear])selectedYear=Object.keys(years).sort()[0];
 el('year').value=selectedYear;showYear();
}
function scopeText(c){if(!c.tracks.length)return 'Alle Jahrgänge';return [...new Set(c.tracks.map(t=>t.split(' ')[0]))].join(', ')}
function row(c,kind){
 const item=document.createElement('div');item.className='admin-row';
 const body=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('p');
 title.textContent=c.title;meta.textContent=c.start+(c.end===c.start?'':' bis '+c.end)+' · '+scopeText(c);
 body.append(title,meta);item.append(body);
 const actions=document.createElement('div');actions.className='actions';
 if(kind==='custom'){
  const edit=document.createElement('button');edit.type='button';edit.textContent='Bearbeiten';edit.onclick=()=>editClosure(c);
  const remove=document.createElement('button');remove.type='button';remove.textContent='Entfernen';remove.onclick=()=>removeClosure(c.id);
  actions.append(edit,remove);
 }else if(kind==='school'){
  const hidden=settings.removedClosureIds.includes(c.id);
  const toggle=document.createElement('button');toggle.type='button';toggle.textContent=hidden?'Wieder einblenden':'Für alle ausblenden';
  toggle.onclick=async()=>{if(c.start<today()){status('Vergangene schulfreie Tage bleiben unverändert.');return}const before=[...settings.removedClosureIds];settings.removedClosureIds=hidden?before.filter(id=>id!==c.id):[...before,c.id];if(!await save())settings.removedClosureIds=before;renderClosures()};
  actions.append(toggle);
 }
 if(actions.childElementCount)item.append(actions);
 return item;
}
function renderClosures(){
 const y=selectedYear;
 const custom=settings.closures.filter(c=>datesOfYear(c,y)).sort((a,b)=>a.start.localeCompare(b.start));
 const school=base.closures.filter(c=>c.kind==='school'&&datesOfYear(c,y)).sort((a,b)=>a.start.localeCompare(b.start));
 const official=base.closures.filter(c=>c.kind!=='school'&&datesOfYear(c,y)).sort((a,b)=>a.start.localeCompare(b.start));
 for(const [id,items,kind] of [['closure-list',custom,'custom'],['base-list',school,'school'],['official-list',official,'official']]){
  const host=el(id);host.replaceChildren();
  if(!items.length){const p=document.createElement('p');p.className='hint';p.textContent='Keine Einträge.';host.append(p)}
  else for(const c of items)host.append(row(c,kind));
 }
}
function checkedTracks(){
 if(el('all-tracks').checked)return [];
 return [...document.querySelectorAll('#track-options input:checked')].flatMap(input=>['Q1','Q2'].includes(input.value)?[input.value+' GK',input.value+' LK']:[input.value]);
}
function resetClosure(){el('closure-form').reset();el('closure-id').value='';el('all-tracks').checked=true;toggleTracks();el('closure-start').value='';el('closure-end').value=''}
function toggleTracks(){document.querySelectorAll('#track-options input').forEach(input=>{input.disabled=el('all-tracks').checked;if(el('all-tracks').checked)input.checked=false})}
function editClosure(c){
 el('closure-id').value=c.id;el('closure-title').value=c.title;el('closure-kind').value=c.kind;
 el('closure-start').value=c.start;el('closure-end').value=c.end;el('all-tracks').checked=!c.tracks.length;toggleTracks();
 for(const input of document.querySelectorAll('#track-options input'))input.checked=c.tracks.some(t=>t===input.value||t.startsWith(input.value+' '));
 el('closure-form').scrollIntoView({behavior:'smooth',block:'center'});el('closure-title').focus();
}
async function save(){
 if(!admin||!user?.emailVerified){status('Keine Berechtigung zum Speichern.');return false}
 if(!S.validSettings(settings)){status('Die Eingaben sind ungültig. Bitte Daten und Jahrgangsauswahl prüfen.');return false}
 status('Schulweite Änderungen werden gespeichert …');
 const previous=[...(settings.revisions||[])],date=today();
 if(!previous.length||previous.at(-1).until<date)settings.revisions=[...previous,{until:date,settings:{version:1,years:lastSaved.years,closures:lastSaved.closures,removedClosureIds:lastSaved.removedClosureIds}}];
 if(!S.validSettings(settings)){settings.revisions=previous;status('Die Änderungshistorie ist voll oder ungültig; keine Daten gespeichert.');return false}
 try{await setDoc(configRef,{...settings,updatedAt:serverTimestamp(),updatedBy:user.uid});lastSaved=JSON.parse(JSON.stringify(settings));status('Schulweite Änderungen gespeichert; vergangene Termine bleiben eingefroren.');return true}
 catch(error){settings.revisions=previous;status(error.code==='permission-denied'?'Firebase hat das Speichern abgelehnt. Bitte Verwaltungsberechtigung prüfen.':'Speichern fehlgeschlagen. Bitte Verbindung prüfen.');return false}
}
async function removeClosure(id){
 const existing=settings.closures.find(c=>c.id===id);if(existing?.start<today()){status('Vergangene schulfreie Tage bleiben unverändert.');return}
 const before=[...settings.closures];settings.closures=before.filter(c=>c.id!==id);
 if(!await save())settings.closures=before;
 renderClosures();
}
function beginRealtime(){
 if(unsubscribe)unsubscribe();
 unsubscribe=onSnapshot(configRef,snapshot=>{
  const value=snapshot.exists()?snapshot.data():empty();
  if(!S.validSettings(value)){status('Die gespeicherten Kalendereinstellungen sind ungültig. Es wurden keine Daten übernommen.');return}
  settings={...empty(),...value,years:{...value.years},closures:[...value.closures],removedClosureIds:[...(value.removedClosureIds||[])],revisions:[...(value.revisions||[])]};
  lastSaved=JSON.parse(JSON.stringify(settings));
  renderYears();
  if(!snapshot.exists())status('Noch keine schulweiten Zusatzdaten gespeichert. Die Curriculumsgrundlage ist geladen.');
 },()=>status('Schulweite Daten konnten nicht geladen werden. Bitte Verbindung und Berechtigung prüfen.'));
}
async function accountChanged(next){
 user=next;admin=false;el('admin-content').hidden=true;el('login-panel').hidden=false;el('signout').hidden=!next;
 if(unsubscribe){unsubscribe();unsubscribe=null}
 if(!next){el('login-status').textContent='Bitte mit dem Kalenderverwaltungskonto anmelden.';el('role-help').hidden=true;el('user-id').textContent='';return}
 if(next.email?.toLowerCase()!=='claus.unterberg@thomaeum.de'||!next.emailVerified){
  el('login-status').textContent=next.emailVerified?'Dieses Konto ist nicht für die Kalenderverwaltung freigeschaltet.':'Die E-Mail-Adresse dieses Kontos muss zuerst bestätigt werden.';
  el('role-help').hidden=false;return;
 }
 admin=true;el('login-panel').hidden=true;el('admin-content').hidden=false;beginRealtime();
}
async function init(){
 try{const response=await fetch('data/fachkalender.json?v=20260930-admin');if(!response.ok)throw Error();base=await response.json()}catch{el('login-status').textContent='Kalenderdaten konnten nicht geladen werden.';return}
 const trackOptions=el('track-options');
 for(const track of ['5','6','7','8','9','10','EF','Q1','Q2']){
  const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=track;label.append(input,' '+(Number.isFinite(+track)?'Klasse '+track:track));trackOptions.append(label);
 }
 el('all-tracks').onchange=toggleTracks;
 el('year').onchange=()=>{selectedYear=el('year').value;showYear()};
 el('closure-reset').onclick=resetClosure;
 el('closure-form').onsubmit=async event=>{
  event.preventDefault();const id=el('closure-id').value||'school-'+crypto.randomUUID();
  const item={id,title:el('closure-title').value.trim(),kind:el('closure-kind').value,start:el('closure-start').value,end:el('closure-end').value,tracks:checkedTracks(),source:'Schulweite Kalenderverwaltung'};
  if(item.start<today()){status('Vergangene unterrichtsfreie Tage können nicht nachträglich verändert werden.');return}
  if(!S.validClosure(item)){status('Bitte Titel, Zeitraum und Jahrgangsauswahl prüfen.');return}
  const before=[...settings.closures],index=settings.closures.findIndex(c=>c.id===id);
  if(index>=0)settings.closures[index]=item;else settings.closures.push(item);
  if(!await save())settings.closures=before;else resetClosure();
  renderClosures();
 };
 el('year-form').onsubmit=async event=>{
  event.preventDefault();const before={...settings.years},c={...effectiveYears()[selectedYear]};
  for(const key of ['start','end','half','q2half','q2end','prepStart','prepEnd'])c[key]=el(key).value||null;
  c.q2Provisional=!el('confirmed').checked;c.halfProvisional=false;
  if(!S.validYear(c,selectedYear)){status('Bitte die Datumsfolge prüfen.');return}
  settings.years[selectedYear]=c;if(!await save())settings.years=before;
 };
 el('new-year').onclick=async()=>{
  const input=window.prompt('Startjahr des neuen Schuljahrs (z. B. 2028 für 2028/29):',String(Math.max(2028,...Object.keys(effectiveYears()).map(Number))+1));
  if(input===null)return;const y=Number(input);
  if(!Number.isInteger(y)||y<2028||y>2099||effectiveYears()[y]){status('Bitte ein noch nicht vorhandenes Startjahr zwischen 2028 und 2099 wählen.');return}
  el('new-year').disabled=true;status('NRW-Ferien und Feiertage werden geladen …');
  try{
   const result=await window.Fachferien.loadYear(y);
   if(!S.validYear(result.config,String(y)))throw Error('Schuljahresrahmen unvollständig.');
   const beforeYears={...settings.years},beforeClosures=[...settings.closures];
   settings.years[y]=result.config;
   settings.closures.push(...result.closures.map((c,i)=>({...c,id:'school-'+y+'-fetched-'+i})));
   if(!await save()){settings.years=beforeYears;settings.closures=beforeClosures}
   else{selectedYear=String(y);renderYears()}
  }catch(error){status(error.message||'Ferien konnten nicht vollständig geladen werden.')}
  finally{el('new-year').disabled=false}
 };
 el('login-form').onsubmit=async event=>{
  event.preventDefault();el('login-status').textContent='Anmeldung läuft …';
  try{await signInWithEmailAndPassword(auth,el('email').value.trim(),el('password').value);el('password').value=''}
  catch{el('login-status').textContent='Anmeldung fehlgeschlagen. Bitte E-Mail-Adresse und Passwort prüfen.'}
 };
 el('reset-password').onclick=async()=>{
  const email=el('email').value.trim();if(!email){el('login-status').textContent='Bitte zuerst die E-Mail-Adresse eingeben.';return}
  try{await sendPasswordResetEmail(auth,email);el('login-status').textContent='Falls das Konto existiert, wurde eine Nachricht zum Zurücksetzen des Passworts verschickt.'}
  catch{el('login-status').textContent='Die Nachricht konnte nicht verschickt werden. Bitte Verbindung und Adresse prüfen.'}
 };
 el('signout').onclick=()=>signOut(auth);
 onAuthStateChanged(auth,accountChanged);
}
init();

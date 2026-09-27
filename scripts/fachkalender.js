'use strict';
(async()=>{
const $=id=>document.getElementById(id),P=Fachplan,KEY='thomaeum-fachkalender-v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=s=>P.parse(s).toLocaleDateString('de-DE',{timeZone:'UTC'}),monthName=s=>P.parse(s).toLocaleDateString('de-DE',{month:'long',year:'numeric',timeZone:'UTC'});
let data;try{const r=await fetch('data/fachkalender.json?v=20260927');if(!r.ok)throw Error();data=await r.json()}catch{$('save-status').textContent='Der Kalender konnte nicht geladen werden. Bitte die Seite erneut öffnen.';return}
const builtinYears=structuredClone(data.years);
let state={version:1,overrides:{},added:[],free:[],filters:{},years:{},remoteClosures:{}},storageOK=true,loadWarning='';
const kinds=['unit','buffer','prep','exam','abitur','makeup','event'];
const validDate=s=>typeof s==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(P.parse(s).getTime())&&P.iso(P.parse(s))===s;
function validConfig(c,y){
 return c&&['start','end','half','q2half','q2end'].every(k=>validDate(c[k]))&&c.start<c.end&&c.start.startsWith(y+'-')&&c.end.startsWith((+y+1)+'-')&&c.q2end>=c.start&&c.q2end<=c.end&&c.half>=c.start&&c.half<=c.end&&c.q2half>=c.start&&c.q2half<=c.q2end&&(!c.prepStart&&!c.prepEnd||validDate(c.prepStart)&&validDate(c.prepEnd)&&c.prepStart<=c.prepEnd&&c.prepStart>c.q2end&&c.prepEnd<=c.end);
}
function validState(s){
 if(!s||s.version!==1||!s.overrides||typeof s.overrides!=='object'||Array.isArray(s.overrides)||!Array.isArray(s.added)||!Array.isArray(s.free)||s.added.length>2000||s.free.length>500||Object.keys(s.overrides).length>3000)return false;
 if(Object.entries(s.years||{}).some(([y,c])=>!/^20\d{2}$/.test(y)||+y<2026||!validConfig(c,y)))return false;
 const configs={...builtinYears,...s.years};
 if(Object.entries(s.remoteClosures||{}).some(([y,cs])=>!configs[y]||!Array.isArray(cs)||cs.length>100||cs.some(c=>!validDate(c.start)||!validDate(c.end)||c.start>c.end||typeof c.title!=='string'||c.title.length>200||!Array.isArray(c.tracks))))return false;
 const bounded=(v,n)=>typeof v==='string'&&v.length<=n;
 const event=e=>e&&bounded(e.id,200)&&data.subjects[e.subject]&&configs[e.year]&&data.subjects[e.subject].tracks.some(t=>t.id===e.track)&&kinds.includes(e.kind)&&validDate(e.start)&&validDate(e.end)&&e.start<=e.end&&e.start>=e.year+'-07-01'&&e.end<=(+e.year+1)+'-09-30'&&bounded(e.title,250)&&bounded(e.notes||'',5000)&&(!e.time||/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time));
 if(!s.added.every(event)||new Set(s.added.map(e=>e.id)).size!==s.added.length)return false;
 if(!Object.entries(s.overrides).every(([id,e])=>bounded(id,200)&&id!=='__proto__'&&(e===null||event(e)&&e.id===id)))return false;
 return s.free.every(c=>c&&bounded(c.id,200)&&c.id.startsWith('free-')&&bounded(c.title,200)&&validDate(c.start)&&validDate(c.end)&&c.start<=c.end&&c.start>='2026-08-01'&&c.end<='2100-08-31'&&Array.isArray(c.tracks)&&c.tracks.every(t=>['5','6','7','8','9','10','EF','Q1 GK','Q1 LK','Q2 GK','Q2 LK'].includes(t)));
}
try{const saved=localStorage.getItem(KEY);if(saved){const parsed=JSON.parse(saved);if(validState(parsed)){state=parsed;if(!state.filters||typeof state.filters!=='object')state.filters={}}else loadWarning='Gespeicherte Daten konnten nicht übernommen werden. Die veröffentlichte Planung wird angezeigt.'}}catch{storageOK=false}
state.years=state.years||{};state.remoteClosures=state.remoteClosures||{};data.years={...builtinYears,...state.years};
function updateYears(){ $('year').innerHTML=Object.keys(data.years).sort().map(y=>`<option value="${y}">${esc(data.years[y].label)}</option>`).join('') }
updateYears();
const params=new URLSearchParams(location.search);let subject=data.subjects[params.get('fach')]?params.get('fach'):'chemie',year=data.years[params.get('jahr')]?params.get('jahr'):'2026';
let month=data.years[year].start.slice(0,7)+'-01',view='year',events=[],stats=[],selected=new Set(),editId=null,baseEvents=[];
$('subject').value=subject;$('year').value=year;
function save(message='Eigene Planung in diesem Browser gespeichert.'){
 try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;$('save-status').textContent=message}catch{storageOK=false;$('save-status').textContent='Die Änderung ist nur für diese Sitzung verfügbar. Bitte die Planung exportieren; der Browser konnte sie nicht speichern.'}
}
function closureList(){const values=[...data.closures,...Object.values(state.remoteClosures||{}).flat(),...state.free],seen=new Set();return values.filter(c=>{const key=[c.start,c.end,c.title,...c.tracks].join('|');if(seen.has(key))return false;seen.add(key);return true})}
function refresh(){
 let result;try{result=P.plan(data,subject,year,closureList())}catch(e){$('calendar').innerHTML='<p class="empty">'+esc(e.message)+'</p>';$('save-status').textContent='Bitte freie Tage und Schuljahresrahmen prüfen.';return}baseEvents=result.events;stats=result.stats;
 events=baseEvents.filter(e=>state.overrides[e.id]!==null).map(e=>state.overrides[e.id]?{...e,...state.overrides[e.id],custom:true}:e);
 events.push(...state.added.filter(e=>e.subject===subject&&e.year===year).map(e=>({...e,custom:true})));
 render();
}
function tracks(){
 const ts=data.subjects[subject].tracks,stored=state.filters[subject];selected=new Set(Array.isArray(stored)?stored.filter(id=>ts.some(t=>t.id===id)):ts.map(t=>t.id));
 $('tracks').innerHTML=ts.map(t=>`<label><input type="checkbox" value="${esc(t.id)}" ${selected.has(t.id)?'checked':''}>${esc(t.label)}</label>`).join('');
 $('event-track').innerHTML=ts.map(t=>`<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('');
}
function months(){const out=[];for(let m=data.years[year].start.slice(0,7)+'-01';m<=data.years[year].end;){out.push(m);const d=P.parse(m);d.setUTCMonth(d.getUTCMonth()+1);m=P.iso(d)}return out}
function setContext(){
 subject=$('subject').value;year=$('year').value;month=data.years[year].start.slice(0,7)+'-01';tracks();
 $('month').innerHTML=months().map(m=>`<option value="${m}">${monthName(m)}</option>`).join('');
 $('subtitle').textContent=data.subjects[subject].label+' · '+data.years[year].label;
 $('curriculum-link').href=data.subjects[subject].curriculum;
 const colors={chemie:'#19665d',physik:'#245d91',biologie:'#9c493c','mensch-und-umwelt':'#466b37'};
 document.body.dataset.subject=subject;
 if(document.documentElement.dataset.theme!=='dark')document.body.style.setProperty('--accent',colors[subject]);else document.body.style.removeProperty('--accent');
 const url=new URL(location.href);url.searchParams.set('fach',subject);url.searchParams.set('jahr',year);history.replaceState(null,'',url);
 $('notice').textContent='Planungsvorschlag aus dem Curriculum · '+(year==='2026'?'Bekannte schulische Klausuren und amtliche Abiturtermine sind eingetragen.':'Amtliche Abiturtermine sind eingetragen; schulische Klausurtermine können ergänzt werden.')+' Jahrgänge und Kursarten sind unabhängig auswählbar.';
 $('cohort-note').textContent=+year>=2027?(subject==='chemie'?'Chemie: Die Fassung zum Kernlehrplan 2026 wird jahrgangsweise eingesetzt: EF ab 2027/28, Q1 ab 2028/29 und Q2 ab 2029/30. Frühere Jahrgänge und Sek I behalten ihre jeweilige Grundlage.':subject==='mensch-und-umwelt'?'Mensch und Umwelt: Klassen 9 und 10, jeweils drei Wochenstunden.':'Für die ab 2027/28 neu eintretenden EF-Jahrgänge und ihre späteren Q-Phasen dient die Vorhabenfolge des vorhandenen Curriculums als Übergangsplanung. Der Abgleich mit dem neuen Kernlehrplan 2026 ist vor der Umsetzung erforderlich.'):'Planungsgrundlage ist die für diese Jahrgänge bestehende Fassung des schulinternen Curriculums.';
 if(data.years[year].dynamic)$('notice').textContent='NRW-Ferien und Feiertage aus dem Netz geladen · '+(data.years[year].q2Provisional?'Q2-Unterrichtsende ist ein vorläufiger Planungswert; unter Schuljahresrahmen prüfen. ':'Q2-Rahmen nach eigener Festlegung. ')+(data.years[year].halfProvisional?'Halbjahreswechsel vorläufig. ':'')+'Schulische Klausuren und Abiturtermine bitte ergänzen.';
 refresh();
}
function shown(e){return selected.has(e.track)&&($('show-reserve').checked||e.kind!=='buffer')&&($('show-makeup').checked||e.kind!=='makeup')}
function onDay(e,d){return d>=e.start&&d<=e.end&&(!['unit','buffer','prep'].includes(e.kind)||!P.closed(d,e.track,closureList()))}
function chip(e,range=false){
 const custom=e.custom?' ✎':'';const title=(e.code?e.code+' · ':'')+e.title;
 const classes=`event-chip ${esc(e.kind)} c${Number.isInteger(e.color)?e.color%6:0} ${e.custom?'custom':''}`;
 const body=`<strong>${esc(e.track)}${custom}${e.time?' · '+esc(e.time):''}</strong>${esc(title)}${range?`<small>${fmt(e.start)}${e.end!==e.start?'–'+fmt(e.end):''}</small>`:''}`;
 const url=baseEvents.find(x=>x.id===e.id)?.url;
 if(e.kind==='unit'&&url)return `<div class="${classes} unit-card"><a class="unit-link" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(title+' im Curriculum öffnen')}">${body}<span class="unit-open">Im Curriculum öffnen ↗</span></a><button class="unit-edit" data-event="${esc(e.id)}" aria-label="${esc(e.track+' · '+title+': Zeitraum bearbeiten')}">✎ Bearbeiten</button></div>`;
 return `<button class="${classes}" data-event="${esc(e.id)}" title="${esc(e.track+' · '+title+' · '+fmt(e.start)+'–'+fmt(e.end))}">${body}</button>`;
}
function weekLabel(d){const date=P.parse(d);date.setUTCDate(date.getUTCDate()+4-(date.getUTCDay()||7));return Math.ceil((((date-new Date(Date.UTC(date.getUTCFullYear(),0,1)))/86400000)+1)/7)}
function render(){
 $('period-title').textContent=view==='month'?monthName(month):'Schuljahr '+data.years[year].label;$('month').value=month;
 $('month-view').setAttribute('aria-pressed',String(view==='month'));$('year-view').setAttribute('aria-pressed',String(view==='year'));
 const ms=months();$('prev').disabled=view==='year'||month===ms[0];$('next').disabled=view==='year'||month===ms.at(-1);$('month').disabled=view==='year';
 const display=events.filter(shown),c=data.years[year],free=closureList(),today=new Date().toLocaleDateString('sv-SE');
 if(!selected.size){$('calendar').innerHTML='<p class="empty">Keine Jahrgangsstufe ausgewählt. Oben die gewünschten Klassen oder Kurse einschalten.</p>'}
 else if(view==='month'){
  const first=P.add(month,-((P.parse(month).getUTCDay()+6)%7)),endDate=P.parse(month);endDate.setUTCMonth(endDate.getUTCMonth()+1);endDate.setUTCDate(0);
  const last=P.add(P.iso(endDate),6-((endDate.getUTCDay()+6)%7));
  let html='<div class="month-scroll"><div class="month-grid">'+['Mo','Di','Mi','Do','Fr','Sa','So'].map(x=>`<div class="weekday">${x}</div>`).join('');
  for(const day of P.dates(first,last)){
   const closures=free.filter(x=>day>=x.start&&day<=x.end&&(!x.tracks.length||x.tracks.some(t=>selected.has(t))));
   const outside=day<c.start||day>c.end||day.slice(0,7)!==month.slice(0,7);
   const items=day<c.start||day>c.end?[]:display.filter(e=>onDay(e,day));
   html+=`<div class="day ${outside?'outside':''} ${[0,6].includes(P.parse(day).getUTCDay())?'weekend':''} ${closures.length&&$('show-closures').checked?'free':''} ${today===day?'today':''}"><time class="date-number" datetime="${day}">${P.parse(day).getUTCDate()}</time>`;
   if($('show-closures').checked)html+=closures.map(x=>`<span class="closure-label">${esc(x.title)}${x.tracks.length?' · '+esc([...new Set(x.tracks.map(t=>t.split(' ')[0]))].join('/')):''}</span>`).join('');
   if(day===c.half)html+='<span class="closure-label">Beginn 2. Halbjahr · EF/Q1/Sek I</span>';
   if(day===c.q2half&&[...selected].some(t=>t.startsWith('Q2')))html+='<span class="closure-label">Beginn Q2.2</span>';
   html+=items.map(e=>chip(e)).join('')+'</div>';
  }$('calendar').innerHTML=html+'</div></div>';
 }else{
  const ts=data.subjects[subject].tracks.filter(t=>selected.has(t.id));
  let html='<div class="table-scroll"><table class="year-table"><thead><tr><th scope="col">Woche</th>'+ts.map(t=>`<th scope="col">${esc(t.label)}</th>`).join('')+'</tr></thead><tbody>';
  for(let a=P.add(c.start,-((P.parse(c.start).getUTCDay()+6)%7));a<=c.end;a=P.add(a,7)){
   const b=P.add(a,6),days=P.dates(a,b),closures=free.filter(x=>x.start<=b&&x.end>=a&&(!x.tracks.length||x.tracks.some(t=>selected.has(t))));
   html+=`<tr class="${closures.length&&$('show-closures').checked?'holiday-row':''}"><td><strong>KW ${weekLabel(a)}</strong><br>${fmt(a)}<br>bis ${fmt(b)}`;
   if($('show-closures').checked)html+=closures.map(x=>`<span class="closure-label">${esc(x.title)}</span>`).join('');
   html+='</td>'+ts.map(t=>'<td>'+display.filter(e=>e.track===t.id&&days.some(d=>onDay(e,d))).map(e=>chip(e,true)).join('')+'</td>').join('')+'</tr>';
  }$('calendar').innerHTML=html+'</tbody></table></div>';
 }
 $('stats').innerHTML='<table><thead><tr><th>Jahrgang / Kurs</th><th>Wochenstunden</th><th>Verfügbare Schultage</th><th>Curriculum (UStd)</th><th>Kalenderansatz (UStd)</th><th>Reserve (UStd)</th><th>Anpassung</th></tr></thead><tbody>'+stats.map(s=>`<tr><td>${esc(s.track)}</td><td>${s.weekly}</td><td>${s.days}</td><td>${s.hours}</td><td>${s.planned}</td><td>${s.reserve}</td><td>${s.factor<.97?'ca. '+Math.round((1-s.factor)*100)+' % verdichtet':'Zeitrichtwert beibehalten'}</td></tr>`).join('')+'</tbody></table>';
}
function eventWarning(e){
 const warnings=[];
 if(['exam','abitur','makeup','event'].includes(e.kind)&&P.dates(e.start,e.end).some(d=>P.closed(d,e.track,closureList())))warnings.push('Der Termin liegt ganz oder teilweise an einem Wochenende oder schulfreien Tag.');
 if(e.kind==='unit'&&events.some(x=>x.id!==e.id&&x.track===e.track&&x.kind==='unit'&&x.start<=e.end&&x.end>=e.start))warnings.push('Der Zeitraum überschneidet sich mit einem anderen Unterrichtsvorhaben. Die übrigen Vorhaben werden nicht automatisch verschoben.');
 return warnings.join(' ');
}
function openEvent(id){
 editId=id;const e=id?events.find(x=>x.id===id):{title:'',kind:'exam',track:[...selected][0]||data.subjects[subject].tracks[0].id,start:month<data.years[year].start?data.years[year].start:month,end:month<data.years[year].start?data.years[year].start:month,notes:''};
 if(!e)return;
 $('event-heading').textContent=id?'Termin / Vorhaben bearbeiten':'Neuen Termin hinzufügen';
 for(const f of ['title','track','kind','start','end','time','notes'])$('event-'+f).value=e[f]||'';
 for(const f of ['start','end']){$('event-'+f).min=data.years[year].start;$('event-'+f).max=data.years[year].end}
 $('event-context').textContent=data.subjects[subject].label+' · '+data.years[year].label+(e.hours?` · Richtwert: ${e.hours} UStd`:'');
 const original=baseEvents.find(x=>x.id===id);let links='';
 if(original?.url)links=`<a href="${esc(original.url)}" target="_blank" rel="noopener">Unterrichtsvorhaben im Curriculum öffnen ↗</a>`;
 if(original?.source)links+='<br>Quelle: '+(original.source.startsWith('https://')?`<a href="${esc(original.source)}" target="_blank" rel="noopener">Amtliche Termine ↗</a>`:esc(original.source));
 $('event-source').innerHTML=links;$('event-delete').hidden=!id;$('event-restore').hidden=!id||!Object.hasOwn(state.overrides,id);
 $('event-warning').textContent=eventWarning(e);$('event-dialog').showModal();
}
$('event-form').onsubmit=e=>{
 e.preventDefault();const existing=events.find(x=>x.id===editId);const item={...(existing||{}),id:editId||'custom-'+crypto.randomUUID(),subject,year};
 for(const f of ['title','track','kind','start','end','time','notes'])item[f]=$('event-'+f).value.trim();
 if(item.end<item.start){$('event-warning').textContent='Das Ende darf nicht vor dem Beginn liegen.';return}
 if(item.start<data.years[year].start||item.end>data.years[year].end){$('event-warning').textContent='Bitte einen Zeitraum innerhalb des gewählten Schuljahres wählen.';return}
 const index=state.added.findIndex(x=>x.id===editId);
 if(index>=0)state.added[index]=item;else if(editId)state.overrides[editId]=item;else state.added.push(item);
 save();$('event-dialog').close();refresh();const warning=eventWarning(item);if(warning)$('save-status').textContent+=' Hinweis: '+warning;
};
$('event-delete').onclick=()=>{const index=state.added.findIndex(x=>x.id===editId);if(index>=0)state.added.splice(index,1);else state.overrides[editId]=null;save();$('event-dialog').close();refresh()};
$('event-restore').onclick=()=>{delete state.overrides[editId];save();$('event-dialog').close();refresh()};
function resetFree(){$('free-form').reset();$('free-id').value='';$('free-start').value=month;$('free-end').value=month}
function listFree(){
 const c=data.years[year],relevant=x=>x.start<=c.end&&x.end>=c.start;
 $('free-list').innerHTML=state.free.filter(relevant).map(x=>`<div class="free-row"><div><strong>${esc(x.title)}</strong><br>${fmt(x.start)}${x.end!==x.start?'–'+fmt(x.end):''} · ${x.tracks.length?esc(x.tracks.join(', ')):'Alle Jahrgänge'}</div><button data-free-edit="${esc(x.id)}">Ändern</button><button data-free-delete="${esc(x.id)}">Löschen</button></div>`).join('')||'<p class="hint">Noch keine zusätzlichen freien Tage in diesem Schuljahr.</p>';
 $('fixed-free-list').innerHTML=closureList().filter(x=>!x.id.startsWith('free-')).filter(relevant).sort((a,b)=>a.start.localeCompare(b.start)).map(x=>`<div class="fixed-row"><strong>${esc(x.title)}</strong> · ${fmt(x.start)}${x.start!==x.end?'–'+fmt(x.end):''}${x.tracks.length?' · '+esc(x.tracks.join(', ')):''}</div>`).join('');
}
$('free-days').onclick=()=>{resetFree();listFree();$('free-dialog').showModal()};$('free-new').onclick=resetFree;
$('free-form').onsubmit=e=>{e.preventDefault();const start=$('free-start').value,end=$('free-end').value;if(end<start||start<'2026-08-01'||end>'2100-08-31'){$('free-end').setCustomValidity('Bitte einen gültigen Zeitraum ab August 2026 wählen.');$('free-end').reportValidity();return}$('free-end').setCustomValidity('');const scope=$('free-scope').value,item={id:$('free-id').value||'free-'+crypto.randomUUID(),start,end,title:$('free-title').value.trim(),kind:'school',source:'Eigene Planung',tracks:scope==='all'?[]:!scope.startsWith('Q')?[scope]:[scope+' GK',scope+' LK']};const i=state.free.findIndex(x=>x.id===item.id);if(i>=0)state.free[i]=item;else state.free.push(item);save();refresh();resetFree();listFree()};
$('free-end').oninput=()=>{$('free-end').setCustomValidity('')};$('free-start').oninput=()=>{$('free-end').setCustomValidity('')};
$('free-list').onclick=e=>{const edit=e.target.closest('[data-free-edit]'),del=e.target.closest('[data-free-delete]');if(edit){const c=state.free.find(x=>x.id===edit.dataset.freeEdit);$('free-id').value=c.id;for(const f of ['title','start','end'])$('free-'+f).value=c[f];$('free-scope').value=c.tracks.length?c.tracks[0].split(' ')[0]:'all';$('free-title').focus()}if(del){state.free=state.free.filter(x=>x.id!==del.dataset.freeDelete);save();refresh();listFree();resetFree()}};
$('tracks').onchange=()=>{selected=new Set([...$('tracks').querySelectorAll('input:checked')].map(x=>x.value));state.filters[subject]=[...selected];save('Auswahl der Jahrgangsstufen gespeichert.');render()};
function selectAll(on){$('tracks').querySelectorAll('input').forEach(x=>x.checked=on);$('tracks').onchange()}
$('all-tracks').onclick=()=>selectAll(true);$('no-tracks').onclick=()=>selectAll(false);
$('subject').onchange=setContext;$('year').onchange=setContext;$('month').onchange=()=>{month=$('month').value;render()};
$('prev').onclick=()=>{const ms=months();month=ms[ms.indexOf(month)-1];render()};$('next').onclick=()=>{const ms=months();month=ms[ms.indexOf(month)+1];render()};
$('month-view').onclick=()=>{view='month';render()};$('year-view').onclick=()=>{view='year';render()};
for(const id of ['show-reserve','show-makeup','show-closures'])$(id).onchange=render;
$('calendar').onclick=e=>{const el=e.target.closest('[data-event]');if(el)openEvent(el.dataset.event)};$('new-exam').onclick=()=>openEvent(null);
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
$('export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Thomaeum_Fachkalender_Eigene_Planung.json';document.body.append(a);a.click();a.remove();$('save-status').textContent='Die Sicherungsdatei wurde zum Herunterladen bereitgestellt.';setTimeout(()=>URL.revokeObjectURL(url),30000)};
$('import').onchange=async()=>{const file=$('import').files[0];if(!file)return;try{if(file.size>2000000)throw Error();const next=JSON.parse(await file.text());if(!validState(next))throw Error();state=next;state.years=next.years||{};state.remoteClosures=next.remoteClosures||{};data.years={...builtinYears,...state.years};updateYears();$('year').value=data.years[year]?year:'2026';state.filters=next.filters&&typeof next.filters==='object'?next.filters:{};save('Planung importiert und in diesem Browser gespeichert.');setContext()}catch{$('save-status').textContent='Import nicht möglich: Bitte eine gültige exportierte Fachkalender-Datei wählen. Die bestehende Planung bleibt erhalten.'}$('import').value=''};
$('reset').onclick=()=>$('confirm-dialog').showModal();$('confirm-reset').onclick=()=>{state={version:1,overrides:{},added:[],free:[],filters:{},years:{},remoteClosures:{}};data.years=structuredClone(builtinYears);updateYears();$('year').value='2026';save('Eigene Änderungen zurückgesetzt.');$('confirm-dialog').close();setContext()};
function theme(){const dark=document.documentElement.dataset.theme==='dark';$('theme').textContent=dark?'Helle Darstellung':'Dunkle Darstellung';if(dark)document.body.style.removeProperty('--accent');else document.body.style.setProperty('--accent',{chemie:'#19665d',physik:'#245d91',biologie:'#9c493c','mensch-und-umwelt':'#466b37'}[subject])}
$('theme').onclick=()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('chemie-curriculum-theme',document.documentElement.dataset.theme)}catch{}theme()};
function board(on){document.body.classList.toggle('board-mode',on);$('fullscreen').textContent=on?'Vollbild beenden':'Vollbild'}
$('fullscreen').onclick=async()=>{if(document.fullscreenElement){await document.exitFullscreen();return}if(document.body.classList.contains('board-mode')){board(false);return}board(true);try{await document.documentElement.requestFullscreen()}catch{}};
document.addEventListener('fullscreenchange',()=>board(!!document.fullscreenElement));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.fullscreenElement)board(false)});

$('add-year').onclick=()=>{$('year-status').textContent='';$('year-number').value=Math.max(2028,...Object.keys(data.years).map(y=>+y+1));$('year-dialog').showModal()};
$('year-form').onsubmit=async e=>{
 e.preventDefault();const y=+$('year-number').value;if(data.years[y]){$('year-status').textContent='Dieses Schuljahr ist bereits vorhanden.';return}
 $('load-year').disabled=true;$('year-status').textContent='NRW-Ferien und Feiertage werden geladen …';
 try{const result=await Fachferien.loadYear(y);if(!validConfig(result.config,String(y)))throw Error('Die geladenen Termine ergeben keinen gültigen Schuljahresrahmen.');state.years[y]=result.config;state.remoteClosures[y]=result.closures;data.years[y]=result.config;updateYears();$('year').value=String(y);save('Schuljahr mit geladenen NRW-Ferien angelegt. Q2-Rahmen bitte prüfen.');$('year-dialog').close();setContext()}
 catch(error){$('year-status').textContent=error.name==='TimeoutError'?'Die Ferienabfrage hat zu lange gedauert. Bitte erneut versuchen.':error.message||'Ferien konnten nicht geladen werden.'}
 finally{$('load-year').disabled=false}
};
$('year-settings').onclick=()=>{const c=data.years[year];for(const key of ['start','end','half','q2half','q2end','prepStart','prepEnd'])$('settings-'+key).value=c[key]||'';$('settings-confirmed').checked=!c.q2Provisional;$('settings-status').textContent='';$('settings-dialog').showModal()};
$('settings-form').onsubmit=e=>{e.preventDefault();const c={...data.years[year]};for(const key of ['start','end','half','q2half','q2end','prepStart','prepEnd'])c[key]=$('settings-'+key).value||null;c.q2Provisional=!$('settings-confirmed').checked;c.halfProvisional=false;
 if(!validConfig(c,year)){$('settings-status').textContent='Bitte die Datumsfolge prüfen. Die Vorbereitungsphase muss vollständig angegeben werden und nach dem Ende der regulären Q2-Planung liegen.';return}
 state.years[year]=c;data.years[year]=c;save('Schuljahresrahmen gespeichert; automatische Vorhaben neu verteilt.');$('settings-dialog').close();setContext();
};

$('sources').innerHTML=data.sources.map(x=>`<p><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)} ↗</a></p>`).join('');$('stand').textContent=data.status;
setContext();theme();$('save-status').textContent=loadWarning||(storageOK?'Änderungen werden in diesem Browser gespeichert.':'Lokale Speicherung ist nicht verfügbar. Bitte Änderungen exportieren.');
})();

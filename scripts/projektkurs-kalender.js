'use strict';
(async () => {
 const $ = id => document.getElementById(id);
 const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date = s => new Date(s+'T12:00:00');
 const fmt = s => date(s).toLocaleDateString('de-DE');
 let data;
 try { const r=await fetch('data/projektkurs-kalender-2027.json?v=20260927-kanban'); if(!r.ok)throw Error(r.status); data=await r.json(); }
 catch(e){$('plan-note').textContent='Der Kalender konnte nicht geladen werden. Bitte die Seite neu laden oder die Kalender-PDF öffnen.';return;}
 const months=Array.from({length:13},(_,i)=>{const d=new Date(2027,1+i,1,12);return {year:d.getFullYear(),month:d.getMonth(),key:d.toISOString().slice(0,7),label:d.toLocaleDateString('de-DE',{month:'long',year:'numeric'})};});
 let index=0,all=false;
 const shortPhase={project:'Projektwerkstatt',deadline:'Meilenstein',presentation:'Vorstellung',start:'Grundlagen',feedback:'Feedback',review:'Rückmeldung',buffer:'Puffer'};
 const formLinks=s=>'<div class="form-links">'+s.forms.map(k=>`<button type="button" data-pdf="${esc(data.forms[k].url)}">${esc(data.forms[k].label)}${k==='Notenbildung'?' · Abschnitt B':''}</button>`).join('')+(s.apps||[]).map(k=>`<a href="${esc(data.apps[k].url)}" target="_blank" rel="noopener">${esc(data.apps[k].label)} ↗</a>`).join('')+'</div>';
 const card=s=>`<article class="agenda-item"><time datetime="${s.date}">${fmt(s.date)}</time><span class="phase-tag">${shortPhase[s.phase]}</span><button class="agenda-title" data-event="${s.date}">${esc(s.title)}</button><p>${esc(s.goal)}</p>${formLinks(s)}</article>`;
 $('plan-note').textContent=data.status+' · 37 Doppelstunden / 74 Unterrichtsstunden vor weiteren schulischen Ausfällen. '+data.note;
 $('kanban-rule').textContent=data.kanbanRule;$('kanban-apps').innerHTML=Object.values(data.apps).map(a=>`<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.label)} ↗</a>`).join('');
 $('legal').textContent=data.legal;$('project-rule').textContent=data.projectRule;$('presentation-rule').textContent=data.presentationRule;
 $('source-links').innerHTML=data.sources.map(s=>`<p><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></p>`).join('');
 $('phase-list').innerHTML=data.phases.map(p=>`<div class="phase-row"><div>${fmt(p.start)}–<br>${fmt(p.end)}</div><div><strong>${esc(p.name)}</strong><p>${esc(p.goal)} · ${p.modules.replace(/M[1-8]/g,code=>`<a href="projektkurs-wissenschaftskommunikation.html#${code.toLowerCase()}">${code}</a>`)}</p></div><div>${p.sessions*2} UE</div></div>`).join('');
 $('month-select').innerHTML=months.map((m,i)=>`<option value="${i}">${m.label}</option>`).join('');
 function render(){
  const m=months[index],first=new Date(m.year,m.month,1,12),count=new Date(m.year,m.month+1,0,12).getDate();
  $('month-title').textContent=all?'Gesamter Kurs':m.label;$('month-select').value=index;
  $('prev').disabled=all||index===0;$('next').disabled=all||index===12;$('month-select').disabled=all;
  $('month-panel').hidden=all;$('all-panel').hidden=!all;
  $('month-view').setAttribute('aria-pressed',String(!all));$('all-view').setAttribute('aria-pressed',String(all));
  let grid=['Mo','Di','Mi','Do','Fr','Sa','So'].map(x=>`<div class="weekday">${x}</div>`).join('');
  for(let i=0;i<(first.getDay()+6)%7;i++)grid+='<div class="day empty" aria-hidden="true"></div>';
  for(let day=1;day<=count;day++){
   const key=`${m.year}-${String(m.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
   const s=data.sessions.find(s=>s.date===key),closures=data.closures.filter(c=>key>=c.start&&key<=c.end),holiday=data.holidays.find(h=>h.date===key),marker=data.markers.find(x=>x.date===key);
   const outside=key<data.start||key>data.end,classes=['day',s?.phase||'',closures.some(c=>c.kind==='vacation')?'vacation':'',closures.some(c=>c.kind==='school')||holiday?'holiday':'',marker?'marker':'',outside?'outside':'',[0,6].includes(date(key).getDay())?'weekend':''].filter(Boolean).join(' ');
   const labels=[...closures.map(c=>c.label),holiday?.label,marker?.label,s?.title].filter(Boolean);
   const displayLabels=[...closures.map(c=>c.label.replace(' · schulfrei','')),holiday?.label,marker?(marker.provisional?'Notenschluss (vorläufig)':marker.label.includes('zeugnisse')?'Zeugnisse':'Letzter Schultag'):null,s?(s.phase==='project'?s.title.split(' · ')[0].replace('Projektwerkstatt','Werkstatt'):s.phase==='deadline'?(key==='2027-12-07'?'Abgabe P2':key==='2027-06-29'?'Abgabe P1':'Vereinbarung'):shortPhase[s.phase]):null].filter(Boolean);
   const content=`<span class="day-number">${day}</span>${displayLabels.map(t=>`<small>${esc(t)}</small>`).join('')}`;
   grid+=s?`<button type="button" class="${classes}" data-event="${key}" aria-label="${esc(fmt(key)+' · '+labels.join(' · '))}">${content}</button>`:`<div class="${classes}" aria-label="${esc(fmt(key)+' · '+labels.join(' · '))}">${content}</div>`;
  }
  $('month-grid').innerHTML=grid;
  const sessions=data.sessions.filter(s=>s.date.startsWith(m.key));
  $('agenda-list').innerHTML=sessions.length?sessions.map(card).join(''):'<p>In diesem Monat findet kein Projektkurs statt.</p>';
  const end=`${m.key}-${count}`;
  $('month-notices').innerHTML=data.closures.filter(c=>c.start<=end&&c.end>=m.key+'-01').map(c=>`<p><strong>${esc(c.label)}:</strong> ${fmt(c.start)}${c.end!==c.start?'–'+fmt(c.end):''} · kein Unterricht${c.end<data.start||c.start>data.end?' · außerhalb des Kurses':''}</p>`).join('')+data.markers.filter(x=>x.date.startsWith(m.key)).map(x=>`<p><strong>${fmt(x.date)}:</strong> ${esc(x.label)}</p>`).join('');
 }
 const entries=[...data.sessions.map(s=>({date:s.date,s})),...data.closures.map(c=>({date:c.start,c})),...data.markers.map(m=>({date:m.date,m}))].sort((a,b)=>a.date.localeCompare(b.date));
 $('all-list').innerHTML=entries.map(e=>e.s?`<div class="timeline-row"><time>${fmt(e.date)}</time><div>${card(e.s)}</div></div>`:e.c?`<div class="timeline-row vacation"><time>${fmt(e.date)}${e.c.end!==e.date?'–<br>'+fmt(e.c.end):''}</time><div><strong>${esc(e.c.label)}</strong>Kein Unterricht${e.c.end<data.start||e.c.start>data.end?' · außerhalb des Kurses':''}</div></div>`:`<div class="timeline-row marker"><time>${fmt(e.date)}</time><div><strong>${esc(e.m.label)}</strong></div></div>`).join('');
 $('prev').onclick=()=>{index--;render()};$('next').onclick=()=>{index++;render()};$('month-select').onchange=e=>{index=+e.target.value;render()};
 $('month-view').onclick=()=>{all=false;render()};$('all-view').onclick=()=>{all=true;render()};
 document.addEventListener('click',e=>{
  const event=e.target.closest('[data-event]');
  if(event){const s=data.sessions.find(s=>s.date===event.dataset.event);$('event-title').textContent=s.title;$('event-date').textContent=fmt(s.date)+' · 2 × 45 Minuten';$('event-goal').textContent=s.goal;$('event-forms').innerHTML=formLinks(s);$('event-dialog').showModal();}
  const pdf=e.target.closest('[data-pdf]');if(pdf){const url=pdf.dataset.pdf;$('pdf-title').textContent=pdf.textContent;$('pdf-frame').src=url;$('pdf-download').href=url;$('pdf-tab').href=url;$('pdf-dialog').showModal();}
 });
 $('event-dialog').querySelector('.close-dialog').onclick=()=>$('event-dialog').close();
 $('pdf-close').onclick=()=>$('pdf-dialog').close();$('pdf-dialog').addEventListener('close',()=>{$('pdf-frame').src='about:blank'});
 function themeLabel(){$('theme').textContent=document.documentElement.dataset.theme==='dark'?'Helle Darstellung':'Dunkle Darstellung'}
 $('theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('chemie-curriculum-theme',theme)}catch{}themeLabel()};themeLabel();
 function board(active){document.body.classList.toggle('board-mode',active);$('fullscreen').textContent=active?'Vollbild beenden':'Vollbild fürs Smartboard';$('fullscreen').setAttribute('aria-pressed',String(active))}
 $('fullscreen').onclick=async()=>{if(document.fullscreenElement){await document.exitFullscreen();return}if(document.body.classList.contains('board-mode')){board(false);return}board(true);try{await document.documentElement.requestFullscreen()}catch{}}
 document.addEventListener('fullscreenchange',()=>board(!!document.fullscreenElement));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.fullscreenElement&&!$('event-dialog').open&&!$('pdf-dialog').open)board(false)});
 render();
})();

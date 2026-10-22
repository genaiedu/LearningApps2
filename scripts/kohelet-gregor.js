(() => {
  'use strict';
  const V=window.KoheletContent,C=window.KoheletCore,$=id=>document.getElementById(id);
  const KEY='kohelet-gregor:work:v1',VIEW='kohelet-gregor:view:v1',romans=['I','II','III','IV','V','VI','VII','VIII'];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ').replace(/[^\p{L}]/gu,'');
  let state=C.fresh(),view={palette:'graphite',theme:'light',scale:100,motion:true},corpus=null,corpusPromise=null,path='lesen',pendingImport=null,pendingFocus=null,saveBlocked=false;
  const icons=()=>window.lucide?.createIcons();
  function notify(message){$('save-status').textContent=message;$('save-status').hidden=false;}
  try{const saved=localStorage.getItem(KEY);if(saved)state=C.validate(JSON.parse(saved));}catch(e){saveBlocked=true;notify('Der vorhandene Arbeitsstand konnte nicht gelesen werden und wird nicht überschrieben. Du kannst deine neue Arbeit herunterladen oder ausdrücklich neu beginnen.');}
  try{const s=JSON.parse(localStorage.getItem(VIEW));if(s&&['graphite','atelier','slate','plum','bordeaux'].includes(s.palette))view.palette=s.palette;if(s?.theme==='dark')view.theme='dark';if([90,95,100,105,110,115,120,125,130].includes(s?.scale))view.scale=s.scale;if(typeof s?.motion==='boolean')view.motion=s.motion;}catch{}
  function save(){if(saveBlocked)return false;try{localStorage.setItem(KEY,JSON.stringify(C.validate(state)));$('draft-save')&&($('draft-save').textContent='In diesem Browser gespeichert.');return true;}catch{$('draft-save')&&($('draft-save').textContent='Nur für diesen Besuch gehalten.');notify('Dein Browser kann den Arbeitsstand gerade nicht speichern. Deine Eingaben bleiben hier sichtbar. Bitte lade deine Texte oder eine Sicherung herunter.');return false;}}
  function applyView(){Object.assign(document.documentElement.dataset,{palette:view.palette,theme:view.theme,motion:String(view.motion)});document.documentElement.style.setProperty('--text-scale',view.scale/100);$('palette').value=view.palette;$('text-scale').value=view.scale;$('text-scale-value').value=view.scale+' %';$('motion').checked=view.motion;document.querySelectorAll('[name=theme]').forEach(r=>r.checked=r.value===view.theme);try{localStorage.setItem(VIEW,JSON.stringify(view));}catch{}}
  const sourceLinks=ids=>ids.map(id=>{const s=V.sources.find(s=>s.id===id);return s?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`:'';}).join('');
  function sourceFooters(root=document){root.querySelectorAll('[data-sources]').forEach(n=>n.innerHTML=sourceLinks(n.dataset.sources.split(' ')));}
  function open(id){$(id).showModal();}
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
  $('view-open').onclick=()=>open('view-dialog');$('save-open').onclick=()=>open('save-dialog');$('reset-open').onclick=()=>open('reset-dialog');
  $('palette').onchange=e=>{view.palette=e.target.value;applyView();};document.querySelectorAll('[name=theme]').forEach(r=>r.onchange=()=>{view.theme=r.value;applyView();});
  $('motion').onchange=e=>{view.motion=e.target.checked;applyView();};$('text-scale').oninput=e=>{view.scale=Number(e.target.value);applyView();};

  function visual(kind,caption=''){
    let body='';
    const box=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" class="v-soft"/>`;
    const text=(x,y,s,cls='v-text')=>`<text x="${x}" y="${y}" text-anchor="middle" class="${cls}">${esc(s)}</text>`;
    const line=(x1,y1,x2,y2,cls='v-line')=>`<path d="M${x1} ${y1}L${x2} ${y2}" class="${cls}"/>`;
    if(kind==='breath')body=`<circle cx="120" cy="150" r="50" class="v-soft"/><path class="v-accent v-breath" d="M64 146C150 87 189 218 281 146S379 110 431 151"/><path class="v-line v-breath" d="M72 170C144 130 197 228 270 175S372 141 421 172"/><path class="v-accent v-breath" d="M71 124C150 60 195 185 272 115S370 76 424 115"/>${text(250,267,'Hauch','v-word')}${text(250,298,'flüchtig · nicht festzuhalten','v-label')}`;
    else if(kind==='voices'||kind==='branches')body=`${line(130,93,250,180)}${line(370,93,250,180)}${line(250,267,250,180)}${box(32,35,196,70)}${box(272,35,196,70)}${box(150,240,200,70)}${text(130,65,'Kohelet')}${text(130,90,'jüdisches Buch','v-label')}${text(370,65,'Gregor')}${text(370,90,'christliche Rezeption','v-label')}${text(250,269,'Heute')}${text(250,294,'prüfen · fragen · urteilen','v-label')}<circle cx="250" cy="180" r="33" class="v-soft"/>${text(250,192,'?','v-word')}`;
    else if(kind==='books')body=`<path class="v-line" d="M65 84Q150 58 246 101V267Q148 225 65 251ZM246 101Q340 58 435 84V251Q342 225 246 267Z"/><path class="v-accent" d="M246 101V267"/>${[0,1,2,3].map(i=>`<path class="v-line" d="M90 ${120+i*24}Q156 ${103+i*24} 220 ${133+i*24}M272 ${133+i*24}Q340 ${103+i*24} 411 ${120+i*24}"/>`).join('')}${text(250,315,'Text und Auslegung','v-label')}`;
    else if(kind==='translation')body=`${box(25,45,200,230)}${box(275,45,200,230)}${text(125,86,'Wortlaut')}${text(375,86,'Auslegung')}<path class="v-accent" d="M225 155H275M260 143L275 155L260 167"/>${text(125,158,'הבל','v-word v-hebrew')}${text(125,207,'hebel','v-label')}${text(375,153,'ματαιότης','v-word')}${text(375,207,'Nichtigkeit','v-label')}${text(250,315,'Übersetzen ist nicht bloß Austauschen.','v-label')}`;
    else if(kind==='example')body=`${box(35,45,430,110)}${box(35,185,430,110)}${text(250,83,'Koh 1,2','v-label')}${text(250,131,'Hauch','v-word')}${text(250,223,'Gregor · Homilie I','v-label')}${text(250,271,'Nichtigkeit','v-word')}`;
    else if(kind==='evidence')body=`${[45,145,245].map((y,i)=>`${box(45,y,410,65)}${text(250,y+40,['Beobachtung + Beleg','Deutung + Gegenprobe','Begründetes Urteil'][i])}`).join('')}<path class="v-accent" d="M250 110V145M242 134L250 145L258 134M250 210V245M242 234L250 245L258 234"/>`;
    else if(kind==='time')body=`<circle cx="250" cy="160" r="103" class="v-line"/>${Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return line(250+91*Math.sin(a),160-91*Math.cos(a),250+100*Math.sin(a),160-100*Math.cos(a));}).join('')}<path d="M250 160V90M250 160L303 192" class="v-accent"/><circle cx="250" cy="160" r="5" class="v-dot"/>${text(250,310,'Maß und rechte Gelegenheit','v-label')}`;
    else if(kind==='scale')body=`<path class="v-line" d="M250 66V270M175 270H325M112 118H388M140 118L104 201H176ZM360 118L324 201H396Z"/><path class="v-accent" d="M204 53H296M250 53V78"/><circle cx="250" cy="114" r="8" class="v-soft"/>${text(250,316,'Gleiche Natur · kein Kaufpreis','v-label')}`;
    else if(kind==='crown')body=`<path class="v-line" d="M100 111L161 160L250 77L339 160L400 111L366 246H134ZM134 246V265H366V246"/><circle cx="100" cy="111" r="7" class="v-dot"/><circle cx="250" cy="77" r="7" class="v-dot"/><circle cx="400" cy="111" r="7" class="v-dot"/>${text(250,312,'Eine literarische Königsrolle','v-label')}`;
    else if(kind==='cup')body=`<path class="v-line" d="M147 94H324V201Q324 253 238 253Q147 253 147 201ZM324 116H348C402 116 402 198 348 198H324M127 273H349"/><path class="v-accent" d="M184 65C165 40 205 30 187 9M236 65C218 40 256 30 238 9M286 65C269 40 307 30 289 9"/>${text(250,316,'Freude ohne dauernden Besitz','v-label')}`;
    else return visual('books',caption);
    return `<figure class="visual-figure"><svg class="visual-svg" viewBox="0 0 500 340" role="img" aria-label="${esc(caption||({breath:'Schematische Linien eines verwehenden Hauchs',voices:'Drei unterscheidbare Perspektiven im Gespräch',translation:'Wortlaut und Auslegung im Vergleich',scale:'Eine Waage als Zeichen der Gleichheit',books:'Ein aufgeschlagenes Buch',evidence:'Drei Schritte zum begründeten Urteil'}[kind]||'Ein erklärendes Schema'))}">${body}</svg>${caption?`<figcaption class="visual-caption">${esc(caption)}</figcaption>`:''}</figure>`;
  }
  $('hero-visual').innerHTML=visual('breath');
  const downloads=[
    {title:'Kohelet · Deutsch',note:'Alle zwölf Kapitel · 14 Seiten · ohne Versnummern',icon:'book-open',files:[['PDF','kohelet-deutsch.pdf'],['Textdatei','kohelet-deutsch.txt']]},
    {title:'Gregor · Deutsch',note:'Alle acht Homilien · 103 Seiten · ohne Stellenmarkierungen',icon:'book-open',files:[['PDF','gregor-deutsch.pdf'],['Textdatei','gregor-deutsch.txt']]},
    {title:'Kohelet · Hebräisch & Deutsch',note:'Vollständig · beide Spalten mit Versnummern · 33 Seiten',icon:'languages',files:[['PDF','kohelet-hebraeisch-deutsch.pdf']]},
    {title:'Gregor · Griechisch & Deutsch',note:'Alle acht Homilien · mit Kohelet-Stellenangaben und gegliederten griechischen Absätzen',icon:'languages',files:[['PDF','gregor-griechisch-deutsch.pdf']]},
    {title:'Der vollständige Begleittext',note:'Kohelet, Gregor und heutige Auslegung · mit jüdischen Perspektiven und Quellen',icon:'messages-square',files:[['PDF','begleittext.pdf'],['Textdatei','begleittext.txt']]},
    {title:'Alle Arbeitsaufträge',note:'Sechzehn Aufträge mit Textstellen, Arbeitswegen und Hilfen · ohne Vergleichsvorschläge',icon:'notebook-pen',files:[['PDF','arbeitsauftraege.pdf'],['Textdatei','arbeitsauftraege.txt']]}
  ];
  const card=d=>`<article class="download-card"><i data-lucide="${d.icon}" aria-hidden="true"></i><div><h3>${d.title}</h3><p>${d.note}</p></div><div class="actions">${d.files.map(([label,file])=>`<a class="button" href="material/kohelet/${file}" download aria-label="${esc(d.title+' als '+label+' herunterladen')}"><i data-lucide="download" aria-hidden="true"></i>${label} herunterladen</a>`).join('')}</div></article>`;
  $('entry-downloads').innerHTML=downloads.slice(0,4).map(card).join('');$('all-downloads').innerHTML=downloads.map(card).join('');
  $('source-list').innerHTML=V.sources.map(s=>`<article id="quelle-${s.id}"><h3><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} <i data-lucide="arrow-up-right" aria-hidden="true"></i></a></h3><p>${esc(s.note)}</p></article>`).join('');
  $('essay-nav').innerHTML=V.essay.map(s=>`<a href="#gespraech/${s.id}">${esc(s.title)}</a>`).join('');
  $('essay-text').innerHTML=V.essay.map((s,i)=>`<section id="essay-${s.id}"><p class="eyebrow">${String(i+1).padStart(2,'0')} / Begleittext</p><h2>${esc(s.title)}</h2>${i===0?visual('voices'):i===3?visual('translation'):i===5?visual('scale'):''}${s.paras.map(p=>`<p>${esc(p)}</p>`).join('')}${s.sources.length?`<div class="source-line">${sourceLinks(s.sources)}</div>`:''}</section>`).join('');
  sourceFooters();

  async function getCorpus(){if(corpus)return corpus;if(!corpusPromise)corpusPromise=fetch('data/kohelet-gregor/lesetexte.json?v=20261022-1',{credentials:'omit'}).then(r=>{if(!r.ok)throw Error('Die Lesetexte konnten nicht geladen werden.');return r.json();}).then(d=>{if(d.version!==1||d.kohelet.length!==12||d.gregor.length!==8)throw Error('Die Lesetexte sind unvollständig.');corpus=d;return d;}).catch(e=>{corpusPromise=null;throw e;});return corpusPromise;}
  let readerSerial=0;
  function refText(p){let result='',start=0;for(const ref of [...p.refs].sort((a,b)=>a.offset-b.offset)){result+=esc(p.text.slice(start,ref.offset))+`<span class="bibref">[${esc(ref.label)}]</span>`;start=ref.offset;}return result+esc(p.text.slice(start));}
  function updateReaderUnits(){const r=state.reading;const count=r.work==='kohelet'?12:8;$('reader-work').value=r.work;$('reader-unit-label').firstChild.textContent=r.work==='kohelet'?'Kapitel':'Homilie';$('reader-unit').innerHTML=Array.from({length:count},(_,i)=>`<option value="${i+1}">${r.work==='kohelet'?'Kapitel '+(i+1):'Homilie '+romans[i]+' · '+V.homilies[i]}</option>`).join('');$('reader-unit').value=r.unit;}
  async function renderReader(){
    const serial=++readerSerial,r={...state.reading},focus=pendingFocus;pendingFocus=null;updateReaderUnits();$('mode-de').setAttribute('aria-pressed',r.mode==='de');$('mode-parallel').setAttribute('aria-pressed',r.mode==='parallel');
    $('reader-description').textContent=r.mode==='de'?'Deutsche Arbeitsübersetzung. Die ununterbrochene Lesefassung ist zusätzlich als PDF und Textdatei verfügbar.':r.work==='kohelet'?'Hebräisch und eigene deutsche Arbeitsübersetzung. Versnummern in beiden Spalten.':'Griechisch und eigene deutsche Arbeitsübersetzung. Die Absätze sind redaktionelle Lesehilfen, nicht zeilenweise synchronisiert.';
    $('reader-previous').disabled=r.unit===1;$('reader-next').disabled=r.unit===(r.work==='kohelet'?12:8);$('reader-position').textContent=r.work==='kohelet'?`Kapitel ${r.unit} von 12`:`Homilie ${romans[r.unit-1]} von VIII`;
    $('reader-text').innerHTML='<p class="small">Die Texte werden geladen …</p>';
    try{const d=await getCorpus();if(serial!==readerSerial)return;const parallel=r.mode==='parallel';let content='';
      if(r.work==='kohelet'){
        const chapter=d.kohelet[r.unit-1];
        content=`<h2>Kohelet · Kapitel ${r.unit}</h2><p class="reader-subtitle">Eigene deutsche Arbeitsübersetzung</p><div class="reader-body ${parallel?'is-parallel':''}">${chapter.verses.map(v=>{const verse=Number(v.ref.split('.')[1]),selected=focus&&verse>=focus.from&&verse<=focus.to;return `<div id="vers-${v.ref.replace('.','-')}" class="${parallel?'bilingual-unit':''} ${selected?'selected-passage':''}">${parallel?`<div class="reader-column original-he" lang="he" dir="rtl"><p><bdi class="verse-number">${v.ref.replace('.',',')}</bdi>${esc(v.he)}</p>${v.readings?.map(n=>`<div class="qere-note" dir="ltr">Geschrieben: <bdi dir="rtl">${esc(n.ketiv)}</bdi> · gelesen: <bdi dir="rtl">${esc(n.qere)}</bdi></div>`).join('')||''}</div>`:''}<div class="reader-column"><p>${parallel?`<span class="verse-number">${v.ref.replace('.',',')}</span>`:''}${esc(v.de)}</p></div></div>`;}).join('')}</div>`;
      }else{
        const h=d.gregor[r.unit-1];content=`<h2>Homilie ${romans[r.unit-1]}</h2><p class="reader-subtitle">${esc(h.title)}</p><div class="reader-body ${parallel?'is-parallel':''}">${h.chunks.map(c=>`<div class="${parallel?'bilingual-unit':'reader-chunk'}">${parallel?`<div class="reader-column original-el" lang="el">${c.el.map(p=>`<p>${refText(p)}</p>`).join('')}</div>`:''}<div class="reader-column">${c.de.map((p,i)=>`<p id="${c.id}-${i}"${focus&&fold(p.text).includes(fold(focus.anchor))?' class="selected-passage"':''}>${parallel?refText(p):esc(p.text)}</p>`).join('')}</div></div>`).join('')}</div>`;
      }
      $('reader-text').innerHTML=content;
      if(focus)requestAnimationFrame(()=>{$('reader-text').querySelector('.selected-passage')?.scrollIntoView({block:'center',behavior:'instant'});});
    }catch(e){if(serial!==readerSerial)return;$('reader-text').innerHTML=`<p>${esc(e.message)} Die PDF- und Textdateien im Downloadbereich bleiben erreichbar.</p><button type="button" id="reader-retry">Erneut versuchen</button>`;$('reader-retry').onclick=renderReader;}
  }
  function readPassage(r){state.reading.work=r.work;state.reading.unit=r.unit;pendingFocus=r;save();const next=`#lesen/${r.work}/${r.unit}`;if(location.hash===next){renderReader();}else location.hash=next;}
  $('reader-work').onchange=e=>{state.reading.work=e.target.value;state.reading.unit=1;save();location.hash=`#lesen/${state.reading.work}/1`;};
  $('reader-unit').onchange=e=>{state.reading.unit=Number(e.target.value);save();location.hash=`#lesen/${state.reading.work}/${state.reading.unit}`;};
  $('mode-de').onclick=()=>{state.reading.mode='de';save();renderReader();};$('mode-parallel').onclick=()=>{state.reading.mode='parallel';save();renderReader();};
  for(const [id,delta] of [['reader-previous',-1],['reader-next',1]])$(id).onclick=()=>{state.reading.unit+=delta;save();location.hash=`#lesen/${state.reading.work}/${state.reading.unit}`;};
  $('example-read').onclick=()=>{location.hash='#arbeiten/hauch';};

  function answer(id=state.currentTask){return state.answers[id]||(state.answers[id]=C.blankAnswer());}
  function renderProgress(){const done=Object.values(state.answers).filter(a=>a.done).length;$('work-progress').textContent=`${done} von 16 Arbeitsaufträgen als abgeschlossen markiert.`;}
  function renderTaskList(){
    $('path-filter').innerHTML=V.paths.map(p=>`<button type="button" data-path="${p.id}" aria-pressed="${p.id===path}"><span><i data-lucide="${p.icon}" aria-hidden="true"></i>${esc(p.title)}</span><small>${esc(p.subtitle)}</small></button>`).join('');
    $('path-filter').querySelectorAll('button').forEach(b=>b.onclick=()=>{path=b.dataset.path;const first=V.tasks.find(t=>t.path===path);location.hash='#arbeiten/'+first.id;});
    $('task-list').innerHTML=V.tasks.filter(t=>t.path===path).map(t=>`<button type="button" data-task="${t.id}" aria-current="${state.currentTask===t.id}">${String(V.tasks.indexOf(t)+1).padStart(2,'0')} / ${esc(t.title)}<small>${state.answers[t.id]?.done?'Abgeschlossen':state.answers[t.id]?.text?'In Arbeit':'Noch offen'}</small></button>`).join('');
    $('task-list').querySelectorAll('button').forEach(b=>b.onclick=()=>{location.hash='#arbeiten/'+b.dataset.task;});renderProgress();icons();
  }
  async function showExcerpt(t,index){
    const r=t.texts[index],box=$('task-excerpt');box.innerHTML='<p>Text wird geladen …</p>';
    try{const d=await getCorpus();if(state.currentTask!==t.id)return;let paras=[];
      if(r.work==='kohelet')paras=d.kohelet[r.unit-1].verses.filter(v=>Number(v.ref.split('.')[1])>=r.from&&Number(v.ref.split('.')[1])<=r.to).map(v=>`<p><span class="verse-number">${v.ref.replace('.',',')}</span>${esc(v.de)}</p>`);
      else{const p=d.gregor[r.unit-1].chunks.flatMap(c=>c.de).find(p=>fold(p.text).includes(fold(r.anchor)));paras=[`<p>${esc(p?.text||'Die Stelle steht im vollständigen Text.')}</p>`];}
      box.innerHTML=`<h4>${esc(r.label)} · eigene deutsche Arbeitsübersetzung</h4>${paras.join('')}<button type="button" id="excerpt-full">Im vollständigen Text lesen <i data-lucide="arrow-up-right" aria-hidden="true"></i></button>`;$('excerpt-full').onclick=()=>readPassage(r);icons();box.focus();
    }catch(e){box.textContent=e.message;}
  }
  function renderTask(){
    const t=V.tasks.find(t=>t.id===state.currentTask),a=state.answers[t.id]||C.blankAnswer();path=t.path;renderTaskList();
    const idx=V.tasks.indexOf(t),supp=V.supplements[t.supplement];
    $('task-workspace').innerHTML=`<p class="eyebrow">Arbeitsauftrag ${String(idx+1).padStart(2,'0')} · ${V.paths.find(p=>p.id===t.path).title}</p><h2 tabindex="-1" id="task-title">${esc(t.title)}</h2><p class="task-meta">${esc(t.time)} · Einzelarbeit, dann Austausch</p><h3>Diese Texte brauchst du</h3><div class="task-material">${t.texts.map((r,i)=>`<button type="button" data-excerpt="${i}"><i data-lucide="book-open-text" aria-hidden="true"></i>${esc(r.label)}</button>`).join('')}${t.essay?`<a class="button" href="#gespraech/${t.essay}">Passender Begleittext</a>`:''}</div><div id="task-excerpt" class="task-excerpt" tabindex="-1"></div>${supp?`<aside class="supplement"><h3>${esc(supp.title)}</h3><p>${esc(supp.text)}</p><div class="source-line">${sourceLinks(supp.sources)}</div></aside>`:''}<h3>Dein Arbeitsweg</h3><ol class="task-steps">${t.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p class="product"><strong>Dein Ergebnis:</strong> ${esc(t.product)}</p><details><summary>Eine Hilfe zum Weiterdenken</summary><p>${esc(t.hint)}</p></details><h3>Deine Notizen und dein Text</h3><label class="task-draft-label" for="task-draft">Belege, Gedanken und überarbeitetes Urteil</label><textarea id="task-draft" maxlength="20000" placeholder="Beginne mit einer Beobachtung am Text. Nenne die Stelle und erkläre, was sie für deine Frage bedeutet. Keine persönlichen Angaben erforderlich."></textarea><div class="draft-meta"><span id="draft-save">Notizen bleiben lokal.</span><span id="draft-count">0 Zeichen</span></div><h3>Prüfe deine Arbeit</h3>${t.checks.map((s,i)=>`<label class="check-label"><input type="checkbox" data-check="${i}" ${a.checks.includes(i)?'checked':''}><span>${esc(s)}</span></label>`).join('')}<details id="comparison"><summary>Nach eigener Bearbeitung: eine mögliche Vergleichsrichtung</summary><p>${esc(t.comparison)}</p><p class="small">Dies ist keine einzige Mustermeinung. Andere Deutungen sind möglich, wenn sie sachgerecht am Text begründet werden.</p></details><label class="check-label complete-check"><input type="checkbox" id="task-done" ${a.done?'checked':''}><span>Ich habe diesen Arbeitsauftrag bearbeitet und meine Argumentation geprüft.</span></label><nav class="work-pagination" aria-label="Arbeitsaufträge blättern"><button type="button" id="task-previous" ${idx===0?'disabled':''}><i data-lucide="arrow-left" aria-hidden="true"></i>Vorheriger Auftrag</button><button type="button" id="task-next" ${idx===V.tasks.length-1?'disabled':''}>Nächster Auftrag<i data-lucide="arrow-right" aria-hidden="true"></i></button></nav>`;
    const draft=$('task-draft');draft.value=a.text;$('draft-count').textContent=a.text.length+' Zeichen';
    draft.oninput=()=>{answer().text=draft.value;$('draft-count').textContent=draft.value.length+' Zeichen';save();renderProgress();};
    $('task-workspace').querySelectorAll('[data-check]').forEach(b=>b.onchange=()=>{const ans=answer(),n=Number(b.dataset.check);ans.checks=b.checked?[...new Set([...ans.checks,n])]:ans.checks.filter(x=>x!==n);save();});
    $('task-done').onchange=e=>{answer().done=e.target.checked;save();renderTaskList();};
    $('task-workspace').querySelectorAll('[data-excerpt]').forEach(b=>b.onclick=()=>showExcerpt(t,Number(b.dataset.excerpt)));
    $('task-previous').onclick=()=>location.hash='#arbeiten/'+V.tasks[idx-1].id;$('task-next').onclick=()=>location.hash='#arbeiten/'+V.tasks[idx+1].id;icons();
  }

  function download(name,text,type){const blob=new Blob([text],{type:type||'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const exportAnswers=()=>download('kohelet-gregor-meine-texte.txt',C.answerText(state,V.tasks));
  $('answers-export').onclick=exportAnswers;$('answers-export-dialog').onclick=exportAnswers;$('backup-export').onclick=()=>download('kohelet-gregor-sicherung.json',JSON.stringify(C.backup(state),null,2),'application/json');
  $('backup-import').onclick=()=>$('backup-file').click();
  $('backup-file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{if(f.size>1024*1024)throw Error('Die Sicherung ist zu groß.');pendingImport=C.restore(JSON.parse(await f.text()));$('save-dialog').close();open('import-dialog');}catch(err){pendingImport=null;$('import-status').textContent=err.message||'Die Datei ist keine lesbare Sicherung.';}};
  $('import-confirm').onclick=()=>{if(!pendingImport)return;state=C.validate(pendingImport);pendingImport=null;saveBlocked=false;$('save-status').hidden=true;save();$('import-dialog').close();route();};
  $('reset-confirm').onclick=()=>{try{localStorage.removeItem(KEY);if(localStorage.getItem(KEY)!==null)throw Error();}catch{notify('Der gespeicherte Arbeitsstand konnte nicht gelöscht werden. Der Reset wurde nicht ausgeführt.');return;}state=C.fresh();saveBlocked=false;$('save-status').hidden=true;save();$('reset-dialog').close();location.hash='#anfang';route();};

  const slides=[...V.slides.map(([title,text,visual])=>({title,text,visual})),...V.tasks.map(t=>({title:t.title,task:t,visual:V.paths.findIndex(p=>p.id===t.path)===2?'scale':'evidence'}))];
  $('slide-select').innerHTML=slides.map((s,i)=>`<option value="${i}">${i+1}. ${esc(s.title)}</option>`).join('');
  function renderSlide(){state.slide=Math.min(slides.length-1,Math.max(0,state.slide));const s=slides[state.slide];$('slide-select').value=state.slide;$('slide-count').textContent=`${state.slide+1} / ${slides.length}`;$('slide-previous').disabled=state.slide===0;$('slide-next').disabled=state.slide===slides.length-1;$('slide').className='slide'+(s.task?' slide-task':'');
    $('slide').innerHTML=`<div class="slide-copy"><p class="eyebrow">${s.task?'Textarbeit · '+V.paths.find(p=>p.id===s.task.path).title:'Kohelet & Gregor · Einführung'}</p><h2>${esc(s.title)}</h2>${s.task?`<p class="slide-texts">${s.task.texts.map(r=>esc(r.label)).join(' · ')}</p><ol>${s.task.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><p class="slide-product"><strong>Ergebnis:</strong> ${esc(s.task.product)}</p>`:`<p>${esc(s.text)}</p>`}</div><div class="slide-visual">${visual(s.visual)}</div>`;
    $('slide').scrollTop=0;save();
  }
  function presentationOpen(){renderSlide();open('presentation');}
  $('presentation-open').onclick=presentationOpen;$('presentation-teaser-open').onclick=presentationOpen;
  $('slide-previous').onclick=()=>{if(state.slide>0){state.slide--;renderSlide();}};$('slide-next').onclick=()=>{if(state.slide<slides.length-1){state.slide++;renderSlide();}};
  $('slide-select').onchange=e=>{state.slide=Number(e.target.value);renderSlide();};
  $('fullscreen-open').onclick=async()=>{try{await $('presentation-stage').requestFullscreen();}catch{notify('Der Browser erlaubt Vollbild hier nicht. Die Präsentation bleibt im Fenster bedienbar.');}};
  $('presentation-close').onclick=async()=>{if(document.fullscreenElement)await document.exitFullscreen();$('presentation').close();};
  $('presentation').addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();$('slide-next').click();}if(e.key==='ArrowLeft'){e.preventDefault();$('slide-previous').click();}});
  $('presentation').addEventListener('cancel',e=>{if(document.fullscreenElement){e.preventDefault();document.exitFullscreen();}});
  function route(){
    const keepFocus=Boolean(pendingFocus);
    const parts=location.hash.slice(1).split('/'),section=['anfang','lesen','arbeiten','gespraech','material','uebersetzungen'].includes(parts[0])?parts[0]:'anfang',mainSection=section==='uebersetzungen'?'anfang':section;
    ['anfang','lesen','arbeiten','gespraech','material'].forEach(id=>$(id).hidden=id!==mainSection);
    document.querySelectorAll('.chapter-nav a').forEach(a=>a.setAttribute('aria-current',a.hash==='#'+mainSection?'page':'false'));
    if(mainSection==='lesen'){
      if(['kohelet','gregor'].includes(parts[1])){state.reading.work=parts[1];const n=Number(parts[2]);state.reading.unit=Number.isInteger(n)&&n>=1&&n<=(parts[1]==='kohelet'?12:8)?n:1;save();}renderReader();
    }
    if(mainSection==='arbeiten'){if(V.tasks.some(t=>t.id===parts[1]))state.currentTask=parts[1];save();renderTask();}
    requestAnimationFrame(()=>{
      const target=section==='uebersetzungen'?$('uebersetzungen'):mainSection==='gespraech'&&V.essay.some(s=>s.id===parts[1])?$('essay-'+parts[1]):$(mainSection);
      if(!keepFocus)target.scrollIntoView({block:'start',behavior:'instant'});
    });icons();
  }
  window.addEventListener('hashchange',route);
  let scrollQueued=false;window.addEventListener('scroll',()=>{if(scrollQueued)return;scrollQueued=true;requestAnimationFrame(()=>{scrollQueued=false;document.documentElement.style.setProperty('--depth-shift',view.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches?`${Math.min(240,scrollY*.06)}px`:'0px');});},{passive:true});
  applyView();route();icons();
})();

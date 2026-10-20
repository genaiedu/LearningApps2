(() => {
  'use strict';
  const C=window.KraefteCore,V=window.KraefteContent,$=id=>document.getElementById(id),esc=V.esc;
  const STATE_KEY='kraefte-labor:round:v1',VIEW_KEY='kraefte-labor:view:v1';
  const modeNames={single:'Eine Feder',series:'In Reihe',parallel:'Parallel'},modeMarkers={single:'○',series:'□',parallel:'△'};
  const randomSeed=()=>{try{return crypto.getRandomValues(new Uint32Array(1))[0]||1;}catch{return(Date.now()^Math.floor(Math.random()*0xffffffff))>>>0||1;}};
  const fresh=seed=>({version:C.VERSION,seed,current:0,slide:0,results:{},lab:{mass:0,mode:'single',records:[]},badges:[]});
  let state=fresh(randomSeed()),view={palette:'graphite',theme:'light',motion:true,scale:100},toastTimer,mathQueue=Promise.resolve(),labMathTimer,mediaAllowed=false,started=false;
  try{
    const saved=JSON.parse(localStorage.getItem(STATE_KEY));
    if(saved?.version===C.VERSION&&Number.isInteger(saved.seed)&&saved.seed>0&&saved.seed<=0xffffffff){
      state=fresh(saved.seed);state.current=Math.max(0,Math.min(9,Number(saved.current)||0));state.slide=Math.max(0,Number(saved.slide)||0);
      if(saved.results&&typeof saved.results==='object')state.results=saved.results;
      if(saved.lab){state.lab.mass=Math.max(0,Math.min(30,Math.round(Number(saved.lab.mass)||0)));if(modeNames[saved.lab.mode])state.lab.mode=saved.lab.mode;
        if(Array.isArray(saved.lab.records)){const map=new Map();for(const r of saved.lab.records.slice(0,200)){try{const p=C.springState(r.massGrams,r.mode);map.set(r.mode+':'+r.massGrams,p);}catch{}}state.lab.records=[...map.values()];}}
      if(Array.isArray(saved.badges))state.badges=saved.badges.filter(x=>typeof x==='string').slice(0,6);
    }
    const savedView=JSON.parse(localStorage.getItem(VIEW_KEY));
    if(['graphite','atelier','slate','plum','bordeaux'].includes(savedView?.palette))view.palette=savedView.palette;
    if(['light','dark'].includes(savedView?.theme))view.theme=savedView.theme;
    if(typeof savedView?.motion==='boolean')view.motion=savedView.motion;
    if(Number.isFinite(savedView?.scale))view.scale=Math.min(120,Math.max(90,savedView.scale));
  }catch{}
  let tasks=C.round(state.seed),slides=V.createSlides(tasks);C.validate(tasks);
  tasks.forEach(t=>{const r=state.results[t.id];if(!r||!['open','correct','solved'].includes(r.status)||!Number.isInteger(r.attempts)||r.attempts<0||r.attempts>2)delete state.results[t.id];});
  const save=()=>{try{localStorage.setItem(STATE_KEY,JSON.stringify(state));}catch{}};
  const icons=()=>window.lucide?.createIcons();
  function typeset(element){
    if(!window.MathJax?.startup?.promise)return;
    mathQueue=mathQueue.catch(()=>{}).then(()=>MathJax.startup.promise).then(()=>{if(element.isConnected)return MathJax.typesetPromise([element]);}).catch(()=>{element.dataset.mathError='true';});
  }
  function fill(element,html){window.MathJax?.typesetClear?.([element]);element.innerHTML=html;typeset(element);hydrateMedia(element);}
  function animate(element){element.classList.remove('entering');if(view.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches){void element.offsetWidth;element.classList.add('entering');}}
  function applyView(){
    Object.assign(document.documentElement.dataset,{palette:view.palette,theme:view.theme,motion:String(view.motion)});
    document.documentElement.style.setProperty('--text-scale',String(view.scale/100));
    $('palette').value=view.palette;$('motion').checked=view.motion;$('text-scale').value=String(view.scale);$('text-scale-value').value=view.scale+' %';
    document.querySelectorAll('[name=theme]').forEach(r=>r.checked=r.value===view.theme);
    try{localStorage.setItem(VIEW_KEY,JSON.stringify(view));}catch{}
  }
  function openDialog(id){const d=$(id);if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');typeset(d);}
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
  $('view-open').onclick=()=>openDialog('view-dialog');$('formula-open').onclick=()=>openDialog('formula-dialog');$('sources-open').onclick=()=>openDialog('sources-dialog');
  $('palette').onchange=()=>{view.palette=$('palette').value;applyView();};document.querySelectorAll('[name=theme]').forEach(r=>r.onchange=()=>{view.theme=r.value;applyView();});
  $('motion').onchange=()=>{view.motion=$('motion').checked;applyView();};$('text-scale').oninput=()=>{view.scale=Number($('text-scale').value);applyView();};

  function hydrateMedia(root){
    root.querySelectorAll('[data-photo]').forEach(figure=>{
      const frame=figure.querySelector('.media-frame'),placeholder=frame.querySelector('.media-placeholder'),m=V.media[figure.dataset.photo];
      if(!m)return;
      if(!mediaAllowed){const image=frame.querySelector('img');if(image){image.onload=null;image.onerror=null;image.removeAttribute('src');image.remove();}placeholder.hidden=false;return;}
      if(frame.querySelector('img'))return;
      const image=new Image();image.alt=m.alt;image.crossOrigin='anonymous';image.referrerPolicy='no-referrer';image.decoding='async';image.loading=figure.closest('#presentation')?'eager':'lazy';
      image.onload=()=>{if(mediaAllowed&&image.isConnected)placeholder.hidden=true;};
      image.onerror=()=>{image.remove();placeholder.hidden=false;placeholder.textContent='Das Bild konnte nicht geladen werden. Die Bildquelle unten bleibt erreichbar.';};
      image.src='https://upload.wikimedia.org/wikipedia/commons/thumb/'+m.path+'/960px-'+m.path.split('/').at(-1);frame.append(image);
    });
  }
  function setMediaAllowed(allowed){
    const wasAllowed=mediaAllowed;mediaAllowed=allowed;hydrateMedia(document);
    $('media-toggle').textContent=mediaAllowed?'Bilder wieder ausschalten':'Bilder für diesen Besuch laden';$('media-toggle').setAttribute('aria-pressed',String(mediaAllowed));
    $('media-status').textContent=mediaAllowed?'Bilder sind für diesen Besuch freigegeben. Weitere Fotos laden beim Anzeigen.':wasAllowed?'Externe Bilder sind ausgeschaltet. Bereits erfolgte Übertragungen lassen sich nicht rückgängig machen.':'Externe Bilder sind ausgeschaltet.';
  }
  $('media-toggle').onclick=()=>setMediaAllowed(!mediaAllowed);
  function startApp(withImages){
    if(started)return;started=true;
    $('entry-screen').hidden=true;$('app-shell').hidden=false;$('app-shell').removeAttribute('inert');setMediaAllowed(withImages);animate($('anfang'));
    requestAnimationFrame(()=>{
      let target;try{target=document.getElementById(decodeURIComponent(location.hash.slice(1)));}catch{}
      const focusTarget=target?.querySelector('h1,h2')||document.querySelector('#anfang h1');focusTarget.setAttribute('tabindex','-1');focusTarget.focus({preventScroll:true});
      if(target)target.scrollIntoView({behavior:'instant',block:'start'});else window.scrollTo({top:0,behavior:'instant'});
    });
  }
  $('start-without-images').onclick=()=>startApp(false);$('start-with-images').onclick=()=>startApp(true);

  function renderSlide(){
    state.slide=Math.max(0,Math.min(slides.length-1,state.slide));const s=slides[state.slide];
    fill($('slide'),'<p class="eyebrow">'+esc(s.tag)+'</p><h3>'+esc(s.title)+'</h3>'+s.html);
    $('slide-position').textContent=(state.slide+1)+' / '+slides.length;$('slide-prev').disabled=state.slide===0;$('slide-next').disabled=state.slide===slides.length-1;
    $('slide-select').value=String(state.slide);animate($('slide'));save();
  }
  function slideOptions(){$('slide-select').innerHTML=slides.map((s,i)=>'<option value="'+i+'">'+(i+1)+' · '+esc(s.title)+'</option>').join('');}
  $('slide-prev').onclick=()=>{state.slide--;renderSlide();};$('slide-next').onclick=()=>{state.slide++;renderSlide();};
  $('slide-select').onchange=()=>{state.slide=Number($('slide-select').value);renderSlide();};
  $('presentation-fullscreen').onclick=async()=>{
    const p=$('presentation');
    try{if(p.requestFullscreen)await p.requestFullscreen();else throw new Error('unsupported');}
    catch{p.classList.add('is-fullscreen');document.body.style.overflow='hidden';$('fullscreen-message').textContent='Dein Browser unterstützt hier kein echtes Vollbild. Die Präsentation füllt stattdessen das Fenster. Mit Esc zurück.';}
  };
  function presentationActive(){return document.fullscreenElement===$('presentation')||$('presentation').classList.contains('is-fullscreen');}
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&document.fullscreenElement===$('presentation')){document.exitFullscreen?.().catch(()=>{});return;}
    if(e.key==='Escape'&&$('presentation').classList.contains('is-fullscreen')){$('presentation').classList.remove('is-fullscreen');document.body.style.overflow='';return;}
    if(!presentationActive()||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName))return;
    if(e.key==='ArrowRight'&&state.slide<slides.length-1){e.preventDefault();state.slide++;renderSlide();}
    if(e.key==='ArrowLeft'&&state.slide>0){e.preventDefault();state.slide--;renderSlide();}
  });

  function springPath(x,y,length){
    const top=y+12,bottom=y+length-12,steps=160;let p='M'+x+','+y+'L'+x+','+top;
    for(let i=1;i<=steps;i++){const h=i/steps;p+='L'+(x+Math.sin(h*Math.PI*16)*23).toFixed(2)+','+(top+(bottom-top)*h).toFixed(2);}
    return p+'L'+x+','+(y+length);
  }
  function springGraphic(snapshot,hero=false){
    const {mode,massGrams,extension,restLength}=snapshot,scale=1.15,top=55,x=220,L=(restLength+extension)*1000*scale,zero=top+restLength*1000*scale,end=top+L;
    let body='<path d="M75 30H395M100 30V545M55 545H150" class="scene-line" stroke-width="3"/>';
    body+='<path d="M'+x+' 30V55" class="scene-line" stroke-width="2"/>';
    if(mode==='single')body+='<path d="'+springPath(x,top,L)+'" class="spring-path"/>';
    if(mode==='series')body+='<path d="'+springPath(x,top,L/2)+'" class="spring-path"/><circle cx="'+x+'" cy="'+(top+L/2)+'" r="4" class="scene-surface"/><path d="'+springPath(x,top+L/2,L/2)+'" class="spring-path spring-secondary"/>';
    if(mode==='parallel')body+='<path d="M175 55H265M175 '+end+'H265" class="scene-line" stroke-width="3"/><path d="'+springPath(175,top,L)+'" class="spring-path"/><path d="'+springPath(265,top,L)+'" class="spring-path spring-secondary"/>';
    body+='<path d="M'+x+' '+end+'v16" class="scene-line" stroke-width="2"/>';
    if(massGrams>0){
      body+='<rect x="'+(x-38)+'" y="'+(end+16)+'" width="76" height="42" rx="4" class="scene-surface"/><text x="'+x+'" y="'+(end+43)+'" text-anchor="middle" class="apparatus-label">'+massGrams+' g</text>';
      body+='<path d="M290 '+(end+34)+'v57l-6-10m6 10 6-10" fill="none" stroke="var(--red)" stroke-width="2.5"/><text x="302" y="'+(end+75)+'" class="apparatus-label">F<tspan baseline-shift="sub">G</tspan></text>';
      body+='<path d="M155 '+(end+38)+'v-57l-6 10m6-10 6 10" fill="none" stroke="var(--ink)" stroke-width="2.5"/><text x="118" y="'+(end+5)+'" class="apparatus-label">F<tspan baseline-shift="sub">F</tspan></text>';
    }else body+='<circle cx="'+x+'" cy="'+(end+19)+'" r="4" class="scene-line"/>';
    if(!hero){
      body+='<path d="M325 '+zero+'h95M365 '+(zero-10)+'V'+(zero+150*scale)+'" class="scene-muted-line" stroke-dasharray="4 4"/><text x="375" y="'+(zero-20)+'" class="apparatus-label">S / mm</text>';
      for(let mm=0;mm<=140;mm+=10){const y=zero+mm*scale;body+='<path d="M358 '+y+'h12" class="scene-line"/><text x="380" y="'+(y+4)+'" class="apparatus-label">'+mm+'</text>';}
      body+='<path d="M325 '+zero+'v'+(extension*1000*scale)+'" stroke="var(--red)" stroke-width="2"/><path d="M318 '+end+'h47" class="scene-muted-line"/>';
    }
    return body;
  }
  function plot(){
    const left=65,top=22,w=475,h=280,maxS=.12,maxF=.3;
    let s='<path d="M'+left+' '+top+'V'+(top+h)+'H'+(left+w)+'" class="plot-line"/>';
    for(let i=0;i<=6;i++){const x=left+i*w/6;s+='<path d="M'+x+' '+(top+h)+'v5" class="plot-line"/><text x="'+x+'" y="'+(top+h+24)+'" text-anchor="middle" class="plot-text">'+C.n(i*.02,2)+'</text>';}
    for(let i=0;i<=3;i++){const y=top+h-i*h/3;s+='<path d="M'+left+' '+y+'H'+(left+w)+'" class="scene-muted-line"/><text x="'+(left-12)+'" y="'+(y+4)+'" text-anchor="end" class="plot-text">'+C.n(i*.1,1)+'</text>';}
    s+='<text x="12" y="16" class="plot-text">F / N</text><text x="'+(left+w)+'" y="355" text-anchor="end" class="plot-text">S / m</text>';
    Object.keys(modeNames).forEach(mode=>{
      const points=state.lab.records.filter(p=>p.mode===mode),D=C.fit(points);
      if(D){const last=Math.max(...points.map(p=>p.extension));s+='<path d="M'+left+' '+(top+h)+'L'+(left+last/maxS*w)+' '+(top+h-D*last/maxF*h)+'" class="plot-line"'+(mode==='series'?' stroke-dasharray="5 4"':mode==='parallel'?' stroke-dasharray="2 3"':'')+'/>';}
      points.forEach(p=>{const x=left+p.extension/maxS*w,y=top+h-p.force/maxF*h;if(mode==='single')s+='<circle cx="'+x+'" cy="'+y+'" r="4" class="plot-mark"/>';if(mode==='series')s+='<rect x="'+(x-4)+'" y="'+(y-4)+'" width="8" height="8" class="plot-mark"/>';if(mode==='parallel')s+='<polygon points="'+x+','+(y-5)+' '+(x-5)+','+(y+4)+' '+(x+5)+','+(y+4)+'" class="plot-mark"/>';});
    });
    $('spring-plot').innerHTML=s;
  }
  function renderMeasurements(){
    const sorted=state.lab.records.slice().sort((a,b)=>Object.keys(modeNames).indexOf(a.mode)-Object.keys(modeNames).indexOf(b.mode)||a.massGrams-b.massGrams);
    $('measurements').innerHTML=sorted.length?sorted.map(p=>'<tr><td>'+modeMarkers[p.mode]+' '+modeNames[p.mode]+'</td><td>'+C.n(p.mass,3)+'</td><td>'+C.n(p.force,5)+'</td><td>'+C.n(p.extension,6)+'</td></tr>').join(''):'<tr><td colspan="4">Noch keine Messwerte übernommen.</td></tr>';
    plot();const fits=Object.keys(modeNames).map(mode=>({mode,D:C.fit(state.lab.records.filter(p=>p.mode===mode))})).filter(f=>f.D!==null);
    fill($('fit-results'),fits.length?'<p>Steigungen der Ausgleichsgeraden durch den Ursprung (ideales Modell):</p>'+fits.map(f=>V.math('D_{\\mathrm{'+(f.mode==='single'?'einzeln':f.mode==='series'?'Reihe':'parallel')+'}}='+C.tn(f.D)+'\\,\\mathrm{N/m}')).join(''):'<p>Übernimm je Anordnung mindestens zwei verschiedene, von null verschiedene Belastungen. Dann erscheint ihre aus den Messpunkten bestimmte Steigung.</p>');
    $('measure-clear').disabled=!sorted.length;
  }
  function renderLab(){
    const s=C.springState(state.lab.mass,state.lab.mode);$('mass-value').value=s.massGrams+' g';$('mass-range').value=String(s.massGrams);
    $('mass-less').disabled=s.massGrams===0;$('mass-more').disabled=s.massGrams===30;
    $('force-value').textContent=C.n(s.force,5)+' N';$('extension-value').textContent=C.n(s.extension,6)+' m';
    $('spring-scene').innerHTML=springGraphic(s);$('spring-caption').textContent=modeNames[s.mode]+' · Verlängerung '+C.n(s.extension*1000,2)+' mm gegenüber der unbelasteten Referenz';
    document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===s.mode)));
    clearTimeout(labMathTimer);labMathTimer=setTimeout(()=>fill($('live-calculation'),V.math('F_{\\mathrm G}='+C.tn(s.mass)+'\\,\\mathrm{kg}\\cdot9{,}81\\,\\mathrm{N/kg}')+V.math('S=\\frac{F_{\\mathrm G}}{D_{\\mathrm{ges}}}=\\frac{'+C.tn(s.force)+'\\,\\mathrm N}{'+C.tn(s.D)+'\\,\\mathrm{N/m}}')),120);
    save();
  }
  function setMass(m){state.lab.mass=Math.max(0,Math.min(30,Math.round(Number(m)||0)));$('measure-feedback').textContent='';renderLab();}
  $('mass-range').oninput=()=>setMass($('mass-range').value);$('mass-less').onclick=()=>setMass(state.lab.mass-1);$('mass-more').onclick=()=>setMass(state.lab.mass+1);
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.lab.mode=b.dataset.mode;$('measure-feedback').textContent='';renderLab();});
  $('measure').onclick=()=>{const p=C.springState(state.lab.mass,state.lab.mode),i=state.lab.records.findIndex(x=>x.massGrams===p.massGrams&&x.mode===p.mode);if(i<0)state.lab.records.push(p);else state.lab.records[i]=p;$('measure-feedback').textContent=modeNames[p.mode]+': '+p.massGrams+' g übernommen.';renderMeasurements();awardBadges();save();};
  $('measure-clear').onclick=()=>{state.lab.records=[];renderMeasurements();$('measure-feedback').textContent='Die Simulationsmesswerte wurden gelöscht.';save();};

  function result(task){return state.results[task.id]||{attempts:0,status:'open',points:0,lastAnswer:'',unit:C.units[task.dimension]?.[0][0]};}
  const terminal=r=>r.status!=='open';
  function stats(){const all=tasks.map(result);return{points:all.reduce((s,r)=>s+(Number(r.points)||0),0),done:all.filter(terminal).length,correct:all.filter(r=>r.status==='correct').length};}
  const badgeDefs=[
    {id:'newton',title:'Newton-Blick',icon:'move',text:'Die beiden Einstiegsaufgaben richtig lösen.',test:()=>tasks.filter(t=>t.level===1).every(t=>result(t).status==='correct')},
    {id:'si',title:'SI-sicher',icon:'ruler',text:'Beide Grundrechenaufgaben richtig lösen.',test:()=>tasks.filter(t=>t.level===2).every(t=>result(t).status==='correct')},
    {id:'feder',title:'Federforscher',icon:'flask-conical',text:'Je drei verschiedene Belastungen in allen drei Anordnungen protokollieren.',test:()=>Object.keys(modeNames).every(mode=>new Set(state.lab.records.filter(p=>p.mode===mode&&p.massGrams>0).map(p=>p.massGrams)).size>=3)},
    {id:'hooke',title:'Hooke verstanden',icon:'chart-no-axes-combined',text:'Beide Aufgaben zur Einzelfeder richtig lösen.',test:()=>tasks.filter(t=>t.level===3).every(t=>result(t).status==='correct')},
    {id:'kombination',title:'Gut kombiniert',icon:'git-merge',text:'Reihen- und Parallelaufgabe richtig lösen.',test:()=>tasks.filter(t=>t.level===4).every(t=>result(t).status==='correct')},
    {id:'runde',title:'Drangeblieben',icon:'award',text:'Alle zehn Aufgaben bearbeiten – auch aus Fehlern lernen zählt.',test:()=>stats().done===10}
  ];
  function renderBadges(){$('badges').innerHTML=badgeDefs.map(b=>'<article class="badge" data-earned="'+state.badges.includes(b.id)+'"><i data-lucide="'+b.icon+'" aria-hidden="true"></i><div><strong>'+esc(b.title)+'</strong><small>'+(state.badges.includes(b.id)?'Erreicht. ':'Noch offen: ')+esc(b.text)+'</small></div></article>').join('');icons();}
  function awardBadges(){
    const fresh=badgeDefs.filter(b=>!state.badges.includes(b.id)&&b.test());if(!fresh.length)return;
    fresh.forEach(b=>state.badges.push(b.id));clearTimeout(toastTimer);
    $('badge-toast').innerHTML='<i data-lucide="award" aria-hidden="true"></i><div><small>Abzeichen freigeschaltet</small><strong>'+fresh.map(b=>esc(b.title)).join(' · ')+'</strong></div>';$('badge-toast').hidden=false;icons();toastTimer=setTimeout(()=>$('badge-toast').hidden=true,4800);renderBadges();save();
  }
  function renderProgress(){
    const s=stats();$('score').textContent=C.n(s.points,1)+' / 10 Punkte';$('xp').textContent=C.n(s.points*20,0)+' XP';$('round-progress').textContent=s.done+' von 10 Aufgaben abgeschlossen'+(s.done===10?' · Runde geschafft.':'');
    $('training-progress').style.width=s.done*10+'%';$('training-progress').parentElement.setAttribute('aria-valuenow',String(s.done));
    $('task-nav').innerHTML=tasks.map((t,i)=>'<button type="button" data-task="'+i+'" data-status="'+result(t).status+'"'+(state.current===i?' aria-current="step"':'')+' aria-label="Aufgabe '+(i+1)+', Stufe '+t.level+', '+(terminal(result(t))?'abgeschlossen':'offen')+'">'+(i+1)+'</button>').join('');
    $('task-nav').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.current=Number(b.dataset.task);renderTask();save();});
  }
  function renderTask(){
    const task=tasks[state.current],r=result(task),done=terminal(r);renderProgress();
    let answer='';
    if(task.type==='choice')answer='<fieldset class="task-choices"><legend class="sr-only">Wähle eine Antwort</legend>'+task.options.map((option,i)=>'<label><input type="radio" name="choice" value="'+i+'"'+(r.lastAnswer===String(i)?' checked':'')+(done?' disabled':'')+'>'+esc(option)+'</label>').join('')+'</fieldset>';
    else answer='<div class="answer-row"><label for="answer-number">Zahlenwert<input id="answer-number" name="answer" type="text" inputmode="decimal" autocomplete="off" value="'+esc(r.lastAnswer||'')+'"'+(done?' disabled':'')+' aria-describedby="answer-format answer-note"></label><label for="answer-unit">Einheit<select id="answer-unit" name="unit"'+(done?' disabled':'')+'>'+C.units[task.dimension].map(u=>'<option value="'+esc(u[0])+'"'+(u[0]===r.unit?' selected':'')+'>'+esc(u[0])+'</option>').join('')+'</select></label></div><p class="small" id="answer-format" aria-live="polite"></p><p class="small" id="answer-note">Komma oder Punkt sind möglich. Rechne auf Papier in SI; die Eingabeeinheit darfst du wählen. Toleranz: ±2 %. Mehr Nachkommastellen sind erlaubt.</p>';
    const feedback=done?(r.status==='correct'?(r.attempts===1?'Richtig im ersten Versuch: 1 Punkt und 20 XP.':'Korrektur geschafft: 0,5 Punkte und 10 XP.'):'Zwei Versuche sind verbraucht. Vergleiche deinen Weg mit der Musterlösung.'):(r.attempts===1?'Noch nicht richtig. Du hast einen zweiten Versuch. Prüfe Formel, Umrechnung und Einheit.':'');
    const unitNote=task.type==='number'?'<p class="small">Für diese Runde gilt g ≈ 9,81 N/kg. Wenn eine Masse ruhig hängt, gilt Kräftegleichgewicht.</p>':'';
    fill($('task-card'),'<div class="task-meta"><p class="eyebrow">Aufgabe '+(state.current+1)+' · Stufe '+task.level+' / 5</p><span class="small">'+(done?'Abgeschlossen':(2-r.attempts)+' Versuche')+'</span></div><h3>'+esc(task.title)+'</h3><p class="task-prompt">'+esc(task.prompt)+'</p>'+unitNote+'<form class="answer-form" id="answer-form">'+answer+(!done?'<button class="primary" type="submit">Antwort prüfen</button>':'')+'</form><div class="task-tools"><button type="button" id="hint-open"'+(done?' disabled':'')+'>Hinweis ohne Ergebnis</button><button type="button" id="task-formulas">Formelsammlung</button></div><p class="task-feedback" id="task-feedback" role="status" data-tone="'+(done&&r.status==='correct'?'good':r.attempts?'bad':'')+'">'+esc(feedback)+'</p><div id="task-hint" class="task-hint" hidden></div>'+(done?'<h3 style="font-size:23px;margin-top:28px">Vollständige Musterlösung</h3>'+V.solution(task):'')+'<div class="task-bottom"><span class="small">Erster Versuch: 1 P · zweiter: 0,5 P</span><button type="button" id="task-next"'+(state.current===9?' disabled':'')+'>Nächste Aufgabe<i data-lucide="arrow-right" aria-hidden="true"></i></button></div>');
    if(task.type==='number'){
      const updateFormat=()=>{const format=C.answerFormat(task,$('answer-unit').value);$('answer-number').placeholder=format.example;$('answer-format').textContent=format.instruction;};
      $('answer-unit').onchange=updateFormat;updateFormat();
    }
    $('answer-form').onsubmit=e=>{
      e.preventDefault();if(done)return;const raw=task.type==='choice'?($('answer-form').querySelector('input[name=choice]:checked')?.value??''):$('answer-number').value;
      const unit=task.type==='number'?$('answer-unit').value:undefined,newResult=C.grade(task,raw,unit,r);
      if(newResult.invalid){$('task-feedback').textContent=task.type==='choice'?'Wähle erst eine Antwort. Dieser Klick zählt nicht als Versuch.':'Gib einen gültigen Zahlenwert ein. Komma und Punkt sind erlaubt. Dieser Klick zählt nicht als Versuch.';$('task-feedback').dataset.tone='bad';return;}
      state.results[task.id]=newResult;renderTask();awardBadges();save();if(newResult.status==='open')$('answer-number')?.focus();
    };
    let hints=0;$('hint-open').onclick=()=>{const h=$('task-hint');h.hidden=false;h.textContent=task.hints[Math.min(hints,task.hints.length-1)];hints++;};
    $('task-formulas').onclick=()=>openDialog('formula-dialog');$('task-next').onclick=()=>{if(state.current<9){state.current++;renderTask();save();$('task-card').scrollIntoView({behavior:view.motion?'smooth':'instant',block:'start'});}};
    icons();animate($('task-card'));
  }
  function resetRound(){
    let seed=randomSeed();if(seed===state.seed)seed=(seed+1)>>>0||1;state=fresh(seed);tasks=C.round(seed);C.validate(tasks);slides=V.createSlides(tasks);
    clearTimeout(toastTimer);$('badge-toast').hidden=true;slideOptions();renderSlide();renderLab();renderMeasurements();renderTask();renderBadges();save();
  }
  $('reset-open').onclick=()=>openDialog('reset-dialog');$('reset-confirm').onclick=()=>{$('reset-dialog').close();resetRound();$('praesentation').scrollIntoView({behavior:view.motion?'smooth':'instant',block:'start'});};

  applyView();fill($('knowledge'),V.knowledge());fill($('formula-content'),V.formulaHTML());$('example-prompt').textContent=C.example().prompt;fill($('example-solution'),V.solution(C.example()));
  $('example-rounding').textContent=C.answerFormat(C.example()).instruction;
  $('hero-spring').setAttribute('viewBox','70 15 340 390');$('hero-spring').innerHTML=springGraphic(C.springState(20),true);
  slideOptions();renderSlide();renderLab();renderMeasurements();renderTask();renderBadges();icons();typeset($('sources-dialog'));
  window.KraefteApp=Object.freeze({snapshot:()=>JSON.parse(JSON.stringify(state)),round:()=>tasks,slides:()=>slides,example:()=>C.example(),presentationActive,whenReady:()=>mathQueue});
  $('start-without-images').disabled=false;$('start-with-images').disabled=false;
  const focusEntry=()=>{if(!started){$('entry-title').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}};
  window.addEventListener('pageshow',focusEntry);requestAnimationFrame(focusEntry);
})();

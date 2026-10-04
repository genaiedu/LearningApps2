(function(){
  'use strict';
  const C=window.OrbitalCore,$=id=>document.getElementById(id);
  const atomViewer=new OrbitalViewer($('atom-canvas')),moViewer=new OrbitalViewer($('mo-canvas'));
  let element=C.bySymbol.C,mode='bohr',selectedAO='2px',molecule='H2',tub=true,levels=[],selectedMO='',motion=true;
  const storageKey='orbital-labor-research-v1';
  let progress={answers:{},explored:[]};
  try{const saved=JSON.parse(sessionStorage.getItem(storageKey));if(saved && saved.answers && Array.isArray(saved.explored))progress=saved;}catch(_){/* Private browsing can disallow storage. */}
  const kindNames={bonding:'bindend',antibonding:'antibindend',nonbonding:'nichtbindend'};
  const moleculeNames={H2:'Wasserstoff · H₂',He2:'Helium · He₂',N2:'Stickstoff · N₂',O2:'Sauerstoff · O₂',benzene:'Benzol · C₆H₆',cot:'Cyclooctatetraen · C₈H₈'};
  const arrows=count=>count===2?'↑↓':count===1?'↑':'—';
  const block=e=>e.group===18?'noble':e.transition?'d':'main';
  const button=(text,attributes={})=>{const b=document.createElement('button');b.type='button';b.textContent=text;for(const [key,value] of Object.entries(attributes))b.setAttribute(key,value);return b;};

  function buildPSE(){
    for(let group=1;group<=18;group++){const label=document.createElement('span');label.className='group-label';label.textContent=group;label.style.gridColumn=group+1;label.style.gridRow=1;$('periodic-table').append(label);}
    for(let period=1;period<=5;period++){const label=document.createElement('span');label.className='period-label';label.textContent=period;label.style.gridRow=period+1;label.style.gridColumn=1;$('periodic-table').append(label);}
    C.elements.forEach(e=>{
      const b=button('',{'aria-label':`${e.z} · ${e.name}, ${e.symbol}, Gruppe ${e.group}, Periode ${e.period}`,'aria-pressed':String(e===element)});
      b.className='pse-cell';b.dataset.symbol=e.symbol;b.dataset.block=block(e);b.style.gridColumn=e.group+1;b.style.gridRow=e.period+1;
      b.innerHTML=`<small>${e.z}</small><strong>${e.symbol}</strong><span>${e.name}</span>`;
      b.addEventListener('click',()=>{element=e;selectedAO=C.outerOrbitals(e).find(o=>o.type.startsWith('p'))?.id||C.outerOrbitals(e)[0].id;renderAtom();});
      $('periodic-table').append(b);
    });
  }
  function renderAtom(){
    document.querySelectorAll('.pse-cell').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.symbol===element.symbol)));
    $('element-card').innerHTML=`<div class="element-card-top"><div class="element-tile" data-block="${block(element)}"><small>${element.z}</small><strong>${element.symbol}</strong><span>${element.name}</span></div><div><h4>${element.name}</h4><p>Gruppe ${element.group} · Periode ${element.period}</p><p>${element.shells.join(' · ')} Elektronen auf den Schalen</p></div></div>`;
    $('atomic-config').innerHTML=C.order.filter(key=>element.config[key]>0).map(key=>`<span>${key}<sup>${element.config[key]}</sup></span>`).join(' ');
    const count=element.shells[element.outer-1];
    $('outer-info').innerHTML=`<b>Äußerste besetzte Schale: n = ${element.outer}</b><br>${count} Elektron${count===1?'':'en'} in dieser Schale.${element.transition?'<br>Die (n−1)d-Unterschale kann ebenfalls zur Bindung beitragen; sie ist nicht automatisch die äußerste Schale.':''}${element.symbol==='Pd'?'<br><b>Ausnahme Palladium:</b> 5s ist leer. Deshalb siehst du hier 4s, 4p und 4d, obwohl Pd in Periode 5 steht.':''}`;
    $('mode-bohr').setAttribute('aria-pressed',String(mode==='bohr'));$('mode-ao').setAttribute('aria-pressed',String(mode==='ao'));
    $('ao-controls').hidden=mode!=='ao';$('electron-motion').hidden=mode!=='bohr';
    $('atom-viewer').querySelectorAll('.ao-control').forEach(control=>control.hidden=mode!=='ao');
    if(mode==='bohr'){$('atom-viewer-title').textContent=`${element.symbol} · Schalenmodell`;atomViewer.shells(element);atomViewer.setMotion(motion);return;}
    const orbitals=C.outerOrbitals(element);
    if(!orbitals.some(o=>o.id===selectedAO))selectedAO=orbitals[0].id;
    $('orbital-boxes').replaceChildren();let shell=null,group;
    orbitals.forEach(o=>{
      if(o.subshell!==shell){shell=o.subshell;group=document.createElement('div');group.className='orbital-shell';group.setAttribute('aria-label',`${shell}-Unterschale`);$('orbital-boxes').append(group);}
      const b=button('',{'aria-pressed':String(o.id===selectedAO),'aria-label':`${o.id}: ${o.count} Elektronen. Orbital zeigen`});b.className='orbital-box';
      b.innerHTML=`<span>${arrows(o.count)}</span><small>${o.id.replace('dx2-y2','d(x²−y²)').replace('dz2','d(z²)')}</small>`;
      b.addEventListener('click',()=>{selectedAO=o.id;renderAtom();});group.append(b);
    });
    drawAO();
  }
  function drawAO(){
    if(mode!=='ao')return;
    const o=C.outerOrbitals(element).find(item=>item.id===selectedAO),radial=$('radial-nodes').checked;
    const threshold=Number($('ao-threshold').value)/(radial?1000:100);
    $('ao-threshold-label').textContent=`|ψ| = ${(threshold*100).toLocaleString('de-DE',{maximumFractionDigits:1})} % des maximalen Modellbetrags`;
    const l=o.type==='s'?0:o.type.startsWith('p')?1:2,nodes=o.n-l-1;
    $('ao-model-note').textContent=radial?`Wasserstoffähnliches Vergleichsmodell: ${nodes} Radialknoten und ${l} Winkelknoten. Mit „Schnittansicht“ werden innere Flächen sichtbar. Keine realen Atomradien oder angepasste Abschirmung.`:`Winkelform des ${o.id}-Orbitals: ${l} Winkelknoten. Seine ${nodes} Radialknoten sind in dieser vereinfachten Ansicht ausgeblendet. Die Größe ist zur Ansicht skaliert.`;
    $('atom-viewer-title').textContent=`${element.symbol} · ${o.id} · ${o.count} e⁻`;
    atomViewer.orbital({mode:'ao',n:o.n,type:o.type,radial,threshold,resolution:radial?73:65,extent:radial&&o.n===1?7.4:5.6});
  }
  $('mode-bohr').addEventListener('click',()=>{mode='bohr';renderAtom();});
  $('mode-ao').addEventListener('click',()=>{mode='ao';renderAtom();});
  $('electron-motion').addEventListener('click',()=>{motion=!motion;atomViewer.setMotion(motion);$('electron-motion').textContent=motion?'Bewegung anhalten':'Bewegung starten';$('electron-motion').setAttribute('aria-pressed',String(!motion));});
  $('radial-nodes').addEventListener('change',()=>{const radial=$('radial-nodes').checked;$('ao-threshold').min=radial?1:4;$('ao-threshold').max=radial?25:30;$('ao-threshold').value=radial?2:14;drawAO();});
  let aoTimer,moTimer;
  $('ao-threshold').addEventListener('input',()=>{clearTimeout(aoTimer);aoTimer=setTimeout(drawAO,160);});

  function selectMolecule(key){
    molecule=key;levels=C.levelsFor(key,tub);
    // Start O₂ with the visibly singly occupied π* level, all other cases with a filled bonding level.
    selectedMO=(key==='O2'?levels.find(o=>o.id==='px-'):levels[0]).id;
    document.querySelectorAll('[data-molecule]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.molecule===key)));
    $('cot-controls').hidden=key!=='cot';$('cot-tub').setAttribute('aria-pressed',String(tub));$('cot-planar').setAttribute('aria-pressed',String(!tub));
    $('molecule-title').textContent=moleculeNames[key];
    renderMO();
    if(!progress.explored.includes(key))progress.explored.push(key);saveProgress();
  }
  function renderMO(){
    $('energy-diagram').replaceChildren();
    const rows=[];
    [...levels].reverse().forEach(level=>{let row=rows[rows.length-1];if(!row || Math.abs(row.energy-level.energy)>1e-7){row={energy:level.energy,levels:[]};rows.push(row);}row.levels.unshift(level);});
    rows.forEach(row=>{const group=document.createElement('div');group.className='energy-row';row.levels.forEach(level=>{
      const b=button('',{'aria-pressed':String(level.id===selectedMO),'aria-label':`${level.label}, ${kindNames[level.kind]}, ${level.count} Elektronen. In 3D zeigen`});b.className=`energy-orbital ${level.kind}`;b.dataset.level=level.id;
      b.innerHTML=`<span class="arrows">${arrows(level.count)}</span><small>${level.label}</small>`;b.addEventListener('click',()=>{selectedMO=level.id;renderMO();});group.append(b);
    });$('energy-diagram').append(group);});
    $('mo-config').innerHTML='<b>Besetzung · anklickbar:</b>';
    levels.forEach(level=>{const b=button('',{'aria-pressed':String(level.id===selectedMO),'aria-label':`${level.label} mit ${level.count} Elektronen zeigen`});b.dataset.level=level.id;b.className=level.id===selectedMO?'selected':'';b.innerHTML=`${level.label}<sup>${level.count}</sup>`;b.addEventListener('click',()=>{selectedMO=level.id;renderMO();});$('mo-config').append(b,' ');});
    const unpaired=levels.filter(o=>o.count===1).length,ring=molecule==='benzene'||molecule==='cot';
    if(ring)$('mo-summary').innerHTML=`<p><b>${molecule==='benzene'?6:8} π-Elektronen · ${levels.length} π-MO</b></p><p>${unpaired} ungepaarte Elektronen im ${molecule==='cot'?(tub?'qualitativen Wannenmodell':'idealen planaren Vergleich'):'Hückel-Modell'}.</p><p>${molecule==='benzene'?'Planar · aromatisch':tub?'Nicht planar · nicht aromatisch':'Hypothetisch planar · antiaromatischer 4n-Vergleich'}</p>`;
    else{const bonding=levels.filter(o=>o.kind==='bonding').reduce((a,b)=>a+b.count,0),anti=levels.filter(o=>o.kind==='antibonding').reduce((a,b)=>a+b.count,0);$('mo-summary').innerHTML=`<p><b>Bindungsordnung: (${bonding} − ${anti}) / 2 = ${C.bondOrder(levels)}</b></p><p>${unpaired} ungepaarte Elektronen${molecule==='O2'?' · Biradikal · Triplett-Grundzustand':''}.</p>`;}
    const level=levels.find(o=>o.id===selectedMO);
    $('mo-viewer-title').textContent=`${level.label} · ${kindNames[level.kind]} · ${level.count} e⁻`;
    const explanations={
      H2:['Eine gemeinsame Bindung','Beide Elektronen besetzen das energieärmere σ1s-MO. Zwischen den Kernen verstärken sich die gleichphasigen 1s-Anteile. Das σ*1s-MO bleibt leer. Eine besetzte bindende Kombination und keine besetzte antibindende Kombination ergeben Bindungsordnung 1.'],
      He2:['Warum die kovalente Bindung ausbleibt','Vier Elektronen müssten beide MO vollständig füllen. Die Stabilisierung des σ1s wird durch die Besetzung von σ*1s aufgehoben: Bindungsordnung 0. Es entsteht keine gewöhnliche stabile kovalente He–He-Bindung. Das schließt ein extrem schwach gebundenes Van-der-Waals-Heliumdimer bei sehr tiefen Temperaturen nicht aus.'],
      N2:['Drei Bindungsbeiträge, keine ungepaarten Elektronen','Zehn Valenzelektronen füllen σ2s, σ*2s, die zwei π2p-MO und σ2p. Die 2s-Beiträge heben sich auf; die drei besetzten bindenden 2p-MO ergeben Bindungsordnung 3. Bei N₂ liegt π2p unter σ2p, infolge der s-p-Mischung. Die Mischung selbst ist in den gezeichneten qualitativen LCAO-Flächen nicht quantitativ enthalten.'],
      O2:['Zwei Elektronen, die Lewis allein nicht erklärt','Nach den zehn unteren Valenzelektronen kommen zwei weitere in das gleich hohe π*-Paar. Nach Hund sitzt zuerst je ein Elektron mit parallelem Spin in jedem dieser beiden MO: ↑ und ↑. Das Molekül besitzt zwei ungepaarte Elektronen und wird von einem Magnetfeld angezogen. Die antibindende Besetzung senkt die Bindungsordnung von 3 auf 2; O₂ ist im Grundzustand ein Biradikal.'],
      benzene:['Sechs p-Orbitale, ein gemeinsames π-System','Jedes C-Atom steuert ein p-Orbital und ein π-Elektron bei. Im planaren Ring überlappen die p-Orbitale durchgehend. Sechs neue π-MO entstehen, drei bindende und drei antibindende. Die sechs Elektronen füllen genau die drei niedrigen MO: eine geschlossene π-Schale. Die paarweise gleichen Energien heißen Entartung; verschiedene gleichwertige Linearkombinationen können anders aussehende Formen ergeben.'],
      cot:tub?['Die reale Wanne vermeidet den planaren 4n-Fall','Die acht C-Atome liegen nicht in einer Ebene. Benachbarte p-Richtungen und die Kopplung rund um den Ring sind nicht einheitlich. Stärkere Doppelbindungen wechseln mit schwächeren Einfachbindungen. In diesem bewusst vereinfachten Wannenmodell liegen vier gepaarte besetzte π-MO unter vier leeren: keine zwei ungepaarten Elektronen. Die Wanne ist nicht aromatisch. Ihre Energieabstände sind keine experimentellen Werte.']:['Was wäre, wenn der Ring flach wäre?','Im idealen planaren Acht-Ring landen die letzten zwei der acht π-Elektronen in einem entarteten nichtbindenden Paar, nach Hund einzeln. Die Besetzung ist nicht geschlossen. Ein planarer, vollständig konjugierter 4n-Ring wäre antiaromatisch. Genau deshalb darf dieser Vergleich nicht mit der gewöhnlichen, nicht aromatischen COT-Wanne verwechselt werden.']
    };
    let shape;
    if(ring)shape=`Diese Fläche kombiniert ${levels.length} lokale p-Orbitale. Orange und Türkis markieren die Phasen des gesamten π-MO. Jedes lokale p-Orbital besitzt für sich eine Knotenebene; die Knoten des gesamten MO ergeben sich aus der Summe aller Beiträge. ${molecule==='cot'&&tub?'Die lokale p-Richtung folgt hier der gewellten Ringgeometrie. ':'Das σ-Gerüst wird nur als graue Orientierung gezeichnet. '}Das gewählte MO ist ${kindNames[level.kind]} und enthält ${level.count} Elektronen.`;
    else if(level.basis==='1s')shape=level.kind==='bonding'?'Die 1s-Anteile addieren sich. Zwischen den beiden Kernen gibt es keine trennende Knotenebene; die verbindende gleichphasige Fläche ist im Seitenblick besonders gut zu erkennen.':'Die 1s-Anteile subtrahieren sich. Genau zwischen den Kernen liegt eine Knotenebene: links und rechts haben entgegengesetzte Phase. Besetzung dieses σ*-MO schwächt die Bindung.';
    else if(level.basis==='2s')shape=`Die 2s-Atomorbitale besitzen selbst einen Radialknoten. Die ${level.kind==='bonding'?'bindende':'antibindende'} Kombination zeigt deshalb auch innere und äußere Phasenbereiche. ${level.kind==='antibonding'?'Zusätzlich trennt eine Knotenebene die Kerne. ':''}Aktiviere die Schnittansicht und drehe das Modell, um verborgene Bereiche zu sehen.`;
    else if(level.basis==='pz')shape=`Die Bindungsachse ist hier die z-Achse. Die p-Anteile zeigen entlang dieser Achse: eine σ-Kombination. ${level.kind==='bonding'?'Die einander zugewandten Lappen verstärken sich zwischen den Kernen.':'Zwischen den Kernen entsteht eine zusätzliche Knotenebene.'} Wegen der äußeren p-Lappen kann auch ein bindendes σ-MO beide Phasenfarben besitzen.`;
    else shape=`Die Bindungsachse ist z, die p-Richtung ${level.basis==='px'?'x':'y'}. Seitliche Überlappung ergibt ein π-MO mit einer Knotenebene durch die Bindungsachse. ${level.kind==='bonding'?'Die gleichphasigen Bereiche verbinden sich auf beiden Seiten der Achse.':'Eine weitere Knotenebene zwischen den Kernen macht die Kombination antibindend.'}${molecule==='O2'&&level.kind==='antibonding'?' Hier sitzt eines der beiden ungepaarten Elektronen.':''}`;
    const [title,text]=explanations[molecule];
    $('mo-explanation').innerHTML=`<article><h4>${title}</h4><p>${text}</p></article><article><h4>${level.label} genauer betrachtet</h4><p>${shape}</p><p class="occupancy-note">${level.count===0?'Dieses MO ist im dargestellten Grundzustand unbesetzt. Seine sichtbare Fläche zeigt einen möglichen Zustand, keine darin vorhandenen Elektronen.':level.count===1?'Besetzung: ein ungepaartes Elektron (↑).':'Besetzung: zwei Elektronen mit entgegengesetztem Spin (↑↓).'}</p></article>`;
    drawMO();
  }
  function drawMO(){const level=levels.find(o=>o.id===selectedMO),ring=level.basis==='ring';moViewer.orbital({mode:'mo',level,threshold:Number($('mo-threshold').value)/100,resolution:ring?65:61,extent:ring?6.4:5.4});}
  document.querySelectorAll('[data-molecule]').forEach(b=>b.addEventListener('click',()=>selectMolecule(b.dataset.molecule)));
  $('cot-tub').addEventListener('click',()=>{tub=true;selectMolecule('cot');});$('cot-planar').addEventListener('click',()=>{tub=false;selectMolecule('cot');});
  $('mo-threshold').addEventListener('input',()=>{clearTimeout(moTimer);moTimer=setTimeout(drawMO,160);});
  document.querySelectorAll('[data-explore]').forEach(b=>b.addEventListener('click',()=>{selectMolecule(b.dataset.explore);$('mo-lab').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}));

  const quiz=[
    {q:'Was bedeuten Orange und Türkis an einem Orbital?',a:['Positive und negative elektrische Ladung','Die zwei Vorzeichen der reellen Wellenfunktion','Zwei verschiedene Elektronen'],correct:1,why:'Die Phase bzw. das Vorzeichen ist entscheidend für Verstärkung und Auslöschung. Die Aufenthaltswahrscheinlichkeit hängt dagegen von |ψ|² ab.'},
    {q:'Welche Atomorbitale werden für neutrales Eisen in dieser App angezeigt?',a:['Nur die 4s-Orbitale der äußersten besetzten Schale','Alle 3d- und 4s-Orbitale als äußerste Schale','Nur die 3d-Orbitale'],correct:0,why:'Fe hat [Ar] 3d⁶ 4s². n = 4 ist die äußerste besetzte Schale. Die inneren 3d-Elektronen können dennoch chemisch wichtig sein: äußerste Schale und Valenzraum sind nicht dasselbe.'},
    {q:'Was ergibt das einfache MO-Modell für die kovalente Bindung von He₂?',a:['Bindungsordnung 2','Bindungsordnung 1','Bindungsordnung 0'],correct:2,why:'Zwei Elektronen sind bindend und zwei antibindend: (2 − 2) / 2 = 0. Ein sehr schwaches Van-der-Waals-Dimer ist eine andere Art der Bindung.'},
    {q:'Warum hat N₂ in diesem Modell Bindungsordnung 3?',a:['Weil jedes N drei Schalen hat','Weil 8 bindende und 2 antibindende Valenzelektronen vorliegen','Weil kein antibindendes MO besetzt sein darf'],correct:1,why:'(8 − 2) / 2 = 3. Die bindende und antibindende 2s-Besetzung heben sich auf; der Netto-Beitrag kommt von den drei gefüllten bindenden 2p-MO.'},
    {q:'Wo sitzen die zwei ungepaarten Elektronen von O₂?',a:['In zwei gleich hohen π*-Molekülorbitalen','Zusammen im selben σ-MO','Fest auf je einem O-Atom'],correct:0,why:'Das entartete π*-Paar wird nach Hund erst einzeln mit parallelem Spin besetzt. Es handelt sich um zwei Molekülzustände, nicht um zwei fest zugeordnete Atomplätze.'},
    {q:'Wie viele π-MO entstehen im Benzol aus sechs p-Atomorbitalen?',a:['Drei','Zwölf','Sechs'],correct:2,why:'Die Zahl der Zustände bleibt gleich. Drei bindende π-MO sind mit je zwei Elektronen besetzt; die drei antibindenden bleiben leer.'},
    {q:'Welche Aussage beschreibt normales neutrales Cyclooctatetraen?',a:['Planar und aromatisch','Wannenförmig und nicht aromatisch','Wannenförmig und automatisch antiaromatisch'],correct:1,why:'Die Wannenform unterbricht die Voraussetzung eines planaren, durchgehend konjugierten Rings. Antiaromatisch wäre der idealisierte planare, vollständig konjugierte 4n-Vergleich, nicht die gewöhnliche Wanne.'},
    {q:'Was verändert der Regler für die Orbitalfläche?',a:['Die gezeichnete Isosurface bei einem anderen |ψ|-Wert','Die Zahl der Elektronen','Die Bindungsordnung und den Spin'],correct:0,why:'Die Auswahl des Flächenwerts ändert die Darstellung. Elektronenbesetzung, Knoten und die aus der Besetzung berechnete Bindungsordnung werden dadurch nicht neu festgelegt.'}
  ];
  function renderQuiz(){
    $('research-quiz').replaceChildren();quiz.forEach((item,index)=>{
      const card=document.createElement('article');card.className='card quiz-card';card.innerHTML=`<p class="eyebrow">Forschungsfrage ${index+1}</p><h3>${item.q}</h3><div class="quiz-choices"></div><p class="quiz-feedback" aria-live="polite"></p>`;
      item.a.forEach((answer,choice)=>{const b=button(answer);b.addEventListener('click',()=>{progress.answers[index]=choice;renderQuiz();saveProgress();});if(progress.answers[index]===choice){b.className=choice===item.correct?'correct':'wrong';b.setAttribute('aria-pressed','true');}card.querySelector('.quiz-choices').append(b);});
      if(Number.isInteger(progress.answers[index]))card.querySelector('.quiz-feedback').textContent=(progress.answers[index]===item.correct?'Richtig. ':'Noch nicht. ')+item.why;
      $('research-quiz').append(card);
    });
  }
  function saveProgress(){
    const correct=quiz.filter((q,i)=>progress.answers[i]===q.correct).length;
    $('quiz-score').textContent=correct===quiz.length?'Abzeichen: Orbitalforscher · 8 / 8':`${correct} / ${quiz.length} erklärt`;
    $('exploration-badge').textContent=progress.explored.length===6?'Abzeichen: MO-Entdecker · alle 6 Modelle':`${progress.explored.length} / 6 Moleküle erkundet`;
    try{sessionStorage.setItem(storageKey,JSON.stringify(progress));}catch(_){/* The app remains usable without storage. */}
  }
  $('reset').addEventListener('click',()=>$('reset-dialog').showModal());
  $('reset-dialog').addEventListener('close',()=>{if($('reset-dialog').returnValue!=='reset')return;progress={answers:{},explored:[]};renderQuiz();saveProgress();});
  function setTheme(theme){document.documentElement.dataset.theme=theme;$('theme-toggle').textContent=theme==='dark'?'Helles Design':'Dunkles Design';try{localStorage.setItem('orbital-labor-theme',theme);}catch(_){}}
  let theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';try{theme=localStorage.getItem('orbital-labor-theme')||theme;}catch(_){}setTheme(theme);
  $('theme-toggle').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));

  function syncFullscreen(){
    document.querySelectorAll('[data-fullscreen]').forEach(b=>{const active=document.fullscreenElement?.id===b.dataset.fullscreen||$(b.dataset.fullscreen).classList.contains('fullscreen-fallback');b.textContent=active?'Vollbild beenden':'Vollbild';b.setAttribute('aria-pressed',String(active));});atomViewer.resize();moViewer.resize();
  }
  function leaveFallback(){document.querySelectorAll('.fullscreen-fallback').forEach(lab=>lab.classList.remove('fullscreen-fallback'));document.body.classList.remove('modal-open');syncFullscreen();}
  document.querySelectorAll('[data-fullscreen]').forEach(b=>b.addEventListener('click',async()=>{
    const lab=$(b.dataset.fullscreen);
    if(lab.classList.contains('fullscreen-fallback')){leaveFallback();return;}
    if(document.fullscreenElement){await document.exitFullscreen();return;}
    try{if(!lab.requestFullscreen)throw new Error('Fullscreen unavailable');await lab.requestFullscreen();}catch(_){leaveFallback();lab.classList.add('fullscreen-fallback');document.body.classList.add('modal-open');}
    syncFullscreen();
  }));
  document.addEventListener('fullscreenchange',syncFullscreen);document.addEventListener('keydown',event=>{if(event.key==='Escape')leaveFallback();});
  buildPSE();renderAtom();renderQuiz();selectMolecule('H2');
})();

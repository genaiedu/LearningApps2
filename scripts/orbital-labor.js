(function(){
  'use strict';
  const C=window.OrbitalCore,$=id=>document.getElementById(id);
  const atomViewer=new OrbitalViewer($('atom-canvas')),moViewer=new OrbitalViewer($('mo-canvas'));
  let element=C.bySymbol.C,mode='bohr',selectedAO='2px',selectedSubshell=null,molecule='H2',tub=true,levels=[],selectedMO='',motion=true;
  const storageKey='orbital-labor-research-v1';
  let progress={answers:{},explored:[]};
  try{const saved=JSON.parse(sessionStorage.getItem(storageKey));if(saved && saved.answers && Array.isArray(saved.explored))progress=saved;}catch(_){/* Private browsing can disallow storage. */}
  const kindNames={bonding:'bindend',antibonding:'antibindend',nonbonding:'nichtbindend'};
  const moleculeNames={H2:'Wasserstoff · H₂',He2:'Helium · He₂',N2:'Stickstoff · N₂',O2:'Sauerstoff · O₂',methane:'Methan · CH₄',ethane:'Ethan · C₂H₆',ethene:'Ethen · C₂H₄',ethyne:'Ethin · C₂H₂',water:'Wasser · H₂O',ammonia:'Ammoniak · NH₃',benzene:'Benzol · C₆H₆',cot:'Cyclooctatetraen · C₈H₈'};
  const polyatomicInfo={
    methane:{sigma:4,pi:0,hybrid:'sp³',geometry:'tetraedrisch · etwa 109,5°',title:'Vier gleiche Bindungen – aber keine flache Kreuzform',text:'Die vier H-Atome umgeben C tetraedrisch. Im lokalen Bindungsbild erklären vier sp³-Hybride die vier gleichwertigen C–H-σ-Bindungen. Das hier gezeigte MO-Modell verwendet dagegen die 2s- und drei 2p-Zustände von C sowie vier H-1s-Zustände: acht Valenz-MO, von denen vier mit insgesamt acht Elektronen besetzt sind. Das niedrige a₁-MO ist eine symmetrische Kombination; die drei gleich hohen t₂-MO bilden einen entarteten Satz. Keines dieser delokalisierten MO ist einfach „eine der vier C–H-Bindungen“.'},
    ethane:{sigma:7,pi:0,hybrid:'sp³',geometry:'tetraedrisch an jedem C · gestaffelt',title:'Einfachbindung: ein σ-Beitrag zwischen den C-Atomen',text:'Jedes C besitzt vier Nachbarn: drei H-Atome und ein C-Atom. Im lokalen Bindungsbild gibt es sechs C–H-σ-Bindungen und eine C–C-σ-Bindung aus sp³–sp³-Überlappung. 14 Valenzelektronen besetzen sieben σ-MO. Das Gerüst ist gestaffelt und idealisiert tetraedrisch; die CH₃-Gruppen können sich um die Einfachbindung drehen. Die frei drehbare Ansicht ändert hier nur deinen Blick, nicht die Konformation.'},
    ethene:{sigma:5,pi:1,hybrid:'sp²',geometry:'planar · idealisiert 120°',title:'Doppelbindung: einmal σ und einmal π',text:'Die drei σ-Richtungen an jedem C liegen in einer Ebene und werden durch sp²-Hybride beschrieben. Je ein unhybridisiertes p-Orbital steht senkrecht auf dieser Ebene. Ihre seitliche Überlappung bildet ein π-MO: zwei Elektronen sitzen darin, π* bleibt leer. Zu den vier C–H-σ-Bindungen kommt die C–C-σ-Bindung – zusammen fünf besetzte σ-MO und ein besetztes π-MO. Eine Verdrehung der beiden Molekülhälften würde die π-Überlappung vermindern.'},
    ethyne:{sigma:3,pi:2,hybrid:'sp',geometry:'linear · 180°',title:'Dreifachbindung: einmal σ und zweimal π',text:'Die sp-Hybride richten die σ-Bindungen entlang einer Geraden aus. An jedem C bleiben zwei zueinander senkrechte p-Orbitale. Aus ihnen entstehen zwei gleich hohe bindende π-MO mit je zwei Elektronen und zwei leere π*-MO. Die C≡C-Bindung besteht also aus einem σ- und zwei π-Beiträgen; zusätzlich gibt es zwei C–H-σ-Bindungen. Beide π-MO auswählen und das Modell drehen: Ihre Knotenebenen stehen senkrecht zueinander.'},
    water:{sigma:2,pi:0,lone:2,central:'O',hybrid:'annähernd tetraedrischer Elektronenpaarraum',geometry:'gewinkelt · 104,5°',title:'Zwei Bindungen und zwei freie Elektronenpaare',text:'Wasser hat acht Valenzelektronen: vier für die beiden O–H-Bindungen und vier als freie Elektronenpaare. Im lokalen Bild zählen wir vier Elektronenpaarbereiche, aber nur zwei davon führen zu einem H-Atom. Deshalb ist das Molekül gewinkelt, nicht tetraedrisch geformt. Im MO-Bild gehören die freien Elektronen vor allem zu 3a₁ und 1b₁. Das 1b₁-MO liegt senkrecht zur xz-Molekülebene und ist hier ein reines O-p-Orbital; 3a₁ enthält auch s- und H-Anteile und ist nur überwiegend nichtbindend. Zwei gezeichnete Lappen sind nicht automatisch zwei Elektronenpaare.'},
    ammonia:{sigma:3,pi:0,lone:1,central:'N',hybrid:'annähernd tetraedrischer Elektronenpaarraum',geometry:'trigonal-pyramidal · etwa 107°',title:'Das vierte Elektronenpaar bindet kein H-Atom',text:'Ammoniak besitzt acht Valenzelektronen. Sechs besetzen drei N–H-Bindungszustände; die übrigen zwei bilden ein freies Paar. Drei H-Atome liegen unterhalb des N-Atoms: Das Molekül ist eine dreiseitige Pyramide und nicht flach. Das überwiegend nichtbindende 3a₁-MO ist hauptsächlich am Stickstoff lokalisiert und zeigt in den freien Raum gegenüber den H-Atomen. Es enthält auch kleine H-Anteile. Das lokale Bild mit einem freien sp³-nahen Paar und das delokalisierte MO-Bild sind unterschiedliche Beschreibungen, keine zusätzlichen Elektronen.'}
  };
  const arrows=count=>count===2?'↑↓':count===1?'↑':'—';
  const block=e=>e.group===18?'noble':e.transition?'d':'main';
  function wikiLink(title,label){const link=document.createElement('a');link.href='https://de.wikipedia.org/wiki/'+encodeURIComponent(title.replace(/ /g,'_'));link.className='orbital-wiki-link';link.dataset.externalConsentSkip='';link.textContent='W · '+label+' im Lesefenster';return link;}
  const button=(text,attributes={})=>{const b=document.createElement('button');b.type='button';b.textContent=text;for(const [key,value] of Object.entries(attributes))b.setAttribute(key,value);return b;};

  function buildPSE(){
    for(let group=1;group<=18;group++){const label=document.createElement('span');label.className='group-label';label.textContent=group;label.style.gridColumn=group+1;label.style.gridRow=1;$('periodic-table').append(label);}
    for(let period=1;period<=5;period++){const label=document.createElement('span');label.className='period-label';label.textContent=period;label.style.gridRow=period+1;label.style.gridColumn=1;$('periodic-table').append(label);}
    C.elements.forEach(e=>{
      const b=button('',{'aria-label':`${e.z} · ${e.name}, ${e.symbol}, Gruppe ${e.group}, Periode ${e.period}`,'aria-pressed':String(e===element)});
      b.className='pse-cell';b.dataset.symbol=e.symbol;b.dataset.block=block(e);b.style.gridColumn=e.group+1;b.style.gridRow=e.period+1;
      b.innerHTML=`<small>${e.z}</small><strong>${e.symbol}</strong><span>${e.name}</span>`;
      b.addEventListener('click',()=>{element=e;selectedSubshell=null;selectedAO=C.outerOrbitals(e).find(o=>o.type.startsWith('p'))?.id||C.outerOrbitals(e)[0].id;renderAtom();});
      $('periodic-table').append(b);
    });
  }
  function selectableOrbitals(){return selectedSubshell?C.subshellOrbitals(element,selectedSubshell):C.outerOrbitals(element);}
  function renderAtom(){
    const orbitals=selectableOrbitals();
    if(!orbitals.some(o=>o.id===selectedAO))selectedAO=orbitals[0].id;
    document.querySelectorAll('.pse-cell').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.symbol===element.symbol)));
    $('element-card').innerHTML=`<div class="element-card-top"><div class="element-tile" data-block="${block(element)}"><small>${element.z}</small><strong>${element.symbol}</strong><span>${element.name}</span></div><div><h4>${element.name}</h4><p>Gruppe ${element.group} · Periode ${element.period}</p><p>${element.shells.join(' · ')} Elektronen auf den Schalen</p></div></div>`;
    $('element-card').append(wikiLink(element.name,element.name));
    $('atomic-config').replaceChildren();
    C.order.filter(key=>element.config[key]>0).forEach(key=>{
      const b=button('',{'aria-pressed':String(mode==='ao' && orbitals.some(o=>o.subshell===key)),'aria-label':`${key}-Unterschale mit ${element.config[key]} Elektronen: Orbitale in 3D zeigen`});
      b.className='configuration-orbital';b.dataset.subshell=key;b.innerHTML=`${key}<sup>${element.config[key]}</sup>`;
      b.addEventListener('click',()=>{selectedSubshell=key;selectedAO=C.subshellOrbitals(element,key)[0].id;mode='ao';renderAtom();$('atomic-config').querySelector(`[data-subshell="${key}"]`).focus({preventScroll:true});});
      $('atomic-config').append(b);
    });
    const count=element.shells[element.outer-1];
    $('outer-info').innerHTML=`<b>Äußerste besetzte Schale: n = ${element.outer}</b><br>${count} Elektron${count===1?'':'en'} in dieser Schale.${element.transition?'<br>Die (n−1)d-Unterschale kann ebenfalls zur Bindung beitragen; sie ist nicht automatisch die äußerste Schale.':''}${element.symbol==='Pd'?'<br><b>Ausnahme Palladium:</b> 5s ist leer. Deshalb siehst du hier 4s, 4p und 4d, obwohl Pd in Periode 5 steht.':''}`;
    $('mode-bohr').setAttribute('aria-pressed',String(mode==='bohr'));$('mode-ao').setAttribute('aria-pressed',String(mode==='ao'));
    $('ao-controls').hidden=mode!=='ao';$('electron-motion').hidden=mode!=='bohr';
    $('atom-viewer').querySelectorAll('.ao-control').forEach(control=>control.hidden=mode!=='ao');
    if(mode==='bohr'){$('atom-viewer-title').textContent=`${element.symbol} · Schalenmodell`;atomViewer.shells(element);atomViewer.setMotion(motion);return;}
    $('ao-selection-title').textContent=selectedSubshell?`${selectedSubshell}-Unterschale · ${orbitals.length===1?'ein Orbital':`${orbitals.length} Orbitale`}`:'Orbitale der äußersten besetzten Schale';
    $('ao-selection-note').textContent=selectedSubshell?`Du betrachtest n = ${orbitals[0].n}${orbitals[0].n<element.outer?' – eine innere Schale, nicht die äußerste Schale dieses Atoms':''}. Wähle unten ein einzelnes Orbital dieser Unterschale. ↑ und ↓ zeigen seine Besetzung.`:'Klicke ein Kästchen, um genau dieses Orbital zu betrachten. Über die Elektronenkonfiguration erreichst du auch innere Unterschalen. ↑ und ↓ stehen für die Besetzung, nicht für eine Bewegungsrichtung.';
    $('ao-outer-reset').hidden=selectedSubshell===null;
    $('orbital-boxes').replaceChildren();let shell=null,group;
    orbitals.forEach(o=>{
      if(o.subshell!==shell){shell=o.subshell;group=document.createElement('div');group.className='orbital-shell';group.setAttribute('aria-label',`${shell}-Unterschale`);$('orbital-boxes').append(group);}
      const b=button('',{'aria-pressed':String(o.id===selectedAO),'aria-label':`${o.id}: ${o.count} Elektronen. Orbital zeigen`});b.className='orbital-box';
      b.innerHTML=`<span>${arrows(o.count)}</span><small>${o.id.replace('dx2-y2','d(x²−y²)').replace('dz2','d(z²)')}</small>`;
      b.dataset.orbital=o.id;b.addEventListener('click',()=>{selectedAO=o.id;renderAtom();$('orbital-boxes').querySelector(`[data-orbital="${o.id}"]`).focus({preventScroll:true});});group.append(b);
    });
    drawAO();
  }
  function drawAO(){
    if(mode!=='ao')return;
    const o=selectableOrbitals().find(item=>item.id===selectedAO),radial=$('radial-nodes').checked;
    const threshold=Number($('ao-threshold').value)/(radial?1000:100);
    $('ao-threshold-label').textContent=`|ψ| = ${(threshold*100).toLocaleString('de-DE',{maximumFractionDigits:1})} % des maximalen Modellbetrags`;
    const l=o.type==='s'?0:o.type.startsWith('p')?1:2,nodes=o.n-l-1;
    $('ao-model-note').textContent=radial?`Wasserstoffähnliches Vergleichsmodell: ${nodes} Radialknoten und ${l} Winkelknoten. Innere Flächen können durch äußere verdeckt sein. Keine realen Atomradien oder angepasste Abschirmung.`:`Winkelform des ${o.id}-Orbitals: ${l} Winkelknoten. Seine ${nodes} Radialknoten sind in dieser vereinfachten Ansicht ausgeblendet. Die Größe ist zur Ansicht skaliert.`;
    $('atom-viewer-title').textContent=`${element.symbol} · ${o.id} · ${o.count} e⁻`;
    atomViewer.orbital({mode:'ao',n:o.n,type:o.type,radial,threshold,resolution:radial?73:65,extent:radial&&o.n===1?7.4:5.6});
  }
  $('mode-bohr').addEventListener('click',()=>{mode='bohr';renderAtom();});
  $('mode-ao').addEventListener('click',()=>{mode='ao';renderAtom();});
  $('ao-outer-reset').addEventListener('click',()=>{selectedSubshell=null;selectedAO=C.outerOrbitals(element).find(o=>o.type.startsWith('p'))?.id||C.outerOrbitals(element)[0].id;renderAtom();$('mode-ao').focus({preventScroll:true});});
  $('electron-motion').addEventListener('click',()=>{motion=!motion;atomViewer.setMotion(motion);$('electron-motion').textContent=motion?'Bewegung anhalten':'Bewegung starten';$('electron-motion').setAttribute('aria-pressed',String(!motion));});
  $('radial-nodes').addEventListener('change',()=>{const radial=$('radial-nodes').checked;$('ao-threshold').min=radial?1:4;$('ao-threshold').max=radial?25:30;$('ao-threshold').value=radial?2:14;drawAO();});
  let aoTimer,moTimer;
  $('ao-threshold').addEventListener('input',()=>{clearTimeout(aoTimer);aoTimer=setTimeout(drawAO,160);});

  function selectMolecule(key){
    molecule=key;levels=C.levelsFor(key,tub);
    // Start O₂ with the visibly singly occupied π* level, all other cases with a filled bonding level.
    selectedMO=(key==='O2'?levels.find(o=>o.id==='px-'):['water','ammonia'].includes(key)?levels.filter(o=>o.family==='lone').at(-1):['ethene','ethyne'].includes(key)?levels.find(o=>o.family==='pi' && o.count===2):levels[0]).id;
    document.querySelectorAll('[data-molecule]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.molecule===key)));
    $('cot-controls').hidden=key!=='cot';$('cot-tub').setAttribute('aria-pressed',String(tub));$('cot-planar').setAttribute('aria-pressed',String(!tub));
    $('molecule-title').textContent=moleculeNames[key];
    const hydro=Boolean(polyatomicInfo[key]);
    $('energy-panel').dataset.hydrocarbon=String(hydro);
    $('energy-scale-note').innerHTML=hydro?'Qualitatives Valenz-MO-Schema ↑<br><small>Vereinfachtes LCAO-Modell; keine berechneten realen Energien. Jede Linie ist anklickbar.</small>':'Relative Energie ↑<br><small>Schematisch; keine eV-Skala. Jede Linie ist anklickbar.</small>';
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
    const unpaired=levels.filter(o=>o.count===1).length,ring=molecule==='benzene'||molecule==='cot',hydro=polyatomicInfo[molecule];
    if(hydro)$('mo-summary').innerHTML=`<p><b>${levels.reduce((sum,o)=>sum+o.count,0)} Valenzelektronen · ${levels.length} Valenz-MO</b></p><p>${hydro.sigma} σ-Bindungszustände · ${hydro.pi} besetzte π-MO${hydro.lone?` · ${hydro.lone} ${hydro.lone===1?'freies Elektronenpaar':'freie Elektronenpaare'}`:''}<br>Alle Elektronen gepaart.</p><p>Lokales Bindungsbild: ${hydro.hybrid}<br>${hydro.geometry}</p><p class="small-note">${hydro.central||'C'}-1s-Kernorbitale ausgelassen. MO sind nicht einzelnen Bindungsstrichen zugeordnet.</p>`;
    else if(ring)$('mo-summary').innerHTML=`<p><b>${molecule==='benzene'?6:8} π-Elektronen · ${levels.length} π-MO</b></p><p>${unpaired} ungepaarte Elektronen im ${molecule==='cot'?(tub?'qualitativen Wannenmodell':'idealen planaren Vergleich'):'Hückel-Modell'}.</p><p>${molecule==='benzene'?'Planar · aromatisch':tub?'Nicht planar · nicht aromatisch':'Hypothetisch planar · antiaromatischer 4n-Vergleich'}</p>`;
    else{const bonding=levels.filter(o=>o.kind==='bonding').reduce((a,b)=>a+b.count,0),anti=levels.filter(o=>o.kind==='antibonding').reduce((a,b)=>a+b.count,0);$('mo-summary').innerHTML=`<p><b>Bindungsordnung: (${bonding} − ${anti}) / 2 = ${C.bondOrder(levels)}</b></p><p>${unpaired} ungepaarte Elektronen${molecule==='O2'?' · Biradikal · Triplett-Grundzustand':''}.</p>`;}
    const wikiTitles={H2:'Wasserstoff',He2:'Helium',N2:'Stickstoff',O2:'Sauerstoff',methane:'Methan',ethane:'Ethan',ethene:'Ethen',ethyne:'Ethin',water:'Wasser',ammonia:'Ammoniak',benzene:'Benzol',cot:'Cyclooctatetraen'};
    $('mo-summary').append(wikiLink(wikiTitles[molecule],wikiTitles[molecule]));
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
    if(hydro){
      if(level.family==='lone')shape=molecule==='water'?(level.label.includes('b₁')?'Das 1b₁-MO wird hier vom O-2p-Orbital entlang y gebildet, senkrecht zur xz-Molekülebene. Es hat eine Knotenebene durch die Kerne und überlappt nicht mit den H-1s-Zuständen. Seine zwei Phasenlappen gehören zu einem Orbital mit zwei Elektronen – nicht zu zwei freien Paaren.':'Das 3a₁-MO ist überwiegend am O-Atom konzentriert, mit s- und p-Anteilen und kleinen Beiträgen der H-Atome. Es ist nicht streng bindungsfrei. Zusammen mit 1b₁ beschreibt es die vier Elektronen, die im lokalen Bild den beiden freien Paaren entsprechen.'):'Dieses 3a₁-MO ist hauptsächlich ein s-/p-Zustand am N-Atom und zeigt in den Raum oberhalb der H-Dreiecksfläche. Kleine H-Anteile bleiben vorhanden: „nichtbindend“ bedeutet hier überwiegend nichtbindend, nicht völlig ohne Wechselwirkung. Es enthält genau zwei Elektronen.';
      else shape=level.family==='pi'?`Dieses ${kindNames[level.kind]} π-MO kombiniert die senkrecht zur C–C-Achse gerichteten p-Orbitale der beiden C-Atome. ${molecule==='ethene'?'Die Molekülebene ist xy; die p-Orbitale zeigen entlang z.':'Die beiden gleich hohen π-Zustände gehören zu zwei senkrechten p-Richtungen quer zur x-Achse.'} ${level.count?'Gleichphasige Bereiche verbinden die beiden C-Atome seitlich.':'Zwischen den C-Atomen liegt eine zusätzliche Knotenebene; dieses π*-MO ist im Grundzustand leer.'}`:`Dieses ${kindNames[level.kind]} Valenz-MO ist eine Linearkombination über das ganze Molekül aus ${hydro.central||'C'}-2s-, ${hydro.central||'C'}-2p- und H-1s-Anteilen. Es zeigt keinen einzelnen lokalisierten Bindungsstrich. ${molecule==='methane'?'a₁ bezeichnet eine vollständig symmetrische Kombination; t₂ einen dreifach entarteten Satz.':''} Die Farbwechsel zeigen Phasen und Knoten der Modell-Wellenfunktion, keine unterschiedlich geladenen Atome.`;
      shape+=' Die Flächen stammen aus einem vereinfachten Valenz-LCAO-Modell mit idealisierter Geometrie; sie sind keine quantenchemisch berechneten Orbitaldichten.';
    }
    else if(ring)shape=`Diese Fläche kombiniert ${levels.length} lokale p-Orbitale. Orange und Türkis markieren die Phasen des gesamten π-MO. Jedes lokale p-Orbital besitzt für sich eine Knotenebene; die Knoten des gesamten MO ergeben sich aus der Summe aller Beiträge. ${molecule==='cot'&&tub?'Die lokale p-Richtung folgt hier der gewellten Ringgeometrie. ':'Das σ-Gerüst wird nur als graue Orientierung gezeichnet. '}Das gewählte MO ist ${kindNames[level.kind]} und enthält ${level.count} Elektronen.`;
    else if(level.basis==='1s')shape=level.kind==='bonding'?'Die 1s-Anteile addieren sich. Zwischen den beiden Kernen gibt es keine trennende Knotenebene; die verbindende gleichphasige Fläche ist im Seitenblick besonders gut zu erkennen.':'Die 1s-Anteile subtrahieren sich. Genau zwischen den Kernen liegt eine Knotenebene: links und rechts haben entgegengesetzte Phase. Besetzung dieses σ*-MO schwächt die Bindung.';
    else if(level.basis==='2s')shape=`Die 2s-Atomorbitale besitzen selbst einen Radialknoten. Die ${level.kind==='bonding'?'bindende':'antibindende'} Kombination besitzt deshalb auch innere und äußere Phasenbereiche. ${level.kind==='antibonding'?'Zusätzlich trennt eine Knotenebene die Kerne. ':''}Innere Flächen können in dieser Oberflächenansicht durch äußere verdeckt sein.`;
    else if(level.basis==='pz')shape=`Die Bindungsachse ist hier die z-Achse. Die p-Anteile zeigen entlang dieser Achse: eine σ-Kombination. ${level.kind==='bonding'?'Die einander zugewandten Lappen verstärken sich zwischen den Kernen.':'Zwischen den Kernen entsteht eine zusätzliche Knotenebene.'} Wegen der äußeren p-Lappen kann auch ein bindendes σ-MO beide Phasenfarben besitzen.`;
    else shape=`Die Bindungsachse ist z, die p-Richtung ${level.basis==='px'?'x':'y'}. Seitliche Überlappung ergibt ein π-MO mit einer Knotenebene durch die Bindungsachse. ${level.kind==='bonding'?'Die gleichphasigen Bereiche verbinden sich auf beiden Seiten der Achse.':'Eine weitere Knotenebene zwischen den Kernen macht die Kombination antibindend.'}${molecule==='O2'&&level.kind==='antibonding'?' Hier sitzt eines der beiden ungepaarten Elektronen.':''}`;
    const [title,text]=hydro?[hydro.title,hydro.text]:explanations[molecule];
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
    {q:'Welche Unterschale gehört bei neutralem Eisen zur äußersten besetzten Schale?',a:['4s','3d und 4s gehören beide zur äußersten Schale','Nur 3d'],correct:0,why:'Fe hat [Ar] 3d⁶ 4s². n = 4 ist die äußerste besetzte Schale. Über die Konfiguration kannst du auch die inneren 3d-Orbitale auswählen. Diese Elektronen können chemisch wichtig sein: äußerste Schale und Valenzraum sind nicht dasselbe.'},
    {q:'Was ergibt das einfache MO-Modell für die kovalente Bindung von He₂?',a:['Bindungsordnung 2','Bindungsordnung 1','Bindungsordnung 0'],correct:2,why:'Zwei Elektronen sind bindend und zwei antibindend: (2 − 2) / 2 = 0. Ein sehr schwaches Van-der-Waals-Dimer ist eine andere Art der Bindung.'},
    {q:'Warum hat N₂ in diesem Modell Bindungsordnung 3?',a:['Weil jedes N drei Schalen hat','Weil 8 bindende und 2 antibindende Valenzelektronen vorliegen','Weil kein antibindendes MO besetzt sein darf'],correct:1,why:'(8 − 2) / 2 = 3. Die bindende und antibindende 2s-Besetzung heben sich auf; der Netto-Beitrag kommt von den drei gefüllten bindenden 2p-MO.'},
    {q:'Wo sitzen die zwei ungepaarten Elektronen von O₂?',a:['In zwei gleich hohen π*-Molekülorbitalen','Zusammen im selben σ-MO','Fest auf je einem O-Atom'],correct:0,why:'Das entartete π*-Paar wird nach Hund erst einzeln mit parallelem Spin besetzt. Es handelt sich um zwei Molekülzustände, nicht um zwei fest zugeordnete Atomplätze.'},
    {q:'Wie viele π-MO entstehen im Benzol aus sechs p-Atomorbitalen?',a:['Drei','Zwölf','Sechs'],correct:2,why:'Die Zahl der Zustände bleibt gleich. Drei bindende π-MO sind mit je zwei Elektronen besetzt; die drei antibindenden bleiben leer.'},
    {q:'Welche Aussage beschreibt normales neutrales Cyclooctatetraen?',a:['Planar und aromatisch','Wannenförmig und nicht aromatisch','Wannenförmig und automatisch antiaromatisch'],correct:1,why:'Die Wannenform unterbricht die Voraussetzung eines planaren, durchgehend konjugierten Rings. Antiaromatisch wäre der idealisierte planare, vollständig konjugierte 4n-Vergleich, nicht die gewöhnliche Wanne.'},
    {q:'Was verändert der Regler für die Orbitalfläche?',a:['Die gezeichnete Isosurface bei einem anderen |ψ|-Wert','Die Zahl der Elektronen','Die Bindungsordnung und den Spin'],correct:0,why:'Die Auswahl des Flächenwerts ändert die Darstellung. Elektronenbesetzung, Knoten und die aus der Besetzung berechnete Bindungsordnung werden dadurch nicht neu festgelegt.'},
    {q:'Wie setzt sich die C=C-Doppelbindung in Ethen zusammen?',a:['Aus zwei σ-Bindungen','Aus einer σ- und einer π-Bindung','Aus zwei π-Bindungen ohne σ-Anteil'],correct:1,why:'Der σ-Anteil liegt entlang der C–C-Achse. Der π-Anteil entsteht durch seitliche Überlappung der p-Orbitale ober- und unterhalb der Molekülebene.'},
    {q:'Was unterscheidet das π-System von Ethin von dem von Ethen?',a:['Ethin hat zwei senkrecht zueinander orientierte besetzte π-MO','Ethin hat kein π-MO','In jedem π-MO von Ethin sitzen vier Elektronen'],correct:0,why:'Ethin besitzt eine σ- und zwei π-Bindungen zwischen den C-Atomen. In jedem der zwei bindenden π-MO sitzen zwei Elektronen mit entgegengesetztem Spin; π* bleibt leer.'},
    {q:'Wie viele freie Elektronenpaare enthält ein neutrales H₂O-Molekül?',a:['Keines','Eines','Zwei'],correct:2,why:'Von acht Valenzelektronen tragen vier zu den beiden O–H-Bindungen bei. Vier weitere entsprechen zwei freien Paaren. Die beiden unterschiedlich geformten, überwiegend nichtbindenden MO enthalten je zwei Elektronen.'},
    {q:'Warum ist NH₃ im einfachen Elektronenpaarmodell pyramidal statt flach?',a:['Drei Bindungen und ein freies Paar bilden vier Elektronenpaarbereiche','Weil N keine freien Elektronen hat','Weil jedes N–H-Orbital vier Elektronen enthält'],correct:0,why:'Das freie Paar ist ein vierter Bereich am N-Atom, ohne einen vierten H-Partner. Die drei H-Atome liegen daher um die Basis einer Pyramide; N liegt darüber.'}
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
    $('quiz-score').textContent=correct===quiz.length?`Abzeichen: Orbitalforscher · ${quiz.length} / ${quiz.length}`:`${correct} / ${quiz.length} erklärt`;
    const explored=Object.keys(moleculeNames).filter(key=>progress.explored.includes(key)).length,total=Object.keys(moleculeNames).length;
    $('exploration-badge').textContent=explored===total?`Abzeichen: MO-Entdecker · alle ${total} Modelle`:`${explored} / ${total} Moleküle erkundet`;
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

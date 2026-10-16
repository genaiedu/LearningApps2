/* Measured bands and a separate qualitative π-only LCAO model.
   Reuses OrbitalLabor's eigensolver, signed field, surface and 3D viewer. */
const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.append(s);});
const num=(v,d=0)=>v.toLocaleString('de-DE',{maximumFractionDigits:d});
export function mount(data){
  const plot=document.getElementById('aux-plot'),card=plot.closest('.compare');
  card.querySelector('h3').textContent='Bathochromer Einfluss der Aminogruppe: Benzol und Anilin';
  card.querySelector('h3+p').innerHTML='Was verändert –NH₂? Vergleiche dieselbe langwellige UV-Bande von Benzol und Anilin im gleichen Lösungsmittel Cyclohexan. Das freie Elektronenpaar des Stickstoffs kann mit dem π-System des Rings wechselwirken. Beobachte zuerst die <strong>Lage</strong> der Banden, danach ihre <strong>Absorptionsstärke</strong>.';
  const label=document.getElementById('aux-direction').closest('label');
  label.innerHTML='Spektrenansicht<select id="amino-scale"><option value="normalized">Bandlage vergleichen · beide Maxima auf 100 %</option><option value="absolute">Absorptionsstärke vergleichen · gemeinsame ε-Skala</option></select>';
  const old=card.querySelector('#aux-result');
  const rest=[...card.children].filter(e=>e===old||old.compareDocumentPosition(e)&Node.DOCUMENT_POSITION_FOLLOWING);
  rest.forEach(e=>e.remove());
  const legend=document.createElement('p');legend.innerHTML='<strong style="color:#73659a">Violett: Benzol</strong> · <strong style="color:#ad5e35">Kupfer: Anilin</strong>';plot.before(legend);
  const explanation=document.createElement('div');explanation.setAttribute('aria-live','polite');card.append(explanation);
  const records=['A01','A16'].map(id=>data.find(r=>r.id===id));
  // Exclude Anilin's rising neighbouring short-wave band from this comparison.
  const bands=records.map((r,i)=>r.points.filter(p=>p[0]>=(i?265:250)&&p[0]<=310));
  const peaks=bands.map((ps,i)=>ps.filter(p=>i===0||p[0]>=265).reduce((a,b)=>b[1]>a[1]?b:a));
  function draw(){
    const norm=document.getElementById('amino-scale').value==='normalized',colors=['#73659a','#ad5e35'];
    const yMax=norm?110:Math.max(...bands.flat().map(p=>p[1]))*1.12;
    const X=x=>90+(x-250)/60*775,Y=y=>320-y/yMax*220;
    let svg='<defs><marker id="amino-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="#ad5e35"/></marker></defs>';
    for(let i=0;i<=5;i++){const x=250+12*i,y=yMax*i/5;svg+=`<path class="grid" fill="none" d="M${X(x)} 100V320M90 ${Y(y)}H865"/><text x="${X(x)}" y="346" text-anchor="middle">${x}</text><text x="78" y="${Y(y)+5}" text-anchor="end">${num(y)}</text>`;}
    svg+='<path class="axis" fill="none" d="M90 100V320H865"/><text x="90" y="24">'+(norm?'Relative Bandenhöhe / %':'ε / L mol⁻¹ cm⁻¹')+'</text><text x="480" y="375" text-anchor="middle">Wellenlänge λ / nm</text>';
    bands.forEach((ps,i)=>{const points=ps.map(p=>[p[0],norm?p[1]/peaks[i][1]*100:p[1]]);svg+=`<path fill="none" stroke="${colors[i]}" stroke-width="3.5" d="${points.map((p,j)=>(j?'L':'M')+X(p[0]).toFixed(2)+' '+Y(p[1]).toFixed(2)).join('')}"/>`;svg+=`<path d="M${X(peaks[i][0])} 95V320" stroke="${colors[i]}" stroke-dasharray="4 5"/><text x="${X(peaks[i][0])}" y="88" text-anchor="middle" fill="${colors[i]}">${i?'Anilin':'Benzol'}: ${num(peaks[i][0])} nm</text>`;});
    svg+=`<path d="M${X(peaks[0][0])} 51H${X(peaks[1][0])}" stroke="#ad5e35" stroke-width="2" marker-end="url(#amino-arrow)"/><text x="${(X(peaks[0][0])+X(peaks[1][0]))/2}" y="43" text-anchor="middle">bathochrom →</text>`;
    if(!norm)svg+=`<path d="M835 ${Y(peaks[0][1])}V${Y(peaks[1][1])}" stroke="#ad5e35" stroke-width="2" marker-end="url(#amino-arrow)"/><text x="823" y="${(Y(peaks[0][1])+Y(peaks[1][1]))/2}" text-anchor="end">hyperchrom ↑</text>`;
    plot.innerHTML=svg;
    explanation.innerHTML=`<p><strong>Rotverschiebung direkt ablesen:</strong> Das entsprechende Bandenmaximum wandert von ${num(peaks[0][0])} nm zu ${num(peaks[1][0])} nm. Längere Wellenlänge bedeutet kleinere Anregungsenergie, denn ΔE = h · c₀ / λ. „Rot“ bezeichnet hier die Verschiebungsrichtung; beide Banden liegen weiterhin im unsichtbaren UV.</p><p><strong>Intensitätszunahme:</strong> ε am jeweiligen Maximum steigt von ungefähr ${num(peaks[0][1])} auf ${num(peaks[1][1])} L mol⁻¹ cm⁻¹. Das ist eine hyperchrome Veränderung: Bei gleicher Konzentration und Schichtdicke absorbiert Anilin in dieser Bande stärker. Die Aminogruppe verändert auch die Übergangswahrscheinlichkeit; ein kleinerer Energieabstand allein erklärt keine höhere Bande.</p><p class="note">${norm?'Hier wird jede Bande durch ihren eigenen Maximalwert geteilt und mit 100 % multipliziert. So ist die schwache Benzolbande gut erkennbar. Die Normierung entfernt bewusst die Information über die unterschiedliche Stärke: Gleich hohe Kurven bedeuten hier nicht gleich starke Absorption.':'Beide Kurven verwenden dieselbe ε-Skala, ohne getrennte Normierung. Deshalb erscheint Benzol klein: Das ist der reale Intensitätsunterschied, kein fehlendes Spektrum.'}</p><p class="small">PhotochemCAD · gemessene Spektren in Cyclohexan; Ausschnitt 250–310 nm. Verglichen wird die langwellige Bande, nicht das stärkste Maximum des gesamten UV-Spektrums.</p>`;
  }
  document.getElementById('amino-scale').onchange=draw;draw();
  const orbitals=document.createElement('div');orbitals.className='amino-orbitals';orbitals.innerHTML='<h3>Warum verschiebt sich die Bande? Ein Blick auf die Orbitale</h3><p>Ein Molekülorbital beschreibt einen möglichen räumlichen Zustand eines Elektrons im ganzen Molekül. Das <strong>HOMO</strong> ist das höchste besetzte, das <strong>LUMO</strong> das niedrigste unbesetzte Orbital. Licht kann das Molekül anregen: Ein Elektron erhält Energie und gelangt in einen zuvor unbesetzten Zustand.</p><p>Bei Anilin beteiligt sich das freie Elektronenpaar am konjugierten System. Dadurch ordnen sich die π-Energieniveaus neu. Im hier gezeigten vereinfachten Modell liegt das HOMO höher und der HOMO–LUMO-Abstand wird kleiner. So wird anschaulich, warum eine Anregung weniger Energie benötigen und die Absorption zu längeren Wellenlängen wandern kann.</p><h4>Alle π-Niveaus im direkten Vergleich</h4><p>Von unten nach oben werden die Orbitale mit Elektronen besetzt. Jeder Strich ist ein Orbital; zwei gleich hohe Striche sind zwei verschiedene Orbitale mit derselben Energie. Der farbige Pfeil führt jeweils vom höchsten besetzten zum niedrigsten unbesetzten Niveau. Klicke ein Niveau an, um sein räumliches Orbitalbild darunter zu sehen. Vergleiche die Pfeillängen auf derselben Energieskala.</p><div id="amino-energy"></div><p class="note">Gezeigt ist das vollständige <strong>π-MO-Schema des Lehrmodells</strong>, nicht das gesamte Molekül mit seinen zusätzlichen σ-Orbitalen. Die Pfeile zeigen die Modellanregung HOMO → LUMO; ihre Länge beschreibt einen Energieabstand, nicht die Wahrscheinlichkeit der Absorption.</p><div class="two"><article><h4>Wie verändert die Aminogruppe das π-System?</h4><p> Im Anilin überlappt sein p-Anteil mit den p-Orbitalen des Rings. Daraus entstehen sieben gemeinsame π-Molekülorbitale mit acht Elektronen. Das HOMO enthält auch Stickstoffanteile. Die langwellige Anregung wird überwiegend als <strong>π → π*</strong> zugeordnet, mit einem wesentlichen HOMO–LUMO-Beitrag. Die Beteiligung des freien Elektronenpaars verändert somit die Energieniveaus des gemeinsamen π-Systems.</p></article><article><h4>Warum ist Benzols Bande so schwach?</h4><p>Ein passender Energieabstand allein reicht nicht: Auch die räumliche Symmetrie entscheidet über die Übergangswahrscheinlichkeit. Benzols langwelliger elektronischer Übergang ist in der elektrischen Dipolnäherung symmetrieverboten. Molekülschwingungen koppeln an die Anregung und verleihen der Bande dennoch eine geringe Intensität. Durch die Aminogruppe ändern sich Symmetrie und Orbitalmischung; die entsprechende Anilinbande wird stärker. <strong>π → π* bedeutet daher nicht automatisch „stark erlaubt“.</strong></p></article></div><h4>Die Orbitale hinter den Niveaulinien</h4><div id="amino-orbital-grid" class="two"></div><p class="small">Orbitalfarben kennzeichnen die beiden Vorzeichen der Wellenfunktion, nicht positive und negative Ladung. Die Oberflächen sind qualitative π-LCAO-Modelle mit demselben Rechen- und Darstellungsverfahren wie im OrbitalLabor, keine experimentellen Elektronendichten.</p><details><summary>Wie genau hängen Modell und Messspektrum zusammen?</summary><p>Der HOMO–LUMO-Abstand ist eine Ein-Elektronen-Modellgröße. Das gemessene Absorptionsmaximum gehört zu einem Übergang des gesamten Moleküls und hängt auch von Elektronenwechselwirkungen, Schwingungen, Lösungsmittel und Auswahlregeln ab. Gerade Benzols langwellige Bande ist schwach. Deshalb setzen wir den Modellabstand nicht mit h · c₀ / λ des Messmaximums gleich und geben hier keine scheinbar gemessenen Orbitalenergien an. Die Intensität hängt zusätzlich von der Übergangswahrscheinlichkeit ab.</p></details><p><a href="orbital-labor.html">Im OrbitalLabor weiterforschen →</a> · <a href="https://doi.org/10.1016/0584-8539(67)80376-3" target="_blank" rel="noopener">Historische Bandzuordnung</a> · <a href="https://doi.org/10.1016/j.theochem.2005.06.006" target="_blank" rel="noopener">Anilin: ππ*-Zustände und HOMO–LUMO-Beitrag</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9476181/" target="_blank" rel="noopener">Benzol: schwache, schwingungsinduzierte Absorption</a></p>';
  card.append(orbitals);renderOrbitals().catch(e=>{document.getElementById('amino-orbital-grid').textContent='Die räumlichen Orbitalbilder konnten nicht geladen werden. Die Spektren bleiben bedienbar.';console.error(e);});
  const note=document.createElement('p');note.className='small';note.textContent='Zur Trennung von der benachbarten kurzwelligen Bande wird Anilin erst ab 265 nm gezeichnet; Benzol ab 250 nm. Die Daten werden dabei nur ausgeschnitten, nicht geglättet oder verschoben.';explanation.after(note);
  const modelNote=document.createElement('p');modelNote.textContent='Modellannahmen: Sechs p-Orbitale und sechs π-Elektronen für Benzol, ein zusätzliches p-Orbital mit zwei Elektronen für Anilin. Alle Nachbarkopplungen sind −1; die relativen Platzenergien betragen 0 am Kohlenstoff und −1 am Stickstoff. Diese dimensionslosen Lehrparameter sind nicht an Messdaten angepasst. Benzols HOMO und LUMO sind jeweils zweifach entartet; beide Vertreter werden als getrennte, gleich hohe Linien gezeigt und sind einzeln anwählbar.';orbitals.querySelector('details').append(modelNote);
  const style=document.createElement('style');style.textContent='#amino-energy{overflow-x:auto;margin:2rem 0}#amino-energy svg{display:block;width:100%;min-width:760px;height:auto;color:var(--ink)}.amino-orbitals{margin-top:3rem}.amino-orbitals canvas{display:block;background:rgba(120,140,150,.06);border-radius:1rem}.amino-orbitals figure{min-width:0}#aux-plot text{font-variant-numeric:lining-nums tabular-nums}#amino-energy svg{font-size:17px;fill:currentColor;color:var(--ink)}#amino-energy .mo-title{font-size:21px;font-weight:700}#amino-energy .mo-hit{fill:transparent;stroke:transparent}#amino-energy .mo-hit.chosen{fill:var(--paper);stroke:currentColor;stroke-width:1.5}#amino-energy .mo-level{cursor:pointer}#amino-energy .mo-level:focus{outline:none}#amino-energy .mo-level:focus .mo-hit{stroke:currentColor;stroke-width:3;stroke-dasharray:4 3}#amino-energy .mo-line{stroke-width:4;stroke:currentColor}#amino-energy .occupied .mo-line{stroke:#4e7478}#amino-energy .empty .mo-line{stroke:#ad7e91}#amino-energy .mo-spin{font-size:25px}#amino-energy .mo-excitation{color:#ae643a;stroke:currentColor;stroke-width:3;fill:none}.amino-orbitals [hidden]{display:none!important}.amino-orbitals h4{margin-top:1.7rem}.amino-orbitals .two{margin-block:1.5rem 2.5rem}';document.head.append(style);
}
export function aminoModels(C){
  return [false,true].map(amino=>{
    const atoms=Array.from({length:6},(_,i)=>[1.4*Math.cos(i*Math.PI/3),1.4*Math.sin(i*Math.PI/3),0]);if(amino)atoms.push([2.8,0,0]);
    const h=atoms.map((_,i)=>atoms.map((__,j)=>i===j?(i===6?-1:0):((i<6&&j<6&&(Math.abs(i-j)===1||Math.abs(i-j)===5))||((i===6&&j===0)||(i===0&&j===6)))?-1:0));
    const levels=C.eigenSymmetric(h).sort((a,b)=>a.energy-b.energy);const occupied=amino?4:3;
    return {levels:levels.map((level,k)=>({...level,count:k<occupied?2:0})),occupied,atoms};
  });
}
export function moDiagram(models,selected){
  const energies=models.flatMap(m=>m.levels.map(l=>l.energy)),lo=Math.min(...energies),hi=Math.max(...energies);
  const Y=e=>140+(hi-e)/(hi-lo)*530;
  let svg='<svg viewBox="0 0 1000 790" role="group" aria-label="Vollständige qualitative π-MO-Schemata von Benzol und Anilin auf gemeinsamer Energieskala"><defs><marker id="mo-up" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="currentColor"/></marker></defs><text x="25" y="30">Relative Energie ↑ · gemeinsame qualitative Skala, keine eV-Werte</text><path d="M35 705V70" stroke="currentColor" marker-end="url(#mo-up)"/>';
  models.forEach((m,i)=>{
    const left=90+i*500,rows=[];
    // Closely spaced, nondegenerate levels are staggered horizontally, never
    // moved vertically: preserve the common scale without overlapping targets.
    m.levels.forEach((level,index)=>{let row=rows.at(-1);if(!row||Math.abs(row.energy-level.energy)>.35){row={energy:level.energy,indices:[]};rows.push(row);}row.indices.push(index);});
    svg+=`<text class="mo-title" x="${left}" y="76">${i?'Anilin · 7 π-MOs, 8 Elektronen':'Benzol · 6 π-MOs, 6 Elektronen'}</text>`;
    rows.forEach(row=>row.indices.forEach((k,j)=>{
      const level=m.levels[k],pair=row.indices.length===2,x=left+(pair?j*160:80),width=pair?130:150,y=Y(level.energy),frontier=k===m.occupied-1||k===m.occupied;
      const suffix=k===m.occupied-1?' · HOMO':k===m.occupied?' · LUMO':'';
      const sameHomo=i===0&&k===m.occupied-2?' · HOMO':i===0&&k===m.occupied+1?' · LUMO':'';
      const label=`π${k+1}${level.count?'':'*'}${suffix||sameHomo}`,active=selected[i]===k;
      svg+=`<g class="mo-level ${level.count?'occupied':'empty'}" data-molecule="${i}" data-orbital="${k}" role="button" tabindex="0" aria-pressed="${active}" aria-label="${i?'Anilin':'Benzol'} ${label}, ${level.count} Elektronen: Orbitalbild anzeigen"><rect x="${x-10}" y="${y-32}" width="${width+20}" height="60" rx="9" class="mo-hit ${active?'chosen':''}"/><path d="M${x} ${y}h${width}" class="mo-line"/><text x="${x+width/2}" y="${y-12}" text-anchor="middle" class="mo-spin">${level.count?'↑↓':'—'}</text><text x="${x+width/2}" y="${y+26}" text-anchor="middle">${label}</text></g>`;
    }));
    const h=Y(m.levels[m.occupied-1].energy),l=Y(m.levels[m.occupied].energy),x=left+340;
    svg+=`<path class="mo-excitation" d="M${x} ${h}V${l+5}" marker-end="url(#mo-up)"/><text x="${x-12}" y="${(h+l)/2-6}" text-anchor="end">π → π*</text><text x="${x-12}" y="${(h+l)/2+18}" text-anchor="end">${i?'kleinerer':'größerer'} Abstand</text><text x="${left}" y="735">${i?'4 besetzte + 3 unbesetzte π-MOs':'3 besetzte + 3 unbesetzte π-MOs'}</text>`;
  });
  return svg+'<text x="90" y="775">↑↓ zwei Elektronen · — unbesetzt · Niveau anklicken: räumliches Orbitalbild unten</text></svg>';
}
async function renderOrbitals(){
  for(const file of ['core','surface','viewer','mini'])await load(`scripts/orbital-labor-${file}.js?v=20261016-9`);
  const C=window.OrbitalCore,T=window.THREE,models=aminoModels(C);
  const gap=m=>m.levels[m.occupied].energy-m.levels[m.occupied-1].energy;
  const energy=document.getElementById('amino-energy');
  const selected=models.map(m=>m.occupied-1),draw=()=>{energy.innerHTML=moDiagram(models,selected);};draw();
  energy.dataset.gaps=models.map(gap).join(',');
  // Use precisely the OrbitalLabor geometry: welded vertices and normals from
  // the signed wavefunction gradient. No deformation or smoothing of nodes.
  const calculator={cache:new Map(),pending:new Map(),nextId:0,worker:null,calculate:window.OrbitalViewer.prototype.calculate,geometry:window.OrbitalViewer.prototype.geometry};
  try{calculator.worker=new Worker('scripts/orbital-labor-worker.js?v=20261016-9');
    calculator.worker.onmessage=({data})=>{const job=calculator.pending.get(data.id);if(!job)return;calculator.pending.delete(data.id);data.error?job.reject(new Error(data.error)):job.resolve(data);};
    calculator.worker.onerror=()=>{calculator.worker?.terminate();calculator.worker=null;calculator.pending.forEach(job=>job.reject(new Error('Worker unavailable')));calculator.pending.clear();};
  }catch(_){/* The shared calculator has an asynchronous local fallback. */}
  const renderer=new window.OrbitalMiniRenderer(calculator),grid=document.getElementById('amino-orbital-grid');
  const previousHeading=grid.previousElementSibling;if(previousHeading?.tagName==='H4')previousHeading.remove();
  const previewHeading=document.createElement('h4');previewHeading.textContent='Orbitale ansehen · frei drehen und vergleichen';energy.after(previewHeading,grid);
  const dialog=document.createElement('dialog');dialog.className='amino-viewer-dialog';dialog.setAttribute('aria-label','Drehbares Molekülorbital');
  dialog.innerHTML='<button type="button" class="amino-close">Orbitalfenster schließen</button><div class="amino-dialog-body"></div>';
  document.body.append(dialog);let expanded=null;
  function expand(i){if(expanded!==null)return;expanded=i;dialog.querySelector('.amino-dialog-body').append(figures[i]);dialog.showModal();}
  function restore(){if(expanded===null)return;const i=expanded;expanded=null;grid.insertBefore(figures[i],i===0?figures[1]:null);energy.querySelector(`[data-molecule="${i}"][data-orbital="${selected[i]}"]`)?.focus({preventScroll:true});}
  dialog.querySelector('.amino-close').onclick=()=>dialog.close();dialog.addEventListener('close',restore);
  const figures=models.map((m,i)=>{
    const fig=document.createElement('figure');fig.className='mini-orbital';fig.style.margin='0';fig.innerHTML=`<figcaption></figcaption><label>Orbital von ${i?'Anilin':'Benzol'} auswählen<select class="amino-select"></select></label><div class="experiment-buttons"><button type="button" data-frontier="homo">HOMO ansehen</button><button type="button" data-frontier="lumo">LUMO ansehen</button><button type="button" class="amino-expand">Groß ansehen</button></div><div class="amino-orbital-holder"></div><p class="small mo-description" aria-live="polite"></p><p class="small">Mit Maus oder Finger drehen · +/− zum Zoomen · R richtet aus. Kupfer und Türkis zeigen die Vorzeichen der Wellenfunktion, keine Ladungen.</p>`;
    const dropdown=fig.querySelector('select');m.levels.forEach((l,k)=>dropdown.add(new Option(`π${k+1}${k>=m.occupied?'*':''} · ${l.count} Elektronen${k===m.occupied-1?' · HOMO':k===m.occupied?' · LUMO':''}`,k)));
    dropdown.onchange=()=>select(i,Number(dropdown.value));fig.querySelector('[data-frontier="homo"]').onclick=()=>select(i,m.occupied-1);fig.querySelector('[data-frontier="lumo"]').onclick=()=>select(i,m.occupied);fig.querySelector('.amino-expand').onclick=()=>expand(i);grid.append(fig);return fig;
  });
  const views=new Map();
  function select(i,k){
    selected[i]=k;const m=models[i],fig=figures[i],levelName=`π${k+1}${k>=m.occupied?'*':''}${k===m.occupied-1?' · HOMO':k===m.occupied?' · LUMO':''}`;
    fig.querySelector('figcaption').textContent=`${i?'Anilin':'Benzol'} · ${levelName}`;
    fig.querySelector('select').value=String(k);
    const nitrogen=i?(m.levels[k].coeff[6]**2):0;
    fig.querySelector('.mo-description').textContent=`${m.levels[k].count} Elektronen. ${i?(nitrogen<1e-5?'Dieses Orbital besitzt im Lehrmodell praktisch keinen Stickstoffanteil. Andere π-Orbitale nehmen das freie Paar in das gemeinsame System auf.':'Das Orbital enthält p-Beiträge von Ring und Stickstoff.'):'Gleich hohe Linien bezeichnen verschiedene, gleichenergetische Orbitale (Entartung).'} `;
    const holder=fig.querySelector('.amino-orbital-holder');holder.querySelectorAll('canvas').forEach(c=>c.hidden=true);
    const key=`${i}-${k}`;if(views.has(key)){const view=views.get(key);view.canvas.hidden=false;renderer.schedule(view);draw();return;}
    const canvas=document.createElement('canvas');canvas.style.cssText='width:100%;height:290px;touch-action:none';canvas.dataset.label=`${i?'Anilin':'Benzol'} ${levelName}`;holder.append(canvas);
    const bonds=Array.from({length:6},(_,k)=>[k,(k+1)%6]);if(i)bonds.push([0,6]);
    const level={...m.levels[k],basis:'ring',atoms:m.atoms,bonds,normals:m.atoms.map(()=>[0,0,1]),kind:k>=m.occupied?'antibonding':'bonding'};
    views.set(key,renderer.add(canvas,{mode:'mo',level,resolution:64,extent:4.6,threshold:.18}));draw();
  }
  models.forEach((m,i)=>select(i,m.occupied-1));
  function choose(event){const target=event.target.closest('[data-orbital]');if(!target)return;if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;event.preventDefault();const i=Number(target.dataset.molecule),k=Number(target.dataset.orbital);select(i,k);expand(i);}
  energy.addEventListener('click',choose);energy.addEventListener('keydown',choose);
}

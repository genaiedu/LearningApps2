/* Optical diagram adapted from TobiasFar, Aufbau UVVIS.gif (2004),
 * https://commons.wikimedia.org/wiki/File:Aufbau_UVVIS.gif
 * Diagram adaptation: CC BY-SA 3.0, https://creativecommons.org/licenses/by-sa/3.0/
 * Changes: new SVG drawing, digital ratio measurement instead of historical
 * comb-aperture balancing, controllable time multiplexing and sample attenuation.
 */
(function(){
  'use strict';
  const host=document.getElementById('device');let phase='probe',automatic=true,timer;
  function mount(){
    const section=document.createElement('div');section.className='optical-section';section.innerHTML=`
    <div class="optical-controls"><strong>Ein Detektor · zwei Lichtwege</strong><button id="optics-auto" aria-pressed="true">Animation pausieren</button><button id="optics-probe">Nur Messlösung</button><button id="optics-reference">Nur Vergleichslösung</button><button id="optics-next">Nächster Lichtweg</button></div>
    <svg id="optical-plan" viewBox="0 0 1260 610" role="img" aria-label="Animierter Zweistrahl-Strahlengang: Sektorspiegel schaltet zwischen Messlösung und Vergleichslösung; beide Wege treffen denselben Detektor.">
    <defs><linearGradient id="optics-white"><stop stop-color="#916aba"/><stop offset=".25" stop-color="#4f92c6"/><stop offset=".5" stop-color="#80b773"/><stop offset=".75" stop-color="#e3c467"/><stop offset="1" stop-color="#ce7357"/></linearGradient></defs>
    <g class="plan-lines" fill="none" stroke-width="2"><path d="M82 180H950V305M430 180V430H950V360"/><path class="electrical" d="M981 332H1025M1095 332H1135"/></g>
    <g class="plan-beams" fill="none" stroke="var(--beam)" stroke-width="6"><path d="M80 180H219" stroke="url(#optics-white)"/><path d="M285 180H430"/><g class="phase-probe"><path d="M430 180H711"/><path class="sample-out" d="M765 180H950V306"/></g><g class="phase-reference"><path d="M430 180V430H711"/><path d="M765 430H950V359"/></g></g>
    <g class="plan-motion" fill="none" stroke="#fff" stroke-width="2"><path d="M80 180H219M285 180H430"/><g class="phase-probe"><path d="M430 180H711"/><path class="sample-out" d="M765 180H950V306"/></g><g class="phase-reference"><path d="M430 180V430H711M765 430H950V359"/></g></g>
    <g class="components"><circle cx="70" cy="180" r="22"/><path d="M52 162L88 198M52 198L88 162" class="mirror"/><rect x="220" y="132" width="66" height="96" rx="4"/><path d="M233 195L272 151M234 183L267 147M239 200L278 156" class="grating"/>
    <circle cx="430" cy="180" r="30" class="sector-disc"/><path d="M407 157L453 203" class="mirror" id="sector-face"/><circle cx="430" cy="180" r="5"/>
    <path d="M404 404L456 456M925 155L975 205M925 455L975 405" class="mirror"/>
    <path d="M712 137V223H766V137M712 157Q739 171 766 157" class="cell-outline"/><path d="M716 162H762V219H716Z" class="sample-liquid"/>
    <path d="M712 388V474H766V388M712 408Q739 421 766 408" class="cell-outline"/><path d="M716 413H762V470H716Z" class="reference-liquid"/>
    <rect x="920" y="304" width="62" height="57" rx="4"/><rect x="1025" y="304" width="70" height="57" rx="4"/><rect x="1135" y="303" width="96" height="62" rx="4"/></g>
    <g class="plan-labels"><text x="70" y="115" text-anchor="middle">Lichtquelle</text><text x="253" y="100" text-anchor="middle">Monochromator</text><text x="430" y="100" text-anchor="middle">Sektorspiegel</text><text x="739" y="95" text-anchor="middle">Messlösung</text><text x="739" y="119" text-anchor="middle" class="plan-small">Probe · I</text><text x="950" y="115" text-anchor="middle">Spiegel</text><text x="430" y="487" text-anchor="middle">Spiegel</text><text x="739" y="514" text-anchor="middle">Vergleichslösung</text><text x="739" y="538" text-anchor="middle" class="plan-small">Referenz · I₀</text><text x="950" y="487" text-anchor="middle">Spiegel</text><text x="950" y="283" text-anchor="middle">Detektor</text><text x="1060" y="283" text-anchor="middle">Verstärker</text><text x="1183" y="283" text-anchor="middle">Auswertung</text><text x="1183" y="341" text-anchor="middle" class="plan-small">I / I₀ → A</text><text x="600" y="330" text-anchor="middle" id="optics-phase">Jetzt: Messlösung</text><text x="600" y="358" text-anchor="middle" class="plan-small" id="optics-value">Probe einsetzen, um ihre Abschwächung zu sehen.</text></g></svg>
    <p class="small">Der Sektorspiegel lenkt den Strahl <strong>abwechselnd</strong> durch Probe und Referenz. Die drei Spiegel führen beide Wege zu <strong>demselben Detektor</strong>. Graue Verbindungen nach dem Detektor sind elektrische Signalleitungen, keine Lichtstrahlen. Animation bewusst verlangsamt.</p>
    <p class="small">Schema angelehnt an <a href="https://commons.wikimedia.org/wiki/File:Aufbau_UVVIS.gif" target="_blank" rel="noopener noreferrer">TobiasFar · Aufbau UVVIS</a>, <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>. Bearbeitung unter derselben Lizenz: interaktive SVG-Neuzeichnung; digitale Verhältnisbildung statt historischer Kammblende.</p>`;
    host.append(section);
    document.getElementById('optics-auto').onclick=()=>{automatic=!automatic;sync();};
    document.getElementById('optics-probe').onclick=()=>{automatic=false;phase='probe';sync();};
    document.getElementById('optics-reference').onclick=()=>{automatic=false;phase='reference';sync();};
    document.getElementById('optics-next').onclick=()=>{automatic=false;phase=phase==='probe'?'reference':'probe';sync();};
    timer=setInterval(()=>{if(automatic&&host.classList.contains('inside')&&!document.hidden){phase=phase==='probe'?'reference':'probe';sync();}},1800);
    sync();
  }
  function sync(){const plan=document.getElementById('optical-plan');if(!plan)return;plan.dataset.phase=phase;plan.classList.toggle('paused',!automatic);document.getElementById('optics-auto').textContent=automatic?'Animation pausieren':'Animation fortsetzen';document.getElementById('optics-auto').setAttribute('aria-pressed',String(automatic));document.getElementById('optics-phase').textContent='Jetzt: '+(phase==='probe'?'Messlösung → I':'Vergleichslösung → I₀');}
  function update(reading){const text=document.getElementById('optics-value');if(!text)return;text.textContent=reading?'I₀ = 100 · I = '+reading.I.toLocaleString('de-DE',{maximumFractionDigits:2})+' · T = '+(reading.T*100).toLocaleString('de-DE',{maximumFractionDigits:2})+' %':'Probe einsetzen und Blank messen, um ihre Abschwächung zu sehen.';}
  window.UVVisOptics={mount,update,reset(){automatic=true;phase='probe';sync();}};
})();

(function(){
 'use strict';
 const descriptions={
  gas:'Trägergas · Helium: Der geregelte Gasstrom trägt die verdampfte Probe durch die Kapillare. Die Gasflasche steht bei realen Geräten meist neben dem Messplatz.',
  injector:'Autosampler & Injektor: Die Spritze entnimmt eine kleine Probe aus einem Vial und führt sie dem beheizten Injektor zu. Dort verdampft sie. Beim Split gelangt nur ein Teil auf die Säule; der Rest verlässt den Split-Ausgang.',
  column:'Säulenofen: Die aufgewickelte Kapillare trägt innen einen dünnen Film. Die Ofentemperatur steuert die Verteilung zwischen Film und Gas und damit die Retention. Die Säule ist hier stark vergrößert.',
  ms:'Massenspektrometer: Die beheizte Transferleitung führt zur EI-Ionenquelle. Danach trennen vier Quadrupolstäbe die Ionen nach m/z; der Detektor registriert sie. Das Vakuumsystem entfernt Gas. Innenaufbau und Größenverhältnisse sind vereinfacht.',
  fid:'Flammenionisationsdetektor: Der FID sitzt am Säulenausgang auf dem GC. Rechts ist er als vergrößerte Detailansicht gezeigt, nicht als zweites Tischgerät. Zusätzlicher Wasserstoff und Luft speisen die Flamme; entstehende Ionen erzeugen einen messbaren Strom.'
 };
 const vents=(x,y,w,rows,step=6)=>Array.from({length:rows},(_,i)=>`<rect x="${x}" y="${y+i*step}" width="${w}" height="2" rx="1" fill="#52616b" opacity=".7"/><path d="M${x} ${y+i*step+2.5}h${w}" stroke="#fff" opacity=".4"/>`).join('');
 const screws=points=>points.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.7" fill="#8d979b"/><path d="m${x-1.4} ${y}h2.8" stroke="#dce1e2" stroke-width=".8"/>`).join('');
 // One shallow parallel projection is shared by every housing face.
 const housing=(x,y,w,h)=>`<path d="M${x} ${y}l44-32h${w}l-44 32Z" fill="url(#gc-top)" stroke="#b2bbbf"/><path d="M${x+w} ${y}l44-32v${h}l-44 32Z" fill="url(#gc-side)" stroke="#a1acb1"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="url(#gc-front)" stroke="#aab4b8" stroke-width="1.5"/><path d="M${x+6} ${y+2}h${w-12}" stroke="#fff" stroke-width="2" opacity=".9"/>`;
 function coil(){
  return Array.from({length:361},(_,i)=>{const a=-Math.PI/2+i/360*Math.PI*12,r=89-i/360*24;return(i?'L':'M')+(340+Math.cos(a)*r).toFixed(2)+' '+(345+Math.sin(a)*r*.73).toFixed(2);}).join(' ');
 }
 function render(host,s,{inside=false,flow=false,running=false,cooling=false}={}){
  const ms=s.detector==='ms',cutaway=inside||flow,detector=ms?'ms':'fid',selected=host.dataset.selected||'';
  const part=(id,label,content)=>`<g data-part="${id}" role="button" tabindex="0" aria-label="${label}" aria-pressed="${selected===id}"><title>${label}</title>${content}</g>`;
  const gasIn='M94 268H126Q137 268 137 257V205Q137 194 148 194H304V223';
  const columnIn='M304 223V264Q304 280 340 280.03';
  const columnOut=ms?'M340 297.55Q375 278 414 278H473Q484 278 484 292V341H789':'M340 297.55Q375 278 414 278H550Q570 278 570 258V187';
  const captions=[['gas','01','Trägergas'],['injector','02','Autosampler'],['column','03','Säulenofen'],[detector,'04',ms?'Massenspektrometer':'FID · Detailansicht']];
  host.innerHTML=`<div class="device-stage">
  <div class="device-stage-caption"><span>GC LABOR / GERÄTEANSICHT</span><span>${cutaway?'SCHNITTANSICHT':'AUSSENANSICHT'}</span></div>
  <svg viewBox="0 0 1200 530" role="group" aria-labelledby="gc-device-title gc-device-summary">
   <title id="gc-device-title">Gaschromatograph mit Autosampler und ${ms?'Massenspektrometer':'Flammenionisationsdetektor'}</title>
   <desc id="gc-device-summary">Eigene, nicht maßstäbliche Geräteillustration. ${cutaway?'Verkleidung ausgeblendet; die vergrößerten Bauteile sind sichtbar.':'Die Bauteile lassen sich anklicken und mit der Tastatur auswählen.'} ${flow?'Gold zeigt den Gasweg; Türkis markiert im MS den Ionenweg.':''}</desc>
   <defs>
    <linearGradient id="gc-front" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#f8fafb"/><stop offset=".55" stop-color="#e5e9eb"/><stop offset="1" stop-color="#cbd3d7"/></linearGradient>
    <linearGradient id="gc-top" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#e4e9ec"/></linearGradient>
    <linearGradient id="gc-side" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="#bcc7cd"/><stop offset="1" stop-color="#919fa8"/></linearGradient>
    <linearGradient id="gc-graphite" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#48545f"/><stop offset=".5" stop-color="#303c47"/><stop offset="1" stop-color="#1c2731"/></linearGradient>
    <linearGradient id="gc-steel"><stop stop-color="#72858f"/><stop offset=".25" stop-color="#e5ecee"/><stop offset=".55" stop-color="#adbcc3"/><stop offset="1" stop-color="#586e7b"/></linearGradient>
    <linearGradient id="gc-copper"><stop stop-color="#896044"/><stop offset=".45" stop-color="#eac08b"/><stop offset="1" stop-color="#a06b44"/></linearGradient>
    <linearGradient id="gc-cylinder"><stop stop-color="#344c57"/><stop offset=".4" stop-color="#6b8590"/><stop offset=".65" stop-color="#506b78"/><stop offset="1" stop-color="#293d49"/></linearGradient>
    <radialGradient id="gc-cavity"><stop stop-color="#344550"/><stop offset="1" stop-color="#121e28"/></radialGradient>
    <radialGradient id="gc-flame"><stop stop-color="#ecfcff"/><stop offset=".35" stop-color="#84d5ff"/><stop offset=".7" stop-color="#3ca2dd"/><stop offset="1" stop-color="#247cac" stop-opacity=".05"/></radialGradient>
    <filter id="gc-ground-shadow" x="-.2" y="-1" width="1.4" height="3"><feGaussianBlur stdDeviation="9"/></filter>
    <clipPath id="gc-display-clip"><rect x="526" y="236" width="105" height="103" rx="6"/></clipPath>
    <clipPath id="gc-ms-label-clip"><rect x="773" y="271" width="326" height="80" rx="5"/></clipPath>
   </defs>
   <path d="M15 492H1185" stroke="#c3cbcd" stroke-width="1"/>
   <ellipse cx="660" cy="494" rx="503" ry="13" fill="#263c49" opacity=".22" filter="url(#gc-ground-shadow)"/>
   <ellipse cx="60" cy="491" rx="38" ry="7" fill="#263c49" opacity=".18" filter="url(#gc-ground-shadow)"/>
   ${part('gas','Trägergasflasche · Helium',`
    <rect x="33" y="281" width="54" height="204" rx="23" fill="url(#gc-cylinder)" stroke="#405862"/>
    <path d="M39 310h42m-42 143h42" stroke="#8399a2" stroke-width="2" opacity=".4"/>
    <rect x="48" y="260" width="24" height="29" rx="3" fill="url(#gc-steel)"/>
    <rect x="54" y="246" width="12" height="22" rx="2" fill="#b69459"/>
    <path d="M46 249h28m-14-7v14" stroke="#a87944" stroke-width="5" stroke-linecap="round"/>
    <circle cx="88" cy="252" r="17" fill="#dce4e6" stroke="#6d7e86" stroke-width="3"/><circle cx="88" cy="252" r="12.5" fill="#fafcf9"/>
    <path d="M78 253a10 10 0 0 1 18-5m-8 4 6-6" stroke="#647d7e" stroke-width="1.5"/>
    <rect x="42" y="345" width="36" height="57" rx="3" fill="#e8eeeb" opacity=".95"/>
    <text x="60" y="370" text-anchor="middle" fill="#2b4653" font-size="21" font-weight="700">He</text><text x="60" y="390" text-anchor="middle" fill="#496372" font-size="9">TRÄGERGAS</text>
    <path d="M40 478h40" stroke="#273d49" stroke-width="6" stroke-linecap="round"/>
   `)}
   <path d="${gasIn}" stroke="#7d919c" stroke-width="4" stroke-linejoin="round"/>
   ${housing(165,210,490,275)}
   <rect x="173" y="467" width="474" height="18" rx="2" fill="#303e49"/><path d="M179 466h461" stroke="#b38255" stroke-width="2"/>
   <rect x="190" y="485" width="47" height="8" rx="3" fill="#26353f"/><rect x="584" y="485" width="47" height="8" rx="3" fill="#26353f"/>
   ${screws([[180,225],[640,225],[180,452],[640,452]])}
   ${part('column','Säulenofen mit Kapillarsäule',cutaway?`
    <rect x="187" y="234" width="318" height="217" rx="8" fill="#87949c"/><rect x="194" y="241" width="304" height="203" rx="5" fill="url(#gc-cavity)" stroke="#c0c9ce"/>
    <g opacity=".45" stroke="#60727d" stroke-width="3"><circle cx="340" cy="345" r="87" fill="none"/><path d="M255 345h170m-85-84v169M278 284l124 124m-124 0 124-124"/></g>
    <path d="${columnIn}" stroke="url(#gc-copper)" stroke-width="3"/><path d="${coil()}" stroke="#1a242c" stroke-width="7"/><path d="${coil()}" stroke="url(#gc-copper)" stroke-width="3.5"/><path d="${columnOut}" stroke="url(#gc-copper)" stroke-width="3"/>
    <rect x="213" y="414" width="146" height="22" rx="3" fill="#14232e"/><text x="225" y="429" fill="#dce8e9" font-size="12">KAPILLARE · ${s.length} m</text>
    ${screws([[205,253],[486,253],[205,432],[486,432]])}
   `:`
    <rect x="187" y="234" width="318" height="217" rx="8" fill="#76848e" opacity=".45"/><rect x="189" y="235" width="314" height="213" rx="7" fill="url(#gc-front)" stroke="#b5bfc5"/>
    <path d="M199 241h291" stroke="#fff" stroke-width="2"/><rect x="207" y="253" width="265" height="80" rx="4" fill="url(#gc-graphite)"/>
    <text x="225" y="280" fill="#c7d2d8" font-size="11" letter-spacing="1.5">CAPILLARY CHROMATOGRAPH</text><text x="224" y="312" fill="#f1f5f6" font-size="25" letter-spacing="1">GC LABOR</text>
    <rect x="482" y="274" width="12" height="113" rx="5" fill="#26343f"/><path d="M485 281v96" stroke="#63737d" stroke-width="2"/>
    ${vents(213,355,254,11,5)}
    <text x="213" y="432" fill="#536674" font-size="11" letter-spacing="1">SÄULENOFEN</text><circle cx="465" cy="426" r="3.5" fill="#7ca9a4"/>
   `)}
   <rect id="gc-display-bounds" x="526" y="236" width="105" height="103" rx="6" fill="#152631" stroke="#60717c"/>
   <g clip-path="url(#gc-display-clip)"><text x="540" y="256" fill="#a5b8c2" font-size="9" letter-spacing="1.3">OFEN</text><text id="device-temperature" data-fits="gc-display-bounds" x="540" y="285" fill="#e1f3f0" font-size="23">${s.temperature} °C</text><path d="M540 300h77" stroke="#3d5563"/><circle cx="543" cy="318" r="3" fill="${cooling?'#9ac9e4':running?'#e1b371':'#86bdb2'}"/><text x="554" y="322" fill="#b3d6cf" font-size="10">${cooling?'KÜHLT AB':running?'MESSUNG':'GC · '+(ms?'MS':'FID')}</text></g>
   <g fill="#f1f4f5" stroke="#aab7bf">${Array.from({length:6},(_,i)=>`<rect x="${531+i%3*33}" y="${356+Math.floor(i/3)*24}" width="27" height="17" rx="3"/>`).join('')}</g>
   <path d="M540 364h9m24 0h8m24 0h8m-73 24h9m24 0h8m24 0h8" stroke="#6e808b" stroke-width="2"/><circle cx="579" cy="422" r="13" fill="#e7ecee" stroke="#99a9b2"/><path d="M579 413v8m-6-5a9 9 0 1 0 12 0" stroke="#637c88" stroke-width="1.5"/>
   ${part('injector','Autosampler mit Spritze und beheiztem Injektor',`
    <path d="M278 43l16-11h42l16 13v140l-16 12h-58Z" fill="url(#gc-side)" stroke="#a4b2ba"/><rect x="278" y="43" width="58" height="153" rx="7" fill="url(#gc-front)" stroke="#aebac2"/><path d="M336 46v137" stroke="#263641" stroke-width="9"/>
    <rect x="291" y="61" width="28" height="104" rx="5" fill="#243541"/><g class="${running?'syringe-inject':''}"><path d="M305 69v20m-7-20h14" stroke="#d3dfe1" stroke-width="3"/><rect x="300" y="91" width="10" height="45" rx="2" fill="#d1e9e9" stroke="#8db0b7"/><path d="M302 99h5m-5 9h5m-5 9h5m-2 20v31" stroke="#8babb4" stroke-width="1.3"/></g>
    <rect x="273" y="181" width="68" height="23" rx="5" fill="url(#gc-graphite)"/><rect x="291" y="201" width="27" height="20" rx="3" fill="url(#gc-steel)"/><path d="M304 219v20" stroke="#c6a479" stroke-width="5"/>
    <ellipse cx="390" cy="192" rx="50" ry="14" fill="#24343e"/><rect x="340" y="183" width="100" height="10" fill="#536570"/><ellipse cx="390" cy="183" rx="50" ry="14" fill="url(#gc-steel)" stroke="#6e828e"/>
    ${Array.from({length:10},(_,i)=>{const a=i/10*Math.PI*2,x=390+Math.cos(a)*37,y=181+Math.sin(a)*9;return`<rect x="${x-3.5}" y="${y-13}" width="7" height="14" rx="1.5" fill="#b9d6dc" stroke="#7e9da8" stroke-width=".7"/><rect x="${x-4}" y="${y-15}" width="8" height="4" rx="1" fill="#425965"/>`;}).join('')}<circle cx="390" cy="182" r="6" fill="#506674"/>
    ${cutaway?'<path d="M318 229h60v-21h29" stroke="#b99c73" stroke-width="2.5"/><text x="412" y="213" fill="#496271" font-size="11">Split</text>':''}
   `)}
   ${ms?part('ms','Massenspektrometer mit beheizter Transferleitung',`
    <rect x="691" y="326" width="67" height="31" rx="5" fill="url(#gc-copper)" stroke="#9b856b"/><path d="M702 331v20m8-20v20m8-20v20m8-20v20m8-20v20m8-20v20" stroke="#d5c5a8" stroke-width="1.5"/>
    ${housing(750,247,378,238)}
    <rect x="758" y="467" width="362" height="18" rx="2" fill="#303e49"/><path d="M764 466h350" stroke="#b38255" stroke-width="2"/>
    ${cutaway?`
     <rect x="766" y="266" width="337" height="186" rx="7" fill="url(#gc-cavity)" stroke="#8596a1" stroke-width="3"/><text x="780" y="282" fill="#aebfc9" font-size="10" letter-spacing="1.4">VAKUUMKAMMER</text>
     <rect x="779" y="294" width="311" height="87" rx="16" fill="#14212c" stroke="#536d7b"/><path d="M751 341h41" stroke="#d6a369" stroke-width="3"/>
     <rect x="791" y="320" width="38" height="40" rx="6" fill="url(#gc-steel)" stroke="#b5c1c5"/><path d="M802 327v25m8-25v25m8-25v25" stroke="#e5c07b" stroke-width="2"/><path d="M829 340h33" stroke="#8eaebb" stroke-width="2"/>
     <g stroke="url(#gc-steel)" stroke-width="9" stroke-linecap="round"><path d="M863 318h126M863 330h126M863 351h126M863 363h126"/></g>
     <path d="M1003 341h22l12-19v38l-12-19" fill="#b7b29b" stroke="#ebd5a9" stroke-width="2"/><path d="M1043 340h20v-30" stroke="#708e9c" stroke-width="2"/>
     <text x="811" y="400" text-anchor="middle" fill="#e3edf0" font-size="12">EI-Quelle</text><text x="924" y="400" text-anchor="middle" fill="#e3edf0" font-size="12">Quadrupol</text><text x="1052" y="400" text-anchor="middle" fill="#e3edf0" font-size="12">Detektor</text>
     <path d="M924 382v35H836" stroke="#7b909d" stroke-width="6"/><rect x="785" y="418" width="51" height="24" rx="7" fill="url(#gc-steel)"/><circle cx="847" cy="430" r="13" fill="#718895" stroke="#c2cdd0"/><path d="M839 430h16m-8-8v16" stroke="#ccd6d8" stroke-width="2"/><text x="875" y="435" fill="#b9cbd4" font-size="12">Vakuumsystem</text>
    `:`
     <rect id="gc-ms-label-bounds" x="773" y="271" width="326" height="80" rx="5" fill="url(#gc-graphite)"/>
     <g clip-path="url(#gc-ms-label-clip)"><text data-fits="gc-ms-label-bounds" x="792" y="306" fill="#edf4f4" font-size="26" letter-spacing="1">GC–MS</text><text data-fits="gc-ms-label-bounds" x="792" y="331" fill="#c1d3d9" font-size="14">EI · 70 eV · Quadrupol</text><circle cx="1077" cy="294" r="4" fill="${running?'#e1b371':'#83b9ae'}"/></g>
     ${vents(779,374,310,12,5)}
     <text x="780" y="451" fill="#556b78" font-size="11" letter-spacing="1">MASSENSPEKTROMETER</text>${screws([[765,260],[1113,260],[765,451],[1113,451]])}
    `}
    <rect x="775" y="485" width="47" height="8" rx="3" fill="#26353f"/><rect x="1060" y="485" width="47" height="8" rx="3" fill="#26353f"/>
   `):part('fid','FID am GC und vergrößerte Detektoransicht',`
    <path d="M554 188v-35h32v35" fill="url(#gc-steel)" stroke="#8498a2"/><ellipse cx="570" cy="153" rx="16" ry="6" fill="#d2dde1" stroke="#8d9fa8"/><ellipse cx="570" cy="153" rx="7" ry="3" fill="#253946"/><rect x="548" y="185" width="44" height="16" rx="3" fill="#536875"/>
    <path d="M590 168H705L760 233" stroke="#8c9ea6" stroke-width="1.5" stroke-dasharray="5 5"/>
    <rect x="756" y="233" width="394" height="239" rx="12" fill="#e8eef0" stroke="#a9b9c1"/><text x="777" y="259" fill="#49626f" font-size="12" letter-spacing="1">FID · VERGRÖSSERTE DETAILANSICHT</text>
    <rect x="777" y="275" width="217" height="176" rx="6" fill="url(#gc-cavity)"/><path d="M849 387q-33-44 21-91 49 47 20 91Z" fill="url(#gc-flame)"/>
    <path d="M869 432v-44h12v44m52-119v95" stroke="url(#gc-steel)" stroke-width="6"/><path d="M875 432H791m84-23h-56m62 0h93" stroke="#88a9b8" stroke-width="2.5"/><path d="M933 330h57v-17h35" stroke="#bba36f" stroke-width="2"/>
    <text x="1021" y="338" fill="#385362" font-size="13">Ionenstrom</text><text x="1010" y="401" fill="#385362" font-size="12">H₂ + Luft</text><text x="800" y="444" fill="#c3d6df" font-size="11">Säulenausgang</text>
   `)}
   ${flow?`<g pointer-events="none"><path d="${gasIn}" class="gas-path" stroke="#ffd18b" stroke-width="4"/><path d="${columnIn}" class="gas-path" stroke="#ffd18b" stroke-width="4"/><path d="${coil()}" class="gas-path" stroke="#ffd18b" stroke-width="4"/><path d="${columnOut}" class="gas-path" stroke="#ffd18b" stroke-width="4"/>${ms?'<path d="M831 340H1035" class="ion-path" stroke="#80d8db" stroke-width="3"/><path d="M924 382v35H836" class="gas-path" stroke="#ffd18b" stroke-width="3"/>':'<circle cx="570" cy="166" r="7" fill="#ffd18b"/>'}</g>`:''}
  </svg></div>
  <div class="device-parts" role="group" aria-label="Gerätebauteil erklären">${captions.map(([id,num,label])=>`<button type="button" data-part="${id}" aria-pressed="${selected===id}"><span>${num}</span>${label}</button>`).join('')}</div>
  ${flow?'<p class="device-flow-key"><i></i>Gasweg'+(ms?' <i class="ion"></i>Ionenweg im Vakuum':'')+' <span>Wege und Bauteile vergrößert, nicht maßstäblich.</span></p>':''}`;
  host.querySelectorAll('[data-part]').forEach(el=>{
   const act=()=>{
    host.dataset.selected=el.dataset.part;
    host.querySelectorAll('[data-part]').forEach(p=>p.setAttribute('aria-pressed',String(p.dataset.part===el.dataset.part)));
    document.getElementById('device-description').textContent=descriptions[el.dataset.part];
   };
   el.addEventListener('click',act);
   if(el.tagName.toLowerCase()==='g')el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();act();}});
  });
 }
 window.GCDevice={render};
})();

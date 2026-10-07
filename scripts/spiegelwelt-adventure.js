(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  if(!$('auto-adventure'))return;
  // Dimensionless qualitative model, not an experimentally fitted rate law.
  function reaction(seed=0,oxalic=20){return {p:1,m:seed,o:oxalic,t:0};}
  function step(s,dt=.025){const converted=Math.min(s.p,s.o/2.5,(.018+.85*s.m)*s.o/20*s.p*dt);s.p-=converted;s.m+=converted;s.o-=2.5*converted;s.t+=dt;return s;}
  let stage=0,running=false,raf=0,previous=0,first=null,second=null,active=[];
  const instructions=[
    ['01 / 05','Gib die erste Portion dazu.','Klicke auf die violette Flasche. Gefäß A enthält frische, angesäuerte Oxalsäurelösung im Überschuss.'],
    ['02 / 05','Noch einmal dieselbe Portion.','Etwas Oxalsäure ist verbraucht. Wird dieselbe Permanganat-Portion nun langsamer reagieren? Klicke erneut auf die violette Flasche.'],
    ['03 / 05','Ein Verdacht ist noch kein Beweis.','War es Mn²⁺ – oder etwa Erwärmung? Klicke auf „Vergleich vorbereiten“. Wir vergleichen zwei frische Lösungen bei gleicher Temperatur.'],
    ['04 / 05','Verändere nur eine Bedingung.','Gib mit der Mangan(II)-Flasche Mn²⁺ ausschließlich zu Gefäß B. Gefäß C bleibt die frische Kontrolle.'],
    ['05 / 05','Starte den Vergleich gleichzeitig.','Klicke auf die violette Flasche: B und C erhalten gleich große Permanganat-Portionen. Oxalsäure, Säurebedingungen, Temperatur und Verdünnung sind vergleichbar.'],
    ['✓','Jetzt treffen Beobachtung und Erklärung zusammen.','Lies die Auflösung darunter. Kein Spiegelbild wurde ausgewählt: Hier geht es allein um die katalytische Wirkung eines Reaktionsprodukts.']
  ];
  function render(){const [n,t,p]=instructions[stage];$('auto-stage').textContent=n;$('auto-title').textContent=t;$('auto-instruction').textContent=p;$('auto-perm').disabled=running||![0,1,4].includes(stage);$('auto-manganese').disabled=running||stage!==3;$('auto-control').disabled=running||stage!==2;}
  function color(id,p){const el=$('auto-beaker-'+id);el.style.setProperty('--purple',String(Math.max(0,p)));el.classList.toggle('reacting',running&&p>.01);}
  function log(str){const li=document.createElement('li');li.textContent=str;$('auto-log').append(li);}
  function finish(){running=false;cancelAnimationFrame(raf);active.forEach(a=>{color(a.id,0);});if(stage===0){first=active[0].s;log('A · Erste Portion: zunächst langsam, dann schneller. Violett verschwindet; Mn²⁺ ist entstanden.');$('auto-caption-a').textContent='Nach erster Reaktion: Mn²⁺ vorhanden, Oxalsäure weiterhin im Überschuss';stage=1;}else if(stage===1){second=active[0].s;log('A · Zweite Portion: schneller entfärbt, obwohl weniger Oxalsäure vorhanden ist.');$('auto-caption-a').textContent='Nach zweiter Reaktion: noch mehr Mn²⁺';stage=2;}else{log('B mit Mn²⁺: schnell entfärbt. C ohne Zusatz: längere Anlaufphase. Alle übrigen Bedingungen sind gleich.');$('auto-caption-b').textContent='Mn²⁺-Zusatz beschleunigt auch einen frischen Ansatz';stage=5;$('auto-conclusion').hidden=false;}$('auto-observation').textContent=stage===5?'Der Kontrollversuch stützt die Erklärung: Das entstehende Mn²⁺ wirkt katalytisch mit.':'Beobachtung abgeschlossen. Du entscheidest über den nächsten Schritt.';render();}
  function frame(now){const dt=previous?Math.min((now-previous)/1000,.08):0;previous=now;active.forEach(a=>{if(a.s.p>.01){for(let i=0;i<Math.ceil(dt*120);i++)step(a.s,.025);color(a.id,a.s.p);}else color(a.id,0);});if(active.every(a=>a.s.p<=.01)){finish();return;}raf=requestAnimationFrame(frame);}
  function start(){if(running)return;running=true;previous=0;if(stage===0)active=[{id:'a',s:reaction()}];else if(stage===1)active=[{id:'a',s:reaction(first.m,first.o)}];else active=[{id:'b',s:reaction(1)},{id:'c',s:reaction()}];active.forEach(a=>color(a.id,1));$('auto-observation').textContent=stage===4?'Beobachte B und C: In welchem Gefäß verschwindet Violett zuerst?':'Beobachte die violette Farbe. Die Animation zeigt einen qualitativen Verlauf, keine reale Messzeit.';render();raf=requestAnimationFrame(frame);}
  $('auto-perm').onclick=start;
  $('auto-control').onclick=()=>{stage=3;$('auto-card-b').hidden=false;$('auto-card-c').hidden=false;$('auto-observation').textContent='B und C sind frische Ansätze. Gleiche Temperatur; gleiche Säurebedingungen; gleiche Oxalsäuremenge.';render();};
  $('auto-manganese').onclick=()=>{stage=4;$('auto-caption-b').textContent='Mn²⁺ zugesetzt · noch keine Permanganat-Portion';$('auto-observation').textContent='Nur B enthält zusätzlich Mn²⁺. Seine schwache Eigenfarbe wird im Modell nicht dargestellt.';render();};
  $('auto-reset').onclick=()=>{cancelAnimationFrame(raf);stage=0;running=false;active=[];first=second=null;$('auto-log').replaceChildren();$('auto-card-b').hidden=true;$('auto-card-c').hidden=true;$('auto-conclusion').hidden=true;['a','b','c'].forEach(id=>color(id,0));$('auto-caption-a').textContent='Frische Oxalsäure · noch kein Mn²⁺ zugesetzt';$('auto-caption-b').textContent='Gleiche Ausgangsbedingungen';$('auto-observation').textContent='Labor zurückgesetzt. Du entscheidest, wann der Versuch beginnt.';render();};
  document.addEventListener('visibilitychange',()=>{previous=0;});
  render();
})();

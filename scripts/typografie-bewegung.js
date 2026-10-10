(function(){
  'use strict';
  const M=window.TypoMotion,$=id=>document.getElementById(id);
  if(!M||!$('kinetic-svg'))return;
  const svg=$('kinetic-svg'),canvas=$('animation-canvas'),play=$('image-motion-toggle'),slider=$('kinetic-time');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),buttons=[...document.querySelectorAll('[data-kinetic-scene]')];
  let time=6,requested=false,visible=false,narrow=canvas.clientWidth<600,raf=0,last=null,started=false,previousScene=-1;
  const el={paper:$('kinetic-paper'),clip:$('kinetic-clip-rect'),color:$('kinetic-color'),amp:$('kinetic-amp'),words:[0,1,2].map(i=>$('kinetic-word-'+i)),kicker:$('kinetic-kicker'),copy:$('kinetic-copy'),action:$('kinetic-action'),guides:$('kinetic-guides'),annotation:$('kinetic-annotation')};
  const rounded=n=>Number(n.toFixed(3));
  function rect(element,[x,y,width,height]){for(const [key,n]of Object.entries({x,y,width,height}))element.setAttribute(key,rounded(n));}
  function transform(element,[x,y,rotation=0]){element.setAttribute('transform','translate('+rounded(x)+' '+rounded(y)+') rotate('+rounded(rotation)+')');}
  function state(){return {requested,reduced:reduced.matches,paused:document.body.classList.contains('motion-paused'),visible,hidden:document.hidden,time};}
  function draw(){
    const f=M.frame(time,narrow);
    svg.setAttribute('viewBox',f.camera.map(rounded).join(' '));
    rect(el.paper,f.paper);rect(el.clip,f.paper);rect(el.color,f.color);
    for(let i=0;i<3;i++){transform(el.words[i],f.words[i]);el.words[i].firstElementChild.setAttribute('font-size',rounded(f.words[i][3]));}
    transform(el.kicker,f.kicker);transform(el.copy,f.copy);transform(el.action,f.action);
    el.amp.setAttribute('x',rounded(f.amp[0]));el.amp.setAttribute('y',rounded(f.amp[1]));el.amp.setAttribute('font-size',rounded(f.amp[3]));
    el.amp.setAttribute('transform','rotate('+rounded(f.amp[2])+' '+rounded(f.amp[0])+' '+rounded(f.amp[1])+')');
    el.guides.setAttribute('opacity',rounded(f.guides));el.annotation.setAttribute('opacity',narrow?0:rounded(f.annotation));
    slider.value=time.toFixed(1);
    const label=time.toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1})+' / 24 s';
    $('kinetic-time-value').textContent=label;slider.setAttribute('aria-valuetext',label);
    if(previousScene!==f.index){
      previousScene=f.index;$('kinetic-scene-label').textContent=f.title;$('kinetic-scene-note').textContent=f.note;
      for(const b of buttons)b.setAttribute('aria-pressed',String(Number(b.dataset.kineticScene)===f.index));
    }
  }
  function tick(now){
    raf=0;if(!M.running(state()))return;
    if(last!==null)time=M.advance(time,(now-last)/1000);last=now;draw();
    if(time>=M.duration){requested=false;sync('Die Folge ist beendet. Wähle einen Schritt oder starte sie erneut.');}
    else raf=requestAnimationFrame(tick);
  }
  function sync(message){
    const s=state(),moving=M.running(s);canvas.dataset.moving=String(moving);
    play.disabled=s.reduced||s.paused;play.setAttribute('aria-pressed',String(requested));
    play.textContent=requested?'Animation anhalten':time>=M.duration?'Animation erneut starten':'Animation starten';
    if(!moving){if(raf)cancelAnimationFrame(raf);raf=0;last=null;}
    else if(!raf){last=null;raf=requestAnimationFrame(tick);}
    const text=s.reduced?'Bewegung reduzieren ist eingeschaltet. Wähle die Schritte als Standbilder oder benutze den Zeitregler.':s.paused?'Die globale Animationspause ist aktiv. Standbilder und Zeitregler bleiben benutzbar.':message||(moving?'Die Folge läuft einmal durch. Du kannst sie jederzeit anhalten.':requested?'Außerhalb des sichtbaren Bereichs ist die Folge pausiert.':'Die Folge ist angehalten. Alle Schritte bleiben einzeln erreichbar.');
    if($('image-motion-status').textContent!==text)$('image-motion-status').textContent=text;
  }
  play.addEventListener('click',()=>{
    if(play.disabled)return;
    if(!started||time>=M.duration){time=0;draw();}started=true;requested=!requested;sync();
  });
  function seek(value){started=true;requested=false;time=M.time(value);draw();sync('Standbild: '+M.frame(time).title+'. Mit dem Zeitregler kannst du den Übergang untersuchen.');}
  slider.addEventListener('input',()=>seek(slider.value));
  for(const b of buttons)b.addEventListener('click',()=>seek(M.scenes[Number(b.dataset.kineticScene)].at));
  $('kinetic-reset').addEventListener('click',()=>seek(0));
  addEventListener('typography-motion-change',()=>sync());
  reduced.addEventListener('change',()=>{if(reduced.matches)requested=false;sync();});
  document.addEventListener('visibilitychange',()=>sync());
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.05}).observe(canvas);
  new ResizeObserver(()=>{narrow=canvas.clientWidth<600;draw();}).observe(canvas);
  draw();sync();
})();

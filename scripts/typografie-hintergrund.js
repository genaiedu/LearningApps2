(function(){
  'use strict';
  const B=window.TypoBackground,C=window.TypoCore,$=id=>document.getElementById(id);
  if(!B||!C||!$('bg-scroll'))return;
  const scroll=$('bg-scroll'),symbol=$('bg-symbol'),documentLayer=$('bg-document'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const names=['glyph','font','theme','tone','strength','size','x','y','width','mode','speed'];
  let current=B.settings(),frame=0;
  const decimal=(v,d=0)=>Number(v).toLocaleString('de-DE',{maximumFractionDigits:d});
  const allowed=()=>!reduced.matches&&!document.body.classList.contains('motion-paused');
  function read(){const o={};for(const key of names)o[key]=$('bg-'+key).value;o.shield=$('bg-shield').checked;o.visible=$('bg-visible').checked;return B.settings(o);}
  function write(o){const s=B.settings(o);for(const key of names)$('bg-'+key).value=s[key];$('bg-shield').checked=s.shield;$('bg-visible').checked=s.visible;}
  function position(){
    const g=B.geometry(current,scroll.clientWidth,scroll.clientHeight,scroll.scrollTop,allowed());
    symbol.style.fontSize=g.fontSize+'px';symbol.style.top=g.top+'px';symbol.style.left=g.left+'%';symbol.style.transform='translate(-50%, calc(-50% + '+g.shift+'px))';
    $('bg-scroll-distance').textContent=decimal(scroll.scrollTop)+' px Text / '+decimal(scroll.scrollTop*g.speed)+' px Zeichen';
    const max=scroll.scrollHeight-scroll.clientHeight;
    $('bg-progress').style.width=(max>0?scroll.scrollTop/max*100:0)+'%';frame=0;
  }
  function update(){
    current=read();const theme=B.themes[current.theme],mark=B.color(theme.background,current.tone,current.strength);
    scroll.style.width=current.width+'px';documentLayer.style.setProperty('--bg-paper',theme.background);documentLayer.style.setProperty('--bg-ink',theme.ink);
    symbol.textContent=current.glyph;symbol.hidden=!current.visible;symbol.style.color=mark;symbol.style.fontFamily='"'+current.font+'"';symbol.style.fontWeight=B.fonts[current.font];
    documentLayer.classList.toggle('bg-shielded',current.shield);
    for(const key of ['strength','size','x','y'])$('bg-'+key+'-value').textContent=decimal(current[key])+' %';
    $('bg-speed-value').textContent=decimal(current.speed*100)+' %';
    $('bg-speed').disabled=current.mode!=='parallax'||!allowed();
    const report=$('bg-report'),ratio=C.contrast(mark,theme.background),worst=C.contrast(theme.ink,theme.background),over=C.contrast(theme.ink,mark);
    const minimum=current.visible&&!current.shield?Math.min(worst,over):worst;
    report.replaceChildren();
    for(const message of [
      'Zeichen / Grund: '+decimal(ratio,2)+':1 · '+mark.toUpperCase()+' auf '+theme.background.toUpperCase()+'.',
      'Lesetext: mindestens '+decimal(minimum,2)+':1 gegen die hier verwendeten Flächenfarben. '+(minimum>=4.5?'Das Farbminimum für normalen Webtext ist erreicht.':'Zu wenig Kontrast für normalen Webtext – Zeichen zurücknehmen oder Lesefläche einschalten.'),
      current.mode==='parallax'?(allowed()?'Parallaxe: Bei 100 px Scrollweg bewegt sich der Text um 100 px, das Zeichen um '+decimal(current.speed*100)+' px.':reduced.matches?'Bewegung reduzieren ist aktiv: Das Zeichen scrollt ohne Parallaxeffekt mit dem Text.':'Die globale Animationspause ist aktiv: Das Zeichen scrollt ohne Parallaxeffekt mit dem Text.'):'Gleiche Geschwindigkeit: Zeichen und Text scrollen gemeinsam; es entsteht keine relative Tiefenbewegung.'
    ]){const p=document.createElement('p');p.textContent=message;report.append(p);}
    report.dataset.state=minimum>=4.5?'pass':'warning';position();
  }
  for(const key of names)$('bg-'+key).addEventListener('input',update);
  for(const id of ['bg-shield','bg-visible'])$(id).addEventListener('change',update);
  scroll.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(position);},{passive:true});
  const presets={center:{...B.defaults},edge:{...B.defaults,x:5,size:230,strength:10},right:{...B.defaults,x:95,size:230,strength:10},depth:{...B.defaults,theme:'night',tone:'lighter',x:94,size:250,mode:'parallax',speed:.3}};
  document.querySelectorAll('[data-bg-preset]').forEach(button=>button.addEventListener('click',()=>{write(presets[button.dataset.bgPreset]||B.defaults);scroll.scrollTop=0;update();}));
  $('bg-reset').addEventListener('click',()=>{write(B.defaults);scroll.scrollTop=0;update();});
  $('bg-top').addEventListener('click',()=>scroll.scrollTo({top:0,behavior:'instant'}));
  $('bg-next').addEventListener('click',()=>scroll.scrollBy({top:Math.round(scroll.clientHeight*.65),behavior:'instant'}));
  addEventListener('typography-motion-change',update);reduced.addEventListener('change',update);
  new ResizeObserver(position).observe(scroll);write(B.defaults);update();
})();

(function(){
  'use strict';
  const A=window.TypoAppearance,$=id=>document.getElementById(id);
  if(!A||!$('theme-toggle')||!$('page-glyph-toggle'))return;
  const root=document.documentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let current=A.settings(),pending=0;
  const layers=[];
  for(const chapter of A.chapters){
    const host=$(chapter.id);if(!host)continue;
    host.classList.add('page-glyph-host');
    const layer=document.createElement('div'),glyph=document.createElement('span');
    layer.className='page-glyph-window';layer.dataset.side=chapter.side;layer.setAttribute('aria-hidden','true');
    glyph.className='page-glyph';glyph.textContent=chapter.glyph;glyph.style.fontFamily='"'+chapter.font+'"';
    layer.append(glyph);host.prepend(layer);layers.push({layer,glyph});
  }
  const active=new Set();
  const observer=new IntersectionObserver(entries=>{
    for(const e of entries)e.isIntersecting?active.add(e.target):active.delete(e.target);schedule();
  },{rootMargin:'180px 0px'});
  for(const {layer} of layers)observer.observe(layer);
  function draw(){
    pending=0;const enabled=current.glyphs&&!reduced.matches&&!document.body.classList.contains('motion-paused');
    for(const {layer,glyph} of layers){
      if(!enabled||active.has(layer))glyph.style.setProperty('--page-drift',A.shift(layer.getBoundingClientRect().top,innerHeight,enabled)+'px');
    }
  }
  function schedule(){if(!pending)pending=requestAnimationFrame(draw);}
  function apply(o={},announce=true){
    const next=A.settings({...current,...o}),changed=next.theme!==current.theme||next.glyphs!==current.glyphs;current=next;
    root.dataset.theme=current.theme;root.classList.toggle('page-glyphs-off',!current.glyphs);
    for(const button of document.querySelectorAll('#theme-toggle,[data-page-theme]'))button.setAttribute('aria-pressed',String(current.theme==='dark'));
    for(const button of document.querySelectorAll('#page-glyph-toggle,[data-page-glyphs]'))button.setAttribute('aria-pressed',String(current.glyphs));
    schedule();
    if(changed&&announce){$('appearance-status').textContent=(current.theme==='dark'?'Dunkle':'Helle')+' Ansicht. Randzeichen '+(current.glyphs?'eingeblendet.':'ausgeblendet.');}
    if(changed)dispatchEvent(new Event('typography-appearance-change'));
  }
  function resize(){root.style.setProperty('--page-width',root.clientWidth+'px');schedule();}
  for(const button of document.querySelectorAll('#theme-toggle,[data-page-theme]'))button.addEventListener('click',()=>apply({theme:current.theme==='dark'?'light':'dark'}));
  for(const button of document.querySelectorAll('#page-glyph-toggle,[data-page-glyphs]'))button.addEventListener('click',()=>apply({glyphs:!current.glyphs}));
  // Same-origin device previews use the same appearance without persistent storage.
  A.current=()=>({...current});A.apply=apply;
  addEventListener('scroll',()=>{if(current.glyphs)schedule();},{passive:true});
  addEventListener('resize',resize,{passive:true});
  addEventListener('typography-motion-change',schedule);reduced.addEventListener('change',schedule);
  new ResizeObserver(resize).observe(document.body);document.fonts.ready.then(resize);
  apply({},false);resize();
})();

(function(){
  'use strict';
  const A=window.TypoAppearance,$=id=>document.getElementById(id);
  if(!A||!$('theme-toggle')||!$('page-glyph-toggle')||!$('appearance-dialog'))return;
  const root=document.documentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const dialog=$('appearance-dialog'),openers=document.querySelectorAll('#theme-toggle,[data-page-theme]');
  let current=A.settings(),pending=0,lastOpener=null;
  for(const palette of A.palettes){
    const card=document.createElement('section'),title=document.createElement('h3'),note=document.createElement('p'),choices=document.createElement('div');
    card.className='appearance-palette';title.textContent=palette.name;note.textContent=palette.note;
    choices.className='appearance-pair';choices.setAttribute('role','group');choices.setAttribute('aria-label',palette.name);
    for(const mode of ['light','dark']){
      const button=document.createElement('button'),sample=document.createElement('span'),label=document.createElement('span'),mark=document.createElement('span');
      button.type='button';button.className='appearance-option';button.dataset.paletteChoice=palette.id;button.dataset.themeChoice=mode;
      button.setAttribute('aria-label',palette.name+' · '+(mode==='light'?'Hell':'Dunkel'));button.setAttribute('aria-pressed','false');
      button.style.setProperty('--choice-bg',palette[mode].paper);button.style.setProperty('--choice-ink',palette[mode].ink);button.style.setProperty('--choice-accent',palette[mode].red);
      sample.className='appearance-sample';sample.textContent='Aa';sample.setAttribute('aria-hidden','true');
      label.className='appearance-label';label.textContent=mode==='light'?'Hell':'Dunkel';
      mark.className='appearance-selected';mark.textContent='✓';mark.setAttribute('aria-hidden','true');
      button.append(sample,label,mark);choices.append(button);
      button.addEventListener('click',()=>apply({palette:palette.id,theme:mode}));
    }
    card.append(title,note,choices);$('appearance-choices').append(card);
  }
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
  function readerStatus(){
    const target=$('reader-appearance-state');if(!target)return;
    const palette=A.palettes.find(p=>p.id===current.palette);
    const text=palette.name+' · '+(current.theme==='dark'?'Dunkel':'Hell')+'. Randzeichen '+(current.glyphs?'sichtbar':'ausgeblendet')+'. Animation '+(document.body.classList.contains('motion-paused')?'pausiert':'freigegeben')+'.';
    if(target.textContent!==text)target.textContent=text;
  }
  addEventListener('typography-motion-change',readerStatus);
  function apply(o={},announce=true){
    const next=A.settings({...current,...o}),changed=next.palette!==current.palette||next.theme!==current.theme||next.glyphs!==current.glyphs;current=next;
    const palette=A.palettes.find(p=>p.id===current.palette),description=palette.name+' · '+(current.theme==='dark'?'Dunkel':'Hell');
    root.dataset.palette=current.palette;root.dataset.theme=current.theme;root.classList.toggle('page-glyphs-off',!current.glyphs);
    for(const button of openers){button.setAttribute('aria-label','Farbschema wählen, aktuell: '+description);button.title='Farbschema wählen · '+description;}
    for(const button of dialog.querySelectorAll('[data-palette-choice]'))button.setAttribute('aria-pressed',String(button.dataset.paletteChoice===current.palette&&button.dataset.themeChoice===current.theme));
    $('appearance-current').textContent='Aktuell: '+description;
    for(const button of document.querySelectorAll('#page-glyph-toggle,[data-page-glyphs]'))button.setAttribute('aria-pressed',String(current.glyphs));
    schedule();
    if(changed&&announce){$('appearance-status').textContent=description+'. Randzeichen '+(current.glyphs?'eingeblendet.':'ausgeblendet.');}
    readerStatus();
    if(changed)dispatchEvent(new Event('typography-appearance-change'));
  }
  function resize(){root.style.setProperty('--page-width',root.clientWidth+'px');schedule();}
  for(const button of openers)button.addEventListener('click',()=>{
    lastOpener=button;dialog.showModal();for(const opener of openers)opener.setAttribute('aria-expanded','true');
    dialog.querySelector('[data-palette-choice][aria-pressed=true]')?.focus();
  });
  $('appearance-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{for(const opener of openers)opener.setAttribute('aria-expanded','false');lastOpener?.focus();});
  for(const button of document.querySelectorAll('#page-glyph-toggle,[data-page-glyphs]'))button.addEventListener('click',()=>apply({glyphs:!current.glyphs}));
  // Same-origin device previews use the same appearance without persistent storage.
  A.current=()=>({...current});A.apply=apply;
  addEventListener('scroll',()=>{if(current.glyphs)schedule();},{passive:true});
  addEventListener('resize',resize,{passive:true});
  addEventListener('typography-motion-change',schedule);reduced.addEventListener('change',schedule);
  new ResizeObserver(resize).observe(document.body);document.fonts.ready.then(resize);
  apply({},false);resize();
})();

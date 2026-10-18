(function(){
  'use strict';
  const A=window.TypoAppearance,$=id=>document.getElementById(id);
  if(!A||!$('theme-toggle')||!$('page-glyph-toggle')||!$('appearance-dialog'))return;
  const root=document.documentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const dialog=$('appearance-dialog'),openers=document.querySelectorAll('#theme-toggle,[data-page-theme]');
  const appearanceKey='typografie-atelier-appearance',preview=new URLSearchParams(location.search).get('format-preview')==='1';
  let saved=null;
  if(!preview)try{saved=JSON.parse(localStorage.getItem(appearanceKey));}catch(_){}
  let current=A.settings(saved),pending=0,lastOpener=null;
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
    layer.append(glyph);host.prepend(layer);layers.push({layer,glyph,chapter});
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
    const position=A.positions.find(p=>p.id===current.glyphPosition).name;
    const fonts=A.fontPair(current);
    const text=palette.name+' · '+(current.theme==='dark'?'Dunkel':'Hell')+'. Schriften: '+fonts.sans.name+' und '+fonts.serif.name+'. Randzeichen '+(current.glyphs?'sichtbar: '+position:'ausgeblendet')+'. Animation '+(document.body.classList.contains('motion-paused')?'pausiert':'freigegeben')+'.';
    if(target.textContent!==text)target.textContent=text;
  }
  addEventListener('typography-motion-change',readerStatus);
  function apply(o={},announce=true){
    const next=A.settings({...current,...o}),changed=Object.keys(next).some(key=>next[key]!==current[key]);current=next;
    if(changed&&!preview)try{localStorage.setItem(appearanceKey,JSON.stringify(current));}catch(_){}
    const palette=A.palettes.find(p=>p.id===current.palette),description=palette.name+' · '+(current.theme==='dark'?'Dunkel':'Hell');
    const fonts=A.fontPair(current),fontDescription=fonts.sans.name+' und '+fonts.serif.name;
    root.style.setProperty('--sans',fonts.sans.stack);root.style.setProperty('--serif',fonts.serif.stack);
    root.style.setProperty('--editorial-serif',fonts.serif.editorialStack);
    $('appearance-sans').value=current.sansFont;$('appearance-serif').value=current.serifFont;
    $('appearance-sans-name').textContent=fonts.sans.name;$('appearance-serif-name').textContent=fonts.serif.name;
    root.dataset.palette=current.palette;root.dataset.theme=current.theme;root.classList.toggle('page-glyphs-off',!current.glyphs);
    for(const button of openers){button.setAttribute('aria-label','Darstellung wählen, aktuell: '+description+', '+fontDescription);button.title='Schriften, Farbschema und Randzeichen · '+description;}
    for(const button of dialog.querySelectorAll('[data-palette-choice]'))button.setAttribute('aria-pressed',String(button.dataset.paletteChoice===current.palette&&button.dataset.themeChoice===current.theme));
    $('appearance-current').textContent='Aktuell: '+description+'. Schriften: '+fontDescription+'.';
    for(const button of document.querySelectorAll('#page-glyph-toggle,[data-page-glyphs]'))button.setAttribute('aria-pressed',String(current.glyphs));
    for(const {layer,chapter} of layers){
      const place=A.placement(chapter.side,current);layer.dataset.side=place.side;
      layer.style.setProperty('--page-glyph-x',place.x+'%');layer.style.setProperty('--page-glyph-y',place.y+'%');
    }
    $('appearance-glyphs').checked=current.glyphs;
    $('appearance-position').value=current.glyphPosition;$('appearance-position').disabled=!current.glyphs;
    $('appearance-inset').value=current.glyphInset;$('appearance-inset').disabled=!current.glyphs||current.glyphPosition==='center';
    $('appearance-height').value=current.glyphHeight;$('appearance-height').disabled=!current.glyphs;
    $('appearance-inset-value').textContent=current.glyphInset+' %';$('appearance-height-value').textContent=current.glyphHeight+' %';
    $('appearance-inset').setAttribute('aria-valuetext',current.glyphInset+' Prozent Abstand zur Seitenkante');
    $('appearance-height').setAttribute('aria-valuetext',current.glyphHeight+' Prozent der Kapitel-Dekorationshöhe');
    schedule();
    if(changed&&announce){$('appearance-status').textContent=description+'. Schriften: '+fontDescription+'. Randzeichen '+(current.glyphs?'eingeblendet.':'ausgeblendet.');}
    readerStatus();
    if(changed)dispatchEvent(new Event('typography-appearance-change'));
  }
  function resize(){root.style.setProperty('--page-width',root.clientWidth+'px');schedule();}
  for(const button of openers)button.addEventListener('click',()=>{
    lastOpener=button;dialog.showModal();for(const opener of openers)opener.setAttribute('aria-expanded','true');
    $('appearance-sans').focus();
  });
  $('appearance-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{for(const opener of openers)opener.setAttribute('aria-expanded','false');lastOpener?.focus();});
  for(const button of document.querySelectorAll('#page-glyph-toggle,[data-page-glyphs]'))button.addEventListener('click',()=>apply({glyphs:!current.glyphs}));
  $('appearance-sans').addEventListener('change',()=>apply({sansFont:$('appearance-sans').value}));
  $('appearance-serif').addEventListener('change',()=>apply({serifFont:$('appearance-serif').value}));
  for(const [id,key] of [['appearance-sans-reset','sansFont'],['appearance-serif-reset','serifFont']]){
    $(id).addEventListener('click',()=>apply({[key]:A.settings()[key]}));
  }
  $('appearance-glyphs').addEventListener('change',()=>apply({glyphs:$('appearance-glyphs').checked}));
  $('appearance-position').addEventListener('change',()=>apply({glyphPosition:$('appearance-position').value}));
  for(const [id,key] of [['appearance-inset','glyphInset'],['appearance-height','glyphHeight']]){
    $(id).addEventListener('input',()=>apply({[key]:$(id).value},false));
    $(id).addEventListener('change',()=>{$('appearance-status').textContent='Randzeichen: '+A.positions.find(p=>p.id===current.glyphPosition).name+'. Randabstand '+current.glyphInset+' Prozent, Höhe '+current.glyphHeight+' Prozent.';});
  }
  $('appearance-position-reset').addEventListener('click',()=>{const s=A.settings();apply({glyphPosition:s.glyphPosition,glyphInset:s.glyphInset,glyphHeight:s.glyphHeight});});
  // Same-origin device previews use the same appearance without persistent storage.
  A.current=()=>({...current});A.apply=apply;
  addEventListener('scroll',()=>{if(current.glyphs)schedule();},{passive:true});
  addEventListener('resize',resize,{passive:true});
  addEventListener('typography-motion-change',schedule);reduced.addEventListener('change',schedule);
  new ResizeObserver(resize).observe(document.body);document.fonts.ready.then(resize);
  apply({},false);resize();
})();

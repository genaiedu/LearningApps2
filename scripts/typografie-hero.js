(function(){
  'use strict';
  const H=window.TypoHero,A=window.TypoAppearance;
  if(!H||!A||!document.querySelector('[data-hero-morph]'))return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),ns='http://www.w3.org/2000/svg';
  const active=new Set(),views=new Map();let data,pairs,time=0,previous=0,raf=0,lastPaint=0;
  const observer=new IntersectionObserver(entries=>{
    for(const e of entries)e.isIntersecting?active.add(e.target):active.delete(e.target);
    schedule();
  });
  function prepare(scene){
    const slot=scene.querySelector('[data-hero-satz]'),words=H.text.split(' ');
    slot.replaceChildren();
    const nodes=words.map(word=>{const n=document.createElementNS(ns,'text');n.dataset.heroWord='';n.textContent=word;slot.append(n);return n;});
    // Real rendered advances: no moving bitmap or reflowing a whole paragraph.
    const widths=nodes.map(n=>n.getComputedTextLength()),rows=H.lines(widths);
    const layouts=Object.fromEntries(['block','left','center'].map(mode=>[mode,H.positions(rows,widths,mode)]));
    return {scene,nodes,layouts,path:scene.querySelector('[data-hero-outline]'),font:scene.querySelector('[data-hero-font]'),satz:scene.querySelector('[data-hero-satz-label]'),colorLabel:scene.querySelector('[data-hero-palette-label]'),colors:[...scene.querySelectorAll('[data-hero-color]')]};
  }
  function discover(){
    for(const [scene] of views)if(!scene.isConnected){observer.unobserve(scene);active.delete(scene);views.delete(scene);}
    for(const scene of document.querySelectorAll('[data-hero-morph]'))if(!views.has(scene)){views.set(scene,prepare(scene));observer.observe(scene);}
    paint(true);schedule();
  }
  function paint(all=false){
    const p=H.phase(time),satz=H.setting(time),theme=document.documentElement.dataset.theme==='dark'?'dark':'light';
    const from=A.palettes[p.index],to=A.palettes[p.next],colors=H.palette(from[theme],to[theme],p.t);
    const reading=A.palettes.find(palette=>palette.id===document.documentElement.dataset.palette)||A.palettes.find(palette=>palette.id===A.settings().palette);
    const readingColors=H.palette(reading[theme],reading[theme],0);
    const path=data?H.outline(pairs[p.index],p.t):null;
    for(const [scene,v] of views){
      if(!all&&!active.has(scene))continue;
      if(path){v.path.setAttribute('d',path);scene.querySelector('[data-hero-fallback]').setAttribute('display','none');v.font.textContent=p.t===0?data.families[p.index].name:p.t===1?data.families[p.next].name:data.families[p.index].name+' → '+data.families[p.next].name;}
      v.nodes.forEach((n,i)=>{const a=v.layouts[satz.from][i],b=v.layouts[satz.to][i];n.setAttribute('x',H.lerp(a.x,b.x,satz.t).toFixed(2));n.setAttribute('y',a.y);});
      v.satz.textContent=satz.label;
      const followsReading=Boolean(scene.closest('[data-hero-palette="reading"]')),sceneColors=followsReading?readingColors:colors;
      v.colorLabel.textContent=(followsReading?reading.name:p.t===0?from.name:p.t===1?to.name:from.name+' → '+to.name)+' / '+(theme==='dark'?'Dunkel':'Hell');
      for(const element of v.colors){element.setAttribute('fill',sceneColors[element.dataset.heroColor]);element.style.fill=sceneColors[element.dataset.heroColor];}
      scene.dataset.heroTime=time.toFixed(2);scene.dataset.heroState=paused()?'paused':'playing';
    }
  }
  function paused(){return reduced.matches||document.hidden||document.body.classList.contains('motion-paused');}
  function tick(now){
    raf=0;
    if(paused()||!active.size){previous=0;paint(true);return;}
    if(previous)time=(time+Math.min(now-previous,100)/1000)%H.duration;
    previous=now;
    if(now-lastPaint>=1000/30){paint();lastPaint=now;}
    raf=requestAnimationFrame(tick);
  }
  function schedule(){
    if(paused()||!active.size){if(raf)cancelAnimationFrame(raf);raf=0;previous=0;paint(true);return;}
    if(!raf){previous=0;raf=requestAnimationFrame(tick);}
  }
  addEventListener('typography-motion-change',schedule);
  addEventListener('typography-appearance-change',()=>paint(true));
  addEventListener('typography-hero-preview-change',discover);
  document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',schedule);
  discover();
  document.fonts.load('12.8px "Source Sans 3"').then(()=>{for(const scene of views.keys())views.set(scene,prepare(scene));paint(true);});
  fetch('data/typografie-hero.json?v=20261010-morph-v3',{credentials:'omit'}).then(r=>{if(!r.ok)throw Error('Outline data unavailable');return r.json();}).then(d=>{
    if(d.families.length!==4||d.families.some(f=>f.contours.length!==2))throw Error('Invalid outline data');
    data=d;pairs=d.families.map((f,i)=>H.pair(f.contours,d.families[(i+1)%d.families.length].contours));paint(true);
  }).catch(()=>{ /* A real local a remains visible if the optional outline data cannot load. */ });
})();

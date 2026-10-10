(function(){
  'use strict';
  const F=window.TypoFormats,$=id=>document.getElementById(id);
  if(!F)return;
  const origin=location.origin;
  const targetOrigin=origin==='null'?'*':origin;
  const embedded=new URLSearchParams(location.search).get('format-preview')==='1';
  if(embedded){
    document.documentElement.classList.add('format-preview');
    let parentPaused=false,pending=0;
    function report(){
      if(parent===window)return;
      parent.postMessage({type:'typography-format-status',width:innerWidth,height:innerHeight,contentWidth:document.documentElement.scrollWidth},targetOrigin);pending=0;
    }
    function schedule(){if(!pending)pending=requestAnimationFrame(report);}
    addEventListener('message',event=>{
      if(event.source!==parent||event.origin!==origin||event.data?.type!=='typography-format-config')return;
      const s=F.settings(event.data);
      if(event.data.appearance&&window.TypoAppearance?.apply)window.TypoAppearance.apply(event.data.appearance,false);
      if(typeof event.data.paused==='boolean'&&event.data.paused!==parentPaused){
        parentPaused=event.data.paused;
        const button=$('motion-toggle');if(button&&document.body.classList.contains('motion-paused')!==parentPaused)button.click();
      }
      if(event.data.jump===true){const anchor=$(s.scene==='herobereiche'?'hero-vergleich':s.scene);if(anchor)anchor.scrollIntoView({block:'start',behavior:'instant'});}
      schedule();
    });
    addEventListener('resize',schedule,{passive:true});addEventListener('load',schedule);
    new ResizeObserver(schedule).observe(document.body);document.fonts.ready.then(schedule);schedule();return;
  }
  if(!$('format-stage'))return;
  const stage=$('format-stage'),frame=$('format-frame'),shell=$('format-device');
  let current=F.settings(),started=false,ready=false,reported=null;
  function config(jump=false){if(ready)frame.contentWindow.postMessage({type:'typography-format-config',...current,jump,paused:document.body.classList.contains('motion-paused'),appearance:window.TypoAppearance?.current?.()},targetOrigin);}
  function sizing(){
    const d=F.dimensions(current),factor=F.scale(current,Math.max(1,stage.clientWidth-48),Math.max(1,stage.clientHeight-48));
    frame.style.width=d.width+'px';frame.style.height=d.height+'px';frame.style.transform='scale('+factor+')';
    shell.style.width=(d.width*factor)+'px';shell.style.height=(d.height*factor)+'px';shell.dataset.device=current.device;
    $('format-size').textContent=d.width+' × '+d.height+' CSS-Pixel';
    $('format-scale').textContent=current.view==='actual'?'1:1 · keine Verkleinerung':'Überblick · '+Math.round(factor*100)+' % Anzeigegröße';
  }
  function status(){
    const d=F.dimensions(current);
    $('format-jump').disabled=!ready;
    $('format-status').textContent=!started?'Die vollständige Seite wird erst beim Starten der Vorschau ein zweites Mal geladen.':!ready?'Die Seite für die Formatvorschau wird geladen …':reported?'Tatsächliches Browserfenster: '+reported.width+' × '+reported.height+' CSS-Pixel. '+(reported.contentWidth>reported.width+1?'An dieser Seite gibt es einen horizontalen Überstand. Prüfe, ob er auf eine bewusst zweidimensionale Grafik begrenzt ist.':'Kein horizontaler Seitenüberstand in dieser Ansicht.'):'Die Vorschau ist geladen. Scrolle und bediene die Seite innerhalb des Rahmens.';
    frame.title='Vollständiges Typografie-Atelier · '+d.name+' · '+d.width+' × '+d.height;
  }
  function update(o={},jump=false){
    current=F.settings({...current,...o});const d=F.dimensions(current);
    document.querySelectorAll('[data-format-device]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.formatDevice===current.device)));
    $('format-rotate').disabled=!d.rotatable;$('format-rotate').setAttribute('aria-pressed',String(current.rotated));
    $('format-scene').value=current.scene;$('format-view').value=current.view;$('format-observation').textContent=d.note;
    sizing();config(jump);status();
  }
  function start(){
    if(started)return;started=true;ready=false;
    $('format-placeholder').hidden=true;$('format-frame').hidden=false;$('format-start').hidden=true;$('format-stop').hidden=false;
    frame.src='typografie-atelier.html?format-preview=1';status();
  }
  function stop(){
    started=false;ready=false;reported=null;frame.removeAttribute('src');frame.hidden=true;
    $('format-placeholder').hidden=false;$('format-start').hidden=false;$('format-stop').hidden=true;status();
  }
  frame.addEventListener('load',()=>{if(!started)return;ready=true;config(true);status();});
  addEventListener('message',event=>{
    if(!started||event.source!==frame.contentWindow||event.origin!==origin||event.data?.type!=='typography-format-status')return;
    const r=event.data;if(![r.width,r.height,r.contentWidth].every(v=>Number.isFinite(v)&&v>0&&v<20000))return;
    reported=r;ready=true;status();
  });
  document.querySelectorAll('[data-format-device]').forEach(b=>b.addEventListener('click',()=>update({device:b.dataset.formatDevice,rotated:false},true)));
  $('format-rotate').addEventListener('click',()=>update({rotated:!current.rotated},true));
  $('format-scene').addEventListener('change',()=>update({scene:$('format-scene').value},true));
  $('format-view').addEventListener('change',()=>update({view:$('format-view').value}));
  $('format-start').addEventListener('click',start);$('format-stop').addEventListener('click',stop);
  $('format-jump').addEventListener('click',()=>config(true));
  $('format-reset').addEventListener('click',()=>{update(F.settings(),true);stage.scrollTo({left:0,top:0,behavior:'instant'});});
  addEventListener('typography-motion-change',()=>config());
  addEventListener('typography-appearance-change',()=>config());
  new ResizeObserver(sizing).observe(stage);update();
})();

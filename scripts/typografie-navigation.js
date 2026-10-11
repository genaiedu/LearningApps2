/* Confined to the example window: never navigates or scrolls the host page. */
(function(){
  'use strict';
  const N=window.TypoNavigation;
  if(!N)return;
  document.querySelectorAll('[data-nav-demo]').forEach(root=>{
    const find=selector=>root.querySelector(selector),all=selector=>[...root.querySelectorAll(selector)];
    const controls=find('.nav-demo-controls'),shell=find('.nav-demo-shell'),frame=find('.nav-demo-window');
    const viewport=find('.nav-demo-viewport'),bar=find('.nav-demo-bar'),floating=find('.nav-demo-floating');
    const trigger=find('.nav-demo-menu'),drawer=find('.nav-demo-drawer'),status=find('.nav-demo-status');
    const fields=Object.fromEntries(['mode','width','side','size'].map(key=>[key,find('[data-nav-setting="'+key+'"]')]));
    const headings=all('[data-nav-heading]'),links=all('[data-nav-target]'),chapterLinks=all('nav [data-nav-target]');
    let current=N.settings(),open=false;
    function currentChapter(){
      // Allow subpixel scroll rounding at a freshly focused chapter target.
      const edge=viewport.getBoundingClientRect().top+parseFloat(frame.style.getPropertyValue('--nav-top')||0)+14;
      const index=N.activeIndex(headings.map(h=>h.getBoundingClientRect().top),edge);
      chapterLinks.forEach(link=>{
        if(link.dataset.navTarget===headings[index].id)link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      });
      find('.nav-demo-location').textContent='Du liest: '+headings[index].dataset.navHeading;
    }
    function reserve(){
      const height=bar.hidden?0:Math.ceil(bar.getBoundingClientRect().height)+24;
      const top=current.mode==='bottom'?16:height;
      const bottom=current.mode==='bottom'?height:24;
      frame.style.setProperty('--nav-top',top+'px');frame.style.setProperty('--nav-bottom',bottom+'px');
      currentChapter();
    }
    function update(){
      const padding=getComputedStyle(shell);
      const available=shell.clientWidth-(parseFloat(padding.paddingLeft)||0)-(parseFloat(padding.paddingRight)||0);
      const g=N.geometry(current,available,open);
      frame.style.width=g.width+'px';frame.style.setProperty('--nav-size',current.size+'px');
      frame.dataset.mode=current.mode;frame.dataset.push=String(g.push);frame.dataset.compact=String(g.compact);
      floating.hidden=current.mode==='side';trigger.hidden=current.mode!=='side';
      drawer.hidden=current.mode!=='side'||!open;
      trigger.setAttribute('aria-expanded',String(open&&current.mode==='side'));
      trigger.querySelector('span').textContent=open?'Inhalt schließen':'Inhalt öffnen';
      fields.side.disabled=current.mode!=='side';
      reserve();
      status.textContent=(current.mode==='top'?'Schwebende Leiste oben.':current.mode==='bottom'?'Schwebende Leiste unten.':'Seitenmenü '+(open?'geöffnet.':'eingeklappt.'))+' '+Math.round(g.width)+' px Beispielbreite; '+current.size+' px Lesetext. '+
        (current.mode==='side'&&current.side==='push'&&g.compact?'Bei dieser Breite überlagert das Menü den Text vorübergehend; nebeneinander wäre zu wenig Leseraum.':g.push?'Das Menü schiebt die Lesefläche zur Seite; der Text bricht neu um.':current.mode==='side'&&open?'Das Menü liegt über dem Text. Schließe es zum Weiterlesen.':'Die Steuerung bleibt innerhalb dieses Beispiels erreichbar.');
    }
    function close(returnFocus=false){
      if(!open)return;
      const focusWasInside=drawer.contains(document.activeElement);
      open=false;update();
      if(returnFocus||focusWasInside)trigger.focus({preventScroll:true});
    }
    for(const [key,field]of Object.entries(fields)){
      field.value=String(current[key]);
      field.addEventListener('change',()=>{
        close();current=N.settings(Object.fromEntries(Object.entries(fields).map(([k,f])=>[k,f.value])));update();
      });
    }
    trigger.addEventListener('click',()=>{open=!open;update();});
    root.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close(true);}
    });
    root.addEventListener('focusin',event=>{
      if(open&&!drawer.contains(event.target)&&event.target!==trigger)close();
    });
    links.forEach(link=>link.addEventListener('click',event=>{
      const target=headings.find(h=>h.id===link.dataset.navTarget);if(!target)return;
      event.preventDefault();close();reserve();
      const top=target.getBoundingClientRect().top-viewport.getBoundingClientRect().top+viewport.scrollTop-parseFloat(frame.style.getPropertyValue('--nav-top'))-12;
      viewport.scrollTo({top:Math.max(0,top),behavior:'instant'});target.focus({preventScroll:true});currentChapter();
    }));
    find('[data-nav-reset]').addEventListener('click',()=>{
      close();current=N.settings();for(const [key,field]of Object.entries(fields))field.value=String(current[key]);
      viewport.scrollTo({top:0,behavior:'instant'});update();
    });
    viewport.addEventListener('scroll',currentChapter,{passive:true});
    // Closing a panel on outside focus preserves a non-modal, ordinary Tab sequence.
    root.addEventListener('focusout',event=>{if(open&&event.relatedTarget&&!root.contains(event.relatedTarget))close();});
    controls.hidden=false;bar.hidden=false;update();
    if(typeof ResizeObserver!=='undefined'){
      new ResizeObserver(update).observe(shell);
      new ResizeObserver(reserve).observe(bar);
    }else window.addEventListener('resize',update);
  });
})();

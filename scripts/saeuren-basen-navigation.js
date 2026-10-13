/* In-page navigation only: it never modifies answers or laboratory state. */
(()=>{
  'use strict';
  const aside=document.getElementById('acid-side-nav'),toggle=document.getElementById('acid-nav-toggle'),panel=document.getElementById('acid-nav-panel'),nav=document.getElementById('acid-nav-links');
  if(!aside||!toggle||!panel||!nav)return;
  const header=document.querySelector('.app-header'),main=document.querySelector('main');
  const subchapters={
    konzepte:[['concept-lab','Teilchen-Labor · Protonen und Lewis']],
    basen:[['equilibrium-lab','Protolyse-Labor']],
    titration:[['titration-hap-calculation','Halbäquivalenzpunkt · Rechenweg'],['titration-lab','Titrations-Labor']],
    puffer:[['blutpuffer','Blutpuffer'],['hagg-lab','Hägg-Diagramm'],['buffer-lab','Puffer-Labor'],['papier','Begründen und Modelle beurteilen']]
  };
  let chapters=[];
  const currentLinks=new Map();
  function link(id,label,primary=false){
    const a=document.createElement('a');a.href='#'+id;
    if(primary){a.dataset.navSection=id;currentLinks.set(id,a);}
    const numbered=label.match(/^(\d{2})\s+(.*)$/);
    if(numbered){const number=document.createElement('span');number.className='acid-nav-number';number.textContent=numbered[1];const text=document.createElement('span');text.textContent=numbered[2];a.append(number,text);}else a.textContent=label;
    return a;
  }
  function rebuild(){
    const simple=document.body.dataset.learningMode==='simple';
    chapters=[{id:simple?'simple-start':'start',label:simple?'Zum Einstieg':'Zum Anfang'}];currentLinks.clear();
    for(const a of document.querySelectorAll((simple?'.simple-route':'.route')+' a[href^="#"]')){
      const id=a.hash.slice(1),target=document.getElementById(id);if(target)chapters.push({id,label:a.textContent.trim()});
    }
    const list=document.createElement('ul');
    for(const chapter of chapters){
      const li=document.createElement('li');li.append(link(chapter.id,chapter.label,true));
      const children=subchapters[chapter.id]?.filter(([id])=>document.getElementById(id));
      if(children?.length){const sub=document.createElement('ul');sub.className='acid-nav-sublist';for(const [id,label] of children){const item=document.createElement('li');item.append(link(id,label));sub.append(item);}li.append(sub);}
      list.append(li);
    }
    nav.replaceChildren(list);
  }
  rebuild();
  let open=false,frame=null,current='start';
  function setOpen(next,returnFocus=false){
    open=next;panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Kapitelmenü schließen':'Kapitelmenü öffnen');
    if(open){const active=currentLinks.get(current)||nav.querySelector('a');active?.focus({preventScroll:true});active?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}
    else if(returnFocus)toggle.focus({preventScroll:true});
  }
  toggle.addEventListener('click',()=>{const next=!open;setOpen(next,!next);});
  document.getElementById('acid-nav-close').addEventListener('click',()=>setOpen(false,true));
  nav.addEventListener('click',event=>{
    const a=event.target.closest('a[href^="#"]');if(!a||!nav.contains(a)||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const target=document.getElementById(a.hash.slice(1));if(!target)return;
    event.preventDefault();setOpen(false);
    const details=target.closest('details');if(details)details.open=true;
    if(location.hash!==a.hash)history.pushState(null,'',a.hash);
    // A long page should jump directly, rather than animate through chapters.
    target.scrollIntoView({block:'start',behavior:'instant'});
    const heading=target.querySelector('h2,h3,h4')||target,temporary=!heading.hasAttribute('tabindex');
    if(temporary){heading.tabIndex=-1;heading.addEventListener('blur',()=>heading.removeAttribute('tabindex'),{once:true});}
    heading.focus({preventScroll:true});schedule();
  });
  document.addEventListener('click',event=>{if(open&&!aside.contains(event.target))setOpen(false);});
  document.addEventListener('focusin',event=>{if(open&&!aside.contains(event.target))setOpen(false);});
  document.addEventListener('keydown',event=>{if(open&&event.key==='Escape'){event.preventDefault();setOpen(false,true);}});
  document.addEventListener('fullscreenchange',()=>{aside.hidden=!!document.fullscreenElement;if(aside.hidden)setOpen(false);});
  function update(){
    frame=null;const height=Math.ceil(header?.getBoundingClientRect().height||0)+8;
    const top=height+'px';if(document.documentElement.style.getPropertyValue('--acid-nav-top')!==top)document.documentElement.style.setProperty('--acid-nav-top',top);
    let active=chapters[0].id;for(const chapter of chapters)if(document.getElementById(chapter.id).getBoundingClientRect().top<=height+40)active=chapter.id;
    current=active;for(const [id,a] of currentLinks){if(id===current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}
    toggle.title='Kapitel · '+(currentLinks.get(current)?.textContent||'Dein Lernweg');
  }
  function schedule(){if(frame===null)frame=requestAnimationFrame(update);}
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);addEventListener('hashchange',schedule);addEventListener('popstate',schedule);
  document.addEventListener('acid-learning-mode-change',()=>{setOpen(false);rebuild();update();});
  if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(schedule);if(header)observer.observe(header);if(main)observer.observe(main);}
  document.documentElement.classList.add('acid-nav-ready');aside.hidden=false;update();
})();

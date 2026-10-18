(function(root){
  'use strict';
  const paths={door:'M8 20V4h8v16M4 20h16M12 12h.01',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',return:'M7 7H3V3M3 7a9 9 0 1 1-1 9M8 12l3 3 5-6',route:'M5 3v14a4 4 0 0 0 8 0V7a4 4 0 0 1 8 0v14',key:'M14 4a6 6 0 1 1-4 10l-7 7H1v-3l7-7a6 6 0 0 1 6-7M16 8h.01',gallery:'M3 3h18v18H3zM7 7h10v10H7z',search:'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0M15 15l6 6M7 10l2 2 3-4'};
  const HOLD_MS=4600;
  function icon(symbol,document=root.document){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS(svg.namespaceURI,'path');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');path.setAttribute('d',paths[symbol]||paths.door);svg.append(path);return svg;
  }
  function create({element,live,targets,onOpenCollection}){
    const document=element.ownerDocument,view=document.defaultView,motion=view.matchMedia('(prefers-reduced-motion: reduce)');
    const panel=element.querySelector('.badge-award-card'),seal=element.querySelector('.badge-award-seal'),heading=element.querySelector('h2'),description=element.querySelector('.badge-award-description'),list=element.querySelector('ul');
    const seen=new Set(),queue=[],animations=new Set(),listeners=[];
    let timer=0,deadline=0,remaining=HOLD_MS,active=false,flying=false,epoch=0,hover=false,focused=false,destroyed=false;
    function listen(target,event,handler){target.addEventListener(event,handler);listeners.push(()=>target.removeEventListener(event,handler));}
    function target(){
      const top=[...document.querySelectorAll('dialog[open]')].at(-1);
      return targets.find(button=>{const box=button.getBoundingClientRect();return !button.disabled&&(!top||top.contains(button))&&box.width>0&&box.height>0&&box.right>0&&box.bottom>0&&box.left<view.innerWidth&&box.top<view.innerHeight;});
    }
    function cancelAnimations(){for(const animation of animations)animation.cancel();animations.clear();element.querySelector('.badge-award-flight')?.remove();}
    function hide(){
      const restore=element.contains(document.activeElement),destination=restore?target():null;
      if(typeof element.hidePopover==='function')try{element.hidePopover();}catch(_){}
      element.hidden=true;element.classList.remove('is-presenting','is-departing','is-quiet');
      element.querySelector('.badge-award-flight')?.remove();active=false;flying=false;hover=false;focused=false;
      if(restore)destination?.focus({preventScroll:true});
    }
    function clear(){epoch++;view.clearTimeout(timer);timer=0;queue.length=0;cancelAnimations();hide();live.textContent='';}
    function pause(){if(timer){remaining=Math.max(0,deadline-Date.now());view.clearTimeout(timer);timer=0;}}
    function resume(){if(active&&!flying&&!timer&&!hover&&!focused&&!document.hidden){deadline=Date.now()+remaining;timer=view.setTimeout(depart,remaining);}}
    function present(){
      if(active||destroyed||document.hidden||!queue.length)return;
      const badges=queue.shift();active=true;flying=false;remaining=HOLD_MS;
      seal.replaceChildren(icon(badges[0].symbol,document));panel.dataset.level=String(Math.max(...badges.map(badge=>badge.level||0)));
      heading.textContent=badges.length===1?badges[0].title:badges.length+' neue Abzeichen';
      element.querySelector('.badge-award-kicker').textContent=badges.length===1?'Ein neues Siegel für deine Sammlung':'Neue Siegel für deine Sammlung';
      description.textContent=badges.length===1?badges[0].description:'Dein Blick hat sich ausgezeichnet. Diese Siegel gehören jetzt zu deiner Sammlung.';
      list.replaceChildren();list.hidden=badges.length===1;
      if(!list.hidden)for(const badge of badges){const item=document.createElement('li'),copy=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('span');title.textContent=badge.title;detail.textContent=badge.description;copy.append(title,detail);item.append(icon(badge.symbol,document),copy);list.append(item);}
      element.hidden=false;element.classList.toggle('is-quiet',motion.matches);element.classList.add('is-presenting');
      if(typeof element.showPopover==='function'){
        try{element.showPopover();}catch(_){element.removeAttribute('popover');}
      }else element.removeAttribute('popover');
      // Older browsers cannot put a non-modal popover above a native dialog.
      // Host it in the current dialog instead; it remains non-modal itself.
      if(!element.hasAttribute('popover'))(document.querySelectorAll('dialog[open]').length?[...document.querySelectorAll('dialog[open]')].at(-1):document.body).append(element);
      live.textContent=(badges.length===1?'Neues Abzeichen: ':'Neue Abzeichen: ')+badges.map(badge=>badge.title+'. '+badge.description).join(' ');
      resume();
    }
    async function depart(){
      timer=0;if(!active||flying)return;
      if(document.hidden||hover||focused){remaining=600;return;}
      const destination=target(),from=seal.getBoundingClientRect(),to=destination?.getBoundingClientRect(),run=epoch;
      flying=true;element.classList.add('is-departing');
      if(motion.matches||!seal.animate||!to||!from.width){hide();present();return;}
      const ghost=seal.cloneNode(true);ghost.className='badge-award-seal badge-award-flight';
      Object.assign(ghost.style,{position:'fixed',left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px',margin:'0'});element.append(ghost);
      try{
        const animation=ghost.animate([{transform:'none',opacity:1},{transform:'translate('+(to.left+to.width/2-from.left-from.width/2)+'px,'+(to.top+to.height/2-from.top-from.height/2)+'px) scale(.2)',opacity:.2}],{duration:680,easing:'cubic-bezier(.45,0,.2,1)',fill:'forwards'});animations.add(animation);await animation.finished;animations.delete(animation);
        if(run===epoch){const pulse=destination.animate?.([{boxShadow:'0 0 0 0 #b58e4855'},{boxShadow:'0 0 0 14px #b58e4800'}],{duration:900,easing:'ease-out'});if(pulse){animations.add(pulse);pulse.finished.then(()=>animations.delete(pulse),()=>animations.delete(pulse));}}
      }catch(_){}finally{if(run===epoch){hide();present();}}
    }
    function show(badges){
      if(destroyed)return;
      const fresh=[];for(const badge of badges)if(badge?.earned===true&&typeof badge.title==='string'&&typeof badge.description==='string'&&typeof badge.id==='string'&&!seen.has(badge.id)){seen.add(badge.id);fresh.push(badge);}
      if(!fresh.length)return;queue.push(fresh);present();
    }
    listen(element.querySelector('.badge-award-close'),'click',clear);
    listen(element.querySelector('.badge-award-open'),'click',()=>{clear();onOpenCollection();});
    listen(panel,'pointerenter',event=>{if(event.pointerType==='mouse'){hover=true;pause();}});
    listen(panel,'pointerleave',()=>{hover=false;resume();});
    listen(panel,'focusin',()=>{focused=true;pause();});
    listen(panel,'focusout',event=>{focused=panel.contains(event.relatedTarget);if(!focused)resume();});
    listen(document,'visibilitychange',()=>{if(document.hidden)pause();else{present();resume();}});
    listen(document,'keydown',event=>{if(event.key==='Escape'&&active){event.preventDefault();event.stopPropagation();clear();}});
    listen(view,'pagehide',clear);
    return {show,clear,destroy(){clear();destroyed=true;listeners.forEach(remove=>remove());}};
  }
  const api={icon,create,HOLD_MS};if(typeof module==='object'&&module.exports)module.exports=api;else root.KunstBadgeAwards=api;
})(typeof globalThis!=='undefined'?globalThis:this);

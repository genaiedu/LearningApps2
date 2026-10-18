(() => {
 'use strict';
 if(!window.KunstWallEnabled)return;
 const $=id=>document.getElementById(id), dialog=$('image-dialog');
 const backdrop=document.createElement('div');backdrop.className='wall-landing-background';backdrop.setAttribute('aria-hidden','true');$('start').prepend(backdrop);
 const jump=document.createElement('button');jump.id='wall-jump';jump.className='primary';jump.type='button';jump.textContent='Direkt zum Rätsel ↓';jump.disabled=true;document.body.append(jump);
 jump.onclick=()=>{$('start-game').click();};
 function updateJump(){const game=$('spiel').getBoundingClientRect();jump.hidden=game.top<innerHeight*.8&&game.bottom>0;jump.disabled=$('start-game').disabled;}
 addEventListener('scroll',updateJump,{passive:true});addEventListener('resize',updateJump);
 new MutationObserver(updateJump).observe($('start-game'),{attributes:true,attributeFilter:['disabled']});
 let landingIds=[];
 function clearLanding(){backdrop.replaceChildren();landingIds=[];}
 function layoutLanding(){
  const images=[...backdrop.children].filter(img=>img.naturalWidth>0),gap=10,w=backdrop.clientWidth-2*gap;
  if(!images.length||w<=0)return;
  const target=w/(w<700?3:4);let y=gap,index=0;
  while(index<images.length){
   const row=[];let sum=0;
   do{const img=images[index++];row.push(img);sum+=img.naturalWidth/img.naturalHeight;}while(index<images.length&&sum*target+gap*(row.length-1)<w);
   const height=(w-gap*(row.length-1))/sum;let x=gap;
   for(const img of row){const width=height*img.naturalWidth/img.naturalHeight;Object.assign(img.style,{left:x+'px',top:y+'px',width:width+'px',height:height+'px',visibility:'visible'});x+=width+gap;}
   y+=height+gap;
  }
 }
 function landing(works){if(landingIds.length||!works.length)return;const chosen=window.KunstTresor.shuffle(works).slice(0,48);landingIds=chosen.map(w=>w.id);for(const [index,work] of chosen.entries()){const img=document.createElement('img');img.className='wall-tile wall-tile-'+index;img.alt='';img.referrerPolicy='no-referrer';img.decoding='async';img.onload=layoutLanding;img.src=work.imageURL;img.onerror=()=>{img.remove();layoutLanding();};backdrop.append(img);}}
 new ResizeObserver(layoutLanding).observe(backdrop);
 const aside=document.createElement('aside');aside.id='wall-settings';aside.setAttribute('aria-label','Zuordnungen zum vergrößerten Werk');
 aside.innerHTML='<p class="eyebrow">Werk untersuchen</p><h3 id="wall-work-title"></h3><div id="wall-work-controls"></div><p class="wall-instructions">Bild anklicken: Lupe. Escape: zurück zur ganzen Abbildung. Noch einmal Escape: zurück zur Wand. Die Zahl hinter einer Technik zeigt die noch freien Plätze im Raum; deine aktuelle Auswahl ist bereits abgezogen.</p><button type="button" id="wall-check">Schloss prüfen</button>';
 dialog.append(aside);
 const floating=document.createElement('div');floating.className='wall-floating';
 floating.innerHTML='<button type="button" id="wall-back">← Bilderwand</button><button type="button" id="wall-fit">Ganzes Bild</button><button type="button" id="wall-loupe">Lupe +</button><button type="button" id="wall-prev" aria-label="Vorheriges Werk">←</button><button type="button" id="wall-next" aria-label="Nächstes Werk">→</button>';
 dialog.append(floating);
 let current=null,home=null,drag=null,transitionEpoch=0,flight=null,flightAnimation=null,hiddenOrigin=null,returning=false,returnOrigin=null;
 const contacts=new Set();
 function reducedMotion(){return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}
 // Measure the painted pixels, not the letterbox around an object-fit image.
 function imageRect(image){
  const box=image.getBoundingClientRect(),style=getComputedStyle(image),number=value=>parseFloat(value)||0;
  const left=box.left+number(style.borderLeftWidth)+number(style.paddingLeft),top=box.top+number(style.borderTopWidth)+number(style.paddingTop);
  const width=Math.max(0,box.width-number(style.borderLeftWidth)-number(style.borderRightWidth)-number(style.paddingLeft)-number(style.paddingRight));
  const height=Math.max(0,box.height-number(style.borderTopWidth)-number(style.borderBottomWidth)-number(style.paddingTop)-number(style.paddingBottom));
  if(!image.naturalWidth||!image.naturalHeight||!['contain','scale-down'].includes(style.objectFit))return {left,top,width,height};
  const scale=Math.min(width/image.naturalWidth,height/image.naturalHeight,style.objectFit==='scale-down'?1:Infinity);
  const w=image.naturalWidth*scale,h=image.naturalHeight*scale,position=style.objectPosition.split(' ');
  const offset=(value,space)=>value?.endsWith('%')?space*parseFloat(value)/100:value?.endsWith('px')?parseFloat(value):space/2;
  return {left:left+offset(position[0],width-w),top:top+offset(position[1],height-h),width:w,height:h};
 }
 function captureOrigin(trigger){
  const image=trigger?.matches('img')?trigger:trigger?.querySelector('img');if(!image)return null;
  const context=trigger.closest('#gallery-info-dialog')?'gallery-info':trigger.closest('#gallery-dialog')?'gallery':trigger.closest('#solution-dialog')?'curator':'wall';
  return {image,trigger,context,rect:imageRect(image)};
 }
 function clearFlight(){
  flightAnimation?.cancel?.();flightAnimation=null;flight?.remove();flight=null;
  if(hiddenOrigin){hiddenOrigin.image.style.visibility=hiddenOrigin.visibility;hiddenOrigin=null;}
  $('zoom-image').style.opacity='';dialog.classList.remove('is-returning');returning=false;
 }
 function cancelFlight(){transitionEpoch++;clearFlight();}
 function interruptOpening(){if(!returning)cancelFlight();}
 function restoreControls(){cancelFlight();if(home){for(const child of [...$('wall-work-controls').children])home.append(child);}home=null;current=null;returnOrigin=null;drag=null;contacts.clear();dialog.classList.remove('wall-zoom');}
 function inspect(id,letter,original,source){restoreControls();const card=[...$('art-grid').children].find(c=>c.dataset.id===id);current=id;
  returnOrigin=source===undefined?captureOrigin(card?.querySelector('.artwork-button')):source;
  const wall=returnOrigin?.context==='wall'||(source===undefined&&Boolean(card));
  $('wall-work-title').textContent=wall?(letter?'Werk '+letter+' · ':'')+(card?.querySelector('.work-title')?.textContent||$('zoom-image').alt.replace('Vergrößerte Ansicht: ','')):$('zoom-image').alt.replace('Vergrößerte Ansicht: ','');
  if(card&&wall&&!original){home=card;$('wall-work-controls').append(card.querySelector('.artwork-actions'),card.querySelector('.assignments'));}
  $('wall-check').hidden=!home||$('check').hidden;$('wall-prev').hidden=$('wall-next').hidden=!home;
  $('wall-back').textContent=returnOrigin?.context==='gallery-info'?'← Bildinformationen':returnOrigin?.context==='gallery'?'← Meine Galerie':returnOrigin?.context==='curator'?'← Kuratoransicht':'← Bilderwand';
  const destination=returnOrigin?.context==='gallery-info'?'Bildinformation':returnOrigin?.context==='gallery'?'Galerie':returnOrigin?.context==='curator'?'Kuratoransicht':'Bilderwand';
  aside.setAttribute('aria-label',home?'Zuordnungen zum vergrößerten Werk':'Informationen zum vergrößerten Werk');aside.querySelector('.eyebrow').textContent=home?'Werk untersuchen':'Werk betrachten';
  aside.querySelector('.wall-instructions').textContent='Zwei Finger oder Trackpad: zoomen. Bild anklicken: Lupe. Escape: zurück zur ganzen Abbildung. Noch einmal Escape: zurück zur '+destination+'.'+(home?' Die Zahl hinter einer Technik zeigt die noch freien Plätze im Raum; deine aktuelle Auswahl ist bereits abgezogen.':'');
  dialog.classList.remove('wall-zoom');if(returnOrigin)void animateOpen(returnOrigin);
 }
 function ghostAt(rect){
  const image=$('zoom-image'),ghost=document.createElement('img');ghost.className='wall-image-flight';ghost.alt='';ghost.src=image.currentSrc||image.src;
  Object.assign(ghost.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',objectFit:'fill',pointerEvents:'none',zIndex:'10',transformOrigin:'0 0'});
  flight=ghost;dialog.append(ghost);return ghost;
 }
 async function animateOpen(origin){
  const image=$('zoom-image'),epoch=transitionEpoch,from=origin.rect;
  if(reducedMotion()||!image.animate||!from.width||!from.height)return;
  image.style.opacity='0';
  try{
   // A higher-resolution image may replace the preview while it is decoding.
   try{await image.decode();}catch(_){await image.decode();}
   if(epoch!==transitionEpoch||!dialog.open)return;
   window.KunstWallZoom?.layout();const to=imageRect(image);if(!to.width||!to.height)return;
   const ghost=ghostAt(to);
   flightAnimation=ghost.animate([{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`},{transform:'none'}],{duration:460,easing:'cubic-bezier(.22,.7,.2,1)'});
   await flightAnimation.finished;
  }catch(_){}finally{if(epoch===transitionEpoch)clearFlight();}
 }
 async function closeToWall(){
  if(returning||!dialog.open)return;
  const image=$('zoom-image'),origin=returnOrigin,source=origin?.image,finish=()=>{dialog.close();origin?.trigger?.focus({preventScroll:true});};
  // Never substitute a same-ID picture on another wall for a missing origin.
  if(reducedMotion()||!source?.isConnected||!image.animate){finish();return;}
  const inFlight=Boolean(flight),from=inFlight?imageRect(flight):imageRect(image);
  let to=imageRect(source);
  if(to.left+to.width<0||to.top+to.height<0||to.left>innerWidth||to.top>innerHeight){source.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});to=imageRect(source);}
  cancelFlight();if(!from.width||!from.height||!to.width||!to.height){finish();return;}
  returning=true;const epoch=transitionEpoch,ghost=ghostAt(from),view=inFlight?{left:0,top:0,right:innerWidth,bottom:innerHeight}:$('zoom-view').getBoundingClientRect();
  const inset=[Math.max(0,view.top-from.top),Math.max(0,from.left+from.width-view.right),Math.max(0,from.top+from.height-view.bottom),Math.max(0,view.left-from.left)].map(value=>value+'px').join(' ');
  hiddenOrigin={image:source,visibility:source.style.visibility};source.style.visibility='hidden';dialog.classList.add('is-returning');
  try{
   flightAnimation=ghost.animate([{transform:'none',clipPath:`inset(${inset})`},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px) scale(${to.width/from.width},${to.height/from.height})`,clipPath:'inset(0px 0px 0px 0px)'}],{duration:460,easing:'cubic-bezier(.22,.7,.2,1)',fill:'forwards'});
   await flightAnimation.finished;
  }catch(_){}finally{if(epoch===transitionEpoch){clearFlight();finish();}}
 }
 function animateZoom(action){cancelFlight();const image=$('zoom-image'),from=image.getBoundingClientRect();action();const to=image.getBoundingClientRect();if(reducedMotion()||!image.animate||!from.width||!to.width)return;image.animate([{transformOrigin:'0 0',transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`},{transformOrigin:'0 0',transform:'none'}],{duration:320,easing:'cubic-bezier(.22,.7,.2,1)'});}
 function fit(){animateZoom(()=>window.KunstWallZoom?.reset());dialog.classList.remove('wall-zoom');}
 function loupe(){animateZoom(()=>{if(window.KunstWallZoom?.zoom===100)$('zoom-in').click();$('zoom-in').click();});dialog.classList.add('wall-zoom');}
 function adjacent(direction){const cards=[...$('art-grid').children],index=cards.findIndex(c=>c.dataset.id===current);if(index<0)return;const card=cards[(index+direction+cards.length)%cards.length];restoreControls();card.querySelector('.artwork-button').click();}
 $('wall-back').onclick=()=>void closeToWall();$('wall-fit').onclick=fit;$('wall-loupe').onclick=loupe;$('wall-prev').onclick=()=>adjacent(-1);$('wall-next').onclick=()=>adjacent(1);
 dialog.querySelector('[data-close="image-dialog"]').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();void closeToWall();});
 $('wall-check').onclick=()=>{dialog.close();$('check').click();};
 dialog.addEventListener('cancel',event=>{event.preventDefault();if(window.KunstWallZoom?.zoom>100)fit();else void closeToWall();});
 $('zoom-view').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;contacts.add(e.pointerId);drag=contacts.size===1?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;});
 $('zoom-view').addEventListener('pointerup',e=>{const tap=contacts.size===1&&drag?.id===e.pointerId&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<7;contacts.delete(e.pointerId);drag=null;if(tap&&window.KunstWallZoom?.zoom===100)loupe();});
 for(const type of ['pointercancel','lostpointercapture'])$('zoom-view').addEventListener(type,e=>{contacts.delete(e.pointerId);drag=null;});
 function layout(){
  const grid=$('art-grid'),cards=[...grid.children],width=grid.clientWidth;if(!cards.length||!width)return;
  const gap=8,caption=30,ratios=cards.map(c=>Number(c.dataset.wallAspect)||1);
  const rows=window.KunstWallLayout.rows(ratios,width,{gap,target:width<=760?210:340});let y=0;
  for(const row of rows){for(const item of row.items)Object.assign(cards[item.index].style,{left:item.x+'px',top:y+'px',width:item.width+'px',height:(row.height+caption)+'px'});y+=row.height+caption+gap;}
  grid.style.height=y-gap+'px';
 }
 function updateCopy(){
  const stats=document.querySelectorAll('.hero-stats b');if(stats[1]&&stats[1].textContent!=='35')stats[1].textContent='35';if(stats[2]&&stats[2].textContent!=='03')stats[2].textContent='03';
  $('wall-check').disabled=$('check').disabled;if($('wall-check').textContent!==$('check').textContent)$('wall-check').textContent=$('check').textContent;
 }
 $('attempts').append(document.createElement('i'));document.title='Kunsttresor · Die Bilderwand';
 const hint=document.createElement('p');hint.className='wall-mode-note';hint.textContent='7 Werke · Titel, Künstler, Zeit, Stil und Technik zuordnen · 3 Prüfversuche. Bild anklicken zum Untersuchen. Nach einem gewonnenen Raum sammelst du Lieblingswerke mit dem Herz.';$('art-grid').before(hint);
 let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;updateCopy();layout();});}).observe(document.querySelector('main'),{subtree:true,childList:true,characterData:true});
 new ResizeObserver(layout).observe($('art-grid'));window.addEventListener('kunst-wall-layout',layout);window.KunstWall={captureOrigin,inspect,restoreControls,interruptOpening,layout,landing,clearLanding};updateJump();updateCopy();
})();

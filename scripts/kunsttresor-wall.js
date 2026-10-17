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
 let current=null,home=null,drag=null,transitionEpoch=0,flight=null,returning=false;
 function reducedMotion(){return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}
 function cancelFlight(){transitionEpoch++;flight?.remove();flight=null;$('zoom-image').style.opacity='';}
 function restoreControls(){cancelFlight();if(home){for(const child of [...$('wall-work-controls').children])home.append(child);}home=null;current=null;dialog.classList.remove('wall-zoom');}
 function inspect(id,letter,original){restoreControls();const card=[...$('art-grid').children].find(c=>c.dataset.id===id);current=id;
  $('wall-work-title').textContent=(letter?'Werk '+letter+' · ':'')+(card?.querySelector('.work-title')?.textContent||$('zoom-image').alt.replace('Vergrößerte Ansicht: ',''));
  if(card&&!original){home=card;$('wall-work-controls').append(card.querySelector('.artwork-actions'),card.querySelector('.assignments'));}
  $('wall-check').hidden=!home||$('check').hidden;$('wall-prev').hidden=$('wall-next').hidden=Boolean(original);dialog.classList.remove('wall-zoom');if(card&&!original)void animateOpen(card);
 }
 async function animateOpen(card){
  const image=$('zoom-image'),source=card.querySelector('.artwork-button img'),epoch=transitionEpoch;
  if(reducedMotion()||!source||!image.animate)return;
  const from=source.getBoundingClientRect();if(!from.width||!from.height)return;
  try{await image.decode();}catch(_){return;}
  if(epoch!==transitionEpoch||!dialog.open)return;
  window.KunstWallZoom?.layout();const to=image.getBoundingClientRect();if(!to.width||!to.height)return;
  const ghost=document.createElement('img');ghost.className='wall-image-flight';ghost.alt='';ghost.src=image.currentSrc||image.src;
  Object.assign(ghost.style,{position:'fixed',left:to.left+'px',top:to.top+'px',width:to.width+'px',height:to.height+'px',objectFit:'contain',pointerEvents:'none',zIndex:'4',transformOrigin:'0 0'});
  flight=ghost;dialog.append(ghost);image.style.opacity='0';
  try{await ghost.animate([{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`},{transform:'none'}],{duration:460,easing:'cubic-bezier(.22,.7,.2,1)'}).finished;}catch(_){}
  ghost.remove();if(epoch===transitionEpoch){image.style.opacity='';flight=null;}
 }
 async function closeToWall(){
  if(returning||!dialog.open)return;
  const image=$('zoom-image'),card=[...$('art-grid').children].find(c=>c.dataset.id===current),source=card?.querySelector('.artwork-button img');
  if(reducedMotion()||!source||!image.animate){dialog.close();return;}
  cancelFlight();const from=image.getBoundingClientRect(),to=source.getBoundingClientRect();
  if(!from.width||!from.height||!to.width||!to.height){dialog.close();return;}
  returning=true;const epoch=transitionEpoch,ghost=document.createElement('img'),previousVisibility=source.style.visibility;
  ghost.className='wall-image-flight';ghost.alt='';ghost.src=image.currentSrc||image.src;
  Object.assign(ghost.style,{position:'fixed',left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px',objectFit:'contain',pointerEvents:'none',zIndex:'10',transformOrigin:'0 0'});
  flight=ghost;dialog.append(ghost);source.style.visibility='hidden';dialog.classList.add('is-returning');
  try{await ghost.animate([{transform:'none'},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px) scale(${to.width/from.width},${to.height/from.height})`}],{duration:460,easing:'cubic-bezier(.22,.7,.2,1)',fill:'forwards'}).finished;}catch(_){}
  finally{
   source.style.visibility=previousVisibility;ghost.remove();dialog.classList.remove('is-returning');returning=false;
   if(epoch===transitionEpoch){flight=null;dialog.close();}
  }
 }
 function animateZoom(action){cancelFlight();const image=$('zoom-image'),from=image.getBoundingClientRect();action();const to=image.getBoundingClientRect();if(reducedMotion()||!image.animate||!from.width||!to.width)return;image.animate([{transformOrigin:'0 0',transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`},{transformOrigin:'0 0',transform:'none'}],{duration:320,easing:'cubic-bezier(.22,.7,.2,1)'});}
 function fit(){animateZoom(()=>window.KunstWallZoom?.reset());dialog.classList.remove('wall-zoom');}
 function loupe(){animateZoom(()=>{if(window.KunstWallZoom?.zoom===100)$('zoom-in').click();$('zoom-in').click();});dialog.classList.add('wall-zoom');}
 function adjacent(direction){const cards=[...$('art-grid').children],index=cards.findIndex(c=>c.dataset.id===current);if(index<0)return;const card=cards[(index+direction+cards.length)%cards.length];restoreControls();card.querySelector('.artwork-button').click();}
 $('wall-back').onclick=()=>void closeToWall();$('wall-fit').onclick=fit;$('wall-loupe').onclick=loupe;$('wall-prev').onclick=()=>adjacent(-1);$('wall-next').onclick=()=>adjacent(1);
 dialog.querySelector('[data-close="image-dialog"]').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();void closeToWall();});
 $('wall-check').onclick=()=>{dialog.close();$('check').click();};
 dialog.addEventListener('cancel',event=>{event.preventDefault();if(window.KunstWallZoom?.zoom>100)fit();else void closeToWall();});
 $('zoom-view').addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};});
 $('zoom-view').addEventListener('pointerup',e=>{if(drag&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<7&&window.KunstWallZoom?.zoom===100)loupe();drag=null;});
 function layout(){
  const grid=$('art-grid'),cards=[...grid.children],width=grid.clientWidth;if(!cards.length||!width)return;
  const gap=8,caption=30,ratios=cards.map(c=>Number(c.dataset.wallAspect)||1);
  const rows=window.KunstWallLayout.rows(ratios,width,{gap,target:width<=760?210:340});let y=0;
  for(const row of rows){for(const item of row.items)Object.assign(cards[item.index].style,{left:item.x+'px',top:y+'px',width:item.width+'px',height:(row.height+caption)+'px'});y+=row.height+caption+gap;}
  grid.style.height=y-gap+'px';
 }
 const copy=[['Pro Kategorie verwendet jeder Raum vier verschiedene Antworten.','Zeit, Stil und Künstler sind pro Raum verschieden. Eine Technik kann zu mehreren Werken passen; die Restzahl in der Auswahl zeigt die noch freien Plätze.'],['Jede Antwort einer Kategorie wird genau einmal verwendet; bereits vergebene Antworten sind anderswo ausgegraut.','Zeit, Stil und Künstler werden jeweils einmal verwendet. Techniken dürfen mehrfach vorkommen. Die Zahl hinter jeder Technik zählt die noch freien Plätze; bei 0 ist sie vollständig vergeben.'],['Jede Antwort passt in ihrer Kategorie genau zu einem Werk.','Zeit, Stil und Künstler passen jeweils zu einem Werk; Techniken können sich wiederholen.'],['Die vier Künstler, Datierungen, Stilrichtungen und Techniken eines Raums sind deshalb jeweils unterschiedlich.','Künstler, Datierungen und Stilrichtungen sind jeweils unterschiedlich. Bei Techniken zeigt eine Zahl die noch freien Zuordnungen.'],['Eine vergebene Antwort ist bei den anderen Werken ausgegraut.','Eine vollständig vergebene Antwort ist bei den anderen Werken ausgegraut. Techniken können mehrere Plätze haben; ihre Restzahl zählt bei jeder Zuordnung herunter.'],['Vier Werke.','Sieben Werke.'],['vier Werke','sieben Werke'],['vier Kunstwerke','sieben Kunstwerke'],['Vier Kunstwerke','Sieben Kunstwerke'],['vier Werke','sieben Werke'],['vier Werken','sieben Werken'],['Vier Werke','Sieben Werke'],['vier Bilder','sieben Bilder'],['vier Werke','sieben Werke'],['vier Künstler','sieben Künstler'],['vier verschiedenen Antworten','sieben verschiedenen Antworten'],['vier verschiedene Antworten','sieben verschiedene Antworten'],['16','28'],['Zwei Versuche','Drei Versuche'],['Zwei Prüfversuche pro Raum','Drei Prüfversuche pro Raum'],['Alle vier Bilder','Alle sieben Bilder'],['Zwei Prüfversuche','Drei Prüfversuche'],['zwei Versuchen','drei Versuchen'],['zweite Versuch','dritte Versuch'],['zweiter Fehlversuch','dritter Fehlversuch'],['Ein zweiter Fehlversuch','Ein dritter Fehlversuch'],['Ist auch der zweite Versuch','Ist auch der dritte Versuch'],['zweiten Prüfung','nächsten Prüfung'],['zweite Prüfung','nächste Prüfung'],['Du darfst einmal nachbessern.','Du darfst zweimal nachbessern.'],['Du hast noch einen Versuch.','Du kannst erneut prüfen.'],['Du hast noch genau einen Versuch.','Du kannst erneut prüfen.'],['Du hast noch genau einen Prüfversuch.','Du kannst erneut prüfen.'],['Erste Prüfung:','Letzte Prüfung:'],['Rückmeldung zur ersten Prüfung','Rückmeldung zur letzten Prüfung']];
 function updateCopy(){const roots=[document.querySelector('.hero-copy'),$('regeln'),$('lock-panel'),$('review-summary'),$('result-dialog'),$('intro-copy'),document.querySelector('.archive-note'),$('launch-dialog'),$('gallery-dialog'),$('ai-dialog'),$('room-loading')];for(const root of roots){if(!root)continue;const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walk.nextNode()){const n=walk.currentNode;if(['SCRIPT','STYLE','BUTTON','SELECT','OPTION'].includes(n.parentElement?.tagName))continue;let value=n.nodeValue;for(const [a,b]of copy)value=value.replaceAll(a,b);if(value!==n.nodeValue)n.nodeValue=value;}}
  const stats=document.querySelectorAll('.hero-stats b');if(stats[1]&&stats[1].textContent!=='28')stats[1].textContent='28';if(stats[2]&&stats[2].textContent!=='03')stats[2].textContent='03';
  $('wall-check').disabled=$('check').disabled;if($('wall-check').textContent!==$('check').textContent)$('wall-check').textContent=$('check').textContent;
 }
 $('attempts').append(document.createElement('i'));document.title='Kunsttresor · Die Bilderwand';
 const hint=document.createElement('p');hint.className='wall-mode-note';hint.textContent='7 Werke · 28 Zuordnungen · 3 Prüfversuche. Bild anklicken zum Untersuchen. Nach einem gewonnenen Raum sammelst du Lieblingswerke mit dem Herz.';$('art-grid').before(hint);
 let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;updateCopy();layout();});}).observe(document.querySelector('main'),{subtree:true,childList:true,characterData:true});
 new ResizeObserver(layout).observe($('art-grid'));window.addEventListener('kunst-wall-layout',layout);window.KunstWall={inspect,restoreControls,layout,landing,clearLanding};updateJump();updateCopy();
})();

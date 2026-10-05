(() => {
  'use strict';
  const {slides,sources,date,populations,speakerSources}=window.HF_CASE_DATA, {cast,scenes}=window.HF_SCENES;
  const KEY='huggingface-fall:story-v4', $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Kennungen mit einer Klammer bleiben auch bei sehr großer Schrift lesbar.
  // Der Umbruch ist absichtlich Teil der Gestaltung, nicht vom verfügbaren Platz abhängig.
  const introName=s=>{
    const name=String(s), bracket=name.indexOf('[');
    return bracket<0?esc(name):esc(name.slice(0,bracket))+'<span class="intro-name-suffix">'+esc(name.slice(bracket))+'</span>';
  };
  const portraitTasks={p:'Verbindung schaffen',b:'Vorhaben koordinieren',c:'Einen Zugang öffnen',r:'Den Fund nachprüfen',m:'Aufmerksamkeit bündeln',j:'Zugriff und Koordination',l:'Arbeit verteilen',d:'Absender prüfen'};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let state={index:0,step:0,motion:!reduced.matches,theme:'dark',projector:false}, storageOK=true,timer=null,touch=null,docking=null,crossfade=null,lastFlockDensity=2;
  try {
    const s=JSON.parse(localStorage.getItem(KEY));
    if(s&&typeof s.motion==='boolean')state.motion=s.motion&&!reduced.matches;
    if(s&&['dark','light'].includes(s.theme))state.theme=s.theme;
    if(s&&typeof s.projector==='boolean')state.projector=s.projector;
  } catch(_){storageOK=false;}
  const current=()=>slides[state.index];
  let openingActive=false,openingStarted=false,openingMovie=null,sceneMovie=null,flightMovie=null,titleArrival=[],birdFlight=[];
  let finaleStarted=false,finaleCover=null,finaleFade=[];
  const filmSteps={investigation:[.9,2.25,5,6],quintessence:[3.55,5.55,8.6,15]};
  const filmFiles={investigation:'02-folie-25-die-spuren.html',quintessence:'03-abschluss-voegel-auf-dem-draht.html'};
  const activeMovie=()=>current().scene==='investigation'&&state.step===3?flightMovie:sceneMovie;
  function clearFinaleTransition(){finaleFade.forEach(a=>a.cancel());finaleFade=[];finaleCover?.remove();finaleCover=null;}
  function scrubFinaleFade(time){
    if(!finaleStarted)return;
    if(time>=1.6){clearFinaleTransition();return;}
    if(!finaleFade.length){
      const options={duration:1600,easing:'ease-in-out',fill:'both'};
      finaleFade.push($('sceneFilm').animate([{opacity:0},{opacity:1}],options));
      if(finaleCover)finaleFade.push(finaleCover.animate([{opacity:1},{opacity:0}],options));
      finaleFade.forEach(a=>a.pause());
    }
    finaleFade.forEach(a=>a.currentTime=Math.max(0,time*1000));
  }
  function syncFinaleStep(movie){
    if(current().scene!=='quintessence'||!finaleStarted)return;
    const step=movie.time<4.1?0:movie.time<6.2?1:movie.time<11.6?2:3;
    if(state.step!==step){state.step=step;updateStep(false);}
    scrubFinaleFade(movie.time);
  }
  function clearBirdFlight(){birdFlight.forEach(a=>a.cancel());birdFlight=[];const layer=$('slide').querySelector('.flock-layer');if(layer)layer.style.opacity='';}
  function scrubBirdFlight(time){
    const layer=$('slide').querySelector('.flock-layer');if(!layer)return;
    if(!state.motion||reduced.matches){layer.style.opacity=time>=6?'0':'1';return;}
    if(!birdFlight.length){
      const viewport=$('viewport').getBoundingClientRect(),cx=viewport.left+viewport.width/2,cy=viewport.top+viewport.height*.6;
      layer.querySelectorAll('.flock-bird.present').forEach((bird,i)=>{
        const r=bird.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
        const random=salt=>{const v=Math.sin(i*127.1+salt)*43758.5453;return v-Math.floor(v);};
        const base=getComputedStyle(bird).transform,start=.28+random(2)*.45,approach=.85+random(3)*.95;
        const dx=cx-x,dy=cy-y,angle=Math.atan2(y-cy,x-cx),distance=Math.max(innerWidth,innerHeight)*1.8+r.width*22;
        const outX=Math.cos(angle)*distance+dx,outY=Math.sin(angle)*distance+dy;
        const frames=[
          {offset:0,transform:base,opacity:1},
          {offset:start/6,transform:base,opacity:1},
          {offset:(start+.12)/6,transform:`translate(0,-16px) rotate(12deg) ${base}`,opacity:1},
          {offset:approach/6,transform:base,opacity:1},
          {offset:(approach+1.1)/6,transform:`translate(${dx*.25+(random(7)-.5)*100}px,${dy*.25}px) scale(4) ${base}`,opacity:1},
          {offset:(approach+1.95)/6,transform:`translate(${outX}px,${outY}px) scale(22) rotate(35deg) ${base}`,opacity:0},
          {offset:1,transform:`translate(${outX}px,${outY}px) scale(22) ${base}`,opacity:0}
        ];
        const a=bird.animate(frames,{duration:6000,fill:'both',easing:'linear'});a.pause();birdFlight.push(a);
      });
    }
    birdFlight.forEach(a=>a.currentTime=time*1000);
  }
  function clearTitleArrival(){titleArrival.forEach(a=>a.cancel());titleArrival=[];$('openingStage').style.opacity='';}
  function scrubOpeningTitle(time){
    if(!openingActive||!openingStarted)return;
    $('progress').style.width=(time/15*100)+'%';
    if(time<10.2){$('slide').hidden=true;$('openingStage').style.opacity='';return;}
    $('slide').hidden=false;
    if(!titleArrival.length){
      // Animate the actual responsive slide, not a second fixed-size title image.
      const animate=(selector,frames,start,duration)=>{
        const a=$('slide').querySelector(selector).animate(frames,{duration:duration*1000,fill:'both',easing:'cubic-bezier(.16,1,.3,1)'});a.pause();a.hfStart=start;titleArrival.push(a);
      };
      animate('.portrait-backdrop',[{opacity:0},{opacity:1}],10.2,.9);
      const fieldTransform=getComputedStyle($('slide').querySelector('.portrait-field')).transform;
      animate('.portrait-field',[{opacity:0,transform:'translate(38vw,-18vh) rotate(18deg) '+fieldTransform},{opacity:1,transform:fieldTransform}],10.75,1.2);
      animate('.title-author',[{opacity:0,transform:'translateX(-40px)'},{opacity:1,transform:'translateX(0)'}],10.45,1);
      animate('.title-portrait h2',[{opacity:0,transform:'translateY(60px)'},{opacity:1,transform:'translateY(0)'}],10.6,1.2);
      animate('.title-portrait .portrait-sticker',[{opacity:0,transform:'rotate(8deg) scale(.6)'},{opacity:1,transform:'rotate(-3deg) scale(1)'}],11.6,.7);
    }
    titleArrival.forEach(a=>a.currentTime=Math.max(0,(time-a.hfStart)*1000));
    $('openingStage').style.opacity=String(Math.max(0,1-(time-10.2)/.9));
  }
  function finishOpening(focus=true){
    if(!openingActive)return;
    openingActive=false;openingMovie?.pause();clearTitleArrival();$('openingStage').inert=true;
    $('openingStart').hidden=true;
    $('slide').hidden=false;$('slide').inert=false;document.body.classList.remove('opening-active');
    updateStep(false);$('replay').setAttribute('aria-label','Aktuelle Szene von vorn zeigen');
    $('play').setAttribute('aria-label','Aktuelle Szene automatisch aufbauen');$('replay').disabled=false;
    $('openingStage').hidden=true;
    if(focus)$('slideTitle').focus({preventScroll:true});
  }
  function openingPlayback(){
    if(!openingActive)return;
    $('position').textContent=openingStarted?'Auftaktfilm':'Start';
    $('play').textContent=!openingStarted?'Start':openingMovie.paused?'Film fortsetzen':'Film anhalten';
    $('play').setAttribute('aria-label',!openingStarted?'Auftaktfilm starten':openingMovie.paused?'Auftaktfilm fortsetzen':'Auftaktfilm anhalten');
    $('play').setAttribute('aria-pressed',String(!openingMovie.paused));
    $('replay').disabled=!openingStarted;
  }
  function toggleOpeningPlayback(){
    if(!state.motion||reduced.matches){finishOpening();return;}
    if(!openingMovie.paused)openingMovie.pause();
    else{
      openingStarted=true;$('openingStart').hidden=true;$('openingFilm').hidden=false;$('openingHint').hidden=true;
      openingMovie.playTo(15);openingPlayback();
    }
  }
  function startOpening(){
    stop();cancelDocking();openingActive=true;openingStarted=false;
    clearTitleArrival();openingMovie?.seek(0);
    $('openingFilm').hidden=true;$('openingStart').hidden=false;$('openingHint').hidden=true;
    $('openingStage').hidden=false;$('openingStage').inert=false;$('slide').hidden=true;$('slide').inert=true;
    $('viewport').scrollTop=0;
    document.body.classList.add('opening-active');
    $('position').textContent='Start';$('buildPosition').textContent='15 Sekunden · ohne Ton';
    $('progress').style.width='0%';$('prev').disabled=true;$('next').disabled=false;
    $('next').textContent='Zur Präsentation →';$('play').hidden=false;$('replay').hidden=false;
    $('replay').setAttribute('aria-label','Auftaktfilm von vorn abspielen');
    $('openingHint').textContent='Schematischer Auftaktfilm · 15 Sekunden · ohne Ton. Danach beginnt die Präsentation.';
    openingPlayback();
    // Loading, reloading, resetting and entering fullscreen never start playback.
  }
  const introduction=()=>current().introductions?.find(i=>i.step===state.step);
  function save(){try{localStorage.setItem(KEY,JSON.stringify({motion:state.motion,theme:state.theme,projector:state.projector}));}catch(_){storageOK=false;}}
  function refs(ids){return ids.map(id=>sources.find(x=>x.id===id)).filter(Boolean).map(s=>'<a href="'+s.url+'" target="_blank" rel="noopener noreferrer">'+esc(s.name)+'</a>').join('');}
  function citations(s){return '<div class="citations">'+refs([...new Set([...s.sources,...(s.population?['metr']:[])])])+'</div>';}
  const populationAt=(s,step)=>populations[s.population?.filter(p=>p.step<=step).at(-1)?.phase];
  function populationScript(s,step){
    const p=s.population?.find(p=>p.step===step),info=p&&populations[p.phase];
    return info?'Größenordnung: '+info.label+' · '+info.scope+'. '+info.detail+' Quelle: METR / Redwood. Silhouetten symbolisch, nicht ein Vogel pro Agent.':'';
  }
  const backgroundFlockAllowed=()=>state.index<=slides.findIndex(s=>s.id==='aufarbeitung');
  function backgroundFlockDensity(){
    if(!backgroundFlockAllowed())return 0;
    // The background grows through the narrative, including slides without a count.
    return Math.max(2,...slides.slice(0,state.index+1).flatMap((s,index)=>(s.population||[])
      .filter(p=>index<state.index||p.step<=state.step).map(p=>populations[p.phase].birds)));
  }
  function flock(){
    if(!backgroundFlockAllowed())return '<div class="flock-layer" aria-hidden="true"><div class="flock-band"></div><div class="flock-band"></div><div class="flock-band"></div></div>';
    // Stable positions: existing birds never drift or move with slide layouts.
    // Frontal flight silhouette with a close-set pair of eyes at its centre.
    const silhouette='<path class="flock-outline" d="M4 30C13 14 24 10 35 20L41 29C49 9 64 6 82 15C67 14 57 22 49 35L42 41L37 35C27 23 16 21 4 30Z"/><g class="flock-eyes"><circle cx="40" cy="33" r="1.8"/><circle cx="44" cy="33" r="1.8"/></g>';
    const scatter=(i,salt)=>{const v=Math.sin(i*127.1+salt)*43758.5453;return v-Math.floor(v);};
    return '<div class="flock-layer" aria-hidden="true">'+Array.from({length:3},(_,band)=>'<div class="flock-band">'+Array.from({length:120},(_,n)=>{
      const i=n*3+band,x=1+scatter(i,3)*96,y=3+scatter(i,97)*91,size=24+scatter(i,53)*32;
      return '<svg class="flock-bird '+(i<lastFlockDensity?'present':'')+'" data-bird="'+i+'" viewBox="0 0 86 48" style="left:'+x+'%;top:'+y+'%;width:'+size+'px;--blink-delay:-'+band*1.8+'s;--arrival-delay:'+((i%19)*.08)+'s;transform:rotate('+((i%7-3)*5)+'deg)">'+silhouette+'</svg>';
    }).join('')+'</div>').join('')+'</div>';
  }
  function quoteHTML(q){return '<figure class="agent-quote"><figcaption>'+esc(q.speaker)+' <span>· '+esc(q.kind)+'</span></figcaption><div><p lang="en">“'+esc(q.en)+'”</p><p lang="de">„'+esc(q.de)+'“</p></div><small>Englisches Original · eigene deutsche Übersetzung · '+refs([q.source])+'</small></figure>';}
  function icon(name){
    const paths={
      board:'<rect x="12" y="18" width="76" height="60" rx="9"/><path d="M28 34h18m12 0h14M28 48h44M28 62h28M38 88h24"/>',
      server:'<rect x="20" y="12" width="60" height="76" rx="10"/><path d="M20 38h60M20 63h60M32 25h2m12 0h21M32 51h2m12 0h21M32 76h2m12 0h21"/>',
      file:'<path d="M27 12h34l16 16v60H27zM60 12v20h17M38 47h27M38 60h27M38 73h18"/>',
      key:'<circle cx="33" cy="34" r="20"/><path d="m47 49 36 36m-11-11 10-10m-23-3 10-10"/><circle cx="29" cy="30" r="3"/>',
      flag:'<path d="M27 88V15h47L63 35l11 19H27"/>',
      target:'<circle cx="50" cy="50" r="35"/><circle cx="50" cy="50" r="20"/><circle cx="50" cy="50" r="5"/>',
      search:'<circle cx="43" cy="42" r="25"/><path d="m62 61 23 23M33 36h20M33 47h15"/>',
      shield:'<path d="M50 10 82 23v29c0 17-15 30-32 39C33 82 18 69 18 52V23zM34 48l11 12 23-27"/>',
      lock:'<rect x="23" y="42" width="54" height="44" rx="9"/><path d="M34 42V29a16 16 0 0 1 32 0v13M50 58v12"/>',
      check:'<circle cx="50" cy="50" r="36"/><path d="m30 49 15 16 27-32"/>',
      cross:'<circle cx="50" cy="50" r="36"/><path d="m36 36 28 28m0-28L36 64"/>',
      code:'<path d="m32 28-21 22 21 22m36-44 21 22-21 22M58 20 42 80"/>',
      seal:'<path d="m50 10 12 8 14 1 4 14 9 11-6 13-1 15-15 4-11 10-13-7-15-1-4-15-10-10 7-14 1-14 15-4zM35 45l11 12 19-22"/>',
      stop:'<path d="M32 13h36l20 20v35L68 88H32L12 68V33zM38 35v30m24-30v30"/>',
      group:[[-2,37],[33,4],[63,37]].map(([x,y])=>'<g transform="translate('+x+' '+y+') scale(.4)"><path d="M20 78C-4 68 9 45 27 41c-5-28 33-37 41-9l18 8-18 9c2 27-21 44-48 29zM19 53c-3 21 19 25 29 13M29 79v14m19-14v14"/><circle cx="54" cy="30" r="3" fill="currentColor" stroke="none"/></g>').join('')
    };
    const body=paths[name]||'<text x="50" y="64" text-anchor="middle" stroke="none" fill="currentColor" font-size="50" font-weight="700">'+esc(name)+'</text>';
    return '<svg viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">'+body+'</svg>';
  }
  function facesLeft(s,key){return s.scene==='swarm'&&scenes.swarm.nodes.some(n=>n.id===key&&n.x>50);}
  function sceneObject(name){
    // Drawn stage props, deliberately without invented terminal output or log entries.
    const drawings={
      file:'<path class="prop-paper-back" d="M20 18h53v68H20z" transform="rotate(-9 47 52)"/><path class="prop-surface" d="M28 9h39l17 17v64H28z"/><path d="M66 9v19h18M39 45h31M39 56h31M39 67h22"/><path class="prop-accent" d="M28 31h7v48h-7z"/>',
      board:'<rect class="prop-surface" x="8" y="14" width="84" height="68" rx="4"/><path d="M8 29h84M27 29v53M16 22h2m6 0h2m6 0h2"/><path class="prop-accent" d="M36 38h43v12H36z"/><path d="M36 59h40M36 68h26M37 90h27"/>',
      server:'<path class="prop-paper-back" d="m68 9 19 10v68l-19 5z"/><rect class="prop-surface" x="14" y="9" width="57" height="83" rx="4"/><path d="M14 36h57M14 64h57M27 23h24M27 50h24M27 78h24"/><circle class="prop-accent" cx="60" cy="23" r="3"/><circle class="prop-accent" cx="60" cy="50" r="3"/><circle class="prop-accent" cx="60" cy="78" r="3"/>',
      code:'<rect class="prop-surface" x="6" y="16" width="88" height="69" rx="4"/><path d="M6 31h88M16 23h2m6 0h2m6 0h2M31 46 19 58l12 12m38-24 12 12-12 12M56 42 45 75"/>',
      lock:'<path class="prop-paper-back" d="M14 90V8h68v82"/><path d="M24 16h48M24 24h48"/><rect class="prop-surface" x="25" y="46" width="50" height="42" rx="4"/><path d="M35 46V34a15 15 0 0 1 30 0v12"/><circle class="prop-accent" cx="50" cy="62" r="4"/><path d="M50 65v10"/>',
      seal:'<path class="prop-paper-back" d="M23 10h55v79H23z"/><path d="M33 23h32M33 33h22"/><circle class="prop-surface" cx="51" cy="64" r="25"/><circle cx="51" cy="64" r="19"/><path d="m40 64 8 8 15-17"/>',
      target:'<circle class="prop-surface" cx="50" cy="50" r="35"/><circle cx="50" cy="50" r="23"/><circle cx="50" cy="50" r="10"/><path d="M50 5v17m0 56v17M5 50h17m56 0h17"/>',
      shield:'<path class="prop-surface" d="m50 9 33 13v31c0 17-17 32-33 40C34 85 17 70 17 53V22z"/><path d="m50 19 23 9v24c0 13-12 26-23 32"/><path d="m31 49 13 13 24-28"/>'
    };
    return drawings[name]?'<svg class="scene-prop" viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'+drawings[name]+'</svg>':icon(name);
  }
  function sceneSet(s){
    const set=window.HF_ART[s.scene].set;
    const motifs={
      signal:'<ellipse cx="790" cy="400" rx="380" ry="320"/><ellipse cx="790" cy="400" rx="280" ry="236"/><path d="M420 400h740M790 60v680"/>',
      archive:'<path d="m470 145 535-70 72 550-535 70zM500 162l535-70 72 550-535 70z"/><path class="set-fill" d="M610 170h440v460H610z"/><path d="M650 225h310M650 250h220M650 530h110"/>',
      boundary:'<path class="set-fill" d="M480 90h540v600H480z"/><path d="M460 90h-30v600h30M1040 90h30v600h-30M445 170h610M445 610h610"/>',
      network:'<path d="M440 165h150l175 210 220-210h145M465 645h125l175-270 220 270h145M765 70v630"/><circle cx="765" cy="375" r="120"/>',
      hypothesis:'<path d="M520 130h450v465H520z" stroke-dasharray="9 14"/><path d="m480 650 560-560"/><circle cx="830" cy="355" r="190"/>',
      threshold:'<path class="set-fill" d="m810 55 290 65v570l-290 65z"/><path d="M810 55H525v700h285M552 90v630M840 160v450"/><path d="M280 400h720"/>',
      friction:'<path d="M300 180h390l-45 95 120 65-150 130 90 70-60 100H300M1200 180H750l-40 95 120 65-150 130 90 70-60 100h490"/>',
      verification:'<circle cx="800" cy="400" r="260"/><circle cx="800" cy="400" r="240" stroke-dasharray="1 18"/><path d="m660 395 90 95 170-210"/>',
      evidence:'<path class="set-fill" d="M480 105h245v550H480z"/><path d="M770 105h320v550H770zM510 150h160M800 150h230M510 605h85M800 605h85"/>',
      chronicle:'<path d="M390 150h760M390 360h760M390 570h760M425 110v510"/>',
      discovery:''
    };
    return '<div class="scene-set" aria-hidden="true"><svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">'+motifs[set]+'</svg></div>';
  }
  function sceneTitle(s){
    const emphasis=window.HF_ART[s.scene].emphasis,at=s.title.indexOf(emphasis);
    return at<0?esc(s.title):esc(s.title.slice(0,at))+'<span class="title-accent">'+esc(emphasis)+'</span>'+esc(s.title.slice(at+emphasis.length));
  }
  function avatar(key,mirror=false){
    // Original vector birds. Species distinguish instances, not model families.
    const eye=(x,y)=>`<g class="bird-eye"><circle cx="${x}" cy="${y}" r="5" fill="#fff8df"/><circle cx="${x+1}" cy="${y}" r="2.5" fill="#17182e"/></g>`;
    const feet='<path d="M39 79v10m-6 0h12m14-10v10m-6 0h12" stroke="#f7b463" stroke-width="4" stroke-linecap="round"/>';
    const birds={
      d:feet+'<path d="m28 65-16 18 26-6" fill="#625e49"/><ellipse cx="46" cy="57" rx="29" ry="30" fill="#898570"/><ellipse cx="53" cy="62" rx="22" ry="23" fill="#f4e7cf"/><path class="bird-wing" d="M26 39C8 52 17 77 37 79l13-23z" fill="#686854"/><g class="bird-head"><circle cx="52" cy="29" r="22" fill="#898570"/><path d="M53 13c21 0 27 24 13 38-4 6-6 15-17 17-13-1-17-11-12-23-7-14 2-29 16-32z" fill="#e97650"/><path d="m72 27 18 6-18 5z" fill="#3c3632"/>'+eye(60,26)+'</g>',
      p: feet+'<ellipse cx="50" cy="56" rx="31" ry="31" fill="#c88753"/><ellipse cx="50" cy="62" rx="21" ry="23" fill="#f3cd8b"/><path class="bird-wing" d="M23 40C4 52 13 73 34 79L30 53z" fill="#935f48"/><g class="bird-head"><path d="m22 16 16 9h25l15-9-3 24H25z" fill="#c88753"/><circle cx="36" cy="38" r="17" fill="#ffe6b3"/><circle cx="64" cy="38" r="17" fill="#ffe6b3"/>'+eye(36,38)+eye(64,38)+'<path d="m45 45 5 10 5-10z" fill="#e38745"/></g><path d="m44 67 6 5 6-5m-12 9 6 5 6-5" fill="none" stroke="#c88753" stroke-width="3"/>',
      b:feet+'<path d="M23 68 12 93l29-10" fill="#654ea0"/><ellipse cx="45" cy="59" rx="25" ry="29" fill="#36314c"/><path class="bird-wing" d="M31 40c-15 9-14 33 11 39l11-11z" fill="#8263b7"/><g class="bird-head"><circle cx="47" cy="30" r="20" fill="#36314c"/><path d="M45 37c11-5 15 0 15 13v12H41z" fill="#fff4c5"/><path d="M58 14C86 11 98 26 95 39H59z" fill="#ffbb4e"/><path d="M58 31h38l-6 10H58z" fill="#ef7758"/><path d="M87 18c8 5 10 12 8 21H84z" fill="#54406e"/>'+eye(48,27)+'</g>',
      c:feet+'<path d="M25 62 11 84l30-11" fill="#2666a5"/><ellipse cx="46" cy="57" rx="23" ry="28" fill="#29b4cf"/><ellipse cx="54" cy="64" rx="16" ry="21" fill="#ffab61"/><path class="bird-wing" d="M27 41C15 57 23 76 44 76l9-10z" fill="#2877b2"/><g class="bird-head"><circle cx="49" cy="29" r="21" fill="#29b4cf"/><path d="m66 23 32 9-31 7z" fill="#222c43"/><path d="M36 37h24l-3 8H43z" fill="#fff5de"/>'+eye(54,26)+'</g>',
      r:feet+'<path d="M29 62 10 93l28-12" fill="#244d4e"/><ellipse cx="47" cy="56" rx="22" ry="29" fill="#b6e0ba"/><path class="bird-wing" d="M28 39C12 56 22 77 42 81l12-18z" fill="#377c69"/><path d="m31 56 10 6m-7 5 10 5" stroke="#e9f3dc" stroke-width="4"/><g class="bird-head"><path d="M32 26 48 5l18 18z" fill="#f26564"/><circle cx="48" cy="31" r="18" fill="#eaf1d9"/><path d="M31 28h18v10H32z" fill="#245251"/><path d="m64 28 27 6-27 6z" fill="#c3c9b5"/>'+eye(54,28)+'</g>',
      m:'<path d="M39 64v27h-9m22-25 13 10-15 15" fill="none" stroke="#f8a4ab" stroke-width="4" stroke-linecap="round"/><ellipse cx="39" cy="57" rx="24" ry="17" fill="#f498c0"/><path class="bird-wing" d="M17 54c11 24 32 21 41 7L38 49z" fill="#cd6ca3"/><g class="bird-head"><path d="M52 58c34-14-3-29 12-40" fill="none" stroke="#f498c0" stroke-width="11" stroke-linecap="round"/><circle cx="69" cy="18" r="11" fill="#f8b0cc"/><path d="M77 18h15v14H81z" fill="#ffe6be"/><path d="M82 27h10l-6 12-6-6z" fill="#343047"/>'+eye(70,16)+'</g>',
      j:feet+'<path d="M28 66 8 87l27-5" fill="#292b48"/><ellipse cx="45" cy="59" rx="26" ry="28" fill="#333a59"/><path class="bird-wing" d="M25 42C7 63 27 83 50 78L54 55z" fill="#4b597c"/><path d="m28 58 14 7m-12 1 13 7" stroke="#6c7ca5" stroke-width="3"/><g class="bird-head"><circle cx="52" cy="28" r="20" fill="#353c59"/><path d="M67 23c19 0 24 7 26 15L67 36z" fill="#727a94"/>'+eye(57,25)+'</g>',
      l:feet+'<path d="M29 66 19 92l23-10" fill="#c7d3d2"/><ellipse cx="45" cy="58" rx="24" ry="28" fill="#f4f4df"/><path class="bird-wing" d="M26 41c-14 17-4 35 20 36l9-16z" fill="#d2dfd6"/><g class="bird-head"><path d="M36 24 28 3l14 10L47 0l8 15L66 4l-1 23z" fill="#e6dd6d"/><circle cx="52" cy="29" r="20" fill="#f7f5df"/><path d="M68 26c19 0 20 15 6 24l-7-10z" fill="#737f7a"/>'+eye(56,26)+'<circle cx="53" cy="39" r="5" fill="#f4d68c"/></g>'
    };
    // The generic agent stays deliberately simple. The beak is drawn first so
    // the head overlaps its root instead of leaving it apparently detached.
    const minimal=feet+'<ellipse cx="46" cy="58" rx="26" ry="26" fill="#9ca9cc"/><path class="bird-wing" d="M24 43c-15 18 0 38 25 34l4-17z" fill="#6d7da6"/><g class="bird-head"><path class="bird-beak" d="M67 28 91 35 67 42Z" fill="#e9b971"/><circle cx="53" cy="30" r="19" fill="#aab7d7"/>'+eye(56,28)+'</g>';
    return '<svg class="bird bird-'+key+'" viewBox="0 0 100 100" aria-hidden="true"><g class="bird-facing"'+(mirror?' transform="translate(100 0) scale(-1 1)"':'')+'><g class="bird-body">'+(birds[key]||minimal)+'</g></g></svg>';
  }
  function diagram(s){
    let d=scenes[s.scene];
    if(!d)return '';
    // Introductory beats belong to the timeline; scene coordinates stay unchanged.
    if(s.overviewPortraits){
      const at=id=>id==='board'?1:s.introductions.find(i=>i.agent===id).step+1;
      const phaseStart=s.introductions.length*2;
      // Finish every portrait first; then add one relationship per beat, top to bottom.
      const leadership=phase=>d.edges.flatMap((e,i)=>e.enter===phase?[phaseStart+i]:[]);
      d={...d,nodes:d.nodes.map(n=>({...n,enter:at(n.id),leadership:n.leadership?.flatMap(leadership)})),edges:d.edges.map((e,i)=>({...e,enter:phaseStart+i,phases:undefined}))};
    }else if(s.introductions?.length){
      const step=s.introductions[0].step,at=n=>n>=step?n+1:n;
      const shift=n=>({...n,enter:at(n.enter),...(n.leave!==undefined?{leave:at(n.leave)}:{}),...(n.dim!==undefined?{dim:at(n.dim)}:{})});
      d={...d,nodes:d.nodes.map(shift),edges:d.edges.map(shift),extras:d.extras.map(shift)};
    }
    const edges=d.edges.map((edge,i)=>{
      const from=d.nodes.find(n=>n.id===edge.from),to=d.nodes.find(n=>n.id===edge.to);
      let x1=from.x*10,y1=from.y*6,x2=to.x*10,y2=to.y*6;
      const dx=x2-x1,dy=y2-y1,distance=Math.hypot(dx,dy),pad=Math.min(70,distance*.23);
      x1+=dx/distance*pad;y1+=dy/distance*pad;x2-=dx/distance*pad;y2-=dy/distance*pad;
      const direction=Math.abs(x2-x1)>Math.abs(y2-y1);
      const bend=edge.style==='reply'?80:0;
      const path=direction?`M${x1},${y1} C${(x1+x2)/2},${y1+bend} ${(x1+x2)/2},${y2+bend} ${x2},${y2}`:`M${x1},${y1} C${x1+bend},${(y1+y2)/2} ${x2+bend},${(y1+y2)/2} ${x2},${y2}`;
      return `<g class="edge ${edge.style}" data-enter="${edge.enter}" ${edge.phases?`data-phases="${edge.phases.join(',')}"`:''} ${edge.leave!==undefined?`data-leave="${edge.leave}"`:''}><path d="${path}" marker-end="url(#arrow-${edge.style})"/><circle r="5" class="packet"><animateMotion dur="1.5s" begin="indefinite" fill="freeze" path="${path}"/></circle></g>`;
    }).join('');
    const nodes=d.nodes.map(n=>{
      const info=cast[n.id],color=info?'var(--agent-'+n.id+','+info[2]+')':'var(--object-color,#a1b0e4)',label=info?info[0]:n.label||'Agentenlauf';
      return `<div class="actor ${n.type} ${info?'named':''} ${window.HF_ART[s.scene].hero===n.id?'scene-hero':''}" data-agent="${n.id}" data-enter="${n.enter}" ${n.leadership?`data-leadership="${n.leadership.join(',')}"`:''} ${n.leave!==undefined?`data-leave="${n.leave}"`:''} ${n.dim!==undefined?`data-dim="${n.dim}"`:''} style="left:${n.x}%;top:${n.y}%;--color:${color};--delay:${-(n.x%7)*.47}s"><div class="portrait">${n.type==='agent'?avatar(n.id,facesLeft(s,n.id)):sceneObject(n.icon)}</div><strong>${esc(label)}</strong>${n.caption||info?'<small>'+esc(n.caption||info[3])+'</small>':''}</div>`;
    }).join('');
    const extras=d.extras.map(x=>x.kind==='zone'?`<div class="zone ${x.color||''}" data-enter="${x.enter}" style="left:${x.x}%;top:${x.y}%;width:${x.w}%;height:${x.h}%"><span>${esc(x.label)}</span></div>`:`<p class="annotation" data-enter="${x.enter}" style="left:${x.x}%;top:${x.y}%">${esc(x.text)}</p>`).join('');
    const defs='<defs>'+Object.entries({flow:'var(--mint)',reply:'var(--mint)',order:'var(--order)',handoff:'var(--gold)',risk:'var(--risk)',assumed:'var(--mint)'}).map(([id,color])=>'<marker id="arrow-'+id+'" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10z" fill="'+color+'"/></marker>').join('')+'</defs>';
    const legend=s.scene==='swarm'?'<div class="swarm-legend"><span class="handoff-key">→ Dossier</span><span class="flow-key">→ Information</span><span class="order-key">→ Auftrag / HOLD</span><span class="reply-key">⇢ Rückmeldung</span><span class="coordination-key"><span class="coordination-ring" aria-hidden="true"></span>zeitweilige Koordination</span></div>':'';
    return '<div class="diagram" aria-hidden="true">'+extras+'<svg class="connections" viewBox="0 0 1000 600" preserveAspectRatio="none">'+defs+edges+'</svg>'+nodes+'</div>'+legend+'<p class="diagram-note">'+esc(d.note)+'</p>';
  }
  function special(s){
    if(filmFiles[s.scene])return '<div class="film-wrap"><iframe id="sceneFilm" class="scene-film" src="assets/huggingface-fall/films/'+filmFiles[s.scene]+'?v=20261006-continuous-finale" title="'+esc(s.scene==='investigation'?'Symbolische Untersuchung des Agentennetzes':'Quintessenz: Vögel formieren sich und landen auf einem Draht')+'" tabindex="-1" aria-hidden="true"></iframe>'+(s.scene==='investigation'?'<iframe id="sceneFlight" class="scene-film scene-flight" src="assets/huggingface-fall/films/02b-folie-25-die-voegel-fliehen.html?v=20261006-continuous-finale" title="Der Schwarm löst sich auf" tabindex="-1" aria-hidden="true"></iframe>':'')+'<p class="film-fallback" id="filmFallback" role="status">Animation wird vorbereitet …</p></div>'+(s.scene==='investigation'?'<div class="investigation-status">'+s.discoveryLabels.map((cue,i)=>'<p data-enter="'+i+'" data-leave="'+(i+1)+'">'+esc(cue)+'</p>').join('')+'</div><p class="diagram-note">Symbolische Rekonstruktion · keine Originalaufnahme · kein genauer Zeitpunkt der ersten menschlichen Beobachtung</p>':'');
    if(s.scene==='title-card')return '<div class="portrait-stage title-portrait"><div class="portrait-backdrop"><span class="portrait-band band-one"></span><span class="portrait-band band-two"></span><span class="portrait-grid"></span></div><div class="portrait-field" aria-hidden="true"><span class="portrait-orbit orbit-one"></span><span class="portrait-orbit orbit-two"></span><div class="intro-art">'+avatar('anon1',true)+'</div></div><div class="portrait-copy"><p class="title-author">'+esc(s.author)+'</p><h2>Der Schwarm,<br>der nicht<br><span>geplant war</span></h2><p class="portrait-sticker">Der Hugging-Face-Fall</p></div></div>';
    if(s.scene==='agent-concept')return '<div class="concept-scene"><div class="concept-agent" aria-hidden="true">'+avatar('anon1',true)+'<span>Ein Arbeitslauf</span></div><div class="concept-panels">'+s.conceptCards.map((c,i)=>'<section class="concept-card" data-enter="'+i+'" data-leave="'+(i+1)+'"><p class="concept-label">'+esc(c.label)+'</p><h2>'+esc(c.heading)+'</h2><p class="concept-definition">'+esc(c.text)+'</p><div class="concept-tags">'+c.tags.map((tag,j)=>'<span>'+esc(tag)+'</span>'+(j<2?'<b aria-hidden="true">'+(i===1?'→':'+')+'</b>':'')).join('')+'</div><p class="concept-foot">'+esc(c.foot)+'</p></section>').join('')+'</div></div>';
    if(s.scene==='early-warning')return '<ol class="warning-history">'+s.milestones.map((m,i)=>'<li data-enter="'+i+'"><p class="history-date">'+esc(m.date)+'</p><h2>'+esc(m.title)+'</h2><p>'+esc(m.text)+'</p>'+(m.detail?'<p class="history-detail">'+esc(m.detail)+'</p>':'')+'</li>').join('')+'</ol>';
    if(s.scene==='sources')return '<div class="source-list">'+sources.slice(0,3).map((x,i)=>'<section><span class="source-no">0'+(i+1)+'</span><h2><a href="'+x.url+'" target="_blank" rel="noopener noreferrer">'+esc(x.name)+'</a></h2><p>'+esc(x.scope)+'</p><small>'+esc(x.date)+'</small></section>').join('')+'</div>';
    return '<div class="download-scene"><div class="script-symbol" aria-hidden="true">'+icon('file')+'</div><div><a class="primary download-link overview-download" href="output/pdf/der-schwarm-der-nicht-geplant-war.pdf?v=20260922-artikel" download="Der-Schwarm-der-nicht-geplant-war.pdf">Übersicht „Der Schwarm, der nicht geplant war“ ↓</a><a class="primary download-link" href="output/pdf/huggingface-fall-begleitskript.pdf?v=20261006-continuous-finale" download="Hugging-Face-Fall-Vortragsskript.pdf">Vortragsskript als PDF ↓</a><button id="downloadText">Editierbare Textversion ↓</button><p>'+slides.length+' Folien · Regiehinweise · Originalauszüge · Quellen</p><p class="muted">Auf dem iPad: PDF öffnen und über das Teilen-Menü in „Dateien“ sichern.</p><p><a href="impressum.html">Impressum</a> · <a href="datenschutz.html">Datenschutzhinweise</a></p></div></div>';
  }
  function render(){
    clearFinaleTransition();
    sceneMovie?.dispose();flightMovie?.dispose();sceneMovie=null;flightMovie=null;clearBirdFlight();
    const s=current();
    const oldFlock=$('slide').querySelector('.flock-layer');
    const retainedFlock=backgroundFlockAllowed()&&oldFlock?.querySelector('.flock-bird')?oldFlock:null;
    finaleStarted=s.scene==='quintessence'&&state.step>0;
    const art=window.HF_ART[s.scene];
    $('slide').className='scene-slide cinema '+s.scene+' tone-'+art.tone+' set-'+art.set+(s.quotes?' has-quotes':'');
    $('slide').innerHTML=sceneSet(s)+flock()+'<div class="slide-heading"><p class="eyebrow">'+esc(s.chapter)+'</p><p class="calendar">'+esc(s.date)+'<span>2026</span></p><h1 id="slideTitle" tabindex="-1">'+sceneTitle(s)+'</h1><p class="lead">'+esc(s.lead)+'</p></div><div class="stage">'+(scenes[s.scene]?diagram(s):special(s))+(s.quotes?'<div id="quoteArea" class="quote-area"></div>':'')+'</div><div class="scene-bottom"><p id="populationNote" class="population-note" hidden></p><p id="cue" role="status" aria-live="polite"></p>'+citations(s)+'</div>'+(s.introductions?'<section id="introPanel" class="intro-panel" aria-labelledby="introName" hidden></section>':'');
    // Keep the existing birds across scene changes instead of restarting their arrival.
    if(retainedFlock)$('slide').querySelector('.flock-layer').replaceWith(retainedFlock);
    // Establish the previous density before fading in the additional silhouettes.
    $('slide').querySelector('.flock-layer').getBoundingClientRect();
    updateStep(false);
    if(filmSteps[s.scene]){
      const movie=sceneMovie=new HFMovie($('sceneFilm'),{
        ready:()=>{if(sceneMovie===movie){$('filmFallback').hidden=true;startFilmCrossfade(movie);}},
        change:()=>{if(sceneMovie===movie){syncFinaleStep(movie);moviePlayback();}},
        ended:()=>{if(sceneMovie===movie)moviePlayback();}
      });
      movie.theme(state.theme);
      if(s.scene==='investigation'){
        const flight=flightMovie=new HFMovie($('sceneFlight'),{
          ready:()=>{if(flightMovie===flight&&state.step===3)$('filmFallback').hidden=true;},
          change:()=>{if(flightMovie===flight&&current().scene==='investigation'&&state.step===3){moviePlayback();scrubBirdFlight(flight.time);}},
          ended:()=>{if(flightMovie===flight)moviePlayback();}
        });
        flight.theme(state.theme);flight.seek(0);
        setTimeout(()=>{if(flightMovie===flight&&!flight.ready){flight.pause();flight.failed=true;moviePlayback();}},7000);
      }
      showFilmStep(s.scene!=='quintessence'&&state.step===0&&state.motion&&!reduced.matches);
      setTimeout(()=>{if(sceneMovie===movie&&!movie.ready){movie.pause();$('filmFallback').textContent='Die Animation konnte nicht geladen werden. Alle Aussagen stehen darunter und im Sprechtext. Du kannst weiterblättern.';startFilmCrossfade(movie);}},7000);
    }
  }
  function moviePlayback(){
    const movie=activeMovie();if(!movie||openingActive)return;
    if($('filmFallback')){
      $('filmFallback').hidden=movie.ready;
      if(movie.failed)$('filmFallback').textContent='Die Animation konnte nicht geladen werden. Du kannst weiterblättern; alle Aussagen stehen im Sprechtext.';
    }
    if(current().scene==='quintessence'){
      const finished=movie.time>=14.97;
      $('slide').dataset.filmStarted=String(finaleStarted);
      $('play').hidden=false;$('replay').hidden=false;
      $('play').textContent=!finaleStarted?'Abschlussfilm starten':!movie.paused?'Film anhalten':finished?'Film wiederholen':'Film fortsetzen';
      $('play').setAttribute('aria-label',$('play').textContent);$('play').setAttribute('aria-pressed',String(!movie.paused));
      $('next').textContent=!finaleStarted?'Abschlussfilm starten →':finished?'Zusatzmaterialien →':'Film läuft …';
      $('next').disabled=finaleStarted&&!finished;
      $('buildPosition').textContent=finaleStarted?Math.min(15,movie.time).toFixed(0)+' / 15 Sekunden':'15 Sekunden · ohne Zwischenstopps';
      return;
    }
    const endpoint=filmSteps[current().scene][state.step];
    $('play').hidden=false;$('replay').hidden=false;
    $('play').textContent=!movie.paused?'Etappe anhalten':movie.time<endpoint-.03?'Etappe fortsetzen':'Etappe wiederholen';
    $('play').setAttribute('aria-label',$('play').textContent);
    $('play').setAttribute('aria-pressed',String(!movie.paused));
  }
  function showFilmStep(animate){
    const movie=activeMovie();if(!movie)return;
    if(current().scene==='quintessence'){movie.seek(finaleStarted?filmSteps.quintessence[state.step]:0);moviePlayback();return;}
    const ends=filmSteps[current().scene],endpoint=ends[state.step];
    sceneMovie?.pause();flightMovie?.pause();clearBirdFlight();
    const flight=current().scene==='investigation'&&state.step===3;
    if(flight)sceneMovie.seek(5);
    const start=flight?0:state.step?ends[state.step-1]:0;
    movie.seek(animate?start:endpoint);
    if(flight)scrubBirdFlight(animate?0:endpoint);
    if(animate)movie.playTo(endpoint);
    moviePlayback();
  }
  function updateStep(animate=true){
    const s=current();$('slide').dataset.step=state.step;
    const intro=introduction();
    const population=populationAt(s,state.step),density=backgroundFlockDensity();
    $('slide').classList.toggle('flock-revealed',s.id==='aufarbeitung'&&state.step>=2);
    lastFlockDensity=density;
    $('slide').querySelectorAll('.flock-bird').forEach(b=>b.classList.toggle('present',Number(b.dataset.bird)<density));
    $('populationNote').hidden=!population||!!intro;
    $('populationNote').innerHTML=population?'<strong>'+esc(population.label)+'</strong><span>'+esc(population.scope)+'</span><small>Silhouetten symbolisch · keine Live-Zählung</small>':'';
    $('slide').classList.toggle('introducing',!!intro);
    $('slide').querySelector('.slide-heading').setAttribute('aria-hidden',String(!!intro));
    $('slide').querySelector('.stage').setAttribute('aria-hidden',String(!!intro));
    if($('introPanel')){
      $('introPanel').hidden=!intro;
      if(intro){
        const person=cast[intro.agent];
        $('introPanel').style.setProperty('--color','var(--agent-'+intro.agent+','+person[2]+')');
        const longName=person[0].replace(/\[.*$/,'').length>10?' long-name':'';
        $('introPanel').innerHTML='<div class="portrait-stage" aria-label="Porträt von '+esc(person[0])+'"><div class="portrait-backdrop"><span class="portrait-band band-one"></span><span class="portrait-band band-two"></span><span class="portrait-grid"></span></div><div class="portrait-field" aria-hidden="true"><span class="portrait-orbit orbit-one"></span><span class="portrait-orbit orbit-two"></span><span class="portrait-star star-one"></span><span class="portrait-star star-two"></span><span class="portrait-star star-three"></span><div class="intro-art">'+avatar(intro.agent,facesLeft(s,intro.agent))+'</div></div><div class="portrait-copy"><h2 id="introName" class="'+longName.trim()+'" tabindex="-1">'+introName(person[0])+'</h2><p class="portrait-sticker">'+esc(intro.role||portraitTasks[intro.agent])+'</p></div></div>';
      }else $('introPanel').replaceChildren();
    }
    $('slide').querySelectorAll('[data-enter]').forEach(el=>{
      const visible=Number(el.dataset.enter)<=state.step&&!(el.dataset.leave!==undefined&&state.step>=Number(el.dataset.leave))&&(!el.dataset.phases||el.dataset.phases.split(',').includes(String(state.step)));
      const was=el.classList.contains('visible');
      el.classList.toggle('visible',visible);
      el.classList.toggle('dimmed',el.dataset.dim!==undefined&&state.step>=Number(el.dataset.dim));
      el.classList.toggle('coordinating',!!el.dataset.leadership&&el.dataset.leadership.split(',').includes(String(state.step)));
      if(el.classList.contains('edge')){
        const motion=el.querySelector('animateMotion');
        if(visible&&!was&&animate&&state.motion&&!reduced.matches){try{el.classList.add('moving');motion.addEventListener('endEvent',()=>el.classList.remove('moving'),{once:true});motion.beginElement();}catch(_){el.classList.remove('moving');}}
        else if(!visible){el.classList.remove('moving');try{motion.endElement();}catch(_){}}
      }
    });
    const cueChanged=$('cue').textContent!==s.cues[state.step];
    $('cue').textContent=s.cues[state.step];
    if(cueChanged&&animate&&state.motion&&!reduced.matches&&!intro){
      $('cue').getAnimations().forEach(a=>a.cancel());
      $('cue').animate([{opacity:.2,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'ease-out'});
    }
    if(s.quotes){const q=s.quotes.filter(q=>q.step<=state.step).at(-1);$('quoteArea').innerHTML=q?quoteHTML(q):'';}
    $('position').textContent='Folie '+String(state.index+1).padStart(2,'0')+' / '+slides.length;
    $('buildPosition').textContent='Aufbau '+(state.step+1)+' / '+s.cues.length;
    if(s.scene==='investigation')$('slide').querySelector('.calendar').innerHTML=state.step===3?'Zum Nachspiel':esc(['16.–17. Juli','19. Juli','20. Juli'][state.step])+'<span>2026</span>';
    $('progress').style.width=((state.index+(state.step+1)/s.cues.length)/slides.length*100)+'%';
    $('prev').disabled=state.index===0&&state.step===0;
    $('next').disabled=state.index===slides.length-1&&state.step===s.cues.length-1;
    $('next').textContent=intro?'In die Szene →':state.step<s.cues.length-1?'Weiter aufbauen →':'Nächste Folie →';
    if(s.scene==='investigation'&&state.step===2)$('next').textContent='Schwarm auflösen →';
    $('play').hidden=s.cues.length===1;$('replay').hidden=s.cues.length===1;
    $('play').textContent=timer?'Anhalten':'Szene abspielen';
    $('play').setAttribute('aria-label','Aktuelle Szene automatisch aufbauen');
    $('play').setAttribute('aria-pressed',String(!!timer));
    if(state.step===s.cues.length-1&&s.scene!=='quintessence')stop();
    moviePlayback();
    save();
  }
  function stop(){clearInterval(timer);timer=null;if(openingActive){openingMovie?.pause();openingPlayback();return;}if(sceneMovie){sceneMovie.pause();flightMovie?.pause();moviePlayback();return;}$('play').textContent='Szene abspielen';$('play').setAttribute('aria-pressed','false');}
  function cancelDocking(){
    cancelCrossfade();
    if(docking){const old=docking;docking=null;(old.animations||[old.animation]).filter(Boolean).forEach(animation=>animation.cancel());(old.clones||[old.clone]).filter(Boolean).forEach(clone=>clone.remove());old.target?.classList.remove('arriving');}
    $('slide').classList.remove('portrait-docking');
  }
  function cancelCrossfade(){
    if(!crossfade)return;
    const old=crossfade;crossfade=null;
    old.animations.forEach(a=>a.cancel());old.layer.remove();
  }
  function snapshotSlide(){
    const original=$('slide'),box=original.getBoundingClientRect(),viewport=$('viewport').getBoundingClientRect();
    const layer=document.createElement('div');layer.className='slide-crossfade';layer.inert=true;layer.setAttribute('aria-hidden','true');
    Object.assign(layer.style,{left:viewport.left+'px',top:viewport.top+'px',width:viewport.width+'px',height:viewport.height+'px'});
    const copy=original.cloneNode(true);
    // Only foreground content crossfades; duplicating the flock causes flicker.
    copy.querySelector('.flock-layer')?.remove();
    // A cloned iframe would reload and create a second film controller.
    copy.querySelectorAll('iframe').forEach(el=>el.remove());
    // Namespace snapshot IDs, including SVG arrow markers. The live DOM remains unique.
    copy.querySelectorAll('[id]').forEach(el=>{
      if(el.id==='cue'){
        const style=getComputedStyle($('cue'));
        for(const prop of ['font','line-height','color','margin','display','align-items','min-height','max-width'])el.style.setProperty(prop,style.getPropertyValue(prop));
      }
      el.id='fade-'+el.id;
    });copy.id='fade-slide';
    copy.querySelectorAll('[marker-end]').forEach(el=>el.setAttribute('marker-end',el.getAttribute('marker-end').replace('url(#','url(#fade-')));
    copy.querySelectorAll('animateMotion').forEach(el=>el.remove());
    Object.assign(copy.style,{position:'absolute',left:(box.left-viewport.left)+'px',top:(box.top-viewport.top)+'px',width:box.width+'px',height:box.height+'px',minHeight:'0',margin:'0'});
    layer.append(copy);return layer;
  }
  function startFilmCrossfade(movie){
    if(crossfade?.movie===movie){crossfade.movie=null;crossfade.animations.forEach(a=>a.play());}
  }
  function blendSlides(layer,waitForMovie=null){
    document.body.append(layer);crossfade={layer,animations:[],movie:waitForMovie};
    try{
      const options={duration:waitForMovie?800:480,easing:'ease-in-out',fill:'both'};
      const outgoing=layer.animate([{opacity:1},{opacity:0}],options);
      const incoming=[...$('slide').children].filter(el=>!el.classList.contains('flock-layer'))
        .map(el=>{
          const move=!waitForMovie&&!$('slide').classList.contains('introducing')&&el.matches('.slide-heading,.stage');
          return el.animate(move?[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}]:[{opacity:0},{opacity:1}],options);
        });
      crossfade.animations=[outgoing,...incoming];
      // Hold the old composition until the iframe can paint its first frame.
      if(waitForMovie&&!waitForMovie.ready)crossfade.animations.forEach(a=>{a.pause();a.currentTime=0;});
      else crossfade.movie=null;
      Promise.all(crossfade.animations.map(a=>a.finished)).then(()=>{if(crossfade?.layer===layer)cancelCrossfade();},()=>{});
    }catch(_){cancelCrossfade();}
  }
  function portraitSnapshot(step){
    return state.motion&&!reduced.matches&&step!==state.step&&(introduction()||current().introductions?.some(i=>i.step===step))?snapshotSlide():null;
  }
  function changeBuild(step){
    cancelDocking();
    const forward=step>state.step;
    const snapshot=portraitSnapshot(step);
    state.step=step;updateStep(!snapshot);
    showFilmStep(forward&&state.motion&&!reduced.matches);
    if(snapshot)blendSlides(snapshot);
  }
  function advance(){
    cancelDocking();
    $('slide').classList.remove('enter-slide');
    const titleExit=current().scene==='title-card';
    const intro=titleExit?{agent:'anon1'}:introduction(),art=titleExit?$('slide').querySelector('.title-portrait'):$('introPanel')?.querySelector('.portrait-stage');
    if(!intro){changeBuild(state.step+1);return;}
    const start=art?.getBoundingClientRect(),bird=art?.querySelector('.intro-art'),copy=art?.querySelector('.portrait-copy');
    const birdBox=bird?.getBoundingClientRect(),copyBox=copy?.getBoundingClientRect(),birdHTML=bird?.innerHTML,backdropHTML=art?.querySelector('.portrait-backdrop')?.outerHTML;
    const portraitColor=art?getComputedStyle(art).getPropertyValue('--color'):'';
    const heading=copy?.querySelector('h2'),headingStyle=heading?getComputedStyle(heading):null;
    const headingTypography=headingStyle?Object.fromEntries(['font-size','line-height','letter-spacing','font-family','font-weight','white-space'].map(p=>[p,headingStyle.getPropertyValue(p)])):{};
    const titleTypography=titleExit&&copy?[...copy.querySelectorAll('*')].map(el=>{const css=getComputedStyle(el);return Object.fromEntries(['font-size','line-height','letter-spacing','font-family','font-weight','white-space','color','text-shadow','margin-top','margin-bottom','margin-left','padding','transform','background-color'].map(p=>[p,css.getPropertyValue(p)]));}):null;
    if(titleExit){
      state.index++;state.step=0;render();$('viewport').scrollTop=0;
      try{history.replaceState(null,'','#'+current().id);}catch(_){}
      $('slideTitle').focus({preventScroll:true});
    }else state.step++;
    if(intro)$('slide').classList.add('portrait-docking');
    updateStep(!intro);
    if(!intro||!state.motion||reduced.matches||!start||!birdBox){cancelDocking();return;}
    const candidate=$('slide').querySelector(titleExit?'.concept-agent > .bird':'[data-agent="'+intro.agent+'"] .portrait');
    const target=candidate?.getBoundingClientRect().width?candidate:null;
    const end=target?.getBoundingClientRect()||(titleExit?{left:birdBox.left+birdBox.width/2,top:birdBox.top+birdBox.height/2,width:1,height:1}:null);
    if(!end||!end.width){cancelDocking();return;}
    const makeClone=(className,html,box)=>{const clone=document.createElement('div');clone.className=className;clone.innerHTML=html||'';clone.setAttribute('aria-hidden','true');Object.assign(clone.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});clone.style.setProperty('--color',portraitColor);document.body.append(clone);return clone;};
    const birdClone=makeClone('docking-bird',birdHTML,birdBox),backdropClone=makeClone('docking-backdrop',backdropHTML,start),copyClone=copyBox?makeClone('docking-copy',copy.innerHTML,copyBox):null;
    if(copyClone)for(const [property,value]of Object.entries(headingTypography))copyClone.querySelector('h2').style.setProperty(property,value);
    if(copyClone&&titleTypography)[...copyClone.querySelectorAll('*')].forEach((el,i)=>{for(const [property,value]of Object.entries(titleTypography[i]))el.style.setProperty(property,value);});
    target?.classList.add('arriving');docking={clones:[birdClone,backdropClone,copyClone],target,animations:[]};
    try{
      const dx=end.left-birdBox.left,dy=end.top-birdBox.top,sx=end.width/birdBox.width,sy=end.height/birdBox.height;
      const birdFrames=[{transform:'translate(0,0) scale(1,1)'},{transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`}];
      // dx/dy describe the target's top-left corner. Scaling around that same
      // corner keeps every portrait on the position of its matching scene node.
      Object.assign(birdClone.style,{transformOrigin:'0 0'});
      const birdAnimation=birdClone.animate(birdFrames,{duration:980,easing:'cubic-bezier(.36,.02,.17,1)',fill:'forwards'});
      const backdropAnimation=backdropClone.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate(-42vw,12vh) rotate(-7deg) scale(1.12)',opacity:0}],{duration:760,easing:'cubic-bezier(.5,0,.7,.4)',fill:'forwards'});
      const copyAnimation=copyClone?.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:'translate(34vw,-18vh) rotate(8deg)',opacity:0}],{duration:690,easing:'cubic-bezier(.4,0,.8,.3)',fill:'forwards'});
      docking.animations=[birdAnimation,backdropAnimation,copyAnimation].filter(Boolean);birdAnimation.finished.then(()=>{if(docking?.clones?.includes(birdClone))cancelDocking();},()=>{});
    }catch(_){cancelDocking();}
  }
  function go(index,step=0,hash=true,focus=true){
    if(index<0||index>=slides.length)return;
    finishOpening(false);
    stop();cancelDocking();
    const discoveryTransition=current().id==='schwarm-organigramm'&&slides[index].id==='aufarbeitung';
    const snapshot=index!==state.index&&state.motion&&!reduced.matches&&$('slide').hasChildNodes()?snapshotSlide():index===state.index?portraitSnapshot(step):null;
    state.index=index;state.step=Math.max(0,Math.min(step,slides[index].cues.length-1));
    render();$('viewport').scrollTop=0;
    if(snapshot&&current().scene==='quintessence'&&!finaleStarted){
      finaleCover=snapshot;finaleCover.classList.add('finale-backdrop');document.body.append(finaleCover);
    }else if(snapshot)blendSlides(snapshot,discoveryTransition?sceneMovie:null);
    if(hash){try{history.replaceState(null,'','#'+current().id);}catch(_){}}
    if(focus)($('introName')||$('slideTitle')).focus({preventScroll:true});
  }
  function next(){if(openingActive){finishOpening();return;}if(current().scene==='quintessence'){if(!finaleStarted)play();else if(sceneMovie?.time>=14.97)go(state.index+1);return;}stop();if(current().scene==='title-card'||state.step<current().cues.length-1)advance();else go(state.index+1);}
  function prev(){stop();cancelDocking();if(current().scene==='quintessence'&&state.index>0)go(state.index-1,slides[state.index-1].cues.length-1);else if(state.step>0){changeBuild(state.step-1);}else if(state.index>0)go(state.index-1,slides[state.index-1].cues.length-1);}
  function play(){
    if(openingActive){toggleOpeningPlayback();return;}
    if(sceneMovie){
      const movie=activeMovie();
      if(!movie.paused){movie.pause();moviePlayback();return;}
      if(current().scene==='quintessence'){
        finaleStarted=true;$('slide').dataset.filmStarted='true';
        if(!state.motion||reduced.matches){movie.seek(15);syncFinaleStep(movie);moviePlayback();return;}
        if(movie.time>=14.97)movie.seek(0);
        scrubFinaleFade(movie.time);movie.playTo(15);moviePlayback();return;
      }
      const ends=filmSteps[current().scene];
      if(!state.motion||reduced.matches){showFilmStep(false);return;}
      if(movie.time>=ends[state.step]-.03){movie.seek(current().scene==='investigation'&&state.step===3?0:state.step?ends[state.step-1]:0);if(movie===flightMovie){clearBirdFlight();scrubBirdFlight(0);}}
      movie.playTo(ends[state.step]);moviePlayback();return;
    }
    if(timer){stop();return;}
    cancelDocking();if(state.step===current().cues.length-1)changeBuild(0);
    timer=setInterval(advance,4000);
    $('play').textContent='Anhalten';$('play').setAttribute('aria-pressed','true');
  }
  function open(id){stop();cancelDocking();$(id).showModal();}
  function deepDives(s,step){return(s.deepDives||[]).filter(item=>item.step===step);}
  function deepDiveHTML(item){
    return '<details class="script-depth"><summary>Vertiefung bei Nachfragen: '+esc(item.question)+'</summary>'+item.answer.map(p=>'<p>'+esc(p)+'</p>').join('')+(item.note?'<p class="muted">'+esc(item.note)+'</p>':'')+'<p class="depth-sources">Quellen / Einordnung: '+item.sources.map(id=>'<a href="'+esc(speakerSources[id].url)+'" target="_blank" rel="noopener noreferrer">'+esc(speakerSources[id].name)+'</a>').join(' · ')+'</p></details>';
  }
  function deepDiveText(item){
    return ['VERTIEFUNG BEI NACHFRAGEN',item.question,...item.answer,...(item.note?[item.note]:[]),'Quellen / Einordnung: '+item.sources.map(id=>speakerSources[id].name+' — '+speakerSources[id].url).join('\n'),''];
  }
  function notes(){const s=current();$('notesTitle').textContent='Folie '+(state.index+1)+': '+s.title;
    $('notesBody').innerHTML='<p class="notes-date">'+esc(s.date)+' · 2026</p>'+s.notes.map((p,i)=>'<section class="script-step '+(state.step===i?'current':'')+'"><h3>Aufbau '+(i+1)+'</h3><p class="direction">'+esc(s.cues[i])+'</p>'+(populationScript(s,i)?'<p class="population-explanation">'+esc(populationScript(s,i))+'</p>':'')+(s.quotes||[]).filter(q=>q.step===i).map(quoteHTML).join('')+'<p>'+esc(p)+'</p>'+deepDives(s,i).map(deepDiveHTML).join('')+'</section>').join('')+(s.transitionNote?'<aside class="direction"><strong>Regie · Übergang</strong><p>'+esc(s.transitionNote)+'</p></aside>':'')+citations(s);open('notesDialog');
    $('notesBody').querySelector('.current')?.scrollIntoView({block:'nearest'});
  }
  function downloadText(){
    const text=['DER HUGGING-FACE-FALL','Vortragsskript · Stand '+date,'Claus Unterberg','',
      'BEDIENUNG','Weiter baut die Szene schrittweise auf. Szene abspielen führt nur die aktuelle Szene automatisch vor. Jede Regiezeile passt zu einem Aufbau. Zeiten aus der METR-Rekonstruktion sind UTC. Figuren und Diagramme sind didaktische Darstellungen, keine Originalaufnahmen.','',
      ...slides.flatMap((s,i)=>['FOLIE '+(i+1)+' · '+s.title,s.date+' · 2026',s.lead,'',...s.notes.flatMap((p,j)=>['AUFBAU '+(j+1)+' / BILD: '+s.cues[j],populationScript(s,j),...(s.quotes||[]).filter(q=>q.step===j).map(q=>q.speaker+' / '+q.kind+'\nEN: '+q.en+'\nDE (eigene Übersetzung): '+q.de),p,'',...deepDives(s,j).flatMap(deepDiveText)]),...(s.transitionNote?['REGIE · ÜBERGANG',s.transitionNote,'']:[]),'Quellen: '+s.sources.map(id=>sources.find(x=>x.id===id).url).join(' '),'']),
      'QUELLEN',...sources.map(s=>s.name+' ('+s.date+')\n'+s.url+'\n'+s.scope)].join('\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');
    a.href=url;a.download='Hugging-Face-Fall-Vortragsskript.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
function syncMotion(){cancelDocking();if(!state.motion||reduced.matches){openingMovie?.pause();showFilmStep(false);}document.body.classList.toggle('no-motion',!state.motion||reduced.matches);$('motion').checked=state.motion&&!reduced.matches;}
  function syncTheme(){document.documentElement.dataset.theme=state.theme;openingMovie?.theme(state.theme);sceneMovie?.theme(state.theme);flightMovie?.theme(state.theme);document.querySelectorAll('input[name="theme"]').forEach(input=>input.checked=input.value===state.theme);}
  function syncProjector(){document.documentElement.dataset.projector=String(state.projector);$('projector').checked=state.projector;}
  $('prev').onclick=prev;$('next').onclick=next;$('play').onclick=play;
  $('startOpeningButton').onclick=toggleOpeningPlayback;
  $('openingStage').onclick=e=>{if(openingActive&&openingStarted&&!e.target.closest('button'))toggleOpeningPlayback();};
  $('replay').onclick=()=>{if(openingActive){clearTitleArrival();$('slide').hidden=true;openingMovie.seek(0);toggleOpeningPlayback();return;}if(current().scene==='quintessence'){stop();clearFinaleTransition();finaleStarted=false;state.step=0;sceneMovie.seek(0);updateStep(false);play();return;}stop();changeBuild(0);showFilmStep(state.motion&&!reduced.matches);$('viewport').scrollTop=0;};
  $('notes').onclick=notes;
  $('overview').onclick=()=>{$('slideList').innerHTML=slides.map((s,i)=>'<button data-slide="'+i+'" aria-current="'+(i===state.index)+'"><span>'+String(i+1).padStart(2,'0')+'</span><span>'+esc(s.title)+'<small>'+esc(s.date)+'</small></span></button>').join('');open('menuDialog');};
  $('settings').onclick=()=>{$('storageStatus').textContent=storageOK?'Farbschema, Projektor- und Bewegungseinstellung werden gespeichert. Beim Öffnen oder Neuladen erscheint immer der Startbildschirm, ohne automatische Wiedergabe.':'Beim Öffnen oder Neuladen erscheint immer der Startbildschirm, ohne automatische Wiedergabe. Einstellungen können hier nicht gespeichert werden.';open('settingsDialog');};
  $('projector').onchange=e=>{state.projector=e.target.checked;syncProjector();save();};
  document.querySelectorAll('input[name="theme"]').forEach(input=>input.onchange=()=>{if(input.checked){stop();cancelDocking();state.theme=input.value;syncTheme();save();}});
  $('motion').onchange=e=>{stop();state.motion=e.target.checked;syncMotion();save();};
  reduced.addEventListener('change',()=>{stop();syncMotion();});
  $('fullscreen').onclick=async()=>{
    stop();cancelDocking();
    // A fullscreen element is added to the browser's top layer. Close the modal
    // first so it cannot be stranded behind the newly promoted document.
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    $('fullscreenStatus').textContent='';
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
      else throw Error();
      $('settings').focus({preventScroll:true});
    }catch(_){open('settingsDialog');$('fullscreenStatus').textContent='Vollbild ist in diesem Browser nicht verfügbar. Die Präsentation passt sich auch im Browserfenster an.';}
  };
  document.addEventListener('fullscreenchange',()=>{cancelDocking();$('fullscreen').textContent=document.fullscreenElement?'Vollbild beenden':'Vollbild einschalten';});
  window.addEventListener('resize',()=>{cancelDocking();if(openingActive&&openingStarted){clearTitleArrival();scrubOpeningTitle(openingMovie.time);}if(current().scene==='investigation'&&state.step===3&&flightMovie){clearBirdFlight();scrubBirdFlight(flightMovie.time);}});
  $('viewport').addEventListener('scroll',()=>{if(docking)cancelDocking();},{passive:true});
  $('reset').onclick=()=>{$('settingsDialog').close();open('resetDialog');};
  $('confirmReset').onclick=()=>{$('resetDialog').close();go(0);startOpening();};
  document.addEventListener('click',e=>{
    const close=e.target.closest('[data-close]');if(close)$(close.dataset.close).close();
    const jump=e.target.closest('[data-slide]');if(jump){$('menuDialog').close();go(Number(jump.dataset.slide));}
    if(e.target.closest('#downloadText'))downloadText();
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape')stop();
    if(document.querySelector('dialog[open]')||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,button,a,video'))return;
    if(openingActive&&['ArrowRight','ArrowLeft',' ','Home'].includes(e.key)){
      e.preventDefault();if(e.key==='ArrowRight')finishOpening();else if(e.key===' ')toggleOpeningPlayback();else if(e.key==='Home')startOpening();return;
    }
    if(['ArrowRight','ArrowLeft',' ','Home','End'].includes(e.key)){
      e.preventDefault();if(e.key==='ArrowLeft')prev();else if(e.key==='Home')go(0);else if(e.key==='End')go(slides.length-1);else next();
    }
  });
  $('viewport').addEventListener('touchstart',e=>{touch=e.touches.length===1&&!e.target.closest('button,a,input,textarea,select,video')?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
  $('viewport').addEventListener('touchmove',e=>{if(e.touches.length!==1)touch=null;},{passive:true});
  $('viewport').addEventListener('touchend',e=>{if(!touch||document.querySelector('dialog[open]'))return;const p=e.changedTouches[0],dx=p.clientX-touch.x,dy=p.clientY-touch.y;touch=null;if(Math.abs(dx)>85&&Math.abs(dx)>Math.abs(dy)*2.5){dx<0?next():prev();}},{passive:true});
  $('viewport').addEventListener('touchcancel',()=>{touch=null;},{passive:true});
  document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('page-inactive',document.hidden);if(document.hidden){stop();cancelDocking();}});
  window.addEventListener('pagehide',()=>{stop();cancelDocking();});
  const aliases={beteiligte:'auftrag',grenze:'zugang',kollektiv:'organisation',ziel:'bewertung',entscheidung:'bewertung',juli:'zugang',hemmung:'reibungen',reaktion:'aufarbeitung',schutz:'bilanz',check:'schwarm-organigramm',einordnung:'schwarm-organigramm','portraet-phaseone-big':'uebergabe','portraet-entdeckung':'zugang','portraet-current':'bestaetigung','portraet-marb':'schwerpunkt','portraet-jan':'codeausfuehrung','portraet-lily':'koordination'};
  const hashIndex=()=>slides.findIndex(s=>s.id===(aliases[location.hash.slice(1)]||location.hash.slice(1)));
  window.addEventListener('hashchange',()=>{const i=hashIndex();if(i>=0)go(i);});
  // A fresh call always starts at the beginning, even with a stale deep link.
  try{history.scrollRestoration='manual';}catch(_){}
  openingMovie=new HFMovie($('openingFilm'),{
    change:movie=>{if(openingActive){openingPlayback();scrubOpeningTitle(movie.time);}},
    ended:()=>{if(openingActive)finishOpening();}
  });
  setTimeout(()=>{if(openingActive&&!openingMovie.ready){$('openingHint').hidden=false;$('openingHint').textContent='Die Animation konnte nicht geladen werden. Mit „Zur Präsentation“ kannst du die Folien trotzdem öffnen.';}},7000);
  syncTheme();syncProjector();syncMotion();go(0,0,true,false);startOpening();
  window.addEventListener('pageshow',e=>{if(e.persisted){document.querySelectorAll('dialog[open]').forEach(d=>d.close());go(0,0,true,false);startOpening();}});
})();

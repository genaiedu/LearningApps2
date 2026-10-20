(function(){
  'use strict';
  const C=window.MoehneContent,D=window.MoehneDraw,$=id=>document.getElementById(id);
  const state={started:false,images:false,maps:false,map:0,timeline:0,build:0,attack:0,slide:0};
  const timers={build:null,attack:null};let mediaObserver;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  const icons=()=>window.lucide?.createIcons();
  const source=id=>`<a href="${C.sources[id].url}" target="_blank" rel="noopener noreferrer">${esc(C.sources[id].title)} ↗</a>`;
  const stored=()=>{try{return JSON.parse(localStorage.getItem('moehne-view')||'{}');}catch{return {};}};
  const view={palette:'graphite',theme:'light',scale:100,motion:true,...stored()};
  function applyView(save=false){
    if(!['graphite','atelier','slate','plum','bordeaux'].includes(view.palette))view.palette='graphite';
    if(!['light','dark'].includes(view.theme))view.theme='light';
    view.scale=Math.max(90,Math.min(120,Number(view.scale)||100));
    document.documentElement.dataset.palette=view.palette;document.documentElement.dataset.theme=view.theme;
    document.documentElement.dataset.motion=String(view.motion!==false);document.documentElement.style.setProperty('--text-scale',view.scale/100);
    $('palette').value=view.palette;document.querySelector(`[name=theme][value=${view.theme}]`).checked=true;
    $('text-scale').value=String(view.scale);$('text-scale-value').textContent=view.scale+' %';$('motion').checked=view.motion!==false;
    if(save)try{localStorage.setItem('moehne-view',JSON.stringify(view));}catch{}
    window.dispatchEvent(new Event('moehne-view-change'));
  }
  function animate(el){el.classList.remove('entering');void el.offsetWidth;el.classList.add('entering');}
  function photoMarkup(id,interactive=true){
    const p=C.photos.find(p=>p.id===id);if(!p)return '';
    if(id==='mauer'&&!state.images)return `<figure class="commons-photo own-preview"><div class="photo-button"><img src="assets/moehne/moehne-vorschau.png" width="1440" height="900" loading="lazy" alt="Eigenes Blender-Anschauungsmodell der Staumauer, kein historisches Foto."></div><figcaption><strong>Ein Bauwerk räumlich verstehen</strong>Eigene Blender-Zeichnung: Hauptmauer, Seeausschnitt und Ausgleichsweiher. Gelände und Details sind vereinfacht.${interactive?'<small><button type="button" data-open="media-dialog">Wikimedia-Foto stattdessen freigeben</button></small>':''}</figcaption></figure>`;
    const rights=`${p.artist} · ${p.date} · ${p.license}`;
    const image=state.images?`${interactive?`<button type="button" class="photo-button" data-enlarge="${p.id}" aria-label="${esc(p.title)} – vollständige Bildansicht">`:'<div class="photo-button">'}<img data-external-image="${p.id}" width="${p.width}" height="${p.height}" loading="lazy" decoding="async" crossorigin="anonymous" referrerpolicy="no-referrer" alt="${esc(p.alt)}">${interactive?'</button>':'</div>'}`:
      `<div class="photo-empty" style="--media-ratio:${p.width/p.height}">${icon('image')}<p>${esc(p.title)}<br><small>Wikimedia-Bild ist ausgeschaltet.</small></p>${interactive?'<button type="button" data-open="media-dialog">Bilder freigeben</button>':''}</div>`;
    return `<figure class="commons-photo">${image}<figcaption><strong>${esc(p.title)}</strong>${esc(p.caption)}<small>${esc(rights)}${interactive?` · <a href="${p.page}" target="_blank" rel="noopener noreferrer">Bildquelle</a>${p.licenseUrl?` · <a href="${p.licenseUrl}" target="_blank" rel="noopener noreferrer">Lizenz</a>`:''}`:''}</small></figcaption></figure>`;
  }
  function activateImages(container=document){
    if(!state.images)return;
    container.querySelectorAll('img[data-external-image]').forEach(img=>{
      if(img.getAttribute('src'))return;
      const p=C.photos.find(p=>p.id===img.dataset.externalImage);
      img.addEventListener('error',()=>{if(!img.isConnected)return;const msg=document.createElement('p');msg.className='media-error';msg.textContent='Dieses Wikimedia-Bild ist gerade nicht erreichbar. Beschreibung und Bildquelle bleiben darunter verfügbar.';img.parentElement.replaceWith(msg);},{once:true});
      // Erst nach der aktiven Freigabe überhaupt eine externe Adresse setzen.
      img.src=p.url;
    });
  }
  function renderPhotos(){document.querySelectorAll('[data-photo]').forEach(el=>{el.innerHTML=photoMarkup(el.dataset.photo);});activateImages();icons();}
  function setImages(allow){
    state.images=Boolean(allow);
    if(!allow){$('photo-dialog').close();$('photo-large').replaceChildren();}
    renderPhotos();renderTimeline();renderSlide();updateMedia();
    window.dispatchEvent(new CustomEvent('moehne-media-change',{detail:{images:state.images,maps:state.maps}}));
  }
  function setMaps(allow){state.maps=Boolean(allow);renderMap();updateMedia();}
  function updateMedia(){
    $('images-toggle').textContent=state.images?'Bilder ausschalten':'Bilder freigeben';$('images-toggle').setAttribute('aria-pressed',String(state.images));
    $('maps-toggle').textContent=state.maps?'Online-Karte ausschalten':'Online-Karte freigeben';$('maps-toggle').setAttribute('aria-pressed',String(state.maps));
    $('media-status').textContent=`Wikimedia-Bilder: ${state.images?'freigegeben':'ausgeschaltet'}. Online-Karte: ${state.maps?'freigegeben':'ausgeschaltet'}.`;
  }
  function mapUrl(i){const m=C.mapViews[i],u=new URL('https://www.openstreetmap.org/export/embed.html');u.search=new URLSearchParams({bbox:m.bbox.join(','),layer:'mapnik',marker:m.marker.join(',')});return u.href;}
  function renderMap(){
    const m=C.mapViews[state.map];$('map-copy').textContent=m.text;
    $('map-tabs').innerHTML=C.mapViews.map((v,i)=>`<button type="button" data-map="${i}" aria-pressed="${state.map===i}">${esc(v.title)}</button>`).join('');
    $('map-consent').hidden=state.maps;$('map-caption').textContent=m.title+' · aktuelle OpenStreetMap-Karte';
    $('map-frame').replaceChildren();
    if(state.maps&&state.started){const frame=document.createElement('iframe');frame.title='OpenStreetMap: '+m.title;frame.referrerPolicy='no-referrer';frame.loading='lazy';frame.src=mapUrl(state.map);$('map-frame').append(frame);}
    else{$('map-frame').innerHTML=`<div class="map-placeholder">${icon('map')}<h3>${esc(m.title)}</h3><p>Die Online-Landkarte ist ausgeschaltet.</p><p class="small">Die eigene Flussübersicht darunter bleibt ohne Verbindung zu Kartenanbietern sichtbar.</p></div>`;$('map-caption').textContent=m.title+' · Online-Karte nicht geladen';}
    icons();
  }
  function renderTimeline(){
    const t=C.timeline[state.timeline];$('timeline').innerHTML=C.timeline.map((t,i)=>`<li><button type="button" data-time="${i}" aria-pressed="${i===state.timeline}" aria-controls="timeline-detail"><strong>${esc(t.year)}</strong><span>${esc(t.title)}</span></button></li>`).join('');
    $('timeline-detail').innerHTML=`<div><p class="year numeric">${esc(t.year)}</p><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p><p class="source-line">${source(t.source)}</p><a class="text-link" href="#${t.chapter}">Im Kapitel weiterlesen ${icon('arrow-right')}</a></div>${t.photo?`<div>${photoMarkup(t.photo)}</div>`:`<div class="timeline-visual"><svg class="scene" viewBox="0 0 1000 360" aria-hidden="true">${D.rivers()}</svg></div>`}`;
    activateImages($('timeline-detail'));icons();
  }
  function renderModule(kind){
    const index=state[kind],data=C[kind],playing=timers[kind]!==null;
    $(kind+'-scene').innerHTML=D[kind](index);$(kind+'-scene').setAttribute('aria-label',data[index].title+'. '+data[index].text);
    $(kind+'-steps').innerHTML=data.map((v,i)=>`<button type="button" data-${kind}="${i}" aria-pressed="${i===index}" aria-label="${esc(v.title)}">${i+1}</button>`).join('');
    $(kind+'-copy').innerHTML=`<h3>${esc(data[index].title)}</h3><p>${esc(data[index].text)}</p>${data[index].detail?`<p class="small">${esc(data[index].detail)}</p>`:''}`;
    $(kind+'-position').textContent=`${index+1} / ${data.length}`;$(kind+'-prev').disabled=index===0;$(kind+'-next').disabled=index===data.length-1;
    $(kind+'-play').innerHTML=icon(playing?'pause':'play')+(playing?'Anhalten':'Abspielen');$(kind+'-play').setAttribute('aria-pressed',String(playing));icons();
  }
  function stop(kind){if(timers[kind]!==null)clearInterval(timers[kind]);timers[kind]=null;}
  function choose(kind,index){stop(kind);state[kind]=Math.max(0,Math.min(C[kind].length-1,index));renderModule(kind);animate($(kind+'-copy'));}
  function play(kind){
    if(timers[kind]!==null){stop(kind);renderModule(kind);return;}
    if(state[kind]===C[kind].length-1)state[kind]=0;
    timers[kind]=setInterval(()=>{if(document.hidden){stop(kind);renderModule(kind);return;}if(state[kind]<C[kind].length-1)state[kind]++;if(state[kind]===C[kind].length-1)stop(kind);renderModule(kind);},4800);
    renderModule(kind);
  }
  function renderWall(){const v=Number($('water-level').value);$('water-value').textContent=v+' %';$('wall-scene').innerHTML=D.wall(v);}
  function renderSlide(){
    const s=C.slides[state.slide];$('slide-select').value=String(state.slide);
    let visual=s.photo?photoMarkup(s.photo,false):`<svg class="scene" viewBox="${s.visual==='wall'?'0 0 740 430':s.visual==='rivers'?'0 0 1000 360':'0 0 1000 440'}" role="img" aria-label="${esc(s.title)}">${s.visual==='wall'?D.wall(75):s.visual==='rivers'?D.rivers():D[s.visual](s.phase)}</svg>`;
    $('slide').innerHTML=`<h2>${esc(s.title)}</h2><div class="slide-content"><div class="slide-copy"><p>${esc(s.text)}</p>${s.note?`<p class="small">${esc(s.note)}</p>`:''}</div><div class="slide-visual">${visual}</div></div>`;
    $('slide-position').textContent=`${state.slide+1} / ${C.slides.length}`;$('slide-prev').disabled=state.slide===0;$('slide-next').disabled=state.slide===C.slides.length-1;
    // Verborgene Präsentationsbilder werden nicht vorab geladen.
    if($('presentation-dialog').open)activateImages($('slide'));icons();
  }
  function selectSlide(i){state.slide=Math.max(0,Math.min(C.slides.length-1,i));renderSlide();animate($('slide'));}
  async function fullscreen(){const el=$('presentation');try{if(el.requestFullscreen)await el.requestFullscreen();else throw Error('not available');}catch{el.classList.add('is-fullscreen');}renderSlide();}
  function start(allow){
    state.started=true;state.images=allow;state.maps=allow;$('entry').hidden=true;$('app').hidden=false;$('app').inert=false;
    renderPhotos();renderMap();renderTimeline();renderSlide();updateMedia();icons();window.scrollTo(0,0);$('app .wordmark')?.focus?.();
    window.dispatchEvent(new CustomEvent('moehne-media-change',{detail:{images:state.images,maps:state.maps}}));
  }
  document.querySelectorAll('[data-source]').forEach(el=>el.innerHTML=source(el.dataset.source));
  $('source-list').innerHTML=Object.entries(C.sources).map(([id,s])=>`<li id="quelle-${id}">${source(id)}<p>${esc(s.note)}</p></li>`).join('');$('source-date').textContent=C.checked;
  $('gallery').innerHTML=C.photos.map(p=>`<div data-photo="${p.id}"></div>`).join('');
  $('river-map').innerHTML=D.rivers();$('slide-select').innerHTML=C.slides.map((s,i)=>`<option value="${i}">${i+1} · ${esc(s.title)}</option>`).join('');
  $('start-media').addEventListener('click',()=>start(true));$('start-local').addEventListener('click',()=>start(false));
  $('images-toggle').addEventListener('click',()=>setImages(!state.images));$('maps-toggle').addEventListener('click',()=>setMaps(!state.maps));$('map-consent').addEventListener('click',()=>$('media-dialog').showModal());
  $('map-tabs').addEventListener('click',e=>{const el=e.target.closest('[data-map]');if(el){state.map=Number(el.dataset.map);renderMap();}});
  $('timeline').addEventListener('click',e=>{const el=e.target.closest('[data-time]');if(el){state.timeline=Number(el.dataset.time);renderTimeline();animate($('timeline-detail'));$('timeline-detail').scrollIntoView({block:'nearest',behavior:view.motion?'smooth':'auto'});}});
  $('flood-map-link').addEventListener('click',()=>{state.map=2;renderMap();});
  for(const kind of['build','attack']){
    $(kind+'-play').addEventListener('click',()=>play(kind));$(kind+'-prev').addEventListener('click',()=>choose(kind,state[kind]-1));$(kind+'-next').addEventListener('click',()=>choose(kind,state[kind]+1));
    $(kind+'-steps').addEventListener('click',e=>{const el=e.target.closest('[data-'+kind+']');if(el)choose(kind,Number(el.dataset[kind]));});renderModule(kind);
  }
  $('water-level').addEventListener('input',renderWall);
  $('palette').addEventListener('change',e=>{view.palette=e.target.value;applyView(true);});document.querySelectorAll('[name=theme]').forEach(el=>el.addEventListener('change',e=>{view.theme=e.target.value;applyView(true);}));
  $('text-scale').addEventListener('input',e=>{view.scale=Number(e.target.value);applyView(true);});$('motion').addEventListener('change',e=>{view.motion=e.target.checked;applyView(true);});
  $('presentation-open').addEventListener('click',()=>{stop('build');stop('attack');renderModule('build');renderModule('attack');$('presentation-dialog').showModal();renderSlide();});
  $('slide-prev').addEventListener('click',()=>selectSlide(state.slide-1));$('slide-next').addEventListener('click',()=>selectSlide(state.slide+1));$('slide-select').addEventListener('change',e=>selectSlide(Number(e.target.value)));$('presentation-fullscreen').addEventListener('click',fullscreen);
  document.addEventListener('click',e=>{
    const open=e.target.closest('[data-open]'),close=e.target.closest('[data-close]'),photo=e.target.closest('[data-enlarge]');
    if(open)$(open.dataset.open).showModal();
    if(close)$(close.dataset.close).close();
    if(photo&&state.images){const p=C.photos.find(p=>p.id===photo.dataset.enlarge);$('photo-title').textContent=p.title;$('photo-large').innerHTML=photoMarkup(p.id,false);$('photo-dialog').showModal();activateImages($('photo-large'));icons();}
  });
  $('presentation-dialog').addEventListener('close',()=>{$('presentation').classList.remove('is-fullscreen');if(document.fullscreenElement=== $('presentation'))document.exitFullscreen().catch(()=>{});});
  $('presentation-dialog').addEventListener('cancel',e=>{if($('presentation').classList.contains('is-fullscreen')){e.preventDefault();$('presentation').classList.remove('is-fullscreen');}else if(document.fullscreenElement===$('presentation')){e.preventDefault();document.exitFullscreen().catch(()=>{});}});
  document.addEventListener('keydown',e=>{if(!$('presentation-dialog').open||e.target.matches('select,input,textarea'))return;if(e.key==='ArrowRight'){e.preventDefault();selectSlide(state.slide+1);}if(e.key==='ArrowLeft'){e.preventDefault();selectSlide(state.slide-1);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){for(const kind of['build','attack']){stop(kind);renderModule(kind);}}});
  if('IntersectionObserver'in window){mediaObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting){const kind=e.target.id==='build-module'?'build':'attack';stop(kind);renderModule(kind);}}));mediaObserver.observe($('build-module'));mediaObserver.observe($('attack-module'));}
  applyView();renderPhotos();renderMap();renderTimeline();renderWall();renderSlide();updateMedia();icons();
  window.MoehneApp={snapshot:()=>({...state,playing:{build:timers.build!==null,attack:timers.attack!==null}}),photoMarkup,activateImages,selectSlide,choose,mapUrl};
})();

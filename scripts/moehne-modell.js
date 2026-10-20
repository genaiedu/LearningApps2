/* Die Web-Geometrie wird im beigefügten Blender-Skript aus derselben Szene exportiert. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id),T=window.THREE;
  let data,renderer,scene,camera,selected,resizeObserver,loading=false,drag=null,pinch=null;
  const pointers=new Map(),state={loaded:false,mode:'orbit',category:'pois',focal:28,theta:.7,phi:1.08,distance:1280,target:[0,16,90],yaw:0,pitch:0};
  let transition=0;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons=()=>window.lucide?.createIcons();
  function lens(){if(!camera)return;camera.aspect=$('model-viewport').clientWidth/$('model-viewport').clientHeight;camera.filmGauge=36/Math.min(camera.aspect,1);camera.setFocalLength(state.mode==='spot'?state.focal:35);camera.updateProjectionMatrix();}
  function resize(){if(!renderer)return;renderer.setSize($('model-viewport').clientWidth,$('model-viewport').clientHeight,false);lens();draw();}
  function placeOrbit(){const s=state;camera.position.set(s.target[0]+s.distance*Math.sin(s.phi)*Math.sin(s.theta),s.target[1]+s.distance*Math.cos(s.phi),s.target[2]+s.distance*Math.sin(s.phi)*Math.cos(s.theta));camera.lookAt(...s.target);}
  function placeLook(){const p=state.pitch,y=state.yaw;camera.lookAt(camera.position.clone().add(new T.Vector3(Math.cos(p)*Math.sin(y),Math.sin(p),Math.cos(p)*Math.cos(y))));}
  function markers(){
    $('model-markers').innerHTML='<svg class="model-leaders" aria-hidden="true"></svg>'+data[state.category].map((p,i)=>`<button type="button" class="model-pin" data-model-pin="${p.id}" aria-pressed="${selected?.id===p.id}" aria-label="${esc(p.title)}" title="${esc(p.title)}">${state.category==='spots'?'<i data-lucide="camera" aria-hidden="true"></i>':i+1}</button>`).join('');icons();
  }
  function draw(){
    if(!renderer)return;
    camera.updateMatrixWorld();renderer.render(scene,camera);
    const w=$('model-viewport').clientWidth,h=$('model-viewport').clientHeight,placed=[],leaders=[];
    for(const p of data[state.category]){const v=new T.Vector3(...p.position).project(camera),el=$('model-markers').querySelector(`[data-model-pin="${p.id}"]`);if(!el)continue;const visible=state.mode!=='spot'&&v.z>-1&&v.z<1&&Math.abs(v.x)<.94&&Math.abs(v.y)<.92;el.hidden=!visible;let x=(v.x+1)*w/2,y=(-v.y+1)*h/2;const anchorY=y;if(visible){for(let i=0;i<8&&placed.some(a=>Math.hypot(a.x-x,a.y-y)<39);i++)y-=39;y=Math.max(22,y);placed.push({x,y});if(Math.abs(y-anchorY)>1)leaders.push(`<line x1="${x}" y1="${anchorY}" x2="${x}" y2="${y}"/>`);}el.style.left=x+'px';el.style.top=y+'px';}const svg=$('model-markers').querySelector('svg');if(svg){svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.innerHTML=leaders.join('');}
  }
  function reference(){
    if(!selected){$('model-reference').replaceChildren();return;}
    $('model-reference').innerHTML='<p class="small">Vergleichsaufnahme – nicht exakt dieser Modellstandpunkt.</p>'+window.MoehneApp.photoMarkup(selected.photo);
    window.MoehneApp.activateImages($('model-reference'));icons();
  }
  function choose(id){
    selected=data[state.category].find(p=>p.id===id)||data[state.category][0];
    $('model-place').value=selected.id;$('model-info').innerHTML=`<h3>${esc(selected.title)}</h3><p>${esc(selected.text)}</p>`;
    $('spot-tools').hidden=state.category!=='spots';
    if(state.category==='spots'){state.focal=selected.focal;$('focal-length').value=String(state.focal);$('focal-value').textContent=state.focal+' mm';if(state.mode==='spot')enterSpot();}
    markers();reference();draw();
  }
  function category(key){
    if(!data)return;state.category=key;
    $('show-pois').setAttribute('aria-pressed',String(key==='pois'));$('show-spots').setAttribute('aria-pressed',String(key==='spots'));
    $('model-place').innerHTML=data[key].map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join('');$('model-place').disabled=false;
    if(state.mode==='spot')reset();choose(data[key][0].id);
  }
  function moveTo(position,target){
    cancelAnimationFrame(transition);const fromP=camera.position.clone(),fromT=new T.Vector3();camera.getWorldDirection(fromT);fromT.multiplyScalar(400).add(fromP);
    const toP=new T.Vector3(...position),toT=new T.Vector3(...target),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.motion==='false',start=performance.now();
    function tick(now){const t=reduced?1:Math.min(1,(now-start)/450),f=t*t*(3-2*t);camera.position.lerpVectors(fromP,toP,f);camera.lookAt(fromT.clone().lerp(toT,f));draw();if(t<1)transition=requestAnimationFrame(tick);}
    transition=requestAnimationFrame(tick);
  }
  function enterSpot(){
    if(!selected||state.category!=='spots'||!renderer)return;
    state.mode='spot';state.focal=Number($('focal-length').value);lens();
    const direction=new T.Vector3(...selected.target).sub(new T.Vector3(...selected.position)).normalize();state.yaw=Math.atan2(direction.x,direction.z);state.pitch=Math.asin(direction.y);
    $('model-mode').textContent=selected.title+' · '+state.focal+' mm · Ziehen zum Umschauen';
    $('model-status').textContent='Du stehst jetzt am ausgewählten Modellstandpunkt. Die Kamera bleibt dort; Brennweite verändert den Bildausschnitt. „Übersicht“ kehrt zur drehbaren Gesamtansicht zurück.';
    moveTo(selected.position,selected.target);
  }
  function focal(value){state.focal=Math.max(18,Math.min(100,Number(value)));$('focal-length').value=String(state.focal);$('focal-value').textContent=state.focal+' mm';if(state.mode==='spot'){cancelAnimationFrame(transition);lens();$('model-mode').textContent=selected.title+' · '+state.focal+' mm · Standort bleibt fest';draw();}}
  function reset(){
    if(!renderer)return;cancelAnimationFrame(transition);state.mode='orbit';state.theta=.7;state.phi=1.08;state.distance=1280;state.target=[0,16,90];lens();placeOrbit();draw();$('model-mode').textContent='Übersicht · Ziehen zum Drehen · Scrollen zum Zoomen';$('model-status').textContent='Vereinfachtes Blender-Anschauungsmodell. Nummern und Kameras sind auch über die Auswahlliste darunter erreichbar.';
  }
  async function start(){
    if(state.loaded||loading)return;loading=true;$('model-start').disabled=true;$('model-status').textContent='Das lokale Blender-Modell wird geöffnet …';
    try{
      if(!T)throw Error('Die lokale 3D-Bibliothek ist nicht verfügbar.');
      const response=await fetch('assets/moehne/moehne-modell.json');if(!response.ok)throw Error('Die Modelldatei konnte nicht geladen werden.');data=await response.json();
      scene=new T.Scene();camera=new T.PerspectiveCamera(45,1,.5,12000);
      renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
      renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','Drehbares 3D-Modell der Möhnetalsperre. Pfeiltasten drehen; Plus und Minus zoomen. Fotospots in der Auswahlliste darunter.');
      $('model-viewport').insertBefore(renderer.domElement,$('model-markers'));
      for(const m of data.meshes){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(m.positions,3));geometry.computeVertexNormals();const color=new T.Color().setRGB(...m.color),mat=new T.MeshStandardMaterial({color,roughness:m.name.includes('Wasser')?.55:.9,side:T.DoubleSide});const mesh=new T.Mesh(geometry,mat);scene.add(mesh);}
      scene.add(new T.HemisphereLight(0xffffff,0x566246,.75));const sun=new T.DirectionalLight(0xfff5df,1.1);sun.position.set(-300,750,500);scene.add(sun);
      $('model-poster').hidden=true;$('model-start').hidden=true;state.loaded=true;category('pois');reset();resize();attachControls();resizeObserver=new ResizeObserver(resize);resizeObserver.observe($('model-viewport'));theme();
    }catch(error){$('model-status').textContent='Die interaktive 3D-Ansicht konnte hier nicht geöffnet werden. Die gerenderte Blender-Vorschau und die Dateien zum Herunterladen bleiben verfügbar. '+error.message;$('model-start').disabled=false;if(renderer){renderer.dispose();renderer.domElement.remove();renderer=null;}}finally{loading=false;}
  }
  function theme(){if(!renderer)return;renderer.setClearColor(getComputedStyle(document.documentElement).getPropertyValue('--surface').trim());draw();}
  function attachControls(){
    const canvas=renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{cancelAnimationFrame(transition);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY};if(pointers.size===2){const p=[...pointers.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}});
    canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch&&distance>5){if(state.mode==='spot')focal(state.focal*distance/pinch);else{state.distance=Math.max(300,Math.min(2600,state.distance*pinch/distance));placeOrbit();draw();}}pinch=distance;return;}const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};if(state.mode==='spot'){state.yaw-=dx*.004;state.pitch=Math.max(-1.2,Math.min(1.2,state.pitch+dy*.004));placeLook();}else{state.theta-=dx*.006;state.phi=Math.max(.22,Math.min(1.48,state.phi-dy*.004));placeOrbit();}draw();});
    const release=e=>{pointers.delete(e.pointerId);pinch=null;if(pointers.size){const p=[...pointers.values()][0];drag={x:p.x,y:p.y};}else drag=null;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
    canvas.addEventListener('wheel',e=>{e.preventDefault();cancelAnimationFrame(transition);if(state.mode==='spot')focal(state.focal+(e.deltaY>0?-3:3));else{state.distance=Math.max(300,Math.min(2600,state.distance*Math.exp(e.deltaY*.001)));placeOrbit();draw();}},{passive:false});
    canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key))return;e.preventDefault();cancelAnimationFrame(transition);if(e.key==='+'||e.key==='='||e.key==='-'){const f=e.key==='-'?1.1:.9;if(state.mode==='spot')focal(state.focal/f);else state.distance=Math.max(300,Math.min(2600,state.distance*f));}else{const dx=e.key==='ArrowLeft'?.07:e.key==='ArrowRight'?-.07:0,dy=e.key==='ArrowUp'?.05:e.key==='ArrowDown'?-.05:0;if(state.mode==='spot'){state.yaw+=dx;state.pitch=Math.max(-1.2,Math.min(1.2,state.pitch+dy));}else{state.theta+=dx;state.phi=Math.max(.22,Math.min(1.48,state.phi-dy));}}if(state.mode==='spot')placeLook();else placeOrbit();draw();});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('model-status').textContent='Die 3D-Grafik wurde vom Browser angehalten. Bitte lade die Seite neu; die Blender-Vorschau und Downloads bleiben verfügbar.';});
  }
  $('model-start').addEventListener('click',start);$('show-pois').addEventListener('click',()=>category('pois'));$('show-spots').addEventListener('click',()=>category('spots'));$('model-place').addEventListener('change',e=>choose(e.target.value));$('model-reset').addEventListener('click',reset);$('spot-enter').addEventListener('click',enterSpot);$('focal-length').addEventListener('input',e=>focal(e.target.value));
  document.querySelectorAll('[data-focal]').forEach(el=>el.addEventListener('click',()=>focal(el.dataset.focal)));
  $('model-markers').addEventListener('click',e=>{const el=e.target.closest('[data-model-pin]');if(el)choose(el.dataset.modelPin);});
  $('model-fullscreen').addEventListener('click',async()=>{const el=$('model-module');if(document.fullscreenElement===el){await document.exitFullscreen();return;}if(el.classList.contains('is-fullscreen')){el.classList.remove('is-fullscreen');resize();return;}try{await el.requestFullscreen();}catch{el.classList.add('is-fullscreen');resize();}});
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if($('model-module').classList.contains('is-fullscreen')){$('model-module').classList.remove('is-fullscreen');resize();}else if(document.fullscreenElement===$('model-module'))document.exitFullscreen().catch(()=>{});});
  document.addEventListener('fullscreenchange',()=>{if(renderer)resize();const active=document.fullscreenElement===$('model-module')||$('model-module').classList.contains('is-fullscreen');$('model-fullscreen').setAttribute('aria-label',active?'3D-Vollbild beenden':'3D-Modell im Vollbild');});
  window.addEventListener('moehne-view-change',theme);window.addEventListener('moehne-media-change',reference);
  window.MoehneModel={snapshot:()=>({...state,selected:selected?.id,camera:camera?camera.position.toArray():null,fov:camera?.fov,aspect:camera?.aspect}),start,reset,choose,category,enterSpot};
})();

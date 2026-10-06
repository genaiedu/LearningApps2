(function(){
  'use strict';
  let renderer,scene,camera,model,lid,display,texture,ctx,canvas3d,open=false,angle=0,frame=0,visible=false,lastText='';
  const T=window.THREE;
  function roundedBox(w,h,d,color,r=.055){
    const shape=new T.Shape(),x=-w/2+r,y=-h/2+r,W=w-2*r,H=h-2*r;
    shape.moveTo(x+r,y);shape.lineTo(x+W-r,y);shape.quadraticCurveTo(x+W,y,x+W,y+r);shape.lineTo(x+W,y+H-r);shape.quadraticCurveTo(x+W,y+H,x+W-r,y+H);shape.lineTo(x+r,y+H);shape.quadraticCurveTo(x,y+H,x,y+H-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);
    const geo=new T.ExtrudeGeometry(shape,{depth:Math.max(.01,d-2*r),bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:r,bevelThickness:r});geo.center();
    const material=new T.MeshStandardMaterial({color,roughness:.46,metalness:.16});material.color.convertSRGBToLinear();const mesh=new T.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
  }
  function put(parent,mesh,x,y,z){mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
  function label(text,w,h){const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d');x.fillStyle='#d8e0e5';x.font='500 64px system-ui';x.textAlign='center';x.fillText(text,512,150);const tx=new T.CanvasTexture(c);return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false}));}
  function cell(x,color){
    put(model,roundedBox(.48,.1,.5,0x27323c,.025),x,1.49,.15);
    const glass=new T.Mesh(new T.BoxGeometry(.31,.65,.31),new T.MeshPhysicalMaterial({color:0xeaf7fc,roughness:.04,metalness:0,transparent:true,opacity:.24,side:T.DoubleSide,depthWrite:false}));put(model,glass,x,1.82,.15);
    const fluidMaterial=new T.MeshStandardMaterial({color,roughness:.35});fluidMaterial.color.convertSRGBToLinear();const fluid=new T.Mesh(new T.BoxGeometry(.26,.36,.26),fluidMaterial);put(model,fluid,x,1.69,.15);
    const lines=new T.LineSegments(new T.EdgesGeometry(glass.geometry),new T.LineBasicMaterial({color:0x99b3bf,transparent:true,opacity:.6}));lines.position.copy(glass.position);model.add(lines);
  }
  function mount(){
    const host=document.getElementById('device'),wrap=document.createElement('div');wrap.className='device-3d';wrap.innerHTML='<div class="device-3d-toolbar"><span>3D-Gerät · mit der Maus leicht drehen</span><button id="device-front">Ansicht zurücksetzen</button></div><div id="device-canvas"></div><p class="small">Eigenes 3D-Lehrmodell nach Gerätefotos · keine maßgetreue Herstellerkopie</p>';host.prepend(wrap);
    const surface=document.getElementById('device-canvas');
    try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch(_){surface.innerHTML='<p>3D benötigt WebGL. Der animierte Strahlengang bleibt über „Ins Gerät schauen“ verfügbar.</p>';return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    canvas3d=renderer.domElement;canvas3d.setAttribute('role','img');canvas3d.setAttribute('aria-label','Dreidimensionales UV/Vis-Tischgerät mit aufklappbarem Probenraum');surface.append(canvas3d);
    scene=new T.Scene();camera=new T.PerspectiveCamera(34,1,.1,100);camera.position.set(4.8,4.6,6.8);camera.lookAt(0,1.2,0);model=new T.Group();scene.add(model);
    scene.add(new T.HemisphereLight(0xffffff,0x5e6470,1.5));const key=new T.DirectionalLight(0xffffff,2);key.position.set(-4,8,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.bias=-.0005;scene.add(key);const fill=new T.DirectionalLight(0xc0d3e8,.7);fill.position.set(6,4,-4);scene.add(fill);
    put(model,roundedBox(6,1.2,4,0xdfe3e6,.08),0,.86,0);put(model,roundedBox(5.85,.9,.065,0x333e49,.02),0,.86,2.008);
    for(const x of [-2.4,2.4])for(const z of [-1.4,1.4])put(model,new T.Mesh(new T.CylinderGeometry(.19,.21,.23,24),new T.MeshStandardMaterial({color:0x18222b,roughness:.9})),x,.14,z);
    put(model,label('UV / VIS LABOR',2,.35),1.65,.9,2.05);
    for(let i=0;i<9;i++)put(model,roundedBox(1.8,.022,.015,0x1d2832,.005),-1.35,.55+i*.065,2.055);
    put(model,new T.Mesh(new T.SphereGeometry(.035,16,12),new T.MeshBasicMaterial({color:0x8bcda9})),2.57,.53,2.065);
    // A physically consistent chamber: all walls, cells and lid share one
    // coordinate system. A hinge rotation, not a distorted 2D transform.
    put(model,roundedBox(3.4,.035,2.6,0x202d37,.02),-1.02,1.47,-.12);
    for(const x of [-2.69,.65])put(model,roundedBox(.1,.62,2.6,0x3a4752,.025),x,1.78,-.12);
    for(const z of [-1.39,1.15])put(model,roundedBox(3.35,.62,.1,0x3a4752,.025),-1.02,1.78,z);
    cell(-1.75,0xb3d7df);cell(-.35,0x9372a8);
    lid=new T.Group();lid.position.set(-1.02,2.09,-1.43);model.add(lid);put(lid,roundedBox(3.58,.14,2.7,0x303c48,.05),0,.015,1.35);
    put(lid,roundedBox(.7,.09,.09,0x85929c,.025),0,.03,2.66);
    const lidText=label('PROBENRAUM',2,.35);lidText.rotation.x=-Math.PI/2;put(lid,lidText,0,.092,1.5);
    const console=new T.Group();console.position.set(1.8,1.81,.05);console.rotation.x=-.9;model.add(console);put(console,roundedBox(1.75,1.2,.17,0x364551,.04),0,0,0);
    const screen=document.createElement('canvas');screen.width=768;screen.height=384;ctx=screen.getContext('2d');texture=new T.CanvasTexture(screen);display=new T.Mesh(new T.PlaneGeometry(1.5,.78),new T.MeshBasicMaterial({map:texture}));put(console,display,0,.12,.105);
    for(const x of [-.45,0,.45])put(console,roundedBox(.22,.07,.04,0x8b9ca6,.012),x,-.43,.11);
    const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.ShadowMaterial({opacity:.16}));floor.rotation.x=-Math.PI/2;floor.position.y=.025;floor.receiveShadow=true;scene.add(floor);
    let dragging=false,lastX=0;canvas3d.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;canvas3d.setPointerCapture(e.pointerId);});canvas3d.addEventListener('pointermove',e=>{if(!dragging)return;model.rotation.y=Math.max(-.65,Math.min(.65,model.rotation.y+(e.clientX-lastX)*.005));lastX=e.clientX;render();});canvas3d.addEventListener('pointerup',()=>dragging=false);canvas3d.addEventListener('pointercancel',()=>dragging=false);
    document.getElementById('device-front').onclick=()=>{model.rotation.y=0;render();};
    new ResizeObserver(()=>{const w=surface.clientWidth;if(w){renderer.setSize(w,w*.56,false);camera.aspect=1/.56;camera.updateProjectionMatrix();render();}}).observe(surface);
    new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)render();}).observe(surface);
    update(false,591,null);
  }
  function render(){if(renderer&&visible)renderer.render(scene,camera);}
  function animate(){frame=0;const target=open?-1.28:0;angle+=(target-angle)*.13;if(Math.abs(angle-target)<.003)angle=target;lid.rotation.x=angle;const f=angle/-1.28;camera.position.set(4.8+1.7*f,4.6+1.6*f,6.8+2.2*f);camera.lookAt(0,1.2+.2*f,0);render();if(angle!==target)frame=requestAnimationFrame(animate);}
  function update(lidOpen,lambda,reading){if(!renderer)return;const text=lambda+'|'+(reading?reading.A.toFixed(3):'BEREIT');if(text!==lastText){lastText=text;ctx.fillStyle='#122b34';ctx.fillRect(0,0,768,384);ctx.fillStyle='#c5e3ea';ctx.font='56px monospace';ctx.textAlign='center';ctx.fillText(lambda+' nm',384,138);ctx.fillStyle='#97d5bc';ctx.font='44px monospace';ctx.fillText(reading?'A '+reading.A.toLocaleString('de-DE',{minimumFractionDigits:3,maximumFractionDigits:3}):'BEREIT',384,246);texture.needsUpdate=true;render();}if(lidOpen!==open){open=lidOpen;if(!frame)frame=requestAnimationFrame(animate);}}
  window.UVVisDevice3D={mount,update};
})();

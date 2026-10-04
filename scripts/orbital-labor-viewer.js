/* Shared, freely rotatable 3D viewer. No network requests for models. */
(function(){
  'use strict';
  const T=window.THREE;
  class OrbitalViewer {
    constructor(host){
      this.host=host;this.container=host.closest('.viewer');this.generation=0;this.pending=new Map();this.nextId=0;this.cache=new Map();this.bohr=null;this.moving=true;this.auto=false;this.framePending=false;
      try{this.renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch(error){
        host.innerHTML='<p class="webgl-error">Die 3D-Ansicht benötigt WebGL. Bitte öffne die App in einem aktuellen Browser mit aktivierter Grafikbeschleunigung. Die Erklärungen und Energiediagramme bleiben lesbar.</p>';this.failed=true;return;
      }
      this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.localClippingEnabled=true;this.renderer.outputEncoding=T.sRGBEncoding;
      host.append(this.renderer.domElement);this.renderer.domElement.tabIndex=0;this.renderer.domElement.setAttribute('aria-label','3D-Modell: mit Maus oder Finger drehen; Pfeiltasten drehen, Plus und Minus zoomen');
      this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(35,1,.1,100);this.camera.position.set(0,0,15);
      this.scene.add(new T.AmbientLight(0xffffff,.5));const key=new T.DirectionalLight(0xffffff,.7);key.position.set(3,5,6);this.scene.add(key);const rim=new T.DirectionalLight(0xb7dcff,.3);rim.position.set(-4,-2,-3);this.scene.add(rim);
      this.root=new T.Group();this.scene.add(this.root);this.model=new T.Group();this.root.add(this.model);
      this.axes=new T.AxesHelper(2.2);this.root.add(this.axes);this.axes.visible=false;
      // Some browsers disallow workers for file:// URLs. The same local
      // calculation remains available as a fallback, without external loading.
      try{this.worker=new Worker('scripts/orbital-labor-worker.js');}catch(_){this.worker=null;}
      if(this.worker){
        this.worker.onmessage=({data})=>{const waiting=this.pending.get(data.id);if(!waiting)return;this.pending.delete(data.id);if(data.error)waiting.reject(new Error(data.error));else waiting.resolve(data);};
        this.worker.onerror=()=>{this.worker.terminate();this.worker=null;this.pending.forEach(waiting=>waiting.reject(new Error('Worker unavailable')));this.pending.clear();};
      }
      new ResizeObserver(()=>this.resize()).observe(host);
      this.bindControls();this.align('iso');this.resize();
      this.lastTime=performance.now();this.visible=true;
      new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible)this.render();}).observe(host);
      this.tick=this.tick.bind(this);requestAnimationFrame(this.tick);
    }
    disposeModel(){this.model.traverse(o=>{o.geometry?.dispose();if(o.material){[].concat(o.material).forEach(m=>m.dispose());}});this.root.remove(this.model);this.model=new T.Group();this.root.add(this.model);this.bohr=null;}
    resize(){if(this.failed)return;const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);const before=Math.min(1,this.camera.aspect);this.camera.aspect=w/h;this.camera.position.z*=before/Math.min(1,this.camera.aspect);this.camera.updateProjectionMatrix();this.render();}
    render(){if(!this.failed)this.renderer.render(this.scene,this.camera);}
    align(direction){if(this.failed)return;const angles={iso:[-.5,.6,0],front:[0,0,0],top:[Math.PI/2,0,0],side:[0,-Math.PI/2,0]};this.root.quaternion.setFromEuler(new T.Euler(...angles[direction]));this.render();}
    bindControls(){
      const canvas=this.renderer.domElement,pointers=new Map();let start=null,previous=null,pinch=0;
      const ball=(event)=>{const rect=canvas.getBoundingClientRect(),size=Math.min(rect.width,rect.height);const x=(2*(event.clientX-rect.left)-rect.width)/size,y=(rect.height-2*(event.clientY-rect.top))/size;const length=x*x+y*y;return new T.Vector3(x,y,length<1?Math.sqrt(1-length):0).normalize();};
      canvas.addEventListener('pointerdown',event=>{canvas.setPointerCapture(event.pointerId);pointers.set(event.pointerId,[event.clientX,event.clientY]);previous=ball(event);start={x:event.clientX,y:event.clientY};canvas.focus({preventScroll:true});this.auto=false;this.container.querySelector('[data-auto]')?.setAttribute('aria-pressed','false');});
      canvas.addEventListener('pointermove',event=>{
        if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,[event.clientX,event.clientY]);
        if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch && distance>1)this.camera.position.z=Math.max(5,Math.min(70,this.camera.position.z*pinch/distance));pinch=distance;this.render();return;}
        if(start && Math.hypot(event.clientX-start.x,event.clientY-start.y)<3)return;
        const next=ball(event),rotation=new T.Quaternion().setFromUnitVectors(previous,next);this.root.quaternion.premultiply(rotation);previous=next;this.render();
      });
      const end=event=>{pointers.delete(event.pointerId);start=null;pinch=0;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
      canvas.addEventListener('wheel',event=>{event.preventDefault();this.camera.position.z=Math.max(5,Math.min(70,this.camera.position.z*Math.exp(event.deltaY*.001)));this.render();},{passive:false});
      canvas.addEventListener('keydown',event=>{
        const directions={ArrowLeft:[0,1,0],ArrowRight:[0,-1,0],ArrowUp:[1,0,0],ArrowDown:[-1,0,0]};
        if(directions[event.key]){event.preventDefault();this.root.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(...directions[event.key]),.12));}
        else if(event.key==='+'||event.key==='=')this.camera.position.z=Math.max(5,this.camera.position.z*.9);
        else if(event.key==='-')this.camera.position.z=Math.min(70,this.camera.position.z*1.1);else return;
        this.render();
      });
      this.container.querySelectorAll('[data-align]').forEach(button=>button.addEventListener('click',()=>this.align(button.dataset.align)));
      this.container.querySelector('[data-axes]')?.addEventListener('change',event=>{this.axes.visible=event.target.checked;this.render();});
      this.container.querySelector('[data-cut]')?.addEventListener('change',event=>{this.cut=event.target.checked;this.model.traverse(o=>{if(o.userData.orbital)o.material.clippingPlanes=this.cut?[new T.Plane(new T.Vector3(1,0,0),0)]:[];});this.render();});
      this.container.querySelector('[data-auto]')?.addEventListener('click',event=>{this.auto=!this.auto;event.currentTarget.setAttribute('aria-pressed',String(this.auto));});
    }
    addAtom(point,label){const sphere=new T.Mesh(new T.SphereGeometry(.105,16,12),new T.MeshPhongMaterial({color:0x748994}));sphere.position.set(...point);sphere.userData.label=label;this.model.add(sphere);}
    addBond(a,b){const from=new T.Vector3(...a),to=new T.Vector3(...b),dir=to.clone().sub(from),mesh=new T.Mesh(new T.CylinderGeometry(.025,.025,dir.length(),8),new T.MeshPhongMaterial({color:0x8d9caa}));mesh.position.copy(from.clone().add(to).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());this.model.add(mesh);}
    geometry(data,spec,sign){
      // Share vertices at tetrahedron boundaries, so lighting follows a smooth
      // isosurface rather than displaying every tessellation triangle.
      const positions=[],indices=[],vertices=new Map();
      for(let i=0;i<data.length;i+=3){const key=`${Math.round(data[i]*1e6)},${Math.round(data[i+1]*1e6)},${Math.round(data[i+2]*1e6)}`;let index=vertices.get(key);if(index===undefined){index=positions.length/3;vertices.set(key,index);positions.push(data[i],data[i+1],data[i+2]);}indices.push(index);}
      const normals=[],epsilon=.002,value=(x,y,z)=>OrbitalCore.fieldValue(spec,x,y,z);
      for(let i=0;i<positions.length;i+=3){const x=positions[i],y=positions[i+1],z=positions[i+2],gradient=[value(x+epsilon,y,z)-value(x-epsilon,y,z),value(x,y+epsilon,z)-value(x,y-epsilon,z),value(x,y,z+epsilon)-value(x,y,z-epsilon)],length=Math.hypot(...gradient)||1;normals.push(...gradient.map(v=>-sign*v/length));}
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setIndex(indices);return geometry;
    }
    async calculate(spec){
      const key=JSON.stringify(spec);if(this.cache.has(key))return this.cache.get(key);
      const local=()=>new Promise((resolve,reject)=>setTimeout(()=>{try{resolve(OrbitalSurface.generate(spec,OrbitalCore.fieldValue));}catch(error){reject(error);}},0));
      const id=++this.nextId;let data;
      if(this.worker){try{data=await new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.worker.postMessage({id,spec});});}catch(error){if(this.worker)throw error;data=await local();}}
      else data=await local();
      if(this.cache.size>=18)this.cache.delete(this.cache.keys().next().value);this.cache.set(key,data);return data;
    }
    async orbital(spec){
      if(this.failed)return;const generation=++this.generation;this.disposeModel();
      const status=this.container.querySelector('.viewer-status');status.textContent='Orbitalfläche wird berechnet …';this.container.setAttribute('aria-busy','true');
      if(spec.mode==='ao')this.addAtom([0,0,0],'Kern');
      else if(spec.level.basis==='ring'){const atoms=spec.level.atoms;atoms.forEach((point,i)=>{this.addAtom(point,`C${i+1}`);this.addBond(point,atoms[(i+1)%atoms.length]);});}
      else {this.addAtom([0,0,-.82],'A');this.addAtom([0,0,.82],'B');this.addBond([0,0,-.82],[0,0,.82]);}
      this.render();
      try{
        const data=await this.calculate(spec);if(generation!==this.generation)return;
        for(const [name,color] of [['positive',0xeb9965],['negative',0x50b8cf]]){
          if(!data[name].length)continue;
          const material=new T.MeshPhongMaterial({color:new T.Color(color).convertSRGBToLinear(),shininess:40,specular:0x303e49,transparent:true,opacity:.85,side:T.DoubleSide,depthWrite:true,clippingPlanes:this.cut?[new T.Plane(new T.Vector3(1,0,0),0)]:[]});
          const mesh=new T.Mesh(this.geometry(data[name],spec,name==='positive'?1:-1),material);mesh.userData.orbital=true;this.model.add(mesh);
        }
        // Same spatial fit for all molecular levels; changing MO never changes zoom.
        if(this.lastMode!==spec.mode){this.camera.position.z=(spec.mode==='ao'?13:18)/Math.min(1,this.camera.aspect);this.lastMode=spec.mode;}
        status.textContent='Ziehen: frei drehen · Mausrad / zwei Finger: zoomen';this.container.setAttribute('aria-busy','false');this.host.dataset.triangles=String((data.positive.length+data.negative.length)/9);this.render();
      }catch(error){if(generation!==this.generation)return;status.textContent=error.message;this.container.setAttribute('aria-busy','false');}
    }
    shells(element){
      if(this.failed)return;this.generation++;this.disposeModel();this.bohr=[];this.host.removeAttribute('data-triangles');this.container.setAttribute('aria-busy','false');this.camera.position.z=13/Math.min(1,this.camera.aspect);this.lastMode='bohr';
      const nucleus=new T.Mesh(new T.SphereGeometry(.3,24,16),new T.MeshPhongMaterial({color:0x718d9c}));this.model.add(nucleus);
      element.shells.forEach((count,index)=>{
        const radius=.75+index*.53,points=Array.from({length:129},(_,i)=>new T.Vector3(radius*Math.sin(i*2*Math.PI/128),radius*Math.cos(i*2*Math.PI/128),0));
        this.model.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x8198a9,transparent:true,opacity:.55})));
        const orbit=new T.Group();this.model.add(orbit);
        for(let i=0;i<count;i++){const angle=i*2*Math.PI/count,sphere=new T.Mesh(new T.SphereGeometry(index===element.shells.length-1?.07:.045,10,8),new T.MeshPhongMaterial({color:index===element.shells.length-1?0xeb9965:0x77aaba}));sphere.position.set(radius*Math.sin(angle),radius*Math.cos(angle),0);orbit.add(sphere);}
        this.bohr.push({orbit,index,angle:0,settle:0});
      });
      this.align('front');this.container.querySelector('.viewer-status').textContent='Schematisches Schalenmodell · keine realen Elektronenbahnen';this.render();
    }
    setMotion(active){this.moving=active;if(!active && this.bohr)this.bohr.forEach(shell=>{const step=2*Math.PI/shell.orbit.children.length,phase=((shell.angle%step)+step)%step;shell.settle=phase<.0001?0:step-phase;shell.settleSpeed=Math.max(1.4/(shell.index+1)**1.5,shell.settle/1.4);});}
    tick(now){
      const dt=Math.min(.05,(now-this.lastTime)/1000);this.lastTime=now;
      if(this.visible && !document.hidden){let changed=false;
        if(this.bohr)this.bohr.forEach(shell=>{
          const speed=1.4/(shell.index+1)**1.5;
          if(this.moving){shell.angle=(shell.angle+speed*dt)%(2*Math.PI);changed=true;}
          else if(shell.settle>0){const move=Math.min(shell.settle,shell.settleSpeed*dt);shell.angle+=move;shell.settle-=move;if(shell.settle<.0001){shell.settle=0;shell.angle=0;}changed=true;}
          shell.orbit.rotation.z=shell.angle;
        });
        if(this.auto){this.root.rotation.y+=dt*.16;changed=true;}
        if(changed)this.render();
      }
      requestAnimationFrame(this.tick);
    }
  }
  window.OrbitalViewer=OrbitalViewer;
})();

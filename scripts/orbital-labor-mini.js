/* Interactive 3D previews. All tiles share ONE WebGL context, then copy the
   rendered frame into their own canvases. No context-limit failures with 18 tiles. */
(function(){
  'use strict';
  const T=window.THREE;
  class OrbitalMiniRenderer {
    constructor(calculator){
      this.calculator=calculator;this.views=new Set();this.pending=new Set();
      try{this.renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch(_){this.failed=true;return;}
      this.renderer.outputEncoding=T.sRGBEncoding;this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
      this.scene=new T.Scene();this.scene.add(new T.AmbientLight(0xffffff,.55));
      const light=new T.DirectionalLight(0xffffff,.7);light.position.set(3,5,6);this.scene.add(light);
      const rim=new T.DirectionalLight(0xb7dcff,.25);rim.position.set(-4,-2,-3);this.scene.add(rim);
      this.observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
        const view=[...this.views].find(v=>v.canvas===entry.target);if(!view)return;
        view.visible=entry.isIntersecting;if(view.visible){view.load();this.schedule(view);}
      }),{rootMargin:'180px'});
    }
    add(canvas,spec){
      const view=new OrbitalMiniView(this,canvas,spec);this.views.add(view);
      if(this.failed){canvas.replaceWith(document.createTextNode('Die drehbare Ansicht benötigt WebGL.'));return view;}
      this.observer.observe(canvas);return view;
    }
    schedule(view){
      if(this.failed||!view.loaded||!view.visible)return;
      this.pending.add(view);if(this.frame)return;
      this.frame=requestAnimationFrame(()=>{this.frame=0;for(const item of this.pending)this.draw(item);this.pending.clear();});
    }
    draw(view){
      const width=Math.round(view.canvas.clientWidth),height=Math.round(view.canvas.clientHeight);if(!width||!height)return;
      this.renderer.setSize(width,height,false);const actual=this.renderer.domElement;
      if(view.canvas.width!==actual.width||view.canvas.height!==actual.height){view.canvas.width=actual.width;view.canvas.height=actual.height;}
      view.camera.aspect=width/height;view.camera.position.z=view.distance/Math.min(1,view.camera.aspect);view.camera.updateProjectionMatrix();
      this.scene.add(view.root);this.renderer.render(this.scene,view.camera);
      const context=view.canvas.getContext('2d');context.clearRect(0,0,actual.width,actual.height);context.drawImage(actual,0,0);this.scene.remove(view.root);
      view.canvas.dataset.rotation=view.root.quaternion.toArray().map(n=>n.toFixed(4)).join(',');
    }
  }
  class OrbitalMiniView {
    constructor(manager,canvas,spec){
      this.manager=manager;this.canvas=canvas;this.spec=spec;this.root=new T.Group();this.camera=new T.PerspectiveCamera(35,1,.1,100);this.visible=false;this.loaded=false;
      canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${canvas.dataset.label||'Orbital'}: mit Maus oder Finger frei drehen; Pfeiltasten drehen; Plus und Minus zoomen; R richtet aus`);
      this.reset();this.bind();new ResizeObserver(()=>manager.schedule(this)).observe(canvas);
    }
    reset(){const angles=this.spec.level?.basis==='ring'?[-1.16,.25,0]:this.spec.mode==='mo'?[-.15,1.22,0]:[-.5,.6,0];this.root.quaternion.setFromEuler(new T.Euler(...angles));this.distance=this.fitDistance||15;this.manager.schedule(this);}
    async load(){
      if(this.loaded||this.loading||this.manager.failed)return;this.loading=true;this.canvas.setAttribute('aria-busy','true');
      try{
        const data=await this.manager.calculator.calculate(this.spec);let radius=0;
        for(const [name,color,sign] of [['positive',0xeb9965,1],['negative',0x50b8cf,-1]]){
          const values=data[name];if(!values.length)continue;
          const geometry=this.manager.calculator.geometry(values,this.spec,sign);
          const material=new T.MeshPhongMaterial({color:new T.Color(color).convertSRGBToLinear(),shininess:24,specular:0x182026,side:T.DoubleSide});
          this.root.add(new T.Mesh(geometry,material));
          for(let i=0;i<values.length;i+=3)radius=Math.max(radius,Math.hypot(values[i],values[i+1],values[i+2]));
        }
        if(this.spec.mode==='mo'){
          // Small nuclear markers remain readable through the surface: clearly
          // labelled orientation aids, not electron density or another orbital.
          const atoms=this.spec.level.atoms||[[0,0,-.82],[0,0,.82]];
          for(const point of atoms){const marker=new T.Mesh(new T.SphereGeometry(.07,20,16),new T.MeshBasicMaterial({color:0x435662,depthTest:false}));marker.position.set(...point);marker.renderOrder=5;this.root.add(marker);}
          if(this.spec.level.basis==='ring'){const points=[...atoms,atoms[0]].map(p=>new T.Vector3(...p));const skeleton=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x7e9099,depthTest:false,transparent:true,opacity:.6}));skeleton.renderOrder=4;this.root.add(skeleton);}
          if(this.spec.level.kind==='antibonding'){
            const points=[[-1.3,-1.3,0],[1.3,-1.3,0],[1.3,1.3,0],[-1.3,1.3,0],[-1.3,-1.3,0]].map(p=>new T.Vector3(...p));
            this.nodePlane=new T.Group();const plane=new T.Mesh(new T.PlaneGeometry(2.6,2.6),new T.MeshBasicMaterial({color:0x82929b,transparent:true,opacity:.10,side:T.DoubleSide,depthWrite:false}));plane.renderOrder=2;this.nodePlane.add(plane);
            const border=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineDashedMaterial({color:0x768892,dashSize:.12,gapSize:.08,transparent:true,opacity:.75}));border.computeLineDistances();this.nodePlane.add(border);this.nodePlane.visible=this.canvas.closest('.mini-orbital')?.querySelector('[data-node-toggle]')?.checked!==false;this.root.add(this.nodePlane);
          }
        }
        // The two H₂ examples keep exactly the same spatial scale.
        if(this.spec.level?.basis==='1s')radius=2.1;
        this.fitDistance=1.17*radius/Math.sin(this.camera.fov*Math.PI/360);this.distance=this.fitDistance;this.loaded=true;
        this.canvas.dataset.triangles=String((data.positive.length+data.negative.length)/9);this.manager.schedule(this);
      }catch(_){this.canvas.setAttribute('aria-label','Die Orbitalvorschau konnte nicht berechnet werden.');this.canvas.dataset.error='true';}
      finally{this.loading=false;this.canvas.setAttribute('aria-busy','false');}
    }
    bind(){
      const canvas=this.canvas,pointers=new Map();let previous=null,start=null,pinch=0,dragged=false;
      const ball=event=>{const box=canvas.getBoundingClientRect(),size=Math.min(box.width,box.height),x=(2*(event.clientX-box.left)-box.width)/size,y=(box.height-2*(event.clientY-box.top))/size,length=x*x+y*y;return new T.Vector3(x,y,length<1?Math.sqrt(1-length):0).normalize();};
      canvas.addEventListener('pointerdown',event=>{canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});pointers.set(event.pointerId,[event.clientX,event.clientY]);previous=ball(event);start=[event.clientX,event.clientY];dragged=false;});
      canvas.addEventListener('pointermove',event=>{
        if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,[event.clientX,event.clientY]);
        if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch&&distance>1)this.distance=Math.max(this.fitDistance*.5,Math.min(this.fitDistance*3,this.distance*pinch/distance));pinch=distance;dragged=true;this.manager.schedule(this);return;}
        if(!dragged&&start&&Math.hypot(event.clientX-start[0],event.clientY-start[1])<3)return;
        dragged=true;const next=ball(event);if(previous)this.root.quaternion.premultiply(new T.Quaternion().setFromUnitVectors(previous,next));previous=next;this.manager.schedule(this);
      });
      const end=event=>{pointers.delete(event.pointerId);pinch=0;const remaining=[...pointers.values()][0];start=remaining||null;previous=remaining?ball({clientX:remaining[0],clientY:remaining[1]}):null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
      canvas.addEventListener('keydown',event=>{
        const axes={ArrowLeft:[0,1,0],ArrowRight:[0,-1,0],ArrowUp:[1,0,0],ArrowDown:[-1,0,0]};
        if(axes[event.key]){event.preventDefault();this.root.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(...axes[event.key]),.16));}
        else if(event.key.toLowerCase()==='r'){event.preventDefault();this.reset();return;}
        else if(event.key==='+'||event.key==='='){event.preventDefault();this.distance=Math.max((this.fitDistance||15)*.5,this.distance*.9);}
        else if(event.key==='-'){event.preventDefault();this.distance=Math.min((this.fitDistance||15)*3,this.distance*1.1);}else return;
        this.manager.schedule(this);
      });
      // Leave the wheel to page scrolling. Touch pinch and +/- control zoom.
      canvas.closest('.mini-orbital')?.querySelector('[data-mini-reset]')?.addEventListener('click',()=>this.reset());
      canvas.closest('.mini-orbital')?.querySelector('[data-node-toggle]')?.addEventListener('change',event=>{if(this.nodePlane){this.nodePlane.visible=event.target.checked;this.manager.schedule(this);}});
    }
  }
  window.OrbitalMiniRenderer=OrbitalMiniRenderer;
})();

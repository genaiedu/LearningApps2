/* Exact independent hydrogenic 1s/real-2p position samples (r in a₀).
   Radial density includes the r² volume element: Gamma(3,2) for 1s,
   Gamma(5,1) for 2p. Real p angular density is proportional to cos²(theta).
   Reference: MIT OCW 6.974, section 4.5, hydrogen radial/angular functions. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else {root.OrbitalProbability=api;api.create();}
})(typeof self!=='undefined'?self:globalThis,function(){
  'use strict';
  function sample(type,random=Math.random){
    if(!['1s','2px','2py','2pz'].includes(type))throw new RangeError('Unknown probability state');
    const s=type==='1s';let r=0;
    for(let i=0;i<(s?3:5);i++)r-=Math.log(Math.max(Number.MIN_VALUE,Math.min(1,random())));
    if(s)r/=2;
    const u=2*random()-1,cos=s?u:Math.cbrt(u),phi=2*Math.PI*random(),sin=Math.sqrt(Math.max(0,1-cos*cos));
    const p=[r*sin*Math.cos(phi),r*sin*Math.sin(phi),r*cos];
    return type==='2px'?[p[2],p[0],p[1]]:type==='2py'?[p[0],p[2],p[1]]:p;
  }
  function create(){
    const T=window.THREE,$=id=>document.getElementById(id),host=$('probability-cloud');
    class CloudViewer extends window.OrbitalViewer{
      align(direction){
        if(this.failed)return;
        if(direction==='iso'){this.root.quaternion.setFromEuler(new T.Euler(-1.08,.3,0));this.render();}
        else super.align(direction);
      }
      render(){
        if(this.dots)this.dots.material.color.set(document.documentElement.dataset.theme==='dark'?0xeba874:0xb7794f).convertSRGBToLinear();
        super.render();if(this.failed)return;
        this.host.dataset.rotation=this.root.quaternion.toArray().map(n=>n.toFixed(4)).join(',');
      }
      update(type,samples,reframe){
        if(this.failed)return;this.disposeModel();
        const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(samples.flat(),3));
        const material=new T.PointsMaterial({size:type==='1s'?.15:.45,map:this.dot,transparent:true,opacity:.75,depthWrite:false});
        this.dots=new T.Points(geometry,material);this.model.add(this.dots);this.addAtom([0,0,0],'Kern');
        this.axes.scale.setScalar(type==='1s'?1:3);
        this.plane=null;
        if(type!=='1s'){
          const points=[[-9,-9,0],[9,-9,0],[9,9,0],[-9,9,0],[-9,-9,0]].map(p=>new T.Vector3(...p));
          this.plane=new T.Group();
          const border=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineDashedMaterial({color:0x83989e,dashSize:.4,gapSize:.25,transparent:true,opacity:.6}));border.computeLineDistances();this.plane.add(border);
          this.plane.add(new T.Mesh(new T.PlaneGeometry(18,18),new T.MeshBasicMaterial({color:0x83989e,transparent:true,opacity:.055,side:T.DoubleSide,depthWrite:false})));
          if(type==='2px')this.plane.rotation.y=Math.PI/2;
          if(type==='2py')this.plane.rotation.x=Math.PI/2;
          this.plane.visible=$('probability-node').checked;this.model.add(this.plane);
        }
        if(reframe){this.auto=false;this.container.querySelector('[data-auto]').setAttribute('aria-pressed','false');this.camera.position.z=(type==='1s'?12:36)/Math.min(1,this.camera.aspect);this.align('iso');}
        host.dataset.samples=String(samples.length);host.dataset.state=type;this.render();
      }
    }
    const viewer=new CloudViewer(host);
    new MutationObserver(()=>viewer.render()).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    // This viewer displays samples only; no surface calculation worker is needed.
    if(viewer.worker){viewer.worker.terminate();viewer.worker=null;}
    if(!viewer.failed){
      const dot=document.createElement('canvas');dot.width=dot.height=32;
      const context=dot.getContext('2d'),gradient=context.createRadialGradient(16,16,0,16,16,16);
      gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.6,'rgba(255,255,255,1)');gradient.addColorStop(1,'rgba(255,255,255,0)');context.fillStyle=gradient;context.fillRect(0,0,32,32);viewer.dot=new T.CanvasTexture(dot);
      viewer.renderer.domElement.setAttribute('aria-label','Räumliche Messpunktwolke: mit Maus oder Finger frei drehen; Pfeiltasten drehen, Plus und Minus zoomen');
    }
    let type='2pz',samples=[];
    const labels={'1s':'1s','2pz':'2p'};
    function show(reframe=false){
      viewer.update(type,samples,reframe);
      $('probability-count').textContent=`${samples.length.toLocaleString('de-DE')} unabhängige Messungen · ${labels[type]}${samples.length===12000?' · Maximum erreicht':''}`;
      $('probability-more').disabled=$('probability-many').disabled=samples.length>=12000;
    }
    function add(count){for(let i=0,n=Math.min(count,12000-samples.length);i<n;i++)samples.push(sample(type));show();}
    function choose(next){
      type=next;samples=Array.from({length:3000},()=>sample(type));
      document.querySelectorAll('[data-probability-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.probabilityState===type)));
      $('probability-description').textContent=`Zufällige Ortsmessungen eines wasserstoffartigen ${labels[type]}-Zustands in drei Dimensionen: Jeder Punkt gehört zu einer neuen, gleich vorbereiteten Messung – nicht zu einer Spur des Elektrons. Drehen verändert nur deinen Blick, nicht die Messpunkte.`;
      $('probability-state-note').textContent=type==='1s'?'1s ist kugelsymmetrisch und hat keine Knotenebene.':'Ein p-Orbital besitzt zwei Bereiche und eine Knotenebene durch den Kern. Dort ist |ψ|² = 0. Je nach Blickrichtung können Punkte vor und hinter der Ebene in der Projektion übereinanderliegen.';
      $('probability-node-label').hidden=type==='1s';
      $('probability-cloud-title').textContent=`${labels[type]} · räumliche Messpunktwolke`;
      show(true);
    }
    document.querySelectorAll('[data-probability-state]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.probabilityState)));
    $('probability-more').onclick=()=>add(300);$('probability-many').onclick=()=>add(3000);
    $('probability-reset').onclick=()=>{samples=[];show();};
    $('probability-node').onchange=event=>{if(viewer.plane){viewer.plane.visible=event.target.checked;viewer.render();}};
    choose(type);
  }
  return {sample,create};
});

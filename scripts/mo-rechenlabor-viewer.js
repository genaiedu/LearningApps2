/* MO-RechenLabor 3D integration, GPL-2.0. Reuses the OrbitalLabor trackball. */
(function(){
  'use strict';const T=window.THREE;
  class MOViewer extends window.OrbitalViewer{
    constructor(host){super(host);this.worker?.terminate();this.worker=null;this.viewKey=null;}
    disposeModel(){if(!this.failed)super.disposeModel();}
    meshGeometry(data,normals){
      const vertices=new Map(),positions=[],normalData=[],indices=[];
      for(let i=0;i<data.length;i+=3){const key=[data[i],data[i+1],data[i+2]].map(v=>Math.round(v*1e5)).join(',');let idx=vertices.get(key);if(idx===undefined){idx=positions.length/3;vertices.set(key,idx);positions.push(data[i],data[i+1],data[i+2]);if(normals)normalData.push(normals[i],normals[i+1],normals[i+2]);}indices.push(idx);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);if(normals)g.setAttribute('normal',new T.Float32BufferAttribute(normalData,3));else g.computeVertexNormals();return g;
    }
    structure(atoms,bonds,fit=false){
      if(this.failed)return;this.disposeModel();this.atoms=atoms;this.bonds=bonds;
      const colors={1:0xe7e5da,6:0x525e60,7:0x4e84b1,8:0xca6662,9:0x6cad78},radii={1:.16,6:.25,7:.24,8:.23,9:.22};
      atoms.forEach(a=>{const m=new T.Mesh(new T.SphereGeometry(radii[a.z]||.23,22,16),new T.MeshPhongMaterial({color:colors[a.z]||0x889999,shininess:35}));m.position.set(...a.xyz);this.model.add(m);});
      bonds.forEach(([a,b])=>{const from=new T.Vector3(...atoms[a].xyz),to=new T.Vector3(...atoms[b].xyz),dir=to.clone().sub(from),m=new T.Mesh(new T.CylinderGeometry(.065,.065,dir.length(),10),new T.MeshPhongMaterial({color:0x91a19f}));m.position.copy(from.clone().add(to).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());this.model.add(m);});
      if(fit){const extent=Math.max(...atoms.map(a=>Math.hypot(...a.xyz)))+1.25;this.camera.position.z=Math.max(7,extent/Math.sin(this.camera.fov*Math.PI/360)*1.08)/Math.min(1,this.camera.aspect);}
      this.render();
    }
    orbitalSurface(atoms,bonds,surface){
      if(this.failed)return;const first=this.viewKey!==JSON.stringify(atoms);this.structure(atoms,bonds,false);
      for(const [name,color] of [['positive',0xe5a077],['negative',0x65adb8]])if(surface[name].length){const mesh=new T.Mesh(this.meshGeometry(surface[name],surface[name+'Normals']),new T.MeshPhongMaterial({color:new T.Color(color).convertSRGBToLinear(),shininess:30,transparent:true,opacity:.9,side:T.FrontSide,depthWrite:true}));mesh.userData.orbital=true;this.model.add(mesh);}
      if(first){const extent=Math.max(...atoms.map(a=>Math.hypot(...a.xyz)))+1;this.camera.position.z=Math.max(7,extent/Math.sin(this.camera.fov*Math.PI/360)*1.08)/Math.min(1,this.camera.aspect);this.viewKey=JSON.stringify(atoms);}
      this.host.dataset.triangles=String((surface.positive.length+surface.negative.length)/9);this.host.dataset.orbital=surface.index;this.render();
    }
  }
  window.MOViewer=MOViewer;
})();

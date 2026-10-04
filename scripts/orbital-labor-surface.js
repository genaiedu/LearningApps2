/* Marching tetrahedra: isosurfaces of the actual signed teaching-model field,
   rather than separate decorative lobes. Runs off the UI thread. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.OrbitalSurface=api;
})(typeof self!=='undefined'?self:globalThis,function(){
  'use strict';
  const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  const tetrahedra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  function generate(spec,value){
    const n=spec.resolution||41,extent=spec.extent||3.6,step=2*extent/(n-1),values=new Float32Array(n*n*n);
    const index=(x,y,z)=>x+n*(y+n*z);let max=0;
    for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const v=value(spec,-extent+x*step,-extent+y*step,-extent+z*step);
      values[index(x,y,z)]=v;max=Math.max(max,Math.abs(v));
    }
    const iso=max*(spec.threshold||.14),positive=[],negative=[];
    for(let z=0;z<n-1;z++)for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){
      const pts=corners.map(c=>[-extent+(x+c[0])*step,-extent+(y+c[1])*step,-extent+(z+c[2])*step]);
      const vals=corners.map(c=>values[index(x+c[0],y+c[1],z+c[2])]);
      for(const sign of [1,-1]){
        const out=sign===1?positive:negative;
        for(const tet of tetrahedra){
          const inside=tet.filter(i=>sign*vals[i]>=iso),outside=tet.filter(i=>sign*vals[i]<iso);
          if(!inside.length||!outside.length)continue;
          const edge=(a,b)=>{const t=(sign*iso-vals[a])/(vals[b]-vals[a]);return pts[a].map((v,i)=>v+t*(pts[b][i]-v));};
          const direction=[0,1,2].map(i=>outside.reduce((s,j)=>s+pts[j][i],0)/outside.length-inside.reduce((s,j)=>s+pts[j][i],0)/inside.length);
          const triangle=(a,b,c)=>{
            const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);
            const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
            if(normal.reduce((s,t,i)=>s+t*direction[i],0)<0)out.push(...a,...c,...b);else out.push(...a,...b,...c);
          };
          if(inside.length===1){const p=outside.map(i=>edge(inside[0],i));triangle(...p);}
          else if(outside.length===1){const p=inside.map(i=>edge(i,outside[0]));triangle(...p);}
          else {const a=edge(inside[0],outside[0]),b=edge(inside[0],outside[1]),c=edge(inside[1],outside[0]),d=edge(inside[1],outside[1]);triangle(a,b,c);triangle(b,d,c);}
        }
      }
    }
    return {positive:new Float32Array(positive),negative:new Float32Array(negative),iso,max};
  }
  return {generate};
});

/* GPL-2.0. Read the CI-corrected AO density printed by MOPAC 7
 * (compfg.f -> MECIP, then writmo.f -> VECPRT). Never infer an excited
 * density from filledLevels: that field describes the SCF reference. */
export function readPM3Density(listing:string,basis:any[],electrons:number){
  const start=listing.lastIndexOf('DENSITY MATRIX IS');
  if(start<0)throw Error('MOPAC hat keine Zustandsdichtematrix ausgegeben.');
  const block=listing.slice(start).split('MULTI-ELECTRON CONFIGURATION')[0];
  const rows=new Map<string,number[]>();
  for(const line of block.split('\n')){
    const m=/^\s*(S|PX|PY|PZ)\s+(H|C|N|O|F)\s+(\d+)\s+((?:-?\d*\.\d+\s*)+)$/i.exec(line);
    if(!m)continue;
    const key=m[1].toUpperCase()+':'+m[2].toUpperCase()+':'+m[3];
    const values=m[4].trim().split(/\s+/).map(Number);
    rows.set(key,[...(rows.get(key)||[]),...values]);
  }
  const n=basis.length,p=new Float64Array(n*n);
  basis.forEach((f,i)=>{
    const key=f.type.toUpperCase()+':'+f.element.toUpperCase()+':'+(f.atomIndex+1),row=rows.get(key);
    if(!row||row.length!==i+1)throw Error('Unvollständige PM3-Zustandsdichtematrix: '+key);
    row.forEach((v,j)=>{p[i*n+j]=v;p[j*n+i]=v;});
  });
  const trace=basis.reduce((s,_,i)=>s+p[i*n+i],0);
  if(Math.abs(trace-electrons)>2e-4)throw Error('PM3-Dichteprüfung: Elektronenzahl nicht erhalten.');
  return p;
}
export function readPM3Singlets(listing:string){
  const block=listing.slice(listing.lastIndexOf('STATE ENERGIES'));
  const states=[...block.matchAll(/^\s*(\d+)\s+(-?\d*\.\d+)\s+SINGLET\s+(-?\d*\.\d+)/gm)].map(m=>({root:Number(m[1]),energyEV:Number(m[2]),spin2:Number(m[3])}));
  if(!states.length||states.some(s=>Math.abs(s.spin2)>.01))throw Error('Keine überprüfbaren Singulett-CI-Zustände ausgegeben.');
  return states;
}
// At most five active MOs: all determinants fit the old core's 121-state
// storage (C(5,2)^2 = 100). Never silently cut a degenerate MO multiplet.
export function pm3ActiveSpace(energies:number[],nocc:number){
  const degenerate=(a:number,b:number)=>Math.abs(energies[a]-energies[b])<.1;
  for(const initial of [2,1]){
    let occupied=Math.min(initial,nocc),virtual=Math.min(initial,energies.length-nocc);
    while(nocc-occupied>0&&degenerate(nocc-occupied-1,nocc-occupied))occupied++;
    while(nocc+virtual<energies.length&&degenerate(nocc+virtual-1,nocc+virtual))virtual++;
    if(occupied+virtual<=5)return {occupied,virtual,total:occupied+virtual,first:nocc-occupied,configurations:choose(occupied+virtual,occupied)**2};
  }
  throw Error('Der vollständige entartete Orbitalbereich benötigt mehr als fünf aktive Orbitale; PM3-CI wurde zum Schutz vor einer verfälschten Zustandsdichte nicht gestartet.');
}
function choose(n:number,k:number){let v=1;for(let i=1;i<=k;i++)v=v*(n-k+i)/i;return Math.round(v);}
// MOPAC single points can rotate the optimized Cartesian frame afresh.
// Match robust molecular axes, then rotate both Px/Py/Pz density blocks and
// the permanent dipole. Never draw a CI matrix in the wrong AO frame.
export function pm3FrameRotation(source:ArrayLike<number>,target:ArrayLike<number>){
  const size=source.length/3,point=(a:ArrayLike<number>,i:number)=>[a[3*i],a[3*i+1],a[3*i+2]],sub=(a:number[],b:number[])=>a.map((v,k)=>v-b[k]);
  const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=(a:number[])=>{const l=Math.hypot(...a);if(l<1e-9)throw Error('PM3-Koordinatenachsen sind nicht definierbar.');return a.map(v=>v/l);};
  let first=1,second=1,max=0;
  for(let i=1;i<size;i++){const l=Math.hypot(...sub(point(source,i),point(source,0)));if(l>max){first=i;max=l;}}
  max=0;const e=sub(point(source,first),point(source,0));
  for(let i=1;i<size;i++){const l=Math.hypot(...cross(e,sub(point(source,i),point(source,0))));if(l>max){second=i;max=l;}}
  const axes=(a:ArrayLike<number>)=>{const x=unit(sub(point(a,first),point(a,0)));let z;if(max>1e-3)z=unit(cross(x,sub(point(a,second),point(a,0))));else {const axis=Math.abs(x[0])<.8?[1,0,0]:[0,1,0];z=unit(cross(x,axis));}return [x,cross(z,x),z];};
  const s=axes(source),t=axes(target),r=new Float64Array(9);
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)r[3*i+j]=t.reduce((v,a,k)=>v+a[i]*s[k][j],0);
  // Printed coordinates/internal-coordinate conversion round nearly planar
  // out-of-plane components. Allow 0.003 Å in the frame fit, but independently
  // require ALL interatomic distances to agree within 0.001 Å.
  for(let i=0;i<size;i++){
    const a=rotatePM3Vector(r,sub(point(source,i),point(source,0))),b=sub(point(target,i),point(target,0));
    if(Math.hypot(...sub(a,b))>.003)throw Error('PM3-CI hat eine andere Molekülgeometrie geliefert.');
    for(let j=0;j<i;j++)if(Math.abs(Math.hypot(...sub(point(source,i),point(source,j)))-Math.hypot(...sub(point(target,i),point(target,j))))>.001)throw Error('PM3-CI hat veränderte interatomare Abstände geliefert.');
  }
  return r;
}
export function rotatePM3Vector(r:ArrayLike<number>,v:number[]){return [0,1,2].map(i=>v.reduce((s,x,j)=>s+r[3*i+j]*x,0));}
export function rotatePM3Density(p:Float64Array,basis:any[],r:ArrayLike<number>){
  const n=basis.length,u=new Float64Array(n*n);
  basis.forEach((f,i)=>{if(f.type.toUpperCase()==='S')u[i*n+i]=1;else {const axis=['PX','PY','PZ'].indexOf(f.type.toUpperCase());basis.forEach((g,j)=>{const other=['PX','PY','PZ'].indexOf(g.type.toUpperCase());if(g.atomIndex===f.atomIndex&&other>=0)u[i*n+j]=r[3*axis+other];});}});
  const temp=new Float64Array(n*n),out=new Float64Array(n*n);
  // U is block diagonal and sparse; keep the transform bounded even for 100 AOs.
  for(let i=0;i<n;i++)for(let k=0;k<n;k++)if(Math.abs(u[i*n+k])>1e-14)for(let j=0;j<n;j++)temp[i*n+j]+=u[i*n+k]*p[k*n+j];
  for(let j=0;j<n;j++)for(let k=0;k<n;k++)if(Math.abs(u[j*n+k])>1e-14)for(let i=0;i<n;i++)out[i*n+j]+=temp[i*n+k]*u[j*n+k];
  return out;
}

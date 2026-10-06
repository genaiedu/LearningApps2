/* GPL-2.0. ESP of actual state densities, not interpolated atomic charges.
 * Analytic McMurchie–Davidson Coulomb integrals for contracted s/p Gaussians.
 * Uses the same Hermite coefficients and Boys functions as the HF engine.
 * PM3 uses its S^-1/2 reconstructed valence density and positive valence cores.
 */
import {eCoefficients} from '../vendor/gansu-lite/src/core/integrals1e';
import {boysAll} from '../vendor/gansu-lite/src/core/boys';
export type GaussianAO={center:number[],powers:number[],exponents:number[],coefficients:number[]};
export function coulombDensity(aos:GaussianAO[],matrix:ArrayLike<number>){
  const n=aos.length,terms:any[]=[],moment=[0,0,0];let electrons=0;
  if(matrix.length!==n*n)throw Error('Dichtematrix passt nicht zur ESP-Basis.');
  for(let i=0;i<n;i++)for(let j=0;j<=i;j++){
    const weight=matrix[i*n+j]*(i===j?1:2);if(Math.abs(weight)<1e-10)continue;
    const a=aos[i],b=aos[j];if([...a.powers,...b.powers].some(v=>v>1)||a.powers.reduce((s,v)=>s+v,0)>1||b.powers.reduce((s,v)=>s+v,0)>1)throw Error('ESP unterstützt hier nur s/p-Basisfunktionen.');
    const dist2=a.center.reduce((s,v,k)=>s+(v-b.center[k])**2,0);
    for(let u=0;u<a.exponents.length;u++)for(let v=0;v<b.exponents.length;v++){
      const alpha=a.exponents[u],beta=b.exponents[v],p=alpha+beta,center=a.center.map((x,k)=>(alpha*x+beta*b.center[k])/p);
      const coefficient=weight*a.coefficients[u]*b.coefficients[v]*Math.exp(-alpha*beta/p*dist2);
      if(Math.abs(coefficient)<1e-13)continue;
      const e=center.map((x,k)=>eCoefficients(a.powers[k],b.powers[k],p,x-a.center[k],x-b.center[k]));
      const at=(k:number,t:number)=>e[k][t]||0;
      const f=coefficient*2*Math.PI/p,c=[at(0,0)*at(1,0)*at(2,0),at(0,1)*at(1,0)*at(2,0),at(0,0)*at(1,1)*at(2,0),at(0,0)*at(1,0)*at(2,1),at(0,2)*at(1,0)*at(2,0),at(0,0)*at(1,2)*at(2,0),at(0,0)*at(1,0)*at(2,2),at(0,1)*at(1,1)*at(2,0),at(0,1)*at(1,0)*at(2,1),at(0,0)*at(1,1)*at(2,1)].map(x=>x*f);
      const overlap=coefficient*(Math.PI/p)**1.5,charge=overlap*at(0,0)*at(1,0)*at(2,0);electrons+=charge;
      for(let k=0;k<3;k++)moment[k]+=charge*center[k]+overlap*at(k,1)*at((k+1)%3,0)*at((k+2)%3,0);
      terms.push({p,center,c,order:a.powers.reduce((s,v)=>s+v,0)+b.powers.reduce((s,v)=>s+v,0)});
    }
  }
  return {electrons,moment,centroid:moment.map(v=>electrons>1e-9?v/electrons:0),potential(point:number[]){
    let value=0;
    for(const {p,center,c,order} of terms){
      const x=center[0]-point[0],y=center[1]-point[1],z=center[2]-point[2],f=boysAll(order,p*(x*x+y*y+z*z));
      value+=c[0]*f[0];
      if(order>0)value-=2*p*f[1]*(c[1]*x+c[2]*y+c[3]*z);
      if(order>1)value+=-2*p*f[1]*(c[4]+c[5]+c[6])+4*p*p*f[2]*(c[4]*x*x+c[5]*y*y+c[6]*z*z+c[7]*x*y+c[8]*x*z+c[9]*y*z);
    }
    return value;
  }};
}
export function espValue(atoms:any[],electronPotential:(p:number[])=>number,point:number[],bohrFactor:number,valence=false){
  let v=-electronPotential(point);
  for(const a of atoms){const z=valence&&a.z!==1?a.z-2:a.z,d=Math.hypot(...point.map((x,k)=>x-a.xyz[k]*bohrFactor));if(d<1e-9)throw Error('ESP am Kern ist singulär.');v+=z/d;}
  return v;
}
export function potentialSurface(atoms:any[],evaluate:(p:number[])=>number,resolution=33){
  const api=(globalThis as any).OrbitalSurface,radii:any={1:1.2,6:1.7,7:1.55,8:1.52,9:1.47};
  const extent=Math.max(...atoms.flatMap(a=>a.xyz.map(Math.abs)))+2.3;
  const field=(x:number,y:number,z:number)=>{let best=-Infinity;for(const a of atoms){const d=Math.hypot(x-a.xyz[0],y-a.xyz[1],z-a.xyz[2]);best=Math.max(best,radii[a.z]-d);}return best+3;};
  const mesh=api.generate({extent,resolution,iso:3},(_:any,x:number,y:number,z:number)=>field(x,y,z)),normals=new Float32Array(mesh.positive.length),potential=new Float32Array(mesh.positive.length/3),seen=new Map<string,any>();let min=Infinity,max=-Infinity;
  for(let k=0;k<mesh.positive.length;k+=3){
    const point=Array.from(mesh.positive.slice(k,k+3)) as number[],key=point.map(v=>Math.round(v*1e5)).join(',');let entry=seen.get(key);
    if(!entry){let best=Infinity,normal=[0,0,0];for(const a of atoms){const d=point.map((v,i)=>v-a.xyz[i]),length=Math.hypot(...d),distance=length-radii[a.z];if(distance<best){best=distance;normal=d.map(v=>v/(length||1));}}entry={normal,value:evaluate(point)};if(!Number.isFinite(entry.value))throw Error('Nichtendliches elektrostatisches Potenzial.');seen.set(key,entry);}
    normals.set(entry.normal,k);potential[k/3]=entry.value;min=Math.min(min,entry.value);max=Math.max(max,entry.value);
  }
  return {...mesh,positiveNormals:normals,negativeNormals:new Float32Array(0),potential,extent,min,max,iso:null,surfaceMethod:'Van-der-Waals-Hülle (H 1,20; C 1,70; N 1,55; O 1,52; F 1,47 Å); gleiche Geometrie und Hülle in allen Zuständen'};
}
export function displacementSummary(hole:any,electron:any,bohrFactor:number){
  const from=hole.centroid.map((v:number)=>v/bohrFactor),to=electron.centroid.map((v:number)=>v/bohrFactor),distance=Math.hypot(...to.map((v:number,i:number)=>v-from[i]));
  return {from,to,distance,electrons:electron.electrons,holes:hole.electrons,arrow:electron.electrons>.001&&hole.electrons>.001&&distance>=.15};
}

/* PM3 integration: GPL-2.0. MOPAC 7 via mopac7-wasm 1.2.0;
 * licenses and unchanged sources in vendor/mopac7-wasm/. */
declare const self:any;
const EV=27.211386245988;
let current:any=null;
export async function pm3Quantum(atoms:any[]){
  if(!self.MOPAC7)importScripts('mopac7-browser.js?v=1.2.0');
  self.postMessage({type:'progress',message:'PM3: Geometrieoptimierung und selbstkonsistente Valenzelektronenrechnung …'});
  const symbols:any={1:'H',6:'C',7:'N',8:'O',9:'F'};
  const raw=await self.MOPAC7.mopac7({elements:atoms.map(a=>symbols[a.z]),coordinates:atoms.map(a=>a.xyz),method:'PM3',optimize:true,precise:true,keywords:['ITRY=100','GNORM=1.0'],title:'MO-RechenLabor PM3'});
  if(!raw.converged||!raw.dipole)throw Error('PM3 hat keine vollständige konvergierte Rechnung geliefert.');
  const finalAtoms=raw.elements.map((s:string,i:number)=>({z:Number(Object.keys(symbols).find(z=>symbols[z]===s)),xyz:Array.from(raw.coordinates.slice(i*3,i*3+3))}));
  if(finalAtoms.length!==atoms.length||finalAtoms.some((a:any)=>a.xyz.some((x:number)=>!Number.isFinite(x))))throw Error('Ungültige PM3-Endgeometrie.');
  const basis=self.MOPAC7.mopac7Basis(raw),overlap=self.MOPAC7.mopac7OverlapMatrix(basis),coefficients=self.MOPAC7.deorthogonalizeCoefficients(raw.coefficients,basis,overlap);
  const n=basis.functions.length,nocc=raw.filledLevels;
  if(raw.orbitals.length!==n||nocc<1||nocc>=n)throw Error('PM3-Orbitaldaten sind unvollständig.');
  const groups:any[]=[];
  basis.functions.forEach((f:any,i:number)=>{let group=groups.find(g=>g.atom===f.atomIndex&&g.shell===f.shell);if(!group){group={atom:f.atomIndex,shell:f.shell,center:basis.centers.slice(f.atomIndex*3,f.atomIndex*3+3),functions:[]};groups.push(group);}group.functions.push({index:i,powers:f.powers});});
  current={raw,basis,coefficients,atoms:finalAtoms,n,nocc,groups};
  const vectorDebye=[raw.dipole.x,raw.dipole.y,raw.dipole.z];
  return {atoms:finalAtoms,n,nocc,electrons:2*nocc,fullElectrons:atoms.reduce((s,a)=>s+a.z,0),energy:raw.totalEnergy/EV,heatOfFormation:raw.heatOfFormation,iterations:null,energies:raw.orbitals.map((o:any)=>o.energy/EV),groundProperties:{charges:Array.from(raw.charges),dipole:{debye:raw.dipole.total,vectorDebye,vectorAU:vectorDebye.map(v=>v/2.5417464)},densityMethod:'PM3-Valenzdichte; rekonstruierte Slaterbasis (STO-6G), Löwdin-Rücktransformation der ZDO-Koeffizienten; keine Rumpfelektronen'},states:[],geomStatus:raw.terminationMessage||'PM3-Optimierung beendet; Minimum nicht nachgewiesen',refineHistory:[],backend:'MOPAC 7.00 / mopac7-wasm 1.2.0',method:'PM3 / NDDO · MOPAC 7.00',isPM3:true,spectrumUnavailable:'Dieser MOPAC-Port liefert hier keine UV/Vis-Anregungsdaten. Für ein berechnetes Spektrum RHF/CIS wählen; ein experimentelles Messspektrum kann unabhängig importiert werden.',limits:{heavy:20,atoms:80,basis:100,hydrogens:56,time:60000},pm3Provenance:{port:'mopac7-wasm 1.2.0',core:'MOPAC 7.00 (1993)',method:'PM3',geometry:'BFGS; GNORM=1.0 kcal/(mol·Å); PRECISE; ITRY=100; MMOK',basis:'MOPAC-PM3-Slaterexponenten, STO-6G zur Visualisierung',coefficients:'S^(-1/2) C_ZDO; gedruckte Koeffizienten auf vier Dezimalstellen'}};
}
// Evaluate real reconstructed, normalized valence AOs in Bohr. Radial Gaussian
// contractions are shared between Px/Py/Pz at the same center.
function evaluate(x:number,y:number,z:number,gradient=false){
  const {basis,groups,n}=current,B=1/basis.bohrPerAngstrom,phi=new Float64Array(n),gx=new Float64Array(n),gy=new Float64Array(n),gz=new Float64Array(n);
  for(const g of groups){
    const d=[x*B-g.center[0],y*B-g.center[1],z*B-g.center[2]],r2=d.reduce((s,v)=>s+v*v,0),shell=basis.shells[g.shell];let radial=0,derivative=0;
    for(let k=0;k<shell.exponents.length;k++){const v=shell.coefficients[k]*Math.exp(-shell.exponents[k]*r2);radial+=v;derivative-=2*shell.exponents[k]*v;}
    for(const f of g.functions){const axis=f.powers.findIndex((p:number)=>p===1),polynomial=axis<0?1:d[axis],i=f.index;phi[i]=radial*polynomial;if(gradient){gx[i]=derivative*d[0]*polynomial+(axis===0?radial:0);gy[i]=derivative*d[1]*polynomial+(axis===1?radial:0);gz[i]=derivative*d[2]*polynomial+(axis===2?radial:0);}}
  }
  return {phi,gx,gy,gz};
}
function field(index:number|null,x:number,y:number,z:number,gradient=false){
  const {n,nocc,coefficients}=current,p=evaluate(x,y,z,gradient);let value=0;const grad=[0,0,0],first=index===null?0:index,last=index===null?nocc:index+1;
  for(let mo=first;mo<last;mo++){let wave=0;const dg=[0,0,0];for(let ao=0;ao<n;ao++){const c=coefficients[mo*n+ao];wave+=c*p.phi[ao];if(gradient){dg[0]+=c*p.gx[ao];dg[1]+=c*p.gy[ao];dg[2]+=c*p.gz[ao];}}if(index===null){value+=2*wave*wave;for(let k=0;k<3;k++)grad[k]+=4*wave*dg[k];}else{value=wave;for(let k=0;k<3;k++)grad[k]=dg[k];}}
  return {value,grad};
}
function mesh(index:number|null,options:any){
  if(!current)throw Error('Zuerst PM3 berechnen.');
  if(!self.OrbitalSurface)importScripts('orbital-labor-surface.js');
  const extent=Math.max(...current.atoms.flatMap((a:any)=>a.xyz.map(Math.abs)))+2.8,resolution=current.n>40?33:41;
  const result=self.OrbitalSurface.generate({resolution,extent,...options},(_s:any,x:number,y:number,z:number)=>field(index,x,y,z).value);
  for(const [name,sign] of [['positive',1],['negative',-1]] as const){const positions=result[name],normals=new Float32Array(positions.length),seen=new Map<string,number[]>();for(let k=0;k<positions.length;k+=3){const key=[positions[k],positions[k+1],positions[k+2]].map((v:number)=>Math.round(v*1e5)).join(',');let normal=seen.get(key);if(!normal){normal=field(index,positions[k],positions[k+1],positions[k+2],true).grad.map(v=>-sign*v);const length=Math.hypot(...normal)||1;normal=normal.map(v=>v/length);seen.set(key,normal);}normals.set(normal,k);}result[name+'Normals']=normals;}
  return {...result,index,extent};
}
export function pm3Surface(index:number,threshold=.1){if(!current||!Number.isInteger(index)||index<0||index>=current.n)throw Error('Ungültiges PM3-Orbital.');return mesh(index,{threshold});}
export function pm3Density(state:number,mode='density',iso=.02){
  if(state!==-1)throw Error('PM3-Zustandsdichten sind hier nur für S₀ verfügbar.');
  if(!['density','difference'].includes(mode)||!(iso>=.001&&iso<=.1))throw Error('Ungültige Dichteparameter.');
  if(mode==='difference'){const zero=new Float32Array(0);return {positive:zero,negative:zero.slice(),positiveNormals:zero.slice(),negativeNormals:zero.slice(),iso,extent:1,state,mode};}
  return {...mesh(null,{iso}),state,mode};
}

/* PM3 integration: GPL-2.0. MOPAC 7 via mopac7-wasm 1.2.0;
 * licenses and unchanged sources in vendor/mopac7-wasm/. */
declare const self:any;
import {readPM3Density,readPM3Singlets,pm3ActiveSpace,pm3FrameRotation,rotatePM3Vector,rotatePM3Density} from './mo-pm3-density';
import {coulombDensity,espValue,potentialSurface,displacementSummary,GaussianAO} from './mo-charge-visualization';
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
  current={raw,basis,coefficients,atoms:finalAtoms,n,nocc,groups,densities:[],densityModels:new Map()};
  const vectorDebye=[raw.dipole.x,raw.dipole.y,raw.dipole.z];
  const scfProperties={charges:Array.from(raw.charges),dipole:{debye:raw.dipole.total,vectorDebye,vectorAU:vectorDebye.map(v=>v/2.5417464)},densityMethod:'PM3-SCF-Valenzdichte; rekonstruierte Slaterbasis (STO-6G); keine Rumpfelektronen'};
  let groundProperties:any=scfProperties,densityStates:any[]=[],ci:any=null,ciWarning='';
  // Up to four short single-point jobs, at the same PM3 ground-state geometry.
  // MOPAC MECIP constructs the full CI density including off-diagonal terms.
  // Properties are read from that SAME job, never from the ground SCF result.
  try{
    const active=pm3ActiveSpace(raw.orbitals.map((o:any)=>o.energy),nocc),models:any[]=[];
    const base=self.MOPAC7.buildMopac7Input({elements:raw.elements,coordinates:finalAtoms.map(a=>a.xyz),method:'PM3',title:'PM3 CI fixed ground-state geometry'});
    let rootsToCompute=4;
    for(let root=1;root<=rootsToCompute;root++){
      self.postMessage({type:'progress',message:`PM3-CI: Zustandsdichte S${root-1} · ${active.total} aktive Orbitale · ${active.configurations} Konfigurationen …`});
      const lines=base.split('\n'),keywords=(lines.shift()+' MECI C.I.=('+active.total+','+active.occupied+') SINGLET ROOT='+root+' DENSITY ITRY=100').split(' ');
      const deckLines:string[]=[];let line='';
      for(const word of keywords){if((line+' '+word).length>75){deckLines.push(line+' +');line=word;}else line+=(line?' ':'')+word;}deckLines.push(line);
      const job=await self.MOPAC7.runMopac7Job(deckLines.join('\n')+'\n'+lines.join('\n'));
      const q=self.MOPAC7.parseMopac7Output(job.listing);
      if(!q.converged||!q.dipole||q.unknownKeywords.length)throw Error('PM3-CI hat keine vollständige konvergierte Zustandsrechnung geliefert.');
      const rotation=pm3FrameRotation(q.coordinates,raw.coordinates);
      const singlets=readPM3Singlets(job.listing),selected=singlets[root-1];
      // Small active spaces, and the old core's low-root diagonalization,
      // can supply fewer than four singlets. Never request nonexistent roots.
      if(root===1)rootsToCompute=Math.min(4,singlets.length);
      if(!selected)throw Error('Der gewünschte Singulettzustand ist im begrenzten CI-Bereich nicht verfügbar.');
      const count=Number(/NO OF CONFIGURATIONS CONSIDERED\s*=\s*(\d+)/.exec(job.listing)?.[1]);
      const activeNumbers=/M\.O\. NUMBER\s*:\s*([\d ]+)/.exec(job.listing)?.[1].trim().split(/\s+/).map(Number);
      if(count!==active.configurations||!activeNumbers||activeNumbers.length!==active.total||activeNumbers.some((v:number,i:number)=>v!==active.first+i+1))throw Error('Der ausgegebene CI-Bereich stimmt nicht mit dem vollständigen angeforderten Bereich überein.');
      if(root>1&&Math.abs(q.totalEnergy-ci.groundEnergyEV-(selected.energyEV-singlets[0].energyEV))>.0001)throw Error('CI-Zustände verwenden keine einheitliche Energiereferenz.');
      const p=rotatePM3Density(readPM3Density(job.listing,q.basis,2*nocc),q.basis,rotation),natural=self.MOPAC7.symmetricEigen(p,n);
      if(natural.values.some((v:number)=>v<-.0002||v>2.0002))throw Error('PM3-CI-Dichte hat unzulässige natürliche Besetzungen.');
      q.basis.forEach((f:any,i:number)=>{if(f.type!==raw.basis[i].type||f.atomIndex!==raw.basis[i].atomIndex)throw Error('PM3-CI-Basisreihenfolge wurde verändert.');});
      // Compare the printed charges with populations of the actual CI matrix.
      const population=finalAtoms.map(()=>0);q.basis.forEach((f:any,i:number)=>population[f.atomIndex]+=p[i*n+i]);
      if(population.some((v:number,i:number)=>Math.abs((finalAtoms[i].z===1?1:finalAtoms[i].z-2)-v-q.charges[i])>.00015))throw Error('PM3-CI-Partialladungen gehören nicht zur ausgegebenen Zustandsdichte.');
      const vectorDebye=rotatePM3Vector(rotation,[q.dipole.x,q.dipole.y,q.dipole.z]),properties={charges:Array.from(q.charges),dipole:{debye:q.dipole.total,vectorDebye,vectorAU:vectorDebye.map(v=>v/2.5417464)},densityMethod:'PM3-CI: vollständige MECIP-Zustandsdichtematrix einschließlich außerdiagonaler Terme; feste PM3-S₀-Geometrie; Slater/STO-6G-Rekonstruktion; AO-Matrix und Dipolvektor in das angezeigte Molekülkoordinatensystem gedreht',ciRoot:selected.root,singletRoot:root,ciEnergyEV:selected.energyEV,totalEnergyEV:q.totalEnergy,electronTrace:population.reduce((s,v)=>s+v,0),naturalOccupations:Array.from(natural.values)};
      models.push(p);
      if(root===1){groundProperties=properties;ci={...active,excitedStates:rootsToCompute-1,groundEnergyEV:q.totalEnergy,groundSCFProperties:scfProperties};}
      else {const energyEV=q.totalEnergy-ci.groundEnergyEV;if(!(energyEV>0))throw Error('Nichtpositive PM3-CI-Anregung: Referenz nicht geeignet.');densityStates.push({...properties,energyEV,wavelength:1239.841984/energyEV});}
      await new Promise(r=>setTimeout(r,0));
    }
    current.densities=models;
  }catch(e:any){ciWarning='PM3-CI nicht vollständig verfügbar: '+(e.message||String(e));groundProperties=scfProperties;densityStates=[];ci=null;}
  return {atoms:finalAtoms,n,nocc,electrons:2*nocc,fullElectrons:atoms.reduce((s,a)=>s+a.z,0),energy:raw.totalEnergy/EV,heatOfFormation:raw.heatOfFormation,iterations:null,energies:raw.orbitals.map((o:any)=>o.energy/EV),groundProperties,densityStates,ci,ciWarning,states:[],geomStatus:raw.terminationMessage||'PM3-Optimierung beendet; Minimum nicht nachgewiesen',refineHistory:[],backend:'MOPAC 7.00 / mopac7-wasm 1.2.0',method:ci?'PM3 / NDDO + begrenzte Singulett-CI · MOPAC 7.00':'PM3 / NDDO · MOPAC 7.00',isPM3:true,spectrumUnavailable:'Keine UV/Vis-Simulation für PM3: Zustandsdichten und Anregungsenergien werden getrennt ausgewertet, aber keine Übergangsstärken berechnet. Für ein berechnetes Spektrum RHF/CIS wählen; Messspektren können unabhängig importiert werden.',limits:{heavy:20,atoms:80,basis:100,hydrogens:56,time:60000,ciOrbitals:5,ciConfigurations:100,excitedSinglets:3},pm3Provenance:{port:'mopac7-wasm 1.2.0',core:'MOPAC 7.00 (1993)',method:'PM3',geometry:'BFGS; GNORM=1.0 kcal/(mol·Å); PRECISE; ITRY=100; MMOK',ci:ci?'MECI C.I.=('+ci.total+','+ci.occupied+'); SINGLET ROOT=1…'+(ci.excitedStates+1)+'; 1SCF DENSITY; PRECISE ITRY=100 MMOK; keine Geometrieoptimierung der Anregungen':ciWarning,basis:'MOPAC-PM3-Slaterexponenten, STO-6G zur Visualisierung',coefficients:'S^(-1/2) C_ZDO; gedruckte Koeffizienten auf vier Dezimalstellen'}};
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
function field(index:number|null,x:number,y:number,z:number,gradient=false,model:any=null){
  const {n,nocc,coefficients}=current,p=evaluate(x,y,z,gradient);let value=0;const grad=[0,0,0],first=index===null?0:index,last=index===null?nocc:index+1;
  const count=model?model.weights.length:last;
  for(let mo=first;mo<count;mo++){let wave=0;const dg=[0,0,0];for(let ao=0;ao<n;ao++){const c=(model?model.coefficients:coefficients)[mo*n+ao];wave+=c*p.phi[ao];if(gradient){dg[0]+=c*p.gx[ao];dg[1]+=c*p.gy[ao];dg[2]+=c*p.gz[ao];}}if(index===null){const weight=model?model.weights[mo]:2;value+=weight*wave*wave;for(let k=0;k<3;k++)grad[k]+=2*weight*wave*dg[k];}else{value=wave;for(let k=0;k<3;k++)grad[k]=dg[k];}}
  return {value,grad};
}
function mesh(index:number|null,options:any,model:any=null){
  if(!current)throw Error('Zuerst PM3 berechnen.');
  if(!self.OrbitalSurface)importScripts('orbital-labor-surface.js');
  const extent=Math.max(...current.atoms.flatMap((a:any)=>a.xyz.map(Math.abs)))+2.8,resolution=current.n>40?33:41;
  const result=self.OrbitalSurface.generate({resolution,extent,...options},(_s:any,x:number,y:number,z:number)=>field(index,x,y,z,false,model).value);
  for(const [name,sign] of [['positive',1],['negative',-1]] as const){const positions=result[name],normals=new Float32Array(positions.length),seen=new Map<string,number[]>();for(let k=0;k<positions.length;k+=3){const key=[positions[k],positions[k+1],positions[k+2]].map((v:number)=>Math.round(v*1e5)).join(',');let normal=seen.get(key);if(!normal){normal=field(index,positions[k],positions[k+1],positions[k+2],true,model).grad.map(v=>-sign*v);const length=Math.hypot(...normal)||1;normal=normal.map(v=>v/length);seen.set(key,normal);}normals.set(normal,k);}result[name+'Normals']=normals;}
  return {...result,index,extent};
}
export function pm3Surface(index:number,threshold=.1){if(!current||!Number.isInteger(index)||index<0||index>=current.n)throw Error('Ungültiges PM3-Orbital.');return mesh(index,{threshold});}
export function pm3Density(state:number,mode='density',iso=.02){
  if(!current||!Number.isInteger(state)||state< -1||(state>=current.densities.length-1&&state!==-1))throw Error('Ungültiger PM3-Zustand.');
  if(!['density','difference','esp','displacement'].includes(mode)||!(iso>=.001&&iso<=.1))throw Error('Ungültige Dichteparameter.');
  if(mode==='esp'||mode==='displacement')return pm3ChargeSurface(state,mode,iso);
  if(mode==='difference'&&state===-1){const zero=new Float32Array(0);return {positive:zero,negative:zero.slice(),positiveNormals:zero.slice(),negativeNormals:zero.slice(),iso,extent:1,state,mode};}
  let model=null;
  if(current.densities.length){
    const key=state+':'+mode;model=current.densityModels.get(key);
    if(!model){const {n,basis}=current,p=current.densities[state+1],matrix=Float64Array.from(p,(v,i)=>v-(mode==='difference'?current.densities[0][i]:0)),eig=self.MOPAC7.symmetricEigen(matrix,n),vectors:number[]=[],weights:number[]=[];
      for(let k=0;k<n;k++)if(Math.abs(eig.values[k])>1e-7){weights.push(eig.values[k]);for(let i=0;i<n;i++)vectors.push(eig.vectors[i*n+k]);}
      model={weights,coefficients:self.MOPAC7.deorthogonalizeCoefficients(new Float64Array(vectors),basis)};current.densityModels.set(key,model);
    }
  }
  return {...mesh(null,{iso},model),state,mode};
}
function pm3AOs():GaussianAO[]{
  const {basis}=current;return basis.functions.map((f:any)=>{const s=basis.shells[f.shell];return {center:Array.from(basis.centers.slice(f.atomIndex*3,f.atomIndex*3+3)),powers:f.powers,exponents:s.exponents,coefficients:s.coefficients};});
}
function modelMatrix(model:any){
  const n=current.n,matrix=new Float64Array(n*n);for(let k=0;k<model.weights.length;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)matrix[i*n+j]+=model.weights[k]*model.coefficients[k*n+i]*model.coefficients[k*n+j];return matrix;
}
function zdoModel(matrix:Float64Array,sign=0){
  const {n,basis}=current,eig=self.MOPAC7.symmetricEigen(matrix,n),weights:number[]=[],vectors:number[]=[];
  for(let k=0;k<n;k++)if(Math.abs(eig.values[k])>1e-7&&(sign===0||eig.values[k]*sign>0)){weights.push(sign?Math.abs(eig.values[k]):eig.values[k]);for(let i=0;i<n;i++)vectors.push(eig.vectors[i*n+k]);}
  return {weights,coefficients:self.MOPAC7.deorthogonalizeCoefficients(new Float64Array(vectors),basis)};
}
function pm3ChargeSurface(state:number,mode:string,iso:number){
  if(!self.OrbitalSurface)importScripts('orbital-labor-surface.js');
  const {n,nocc,atoms,basis,densities,coefficients}=current,aos=pm3AOs(),B=1/basis.bohrPerAngstrom;
  if(mode==='esp'){
    self.postMessage({type:'progress',message:'PM3-Ladungskarte: Coulombintegrale der rekonstruierten Zustandsdichte …'});
    const model=densities.length?zdoModel(densities[state+1]):{weights:Array(nocc).fill(2),coefficients:coefficients.slice(0,n*nocc)},field=coulombDensity(aos,modelMatrix(model));
    const s=potentialSurface(atoms,p=>espValue(atoms,field.potential,p.map(v=>v*B),B,true),n>40?25:29);
    return {...s,state,mode,electronCount:field.electrons,method:'PM3'+(densities.length?'-CI':'-SCF')+': analytische Coulombintegrale der S⁻¹ᐟ²-Slater/STO-6G-Rekonstruktion und positive Valenzrümpfe; kein natives MOPAC-ESP',unit:'Eh/e'};
  }
  const delta=new Float64Array(n*n);if(state>=0)for(let i=0;i<delta.length;i++)delta[i]=densities[state+1][i]-densities[0][i];
  // Positive and negative eigenparts of the difference matrix in the native
  // orthonormal ZDO metric: attachment/detachment, not clipping Δn in space.
  const electron=zdoModel(delta,1),hole=zdoModel(delta,-1),e=mesh(null,{iso},electron),h=mesh(null,{iso},hole),summary=displacementSummary(coulombDensity(aos,modelMatrix(hole)),coulombDensity(aos,modelMatrix(electron)),B);
  return {positive:e.positive,negative:h.positive,positiveNormals:e.positiveNormals,negativeNormals:h.positiveNormals,extent:e.extent,iso,state,mode,displacement:summary,occupationWeights:{electron:electron.weights,hole:hole.weights},method:'PM3-CI: positive/negative Eigenanteile von P(Sᵢ) − P(S₀) im ZDO-Metrikraum; S⁻¹ᐟ²-Basisrekonstruktion; keine NTOs oder Elektronenflugbahnen'};
}

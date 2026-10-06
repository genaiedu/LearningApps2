/* MO-RechenLabor integration: GPL-2.0. GANSU-Lite: BSD-3-Clause (vendor license).
 * All numerical work is isolated in a terminable worker. No calculation API.
 */
import {BasisSet} from '../vendor/gansu-lite/src/core/basisSet';
import {Molecular} from '../vendor/gansu-lite/src/core/molecular';
import {RHF} from '../vendor/gansu-lite/src/core/rhf';
import {computeCIS} from '../vendor/gansu-lite/src/core/cis';
import {computeRHFGradient} from '../vendor/gansu-lite/src/core/gradient';
import {initWasm} from '../vendor/gansu-lite/src/core/eriWasm';
import {buildShellNormCache,evaluateBasisFunctionsScreened} from '../vendor/gansu-lite/src/core/xcIntegration';
import {computeDipoleIntegrals} from '../vendor/gansu-lite/src/core/integralsDipole';
import {computeMullikenCharges} from '../vendor/gansu-lite/src/core/properties';
import {cisDensityMO,densityAO} from './mo-state-density';

declare const self:any;
let OB:any, basis:BasisSet, calculation:any=null, busy=false;
const LIMIT={atoms:24,heavy:6,basis:36,cis:324,scf:80,time:60000};
const B=1.8897259886;
const progress=(stage:string,message:string,extra:any={})=>self.postMessage({type:'progress',stage,message,...extra});
const tick=()=>new Promise(r=>setTimeout(r,0));
function validate(atoms:any[],charge=0){
  if(atoms.some(a=>!Array.isArray(a.xyz)||a.xyz.length!==3||a.xyz.some((x:number)=>!Number.isFinite(x))))throw Error('Ungültige Atomkoordinaten.');
  if(!atoms.length||atoms.length>LIMIT.atoms)throw Error('Maximal 24 Atome einschließlich Wasserstoff.');
  if(atoms.filter(a=>a.z!==1).length>LIMIT.heavy)throw Error('Maximal sechs Nicht-Wasserstoffatome.');
  if(atoms.some(a=>![1,6,7,8,9].includes(a.z)))throw Error('Unterstützt werden H, C, N, O und F.');
  if(charge!==0)throw Error('Diese Einstiegsversion berechnet nur neutrale Moleküle.');
  const electrons=atoms.reduce((s,a)=>s+a.z,0)-charge;
  if(electrons%2)throw Error('Radikale mit ungerader Elektronenzahl sind hier nicht zugelassen.');
  const n=atoms.reduce((s,a)=>s+(a.z===1?1:5),0),occupied=electrons/2;
  if(n>LIMIT.basis||occupied*(n-occupied)>LIMIT.cis)throw Error('Die Struktur überschreitet das lokale Rechenlimit (36 Basisfunktionen / 324 CIS-Konfigurationen).');
  if(occupied>=n)throw Error('Die Minimalbasis hat für dieses System keine unbesetzten Orbitale.');
  return {electrons,n,occupied};
}
async function openbabel(){
  if(OB)return {ob:OB};
  importScripts('../../LearningApps/fonts/openbabel/openbabel.js');
  const base=new URL('../../LearningApps/fonts/openbabel/',self.location.href).href;
  const [wasmBinary,dataFile]=await Promise.all(['openbabel.wasm','openbabel.data'].map(async name=>{const r=await fetch(base+name);if(!r.ok)throw Error('Geometriekern-Datei fehlt.');return await r.arrayBuffer();}));
  await new Promise((resolve,reject)=>{
    const factory=self.OpenBabelModule;
    // This upstream build installs its own callback and is a legacy thenable.
    // Never resolve a Promise with the module itself (recursive assimilation).
    self.__$openBabelInitialized$__=(event:any)=>{OB=event.module;resolve(null);};
    const mod=factory({preRun:[],wasmBinary,getPreloadedPackage:()=>dataFile,locateFile:(name:string)=>base+name,print:()=>{},printErr:()=>{},onAbort:(e:any)=>reject(Error('Geometriekern konnte nicht geladen werden: '+e))});
    if(mod.calledRun){OB=mod;resolve(null);}
  });
  return {ob:OB};
}
function positions(mol:any){return Array.from({length:mol.NumAtoms()},(_,i)=>{const a=mol.GetAtom(i+1);return {z:a.GetAtomicNum(),xyz:[a.GetX(),a.GetY(),a.GetZ()]};});}
function recenter(atoms:any[]){const c=[0,1,2].map(k=>atoms.reduce((s,a)=>s+a.xyz[k],0)/atoms.length);return atoms.map(a=>({...a,xyz:a.xyz.map((x:number,k:number)=>x-c[k])}));}
async function prepare(smiles:string){
  if(smiles.includes('.'))throw Error('Bitte ein zusammenhängendes Molekül, keine getrennten Fragmente.');
  if(/^(O=O|\[O\]\[O\])$/.test(smiles))throw Error('Der Triplett-Grundzustand von O₂ benötigt eine offene-Schalen-Methode.');
  progress('geometry','Lokaler Geometriekern wird geladen …');
  const {ob}=await openbabel(),conv=new ob.ObConversionWrapper(),mol=new ob.OBMol();
  try{
    conv.setInFormat('','smi');
    if(!conv.readString(mol,smiles)||!mol.NumAtoms())throw Error('SMILES nicht erkannt.');
    mol.AddHydrogensWithParam(false,false,7.4);
    validate(positions(mol),mol.GetTotalCharge());
    if(Array.from({length:mol.NumAtoms()},(_,i)=>mol.GetAtom(i+1).GetSpinMultiplicity()).some(s=>s>0))throw Error('Radikale und offene Schalen sind in dieser Version nicht unterstützt.');
    progress('geometry','Räumliche Startgeometrie aus SMILES …');
    const gen=ob.OBOp.FindType('Gen3D');
    // Open Babel 3.1.1 speed 4/5 returns before copying its local OBMol back.
    // Speed 3 does a short force-field pre-relaxation and copies coordinates.
    if(!gen||!gen.Do(mol,'3'))throw Error('Keine räumliche Startgeometrie gefunden.');
    const bonds=Array.from({length:mol.NumBonds()},(_,i)=>{const b=mol.GetBond(i);return [b.GetBeginAtomIdx()-1,b.GetEndAtomIdx()-1,b.GetBondOrder()];});
    const initial=recenter(positions(mol));
    let ff=ob.OBForceField.FindForceField('MMFF94'),name='MMFF94';
    if(!ff||!ff.Setup(mol)){ff=ob.OBForceField.FindForceField('UFF');name='UFF';if(!ff||!ff.Setup(mol))throw Error('Für dieses Molekül ist kein unterstütztes Kraftfeld verfügbar.');}
    ff.SetLogLevel(0);
    const startEnergy=ff.Energy(false),history=[{step:0,energy:startEnergy}];
    self.postMessage({type:'geometry-frame',atoms:initial,bonds,step:0,energy:startEnergy,method:name,unit:ff.GetUnit()});
    ff.ConjugateGradientsInitialize(200,1e-6,0);
    let active=true,step=0;
    while(active&&step<200){active=ff.ConjugateGradientsTakeNSteps(10);step+=10;ff.GetCoordinates(mol);const energy=ff.Energy(false);history.push({step,energy});self.postMessage({type:'geometry-frame',atoms:recenter(positions(mol)),bonds,step,energy,method:name,unit:ff.GetUnit()});await tick();}
    ff.GetCoordinates(mol);
    const atoms=recenter(positions(mol));
    if(atoms.some(a=>a.xyz.some((x:number)=>!Number.isFinite(x))))throw Error('Ungültige Geometrie; Rechnung wurde gestoppt.');
    for(let i=0;i<atoms.length;i++)for(let j=0;j<i;j++)if(Math.hypot(...atoms[i].xyz.map((x:number,k:number)=>x-atoms[j].xyz[k]))<.35)throw Error('Atomüberlappung in der Startgeometrie; Rechnung wurde gestoppt.');
    return {atoms,bonds,initial,history,method:name,unit:ff.GetUnit(),converged:!active,steps:step};
  }finally{mol.delete();conv.delete();}
}
async function quantum(atoms:any[],refine=false){
  validate(atoms);
  if(!basis){const response=await fetch('../vendor/gansu-lite/sto-3g.gbs');if(!response.ok)throw Error('Basisdatei fehlt.');basis=BasisSet.fromGBS(await response.text());}
  const wasm=await initWasm(new URL('../vendor/gansu-lite/',self.location.href).pathname);
  if(!wasm)throw Error('Der schnelle WebAssembly-Rechenkern ist nicht verfügbar. Keine langsame Ersatzrechnung gestartet.');
  const deadline=performance.now()+LIMIT.time;
  const check=()=>{if(performance.now()>deadline)throw Error('Zeitlimit erreicht. Bitte ein kleineres Molekül wählen.');};
  async function solve(atoms:any[]){
    check();const mol=new Molecular(atoms.map((a,i)=>({atomicNumber:a.z,atomIndex:i,coordinate:{x:a.xyz[0]*B,y:a.xyz[1]*B,z:a.xyz[2]*B}})),basis);
    const hf=new RHF(mol.numBasis,mol.numElectrons,mol.numAlphaSpins,mol.numBetaSpins,mol.atoms,mol.primitiveShells,mol.shellTypeInfos,mol.atomToBasisRange,mol.cgtoNormalizationFactors);
    (hf as any).maxIter=LIMIT.scf;
    let converged=false,iterations=0;
    const energy=await hf.solve({eriBackend:'wasm',onIteration:(i,e,de)=>{check();iterations=i+1;if(i>=LIMIT.scf)throw Error('SCF nicht innerhalb von 80 Schritten konvergiert. Kein Spektrum aus unkonvergierten Orbitalen.');progress('scf',`Elektronenstruktur · SCF-Schritt ${i+1}`,{energy:e,delta:de});},onProgress:m=>{check();if(m.startsWith('Converged'))converged=true;}});
    if(!converged||!Number.isFinite(energy))throw Error('SCF nicht konvergiert. Bitte ein anderes oder kleineres Molekül wählen.');
    return {mol,hf,energy,iterations};
  }
  let current=await solve(atoms),geomStatus='Kraftfeldgeometrie',refineHistory:any[]=[];
  if(refine){
    if(current.mol.numBasis>20)throw Error('Die zusätzliche HF-Geometrieoptimierung ist auf 20 Basisfunktionen begrenzt.');
    for(let step=0;step<20;step++){
      check();const {mol,hf}=current;
      const g=computeRHFGradient(mol.primitiveShells,mol.atoms,mol.cgtoNormalizationFactors,mol.numBasis,mol.numAlphaSpins,hf.density,hf.coefficients,hf.orbitalEnergies as Float64Array).total;
      const max=Math.max(...Array.from(g,Math.abs));refineHistory.push({step,energy:current.energy,maxForce:max});
      progress('refine',`HF-Geometrie · Schritt ${step+1} · größte Kraft ${max.toExponential(2)} Eh/Bohr`);
      if(max<.001){geomStatus='HF-Gradient konvergiert (≤ 0,001 Eh/Bohr); kein Frequenztest';break;}
      let accepted=false,scale=Math.min(.8,.12/Math.max(max,1e-8));
      for(let trial=0;trial<5;trial++){
        const candidate=atoms.map((a,i)=>({...a,xyz:a.xyz.map((v:number,k:number)=>v-scale*g[3*i+k]/B)}));
        const next=await solve(candidate);
        if(next.energy<current.energy-1e-10){atoms=recenter(candidate);current=next;accepted=true;self.postMessage({type:'refine-frame',atoms,step:step+1,energy:current.energy});break;}scale*=.5;
      }
      if(!accepted){geomStatus='HF-Nachoptimierung: kein weiterer Abstieg gefunden, nicht als konvergiert bestätigt';break;}
      geomStatus='HF-Nachoptimierung: Schrittgrenze erreicht, noch nicht konvergiert';
    }
  }
  check();const {mol,hf}=current,n=mol.numBasis,nocc=mol.numAlphaSpins;
  progress('cis','Optische Anregungen: CIS-Matrix und Übergangsstärken …');
  const cis=computeCIS(hf.coefficients,hf.orbitalEnergies,hf.eriStore,nocc,n,Math.min(60,nocc*(n-nocc)),false,mol.primitiveShells,mol.cgtoNormalizationFactors,()=>check());
  check();
  const integrals=computeDipoleIntegrals(mol.primitiveShells,mol.cgtoNormalizationFactors,n);
  const densities=[hf.density,...cis.states.map(s=>densityAO(cisDensityMO(s.amplitudes,nocc,n),hf.coefficients))];
  const properties=densities.map((d,stateIndex)=>{
    const charges=Array.from(computeMullikenCharges(d,hf.overlap,mol.atoms,mol.atomToBasisRange));
    if(Math.abs(charges.reduce((s,q)=>s+q,0))>1e-5)throw Error('Dichteprüfung: Elektronenzahl nicht erhalten.');
    const vector=[integrals.Dx,integrals.Dy,integrals.Dz].map((m,k)=>{
      let v=mol.atoms.reduce((s,a)=>s+a.atomicNumber*[a.coordinate.x,a.coordinate.y,a.coordinate.z][k],0);
      for(let i=0;i<n;i++)for(let j=0;j<n;j++)v-=d.get(i,j)*m.get(j,i);
      return v;
    });
    return {charges,dipole:{vectorAU:vector,vectorDebye:vector.map(v=>v*2.5417464),debye:Math.hypot(...vector)*2.5417464},densityMethod:stateIndex===0?'RHF-SCF-Grundzustandsdichte':'Unrelaxierte, spin-summierte CIS-Zustandsdichte bei unveränderter Grundzustandsgeometrie'};
  });
  const states=cis.states.map(({amplitudes,...s},i)=>({...s,...properties[i+1],wavelength:s.energyEV>0?1239.841984/s.energyEV:null}));
  if(states.some(s=>s.energy<=0))throw Error('CIS liefert nichtpositive Anregungen: instabile Referenz. Kein belastbares Spektrum.');
  check();calculation={mol,hf,atoms,densities};
  return {atoms,n,nocc,electrons:mol.numElectrons,energy:current.energy,iterations:current.iterations,energies:Array.from(hf.orbitalEnergies),groundProperties:properties[0],states,geomStatus,refineHistory,backend:'WASM',method:'RHF/STO-3G + Singulett-CIS',limits:LIMIT};
}
async function surface(index:number,threshold=.1){
  if(!calculation)throw Error('Zuerst Molekülorbitale berechnen.');
  const {mol,hf,atoms}=calculation;
  if(!Number.isInteger(index)||index<0||index>=mol.numBasis)throw Error('Ungültiges Orbital.');
  if(!self.OrbitalSurface)importScripts('orbital-labor-surface.js');
  const cache=buildShellNormCache(mol.primitiveShells),c=Array.from({length:mol.numBasis},(_,i)=>hf.coefficients.get(i,index));
  const extent=Math.max(...atoms.flatMap((a:any)=>a.xyz.map(Math.abs)))+2.2;
  const value=(_spec:any,x:number,y:number,z:number)=>{
    const p=evaluateBasisFunctionsScreened(mol.primitiveShells,cache,mol.cgtoNormalizationFactors,mol.numBasis,x*B,y*B,z*B,false).phi;
    let result=0;for(let i=0;i<p.length;i++)result+=p[i]*c[i];return result;
  };
  const result=self.OrbitalSurface.generate({resolution:41,extent,threshold},value);
  // Smooth outward normals from the actual analytic MO gradient, not from
  // the tetrahedral grid faces. This avoids decorative mesh facets.
  for(const [name,sign] of [['positive',1],['negative',-1]] as const){
    const positions=result[name],normals=new Float32Array(positions.length),seen=new Map<string,number[]>();
    for(let k=0;k<positions.length;k+=3){
      const key=[positions[k],positions[k+1],positions[k+2]].map((v:number)=>Math.round(v*1e5)).join(',');
      let normal=seen.get(key);
      if(!normal){const p=evaluateBasisFunctionsScreened(mol.primitiveShells,cache,mol.cgtoNormalizationFactors,mol.numBasis,positions[k]*B,positions[k+1]*B,positions[k+2]*B,true);normal=[0,0,0];for(let i=0;i<c.length;i++){normal[0]-=sign*c[i]*p.dphiDx[i];normal[1]-=sign*c[i]*p.dphiDy[i];normal[2]-=sign*c[i]*p.dphiDz[i];}const length=Math.hypot(...normal)||1;normal=normal.map(v=>v/length);seen.set(key,normal);}
      normals.set(normal,k);
    }
    result[name+'Normals']=normals;
  }
  return {...result,index,extent};
}
async function densitySurface(state:number,mode='density',iso=.02){
  if(!calculation)throw Error('Zuerst eine elektronische Rechnung starten.');
  const {mol,atoms,densities}=calculation;
  if(!Number.isInteger(state)||state< -1||state>=densities.length-1)throw Error('Ungültiger Zustand.');
  if(!['density','difference'].includes(mode)||!(iso>=.001&&iso<=.1))throw Error('Ungültige Dichteparameter.');
  if(!self.OrbitalSurface)importScripts('orbital-labor-surface.js');
  const d=densities[state+1],ground=densities[0],n=mol.numBasis,cache=buildShellNormCache(mol.primitiveShells);
  const matrix=new Float64Array(n*n);
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)matrix[i*n+j]=d.get(i,j)-(mode==='difference'?ground.get(i,j):0);
  const evaluate=(x:number,y:number,z:number,gradient=false)=>{
    const p=evaluateBasisFunctionsScreened(mol.primitiveShells,cache,mol.cgtoNormalizationFactors,n,x*B,y*B,z*B,gradient);
    let value=0;const grad=[0,0,0];
    for(let i=0;i<n;i++){
      let v=0;for(let j=0;j<n;j++)v+=matrix[i*n+j]*p.phi[j];value+=p.phi[i]*v;
      if(gradient){grad[0]+=2*v*p.dphiDx[i];grad[1]+=2*v*p.dphiDy[i];grad[2]+=2*v*p.dphiDz[i];}
    }
    return {value,grad};
  };
  const extent=Math.max(...atoms.flatMap((a:any)=>a.xyz.map(Math.abs)))+2.2;
  const result=self.OrbitalSurface.generate({resolution:41,extent,iso},(_s:any,x:number,y:number,z:number)=>evaluate(x,y,z).value);
  for(const [name,sign] of [['positive',1],['negative',-1]] as const){
    const positions=result[name],normals=new Float32Array(positions.length),seen=new Map<string,number[]>();
    for(let k=0;k<positions.length;k+=3){
      const key=[positions[k],positions[k+1],positions[k+2]].map((v:number)=>Math.round(v*1e5)).join(',');let normal=seen.get(key);
      if(!normal){normal=evaluate(positions[k],positions[k+1],positions[k+2],true).grad.map(v=>-sign*v);const len=Math.hypot(...normal)||1;normal=normal.map(v=>v/len);seen.set(key,normal);}normals.set(normal,k);
    }
    result[name+'Normals']=normals;
  }
  return {...result,state,mode,extent};
}
self.onmessage=async({data}:any)=>{
  if(busy){self.postMessage({type:'error',id:data.id,message:'Eine Rechnung läuft bereits.'});return;}
  busy=true;
  try{
    let result:any;
    if(data.action==='prepare'){calculation=null;result=await prepare(data.smiles);}
    else if(data.action==='quantum'){calculation=null;result=await quantum(data.atoms,!!data.refine);}
    else if(data.action==='surface')result=await surface(data.index,data.threshold);
    else if(data.action==='density')result=await densitySurface(data.state,data.mode,data.iso);
    else throw Error('Unbekannter Auftrag.');
    const transfer=['surface','density'].includes(data.action)?[result.positive.buffer,result.negative.buffer,result.positiveNormals.buffer,result.negativeNormals.buffer]:[];
    self.postMessage({type:'result',id:data.id,result},transfer);
  }catch(e:any){self.postMessage({type:'error',id:data.id,message:e?.message||String(e)});}
  finally{busy=false;}
};

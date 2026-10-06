/* MO-RechenLabor helpers, GPL-2.0. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MOCore=api;})(typeof self!=='undefined'?self:globalThis,function(){
  'use strict';
  const HARTREE_EV=27.211386245988,HC=1239.841984;
  function validateGraph(json,smiles){
    if(typeof smiles!=='string'||!smiles.trim()||smiles.length>180)throw Error('Bitte einen SMILES mit höchstens 180 Zeichen eingeben.');
    if(smiles.includes('.'))throw Error('Bitte nur ein zusammenhängendes Molekül eingeben, keine getrennten Fragmente.');
    const mol=json.molecules?.[0];if(!mol||json.molecules.length!==1)throw Error('Keine eindeutige Molekülstruktur erkannt.');
    const def=json.defaults?.atom||{},atoms=mol.atoms.map(a=>({...def,...a}));
    if(atoms.some(a=>![1,6,7,8,9].includes(a.z)))throw Error('Unterstützt werden H, C, N, O und F, keine Metalle oder weiteren Elemente.');
    if(atoms.some(a=>(a.nRad||0)>0))throw Error('Radikale und offene Schalen sind hier nicht unterstützt.');
    if(atoms.reduce((s,a)=>s+(a.chg||0),0)!==0)throw Error('Diese Version berechnet nur neutrale Moleküle.');
    if(atoms.length===2&&atoms.every(a=>a.z===8))throw Error('O₂ besitzt einen offenen Triplet-Grundzustand; das geschlossenschalige Modell dieser App wäre dafür falsch. Nutze das OrbitalLabor.');
    const heavy=atoms.filter(a=>a.z!==1).length,total=atoms.length+atoms.reduce((s,a)=>s+(a.impHs||0),0),n=heavy*5+total-heavy;
    if(heavy>6||total>24||n>36)throw Error(`Struktur zu groß (${heavy} schwere / ${total} gesamte Atome, ${n} Basisfunktionen). Grenze: 6 / 24 / 36. Bitte ein kleineres Molekül wählen.`);
    const electrons=atoms.reduce((s,a)=>s+a.z+(a.impHs||0),0);
    if(electrons%2)throw Error('Eine ungerade Elektronenzahl passt nicht zum geschlossenschaligen Singulett-Modell.');
    const occupied=electrons/2,dim=occupied*(n-occupied);
    if(occupied<1||occupied>=n||dim>324)throw Error('Die Struktur hat in der gewählten Minimalbasis keine zulässige kleine CIS-Rechnung.');
    return {total,heavy,n,electrons,dim};
  }
  function orbitalLabel(index,nocc){const name=index===nocc-1?'HOMO':index===nocc?'LUMO':index<nocc?`HOMO−${nocc-1-index}`:`LUMO+${index-nocc}`;return {name,occupation:index<nocc?2:0};}
  function spectrum(states,min=40,max=800,sigma=.2,count=1400){
    if(!(min>0&&max>min&&sigma>0&&count>=2))throw Error('Ungültige Spektrumsparameter.');
    const valid=states.filter(s=>s.energyEV>0&&Number.isFinite(s.energyEV)&&s.oscillatorStrength>=0&&Number.isFinite(s.oscillatorStrength));
    // Uniform energy samples resolve narrow far-UV peaks that a uniform
    // wavelength grid would skip. Display the resulting curve against λ.
    const points=Array.from({length:count},(_,i)=>{const energy=HC/min-i*(HC/min-HC/max)/(count-1),wavelength=HC/energy;const value=valid.reduce((sum,s)=>sum+s.oscillatorStrength*Math.exp(-.5*((energy-s.energyEV)/sigma)**2),0);return {wavelength,value};});
    const peak=Math.max(...points.map(p=>p.value));points.forEach(p=>p.value=peak>1e-12?p.value/peak:0);
    const lines=valid.filter(s=>HC/s.energyEV>=min&&HC/s.energyEV<=max).map(s=>({...s,wavelength:HC/s.energyEV}));
    return {points,lines,peak};
  }
  function xyz(atoms){const symbols={1:'H',6:'C',7:'N',8:'O',9:'F'};return `${atoms.length}\nMO-RechenLabor · Koordinaten in Angstrom\n`+atoms.map(a=>`${symbols[a.z]} ${a.xyz.map(x=>x.toFixed(7)).join(' ')}`).join('\n');}
  return {validateGraph,orbitalLabel,spectrum,xyz,HARTREE_EV,HC};
});

/* Bounded, explicit external-data parsing. GPL-2.0. No network here. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MODataCore=api;})(globalThis,function(){
  'use strict';
  function pubchem(json){
    const compound=json.PC_Compounds?.[0],coords=compound?.coords?.find(c=>c.type?.includes(2)),conformer=coords?.conformers?.[0];
    if(!compound||!conformer?.z)throw Error('Kein berechneter 3D-Konformer vorhanden.');
    const elements=new Map(compound.atoms.aid.map((id,i)=>[id,compound.atoms.element[i]]));
    if(coords.aid.length>100)throw Error('Datenbankdarstellung auf 100 Atome begrenzt.');
    const atoms=coords.aid.map((id,i)=>({z:elements.get(id),xyz:[conformer.x[i],conformer.y[i],conformer.z[i]]}));
    if(atoms.some(a=>![1,6,7,8,9].includes(a.z)||a.xyz.some(x=>!Number.isFinite(x))))throw Error('Die Datenbankdarstellung unterstützt hier H, C, N, O und F mit gültigen Koordinaten.');
    const center=[0,1,2].map(k=>atoms.reduce((s,a)=>s+a.xyz[k],0)/atoms.length);atoms.forEach(a=>a.xyz=a.xyz.map((v,k)=>v-center[k]));
    const index=new Map(coords.aid.map((id,i)=>[id,i])),bonds=(compound.bonds?.aid1||[]).map((id,i)=>[index.get(id),index.get(compound.bonds.aid2[i]),compound.bonds.order[i]]);
    if(bonds.some(b=>b[0]===undefined||b[1]===undefined))throw Error('Ungültige Bindungszuordnung.');
    const metadata=(conformer.data||[]).map(d=>({label:d.urn?.label,name:d.urn?.name,software:d.urn?.software,version:d.urn?.version,value:d.value}));
    return {cid:compound.id.id.cid,atoms,bonds,metadata,method:'PubChem3D: OpenEye OMEGA / MMFF94s-Konformersuche (allgemeine Verfahrensbeschreibung; keine quantenchemische Optimierung)',source:'https://pubchem.ncbi.nlm.nih.gov/compound/'+compound.id.id.cid};
  }
  function spectrum(text,format='jcamp',csvY='absorbance'){
    if(text.length>2000000)throw Error('Spektrumdatei zu groß (maximal 2 MB).');
    let points=[],metadata={},xunit='nm',yunit=csvY;
    if(format==='csv'){
      const rows=text.trim().split(/\r?\n/);if(rows.length>20002)throw Error('Maximal 20.000 Messpunkte.');
      rows.forEach((line,i)=>{const values=line.trim().split(/[;,\t ]+/).filter(Boolean).map(Number);if(i===0&&values.some(v=>!Number.isFinite(v)))return;if(values.length!==2||values.some(v=>!Number.isFinite(v)))throw Error('CSV benötigt zwei numerische Spalten: Wellenlänge in nm, Absorptionswert (Dezimalpunkt).');points.push({wavelength:values[0],value:values[1]});});
    }else{
      const lines=text.split(/\r?\n/);let data=false,xf=1,yf=1;
      for(const line of lines){
        if(line.startsWith('##')){const match=line.match(/^##([^=]+)=(.*)$/);if(!match)continue;const key=match[1].trim().toUpperCase(),value=match[2].trim();metadata[key]=value;
          if(key==='XYPOINTS')data=true;else if(['XYDATA','PEAK TABLE','NTUPLES'].includes(key))throw Error('Dieser Import unterstützt JCAMP-XYPOINTS, nicht komprimierte XYDATA/NTUPLES. Bitte als zweispaltige CSV exportieren.');else data=false;
          if(key==='XFACTOR')xf=Number(value);if(key==='YFACTOR')yf=Number(value);if(key==='XUNITS')xunit=value;if(key==='YUNITS')yunit=value;
        }else if(data&&line.trim()&&!line.startsWith('$$')){
          const v=line.split('$$')[0].trim().split(/[,;\s]+/).filter(Boolean).map(Number);if(v.length%2||v.some(x=>!Number.isFinite(x)))throw Error('Nicht unterstützte oder ungültige JCAMP-Zahlenkodierung.');for(let i=0;i<v.length;i+=2)points.push({wavelength:v[i]*xf,value:v[i+1]*yf});
        }
      }
      if(!/nm|nanometer/i.test(xunit))throw Error('Es werden nur Wellenlängen in nm unterstützt; keine stillschweigende Einheitenumrechnung.');
      if(!/uv.?vis/i.test(metadata['DATA TYPE']||''))throw Error('Bitte ein UV/Vis-Spektrum, kein IR-, NMR- oder Massenspektrum laden.');
      if(!/absorb|absorpt|extinc|epsilon/i.test(yunit)||/transmi|reflect/i.test(yunit))throw Error('Nicht unterstützte Y-Einheit. Erwartet: Absorption, ε oder log₁₀(ε); Transmission/Reflexion wird nicht als Absorption ausgegeben.');
    }
    if(points.length<2||points.length>20000||points.some(p=>!(p.wavelength>0)||!Number.isFinite(p.value)))throw Error('Ungültige oder zu viele Spektrumsdaten.');
    const logarithmic=/log.*eps|log.*extinc/i.test(yunit);
    if(logarithmic)points.forEach(p=>p.value=10**p.value);
    if(points.some(p=>!Number.isFinite(p.value)))throw Error('Absorptionswerte außerhalb des zulässigen Zahlenbereichs.');
    points.sort((a,b)=>a.wavelength-b.wavelength);const peak=Math.max(...points.map(p=>p.value));if(!(peak>0))throw Error('Spektrum enthält keine positive Absorption.');
    return {points:points.map(p=>({...p,value:Math.max(0,p.value)/peak})),metadata,yunit,conversion:logarithmic?'log₁₀(ε) wurde zu ε zurückgerechnet, danach separat normiert.':'Separate Normierung auf das Maximum des importierten Datensatzes.',min:points[0].wavelength,max:points.at(-1).wavelength};
  }
  return {pubchem,spectrum};
});

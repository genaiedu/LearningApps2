/* Optional database access is separate from the local computation. GPL-2.0. */
(function(){
  'use strict';const $=id=>document.getElementById(id),core=window.MODataCore;let geometry=null,measurement=null,request=null;
  const notify=()=>window.dispatchEvent(new Event('mo-data-change'));
  function requireSameMolecule(){const r=window.MOApp.result,s=$('smiles').value.trim();if(r&&s!==r.input&&s!==r.canonical)throw Error('Die aktuelle Eingabe weicht vom berechneten Molekül ab. Bitte zuerst neu berechnen oder die bisherigen Ergebnisse zurücksetzen, damit keine verschiedenen Moleküle verglichen werden.');}
  window.MOData={get geometry(){return geometry;},get spectrum(){return measurement;},clear(){request?.abort();geometry=null;measurement=null;$('geometry-source').value='local';$('geometry-source').options[1].disabled=true;$('spectrum-source').value='local';for(const o of [...$('spectrum-source').options].slice(1))o.disabled=true;$('data-provenance').textContent='Noch kein externer Datensatz geladen.';$('measurement-provenance').textContent='Noch kein Messspektrum geladen.';notify();}};
  async function search(){
    if(!$('database-consent').checked){$('data-provenance').textContent='Bitte zuerst die Datenbankabfrage ausdrücklich freigeben. Die eingegebene Struktur wird an PubChem übertragen.';return;}
    if(window.MOApp.busy)return;
    const smiles=$('smiles').value.trim();if(!smiles||smiles.length>180)return;
    try{requireSameMolecule();}catch(e){$('data-provenance').textContent=e.message;return;}
    request?.abort();request=new AbortController();const controller=request,timer=setTimeout(()=>controller.abort(),20000);$('database-search').disabled=true;$('data-provenance').textContent='PubChem wird nach genau dieser SMILES-Struktur gefragt …';
    try{
      const url='https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/'+encodeURIComponent(smiles)+'/JSON?record_type=3d',response=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
      if(!response.ok)throw Error('Kein abrufbarer PubChem-3D-Datensatz (HTTP '+response.status+'). Nicht für jedes Molekül vorhanden.');
      const text=await response.text();if(text.length>2000000)throw Error('Datenbankantwort zu groß.');const g=core.pubchem(JSON.parse(text));if(request!==controller)return;
      geometry={...g,query:smiles,retrieved:new Date().toISOString()};$('geometry-source').options[1].disabled=false;$('geometry-source').value='pubchem';
      const host=$('data-provenance');host.replaceChildren();const p=document.createElement('p');p.textContent='CID '+g.cid+' · '+g.method+'. '+g.metadata.filter(m=>m.label==='Energy'||m.label==='Conformer').map(m=>[m.label,m.name,m.software,m.version,JSON.stringify(m.value)].filter(Boolean).join(' · ')).join('; ');const a=document.createElement('a');a.href=g.source;a.target='_blank';a.rel='noopener';a.textContent='Originaldatensatz und Methodenangaben ↗';host.append(p,a);notify();
    }catch(e){if(request===controller)$('data-provenance').textContent=e.name==='AbortError'?'Abfrage beendet oder Zeitlimit erreicht. Keine Daten übernommen.':e.message;}
    finally{clearTimeout(timer);if(request===controller){request=null;$('database-search').disabled=false;}}
  }
  $('database-search').onclick=search;$('database-consent').onchange=()=>{if(!$('database-consent').checked){request?.abort();$('data-provenance').textContent='Weitere Datenbankabfragen gesperrt. Bereits geladene Daten bleiben lokal.';}};
  $('geometry-source').onchange=notify;$('spectrum-source').onchange=notify;
  $('smiles').addEventListener('input',()=>window.MOData.clear());
  $('measurement-import').onclick=async()=>{
    const file=$('measurement-file').files[0],source=$('measurement-source').value.trim(),conditions=$('measurement-conditions').value.trim(),query=$('smiles').value.trim();
    try{requireSameMolecule();if(!file||file.size>2000000)throw Error('Bitte eine Spektrumdatei bis 2 MB auswählen.');if(!source||!conditions||!$('measurement-confirm').checked)throw Error('Quelle, Verfahren/Messbedingungen und Zuordnung zur aktuellen Molekülstruktur müssen angegeben bzw. bestätigt werden.');
      const parsed=core.spectrum(await file.text(),/\.csv$/i.test(file.name)?'csv':'jcamp');if(query!==$('smiles').value.trim())throw Error('Moleküleingabe wurde während des Imports geändert. Keine Daten übernommen.');measurement={...parsed,source,conditions,query,name:file.name,kind:'Experimentell (vom Nutzer zugeordnet)',retrieved:new Date().toISOString()};
      for(const o of [...$('spectrum-source').options].slice(1))o.disabled=false;$('spectrum-source').value='both';$('measurement-provenance').textContent=measurement.kind+' · '+source+' · '+conditions+' · '+parsed.min.toFixed(1)+'–'+parsed.max.toFixed(1)+' nm. '+parsed.conversion+' Datei: '+file.name+'. '+Object.entries(parsed.metadata).filter(([k])=>['TITLE','ORIGIN','OWNER','$REF AUTHOR','$REF DATE','CAS REGISTRY NO','YUNITS'].includes(k)).map(([k,v])=>k+': '+v).join(' · ');notify();
    }catch(e){$('measurement-provenance').textContent=e.message;}
  };
  // Search links are clearly marked as links, not fetched wavefunctions.
  $('nist-search').onclick=()=>{const name=$('database-name').value.trim();if(!name)return;$('nist-search').href='https://webbook.nist.gov/cgi/cbook.cgi?Name='+encodeURIComponent(name)+'&Units=SI&Mask=400';};
  window.addEventListener('pagehide',()=>request?.abort());
})();

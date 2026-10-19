/* Local character coverage for teachers. No names leave the page or enter storage. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;return;}
  root.TypoSchool=api;
  const $=id=>document.getElementById(id),make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  let catalogue=null,family=null,file=null,epoch=0;
  const names=$('name-probe'),fonts=$('name-font'),cuts=$('name-cut'),proof=$('name-proof'),status=$('name-status');
  function cutsForFamily(){
    family=catalogue.families.find(f=>f.id===fonts.value);cuts.replaceChildren();
    for(const [i,source]of family.files.entries()){
      const w=source.weight,label=(source.style==='italic'?'Kursiv':'Aufrecht')+' · '+(Array.isArray(w)?w.join('–'):w);
      const option=make('option',label);option.value=String(i);cuts.append(option);
    }
    cuts.value=String(family.files.indexOf(api.referenceFile(family)));update();
  }
  async function update(){
    const token=++epoch;file=family.files[Number(cuts.value)];proof.replaceChildren();
    const text=names.value.normalize('NFC'),result=api.probe(text,file.coverage.ranges);
    const weight=api.fileWeight(file);proof.style.fontFamily='"'+family.name+'",sans-serif';
    proof.style.fontStyle=file.style;proof.style.fontWeight=String(weight);proof.style.fontSynthesis='none';
    for(const part of result.parts){
      const span=make('span',part.text);
      if(part.missing.length){span.className='coverage-missing';span.title='Nicht enthalten: '+part.missing.map(api.codepoint).join(', ');}
      proof.append(span);
    }
    const missing=[...new Set(result.missing)];
    $('name-missing').textContent=missing.length?'Nicht im Zeichenvorrat dieses Schnitts: '+missing.map(c=>c+' ('+api.codepoint(c)+')').join(' · ')+'. Die markierten Zeichen können deshalb aus einer Ersatzschrift kommen.':text?'Alle geprüften Zeichen stehen im Zeichenvorrat dieses Schnitts. Das ist noch keine Qualitätsprüfung der Formen oder ihrer Abstände.':'Gib eine erfundene Namensprobe ein.';
    status.textContent=family.name+' · '+cuts.selectedOptions[0].textContent+' · lokale Datei wird geprüft …';
    proof.hidden=true;
    try{
      if(!document.fonts)throw Error('Font loading cannot be verified');
      // Load one known covered character too, even if the name is wholly absent.
      const loaded=await document.fonts.load(file.style+' '+weight+' 32px "'+family.name+'"','A'+text);
      if(token!==epoch)return;
      if(!loaded.length)throw Error('Font unavailable');
      proof.hidden=false;status.textContent=family.name+' · '+cuts.selectedOptions[0].textContent+' · lokale Schrift geladen; Eingabe für die Prüfung in NFC vereinheitlicht.';
    }catch(_){if(token===epoch)status.textContent='Die gewählte Schrift konnte nicht verifiziert geladen werden. Die Dateiprüfung darunter bleibt lesbar; eine Ersatzschrift wird nicht als gelungene Probe ausgegeben.';}
  }
  api.setCatalogue=data=>{
    if(!names||!fonts||!cuts||!data.coverageAudit)return;
    catalogue=data;fonts.replaceChildren();
    for(const f of [...data.families].sort((a,b)=>a.name.localeCompare(b.name,'de'))){const o=make('option',f.name);o.value=f.id;fonts.append(o);}
    fonts.value='firasans';fonts.onchange=cutsForFamily;cuts.onchange=update;names.oninput=update;
    $('name-controls').hidden=false;const look=$('name-look');if(look)look.hidden=false;cutsForFamily();
  };
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function hasCodepoint(ranges,codepoint){
    let left=0,right=ranges.length-1;
    while(left<=right){const mid=(left+right)>>1,[a,b]=ranges[mid];if(codepoint<a)right=mid-1;else if(codepoint>b)left=mid+1;else return true;}
    return false;
  }
  const codepoint=character=>'U+'+character.codePointAt(0).toString(16).toUpperCase().padStart(4,'0');
  function probe(text,ranges){
    const normalized=String(text).normalize('NFC');
    const segments=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('de',{granularity:'grapheme'}).segment(normalized)].map(s=>s.segment):Array.from(normalized);
    const parts=segments.map(text=>({text,missing:Array.from(text).filter(c=>!/[\r\n\t]/.test(c)&&!hasCodepoint(ranges,c.codePointAt(0)))}));
    return {parts,missing:parts.flatMap(p=>p.missing)};
  }
  function fileWeight(file){const w=file.weight;return Array.isArray(w)?Math.max(w[0],Math.min(w[1],400)):w;}
  function referenceFile(family){return family.files.filter(f=>f.style==='normal').sort((a,b)=>Math.abs(fileWeight(a)-400)-Math.abs(fileWeight(b)-400))[0];}
  function matchingSize(reference,target,points){
    const height=f=>f.glyphs.x.bounds[3]/f.unitsPerEm;
    if(!(points>0&&height(reference)>0&&height(target)>0))throw Error('Positive point size and measured x-heights required');
    return points*height(reference)/height(target);
  }
  return {hasCodepoint,codepoint,probe,fileWeight,referenceFile,matchingSize};
});

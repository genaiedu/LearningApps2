/* Font selection and real OOXML font parts; no system-font substitution. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SchriftsetzerWordFonts=api;})(typeof window==='object'?window:globalThis,()=>{'use strict';
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 function create(manifest,load){const used=new Map();
  function resolve(font,weight,italic=false){const all=manifest.faces.filter(f=>f.familyId===font.id),style=italic&&all.some(f=>f.style==='italic')?'italic':'normal',face=all.filter(f=>f.style===style).sort((a,b)=>Math.abs(a.weight-weight)-Math.abs(b.weight-weight)||a.weight-b.weight)[0];if(!face)throw new Error('Keine einbettbare Schriftdatei für '+font.name+' gefunden.');if(face.fsType&0x206)throw new Error('Diese Schrift erlaubt keine bearbeitbare Einbettung: '+font.name);used.set(face.path,face);return face;}
  async function embed(zip,F){const groups=new Map(),relations=[];let count=0;
   for(const face of used.values()){const data=await load(face);if(!(data instanceof Uint8Array)||data.length<32)throw new Error('Die Schrift '+face.name+' konnte nicht vollständig eingebettet werden.');
    const id='ssFont'+(++count),path='word/fonts/ss-font-'+count+'.odttf';zip[path]=data;
    relations.push('<Relationship Id="'+id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/ss-font-'+count+'.odttf"/>');
    const kind=face.bold?(face.italic?'embedBoldItalic':'embedBold'):(face.italic?'embedItalic':'embedRegular'),entry='<w:'+kind+' r:id="'+id+'" w:fontKey="'+escape(face.key)+'" w:subsetted="false"/>';
    if(!groups.has(face.name))groups.set(face.name,new Map());const group=groups.get(face.name);if(group.has(kind))throw new Error('Mehrdeutiger eingebetteter Schriftschnitt: '+face.name);group.set(kind,entry);
   }
   zip['word/fontTable.xml']=F.strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+[...groups].map(([name,parts])=>'<w:font w:name="'+escape(name)+'">'+['embedRegular','embedBold','embedItalic','embedBoldItalic'].map(k=>parts.get(k)||'').join('')+'</w:font>').join('')+'</w:fonts>');
   zip['word/_rels/fontTable.xml.rels']=F.strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+relations.join('')+'</Relationships>');
   zip['[Content_Types].xml']=F.strToU8(F.strFromU8(zip['[Content_Types].xml']).replace('</Types>','<Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/></Types>'));
   zip['word/settings.xml']=F.strToU8(F.strFromU8(zip['word/settings.xml']).replace('<w:displayBackgroundShape','<w:embedTrueTypeFonts/><w:embedSystemFonts/><w:saveSubsetFonts w:val="false"/><w:displayBackgroundShape'));
   return count;
  }
  return {resolve,embed};
 }
 return {create};
});

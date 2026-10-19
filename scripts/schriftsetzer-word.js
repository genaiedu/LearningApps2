/* Local download only: document text and image data never leave the browser. */
(()=>{'use strict';
 const root=document.querySelector('.longtext-reader'),stage=document.getElementById('longtext-stage');if(!root||!stage)return;
 const box=document.createElement('div');box.className='schriftsetzer-export';
 box.innerHTML='<div class="schriftsetzer-export-actions"><button type="button" id="schriftsetzer-pdf">Als PDF sichern</button><button type="button" id="schriftsetzer-word" disabled>Als Word speichern</button></div><p class="small" id="schriftsetzer-word-status" role="status">Word-Export wird vorbereitet …</p><details><summary>Was bleibt in Word erhalten?</summary><p class="small">Papierformat, Satzspiegel mit gespiegelten Innen- und Außenrändern, Kopf- und Fußsteg, Schriftauswahl, Titel, Kapitelauftakte, Tabellen und Abbildungen werden übernommen. Die Datei bleibt bearbeitbar. Word berechnet Zeilen, Trennung und Seiten neu; für einen unveränderlichen Umbruch bitte PDF verwenden.</p><p class="small">Die verwendeten Schriftschnitte werden vollständig eingebettet. Verwende zum Öffnen eine aktuelle Word-Desktopversion. Bei eingeschränkten Einbettungsrechten erscheint eine Meldung; es wird keine Ersatzschrift gespeichert. Banderolen, Schmuckinitialen und das sichtbare Grundlinienraster bleiben der PDF-Ausgabe vorbehalten. Das Inhaltsverzeichnis in Word gegebenenfalls mit „Felder aktualisieren“ neu berechnen. Unveränderte PDF-Originalseiten bitte als PDF sichern.</p></details>';
 stage.before(box);const button=box.querySelector('#schriftsetzer-word'),status=box.querySelector('[role="status"]'),pdf=box.querySelector('#schriftsetzer-pdf');let busy=false,library,resultLocked=false;
 function sync(){const job=window.TypoLongtext?.exportJob(),ready=!!job;button.disabled=busy||!ready||!!job.document.fixedPages;pdf.disabled=document.getElementById('longtext-print').disabled;
  if(!busy&&ready&&!resultLocked){if(job.document.fixedPages){status.textContent='PDF-Originalseiten: Für eine bearbeitbare Word-Datei mit „Neuer Satz“ importieren.';return;}
   const g=window.TypoSatzspiegel.geometry(job.settings.format,job.settings.layout),n=v=>(v/10).toLocaleString('de',{maximumFractionDigits:2});
   status.textContent='Word: '+n(g.width)+' × '+n(g.height)+' cm · innen '+n(g.inner)+' / außen '+n(g.outer)+' / oben '+n(g.top)+' / unten '+n(g.bottom)+' cm · gespiegelte Ränder.';
  }
 }
 pdf.onclick=()=>document.getElementById('longtext-print').click();
 function loadLibrary(){if(window.docx)return Promise.resolve(window.docx);if(library)return library;library=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/docx/docx-9.6.1.js';script.onload=()=>window.docx?resolve(window.docx):reject(new Error('Die lokale Word-Bibliothek konnte nicht geöffnet werden.'));script.onerror=()=>{script.remove();library=null;reject(new Error('Die lokale Word-Bibliothek konnte nicht geladen werden. Bitte erneut versuchen.'));};document.head.append(script);});return library;}
 async function loadImage(item){const url=new URL(item.src,document.baseURI);if(!['http:','https:','data:','blob:'].includes(url.protocol))throw new Error('Ein Bild hat eine nicht unterstützte Adresse.');
  const response=await fetch(url);if(!response.ok)throw new Error('Eine Abbildung konnte nicht geladen werden. Der Export wurde nicht unvollständig gespeichert.');
  const blob=await response.blob(),image=new Image(),objectUrl=URL.createObjectURL(blob);try{image.src=objectUrl;await image.decode();
   const type=blob.type==='image/jpeg'?'jpg':blob.type==='image/png'?'png':null;if(type)return {data:new Uint8Array(await blob.arrayBuffer()),type,width:image.naturalWidth,height:image.naturalHeight};
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext('2d').drawImage(image,0,0);const converted=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!converted)throw new Error('Ein Bild konnte nicht für Word umgewandelt werden.');return {data:new Uint8Array(await converted.arrayBuffer()),type:'png',width:canvas.width,height:canvas.height};
  }finally{URL.revokeObjectURL(objectUrl);}
 }
 button.onclick=async()=>{if(busy)return;const original=window.TypoLongtext?.exportJob();if(!original)return;
  const job=structuredClone(original),warnings=window.SchriftsetzerWord.notices(job).filter(text=>/nicht in Word|normale Buchstaben/.test(text));
  if(warnings.length&&!confirm(warnings.join('\n\n')+'\n\nTrotzdem als bearbeitbare Word-Datei speichern?'))return;
  busy=true;resultLocked=true;button.disabled=true;button.textContent='Word-Datei wird erstellt …';status.textContent='Text, Seiteneinstellungen und Abbildungen werden lokal für Word vorbereitet …';
  try{const D=await loadLibrary(),manifestResponse=await fetch('data/schriftsetzer-word-fonts.json');if(!manifestResponse.ok)throw new Error('Die lokalen Schriften zum Einbetten konnten nicht geladen werden.');
   const manifest=await manifestResponse.json(),fonts=window.SchriftsetzerWordFonts.create(manifest,async face=>{const response=await fetch(face.path);if(!response.ok)throw new Error('Die Schrift '+face.name+' konnte nicht eingebettet werden. Bitte erneut versuchen.');return new Uint8Array(await response.arrayBuffer());}),result=await window.SchriftsetzerWord.build(job,{docx:D,fflate:window.fflate,geometry:window.TypoSatzspiegel,bookLayout:window.TypoBookLayout,loadImage,fonts});
   const blob=new Blob([result.data],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=result.filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);status.textContent='Word-Datei gespeichert: '+result.filename+'. '+result.fontCount+' Schriftschnitte vollständig eingebettet; Papierformat und gespiegelte Ränder enthalten. Word kann den Text neu umbrechen.';
  }catch(error){status.textContent=error.message||'Die Word-Datei konnte nicht erstellt werden. Bitte erneut versuchen.';}finally{busy=false;button.textContent='Als Word speichern';button.disabled=false;}
 };
 for(const type of ['input','change'])document.getElementById('langtext-satzprobe').addEventListener(type,()=>{resultLocked=false;});
 new MutationObserver(()=>{if(!busy)sync();}).observe(document.getElementById('longtext-status'),{childList:true,subtree:true});sync();
})();

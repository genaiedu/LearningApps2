/* Original infographic compositions with local icons.
   FoxFaceTail: lucide-icons/lucide-lab, commit 34b6526d0a67bbe67b8a54b9b101018b1377ef28.
   ISC notice: assets/hundegenetik/LICENSE-lucide-lab.txt.
   MaterialFace: Google Material Icons (Apache 2.0), commit 49d4db35df873165d6bd6ba09b063c7dafbac2f4,
   src/action/face/materialiconsoutlined/24px.svg. Original path, local SVG-node embedding;
   placement, size and palette colour adapted. License: fonts/mathjax/LICENSE-MathJax.txt.
   Research numbers are cited; invented sequences and explanatory models are labelled as such. */
((root,factory)=>{const api=factory(typeof module==='object'&&module.exports?require('../../LearningApps/fonts/lucide.min.js'):root.lucide);if(typeof module==='object'&&module.exports)module.exports=api;else root.DogFigures=api;})(typeof globalThis!=='undefined'?globalThis:this,lucide=>{
 'use strict';
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const text=(x,y,s,cls='',anchor='middle')=>`<text x="${x}" y="${y}" class="gf-text ${cls}" text-anchor="${anchor}">${esc(s)}</text>`;
 const line=(x1,y1,x2,y2,cls='')=>`<path d="M${x1} ${y1}L${x2} ${y2}" class="gf-line ${cls}"/>`;
 const arrow=(x1,y1,x2,y2,cls='')=>{const a=Math.atan2(y2-y1,x2-x1),l=11;return line(x1,y1,x2,y2,cls)+`<path d="M${x2-l*Math.cos(a-.5)} ${y2-l*Math.sin(a-.5)}L${x2} ${y2}L${x2-l*Math.cos(a+.5)} ${y2-l*Math.sin(a+.5)}" class="gf-line ${cls}"/>`;};
 const box=(x,y,w,h,cls='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" class="gf-box ${cls}"/>`;
 const allele=(x,y,a,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})"><rect x="-18" y="-48" width="36" height="96" rx="18" class="gf-chromosome ${a==='a'?'gf-alt':''}"/><path d="M-17 -28H17M-17 -22H17" class="gf-line gf-band"/>${text(0,9,a,'gf-allele')}</g>`;
 const foxNodes=[
  ['path',{d:'M19.9 8.3C20.6 7 21 5.6 21 4c0-.6-.4-1-1-1-2.3 0-4.3.8-5.9 2.2a14.92 14.92 0 0 0-4.2 0A8.78 8.78 0 0 0 4 3c-.6 0-1 .4-1 1 0 1.6.4 3 1.1 4.3-.6.7-1.1 1.4-1.4 2.2C4 13 11 16 12 16s8-3 9.3-5.5c-.3-.8-.8-1.5-1.4-2.2'}],
  ['path',{d:'M9 9v.5'}],['path',{d:'M13 13h-2'}],['path',{d:'M12 16v-3'}],['path',{d:'M15 9v.5'}],
  ['path',{d:'M6.3 20.5A6.87 6.87 0 0 0 9 15H2.2c.8 4 4.9 7 9.8 7 5.5 0 10-3.8 10-8.5 0-1.1-.2-2.1-.7-3'}]
 ];
 const faceNodes=[['path',{d:'M10.25 13c0 .69-.56 1.25-1.25 1.25S7.75 13.69 7.75 13s.56-1.25 1.25-1.25 1.25.56 1.25 1.25zM15 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm7 .25c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10zM10.66 4.12C12.06 6.44 14.6 8 17.5 8c.46 0 .91-.05 1.34-.12C17.44 5.56 14.9 4 12 4c-.46 0-.91.05-1.34.12zM4.42 9.47c1.71-.97 3.03-2.55 3.66-4.44C6.37 6 5.05 7.58 4.42 9.47zM20 12c0-.78-.12-1.53-.33-2.24-.7.15-1.42.24-2.17.24-3.13 0-5.92-1.44-7.76-3.69C8.69 8.87 6.6 10.88 4 11.86c.01.04 0 .09 0 .14 0 4.41 3.59 8 8 8s8-3.59 8-8z'}]];
 const symbol=(name,x,y,size,cls='')=>{const nodes=name==='FoxFaceTail'?foxNodes:name==='MaterialFace'?faceNodes:(lucide.icons||lucide)[name];if(!nodes)throw Error('Fehlendes lokales Symbol: '+name);const backing=cls==='gf-fox-front'?[nodes[0],nodes[nodes.length-1]].map(([,attrs])=>`<path d="${esc(attrs.d)}" class="gf-symbol-paper"/>`).join(''):'';return`<g transform="translate(${x-size/2} ${y-size/2}) scale(${size/24})" class="gf-symbol ${cls}" data-symbol="${name}">${backing}${nodes.map(([tag,attrs])=>`<${tag} ${Object.entries(attrs).map(([k,v])=>`${k}="${esc(v)}"`).join(' ')}/>`).join('')}</g>`;};
 const dog=(x,y,scale=1,fox=false)=>symbol(fox?'FoxFaceTail':'Dog',x,y,88*scale);
 const foxPair=(x,y,scale=1)=>{const size=88*scale;return`<g class="gf-parent-pair">${symbol('FoxFaceTail',x+size*.28,y-size*.28,size,'gf-fox-back')}${symbol('FoxFaceTail',x-size*.2,y+size*.1,size,'gf-fox-front')}</g>`;};
 const human=(x,y,s=1)=>symbol('MaterialFace',x,y,100*s,'gf-symbol-person');
 const meta={
  dna:{title:'Eine Stelle, zwei Varianten',alt:'Zwei erfundene DNA-Abschnitte unterscheiden sich an genau einer Position: oben G, unten A. Beide sind Varianten desselben Abschnitts.',note:'Erfundener Sequenzausschnitt zur Begriffserklärung. Kein echtes Hundegenom und keine Krankheitsvorhersage.'},
  kopien:{title:'Eine Kopie von jedem Elternteil',alt:'Ein Elternteil gibt am betrachteten autosomalen Genort A weiter, der andere a. Der Nachkomme trägt hier Aa.',note:'Mögliche Weitergabe an einem autosomalen Genort. A und a bezeichnen Varianten, nicht Körpergrößen.'},
  abstand:{title:'Sichtbarer Kontrast ist kein DNA-Maß',alt:'Mittlerer geschätzter SNP-Abstand: zwischen Hunden verschiedener Rassen 1,70 Millionen, zwischen den untersuchten Grauwölfen 2,35 Millionen.',note:'Eigene Darstellung nach Funk & Kidd (2024). Gruppenmittel an gefilterten SNP-Positionen, keine Prozentwerte des Gesamtgenoms und kein direkter Chihuahua-Mastiff-Test.',source:'funk'},
  baum:{title:'Ein Baum zeigt Beziehungen, keine Elternliste',alt:'Ein erfundener Baum zeigt zwei enger verzweigte Linien und eine weitere Linie. Ein gestrichelter Querverweis verdeutlicht: Kreuzungen lassen sich nicht allein durch einen Baum ausdrücken.',note:'Schematisches Lesebeispiel ohne Rasse- oder Messdaten. Die interaktive Forschungsabbildung von 2017 bleibt davon getrennt.'},
  groesse:{title:'Viele Beiträge zur Körpergröße',alt:'Die mit Größe verbundene Region IGF1-AS ist einer von mehreren genetischen Beiträgen. Auch Entwicklung und Ernährung wirken auf das Wachstum.',note:'Qualitatives Schema, keine gemessenen Einflussgewichte. IGF1-AS ist mit Größe assoziiert; es gibt keinen einzelnen Chihuahua-Mastiff-Schalter.',source:'size'},
  neun:{title:'9 % erklären nicht 9 % Gene',alt:'Hundert Felder stellen gemessene Verhaltensunterschiede dar. Rund neun Prozent wurden durch die Rassenangabe erklärt, 91 Prozent durch diese Angabe nicht. Das ist keine Aufteilung von Genen und Umwelt.',note:'Eigene Darstellung nach Morrill et al. (2022), gerundet. Die 91 % umfassen alle durch das Rasseetikett nicht erklärten Unterschiede.',source:'morrill'},
  einfluesse:{title:'Ein Verhalten, mehrere Einflüsse',alt:'Gene, Entwicklung, Erfahrungen und die aktuelle Situation wirken zusammen auf beobachtetes Verhalten. Die Darstellung weist keine Prozentanteile zu.',note:'Qualitatives Schema. Genetische Beiträge sind weder ein unveränderliches Schicksal noch am Foto eines Hundes ablesbar.'},
  ahnen:{title:'Dieselbe Ahnenvariante auf zwei Wegen',alt:'Eine vorhandene Variante a kann von einem gemeinsamen Vorfahren über beide elterlichen Linien zu einem Nachkommen gelangen. Er kann sie dadurch doppelt als aa erhalten.',note:'Ein möglicher Vererbungsweg, keine vollständige Ahnentafel. Dazwischen können weitere Generationen liegen. Verwandtschaft erzeugt die Variante nicht neu.',source:'mooney'},
  rezessiv:{title:'Ein vereinfachtes rezessives Modell',alt:'AA ist im Modell unbetroffen. Aa ist ein Trägertier ohne die Modellkrankheit. aa ist bei angenommener voller Ausprägung betroffen. Dieses Modell beschreibt nicht DCM.',note:'Autosomal-rezessives Modell mit voller Ausprägung. Nicht jede reale Erbkrankheit folgt diesem Schema; ausdrücklich kein DCM-Modell.'},
  marker:{title:'Risikovariante ist nicht Diagnose',alt:'Ein Gentest untersucht Varianten. Eine klinische Untersuchung untersucht die Herzfunktion. Ein einzelner Risikomarker ersetzt keine Untersuchung und kann DCM nicht sicher ausschließen.',note:'Schematische Unterscheidung von DNA-Befund und klinischem Befund, kein persönlicher Diagnose- oder Zuchtrat.',source:'dcm'},
  klinik:{title:'24 Erkrankungen – kein Gesamtsieger',alt:'In einer Klinikstudie waren zehn von 24 untersuchten Erkrankungen bei Rassehunden häufiger. Bei 13 war kein Unterschied nachgewiesen, eine war bei Mischlingen häufiger.',note:'Eigene Darstellung nach Bellumori et al. (2013). Ein Feld steht für eine untersuchte Erkrankung, nicht für einen Hund. Klinikstichprobe; kein pauschales Gesundheitsranking.',source:'bellumori'},
  fuchs:{title:'Nicht der Trick wird vererbt',alt:'Im Fuchsprogramm wurden Reaktionen auf Menschen getestet, Elterntiere ausgewählt und Nachkommen über Generationen verglichen. Das ist nicht die Vererbung eines antrainierten Tricks.',note:'Schematischer Ablauf der Selektion, keine Messkurve und keine garantierte Entwicklung jedes Einzeltiers. Silberfüchse sind Rotfüchse, keine Hunde.',source:'fox-history'},
  debatte:{title:'Ein Ergebnis ist nicht jede Erklärung',alt:'Veränderte Reaktionen auf Menschen sind ein Ergebnis der Verhaltensauswahl. Wie weit diese Auswahl ein allgemeines Bündel körperlicher Domestikationsmerkmale erklärt, bleibt umstritten. Die Farmvorgeschichte gehört zur Einordnung.',note:'Einordnung der Debatte: Lord et al. (2020) und die Erwiderung von Trut, Kharlamova & Herbeck (2020). Die Kritik bestreitet nicht jede Verhaltensänderung.'}
 };
 function draw(id,m){
  const w=m?560:900;
  let h=m?470:330,s='';
  if(id==='dna'){
   h=m?430:310;const x=m?62:205,y=m?150:122,step=m?64:72;
   s=text(w/2,42,'Derselbe DNA-Abschnitt','gf-heading');
   ['ACGTGCA','ACGTACA'].forEach((seq,r)=>{s+=text(m?30:95,y+r*100+7,r?'B':'A','gf-muted');[...seq].forEach((a,i)=>{s+=box(x+i*step-23,y+r*100-31,46,54,i===4?'gf-variant-box':'');s+=text(x+i*step,y+r*100+7,a,i===4?'gf-base gf-change':'gf-base');if(i<6)s+=line(x+i*step+23,y+r*100-4,x+(i+1)*step-23,y+r*100-4);});});
   s+=line(x+4*step,y+29,x+4*step,y+67,'gf-accent');s+=text(w/2,h-30,'G ↔ A: ein Baustein ist verschieden','gf-caption');
  }else if(id==='kopien'){
   h=m?470:340;const l=m?137:225,r=m?423:675;
   s+=text(l,35,'Elternteil 1','gf-heading')+text(r,35,'Elternteil 2','gf-heading');
   s+=allele(l,108,'A',1.05)+allele(r,108,'a',1.05);
   s+=arrow(l,174,w/2-28,h-133,'gf-accent')+arrow(r,174,w/2+28,h-133,'gf-accent');
   s+=allele(w/2-28,h-76,'A')+allele(w/2+28,h-76,'a');
   s+=text(w/2,h-8,'Aa · zwei Kopien, ein Genort','gf-caption');
  }else if(id==='abstand'){
   h=m?400:310;const start=m?36:340,end=w-42,range=end-start;
   [['Hunde verschiedener Rassen',1.702814],['Grauwölfe untereinander',2.346972]].forEach(([label,n],i)=>{const y=m?86+i*137:83+i*116;s+=text(m?36:30,m?y-32:y+7,label,'gf-label','start');s+=box(start,y+(m?0:-20),range,34,'gf-track');s+=`<rect x="${start}" y="${y+(m?0:-20)}" width="${range*n/2.5}" height="34" rx="4" class="gf-fill"/>`;s+=text(end,m?y+65:y+53,n.toLocaleString('de-DE',{maximumFractionDigits:2,minimumFractionDigits:2})+' Mio.','gf-number','end');});
   s+=text(w/2,h-14,'Mittlerer geschätzter SNP-Abstand','gf-caption');
  }else if(id==='baum'){
   h=m?450:330;const rootX=m?80:130,rootY=m?235:170,splitX=m?248:430,tipX=w-110;
   s+=line(rootX,rootY,splitX,rootY)+line(splitX,rootY,splitX,72)+line(splitX,72,tipX,72)+line(splitX,rootY,splitX,h-85)+line(splitX,h-85,tipX,h-85);
   s+=line(splitX+75,72,splitX+75,142)+line(splitX+75,142,tipX,142);
   [72,142,h-85].forEach((y,i)=>{s+=`<circle cx="${tipX}" cy="${y}" r="9" class="gf-fill"/>`+text(tipX+27,y+8,['A','B','C'][i],'gf-heading','start');});
   s+=arrow(tipX-28,h-100,tipX-28,161,'gf-dashed gf-accent');
   s+=text(m?124:239,42,'Verzweigungen','gf-heading');s+=text(w/2,h-20,'Kreuzungen brauchen zusätzliche Information','gf-caption');
  }else if(id==='groesse'){
   h=m?480:340;const inputs=m?[[135,75],[425,75],[280,380]]:[[160,80],[450,80],[740,80]];
   [['IGF1-AS','assoziiert'],['Weitere','Genregionen'],['Entwicklung','und Ernährung']].forEach((v,i)=>{const [x,y]=inputs[i];s+=box(x-116,y-42,232,84)+text(x,y-5,v[0],'gf-heading')+text(x,y+25,v[1],'gf-label');s+=arrow(x,m?(i===2?y-52:y+53):y+53,m?280:450,m?(i===2?284:212):214,i===0?'gf-accent':'');});
   s+=box(w/2-130,m?222:228,260,70,'gf-soft')+text(w/2,m?266:272,'Körpergröße','gf-heading');
  }else if(id==='neun'){
   h=m?490:340;const x=m?140:55,y=m?102:36,cell=m?24:26,gap=4;
   for(let i=0;i<100;i++)s+=`<rect x="${x+(i%10)*(cell+gap)}" y="${y+Math.floor(i/10)*(cell+gap)}" width="${cell}" height="${cell}" rx="3" class="${i<9?'gf-fill':'gf-waffle'}"/>`;
   s+=text(m?w/2:590,m?67:102,'9 %','gf-big');
   s+=text(m?w/2:590,m?425:155,'durch Rassenangabe erklärt','gf-label');
   s+=text(m?w/2:590,m?465:217,'91 % dadurch nicht erklärt','gf-caption');
  }else if(id==='einfluesse'){
   h=m?500:340;const cy=m?250:170,positions=m?[[150,60],[410,60],[150,428],[410,428]]:[[145,72],[755,72],[145,270],[755,270]];
   ['Gene','Erfahrungen','Entwicklung','Situation'].forEach((label,i)=>{const [x,y]=positions[i];s+=arrow(x,y+(y<cy?31:-31),w/2+(x<w/2?-95:95),cy+(y<cy?-24:24));s+=box(x-105,y-29,210,58)+text(x,y+8,label,'gf-heading');});
   s+=box(w/2-137,cy-56,274,112,'gf-soft')+dog(w/2,cy-8,.45)+text(w/2,cy+35,'Beobachtetes Verhalten','gf-label');
  }else if(id==='ahnen'){
   h=m?530:450;const px=m?130:220,qx=w-px,py=m?282:245;
   s+=text(w/2,30,'Gemeinsamer Vorfahr','gf-heading')+allele(w/2,85,'a',.75);
   s+=arrow(w/2-22,132,px+10,py-90,'gf-dashed')+arrow(w/2+22,132,qx-10,py-90,'gf-dashed');
   s+=allele(px-22,py,'A',.75)+allele(px+22,py,'a',.75)+allele(qx-22,py,'A',.75)+allele(qx+22,py,'a',.75);
   s+=text(px,py-62,'Elternteil 1','gf-label')+text(qx,py-62,'Elternteil 2','gf-label');
   s+=arrow(px+25,py+38,w/2-24,h-92,'gf-accent')+arrow(qx+25,py+38,w/2+24,h-92,'gf-accent');
   s+=allele(w/2-24,h-48,'a',.65)+allele(w/2+24,h-48,'a',.65)+text(w/2-100,h-40,'möglich: aa','gf-label','end');
  }else if(id==='rezessiv'){
   h=m?480:320;
   [['AA','unbetroffen'],['Aa','Trägertier'],['aa','betroffen']].forEach(([pair,label],i)=>{const x=m?110:150+i*300,y=m?75+i*150:115;s+=allele(x-27,y,pair[0],m?.75:1)+allele(x+27,y,pair[1],m?.75:1);s+=text(m?240:x,m?y-7:220,pair,'gf-number',m?'start':'middle')+text(m?240:x,m?y+33:258,label,'gf-label',m?'start':'middle');});
  }else if(id==='marker'){
   h=m?470:330;const x=m?280:235,y=m?76:90,q=m?280:665,z=m?242:90;
   s+=box(x-190,y-58,380,116)+allele(x-110,y,'a',.65)+text(x+25,y-6,'Gentest','gf-heading')+text(x+25,y+30,'DNA-Variante','gf-label');
   s+=box(q-190,z-58,380,116)+`<path d="M${q-156} ${z}h22l10 -18l13 40l12 -22h24" class="gf-line gf-accent"/>`+text(q+25,z-6,'Untersuchung','gf-heading')+text(q+25,z+30,'Herzfunktion','gf-label');
   s+=arrow(x,y+72,w/2-70,h-67)+arrow(q,z+72,w/2+70,h-67);
   s+=text(w/2,h-25,'Risiko und Befund unterscheiden','gf-caption');
  }else if(id==='klinik'){
   h=m?470:330;const x=m?142:45,y=m?22:54,cell=38,gap=8;
   for(let i=0;i<24;i++){const cx=x+(i%6)*(cell+gap),cy=y+Math.floor(i/6)*(cell+gap);s+=`<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" rx="4" class="${i<10?'gf-fill':i<23?'gf-waffle':'gf-solid'}"/>`;if(i>=10&&i<23)s+=line(cx+8,cy+cell-8,cx+cell-8,cy+8,'gf-muted-stroke');}
   [['10','bei Rassehunden häufiger'],['13','kein Unterschied nachgewiesen'],['1','bei Mischlingen häufiger']].forEach(([n,label],i)=>{const lx=m?65:397,ly=m?262+i*72:91+i*76;s+=text(lx,ly,n,'gf-number','start')+text(lx+60,ly,label,'gf-label','start');});
  }else if(id==='fuchs'){
   h=m?490:330;
   [['Reaktionen testen','auf Menschen'],['Eltern auswählen','für die Weiterzucht'],['Nachkommen','erneut vergleichen']].forEach(([a,b],i)=>{const x=m?118:150+i*300,y=m?75+i*153:105;let stage=i===1?foxPair(x,y,.75):dog(i===0?x-35:x,y,.75,true);if(i<2)stage+=m?arrow(x,y+45,x,y+100):arrow(x+100,y,x+195,y);if(i===0)stage+=human(x+35,y,.66);stage+=text(m?256:x,m?y-5:215,a,'gf-heading',m?'start':'middle')+text(m?256:x,m?y+33:253,b,'gf-label',m?'start':'middle');s+=reveal(stage,i);});
  }else if(id==='debatte'){
   h=m?470:330;const y=m?158:114;
   s+=text(w/2,35,'Der Farmbestand hatte eine Vorgeschichte.','gf-caption');
   s+=box(m?30:35,y-40,m?500:395,110,'gf-soft')+text(m?280:232,y+3,'Veränderte Reaktionen','gf-heading')+text(m?280:232,y+38,'auf Menschen','gf-label');
   s+=box(m?30:470,m?y+130:y-40,m?500:395,110)+text(m?280:667,m?y+174:y+3,'Allgemeines Merkmalsbündel?','gf-heading')+text(m?280:667,m?y+209:y+38,'Die Reichweite ist umstritten.','gf-label');
   s+=text(w/2,h-23,'Befund und Verallgemeinerung trennen','gf-caption');
  }
  return `<svg class="gen-svg gen-svg-${m?'compact':'wide'}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(meta[id].alt)}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
 }
 function figure(id,{caption=true}={}){if(!meta[id])throw Error('Unbekannte Infografik: '+id);const d=meta[id];return`<figure class="gen-figure gf-${id}" data-infographic="${id}"><div class="gen-art">${draw(id,false)}${draw(id,true)}</div>${caption?`<figcaption><strong>${esc(d.title)}.</strong> ${esc(d.note)}</figcaption>`:''}</figure>`;}
 const reveal=(html,i=0)=>`<g class="gf-reveal" style="--step:${i}">${html}</g>`;
 function question(task){
  const render=m=>{const w=m?560:900,h=m?340:280;let s='',alt='';
   if(task.model==='cross'){
    const [a,b]=task.parents,x=m?115:210,z=w-x,y=m?112:107;
    s+=reveal(text(x,36,'Elternteil 1','gf-heading')+allele(x-26,y,a[0],.85)+allele(x+26,y,a[1],.85)+text(x,y+77,a,'gf-number'));
    s+=reveal(text(z,36,'Elternteil 2','gf-heading')+allele(z-26,y,b[0],.85)+allele(z+26,y,b[1],.85)+text(z,y+77,b,'gf-number'),1);
    s+=reveal(arrow(x+61,y,w/2-42,y,'gf-accent')+arrow(z-61,y,w/2+42,y,'gf-accent')+text(w/2,y+15,'?','gf-big'),2);
    s+=text(w/2,h-25,task.n?`${task.n} Nachkommen im Rechenmodell`:'Welche Kombinationen sind möglich?','gf-caption');
    alt=`Gegebene Eltern-Genotypen: ${a} und ${b}. ${task.n?task.n+' Nachkommen im Rechenmodell. ':''}Mögliche Nachkommen und Wahrscheinlichkeiten sind noch nicht eingetragen.`;
   }else if(task.model==='frequency'){
    ['AA','Aa','aa'].forEach((pair,i)=>{const x=m?96+i*184:150+i*300,y=m?105:93;s+=reveal(allele(x-23,y,pair[0],.75)+allele(x+23,y,pair[1],.75)+text(x,y+72,pair,'gf-heading')+text(x,y+122,`${task[pair]} Hunde`,'gf-number'),i);});
    s+=text(w/2,h-16,`Modellstichprobe: ${task.n} Hunde`,'gf-caption');
    alt=`Gegebene Modellstichprobe: ${task.AA} Hunde mit AA, ${task.Aa} mit Aa, ${task.aa} mit aa. Insgesamt ${task.n} Hunde. Der gesuchte Genkopienanteil ist nicht eingetragen.`;
   }else{
    const fox=/fox|domestication/.test(task.id),tree=/tree|bootstrap/.test(task.id),genes=/dna|allele|copies|regulation|polygenic|heterozygosity/.test(task.id),health=/dob|forty|health|carrier|outcross|mixed|dalmatian|inbreeding/.test(task.id),name=fox?'FoxFaceTail':tree?'GitFork':genes?'Dna':health?'HeartPulse':'Dog';
    s+=reveal(symbol(name,w*.3,h*.42,m?110:125));
    s+=reveal(arrow(w*.43,h*.42,w*.57,h*.42,'gf-accent')+text(w*.7,h*.42+25,'?','gf-big'),1);
    s+=text(w/2,h-26,'Beobachten · überlegen · begründen','gf-caption');
    alt='Symbolischer Einstieg zur Aufgabe: '+task.title+'. Die Frage bleibt offen; keine Lösung ist dargestellt.';
   }
   return`<svg class="gen-svg gen-svg-${m?'compact':'wide'}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(alt)}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
  };
  return`<figure class="gen-figure task-illustration" data-task-visual="${esc(task.id)}"><div class="gen-art">${render(false)}${render(true)}</div></figure>`;
 }
 return Object.freeze({figure,question,ids:Object.freeze(Object.keys(meta)),meta:Object.freeze(meta)});
});

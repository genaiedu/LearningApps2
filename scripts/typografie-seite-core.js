(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TypoPage=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const W=210*72/25.4,H=297*72/25.4,PHI=(1+Math.sqrt(5))/2;
  const colors={paper:'#fffaf0',ink:'#202823',red:'#a83424',blue:'#142f4f'};
  const sources=[
    ['Jan Tschichold and the New Typography · Bard Graduate Center','https://www.bgc.bard.edu/exhibitions/exhibitions/89/jan-tschichold-and-the-new'],
    ['Ellen Lupton · How Posters Work · Cooper Hewitt','https://www.cooperhewitt.org/2015/02/05/cooper-hewitt-to-present-special-exhibition-how-posters-work/'],
    ['W3C · Contrast Minimum','https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html'],
    ['W3C · Use of Color','https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html'],
    ['Buchner und Baumgartner 2007 · Text-background polarity','https://pubmed.ncbi.nlm.nih.gov/17510822/'],
    ['Josef Müller-Brockmann · Rastersysteme · Niggli','https://niggli.ch/en/products/rastersysteme-fur-die-visuelle-gestaltung']
  ];
  const studies=[
    {id:'01-leseseite',group:'richtung',mode:'normal',title:'Eine verlässliche Lesekante',note:'Der Titel gibt Orientierung; der Absatz bleibt waagerecht. Das ruhige Gegenstück macht die späteren Eingriffe vergleichbar.',task:'Welche Information findest du zuerst? Warum ist die Anfangskante des Absatzes nützlich?'},
    {id:'02-randklammer',group:'richtung',mode:'rail',title:'Eine thematische Randklammer',note:'Die um 90 Grad gedrehte Zeile rahmt den waagerechten Text. Farbe und Abstand verbinden die Teile, ohne den Absatz zu verdecken.',task:'Lies zuerst nur die Randzeile. Wie verändert sie deine Erwartung an den Text rechts?'},
    {id:'03-scherung',group:'richtung',mode:'skew',title:'Schräge Formen auf gerader Zeile',note:'Bei der Scherung bleibt die Grundlinie waagerecht; die Buchstaben werden geometrisch verzerrt. Das ist kein echter kursiver Schriftschnitt.',task:'Vergleiche mit Studie 04. Was geschieht mit der Grundlinie, was mit den einzelnen Buchstaben?'},
    {id:'04-drehung',group:'richtung',mode:'rotate',title:'Die ganze Zeile kippt',note:'Bei der Drehung kippen Grundlinie und Zeichen gemeinsam. Die Schriftform bleibt unverzerrt, aber ihre Leserichtung ändert sich.',task:'Drehst du den Kopf oder liest du mental gedreht? Das ist eine eigene Beobachtung, kein allgemeiner Wirkungsbeweis.'},
    {id:'05-diagonale',group:'richtung',mode:'diagonal',title:'Ein Plakat mit Bewegungsrichtung',note:'Titel und Band aktivieren die Diagonale. Termin und Ort bleiben ruhig und waagerecht: Aufmerksamkeit und Gebrauchsinformation haben verschiedene Aufgaben.',task:'Welche Teile darf man hier experimenteller setzen? Was muss auf einen Blick lesbar bleiben?'},
    {id:'06-banderole',group:'richtung',mode:'banner',title:'Ein Widerspruch über dem Text',note:'Die Banderole verdeckt absichtlich einen Teil eines erfundenen Werbetexts. Nicht dessen vollständige Lektüre, sondern die Zurückweisung ist die Hauptbotschaft.',task:'Was behauptet der verdeckte Text, was antwortet die Banderole? Wäre dieser Eingriff in eine Arbeitsanweisung vertretbar?'},
    {id:'07-positiv',group:'farbe',mode:'positive',title:'Dunkle Schrift auf hellem Grund',note:'Ein heller Grund und dunkle Buchstaben sind ein robuster Ausgangspunkt für längere Lesetexte. Schriftgrad und Maß bleiben wichtig.',task:'Vergleiche Titel und Absatz mit Studie 08. Was ist nur Stimmung, was verändert deine Lesearbeit?'},
    {id:'08-negativ',group:'farbe',mode:'negative',title:'Helle Schrift auf dunklem Grund',note:'Die gleiche Anordnung wirkt als Negativsatz anders. Für den kurzen Titel kann das passen; den längeren Absatz muss man unabhängig davon prüfen.',task:'Betrachte beide Polaritäten in normaler Größe. Ist der kräftige Titel leichter zu lesen als der kleine Absatz?'},
    {id:'09-farbige-schrift',group:'farbe',mode:'colored',title:'Farbe steckt in den Buchstaben',note:'Der Akzent betrifft nur den Titel. Der übrige Text bleibt neutral: eine begrenzte Auszeichnung, keine zweite Hintergrundfläche.',task:'Welche Wörter scheinen wichtig? Würde ein komplett farbiger Absatz dieselbe Hierarchie bewahren?'},
    {id:'10-farbfeld',group:'farbe',mode:'field',title:'Ein farbiges Feld wird zur Bühne',note:'Weiße Schrift steht in einem dunkelblauen Feld. Die Fläche gruppiert und unterbricht; sie wirkt auch dort, wo kein Buchstabe steht.',task:'Vergleiche mit Studie 09. Welche größere zusammengehörige Einheit entsteht durch die Fläche?'},
    {id:'11-farbkontrast-fehler',group:'farbe',mode:'bad',title:'Verschiedene Farben, zu ähnliche Helligkeit',note:'Dieses bewusste Gegenbeispiel verfehlt das Kontrastminimum. Deutlicher Farbunterschied ersetzt keine ausreichende Hell-Dunkel-Trennung.',task:'Betrachte die Graustufenansicht in der App. Warum hilft dir die zusätzliche Farbe nicht genug?'},
    {id:'12-farbe-auf-farbe',group:'farbe',mode:'good',title:'Farbe auf Farbe mit Helligkeitsabstand',note:'Dunkelblaue Buchstaben auf hellem warmem Grund zeigen die Ausnahme: zwei farbige Komponenten können lesbar sein, wenn ihre Helligkeiten weit genug auseinanderliegen.',task:'Vergleiche mit Studie 11. Formuliere die Regel ohne ein pauschales Verbot farbiger Hintergründe.'},
    {id:'13-mittelsymmetrie',group:'raum',mode:'center',title:'Eine gemeinsame Mittelachse',note:'Kurze Texte und großzügiger Raum können einen ruhigen, feierlichen Mittelpunkt bilden. Lange zentrierte Absätze sind nicht automatisch ebenso lesefreundlich.',task:'Wofür würdest du diese Anordnung wählen: Einladung, Sachbericht oder Aushang? Begründe mit der Leserführung.'},
    {id:'14-goldener-schnitt',group:'raum',mode:'golden',title:'Eine Teilung im Goldenen Schnitt',note:'Die Nutzfläche wird in einen großen und einen kleinen Bereich geteilt: ungefähr 61,8 zu 38,2 Prozent. Das ist ein Entwurfswerkzeug, kein Beweis für Schönheit.',task:'Miss die Nutzbreite, nicht die ganze Papierseite. Welche Inhalte verdienen den größeren Bereich?'},
    {id:'15-asymmetrie',group:'raum',mode:'asymmetric',title:'Ungleich verteilt, bewusst ausbalanciert',note:'Ein kräftiger Akzent links, ein Textblock rechts: geometrische Ungleichheit kann optisch im Gleichgewicht stehen. Ungeordnet ist das nicht.',task:'Verfolge die Kanten. Welche unsichtbaren Beziehungen halten die Seite zusammen?'},
    {id:'16-modulares-raster',group:'raum',mode:'grid',title:'Ein Raster für mehrere Aufgaben',note:'Spalten und wiederholte Kanten ordnen Titel, Haupttext und Termin. Das Raster ist die Hilfskonstruktion; es muss nicht mitgedruckt werden.',task:'Schalte die Hilfslinien ein. Welche Kanten werden geteilt, welche Bereiche bewusst zusammengefasst?'},
    {id:'17-optisches-gleichgewicht',group:'raum',mode:'optical',title:'Nicht alles wiegt gleich viel',note:'Eine große dunkle Fläche hat anderes visuelles Gewicht als mehrere feine Textzeilen. Optisches Gleichgewicht ist keine mathematische Massenberechnung.',task:'Warum muss der Textblock nicht exakt in der Mitte stehen, damit die Seite ausgeglichen wirken kann?'},
    {id:'18-freie-komposition',group:'raum',mode:'free',title:'Frei gesetzt, nicht zufällig',note:'Ein angeschnittener großer Titel und versetzte Information schaffen Spannung. Datum, Ort und Handlungsaufforderung bleiben vollständig erreichbar.',task:'Nenne eine Regel, die gebrochen wird, und eine, die hier bewusst erhalten bleibt.'}
  ];
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
  function gray(hex){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);const l=.2126*c[0]+.7152*c[1]+.0722*c[2];const s=l<=.0031308?12.92*l:1.055*l**(1/2.4)-.055;return '#'+Math.round(s*255).toString(16).padStart(2,'0').repeat(3);}
  function matrix(x,y,rotate=0,skew=0){const a=rotate*Math.PI/180,k=Math.tan(skew*Math.PI/180),c=Math.cos(a),s=Math.sin(a);return [c,s,c*k-s,s*k+c,x,y];}
  function scene(study,options={}){
    if(typeof study==='string')study=studies.find(s=>s.id===study||s.mode===study);
    if(!study)throw Error('Unbekannte Druckstudie');
    const mode=study.mode,ops=[];let bg=colors.paper,fg=colors.ink,accent=colors.red;
    if(mode==='negative'){bg=colors.ink;fg=colors.paper;accent='#efb28f';}
    if(mode==='bad'){bg='#249b65';fg='#d64545';accent=fg;}
    if(mode==='good'){bg='#f4dfad';fg=colors.blue;accent=fg;}
    if(options.foreground)fg=options.foreground;if(options.background)bg=options.background;
    const tx=(text,x,y,size=12,font='sans',color=fg,extra={})=>({kind:'text',text,x,y,size,font,color,...extra});
    const box=(x,y,w,h,color,extra={})=>({kind:'rect',x,y,w,h,color,...extra});
    const line=(x1,y1,x2,y2,color=accent,width=1,dash='')=>({kind:'line',x1,y1,x2,y2,color,width,dash});
    const lines=(texts,x,y,size=12,font='sans',color=fg,leading=19)=>texts.forEach((s,i)=>ops.push(tx(s,x,y+i*leading,size,font,color)));
    const label=()=>ops.push(tx('ATELIER / OFFENES GESPRÄCH',62,82,10,'sans',fg));
    const body=[
      'Eine gute Diskussion braucht mehr als starke Stimmen.',
      'Sie braucht Raum für Fragen, Pausen und Widerspruch.',
      'Wir nehmen uns einen Abend Zeit, um genauer hinzusehen.',
      'Wie verändert die Form das, was wir wahrnehmen?',
      'Und wann unterstützt sie das, was wir sagen wollen?'
    ];
    const event=(x=62,y=670)=>{lines(['Freitag, 23. Oktober · 19 Uhr','Atelier im Schulhaus','Eintritt frei · Komm ins Gespräch.'],x,y,12,'sans',fg,22);};
    ops.push(box(0,0,W,H,bg));
    if(['normal','rail','skew','rotate','diagonal','banner'].includes(mode)){
      label();let bx=62,bodyY=425;
      if(mode==='rail'){
        ops.push(box(28,140,58,510,accent));
        ops.push({kind:'group',matrix:matrix(68,616,-90),children:[tx('GESPRÄCHSKULTUR',0,0,27,'bold',colors.paper)]});bx=120;
        lines(['Haltung','zeigen.'],bx,236,47,'bold',fg,54);
      }else if(mode==='skew'||mode==='rotate'){
        const angle=Number.isFinite(options.angle)?options.angle:-14;
        const titleOps=[tx('Haltung zeigen.',0,0,48,'bold')];
        if(options.guides)titleOps.unshift(line(-12,0,360,0,'#737c74',.7,'4 4'));
        ops.push({kind:'group',matrix:matrix(70,295,mode==='rotate'?angle:0,mode==='skew'?-angle:0),children:titleOps});
        if(mode==='rotate')bodyY+=Math.max(0,Math.sin(angle*Math.PI/180)*160);
      }else if(mode==='diagonal'){
        ops.push({kind:'group',matrix:matrix(34,360,-14),children:[box(-60,-124,650,143,accent),tx('Haltung',8,-52,68,'bold',colors.paper),tx('zeigen.',8,8,68,'bold',colors.paper)]});
      }else if(mode==='banner'){
        lines(['MEHR IST','IMMER BESSER.'],62,212,47,'bold',fg,55);
        lines(['Wer auffallen will, macht einfach alles größer.', 'Jede Zeile bekommt eine Farbe. Jeder Satz wird fett.', 'Alles schreit gleichzeitig. Das kann nur richtig sein.'],62,350,13,'sans',fg,26);
        ops.push({kind:'group',matrix:matrix(18,365,-10),children:[box(-40,-57,660,95,accent),tx('LAUTER IST NICHT KLARER.',19,5,30,'bold',colors.paper)]});
        lines(['Ein erfundener Werbespruch wird zurückgewiesen.', 'Die Überdeckung ist hier selbst Teil der Aussage.'],62,512,13,'sans',fg,23);
      }else lines(['Haltung','zeigen.'],62,220,58,'bold',fg,66);
      if(mode!=='banner'){
        const short=mode==='rail'?['Eine gute Diskussion braucht','Raum für Fragen und Widerspruch.','Wir sehen genauer hin.','Was sagt die Form des Textes?']:body;
        lines(short,bx,mode==='diagonal'?505:bodyY,mode==='rail'?13:12,'sans',fg,23);
      }event(bx);
    }else if(['positive','negative','colored','field','bad','good'].includes(mode)){
      label();
      if(mode==='field'){ops.push(box(34,153,W-68,188,colors.blue));lines(['Raum für','Gedanken.'],62,229,55,'bold',colors.paper,64);}
      else lines(['Raum für','Gedanken.'],62,229,55,'bold',mode==='colored'?accent:fg,64);
      lines(body,62,430,12,'sans',fg,24);event();
    }else{
      const title=['Ein Abend','für Gedanken.'];
      if(mode==='center'){
        ops.push(tx('EINLADUNG',W/2,127,10,'sans',fg,{anchor:'middle'}));
        title.forEach((s,i)=>ops.push(tx(s,W/2,278+i*49,42,'serif',fg,{anchor:'middle'})));
        ['Wir nehmen uns Zeit für Fragen.', 'Für Pausen und für Widerspruch.', 'Wie verändert die Form unsere Wahrnehmung?'].forEach((s,i)=>ops.push(tx(s,W/2,456+i*25,13,'serif',fg,{anchor:'middle'})));
        ['Freitag, 23. Oktober · 19 Uhr','Atelier im Schulhaus','Eintritt frei · Komm ins Gespräch.'].forEach((s,i)=>ops.push(tx(s,W/2,662+i*23,12,'serif',fg,{anchor:'middle'})));
        if(options.guides)ops.push(line(W/2,60,W/2,H-60,'#6b776a',.65,'4 4'));
      }else if(mode==='golden'){
        label();const left=50,usable=W-100,split=left+usable/PHI;
        ops.push(box(split,142,W-split-50,562,'#eee1c5'));lines(['Ein Abend','für','Gedanken.'],left,253,39,'bold',fg,46);
        lines(['Eine gute Diskussion braucht Raum.', 'Für Fragen, Pausen und Widerspruch.', 'Wir sehen genauer hin.'],left,454,12,'sans',fg,23);
        lines(['23. Oktober','19 Uhr','Atelier im','Schulhaus','Eintritt frei'],split+17,251,12,'sans',fg,25);
        lines(['Komm ins Gespräch.'],left,690,13,'bold');
        if(options.guides){ops.push(line(split,105,split,735,accent,.8,'4 4'));ops.push(tx('61,8 %',left,738,10,'sans',accent),tx('38,2 %',split+12,738,10,'sans',accent));}
      }else if(mode==='asymmetric'){
        ops.push(box(35,155,62,342,accent));label();lines(['Ein Abend','für Gedanken.'],126,260,43,'bold',fg,52);lines(body.map(s=>s.replace('Eine gute Diskussion braucht mehr als starke Stimmen.','Eine gute Diskussion braucht Raum.').replace('Wir nehmen uns einen Abend Zeit, um genauer hinzusehen.','Wir sehen gemeinsam genauer hin.').replace('Wie verändert die Form das, was wir wahrnehmen?','Was verändert die Form?').replace('Und wann unterstützt sie das, was wir sagen wollen?','Wann unterstützt sie den Inhalt?')),126,425,12,'sans',fg,23);event(126);
        if(options.guides)ops.push(line(126,120,126,730,accent,.65,'4 4'));
      }else if(mode==='grid'){
        label();lines(['Ein Abend','für Gedanken.'],50,215,49,'bold',fg,57);
        ops.push(box(50,334,310,34,accent));ops.push(tx('OFFENES GESPRÄCH',64,357,12,'bold',colors.paper));
        lines(['Eine gute Diskussion braucht Raum.', 'Für Fragen, Pausen und Widerspruch.', 'Wir sehen gemeinsam genauer hin.', 'Was verändert die Form?', 'Wann unterstützt sie den Inhalt?'],50,432,13,'sans',fg,25);
        lines(['23. Oktober','19 Uhr','Atelier im','Schulhaus','Eintritt frei'],390,433,13,'sans',fg,25);lines(['Komm ins Gespräch.'],50,700,15,'bold');
        if(options.guides){for(const x of [50,205,360,390,545])ops.push(line(x,117,x,746,'#687a70',.65,'4 4'));for(const y of [120,320,390,590,750])ops.push(line(35,y,560,y,'#687a70',.65,'4 4'));}
      }else if(mode==='optical'){
        label();ops.push(box(39,220,153,300,colors.blue));lines(['Ein Abend','für Gedanken.'],227,275,30,'bold',fg,39);
        lines(['Eine gute Diskussion braucht Raum.', 'Für Fragen, Pausen und Widerspruch.', 'Was verändert die Form?', 'Wann unterstützt sie den Inhalt?'],227,437,12,'sans',fg,23);event(227);
        if(options.guides)ops.push(line(W/2,120,W/2,740,'#687a70',.65,'4 4'));
      }else if(mode==='free'){
        ops.push(tx('Gedanken.',-9,259,106,'bold',fg));ops.push(box(49,309,240,11,accent));
        lines(['Ein Abend für gute Fragen.'],53,397,25,'bold');lines(['Eine gute Diskussion braucht Raum.', 'Für Fragen, Pausen und Widerspruch.', 'Wir sehen gemeinsam genauer hin.'],160,495,13,'sans',fg,25);event(53,672);
        if(options.guides)ops.push(line(53,290,53,750,accent,.65,'4 4'),line(160,453,160,600,accent,.65,'4 4'));
      }
    }
    const mapColor=op=>{const n={...op};if(n.color)n.color=gray(n.color);if(n.children)n.children=n.children.map(mapColor);return n;};
    return {id:study.id,title:study.title,mode,width:W,height:H,foreground:fg,background:bg,ops:options.gray?ops.map(mapColor):ops};
  }
  function svg(page){
    const op=n=>{
      if(n.kind==='group')return '<g transform="matrix('+n.matrix.join(' ')+')">'+n.children.map(op).join('')+'</g>';
      if(n.kind==='rect')return `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="${n.color}"/>`;
      if(n.kind==='line')return `<line x1="${n.x1}" y1="${n.y1}" x2="${n.x2}" y2="${n.y2}" stroke="${n.color}" stroke-width="${n.width}"${n.dash?' stroke-dasharray="'+n.dash+'"':''}/>`;
      const family=n.font==='serif'?'Cardo':'Source Sans 3';
      return `<text x="${n.x}" y="${n.y}" font-family="${family}" font-weight="${n.font==='bold'?700:400}" font-size="${n.size}" fill="${n.color}"${n.anchor?' text-anchor="'+n.anchor+'"':''}>${esc(n.text)}</text>`;
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="210mm" height="297mm" role="img" aria-label="${esc(page.title)}"><title>${esc(page.title)}</title>${page.ops.map(op).join('')}</svg>`;
  }
  return {W,H,PHI,colors,sources,studies,gray,matrix,scene,svg,esc};
});

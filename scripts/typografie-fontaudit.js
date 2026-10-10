(function(root){
  'use strict';
  const labels={regular:'Regular',bold:'Fett',italic:'Kursiv',boldItalic:'Fettkursiv'};
  const count=(audit,test)=>audit.files.filter(test).length;
  const feature=(audit,test)=>count(audit,r=>r.features.some(test));
  const pairings={
    poppins:[['Source Sans 3','Poppins für Titel, Source Sans 3 für Erklärtexte'],['EB Garamond','Geometrischer Titel über einem literarischen Lesetext']],
    outfit:[['Libre Baskerville','Outfit für kurze Titel, Antiqua für den Lesetext'],['Source Sans 3','Outfit für Titel, humanistische Sans für längere Erklärungen']],
    bangers:[['Source Sans 3','Comic-Titel mit ruhigem Begleittext'],['Inter','Markanter Titel, sachliche Hinweise']],
    zillaslab:[['Source Sans 3','Slab-Überschrift, offene Sans für den Text'],['Inter','Kräftige Titel und nüchterne Beschriftung']],
    lora:[['Source Sans 3','Lora für Artikel, Sans für Orientierung'],['Inter','Lesetext und klar abgesetzte Daten oder Menüs']],
    montserrat:[['Libre Baskerville','Breiter Sans-Titel, Antiqua-Lesetext'],['Source Sans 3','Montserrat als Titelstimme, Sans für Erklärungen']],
    dmmono:[['Inter','Codeprobe und Benutzeroberfläche'],['Source Sans 3','Codeprobe und didaktische Erklärung']],
    oswald:[['Source Sans 3','Schmaler Titel, normalbreiter Erklärtext'],['EB Garamond','Plakative Überschrift, ruhige Buchschrift']],
    righteous:[['Source Sans 3','Kurzer Displaytitel, unaufdringlicher Begleittext'],['Inter','Displayakzent und sachliche Orientierung']],
    bebasneue:[['Source Sans 3','Versaltitel und klarer Fließtext'],['Libre Baskerville','Versaltitel über einem Antiqua-Lesetext']],
    dancingscript:[['EB Garamond','Persönliches Motto, ruhiger Einladungstext'],['Source Sans 3','Handschriftakzent und gut auffindbare Informationen']],
    dmsans:[['EB Garamond','Sachliche Orientierung neben einem literarischen Text'],['Libre Baskerville','Moderne Titel und klassischer Lesetext']],
    plusjakartasans:[['Libre Baskerville','Geometrischer Titel, Antiqua-Lesetext'],['Lora','Sachliche Kurztexte neben erzählender Antiqua']],
    forum:[['Source Sans 3','Eleganter Titel, robuste Sans für Details'],['Libre Baskerville','Kurzer Displaytitel und differenzierter Lesetext']],
    caveat:[['Source Sans 3','Handschriftliche Randnotiz, ruhiger Haupttext'],['EB Garamond','Persönliche Zeile neben sorgfältigem Buchsatz']],
    nunito:[['Libre Baskerville','Gerundete Sans für Hinweise, Antiqua für längere Texte'],['Lora','Freundliche Sans und erzählende Antiqua']],
    inter:[['EB Garamond','Menüs und Beschriftungen neben Buch- oder Essaytext'],['Libre Baskerville','Sachliche Titel, ruhiger Antiqua-Lesetext']],
    archivoblack:[['Source Sans 3','Schwere Überschrift, deutlich leichterer Lesetext'],['EB Garamond','Kräftiger Titel und ruhiger literarischer Text']],
    cardo:[['Source Sans 3','Buchtext und humanistische Orientierung'],['Inter','Antiqua-Lesetext und nüchterne Beschriftung']],
    ebgaramond:[['Source Sans 3','Literarischer Text und klare Orientierung'],['Inter','Ruhiger Buchtext, sachliche Menüs oder Daten']],
    librebodoni:[['Source Sans 3','Großer eleganter Titel, robuster Begleittext'],['Inter','Klassizistischer Titel und sachliche Details']],
    sourcesans3:[['EB Garamond','Erklärungen in Sans, literarische Passage in Antiqua'],['Libre Baskerville','Humanistische Orientierung und ruhiger Lesetext']],
    librebaskerville:[['Source Sans 3','Antiqua-Lesetext, klare Sans-Orientierung'],['Inter','Sorgfältiger Artikel und nüchterne Daten']],
    goudybookletter1911:[['Source Sans 3','Historisch geprägter Lesetext und klare Orientierung'],['Inter','Ruhige Antiqua, sachliche Angaben']],
    breeserif:[['Source Sans 3','Schreibbetonter Slab-Titel und offene Sans'],['Inter','Charaktervoller Titel und nüchterne Details']],
    robotoslab:[['Source Sans 3','Slab-Überschrift und humanistischer Erklärtext'],['Inter','Kräftige Slab-Akzente und sachliche Orientierung']],
    belleza:[['Source Sans 3','Kontrastreicher Titel und robuster Begleittext'],['EB Garamond','Eleganter Sans-Titel über einem literarischen Text']],
    limelight:[['Source Sans 3','Art-déco-Titel und ruhiger Lesetext'],['Inter','Kurzer Displayakzent und sachliche Informationen']],
    podkova:[['Source Sans 3','Kantiger Slab-Titel und offene Erklärung'],['Inter','Markanter Slab-Akzent und zurückhaltende Beschriftung']],
    abel:[['EB Garamond','Schmaler Sans-Titel und ruhiger Antiqua-Lesetext'],['Source Sans 3','Schmale Kurzbeschriftung, normalbreiter Erklärtext']]
  };
  function checks(font,audit){
    const total=audit.files.length, present=Object.keys(labels).filter(k=>audit.cuts[k]),missing=Object.keys(labels).filter(k=>!audit.cuts[k]);
    const axes=[...new Set(audit.files.flatMap(r=>Object.keys(r.axes)))];
    const alternatives=feature(audit,t=>t==='salt'||t==='aalt'||/^ss\d\d$|^cv\d\d$/.test(t));
    const ligatures=feature(audit,t=>t==='liga'||t==='clig');
    const extraWeights=audit.files.some(r=>r.weight[0]!==r.weight[1]||![400,700].includes(r.weight[0]));
    const optical=axes.includes('opsz')||(audit.opticalFiles||[]).some(r=>r.axes.opsz);
    return [
      {heading:'1 · Passt sie zum Vorhaben?',items:[
        {state:'manual',label:'Aufgabe und Wirkung',text:font.advice+' Die gewünschte Wirkung hängt vom Inhalt und den Lesenden ab.'},
        {state:'manual',label:'Lesbare Details',text:'I, l, 1 sowie O und 0 und einen echten Absatz vergleichen. Zeichenvorhandensein allein beweist keine Lesbarkeit.'}]},
      {heading:'2 · Wie vollständig ist der Entwurf hier?',items:[
        {state:audit.germanMissing?'warning':'pass',label:'Deutsche Basiszeichen',text:audit.germanMissing?'Warnung: Nicht in allen eingebundenen Dateien vorhanden: '+audit.germanMissing+'.':'Ä Ö Ü ä ö ü ß in allen '+total+' Archiv-Webdatei(en) nachgewiesen.'},
        {state:audit.optionalMissing?'partial':'pass',label:'Weitere deutsche Textzeichen',text:audit.optionalMissing?'Nicht durchgehend abgedeckt: '+audit.optionalMissing+'. Das große ẞ ist ein anderer Codepunkt als ß; andere Sprachen und Fachzeichen bitte gesondert prüfen.':'ẞ, €, deutsche Anführungszeichen und Gedankenstrich in allen Archivdateien vorhanden. Andere Sprachen und Fachzeichen bitte gesondert prüfen.'},
        {state:missing.length?'partial':'pass',label:'Basisschnitte',text:'Vorhanden: '+present.map(k=>labels[k]).join(', ')+'.'+(missing.length?' Nicht eingebunden: '+missing.map(k=>labels[k]).join(', ')+'. Kein Urteil über das vollständige Google-Fonts-Angebot.':' Alle vier Grundauszeichnungen sind echt verfügbar.')},
        {state:alternatives?'pass':'absent',label:'Alternative Zeichenformen',text:alternatives?alternatives+' von '+total+' Dateien enthalten passende OpenType-Tags. Verfügbarkeit am konkreten Zeichen prüfen.':'Keine entsprechenden OpenType-Tags im geprüften Bestand nachgewiesen.'},
        {state:ligatures?'pass':'absent',label:'Standardligaturen',text:ligatures?ligatures+' von '+total+' Dateien mit liga oder clig. Welche Paare sich verbinden, hängt auch von Sprache und Schnitt ab.':'Keine liga-/clig-Funktion in den geprüften Dateien nachgewiesen.'},
        {state:extraWeights||axes.includes('GRAD')?'pass':'absent',label:'Zusätzliche Gewichte / Grades',text:(axes.includes('wght')?'Variable wght-Achse vorhanden.':extraWeights?'Weitere statische Gewichte über Regular 400 und Fett 700 hinaus vorhanden; siehe Schnittmenü.':'Keine zusätzlichen Gewichte über die vorhandenen Basisschnitte hinaus eingebunden.')+(axes.includes('GRAD')?' Eine eigene GRAD-Achse ist vorhanden.':' Keine eigene GRAD-Achse nachgewiesen; Gewicht und Grade sind nicht dasselbe.')},
        {state:axes.includes('wdth')?'pass':'absent',label:'Mehrere Breiten',text:axes.includes('wdth')?'Variable wdth-Achse vorhanden.':'Keine variable Breitenachse in den Archivdateien. Nicht künstlich horizontal strecken.'},
        {state:optical?'pass':'absent',label:'Optische Größen',text:optical?(axes.includes('opsz')?'opsz-Achse in den Archivdateien.':'Echte opsz-Achse in der zusätzlichen lokalen Datei des Optik-Labors; nicht in den Archiv-Webdateien.'):'Keine opsz-Achse in diesen lokalen Dateien nachgewiesen.'}]},
      {heading:'3 · Sind die konkreten Dateien verlässlich?',items:[
        {state:'pass',label:'Dateinachweis',text:total+' lokale Archivdatei(en) direkt geprüft, mit SHA-256-Dateinachweisen. Die Aussagen gelten für diese Fassungen.'},
        {state:'manual',label:'Abstände und Kerning',text:count(audit,r=>r.kernTable||r.features.includes('kern'))+' von '+total+' Dateien mit Kerningdaten. Das prüft nicht die Qualität der Abstände; den Textrhythmus im Satzlabor beurteilen. Bei Monospace ist eine feste Laufweite beabsichtigt.'}]},
      {heading:'4 · Im konkreten Einsatz brauchbar?',items:[
        {state:'manual',label:'Passt zu …',text:'Die Vorschläge unten gelten für ein Schriftpaar und die genannte Aufgabenverteilung. Kontrast und Harmonie müssen an einer gemeinsamen Seite geprüft werden.'},
        {state:audit.licensePresent?'pass':'warning',label:'Lizenznachweis',text:audit.licensePresent?'Lokaler Lizenztext vorhanden: '+font.license+'. Die geplante Nutzung selbst anhand der Lizenz prüfen.':'Warnung: Lokaler Lizenztext nicht nachgewiesen.'}]}];
  }
  function attach(card,font,audit){
    const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const details=make('details','font-checklist'),summary=make('summary',null,'Checklistenprüfung & passende Partner');details.append(summary);
    if(!audit){details.append(make('p','font-audit-warning','Prüfdaten nicht verfügbar. Für diese Schrift werden keine bestandenen Prüfungen behauptet.'));card.append(details);return;}
    const warn=audit.germanMissing;if(warn)card.append(make('p','font-audit-warning','Warnung: Deutsche Basiszeichen fehlen im lokalen Bestand: '+warn));
    details.append(make('p','small','Geprüft werden unsere Archiv-Webdateien. ✓ Nachgewiesen · ◐ eingeschränkt · — nicht nachgewiesen · Prüfen: abhängig vom konkreten Text.'));
    const groups=make('div','font-audit-groups');
    for(const group of checks(font,audit)){
      const section=make('section','font-audit-group');section.append(make('h4',null,group.heading));const list=make('ul','font-audit-list');
      for(const item of group.items){const li=make('li','audit-'+item.state),prefix={pass:'✓ ',partial:'◐ ',absent:'— ',manual:'Prüfen: ',warning:'Warnung: '}[item.state];li.append(make('strong',null,prefix+item.label),make('p',null,item.text));list.append(li);}section.append(list);groups.append(section);
    }
    details.append(groups);
    details.append(make('h4',null,'Passt zu … · Gestaltungsvorschläge'));
    const pairs=make('ul','font-pair-list');for(const [name,role] of pairings[font.id]||[]){const li=make('li');li.append(make('strong',null,name),document.createTextNode(' · '+role));pairs.append(li);}details.append(pairs);
    const source=make('p','source-note','Prüfraster nach Elliot Jay Stocks: '),a=make('a');a.href='https://fonts.google.com/knowledge/choosing_type/a_checklist_for_choosing_type?preview.script=Latn';a.dataset.googleFont='Checkliste zur Schriftwahl';a.target='_blank';a.rel='noopener noreferrer';a.textContent='A checklist for choosing type · Google Fonts Knowledge ↗';source.append(a,document.createTextNode('. Eigene Messdaten und Gestaltungsvorschläge; keine automatische Qualitätsnote.'));details.append(source);card.append(details);
  }
  const api={checks,pairings,attach};if(typeof module==='object'&&module.exports)module.exports=api;else root.TypoFontAudit=api;
})(typeof globalThis!=='undefined'?globalThis:this);

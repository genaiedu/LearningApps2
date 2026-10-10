/* The same real HTML/CSS powers inline studies and editable offline downloads. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TypoWeb=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const studies=[
    ['01-leseartikel','Lesen vor Inszenierung','raum','Ein begrenzter Textblock, eine klare Überschrift und ein verlässlicher linker Zeilenanfang.','reading'],
    ['02-randklammer','Eine thematische Randklammer','richtung','Die um 90° gedrehte Randzeile wird bei wenig Platz zu einer waagerechten Kapitelmarke.','rail'],
    ['03-scherung','Buchstaben scheren','richtung','Die Grundlinie bleibt waagerecht. Geometrisch verzerrte Zeichen sind keine echte Kursive.','shear'],
    ['04-drehung','Eine ganze Zeile drehen','richtung','Zeichen und Grundlinie kippen gemeinsam; der Absatz bleibt ruhig.','rotate'],
    ['05-banderole','Eine Aussage zurückweisen','richtung','Die Banderole überdeckt einen erfundenen Werbetext; dessen Wortlaut bleibt separat erreichbar.','banner'],
    ['06-negativ','Hell auf Dunkel','farbe','Der dunkle Auftritt trägt eine Überschrift anders als einen langen Absatz.','dark'],
    ['07-farbige-schrift','Farbe am Zeichen','farbe','Eine farbige Überschrift auf neutralem Grund; der Lesetext bleibt dunkel.','colored'],
    ['08-farbfeld','Farbe als Fläche','farbe','Die helle Überschrift sitzt in einem dunklen Feld. Die Fläche bündelt statt nur zu markieren.','field'],
    ['09-kontrastfalle','Verschieden, aber kaum lesbar','farbe','Absichtlich schlechtes Rot-Grün-Paar. Prüfe die Helligkeit, nicht nur den Farbton.','bad'],
    ['10-mittelachse','Eine Mitte, zwei Satzarten','raum','Die Titelgruppe ist zentriert; der längere Absatz hat weiterhin einen festen linken Rand.','center'],
    ['11-goldene-teilung','Goldene Teilung, flexibler Text','raum','1,618:1 teilt die verfügbare Fläche auf großen Ansichten. Auf schmalen Ansichten folgt ein Stapel.','golden'],
    ['12-asymmetrisches-raster','Spannung durch Asymmetrie','raum','Ein markanter Titel, kleinere Informationen und ein ruhiger Absatz bekommen unterschiedliche Aufgaben.','grid']
  ].map(([id,title,group,note,mode])=>Object.freeze({id,title,group,note,mode}));
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,min,max,fallback)=>Math.min(max,Math.max(min,Number.isFinite(Number(n))?Number(n):fallback));
  function settings(options={}){return {size:clamp(options.size,16,30,19),leading:clamp(options.leading,1.2,2,1.65),measure:clamp(options.measure,38,85,64),angle:clamp(options.angle,-22,22,-12),space:!!options.space};}
  function find(id){return studies.find(s=>s.id===id)||studies[0];}
  const passage='<p>Ein Text ist mehr als die Summe seiner Wörter. Er bietet einen Weg durch Gedanken an. Wo beginnt dieser Weg? Welche Aussage steht im Mittelpunkt? Und wie viel Ruhe braucht ein Absatz, damit wir ihm folgen können?</p><p>Eine Überschrift darf den Blick anziehen. Der folgende Text muss diese Aufmerksamkeit nicht ständig neu erobern. Ein verlässlicher Rhythmus lässt den Inhalt hervortreten: klare Absätze, nachvollziehbare Zwischenüberschriften und Platz für eine Pause.</p>';
  function markup(id,options={}){
    const study=find(id),s=settings(options),mode=study.mode,infoID=String(options.uid||'wt').replace(/[^a-zA-Z0-9_-]/g,'')+'-info';
    let heading='<h2>Form gibt<br>Gedanken Raum.</h2>';
    if(mode==='shear'||mode==='rotate')heading='<div class="wt-title-zone"><h2 class="wt-'+mode+'">Haltung.</h2><i class="wt-baseline" aria-hidden="true"></i></div>';
    if(mode==='banner')heading='<h2>Mehr ist nicht<br>immer besser.</h2>';
    let body=passage;
    if(mode==='banner')body='<div class="wt-banner-zone"><p>Alles wird größer. Jeder Satz bekommt eine Farbe. Jede Zeile wird fett. Alles ruft gleichzeitig. Mehr ist immer besser. Wer übersehen wird, muss nur noch lauter werden.</p><div class="wt-banner">Lauter ist nicht klarer.</div></div><details class="wt-transcript"><summary>Den überdeckten Text vollständig lesen</summary><p>Alles wird größer. Jeder Satz bekommt eine Farbe. Jede Zeile wird fett. Alles ruft gleichzeitig. Mehr ist immer besser. Wer übersehen wird, muss nur noch lauter werden.</p></details>';
    const aside='<aside class="wt-aside"><h3>Der Anlass</h3><p>Ein offenes Gespräch über Form und Inhalt.</p><dl><dt>Wann</dt><dd>Freitag · 19 Uhr</dd><dt>Wo</dt><dd>Atelier im Schulhaus</dd></dl><a class="wt-link" href="#'+infoID+'">Informationen lesen ↓</a></aside>';
    const main='<div class="wt-main">'+heading+'<div class="wt-copy">'+body+'</div><footer id="'+infoID+'" class="wt-info"><p>Eigene Lehrstudie · kein echtes Veranstaltungsangebot</p></footer></div>';
    const rail=mode==='rail'?'<p class="wt-rail">FORM UND INHALT</p>':'';
    const warning=mode==='bad'?'<p class="wt-warning">Absichtliches Negativbeispiel: Der folgende Text hat zu wenig Helligkeitskontrast.</p>':'';
    const turnRoom=Math.ceil(Math.sin(Math.abs(s.angle)*Math.PI/180)*360);
    return '<div class="wt-root" style="--wt-size:'+s.size+'px;--wt-leading:'+s.leading+';--wt-measure:'+s.measure+'ch;--wt-angle:'+s.angle+'deg;--wt-turn-room:'+turnRoom+'px"><article class="wt-document wt-mode-'+mode+(s.space?' wt-spacing':'')+'">'+warning+'<header class="wt-mast"><span>ATELIER / DIGITALE STUDIE</span><span>'+escape(study.id.slice(0,2))+'</span></header>'+rail+'<div class="wt-composition">'+main+(['golden','grid'].includes(mode)?aside:'')+'</div></article></div>';
  }
  function standalone(id,css,fontCSS=''){
    const study=find(id);
    return '<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(study.title)+' · Typografie-Atelier</title><style>'+fontCSS+'\nbody{margin:0;background:#e8e7e2;color:#202823}*,*:before,*:after{box-sizing:border-box}.download-context{max-width:1050px;margin:0 auto;padding:24px;font:18px/1.6 "Source Sans 3",Arial,sans-serif}.download-context h1{font:600 28px/1.25 "Source Sans 3",Arial,sans-serif}.download-context summary{cursor:pointer}.download-stage{max-width:1050px;margin:auto;padding:0 12px 30px}'+css+'</style></head><body><header class="download-context"><h1>'+escape(study.title)+'</h1><p>'+escape(study.note)+'</p><p>Verkleinere das Browserfenster oder vergrößere den Text. Die Studie bleibt echtes, auswählbares HTML. Alle Fonts sind in dieser Datei eingebettet; keine Netzwerkverbindung und keine Skripte erforderlich.</p></header><main class="download-stage">'+markup(study.id)+'</main><footer class="download-context"><details><summary>Bearbeiten, prüfen und Quellen</summary><p>Öffne die Datei in einem Texteditor. Im style-Bereich stehen die Gestaltungsregeln; im article steht der Inhalt. Suche nach --wt-size, --wt-leading und --wt-measure. Die Container-Regeln ordnen schmale Ansichten neu. Prüfe nach Änderungen Kontrast, Umbruch und Bedienbarkeit. Die Vorlage ist keine vollständige WCAG-Zertifizierung.</p><p>Grundlagen: <a href="https://www.w3.org/WAI/WCAG22/Understanding/reflow.html">W3C: Reflow</a> · <a href="https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html">W3C: Kontrast</a> · <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform">MDN: Transformationen</a>. Externe Seiten werden nur geöffnet, wenn du einem Link folgst.</p></details></footer></body></html>\n';
  }
  return {studies,escape,settings,find,markup,standalone};
});

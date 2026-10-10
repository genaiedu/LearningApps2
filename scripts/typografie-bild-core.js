(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TypoImages=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const image='assets/typografie/atelier-landschaft.svg';
  const alt='Illustration einer Landschaft: links ein Haus, in der Mitte eine Person am Weg, rechts ein großer Baum.';
  const studies=[
    {id:'01-bild-im-satz',title:'Bild im Satz',mode:'inline',note:'Das Bild sitzt zwischen zwei Absätzen und bleibt mit seiner Bildunterschrift zusammen.'},
    {id:'02-bild-am-rand',title:'Bild in der Randspalte',mode:'margin',note:'Eine ergänzende Abbildung bleibt neben ihrem Bezugstext, ohne den Leseblock zu zerlegen.'},
    {id:'03-bild-als-auftakt',title:'Bild als Auftakt',mode:'opening',note:'Die große Abbildung eröffnet die Seite. Titel und Lesetext stehen auf einer ruhigen, eigenen Fläche.'}
  ];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function find(id){return studies.find(s=>s.id===id)||studies[0];}
  function figure(src=image){return '<figure class="gi-figure"><img src="'+esc(src)+'" width="1200" height="720" alt="'+alt+'"><figcaption><b>Abb. 1</b> Haus, Weg und Baum teilen die Landschaft in drei Bezugspunkte. Eigene Illustration des Typografie-Ateliers.</figcaption></figure>';}
  const before='<p>Ein Bild kann zeigen, was ein Absatz nur umständlich beschreiben würde. In dieser Landschaft geben Haus, Weg und Baum dem Blick unterschiedliche Ziele. Die Abbildung ist deshalb nicht einfach eine freie Stelle, die gefüllt werden muss.</p>';
  const after='<p>Der Text greift die Beobachtung auf: Das Haus liegt links, die Person folgt dem Weg, der Baum schließt den Raum rechts ab. Wenn wir einen Ausschnitt wählen, verändern wir diese Beziehung. Der Bildverweis verbindet Sehen und Lesen.</p><p>Die Bildunterschrift benennt nicht bloß „Landschaft“. Sie erklärt, worauf es in dieser Seite ankommt. Ihr Abstand zum Bild ist kleiner als ihr Abstand zum folgenden Absatz.</p>';
  function markup(id,src=image){const s=find(id),f=figure(src),heading='<header><span class="gi-kicker">ATELIER / BILD UND TEXT</span><h3>Sehen.<br><em>Und weiterdenken.</em></h3></header>';return '<article class="gi-page gi-'+s.mode+'">'+(s.mode==='opening'?f:'')+heading+'<div class="gi-layout"><div class="gi-copy">'+before+(s.mode==='inline'?f:'')+after+'</div>'+(s.mode==='margin'?f:'')+'</div><footer>Eigene Satzstudie · DIN A4 · '+esc(s.title)+'</footer></article>';}
  function crop(options={}){const fits=['contain','cover'],positions=['left','center','right'];return {fit:fits.includes(options.fit)?options.fit:'contain',position:positions.includes(options.position)?options.position:'center',width:[320,600,1000].includes(Number(options.width))?Number(options.width):1000};}
  return {image,alt,studies,esc,find,figure,markup,crop};
});

(function(root){
  'use strict';
  const empty='Keine überzeugenden Beispiele gefunden – möglicherweise gestalterisch wenig sinnvoll.';
  // This is an editorial comparison, not an exhaustive type classification.
  // The fourth dimension describes ONE stated terminal, never every glyph.
  const specimens={
    poppins:{name:'Poppins',glyph:'f',edge:[294,764,294,688],note:'Am freien oberen Ende des f steht die Kante senkrecht: quer zum hier annähernd waagerechten Auslauf.'},
    abel:{name:'Abel',glyph:'t',edge:[225,1270,348,1290],note:'Der obere Stammabschluss des t steigt leicht an. Der Unterschied ist subtil; unter der Lupe wird er deutlich.'},
    sourcesans3:{name:'Source Sans 3',glyph:'t',edge:[110,642.29337,178.933699,642.29337],note:'Das kleine t endet oben waagerecht. Eine humanistische Sans muss nicht an jeder Stelle schräge Enden haben.'},
    'sourcesans3-f':{name:'Source Sans 3',fontId:'sourcesans3',glyph:'f',edge:[318.686627,707.696332,300.590887,647.633492],note:'Am freien Kopf des f ist der Schnitt schräg. Dieselbe Familie steht deshalb auch in einem Feld der anderen Ebene.'},
    belleza:{name:'Belleza',glyph:'e',edge:[400,70,400,35],note:'Am unteren freien Ende des e ist die Kante senkrecht. Gemeint ist diese Stelle, nicht der gesamte Buchstabe.'},
    'belleza-t':{name:'Belleza',fontId:'belleza',glyph:'t',edge:[91,488,175,549],note:'Der obere Stamm des t endet deutlich schräg. Die Strichstärken wechseln, obwohl Serifen fehlen.'},
    limelight:{name:'Limelight',glyph:'t',edge:[191,1223,620,1415],note:'Der obere Stammabschluss des t ist schräg. Viele andere Enden dieser Art-déco-Schrift sind dagegen gerundet.'},
    breeserif:{name:'Bree Serif',glyph:'t',edge:[144,609,209,609],note:'Das kleine t trägt oben eine waagerechte Kante. Der schreibbetonte Rhythmus bleibt trotz des eher geringen Strichkontrasts sichtbar.'},
    robotoslab:{name:'Roboto Slab',glyph:'t',edge:[195,1343,392,1343],note:'Die obere Kante des t steht waagerecht zum senkrechten Stamm. Der eher mechanische Bauplan ist keine Aussage über die Fontdateitechnik.'},
    podkova:{name:'Podkova',glyph:'t',edge:[106,526,182,544],note:'Bei Podkova zeigt erst das t den schrägen oberen Stammabschluss. „Form“ ist die gemeinsame Gesamtprobe, aber kein Beleg für dieses Detail.'},
    ebgaramond:{name:'EB Garamond',glyph:'t',note:'Schreibgeprägte Antiqua mit deutlich wechselnden Strichstärken. Serifen, gerundete und auslaufende Formen lassen sich nicht sauber auf zwei Arten freier Enden reduzieren.'},
    librebodoni:{name:'Libre Bodoni',glyph:'t',note:'Starke Kontraste, aufrechte Betonung und feine Serifen. Kugelige und auslaufende Enden gehören nicht einfach in die Felder quer oder schräg.'}
  };
  const cells=[
    {id:'sans-static-low',serif:false,dynamic:false,contrast:false,base:'poppins',quer:'poppins',schraeg:'abel',comment:'Geometrische oder flachseitige Formen; annähernd gleichmäßige Strichstärken.'},
    {id:'sans-static-high',serif:false,dynamic:false,contrast:true,base:'limelight',quer:null,schraeg:'limelight',comment:'Eine geometrische Sans kann extreme Kontraste besitzen: Limelight ist eine Display-, keine neutrale Leseschrift.'},
    {id:'sans-dynamic-low',serif:false,dynamic:true,contrast:false,base:'sourcesans3',quer:'sourcesans3',schraeg:'sourcesans3-f',comment:'Offene humanistische Formen bei vergleichsweise wenig Strichkontrast. Hier zeigt dieselbe Familie beide Abschlussarten.'},
    {id:'sans-dynamic-high',serif:false,dynamic:true,contrast:true,base:'belleza',quer:'belleza',schraeg:'belleza-t',comment:'Belleza verbindet humanistische Formen mit deutlich wechselnden Strichstärken – ohne Serifen.'},
    {id:'serif-static-low',serif:true,dynamic:false,contrast:false,base:'robotoslab',quer:'robotoslab',schraeg:'podkova',comment:'Slab Serif: kräftige Serifen bei relativ gleichmäßigen Strichen. Podkova zeigt, dass ein schräges Detail auch in einem kantigen Bauplan vorkommt.'},
    {id:'serif-static-high',serif:true,dynamic:false,contrast:true,base:'librebodoni',quer:null,schraeg:null,comment:'Klassizistische Formen mit starker aufrechter Betonung. Ihre typischen Enden sind häufig Serifen, Kugeln oder feine Ausläufe, kein einfacher freier Schnitt.'},
    {id:'serif-dynamic-low',serif:true,dynamic:true,contrast:false,base:'breeserif',quer:'breeserif',schraeg:null,comment:'Bree Serif ist schreibbetont, aber vergleichsweise kontrastarm. Dynamik ist nicht dasselbe wie stark wechselnde Strichdicke.'},
    {id:'serif-dynamic-high',serif:true,dynamic:true,contrast:true,base:'ebgaramond',quer:null,schraeg:null,comment:'Renaissance-inspirierte Antiqua: Schreibduktus und deutlich wechselnde Strichstärken. Die Endformen sind vielfältiger als eine binäre Einteilung.'}
  ];
  const labels=c=>[c.serif?'Serif':'Sans Serif',c.dynamic?'dynamisch':'eher statisch',c.contrast?'deutlicher Kontrast':'geringer Kontrast'];
  const combination=(c,layer)=>labels(c).concat(layer==='quer'?'quer geschnitten':'schräg geschnitten').join(' · ');
  const fields=cells.flatMap(c=>['quer','schraeg'].map(layer=>({cell:c.id,layer,specimen:c[layer],label:combination(c,layer)})));
  function project(c,yaw,pitch){
    const x=c.serif?1:-1,y=c.contrast?-1:1,z=c.dynamic?1:-1;
    const a=x*Math.cos(yaw)+z*Math.sin(yaw),b=-x*Math.sin(yaw)+z*Math.cos(yaw);
    return {x:a,y:y*Math.cos(pitch)-b*Math.sin(pitch),z:y*Math.sin(pitch)+b*Math.cos(pitch)};
  }
  const adjacent=(a,b)=>['serif','dynamic','contrast'].filter(k=>a[k]!==b[k]).length===1;
  const normalize=n=>((n+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
  const api={empty,specimens,cells,fields,labels,combination,project,adjacent,normalize};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.Schriftenraum=api;
})(typeof globalThis!=='undefined'?globalThis:this);

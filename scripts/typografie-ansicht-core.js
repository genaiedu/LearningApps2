(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.TypoAppearance=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Chapter-related forms, not a random wallpaper. Sides alternate along the reading path.
  const chapters=[
    ['schriftformen','a','Cardo','Buchstabenformen'],
    ['details','&','Cardo','Ligaturen und Verbindungen'],
    ['lucide','i','Source Sans 3','Zeichen zur Orientierung'],
    ['mathematiksatz','π','Cardo','Mathematische Zeichen'],
    ['beginn','?','Cardo','Die Frage nach der Fontdatei'],
    ['lokal','§','Cardo','Verantwortlich einbinden'],
    ['katalog','g','Cardo','Die Vielfalt der Schriftformen'],
    ['satzlabor','¶','Cardo','Absatz und Satz'],
    ['buchsatz','B','Cardo','Buchsatz'],
    ['richtung','H','Source Sans 3','Richtung und Haltung'],
    ['komposition','K','Cardo','Komposition'],
    ['bild-und-text','B','Cardo','Bild und Text'],
    ['webtext','W','Source Sans 3','Worte am Bildschirm'],
    ['bildschirmformate','F','Source Sans 3','Fenster und Formate'],
    ['farbe','F','Cardo','Farbe und Fläche'],
    ['hintergrund','&','Cardo','Vordergrund und Hintergrund'],
    ['webgrafik','B','Cardo','Bilder im digitalen Raum'],
    ['herobereiche','H','Source Sans 3','Der Hero als Auftakt'],
    ['bewegte-grafik','M','Source Sans 3','Bewegung mit Aufgabe'],
    ['webwerkstatt','W','Source Sans 3','Die Bildschirmwerkstatt']
  ].map(([id,glyph,font,meaning],index)=>Object.freeze({id,glyph,font,meaning,side:index%2?'right':'left'}));
  function settings(o={}){return {theme:o.theme==='dark'?'dark':'light',glyphs:typeof o.glyphs==='boolean'?o.glyphs:true};}
  function shift(top,viewport,enabled=true){
    if(!enabled||!Number.isFinite(top)||!Number.isFinite(viewport))return 0;
    return Math.max(-140,Math.min(220,(viewport*.35-top)*.5));
  }
  return {chapters:Object.freeze(chapters),settings,shift};
});

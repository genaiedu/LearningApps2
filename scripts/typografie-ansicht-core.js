(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.TypoAppearance=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // These are reading palettes. Paper and color studies keep their own designed colors.
  const palettes=[
    {id:'atelier',name:'Papier & Wald',note:'Warmes Papier, Grün und Terrakotta.',
      light:{paper:'#f5f1e8',white:'#fffcf5',ink:'#202823',muted:'#56635b',red:'#a83424',line:'#c9c8ba',dark:'#18251f',cream:'#f4ead5',surface:'#eae6dc','page-mark':'#e3e0d7','button-bg':'#a83424','button-ink':'#ffffff','button-hover':'#862719','quote-bg':'#e2e8dd','quote-mark':'#718367','hero-bg':'#eeeee3'},
      dark:{paper:'#17241f',white:'#203229',ink:'#f0ece1',muted:'#bac5bb',red:'#eea38c',line:'#465c4e',dark:'#111d18',cream:'#f4ead5',surface:'#293a31','page-mark':'#2b3832','button-bg':'#d9957d','button-ink':'#17241f','button-hover':'#efb09a','quote-bg':'#304436','quote-mark':'#a2b393','hero-bg':'#1b2b23'}},
    {id:'slate',name:'Schieferblau',note:'Kühle Leseflächen und blaue Akzente.',
      light:{paper:'#eff3f7',white:'#fbfdff',ink:'#1c2c40',muted:'#4c6177',red:'#245a88',line:'#bdcbd8',dark:'#162538',cream:'#eef2f5',surface:'#e1e9f1','page-mark':'#dbe4ed','button-bg':'#245a88','button-ink':'#ffffff','button-hover':'#17466c','quote-bg':'#e0e8f1','quote-mark':'#647d98','hero-bg':'#e9eef5'},
      dark:{paper:'#182330',white:'#223242',ink:'#eaf0f6',muted:'#b6c5d5',red:'#9bc6ef',line:'#465b72',dark:'#101c28',cream:'#eaf0f6',surface:'#293c50','page-mark':'#2b3b4d','button-bg':'#9bc6ef','button-ink':'#152739','button-hover':'#c2ddf5','quote-bg':'#2c4157','quote-mark':'#abc6df','hero-bg':'#1c2c3c'}},
    {id:'plum',name:'Pflaume',note:'Rosiges Papier und tiefe violette Töne.',
      light:{paper:'#f5f0f4',white:'#fffafd',ink:'#362536',muted:'#6b546b',red:'#853e72',line:'#d3c2d0',dark:'#322131',cream:'#f7eaf1',surface:'#eae1e9','page-mark':'#e5dbe4','button-bg':'#853e72','button-ink':'#ffffff','button-hover':'#6d2b5c','quote-bg':'#e9dfe8','quote-mark':'#987191','hero-bg':'#f0e8ef'},
      dark:{paper:'#291e2b',white:'#37283a',ink:'#f3eaf2',muted:'#c9b8c8',red:'#e5aed2',line:'#655068',dark:'#1e1420',cream:'#f3eaf2',surface:'#423047','page-mark':'#3f3142','button-bg':'#e5aed2','button-ink':'#2f1c2b','button-hover':'#f4cbe8','quote-bg':'#47314b','quote-mark':'#cda4c5','hero-bg':'#302234'}},
    {id:'graphite',name:'Graphit',note:'Zurückhaltende Grautöne, klare Gewichtung.',
      light:{paper:'#f2f2f0',white:'#fcfcfa',ink:'#2c2d2c',muted:'#5d615e',red:'#494f4b',line:'#c6ccc5',dark:'#232624',cream:'#f2f2ed',surface:'#e5e6e2','page-mark':'#dedfda','button-bg':'#494f4b','button-ink':'#ffffff','button-hover':'#333735','quote-bg':'#e2e4df','quote-mark':'#7b837a','hero-bg':'#edede8'},
      dark:{paper:'#242626',white:'#303333',ink:'#f1f2ee',muted:'#c2c7c1',red:'#c8cec5',line:'#555d55',dark:'#181b18',cream:'#f1f2ee',surface:'#393e39','page-mark':'#373c37','button-bg':'#c8cec5','button-ink':'#242824','button-hover':'#e0e4dc','quote-bg':'#3c443c','quote-mark':'#b9c2b6','hero-bg':'#2a2e2a'}}
  ].map(p=>Object.freeze({...p,light:Object.freeze(p.light),dark:Object.freeze(p.dark)}));
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
  const positions=Object.freeze([
    {id:'alternating',name:'Abwechselnd links / rechts'},
    {id:'left',name:'Links'},
    {id:'right',name:'Rechts'},
    {id:'center',name:'Mittig'}
  ].map(Object.freeze));
  function bounded(value,min,max,fallback){
    const n=typeof value==='number'||typeof value==='string'&&value.trim()?Number(value):NaN;
    return Number.isFinite(n)?Math.round(Math.max(min,Math.min(max,n))):fallback;
  }
  function settings(o={}){
    if(!o||typeof o!=='object')o={};
    return {palette:palettes.some(p=>p.id===o.palette)?o.palette:'atelier',theme:o.theme==='dark'?'dark':'light',glyphs:typeof o.glyphs==='boolean'?o.glyphs:true,
      glyphPosition:positions.some(p=>p.id===o.glyphPosition)?o.glyphPosition:'alternating',glyphInset:bounded(o.glyphInset,0,40,5),glyphHeight:bounded(o.glyphHeight,10,90,34)};
  }
  function placement(chapterSide,o={}){
    const s=settings(o),side=s.glyphPosition==='alternating'?(chapterSide==='right'?'right':'left'):s.glyphPosition;
    return {side,x:side==='center'?50:side==='right'?100-s.glyphInset:s.glyphInset,y:s.glyphHeight};
  }
  function shift(top,viewport,enabled=true){
    if(!enabled||!Number.isFinite(top)||!Number.isFinite(viewport))return 0;
    return Math.max(-140,Math.min(220,(viewport*.35-top)*.5));
  }
  return {palettes:Object.freeze(palettes),chapters:Object.freeze(chapters),positions,settings,placement,shift};
});

(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.TypoAppearance=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // These are reading palettes. Paper and color studies keep their own designed colors.
  // The legacy key "red" is the accent: a contrasting hue, not a shade of the base palette.
  const palettes=[
    {id:'atelier',name:'Papier & Wald',note:'Warmes Papier, Grün und Terrakotta.',
      light:{paper:'#f5f1e8',white:'#fffcf5',ink:'#202823',muted:'#56635b',red:'#a83424',line:'#c9c8ba',dark:'#18251f',cream:'#f4ead5',surface:'#eae6dc','page-mark':'#e3e0d7','button-bg':'#a83424','button-ink':'#ffffff','button-hover':'#862719','quote-bg':'#e2e8dd','quote-mark':'#718367','hero-bg':'#eeeee3'},
      dark:{paper:'#17241f',white:'#203229',ink:'#f0ece1',muted:'#bac5bb',red:'#eea38c',line:'#465c4e',dark:'#111d18',cream:'#f4ead5',surface:'#293a31','page-mark':'#2b3832','button-bg':'#d9957d','button-ink':'#17241f','button-hover':'#efb09a','quote-bg':'#304436','quote-mark':'#a2b393','hero-bg':'#1b2b23'}},
    {id:'slate',name:'Schieferblau',note:'Kühle blaue Leseflächen mit warmem Kupfer als Akzent.',
      light:{paper:'#eff3f7',white:'#fbfdff',ink:'#1c2c40',muted:'#4c6177',red:'#a53e16',line:'#bdcbd8',dark:'#162538',cream:'#eef2f5',surface:'#e1e9f1','page-mark':'#dbe4ed','button-bg':'#a53e16','button-ink':'#ffffff','button-hover':'#82300e','quote-bg':'#e0e8f1','quote-mark':'#647d98','hero-bg':'#e9eef5'},
      dark:{paper:'#182330',white:'#223242',ink:'#eaf0f6',muted:'#b6c5d5',red:'#f2b28c',line:'#465b72',dark:'#101c28',cream:'#eaf0f6',surface:'#293c50','page-mark':'#2b3b4d','button-bg':'#f2b28c','button-ink':'#152739','button-hover':'#ffcbae','quote-bg':'#2c4157','quote-mark':'#abc6df','hero-bg':'#1c2c3c'}},
    {id:'plum',name:'Pflaume',note:'Rosiges Papier und violette Töne mit smaragdgrünem Akzent.',
      light:{paper:'#f5f0f4',white:'#fffafd',ink:'#362536',muted:'#6b546b',red:'#216640',line:'#d3c2d0',dark:'#322131',cream:'#f7eaf1',surface:'#eae1e9','page-mark':'#e5dbe4','button-bg':'#216640','button-ink':'#ffffff','button-hover':'#164d2e','quote-bg':'#e9dfe8','quote-mark':'#987191','hero-bg':'#f0e8ef'},
      dark:{paper:'#291e2b',white:'#37283a',ink:'#f3eaf2',muted:'#c9b8c8',red:'#91d3ad',line:'#655068',dark:'#1e1420',cream:'#f3eaf2',surface:'#423047','page-mark':'#3f3142','button-bg':'#91d3ad','button-ink':'#2f1c2b','button-hover':'#b1e8c9','quote-bg':'#47314b','quote-mark':'#cda4c5','hero-bg':'#302234'}},
    {id:'graphite',name:'Graphit',note:'Zurückhaltende Grautöne mit kräftigem Blau als Akzent.',
      light:{paper:'#f2f2f0',white:'#fcfcfa',ink:'#2c2d2c',muted:'#5d615e',red:'#245ca8',line:'#c6ccc5',dark:'#232624',cream:'#f2f2ed',surface:'#e5e6e2','page-mark':'#dedfda','button-bg':'#245ca8','button-ink':'#ffffff','button-hover':'#19467f','quote-bg':'#e2e4df','quote-mark':'#7b837a','hero-bg':'#edede8'},
      dark:{paper:'#242626',white:'#303333',ink:'#f1f2ee',muted:'#c2c7c1',red:'#9dc7fa',line:'#555d55',dark:'#181b18',cream:'#f1f2ee',surface:'#393e39','page-mark':'#373c37','button-bg':'#9dc7fa','button-ink':'#242824','button-hover':'#c0dcff','quote-bg':'#3c443c','quote-mark':'#b9c2b6','hero-bg':'#2a2e2a'}},
    {id:'bordeaux',name:'Bordeaux',note:'Die Grautöne von Graphit mit dem Bordeauxrot des Schullogos als Akzent.',
      light:{paper:'#f2f2f0',white:'#fcfcfa',ink:'#2c2d2c',muted:'#5d615e',red:'#94001c',line:'#c6ccc5',dark:'#232624',cream:'#f2f2ed',surface:'#e5e6e2','page-mark':'#dedfda','button-bg':'#94001c','button-ink':'#ffffff','button-hover':'#760016','quote-bg':'#e2e4df','quote-mark':'#7b837a','hero-bg':'#edede8'},
      dark:{paper:'#242626',white:'#303333',ink:'#f1f2ee',muted:'#c2c7c1',red:'#f1a8b6',line:'#555d55',dark:'#181b18',cream:'#f1f2ee',surface:'#393e39','page-mark':'#373c37','button-bg':'#f1a8b6','button-ink':'#242824','button-hover':'#f7c4ce','quote-bg':'#3c443c','quote-mark':'#b9c2b6','hero-bg':'#2a2e2a'}}
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
  // Only these locally hosted reading fonts can be selected. Named lesson specimens stay fixed.
  const readingFonts=Object.freeze({
    sans:Object.freeze([
      {id:'firasans',name:'Fira Sans',stack:'"Fira Sans",Arial,sans-serif'},
      {id:'sourcesans3',name:'Source Sans 3',stack:'"Source Sans 3",Arial,sans-serif'}
    ].map(Object.freeze)),
    serif:Object.freeze([
      {id:'original',name:'EB Garamond / Cardo',stack:'"EB Garamond",Georgia,serif',editorialStack:'Cardo,Georgia,serif'},
      {id:'librebaskerville',name:'Libre Baskerville',stack:'"Libre Baskerville",Georgia,serif',editorialStack:'"Libre Baskerville",Georgia,serif'}
    ].map(Object.freeze))
  });
  function bounded(value,min,max,fallback){
    const n=typeof value==='number'||typeof value==='string'&&value.trim()?Number(value):NaN;
    return Number.isFinite(n)?Math.round(Math.max(min,Math.min(max,n))):fallback;
  }
  function settings(o={}){
    if(!o||typeof o!=='object')o={};
    return {palette:palettes.some(p=>p.id===o.palette)?o.palette:'graphite',theme:o.theme==='dark'?'dark':'light',glyphs:typeof o.glyphs==='boolean'?o.glyphs:true,readingAlignment:o.readingAlignment==='justify'?'justify':'left',
      sansFont:readingFonts.sans.some(f=>f.id===o.sansFont)?o.sansFont:'firasans',serifFont:readingFonts.serif.some(f=>f.id===o.serifFont)?o.serifFont:'original',
      glyphPosition:positions.some(p=>p.id===o.glyphPosition)?o.glyphPosition:'alternating',glyphInset:bounded(o.glyphInset,0,40,5),glyphHeight:bounded(o.glyphHeight,10,90,34)};
  }
  function fontPair(o={}){
    const s=settings(o);
    return {sans:readingFonts.sans.find(f=>f.id===s.sansFont),serif:readingFonts.serif.find(f=>f.id===s.serifFont)};
  }
  function placement(chapterSide,o={}){
    const s=settings(o),side=s.glyphPosition==='alternating'?(chapterSide==='right'?'right':'left'):s.glyphPosition;
    return {side,x:side==='center'?50:side==='right'?100-s.glyphInset:s.glyphInset,y:s.glyphHeight};
  }
  function shift(top,viewport,enabled=true){
    if(!enabled||!Number.isFinite(top)||!Number.isFinite(viewport))return 0;
    return Math.max(-140,Math.min(220,(viewport*.35-top)*.5));
  }
  return {palettes:Object.freeze(palettes),chapters:Object.freeze(chapters),positions,readingFonts,settings,fontPair,placement,shift};
});

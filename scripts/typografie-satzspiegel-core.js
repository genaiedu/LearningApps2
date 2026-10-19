/* Geometric targets, not a reimplementation of KOMA-Script's font-aware typearea. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TypoSatzspiegel=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{'use strict';
 const formats={book:{label:'Buch · 15 × 22,5 cm',width:150,height:225},a5:{label:'DIN A5 · 14,8 × 21 cm',width:148,height:210},a4:{label:'DIN A4 · 21 × 29,7 cm',width:210,height:297}};
 const presets={
  classic:{divisions:9,label:'Neunerteilung · van de Graaf / Tschichold',note:'Breite und Höhe in neun Teile; innen und oben ein Teil, außen und unten zwei. Der Textblock hat dieselbe Proportion wie die Seite.'},
  raster10:{divisions:10,label:'Zehnerteilung · Teilungskanon',note:'Derselbe Teilungsgedanke mit zehn statt neun Einheiten: etwas mehr Textfläche, weiterhin doppelte Außen- und Fußränder. Kein eigenständiger historischer Epochenkanon.'},
  raster12:{divisions:12,label:'Zwölferteilung · kompakter Teilungskanon',note:'Breite und Höhe in zwölf Teile; innen und oben ein Teil, außen und unten zwei. Das Schriftfeld belegt je drei Viertel der Seitenbreite und -höhe: weniger Weißraum bei gleicher Seitenproportion und denselben Randverhältnissen. Geometrische Grundlage wie bei KOMA-Script DIV=12, keine Nachbildung der Humboldt-Originalseite. Schriftgrad und Zeilenlänge weiterhin prüfen.'},
  circle:{label:'Kreiskonstruktion · Satzhöhe = Seitenbreite',note:'Der Textblock behält die Seitenproportion; seine Höhe entspricht der Seitenbreite. Die verbleibenden Ränder werden innen : außen und oben : unten jeweils 1 : 2 geteilt.'}
 };
 const format=id=>Object.hasOwn(formats,id)?id:'book',preset=id=>Object.hasOwn(presets,id)?id:(id==='balanced'||id==='compact'?'raster10':'classic');
 const pageMode=id=>['single','single-asymmetric'].includes(id)?id:'spread';
 function geometry(formatId='book',presetId='classic',mode='spread'){const f=formats[format(formatId)];return dimensions(f.width,f.height,presetId,mode);}
 function dimensions(width,height,id='classic',mode='spread'){if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=width)throw new RangeError('Hochformat mit positiven Maßen erforderlich.');id=preset(id);const n=presets[id].divisions||9,textHeight=id==='circle'?width:height*(n-3)/n,textWidth=id==='circle'?width*width/height:width*(n-3)/n,inner=(width-textWidth)/3,top=(height-textHeight)/3,g={id,width,height,inner,outer:2*inner,top,bottom:2*top,textWidth,textHeight};mode=pageMode(mode);if(mode!=='spread'){g.mode=mode;if(mode==='single')g.inner=g.outer=(width-textWidth)/2;}return g;}
 function choices(formatId){const same=Math.abs(geometry(formatId,'classic').textHeight-geometry(formatId,'circle').textHeight)<1e-7;return Object.entries(presets).filter(([id])=>!same||id!=='circle').map(([id,p])=>({id,label:p.label+(same&&id==='classic'?' · auch Kreiskonstruktion':''),note:p.note+(same&&id==='classic'?' Beim Format 2 : 3 ist die Kreiskonstruktion geometrisch identisch und wird deshalb nicht doppelt angeboten.':'')}));}
 const cm=mm=>(mm/10).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
 const coverage=g=>100*g.textWidth*g.textHeight/(g.width*g.height);
 const coverageLabel=g=>coverage(g).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1})+' %';
 function description(g){return (g.mode?'Links ':'Innen ')+cm(g.inner)+(g.mode?' · rechts ':' · außen ')+cm(g.outer)+' · oben '+cm(g.top)+' · unten '+cm(g.bottom)+' cm. Textblock '+cm(g.textWidth)+' × '+cm(g.textHeight)+' cm. Rechteckiges Schriftfeld: '+coverageLabel(g)+' der Papierfläche, nicht der Anteil bedruckter schwarzer Fläche.';}
 return {formats,presets,format,preset,pageMode,geometry,dimensions,choices,cm,description,coverage,coverageLabel};
});

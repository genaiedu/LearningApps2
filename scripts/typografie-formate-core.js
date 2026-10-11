(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TypoFormats=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const devices=[
    {id:'desktop',name:'PC / Mac · Querformat',width:1440,height:900,rotatable:false,note:'Viel Breite erlaubt ein Nebeneinander. Der Lesetext muss trotzdem eine begrenzte Zeilenlänge behalten. Der nächste Abschnitt sollte nicht hinter einem unnötig hohen Einstieg verschwinden.'},
    {id:'portrait',name:'Großer Monitor · Hochkant',width:900,height:1440,rotatable:false,note:'Der große Bildschirm ist schmaler, aber sehr hoch. Mehr Inhalt wird gleichzeitig sichtbar; aus der Höhe folgt jedoch kein Anspruch auf längere Zeilen oder ein riesiges Motiv.'},
    {id:'tablet',name:'iPad / Tablet',width:768,height:1024,rotatable:true,note:'Ein Tablet liegt zwischen den Extremen. Drehen verändert die Anordnung und den ersten sichtbaren Ausschnitt. Auch geteilte Browserfenster können deutlich schmaler sein.'},
    {id:'phone',name:'Handy',width:390,height:844,rotatable:true,note:'Eine schmale Spalte braucht neue Zeilenumbrüche, zugängliche Bedienelemente und eine sinnvolle Reihenfolge. Im Querformat wird die Höhe knapp; ein fest angehefteter Kopf darf nicht den Leseraum besetzen.'}
  ];
  const scenes=[['start','Auftakt dieser Seite'],['teil-zeichen','Teil I · Zeichen'],['teil-papier','Teil II · Gedruckte Seite'],['teil-bildschirm','Teil III · Bildschirm'],['webgrafik','Bild und Text am Bildschirm'],['herobereiche','Drei Hero-Entwürfe'],['hintergrund','Zeichen im Hintergrund'],['steuerung-vergleichen','Leisten und Seitenmenüs']];
  function settings(o={}){const device=devices.find(d=>d.id===o.device)||devices[0];return {device:device.id,rotated:device.rotatable&&o.rotated===true,scene:scenes.some(s=>s[0]===o.scene)?o.scene:'start',view:o.view==='actual'?'actual':'fit'};}
  function dimensions(o={}){const s=settings(o),d=devices.find(d=>d.id===s.device);return {...d,width:s.rotated?d.height:d.width,height:s.rotated?d.width:d.height};}
  function scale(o,width,height){const d=dimensions(o),safe=(v,f)=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):f;return settings(o).view==='actual'?1:Math.min(1,safe(width,960)/d.width,safe(height,650)/d.height);}
  return {devices,scenes,settings,dimensions,scale};
});

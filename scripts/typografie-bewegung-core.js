/* A deterministic composition score. No browser, fonts or network needed. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TypoMotion=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const duration=24;
  const scenes=[
    {at:0,hold:2,title:'01 / MATERIAL',note:'Alle Teile sind vorhanden, aber sie konkurrieren. Wechselnde Richtungen und ungeklärte Abstände geben dem Blick keinen verlässlichen Weg.',
      paper:[40,20,880,580],words:[[130,170,-12,105],[520,260,16,110],[125,475,-7,100]],kicker:[405,105,9],copy:[430,422,10],action:[610,495,-8],color:[600,150,248,380],amp:[540,457,-14,370],guides:0,annotation:0,camera:[0,0,960,620]},
    {at:6,hold:2,title:'02 / ORDNEN',note:'Die Wörter bekommen eine gemeinsame Kante. Abstand trennt Titel, Erklärung und Handlung. Das große Et-Zeichen antwortet auf den Text, statt eine weitere Überschrift zu spielen.',
      paper:[40,20,880,580],words:[[94,175,0,90],[94,275,0,90],[94,375,0,90]],kicker:[94,80,0],copy:[94,450,0],action:[94,541,0],color:[555,106,294,430],amp:[550,443,0,380],guides:.5,annotation:0,camera:[60,0,620,620]},
    {at:12,hold:3,title:'03 / GEWICHTEN',note:'Mehr freier Raum, etwas kleinere Titel und eine eigenständige Motivfläche: Text und Zeichen spielen unterschiedliche Rollen. Die Erklärung ist kein zweiter Blickfang.',
      paper:[40,20,880,580],words:[[110,175,0,80],[110,266,0,80],[110,357,0,80]],kicker:[110,80,0],copy:[110,425,0],action:[110,541,0],color:[555,70,320,486],amp:[570,421,0,350],guides:.2,annotation:0,camera:[60,0,850,620]},
    {at:20,hold:4,title:'04 / NEU UMBRECHEN',note:'Der Raum wird schmal. Die Titel werden neu abgestimmt, das Zeichen tritt als Anschnitt hinter die Aussage. Absatz und Handlungsfläche behalten ihren eigenen Platz. Nicht alles wird gemeinsam kleiner.',
      paper:[305,20,350,580],words:[[335,145,0,56],[335,214,0,56],[335,283,0,56]],kicker:[335,70,0],copy:[335,363,0],action:[335,530,0],color:[555,100,110,216],amp:[495,306,0,235],guides:0,annotation:1,camera:[280,0,400,620]}
  ];
  function time(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(duration,n)):0;}
  function ease(t){return t*t*(3-2*t);}
  function mix(a,b,t){return Array.isArray(a)?a.map((n,i)=>mix(n,b[i],t)):a+(b-a)*t;}
  function frame(value,narrow=false){
    const seconds=time(value);let index=0;
    for(let i=1;i<scenes.length;i++)if(seconds>=scenes[i].at)index=i;
    const a=scenes[index],b=scenes[Math.min(index+1,scenes.length-1)];
    const fraction=b===a?0:ease(Math.max(0,Math.min(1,(seconds-a.at-a.hold)/(b.at-a.at-a.hold))));
    const out={seconds,index,title:a.title,note:a.note};
    for(const key of ['paper','words','kicker','copy','action','color','amp','guides','annotation'])out[key]=mix(a[key],b[key],fraction);
    out.camera=narrow?mix(a.camera,b.camera,fraction):[0,0,960,620];
    return out;
  }
  function advance(value,elapsed){
    // Suspension must not skip the score; the browser resets its clock too.
    const delta=Number(elapsed);
    return time(time(value)+(Number.isFinite(delta)?Math.max(0,Math.min(.12,delta)):0));
  }
  function running(o){return Boolean(o.requested&&!o.reduced&&!o.paused&&o.visible&&!o.hidden&&time(o.time)<duration);}
  return {duration,scenes,time,frame,advance,running};
});

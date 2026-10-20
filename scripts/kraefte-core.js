/* Kräfte-Labor · Rechenmodell und Aufgaben. Keine Netzwerkzugriffe. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.KraefteCore=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const G=9.81, SINGLE_D=5, VERSION=1;
  const units={
    force:[['N',1,'\\mathrm N'],['mN',1e-3,'\\mathrm{mN}'],['kN',1e3,'\\mathrm{kN}'],['µN',1e-6,'\\mathrm{\\mu N}']],
    mass:[['kg',1,'\\mathrm{kg}'],['g',1e-3,'\\mathrm g'],['mg',1e-6,'\\mathrm{mg}'],['t',1e3,'\\mathrm t']],
    length:[['m',1,'\\mathrm m'],['cm',1e-2,'\\mathrm{cm}'],['mm',1e-3,'\\mathrm{mm}'],['µm',1e-6,'\\mathrm{\\mu m}'],['km',1e3,'\\mathrm{km}']],
    spring:[['N/m',1,'\\mathrm{N/m}'],['mN/m',1e-3,'\\mathrm{mN/m}'],['kN/m',1e3,'\\mathrm{kN/m}'],['N/cm',100,'\\mathrm{N/cm}']],
    accel:[['m/s²',1,'\\mathrm{m/s^2}'],['cm/s²',1e-2,'\\mathrm{cm/s^2}'],['mm/s²',1e-3,'\\mathrm{mm/s^2}']],
    time:[['s',1,'\\mathrm s']],
    speed:[['m/s',1,'\\mathrm{m/s}']]
  };
  const n=(v,d=8)=>new Intl.NumberFormat('de-DE',{useGrouping:false,maximumFractionDigits:d}).format(v);
  const tn=v=>n(v,10).replace(',','{,}');
  const rng=seed=>{let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};};
  function shuffle(values,random){const a=values.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  const unitInfo=(type,label)=>units[type]?.find(u=>u[0]===label);
  function friendly(value,type){
    const choices=units[type];if(!choices||!Number.isFinite(value))throw new Error('Unbekannte Größe');
    if(value===0)return{value:0,unit:choices[0][0],text:'0 '+choices[0][0]};
    const suitable=choices.find(u=>Math.abs(value/u[1])>=1&&Math.abs(value/u[1])<1000)||choices[0];
    let shown=Number((value/suitable[1]).toPrecision(3)),unit=suitable;
    if(Math.abs(shown)>=1000){const larger=choices.find(u=>Math.abs(value/u[1])>=1&&Math.abs(value/u[1])<1000&&u[1]>suitable[1]);if(larger){unit=larger;shown=Number((value/unit[1]).toPrecision(3));}}
    return{value:shown,unit:unit[0],text:n(shown,8)+' '+unit[0]};
  }
  function q(symbol,label,value,unit,type){
    const u=unitInfo(type,unit);if(!u)throw new Error('Unbekannte Einheit '+unit);
    return{symbol,label,value,unit,type,si:value*u[1],siUnit:units[type][0][0],tex:symbol+'='+tn(value)+'\\,'+u[2]+(u[1]!==1?'='+tn(value*u[1])+'\\,'+units[type][0][2]:'')};
  }
  const gq=()=>({symbol:'g',label:'Ortsfaktor',value:G,unit:'N/kg',si:G,tex:'g='+tn(G)+'\\,\\mathrm{N/kg}'});
  function effectiveD(d1,d2,mode){
    if(![d1,d2].every(x=>Number.isFinite(x)&&x>0))throw new RangeError('Federkonstanten müssen positiv sein.');
    if(mode==='single')return d1;
    if(mode==='series')return d1*d2/(d1+d2);
    if(mode==='parallel')return d1+d2;
    throw new RangeError('Unbekannte Anordnung');
  }
  function springState(massGrams,mode='single',d=SINGLE_D){
    if(!Number.isInteger(massGrams)||massGrams<0||massGrams>30)throw new RangeError('Zulässig: 0 bis 30 g in 1-g-Schritten.');
    const D=effectiveD(d,d,mode),force=massGrams/1000*G;
    return{massGrams,mass:massGrams/1000,mode,D,force,extension:force/D,restLength:mode==='series'?.16:.08};
  }
  function fit(points){
    const usable=points.filter(p=>Number.isFinite(p.extension)&&p.extension>0&&Number.isFinite(p.force)&&p.force>0);
    if(new Set(usable.map(p=>p.massGrams)).size<2)return null;
    return usable.reduce((s,p)=>s+p.extension*p.force,0)/usable.reduce((s,p)=>s+p.extension*p.extension,0);
  }
  const numeric=(t,given,symbol,type,formula,rearrange,substitution,answer,answerStart,hints)=>({
    id:t.id,level:t.level,kind:t.kind,title:t.title,type:'number',given,symbol,dimension:type,expectedSI:answer,
    prompt:t.prompt,formula,hints:hints||['Welche Größe ist gesucht? Suche die passende Beziehung in der Formelsammlung.','Rechne zuerst alle Angaben in SI-Einheiten um und stelle die Formel nach '+symbol.replace(/_/g,'')+' um.'],
    solution:[
      {label:'Gegeben · in SI',tex:'\\begin{aligned}'+given.map(x=>x.tex).join('\\\\')+'\\end{aligned}'},
      {label:'Gesucht',tex:symbol+'\\quad\\text{in }'+units[type][0][2]},
      {label:'Formel aus der Formelsammlung',tex:formula},
      {label:'Umstellen',tex:rearrange},
      {label:'Einsetzen · ausschließlich SI',tex:substitution},
      {label:'Lösung · SI',tex:symbol+'='+tn(answer)+'\\,'+units[type][0][2]},
      {label:'Antwortsatz',text:answerStart+' '+friendly(answer,type).text+'.'}
    ]
  });
  const concepts=[
    ['träge-bahn','Trägheit','Ein Gleiter bewegt sich geradlinig auf einer ideal reibungsfreien Bahn. Die resultierende Kraft ist null. Was geschieht?',['Er bewegt sich mit unveränderter Geschwindigkeit weiter.','Er wird zwangsläufig langsamer.','Er beschleunigt ohne äußere Kraft.'],'Ohne resultierende Kraft ändert sich die Geschwindigkeit nicht. Ruhe ist nur ein möglicher Spezialfall.','\\vec F_{\\mathrm{res}}=0\\;\\Rightarrow\\;\\vec v=\\text{konstant}'],
    ['träge-ruhe','Ruhe erhalten','Ein Körper ruht. Alle auf ihn wirkenden Kräfte gleichen sich aus. Welche Aussage stimmt?',['Er bleibt in Ruhe, solange das Kräftegleichgewicht erhalten bleibt.','Es wirkt überhaupt keine einzelne Kraft.','Er muss sich bald bewegen.'],'Mehrere Kräfte können vorhanden sein und sich am selben Körper ausgleichen.','\\vec F_{\\mathrm{res}}=0\\;\\Rightarrow\\;\\vec a=0'],
    ['verdoppelt-kraft','Kraft und Beschleunigung','Die resultierende Kraft auf denselben Wagen wird verdoppelt. Seine Masse bleibt gleich. Was folgt?',['Die Beschleunigung verdoppelt sich.','Die Beschleunigung halbiert sich.','Die Geschwindigkeit verdoppelt sich sofort.'],'Bei unveränderter Masse ist die Beschleunigung proportional zur resultierenden Kraft.','a=\\frac{F_{\\mathrm{res}}}{m}'],
    ['verdoppelt-masse','Masse und Beschleunigung','Zwei Wagen erfahren dieselbe resultierende Kraft. Wagen B hat die doppelte Masse von A. Was gilt?',['B hat die halbe Beschleunigung von A.','B hat die doppelte Beschleunigung von A.','Beide haben immer dieselbe Beschleunigung.'],'Bei gleicher resultierender Kraft ist die Beschleunigung umgekehrt proportional zur Masse.','a=\\frac{F_{\\mathrm{res}}}{m}'],
    ['wand','Wechselwirkung','Du drückst mit der Hand gegen eine Wand. Wo greift die Gegenkraft zur Kraft der Hand auf die Wand an?',['An deiner Hand; die Wand übt sie auf die Hand aus.','Ebenfalls an der Wand.','Nirgendwo; eine ruhende Wand übt keine Kraft aus.'],'Die beiden Wechselwirkungskräfte greifen an verschiedenen Körpern an und treten gleichzeitig auf.','\\vec F_{A\\to B}=-\\vec F_{B\\to A}'],
    ['feder-gleichgewicht','Gleichgewicht oder Gegenkraft?','Ein Massestück hängt ruhig an einer Feder. Gewichtskraft und Federkraft wirken beide auf das Massestück. Was sind sie?',['Ein Kräftegleichgewicht am selben Körper.','Das Wechselwirkungspaar nach dem dritten Axiom.','Ein Beweis dafür, dass keine Kräfte wirken.'],'Federkraft und Gewichtskraft auf die Masse gleichen sich aus. Die Gegenkraft zur Erdanziehung ist dagegen die Anziehung der Erde durch die Masse.','\\vec F_{\\mathrm F}+\\vec F_{\\mathrm G}=0'],
    ['masse-mond','Masse und Gewichtskraft','Ein Körper wird von der Erde zum Mond gebracht. Was bleibt dabei gleich?',['Seine Masse; seine Gewichtskraft wird kleiner.','Seine Gewichtskraft; seine Masse wird kleiner.','Masse und Gewichtskraft bleiben beide gleich.'],'Die Masse ist eine Körpereigenschaft; die Gewichtskraft hängt außerdem vom Ortsfaktor ab.','F_{\\mathrm G}=m\\,g'],
    ['wagen-richtung','Kraft und Bewegungsrichtung','Ein Wagen fährt nach rechts. Eine resultierende Kraft wirkt nach links. Was folgt zunächst?',['Die Beschleunigung zeigt nach links; der Wagen wird zunächst langsamer.','Der Wagen muss sofort nach links fahren.','Die Beschleunigung zeigt immer in Bewegungsrichtung.'],'Eine Kraft ändert die Geschwindigkeit. Die Beschleunigung muss nicht in die momentane Bewegungsrichtung zeigen.','\\vec F_{\\mathrm{res}}=m\\,\\vec a']
  ];
  const pool=concepts.map(c=>({id:c[0],level:1,kind:'concept',title:c[1],data:c,slot:'concept'}));
  function add(level,slot,kind,title,context){pool.push({id:'l'+level+'-'+pool.length,level,slot,kind,title,context});}
  ['Schultasche','Trinkflasche'].forEach(c=>add(2,'weight','weightForce','Gewichtskraft bestimmen',c));
  ['Messkörper','kleiner Anhänger'].forEach(c=>add(2,'weight','weightMass','Aus Kraft wird Masse',c));
  add(2,'motion','newtonForce','Ein Wagen beschleunigt','Laborwagen');
  add(2,'motion','newtonAccel','Beschleunigung bestimmen','Rollwagen');
  add(2,'motion','newtonMass','Unbekannte Wagenmasse','Modellwagen');
  add(2,'motion','newtonForce','Gleiche Formel, andere Einheit','Transportwagen');
  ['Stahlfeder','weiche Schraubenfeder','Laborfeder','Messfeder'].forEach(c=>add(3,'constant','hookeD','Eine Feder vermessen',c));
  add(3,'hooke','hookeForce','Kraft aus der Dehnung','Messfeder');
  add(3,'hooke','hookeExtension','Verlängerung vorhersagen','Laborfeder');
  add(3,'hooke','hookeMass','Welche Masse passt?','weiche Feder');
  add(3,'hooke','hookeExtension','Masse an einer Feder','Schraubenfeder');
  add(4,'series','seriesD','Zwei Federn hintereinander','Reihenschaltung');
  add(4,'series','seriesExtension','Wie weit dehnt sich die Reihe?','Reihenschaltung');
  add(4,'series','seriesMass','Belastung für eine Federreihe','Reihenschaltung');
  add(4,'series','seriesForce','Kraft in der Federreihe','Reihenschaltung');
  add(4,'parallel','parallelD','Zwei Federn gemeinsam','Parallelschaltung');
  add(4,'parallel','parallelExtension','Wie weit dehnt sich das Paar?','Parallelschaltung');
  add(4,'parallel','parallelMass','Belastung eines Federpaars','Parallelschaltung');
  add(4,'parallel','parallelForce','Kraft am Federpaar','Parallelschaltung');
  add(5,'transfer','unequalSeries','Unterschiedliche Federn in Reihe','zwei unterschiedliche Federn');
  add(5,'transfer','unequalParallel','Unterschiedliche Federn parallel','zwei unterschiedliche Federn');
  add(5,'transfer','graphD','Steigung statt Einzelmessung','zwei Punkte einer Ausgleichsgeraden');
  add(5,'transfer','graphD','Zwei Messpunkte auswerten','zwei Punkte einer Ausgleichsgeraden');
  add(5,'transfer','seriesFromSingle','Von der Einzelmessung zur Reihe','dieselbe Federbauart');
  add(5,'transfer','parallelFromSingle','Von der Einzelmessung zum Paar','dieselbe Federbauart');
  add(5,'transfer','netAccel','Gewicht und Zugkraft zusammen','eine senkrecht gezogene Masse');
  add(5,'transfer','forceFromChange','Von der Geschwindigkeitsänderung zur Kraft','ein reibungsfreier Wagen');

  function build(t,random){
    const pick=a=>a[Math.floor(random()*a.length)];
    const mg=pick([5,8,10,12,15,18,20,24,25,30]),d=pick([4,5,6,8,10,12]);
    const F=mg/1000*G,m=mg/1000,extension=F/d;
    let a,b,c,expected,formula,rearrange,subst,given,type,symbol,answerStart,prompt;
    if(t.kind==='concept'){
      const data=t.data,options=shuffle(data[3].map((text,i)=>({text,correct:i===0})),random);
      return{id:t.id,level:1,kind:t.kind,title:t.title,type:'choice',prompt:data[2],options:options.map(x=>x.text),correctIndex:options.findIndex(x=>x.correct),hints:['Betrachte zuerst genau einen Körper. Welche Kräfte wirken auf ihn?','Unterscheide Kräftegleichgewicht an einem Körper und Wechselwirkung zwischen zwei Körpern.'],
        solution:[{label:'Gegeben',text:data[2]},{label:'Gesucht',text:'Die physikalisch passende Aussage.'},{label:'Prinzip aus der Formelsammlung',tex:data[5]},{label:'Umstellen / Einsetzen',text:'Hier ist keine Zahlenrechnung nötig. Entscheidend sind die betrachteten Körper und die Richtung der Kräfte.'},{label:'Begründung',text:data[4]},{label:'Antwortsatz',text:data[3][0]}]};
    }
    switch(t.kind){
      case 'weightForce':
        a=q('m','Masse',pick([125,200,250,350,400,500,650,750,900]),'g','mass');given=[a,gq()];symbol='F_{\\mathrm G}';type='force';expected=a.si*G;
        prompt='Eine '+t.context+' hat die Masse '+n(a.value)+' g. Berechne ihre Gewichtskraft auf der Erde.';
        formula='F_{\\mathrm G}=m\\,g';rearrange=formula;subst='F_{\\mathrm G}='+tn(a.si)+'\\,\\mathrm{kg}\\cdot'+tn(G)+'\\,\\mathrm{N/kg}';answerStart='Die Gewichtskraft beträgt';break;
      case 'weightMass':
        a=q('F_{\\mathrm G}','Gewichtskraft',pick([49.05,78.48,98.1,147.15,196.2,245.25,294.3]),'mN','force');given=[a,gq()];symbol='m';type='mass';expected=a.si/G;
        prompt='Die Gewichtskraft '+(t.context==='Messkörper'?'eines Messkörpers':'eines kleinen Anhängers')+' beträgt '+n(a.value)+' mN. Bestimme seine Masse auf der Erde.';
        formula='F_{\\mathrm G}=m\\,g';rearrange='m=\\frac{F_{\\mathrm G}}{g}';subst='m=\\frac{'+tn(a.si)+'\\,\\mathrm N}{'+tn(G)+'\\,\\mathrm{N/kg}}';answerStart='Die Masse beträgt';break;
      case 'newtonForce':
      case 'newtonAccel':
      case 'newtonMass':
        a=q('m','Masse',pick([200,250,400,500,750,800,1200]),'g','mass');b=q('a','Beschleunigung',pick([.4,.6,.8,1.2,1.5,2,2.5]),'m/s²','accel');c=q('F_{\\mathrm{res}}','Resultierende Kraft',a.si*b.si,'N','force');
        formula='F_{\\mathrm{res}}=m\\,a';
        if(t.kind==='newtonForce'){given=[a,b];symbol='F_{\\mathrm{res}}';type='force';expected=c.si;prompt='Ein '+t.context+' der Masse '+n(a.value)+' g beschleunigt mit '+n(b.value)+' m/s². Bestimme die resultierende Kraft.';rearrange=formula;subst=symbol+'='+tn(a.si)+'\\,\\mathrm{kg}\\cdot'+tn(b.si)+'\\,\\mathrm{m/s^2}';answerStart='Die resultierende Kraft beträgt';}
        if(t.kind==='newtonAccel'){given=[a,c];symbol='a';type='accel';expected=b.si;prompt='Auf einen '+t.context+' mit '+n(a.value)+' g Masse wirkt eine resultierende Kraft von '+n(c.value)+' N. Wie groß ist die Beschleunigung?';rearrange='a=\\frac{F_{\\mathrm{res}}}{m}';subst='a=\\frac{'+tn(c.si)+'\\,\\mathrm N}{'+tn(a.si)+'\\,\\mathrm{kg}}';answerStart='Die Beschleunigung beträgt';}
        if(t.kind==='newtonMass'){given=[b,c];symbol='m';type='mass';expected=a.si;prompt='Eine resultierende Kraft von '+n(c.value)+' N beschleunigt einen '+t.context+' mit '+n(b.value)+' m/s². Berechne seine Masse.';rearrange='m=\\frac{F_{\\mathrm{res}}}{a}';subst='m=\\frac{'+tn(c.si)+'\\,\\mathrm N}{'+tn(b.si)+'\\,\\mathrm{m/s^2}}';answerStart='Die Wagenmasse beträgt';}break;
      case 'hookeD':
        a=q('m','Zusatzmasse',mg,'g','mass');b=q('s','Verlängerung',pick([15,20,25,30,35,40,45,50,60]),'mm','length');given=[a,b,gq()];symbol='D';type='spring';expected=F/b.si;
        prompt='Eine '+t.context+' verlängert sich unter '+mg+' g Zusatzmasse um '+n(b.value)+' mm. Sie hängt ruhig und bleibt elastisch. Bestimme die Federkonstante.';
        formula='F_{\\mathrm F}=D\\,s,\\qquad F_{\\mathrm F}=F_{\\mathrm G}=m\\,g';rearrange='D=\\frac{F_{\\mathrm F}}s=\\frac{m\\,g}s';subst='D=\\frac{'+tn(m)+'\\,\\mathrm{kg}\\cdot'+tn(G)+'\\,\\mathrm{N/kg}}{'+tn(b.si)+'\\,\\mathrm m}';answerStart='Die Federkonstante beträgt';break;
      case 'hookeForce':
        a=q('D','Federkonstante',d,'N/m','spring');b=q('s','Verlängerung',pick([5,8,12,15,20,25,30]),'mm','length');given=[a,b];symbol='F_{\\mathrm F}';type='force';expected=d*b.si;
        prompt='Eine '+t.context+' mit D = '+d+' N/m wird um '+b.value+' mm verlängert. Berechne den Betrag ihrer Federkraft.';
        formula='F_{\\mathrm F}=D\\,s';rearrange=formula;subst=symbol+'='+tn(d)+'\\,\\mathrm{N/m}\\cdot'+tn(b.si)+'\\,\\mathrm m';answerStart='Der Betrag der Federkraft ist';break;
      case 'hookeExtension':
        a=q('m','Zusatzmasse',mg,'g','mass');b=q('D','Federkonstante',d,'N/m','spring');given=[a,b,gq()];symbol='s';type='length';expected=extension;
        prompt='An einer '+t.context+' mit D = '+d+' N/m hängen '+mg+' g Zusatzmasse ruhig. Wie groß ist die Verlängerung im elastischen Bereich?';
        formula='F_{\\mathrm G}=m\\,g,\\qquad F_{\\mathrm F}=D\\,s,\\qquad F_{\\mathrm F}=F_{\\mathrm G}';rearrange='s=\\frac{F_{\\mathrm G}}D=\\frac{m\\,g}D';subst='s=\\frac{'+tn(m)+'\\,\\mathrm{kg}\\cdot'+tn(G)+'\\,\\mathrm{N/kg}}{'+tn(d)+'\\,\\mathrm{N/m}}';answerStart='Die Feder verlängert sich um';break;
      case 'hookeMass':
        a=q('D','Federkonstante',d,'N/m','spring');b=q('s','Verlängerung',pick([10,15,20,25,30]),'mm','length');given=[a,b,gq()];symbol='m';type='mass';expected=d*b.si/G;
        prompt='Eine '+t.context+' mit D = '+d+' N/m soll sich im ruhigen Gleichgewicht um '+b.value+' mm verlängern. Welche Zusatzmasse ist dafür nötig?';
        formula='m\\,g=D\\,s';rearrange='m=\\frac{D\\,s}g';subst='m=\\frac{'+tn(d)+'\\,\\mathrm{N/m}\\cdot'+tn(b.si)+'\\,\\mathrm m}{'+tn(G)+'\\,\\mathrm{N/kg}}';answerStart='Benötigt wird eine Zusatzmasse von';break;
      case 'seriesD':case 'parallelD':case 'seriesExtension':case 'parallelExtension':case 'seriesMass':case 'parallelMass':case 'seriesForce':case 'parallelForce': {
        const series=t.kind.startsWith('series'),D=series?d/2:2*d,label=series?'hintereinander':'parallel mit gemeinsamen oberen und unteren Befestigungen';
        a=q('D','Federkonstante einer Feder',d,'N/m','spring');
        const relation=series?'\\frac1{D_{\\mathrm{ges}}}=\\frac1D+\\frac1D':'D_{\\mathrm{ges}}=D+D',simple=series?'D_{\\mathrm{ges}}=\\frac D2':'D_{\\mathrm{ges}}=2D';
        if(t.kind.endsWith('D')){given=[a];symbol='D_{\\mathrm{ges}}';type='spring';expected=D;prompt='Zwei identische Federn mit jeweils D = '+d+' N/m werden '+label+' verbunden. Bestimme die Gesamtfederkonstante.';formula=relation;rearrange=simple;subst=symbol+'='+(series?'\\frac{'+tn(d)+'\\,\\mathrm{N/m}}2':'2\\cdot'+tn(d)+'\\,\\mathrm{N/m}');answerStart='Die Gesamtfederkonstante beträgt';}
        if(t.kind.endsWith('Extension')){b=q('m','Zusatzmasse',mg,'g','mass');given=[a,b,gq()];symbol='s_{\\mathrm{ges}}';type='length';expected=F/D;prompt='Zwei identische Federn mit je D = '+d+' N/m sind '+label+' verbunden. '+mg+' g Zusatzmasse hängen ruhig daran. Berechne die gesamte Verlängerung.';formula=simple+',\\qquad m\\,g=D_{\\mathrm{ges}}\\,s_{\\mathrm{ges}}';rearrange=symbol+'=\\frac{m\\,g}{D_{\\mathrm{ges}}}';subst='D_{\\mathrm{ges}}='+tn(D)+'\\,\\mathrm{N/m},\\quad '+symbol+'=\\frac{'+tn(m)+'\\,\\mathrm{kg}\\cdot'+tn(G)+'\\,\\mathrm{N/kg}}{'+tn(D)+'\\,\\mathrm{N/m}}';answerStart='Die Anordnung verlängert sich insgesamt um';}
        if(t.kind.endsWith('Mass')){b=q('s_{\\mathrm{ges}}','Gesamtverlängerung',pick([10,15,20,25]),'mm','length');given=[a,b,gq()];symbol='m';type='mass';expected=D*b.si/G;prompt='Zwei identische Federn mit je D = '+d+' N/m werden '+label+' verbunden. Welche Zusatzmasse erzeugt im Gleichgewicht '+b.value+' mm Gesamtverlängerung?';formula=simple+',\\qquad m\\,g=D_{\\mathrm{ges}}\\,s_{\\mathrm{ges}}';rearrange='m=\\frac{D_{\\mathrm{ges}}\\,s_{\\mathrm{ges}}}g';subst='D_{\\mathrm{ges}}='+tn(D)+'\\,\\mathrm{N/m},\\quad m=\\frac{'+tn(D)+'\\,\\mathrm{N/m}\\cdot'+tn(b.si)+'\\,\\mathrm m}{'+tn(G)+'\\,\\mathrm{N/kg}}';answerStart='Die benötigte Zusatzmasse beträgt';}
        if(t.kind.endsWith('Force')){b=q('s_{\\mathrm{ges}}','Gesamtverlängerung',pick([10,15,20,30,40]),'mm','length');given=[a,b];symbol='F';type='force';expected=D*b.si;prompt='Zwei identische Federn mit je D = '+d+' N/m sind '+label+' verbunden. Bestimme die äußere Zugkraft für '+b.value+' mm Gesamtverlängerung.';formula=simple+',\\qquad F=D_{\\mathrm{ges}}\\,s_{\\mathrm{ges}}';rearrange='F=D_{\\mathrm{ges}}\\,s_{\\mathrm{ges}}';subst='D_{\\mathrm{ges}}='+tn(D)+'\\,\\mathrm{N/m},\\quad F='+tn(D)+'\\,\\mathrm{N/m}\\cdot'+tn(b.si)+'\\,\\mathrm m';answerStart='Die äußere Zugkraft beträgt';}break;
      }
      case 'unequalSeries':case 'unequalParallel':{
        const series=t.kind==='unequalSeries';a=q('D_1','Erste Federkonstante',pick([3,4,5,6]),'N/m','spring');b=q('D_2','Zweite Federkonstante',pick([8,10,12,15]),'N/m','spring');given=[a,b];symbol='D_{\\mathrm{ges}}';type='spring';expected=effectiveD(a.si,b.si,series?'series':'parallel');
        prompt='Zwei Federn mit D₁ = '+a.value+' N/m und D₂ = '+b.value+' N/m sind '+(series?'hintereinander':'parallel mit gemeinsamen Endpunkten')+' verbunden. Bestimme die Gesamtfederkonstante.';
        formula=series?'\\frac1{D_{\\mathrm{ges}}}=\\frac1{D_1}+\\frac1{D_2}':'D_{\\mathrm{ges}}=D_1+D_2';rearrange=series?'D_{\\mathrm{ges}}=\\frac{D_1D_2}{D_1+D_2}':formula;
        subst=series?symbol+'=\\frac{'+tn(a.si)+'\\,\\mathrm{N/m}\\cdot'+tn(b.si)+'\\,\\mathrm{N/m}}{'+tn(a.si)+'\\,\\mathrm{N/m}+'+tn(b.si)+'\\,\\mathrm{N/m}}':symbol+'='+tn(a.si)+'\\,\\mathrm{N/m}+'+tn(b.si)+'\\,\\mathrm{N/m}';answerStart='Die Gesamtfederkonstante beträgt';break;
      }
      case 'graphD':
        a=q('s_1','Erste Verlängerung',pick([5,10,15]),'mm','length');b=q('s_2','Zweite Verlängerung',pick([35,40,45,50]),'mm','length');c=q('F_1','Erste Kraft',d*a.si,'N','force');const f2=q('F_2','Zweite Kraft',d*b.si,'N','force');given=[a,b,c,f2];symbol='D';type='spring';expected=d;
        prompt='Eine Ausgleichsgerade im F-s-Diagramm verläuft durch ('+a.value+' mm; '+n(c.value)+' N) und ('+b.value+' mm; '+n(f2.value)+' N). Die Verlängerung s steht waagerecht, F senkrecht. Bestimme die Federkonstante aus der Steigung.';
        formula='D=\\frac{\\Delta F}{\\Delta s}';rearrange='D=\\frac{F_2-F_1}{s_2-s_1}';subst='D=\\frac{('+tn(f2.si)+'-'+tn(c.si)+')\\,\\mathrm N}{('+tn(b.si)+'-'+tn(a.si)+')\\,\\mathrm m}';answerStart='Die Steigung und damit die Federkonstante beträgt';break;
      case 'seriesFromSingle':case 'parallelFromSingle':{
        const series=t.kind==='seriesFromSingle';a=q('m','Zusatzmasse',mg,'g','mass');b=q('s','Einzelverlängerung',pick([10,15,20,25,30]),'mm','length');given=[a,b,gq()];symbol='D_{\\mathrm{ges}}';type='spring';expected=(F/b.si)*(series?.5:2);
        prompt='Eine einzelne Feder dehnt sich unter '+mg+' g um '+b.value+' mm. Bestimme daraus die Gesamtfederkonstante zweier solcher identischer Federn '+(series?'in Reihe':'parallel')+'. Alle Messungen erfolgen im elastischen, ruhigen Gleichgewicht.';
        formula='D=\\frac{m\\,g}s,\\qquad '+(series?'D_{\\mathrm{ges}}=\\frac D2':'D_{\\mathrm{ges}}=2D');rearrange=symbol+'='+(series?'\\frac{m\\,g}{2s}':'\\frac{2m\\,g}s');subst=symbol+'=\\frac{'+(series?'':'2\\cdot')+tn(m)+'\\,\\mathrm{kg}\\cdot'+tn(G)+'\\,\\mathrm{N/kg}}{'+(series?'2\\cdot':'')+tn(b.si)+'\\,\\mathrm m}';answerStart='Die Gesamtfederkonstante beträgt';break;
      }
      case 'netAccel':{
        a=q('m','Masse',pick([10,15,20,25,30]),'g','mass');const acceleration=pick([1,1.5,2,2.5,3]);b=q('F_{\\mathrm Z}','Zugkraft nach oben',a.si*(G+acceleration),'N','force');given=[a,b,gq()];symbol='a';type='accel';expected=acceleration;
        prompt='Eine Masse von '+a.value+' g wird mit '+n(b.value)+' N nach oben gezogen. Zusätzlich wirkt nur die Gewichtskraft. Berechne die Beschleunigung; nach oben wird positiv gezählt.';
        formula='F_{\\mathrm{res}}=F_{\\mathrm Z}-m\\,g=m\\,a';rearrange='a=\\frac{F_{\\mathrm Z}-m\\,g}{m}';subst='a=\\frac{'+tn(b.si)+'\\,\\mathrm N-'+tn(a.si)+'\\,\\mathrm{kg}\\cdot'+tn(G)+'\\,\\mathrm{N/kg}}{'+tn(a.si)+'\\,\\mathrm{kg}}';answerStart='Die Beschleunigung nach oben beträgt';break;
      }
      case 'forceFromChange':
        a=q('m','Masse',pick([200,250,400,500,600]),'g','mass');b=q('\\Delta v','Geschwindigkeitszunahme',pick([.6,1.2,1.5,2.4,3]),'m/s','speed');c=q('\\Delta t','Zeitspanne',pick([.5,1,1.5,2]),'s','time');given=[a,b,c];symbol='F_{\\mathrm{res}}';type='force';expected=a.si*b.si/c.si;
        prompt='Ein reibungsfreier Wagen mit '+a.value+' g Masse wird gleichmäßig schneller. Seine Geschwindigkeit nimmt in '+n(c.value)+' s um '+n(b.value)+' m/s zu. Bestimme die resultierende Kraft.';
        formula='F_{\\mathrm{res}}=m\\,a,\\qquad a=\\frac{\\Delta v}{\\Delta t}';rearrange='F_{\\mathrm{res}}=m\\,\\frac{\\Delta v}{\\Delta t}';subst=symbol+'='+tn(a.si)+'\\,\\mathrm{kg}\\cdot\\frac{'+tn(b.si)+'\\,\\mathrm{m/s}}{'+tn(c.si)+'\\,\\mathrm s}';answerStart='Die resultierende Kraft beträgt';break;
      default:throw new Error('Unbekannte Vorlage '+t.kind);
    }
    return numeric({...t,prompt},given,symbol,type,formula,rearrange,subst,expected,answerStart);
  }
  function round(seed){
    const random=rng(seed),choose=(slot,count)=>shuffle(pool.filter(t=>t.slot===slot),random).slice(0,count);
    const selected=[...choose('concept',2),...choose('weight',1),...choose('motion',1),...choose('constant',1),...choose('hooke',1),...choose('series',1),...choose('parallel',1),...choose('transfer',2)];
    return selected.map(t=>build(t,random));
  }
  function example(){
    const a=q('m','Zusatzmasse',20,'g','mass'),b=q('s','Verlängerung',40,'mm','length');
    return numeric({id:'festes-beispiel',level:3,kind:'example',title:'Eine Federkonstante bestimmen',prompt:'20 g Zusatzmasse verlängern eine Feder im ruhigen Gleichgewicht um 40 mm. Bestimme die Federkonstante. g = 9,81 N/kg.'},[a,b,gq()],'D','spring','F_{\\mathrm G}=m\\,g,\\qquad F_{\\mathrm F}=D\\,s,\\qquad F_{\\mathrm F}=F_{\\mathrm G}','D=\\frac{F_{\\mathrm F}}s=\\frac{m\\,g}s','D=\\frac{0{,}020\\,\\mathrm{kg}\\cdot9{,}81\\,\\mathrm{N/kg}}{0{,}040\\,\\mathrm m}',.02*G/.04,'Die Federkonstante beträgt');
  }
  function parseNumber(raw){
    const text=String(raw).trim().replace(/\s/g,'').replace(',','.');
    return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)?Number(text):NaN;
  }
  function check(task,raw,unit){
    if(task.type==='choice'){const value=Number(raw);if(raw===''||!Number.isInteger(value)||value<0||value>=task.options.length)return{valid:false,correct:false};return{valid:true,correct:value===task.correctIndex};}
    const value=parseNumber(raw),u=unitInfo(task.dimension,unit);
    if(!Number.isFinite(value)||!u)return{valid:false,correct:false};
    return{valid:true,correct:Math.abs(value*u[1]-task.expectedSI)<=Math.max(Math.abs(task.expectedSI)*.006,1e-10)};
  }
  function grade(task,raw,unit,previous={attempts:0,status:'open',points:0}){
    if(previous.status!=='open')return previous;
    const result=check(task,raw,unit);if(!result.valid)return{...previous,invalid:true};
    const attempts=previous.attempts+1,correct=result.correct,status=correct?'correct':attempts>=2?'solved':'open';
    return{attempts,status,points:correct?(attempts===1?1:.5):0,lastAnswer:String(raw),unit,correct};
  }
  function validate(tasks){
    if(tasks.length!==10||new Set(tasks.map(t=>t.id)).size!==10)throw new Error('Ungültige Runde');
    tasks.forEach(t=>{if(t.type==='number'&&(!Number.isFinite(t.expectedSI)||t.expectedSI<=0))throw new Error('Ungültiges Ergebnis');});
    return true;
  }
  return Object.freeze({G,SINGLE_D,VERSION,units,pool,round,example,n,tn,friendly,parseNumber,check,grade,validate,effectiveD,springState,fit,rng,shuffle});
});

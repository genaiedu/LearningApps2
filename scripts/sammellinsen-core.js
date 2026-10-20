/* Sammellinsen-Labor: dünne Linse, SI-Modell und reproduzierbare Aufgaben. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LensCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION=1,F=.1,BANK=.7,OBJECT_X=.06,SCREEN_MAX=.68,OBJECT_HEIGHT=.02,TOLERANCE=.02;
  const units={length:[['m',1,'\\mathrm m'],['cm',.01,'\\mathrm{cm}'],['mm',.001,'\\mathrm{mm}']],ratio:[['ohne Einheit',1,'']]};
  const n=(v,d=8)=>new Intl.NumberFormat('de-DE',{useGrouping:false,maximumFractionDigits:d}).format(v),tn=v=>n(v,9).replace(',','{,}');
  const rng=seed=>{let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};};
  function shuffle(values,r){const a=values.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  const decimals=v=>v===0?0:Math.max(0,2-Math.floor(Math.log10(Math.abs(Number(v.toPrecision(3))))));
  const fixed=(v,d)=>new Intl.NumberFormat('de-DE',{useGrouping:false,minimumFractionDigits:d,maximumFractionDigits:d}).format(v);
  function answerFormat(t,unit=units[t.dimension]?.[0][0]){
    if(t.type!=='number')return null;const u=units[t.dimension].find(u=>u[0]===unit);if(!u)throw Error('Unbekannte Einheit');
    const d=decimals(t.expectedSI/u[1]),example=d===0?'123':d===1?'12,3':d===2?'1,23':'0,'+'0'.repeat(d-3)+'123';
    return{decimals:d,example,text:fixed(t.expectedSI/u[1],d),instruction:(t.dimension==='ratio'?'Ergebnis ohne Einheit':'Ergebnis in '+unit)+': '+(d===0?'ohne Nachkommastellen (ganze Zahl) angeben.':'auf '+d+' Nachkommastelle'+(d===1?'':'n')+' runden.')};
  }
  function friendly(v,dimension){
    if(dimension==='ratio')return fixed(v,decimals(v));
    const u=units.length.find(u=>Math.abs(v/u[1])>=1&&Math.abs(v/u[1])<1000)||units.length[0];return fixed(v/u[1],decimals(v/u[1]))+' '+u[0];
  }
  function image(g,f=F){
    if(!Number.isFinite(g)||!Number.isFinite(f)||g<=0||f<=0)throw RangeError('Abstände und Brennweite müssen positiv sein.');
    if(Math.abs(g-f)<1e-12)return{kind:'infinity',b:null,A:null};
    const b=f*g/(g-f);return{kind:b>0?'real':'virtual',b,A:Math.abs(b/g)};
  }
  function bench(g=.25,screen=.25){
    if(!Number.isFinite(g)||!Number.isFinite(screen)||g<.05-1e-9||g>.45+1e-9||screen<.02-1e-9||OBJECT_X+g+screen>SCREEN_MAX+1e-9)throw RangeError('Anordnung passt nicht auf die Bank.');
    const optics=image(g),available=SCREEN_MAX-OBJECT_X-g,sharp=optics.kind==='real'&&Math.abs(screen-optics.b)<=.001+1e-12;
    return{g,screen,...optics,lensX:OBJECT_X+g,screenX:OBJECT_X+g+screen,available,reachable:optics.kind==='real'&&optics.b<=available&&optics.b>=.02,sharp,scaleOnScreen:screen/g,blurRadius:.012*Math.abs(1+screen/g-screen/F)};
  }
  function plotData(records){
    const groups=new Map();
    for(const r of records){if(!Number.isFinite(r.g)||!Number.isFinite(r.b)||r.g<=0||r.b<=0)continue;const a=groups.get(r.g)||[];a.push(r.b);groups.set(r.g,a);}
    const points=[...groups].map(([g,bs])=>({g,b:bs.reduce((a,b)=>a+b,0)/bs.length})).sort((a,b)=>a.g-b.g),curve=[];
    if(points.length<3)return{points,curve};
    const h=points.slice(1).map((p,i)=>p.g-points[i].g),d=h.map((v,i)=>(points[i+1].b-points[i].b)/v),m=[d[0]];
    // Shape-preserving Hermite interpolation: no overshoot, no extrapolation.
    for(let i=1;i<points.length-1;i++){const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];m.push(d[i-1]*d[i]<=0?0:(w1+w2)/(w1/d[i-1]+w2/d[i]));}m.push(d.at(-1));
    curve.push({...points[0]});
    for(let i=0;i<points.length-1;i++)for(let j=1;j<=20;j++){const t=j/20,t2=t*t,t3=t2*t;curve.push({g:points[i].g+t*h[i],b:(2*t3-3*t2+1)*points[i].b+(t3-2*t2+t)*h[i]*m[i]+(-2*t3+3*t2)*points[i+1].b+(t3-t2)*h[i]*m[i+1]});}
    return{points,curve};
  }
  const si=v=>tn(v)+'\\,\\mathrm m';
  function q(symbol,label,value,unit='cm',dimension='length'){
    const u=units[dimension].find(u=>u[0]===unit),valueSI=value*u[1];return{symbol,label,value,unit,si:valueSI,tex:symbol+'='+tn(value)+(u[2]?'\\,'+u[2]:'')+(u[1]!==1?'='+si(valueSI):'')};
  }
  const L=(symbol,label,value)=>q(symbol,label,value*100),R=(symbol,label,value)=>q(symbol,label,value,'ohne Einheit','ratio');
  function numeric(t,p,given,symbol,expectedSI,formula,rearrange,substitution,answerStart,dimension='length'){
    return{id:t.id,kind:t.kind,level:t.level,title:t.title,type:'number',dimension,prompt:p,given,symbol,expectedSI,
      hints:['Welche Größe ist gesucht? Unterscheide die Abstände g und b von den Größen G und B.','Rechne Längen in Meter um. Nutze die passende Beziehung aus der Formelsammlung und stelle sie nach der gesuchten Größe um.'],
      solution:[{label:'Gegeben · in SI',tex:'\\begin{aligned}'+given.map(x=>x.tex).join('\\\\')+'\\end{aligned}'},{label:'Gesucht',tex:symbol+(dimension==='length'?'\\quad\\text{in }\\mathrm m':'\\quad\\text{ohne Einheit}')},{label:'Formel aus der Formelsammlung',tex:formula},{label:'Umstellen',tex:rearrange},{label:'Einsetzen · ausschließlich SI',tex:substitution},{label:'Lösung · SI',tex:symbol+'='+tn(expectedSI)+(dimension==='length'?'\\,\\mathrm m':'')},{label:'Antwortsatz',text:answerStart+' '+friendly(expectedSI,dimension)+'.'}]};
  }
  const concepts=[
    ['g-b','Abstände richtig messen','Wo beginnt die Gegenstandsweite g?',['An der Gegenstandsebene; sie endet an der Linse.','An der Lampe; sie endet am Schirm.','An der Linse; sie endet am Schirm.'],'g verbindet Gegenstand und Linse. Die Bildweite b verbindet Linse und scharfes Bild.'],
    ['source','Lampe und Gegenstand','Was wird bei unserem Versuch auf die Mattscheibe abgebildet?',['Die von hinten beleuchtete Perl-Eins.','Der Abstand der Lampe zur Eins.','Die U-Profilbank.'],'Die Lampe beleuchtet die Öffnungen der Eins. Die Eins ist der abzubildende Gegenstand.'],
    ['invert','Die Lage des Bildes','Ein reelles Bild der Perl-Eins ist scharf auf dem Schirm. Welche Lage erwartest du gegenüber dem Gegenstand?',['Um 180° gedreht: oben und unten sowie links und rechts sind vertauscht.','Immer aufrecht.','Nur größer, aber unverändert orientiert.'],'Beim reellen Bild kreuzen sich die Lichtwege. Das Bild ist gegenüber dem Gegenstand umgekehrt.'],
    ['focus','Die Brennweite','Welche Aussage beschreibt die Brennweite f einer dünnen Sammellinse?',['Den Abstand von der Linse zum Brennpunkt für achsenparallel einfallendes Licht.','Jeden beliebigen Abstand zwischen Linse und Schirm.','Die Dicke der Linse.'],'Die Brennweite ist eine Eigenschaft der Linse. Die Bildweite ändert sich dagegen mit der Gegenstandsweite.'],
    ['twice','Gleich großes Bild','Der Gegenstand steht bei g = 2f. Wo liegt das scharfe reelle Bild?',['Bei b = 2f; es ist gleich groß und umgekehrt.','Bei b = f; es ist aufrecht.','Es entsteht überhaupt kein reelles Bild.'],'Setzt man g = 2f in die Linsengleichung ein, folgt b = 2f und A = b/g = 1.'],
    ['virtual','Zu nah an der Linse','Die Perl-Eins steht näher an der Linse als deren Brennweite. Was trifft auf den Schirm zu?',['Es lässt sich kein scharfes Bild der Eins auf einem Schirm hinter der Linse auffangen.','Man muss den Schirm nur genau bei f aufstellen.','Das Bild ist dann immer gleich groß.'],'Für g < f entsteht ein virtuelles Bild auf der Gegenstandsseite. Es kann nicht auf dem Schirm aufgefangen werden.'],
    ['focalplane','Genau im Brennpunkt','Der Gegenstand steht genau bei g = f. Welche Aussage gilt im idealen Modell?',['Es gibt kein scharfes Bild in endlicher Entfernung hinter der Linse.','Das scharfe Bild liegt bei b = f.','Das Bild liegt direkt an der Linse.'],'Das Licht eines Gegenstandspunktes verlässt die ideale Linse parallel. Ein endlicher Schirmabstand liefert kein scharfes Bild.'],
    ['screen','Unscharf ist nicht bildlos','Bei g > f ist die Eins auf dem Schirm unscharf. Was prüfst du zuerst?',['Ob der Schirm in der passenden Bildebene steht und alles auf einer Achse liegt.','Ob die Einheit der Brennweite gestrichen wurde.','Ob die Lampe dieselbe Höhe wie die Banklänge hat.'],'Ein reelles Bild kann vor oder hinter dem Schirm liegen. Die Schirmposition muss zur Gegenstandsweite passen.']
  ];
  const kinds=[
    ['gPosition','Gegenstandsweite ablesen'],['bPosition','Bildweite ablesen'],['span','Platz auf der Bank'],['gFromSpan','Gegenstandsweite aus dem Gesamtweg'],['bFromSpan','Bildweite aus dem Gesamtweg'],['ratioHeights','Größen vergleichen'],['ratioDistances','Abbildungsmaßstab aus Abständen'],['heightDirect','Bildgröße berechnen'],
    ['bFG','Die richtige Schirmposition'],['gFB','Den Gegenstand platzieren'],['fGB','Eine Brennweite bestimmen'],['bFG2','Eine zweite Sammellinse'],['gFB2','Eine kurze Bildweite'],['fGB2','Ein Messpaar auswerten'],['GfromB','Die Größe des Gegenstands'],['BfromG','Abbildung und Bildgröße'],
    ['Bcombined','Bildgröße in zwei Schritten'],['Gcombined','Vom Bild zum Gegenstand'],['gAF','Gewünschte Vergrößerung'],['bAF','Bildweite bei vorgegebenem Maßstab'],['fAg','Eine passende Linse wählen'],['fAb','Brennweite aus Maßstab und Bildweite'],['spanAF','Abstand für eine Vergrößerung'],['Afg','Maßstab aus Brennweite und Abstand'],
    ['minSpan','Die kürzeste Anordnung'],['fSpanA','Brennweite für eine feste Strecke'],['swap','Zwei scharfe Linsenstellungen'],['shift','Wie weit wird die Linse versetzt?'],['secondHeight','Das andere scharfe Bild'],['gHeights','Aus Bildhöhe und Brennweite'],['bHeights','Bildweite aus zwei Höhen'],['remaining','Scharfstellen auf der Bank']
  ];
  const pool=concepts.map(c=>({id:c[0],kind:'concept',level:1,title:c[1],data:c})).concat(kinds.map((k,i)=>({id:'n-'+k[0],kind:k[0],level:2+Math.floor(i/8),title:k[1]})));
  function build(t,random){
    const pick=a=>a[Math.floor(random()*a.length)];
    if(t.kind==='concept'){const c=t.data,o=shuffle(c[3].map((text,i)=>({text,correct:i===0})),random);return{id:t.id,kind:t.kind,level:1,title:t.title,type:'choice',prompt:c[2],options:o.map(x=>x.text),correctIndex:o.findIndex(x=>x.correct),hints:['Welcher Teil des Aufbaus ist gemeint? Schau dir die Begriffe in den Grundlagen an.','Unterscheide ein scharfes reelles Bild auf dem Schirm von einem virtuellen Bild.'],solution:[{label:'Gegeben',text:c[2]},{label:'Gesucht',text:'Die physikalisch richtige Aussage.'},{label:'Prinzip',text:c[4]},{label:'Antwortsatz',text:c[3][0]}]};}
    const f=pick([.05,.08,.1,.12]),A=pick(t.kind==='shift'?[.5,.75,1.5,2,3]:[.5,.75,1,1.5,2,3]),g=f*(1+1/A),b=f*(1+A),G=pick([.01,.015,.02,.025]),B=G*A,ell=g+b,xG=.05,xL=xG+g,xS=xL+b;
    const vals={f:L('f','Brennweite',f),g:L('g','Gegenstandsweite',g),b:L('b','Bildweite',b),G:L('G','Gegenstandsgröße',G),B:L('B','Bildgröße',B),A:R('A','Abbildungsmaßstab',A),ell:L('L','Gegenstand-Schirm-Abstand',ell),xG:L('x_G','Position des Gegenstands',xG),xL:L('x_L','Position der Linse',xL),xS:L('x_S','Position des Schirms',xS)};
    const cm=x=>n(x*100,6)+' cm',lens='Eine dünne Sammellinse bildet einen Gegenstand scharf auf einen Schirm ab. ',eq='\\frac1f=\\frac1g+\\frac1b',mag='A=\\frac BG=\\frac bg';
    const make=(p,keys,symbol,answer,formula,rearrange,substitution,start,dimension)=>numeric(t,p,keys.map(k=>vals[k]),symbol,answer,formula,rearrange,substitution,start,dimension);
    switch(t.kind){
      case'gPosition':return make('Die Gegenstandsebene liegt bei '+cm(xG)+', die Linsenmitte bei '+cm(xL)+' auf derselben Skala. Bestimme g.',['xG','xL'],'g',g,'g=x_L-x_G','g=x_L-x_G','g='+si(xL)+'-'+si(xG),'Die Gegenstandsweite beträgt');
      case'bPosition':return make('Die Linsenmitte steht bei '+cm(xL)+', die scharfe Mattscheibe bei '+cm(xS)+'. Bestimme b.',['xL','xS'],'b',b,'b=x_S-x_L','b=x_S-x_L','b='+si(xS)+'-'+si(xL),'Die Bildweite beträgt');
      case'span':return make('Gegenstandsweite '+cm(g)+', Bildweite '+cm(b)+'. Wie groß ist der Abstand L zwischen Gegenstand und Schirm?',['g','b'],'L',ell,'L=g+b','L=g+b','L='+si(g)+'+'+si(b),'Der Abstand zwischen Gegenstand und Schirm beträgt');
      case'gFromSpan':return make('Zwischen Gegenstand und Schirm liegen '+cm(ell)+'. Die Bildweite ist '+cm(b)+'. Bestimme g.',['ell','b'],'g',g,'L=g+b','g=L-b','g='+si(ell)+'-'+si(b),'Die Gegenstandsweite beträgt');
      case'bFromSpan':return make('Zwischen Gegenstand und Schirm liegen '+cm(ell)+'. Die Gegenstandsweite ist '+cm(g)+'. Bestimme b.',['ell','g'],'b',b,'L=g+b','b=L-g','b='+si(ell)+'-'+si(g),'Die Bildweite beträgt');
      case'ratioHeights':return make('Der Gegenstand ist '+cm(G)+' hoch; sein scharfes Bild ist '+cm(B)+' hoch. Bestimme den Abbildungsmaßstab A als positiven Größenfaktor.',['G','B'],'A',A,'A=\\frac BG','A=\\frac BG','A=\\frac{'+si(B)+'}{'+si(G)+'}','Der Abbildungsmaßstab beträgt','ratio');
      case'ratioDistances':return make(lens+'Dabei sind g = '+cm(g)+' und b = '+cm(b)+'. Bestimme A.',['g','b'],'A',A,mag,'A=\\frac bg','A=\\frac{'+si(b)+'}{'+si(g)+'}','Der Abbildungsmaßstab beträgt','ratio');
      case'heightDirect':case'BfromG':return make(lens+'G = '+cm(G)+', g = '+cm(g)+', b = '+cm(b)+'. Bestimme die Bildgröße B (als positive Länge).',['G','g','b'],'B',B,mag,'B=G\\,\\frac bg','B='+si(G)+'\\cdot\\frac{'+si(b)+'}{'+si(g)+'}','Die Bildgröße beträgt');
      case'bFG':case'bFG2':return make('Eine Sammellinse hat f = '+cm(f)+'. Der Gegenstand steht bei g = '+cm(g)+'. Berechne b für das scharfe reelle Bild.',['f','g'],'b',b,eq,'b=\\frac{fg}{g-f}','b=\\frac{'+si(f)+'\\cdot'+si(g)+'}{'+si(g)+'-'+si(f)+'}','Die Bildweite beträgt');
      case'gFB':case'gFB2':return make('Bei f = '+cm(f)+' soll das Bild in b = '+cm(b)+' Entfernung scharf sein. Berechne g.',['f','b'],'g',g,eq,'g=\\frac{fb}{b-f}','g=\\frac{'+si(f)+'\\cdot'+si(b)+'}{'+si(b)+'-'+si(f)+'}','Die Gegenstandsweite beträgt');
      case'fGB':case'fGB2':return make(lens+'Gemessen werden g = '+cm(g)+' und b = '+cm(b)+'. Bestimme f.',['g','b'],'f',f,eq,'f=\\frac{gb}{g+b}','f=\\frac{'+si(g)+'\\cdot'+si(b)+'}{'+si(g)+'+'+si(b)+'}','Die Brennweite beträgt');
      case'GfromB':return make(lens+'B = '+cm(B)+', g = '+cm(g)+', b = '+cm(b)+'. Bestimme G.',['B','g','b'],'G',G,mag,'G=B\\,\\frac gb','G='+si(B)+'\\cdot\\frac{'+si(g)+'}{'+si(b)+'}','Die Gegenstandsgröße beträgt');
      case'Bcombined':return make('Ein '+cm(G)+' hoher Gegenstand steht '+cm(g)+' vor einer Sammellinse mit f = '+cm(f)+'. Wie hoch ist sein scharfes reelles Bild?',['G','g','f'],'B',B,eq+',\\quad '+mag,'b=\\frac{fg}{g-f},\\quad B=G\\,\\frac bg','\\begin{aligned}b&=\\frac{'+si(f)+'\\cdot'+si(g)+'}{'+si(g)+'-'+si(f)+'}='+si(b)+'\\\\B&='+si(G)+'\\cdot\\frac{'+si(b)+'}{'+si(g)+'}\\end{aligned}','Die Bildgröße beträgt');
      case'Gcombined':return make('Bei f = '+cm(f)+' und g = '+cm(g)+' entsteht ein '+cm(B)+' hohes scharfes reelles Bild. Bestimme G.',['B','g','f'],'G',G,eq+',\\quad '+mag,'b=\\frac{fg}{g-f},\\quad G=B\\,\\frac gb','\\begin{aligned}b&=\\frac{'+si(f)+'\\cdot'+si(g)+'}{'+si(g)+'-'+si(f)+'}='+si(b)+'\\\\G&='+si(B)+'\\cdot\\frac{'+si(g)+'}{'+si(b)+'}\\end{aligned}','Die Gegenstandsgröße beträgt');
      case'gAF':return make('Mit f = '+cm(f)+' soll ein reelles Bild den Größenfaktor A = '+n(A)+' haben. Welche Gegenstandsweite brauchst du?',['f','A'],'g',g,eq+',\\quad b=Ag','g=f\\left(1+\\frac1A\\right)','g='+si(f)+'\\cdot\\left(1+\\frac1{'+tn(A)+'}\\right)','Die Gegenstandsweite beträgt');
      case'bAF':return make('Mit f = '+cm(f)+' soll ein reelles Bild den Größenfaktor A = '+n(A)+' haben. Bestimme b.',['f','A'],'b',b,eq+',\\quad b=Ag','b=f(1+A)','b='+si(f)+'\\cdot(1+'+tn(A)+')','Die Bildweite beträgt');
      case'fAg':return make('Ein reelles Bild hat den Größenfaktor A = '+n(A)+'. Die Gegenstandsweite beträgt '+cm(g)+'. Welche Brennweite ist dafür nötig?',['A','g'],'f',f,eq+',\\quad b=Ag','f=\\frac{gA}{1+A}','f=\\frac{'+si(g)+'\\cdot'+tn(A)+'}{1+'+tn(A)+'}','Die erforderliche Brennweite beträgt');
      case'fAb':return make('Bei b = '+cm(b)+' entsteht ein reelles Bild mit A = '+n(A)+'. Bestimme f.',['A','b'],'f',f,eq+',\\quad g=b/A','f=\\frac b{1+A}','f=\\frac{'+si(b)+'}{1+'+tn(A)+'}','Die Brennweite beträgt');
      case'spanAF':return make('Eine Linse mit f = '+cm(f)+' soll ein reelles Bild mit A = '+n(A)+' erzeugen. Welcher Abstand L zwischen Gegenstand und Schirm ist nötig?',['f','A'],'L',ell,'L=g+b,\\quad g=f(1+1/A),\\quad b=f(1+A)','L=f(2+A+1/A)','L='+si(f)+'\\cdot\\left(2+'+tn(A)+'+\\frac1{'+tn(A)+'}\\right)','Der benötigte Gegenstand-Schirm-Abstand beträgt');
      case'Afg':return make('Die Sammellinse hat f = '+cm(f)+', der Gegenstand steht bei g = '+cm(g)+'. Bestimme den Größenfaktor A des reellen Bildes.',['f','g'],'A',A,eq+',\\quad A=b/g','A=\\frac f{g-f}','A=\\frac{'+si(f)+'}{'+si(g)+'-'+si(f)+'}','Der Abbildungsmaßstab beträgt','ratio');
      case'minSpan':return make('Für eine Sammellinse mit f = '+cm(f)+' wird die kürzeste Anordnung gesucht, die ein scharfes reelles Bild ermöglicht. Berechne den Mindestabstand L zwischen Gegenstand und Schirm. Nutze den in den Grundlagen erklärten Fall g = b = 2f.',['f'],'L_{\\min}',4*f,'L=g+b,\\quad g=b=2f','L_{\\min}=4f','L_{\\min}=4\\cdot'+si(f),'Der Mindestabstand beträgt');
      case'fSpanA':return make('Gegenstand und Schirm stehen '+cm(ell)+' auseinander. Ein scharfes reelles Bild mit A = '+n(A)+' ist gewünscht. Bestimme die benötigte Brennweite.',['ell','A'],'f',f,'L=f(2+A+1/A)','f=\\frac L{2+A+1/A}','f=\\frac{'+si(ell)+'}{2+'+tn(A)+'+1/'+tn(A)+'}','Die benötigte Brennweite beträgt');
      case'swap':return make(lens+'g = '+cm(g)+', b = '+cm(b)+'. Gegenstand und Schirm bleiben stehen. Wie groß ist die Gegenstandsweite g₂ bei der vertauschten scharfen Anordnung?',['g','b'],'g_2',b,eq,'g_2=b,\\quad b_2=g','g_2='+si(b),'Die zweite Gegenstandsweite beträgt');
      case'shift':return make(lens+'g = '+cm(g)+', b = '+cm(b)+'. Wie weit muss die Linse bei festen Gegenstands- und Schirmpositionen zur vertauschten scharfen Anordnung versetzt werden?',['g','b'],'d',Math.abs(g-b),'d=|g-b|','d=|g-b|','d=|'+si(g)+'-'+si(b)+'|','Die Verschiebung beträgt');
      case'secondHeight':return make('Ein '+cm(G)+' hoher Gegenstand liefert bei g = '+cm(g)+' und b = '+cm(b)+' ein scharfes Bild. Vertausche g und b. Wie groß ist dann B₂?',['G','g','b'],'B_2',G/A,mag,'B_2=G\\,\\frac gb','B_2='+si(G)+'\\cdot\\frac{'+si(g)+'}{'+si(b)+'}','Die zweite Bildgröße beträgt');
      case'gHeights':return make('Ein '+cm(G)+' hoher Gegenstand soll ein '+cm(B)+' hohes reelles Bild liefern. f = '+cm(f)+'. Berechne g.',['G','B','f'],'g',g,mag+',\\quad '+eq,'g=f(1+G/B)','g='+si(f)+'\\cdot\\left(1+\\frac{'+si(G)+'}{'+si(B)+'}\\right)','Die Gegenstandsweite beträgt');
      case'bHeights':return make('Ein '+cm(G)+' hoher Gegenstand soll ein '+cm(B)+' hohes reelles Bild liefern. f = '+cm(f)+'. Berechne b.',['G','B','f'],'b',b,mag+',\\quad '+eq,'b=f(1+B/G)','b='+si(f)+'\\cdot\\left(1+\\frac{'+si(B)+'}{'+si(G)+'}\\right)','Die Bildweite beträgt');
      case'remaining':{const g0=pick([.15,.2,.25,.3]),b0=F*g0/(g0-F),free=.62-g0;return numeric(t,'In der Modellbank steht der Gegenstand bei 6 cm, die Linse '+cm(g0)+' davor in Lichtausbreitungsrichtung. Der Schirm kann bis zur Marke 68 cm fahren. f = 10 cm. Wie viel Strecke bleibt hinter der scharfen Schirmposition bis zur Marke 68 cm?',[L('g','Gegenstandsweite',g0),L('f','Brennweite',F),L('L','Nutzbarer Gegenstand-Schirm-Abstand',.62)],'r',free-b0,eq+',\\quad r=L-g-b','b=\\frac{fg}{g-f},\\quad r=L-g-b','\\begin{aligned}b&=\\frac{'+si(F)+'\\cdot'+si(g0)+'}{'+si(g0)+'-'+si(F)+'}='+si(b0)+'\\\\r&='+si(.62)+'-'+si(g0)+'-'+si(b0)+'\\end{aligned}','Hinter der scharfen Schirmposition bleiben');}
      default:throw Error('Unbekannte Aufgabe');
    }
  }
  function round(seed){const r=rng(seed);return[1,2,3,4,5].flatMap(level=>shuffle(pool.filter(t=>t.level===level),r).slice(0,2).map(t=>build(t,r)));}
  function example(){const t={id:'festes-beispiel',kind:'example',level:3,title:'Die Schirmposition berechnen'};return numeric(t,'Eine Sammellinse hat f = 10 cm. Die Perl-Eins steht g = 15 cm vor der Linse. Bestimme die Bildweite b für das scharfe reelle Bild.',[L('f','Brennweite',.1),L('g','Gegenstandsweite',.15)],'b',.3,'\\frac1f=\\frac1g+\\frac1b','b=\\frac{fg}{g-f}','b=\\frac{0{,}100\\,\\mathrm m\\cdot0{,}150\\,\\mathrm m}{0{,}150\\,\\mathrm m-0{,}100\\,\\mathrm m}','Die Mattscheibe muss hinter der Linse stehen, im Abstand');}
  function parseNumber(raw){const s=String(raw).trim().replace(/\s/g,'').replace(',','.');return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)?Number(s):NaN;}
  function check(t,raw,unit){
    if(t.type==='choice'){const v=Number(raw);return{valid:raw!==''&&Number.isInteger(v)&&v>=0&&v<t.options.length,correct:raw!==''&&v===t.correctIndex};}
    const u=units[t.dimension].find(u=>u[0]===unit),value=parseNumber(raw),v=u?value*u[1]:NaN;if(!Number.isFinite(v))return{valid:false,correct:false};
    const e=Math.abs(t.expectedSI),epsilon=Number.EPSILON*Math.max(e,Math.abs(v))*8;return{valid:true,correct:Math.abs(v-t.expectedSI)<=e*TOLERANCE+epsilon};
  }
  function grade(t,raw,unit,old={attempts:0,status:'open',points:0}){if(old.status!=='open')return old;const c=check(t,raw,unit);if(!c.valid)return{...old,invalid:true};const attempts=old.attempts+1;return{attempts,status:c.correct?'correct':attempts===2?'solved':'open',points:c.correct?(attempts===1?1:.5):0,lastAnswer:String(raw),unit};}
  return Object.freeze({VERSION,F,BANK,OBJECT_X,SCREEN_MAX,OBJECT_HEIGHT,TOLERANCE,units,n,tn,rng,shuffle,image,bench,plotData,pool,round,example,answerFormat,friendly,parseNumber,check,grade});
});

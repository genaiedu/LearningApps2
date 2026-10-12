(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AcidMission=api;})(typeof window==='object'?window:this,function(){
  'use strict';
  const KW=1e-14;
  const substances=[
    {id:'hcl',name:'Salzsäure',formula:'HCl',type:'strong-acid'},
    {id:'hno3',name:'Salpetersäure',formula:'HNO₃',type:'strong-acid'},
    {id:'acetic',name:'Essigsäure',formula:'CH₃COOH',structure:'CH₃—C(=O)—OH',type:'weak-acid',pK:4.76},
    {id:'formic',name:'Ameisensäure',formula:'HCOOH',structure:'H—C(=O)—OH',type:'weak-acid',pK:3.75},
    {id:'naoh',name:'Natronlauge',formula:'NaOH',type:'strong-base'},
    {id:'koh',name:'Kalilauge',formula:'KOH',type:'strong-base'},
    {id:'ammonia',name:'Ammoniak',formula:'NH₃',type:'weak-base',pK:4.75},
    {id:'methylamine',name:'Methylamin',formula:'CH₃NH₂',type:'weak-base',pK:3.36}
  ];
  const polySubstances=[{id:'phosphoric',name:'Phosphorsäure',formula:'H₃PO₄',type:'poly-acid',pKs:[2.15,7.21,12.35]}];
  const get=id=>[...substances,...polySubstances].find(s=>s.id===id);
  function solve({acid=0,ka=0,base=0,kb=0,diff=0,kw=KW}={}){
    if(![acid,ka,base,kb,kw].every(x=>Number.isFinite(x)&&x>=0)||kw===0||!Number.isFinite(diff))throw Error('Ungültige Gleichgewichtsparameter');
    const residual=pH=>{const h=10**(-pH);return h+diff+(base&&kb?base*kb*h/(kw+kb*h):0)-kw/h-(acid&&ka?acid*ka/(ka+h):0);};
    let low=-3,high=17;
    if(residual(low)<0||residual(high)>0)throw Error('Außerhalb des Modellbereichs');
    for(let i=0;i<100;i++){const mid=(low+high)/2;if(residual(mid)>0)low=mid;else high=mid;}
    const pH=(low+high)/2,h=10**(-pH),oh=kw/h;
    return {pH,pOH:-Math.log10(oh),h,oh,acidIon:acid&&ka?acid*ka/(ka+h):0,baseIon:base&&kb?base*kb*h/(kw+kb*h):0,residual:residual(pH)};
  }
  function solution(id,c){const s=get(id);if(s?.pKs)return polySolve({c,pKs:s.pKs});if(!s||!Number.isFinite(c)||c<0)throw Error('Ungültige Probe');const k=10**(-s.pK);return solve(s.type==='strong-acid'?{diff:-c}:s.type==='strong-base'?{diff:c}:s.type==='weak-acid'?{acid:c,ka:k}:{base:c,kb:k});}
  function quadratic(k,c){return 2*k*c/(Math.sqrt(k*k+4*k*c)+k);}
  function titration({id='acetic',c=.1,v=25,ct=.1,added=0}={}){
    const s=get(id);if(!s||![c,v,ct].every(x=>Number.isFinite(x)&&x>0)||!Number.isFinite(added)||added<0)throw Error('Ungültige Titration');
    const total=(v+added)/1000,n=c*v/1000,nt=ct*added/1000,veq=c*v/ct,acid=s.type.endsWith('acid');
    if(s.pKs){const data=polySolve({c:n/total,pKs:s.pKs,diff:nt/total});return {...data,veq,equivalences:s.pKs.map((_,i)=>(i+1)*veq),total,n,nt,region:'Mehrprotoniges Gleichgewicht'};}
    let data;
    if(s.type==='strong-acid'||s.type==='strong-base')data=solve({diff:(acid?nt-n:n-nt)/total});
    else if(acid)data=solve({acid:n/total,ka:10**(-s.pK),diff:nt/total});
    else data=solve({base:n/total,kb:10**(-s.pK),diff:-nt/total});
    return {...data,veq,total,n,nt,region:added===0?'Anfang':Math.abs(added-veq)<1e-8?'Äquivalenzpunkt':Math.abs(added-veq/2)<1e-8&&s.type.startsWith('weak')?'Halbäquivalenzpunkt':added<veq?(s.type.startsWith('weak')?'Pufferbereich':'Vor dem Äquivalenzpunkt'):'Überschuss der Maßlösung'};
  }
  function buffer({pKa=4.76,ha=5,a=5,change=0,volume=100}={}){
    if(![pKa,ha,a,change,volume].every(Number.isFinite)||ha<0||a<0||volume<=0)throw Error('Ungültiger Puffer');
    // Amounts are mmol, volume mL; their quotient is mol/L. Positive change adds OH−, negative H3O+.
    const exact=solve({acid:(ha+a)/volume,ka:10**(-pKa),diff:(a+change)/volume});
    const remainingHA=ha-change,remainingA=a+change,valid=remainingHA>0&&remainingA>0;
    return {...exact,remainingHA,remainingA,hh:valid?pKa+Math.log10(remainingA/remainingHA):null,exhausted:!valid};
  }
  function fractions(pH,pKs){
    const logs=[0];pKs.forEach(pk=>logs.push(logs.at(-1)+pH-pk));
    const max=Math.max(...logs),weights=logs.map(l=>10**(l-max)),sum=weights.reduce((a,b)=>a+b,0);
    return weights.map(w=>w/sum);
  }
  function polySolve({c,pKs,diff=0,kw=KW}){
    if(!Number.isFinite(c)||c<0||!Array.isArray(pKs)||!pKs.length||!pKs.every(Number.isFinite)||!Number.isFinite(diff)||!(kw>0))throw Error('Ungültige mehrprotonige Bilanz');
    const residual=pH=>{const h=10**(-pH),a=fractions(pH,pKs);return h+diff-kw/h-c*a.reduce((v,f,i)=>v+i*f,0);};
    let low=-3,high=17;if(residual(low)<0||residual(high)>0)throw Error('Außerhalb des Modellbereichs');
    for(let i=0;i<100;i++){const mid=(low+high)/2;if(residual(mid)>0)low=mid;else high=mid;}
    const pH=(low+high)/2,h=10**(-pH),oh=kw/h,alpha=fractions(pH,pKs);
    return {pH,pOH:-Math.log10(oh),h,oh,alpha,residual:residual(pH)};
  }
  const indicators=[
    {id:'phenolphthalein',name:'Phenolphthalein',low:8.2,high:10,acid:'#f6f1e5',base:'#c62686',description:'farblos → pink'},
    {id:'bromocresol',name:'Bromkresolgrün',low:3.8,high:5.4,acid:'#e9ce3a',base:'#2475bb',description:'gelb → blau (grün im Umschlag)'},
    {id:'methylorange',name:'Methylorange',low:3.1,high:4.4,acid:'#d84235',base:'#e6c438',description:'rot → gelb'},
    {id:'bromthymol',name:'Bromthymolblau',low:6,high:7.6,acid:'#e5cb3c',base:'#297bc4',description:'gelb → blau (grün im Umschlag)'}
  ];
  function crossing(previous,next,targets,unitVolume){
    return targets.some(v=>previous<=v+1e-10&&next>v+1e-10&&(next-previous)>Math.max(.05,unitVolume*.01)+1e-10);
  }
  function measurementsComplete(points,targets,unitVolume){
    const band=Math.max(.05,unitVolume*.02);
    return points.length>=8&&targets.every(v=>points.some(p=>p[0]<v&&v-p[0]<=band)&&points.some(p=>p[0]>v&&p[0]-v<=band))&&points[0][0]===0;
  }
  function bloodBuffer({bicarbonate=24,co2=1.2,load=1,ventilated=false}={}){
    if(![bicarbonate,co2,load].every(Number.isFinite)||bicarbonate<=0||co2<=0||load<0||load>=bicarbonate)throw Error('Ungültige Blutpuffer-Modellwerte');
    const before=6.1+Math.log10(bicarbonate/co2),after=6.1+Math.log10((bicarbonate-load)/(ventilated?co2:co2+load));
    return {before,after,delta:after-before};
  }
  function rng(seed){let x=seed>>>0;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  function shuffle(items,r=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function parseNumber(value){const text=String(value).trim().replace(/\s/g,'').replace(',','.');return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)?Number(text):NaN;}
  function accepts(task,value){if(task.kind==='choice')return String(value)===String(task.answer);const n=parseNumber(value),tolerance=Math.max(task.absolute||0,Math.abs(task.answer)*(task.relative??.02),Number.EPSILON*Math.abs(task.answer)*10);return Number.isFinite(n)&&Math.abs(n-task.answer)<=tolerance;}
  return {KW,substances,polySubstances,indicators,fractions,polySolve,crossing,measurementsComplete,bloodBuffer,get,solve,solution,quadratic,titration,buffer,rng,shuffle,parseNumber,accepts};
});

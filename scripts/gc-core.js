(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GCLab=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const defaults={detector:'ms',phase:'nonpolar',length:30,flow:1,temperature:60,ramp:8,endTemperature:240,runtime:12,split:20,volume:1,realistic:true};
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 function rng(seed=1){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
 function settings(input={}){
  const s={...defaults,...input};
  for(const [key,lo,hi] of [['length',15,60],['flow',.5,3],['temperature',40,180],['ramp',0,25],['endTemperature',180,280],['runtime',4,30],['split',0,100],['volume',.2,5]]){const n=Number(s[key]);if(!Number.isFinite(n)||n<lo||n>hi)throw Error('Ungültige Methode: '+key);s[key]=n;}
  if(!['ms','fid'].includes(s.detector)||!['nonpolar','polar'].includes(s.phase))throw Error('Unbekannter Detektor oder unbekannte Säule');s.realistic=Boolean(s.realistic);return s;
 }
 function fingerprint(input){const s=settings(input);return Object.keys(defaults).map(k=>k+':'+s[k]).join('|');}
 function oven(t,s){return Math.min(s.endTemperature,s.temperature+Math.max(0,t-.8)*s.ramp);}
 // Illustrative forced-air cooling, not a measured manufacturer curve. Times are minutes.
 function cooldown(from,target,elapsed=0){
  if(![from,target,elapsed].every(Number.isFinite)||elapsed<0||from<target)throw Error('Ungültige Abkühlparameter');
  const drop=from-target,minutes=drop<.05?0:clamp(.75+drop/70,1,4),p=minutes?clamp(elapsed/minutes,0,1):1;
  const fraction=(Math.exp(-3*p)-Math.exp(-3))/(1-Math.exp(-3));
  return {temperature:p===1?target:target+drop*fraction,minutes,done:p===1};
 }
 function holdUp(s){return .36*(s.length/30)/s.flow;}
 function retention(record,input){
  const s=settings(input),tm=holdUp(s),m=record.model,step=.005;let travelled=0;
  for(let t=0;t<=s.runtime;t+=step){const temperature=oven(t+step/2,s)+273.15;const polar=s.phase==='polar'?Math.exp(m.polarity*.42):1;
   const k=m.k80*polar*Math.exp(m.enthalpy*1000/8.314*(1/temperature-1/353.15));
   const d=step/(tm*(1+k));if(travelled+d>=1)return t+(1-travelled)*step/d;travelled+=d;
  }return null;
 }
 function peakShape(t,p){
  if(Math.abs(t-p.mu)>12*p.sigma+8*p.tau)return 0;
  let sum=0,total=0;for(let j=0;j<14;j++){const weight=Math.exp(-j*.45),z=(t-p.mu-j*p.tau*.45)/p.sigma;sum+=weight*Math.exp(-.5*z*z);total+=weight;}
  return p.area*sum/(total*p.sigma*Math.sqrt(2*Math.PI));
 }
 function background(t,s){return .16+.006*t+.000004*Math.pow(oven(t,s)-40,2);}
 function simulate(library,mixture,input={},seed=1){
  const s=settings(input),random=rng(seed),gain=s.realistic?1+(random()-.5)*.05:1,components=[],merged=new Map();
  if(!Array.isArray(mixture)||mixture.length>8)throw Error('Höchstens acht Komponenten pro Mischung');
  for(const item of mixture){const c=Number(item.c);if(!Number.isFinite(c)||c<0||c>500)throw Error('Konzentration muss zwischen 0 und 500 mg/L liegen');if(!library.some(r=>r.id===item.id))throw Error('Stoff nicht in der Bibliothek');merged.set(item.id,(merged.get(item.id)||0)+c);}
  for(const [id,c] of merged){if(!c)continue;const record=library.find(r=>r.id===id),mu=retention(record,s);if(mu===null){components.push({id,c,record,mu:null,area:0,sigma:0,tau:0});continue;}
   const efficiency=11000*(s.length/30)/(.3/s.flow+.35*s.flow+.35),load=c*s.volume/(s.split+1),overload=s.realistic?Math.max(0,load-35)/80:0;
   const sigma=Math.max(.012,mu/Math.sqrt(efficiency))*(1+overload),tau=sigma*(s.realistic?.32+record.model.polarity*.10+overload:.08);
   // FID and TIC use different, explicit model response factors, not equal area percentages.
   const response=record.model.response*(s.detector==='ms'?(.7+record.mass/240):1);
   components.push({id,c,record,mu,sigma,tau,area:load*response*gain});
  }
  const count=3600,points=[],baseline=[],noise=s.realistic?.018:0;let saturated=false;
  for(let i=0;i<=count;i++){const t=s.runtime*i/count,b=background(t,s),signal=components.reduce((v,p)=>v+(p.mu===null?0:peakShape(t,p)),0);
   if(signal>1800)saturated=true;const y=b+Math.min(1800,signal)+(random()+random()+random()-1.5)*noise;
   points.push([t,y]);baseline.push([t,b]);
  }
  return {settings:s,seed,points,baseline,components,saturated,gain,noise,notice:'Simuliertes Chromatogramm; experimentelle EI-Referenzspektren. Keine validierte Messmethode.'};
 }
 function interpolate(points,t){if(t<points[0][0]||t>points[points.length-1][0])return null;const i=clamp(Math.floor(t/(points[points.length-1][0]/(points.length-1))),0,points.length-2),[a,b]=[points[i],points[i+1]];return a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0]);}
 function corrected(run,blank){return run.points.map(([t,y],i)=>[t,y-(blank?interpolate(blank.points,t):run.baseline[i][1])]);}
 function integrate(points,start,end){if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end)return null;let area=0;for(let i=1;i<points.length;i++){const [a,b]=[points[i-1],points[i]],lo=Math.max(a[0],start),hi=Math.min(b[0],end);if(hi<=lo)continue;const f=x=>a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);area+=(f(lo)+f(hi))*.5*(hi-lo);}return area;}
 function peaks(run,blank){
  const points=corrected(run,blank),ys=points.map((p,i)=>i>0&&i<points.length-1?(points[i-1][1]+2*p[1]+points[i+1][1])/4:p[1]),max=Math.max(...ys),threshold=Math.max(run.noise*7,max*.004,.03),found=[];
  for(let i=2;i<ys.length-2;i++)if(ys[i]>threshold&&ys[i]>ys[i-1]&&ys[i]>=ys[i+1]){
   if(found.length&&i-found[found.length-1]<5){if(ys[i]>ys[found[found.length-1]])found[found.length-1]=i;}else found.push(i);
  }
  return found.slice(0,40).map((index,k)=>{
   let left=index,right=index;const cutoff=Math.max(run.noise*2,ys[index]*.004);
   while(left>0&&ys[left]>cutoff&&left>(k?found[k-1]:0)){if(left<index-3&&ys[left-1]>ys[left]&&ys[left]<ys[index]*.25)break;left--;}
   while(right<ys.length-1&&ys[right]>cutoff&&right<(found[k+1]||ys.length-1)){if(right>index+3&&ys[right+1]>ys[right]&&ys[right]<ys[index]*.25)break;right++;}
   const t=points[index][0],width=points[right][0]-points[left][0],area=integrate(points,points[left][0],points[right][0]);
   return {number:k+1,time:t,height:ys[index],start:points[left][0],end:points[right][0],width,area,overlap:(left>0&&ys[left]>ys[index]*.1)||(right<ys.length-1&&ys[right]>ys[index]*.1)};
  });
 }
 function spectrumAt(run,t){
  const bins=new Map();for(const p of run.components){if(p.mu===null)continue;const signal=peakShape(t,p),sum=p.record.peaks.reduce((s,q)=>s+q[1],0);for(const [mz,intensity] of p.record.peaks)bins.set(mz,(bins.get(mz)||0)+signal*intensity/sum);}
  const max=Math.max(0,...bins.values());if(max<.02)return [];return [...bins].filter(([,y])=>y/max>.0001).map(([mz,y])=>[mz,100*y/max]).sort((a,b)=>a[0]-b[0]);
 }
 function eic(run,mz){
  if(!Number.isInteger(mz)||mz<10||mz>220)throw Error('m/z zwischen 10 und 220 wählen');
  const fractions=run.components.map(p=>[p,p.record.peaks.filter(q=>q[0]===mz).reduce((v,q)=>v+q[1],0)/p.record.peaks.reduce((v,q)=>v+q[1],0)]);
  return run.points.map(([t,y],i)=>{const total=run.components.reduce((v,p)=>v+(p.mu===null?0:peakShape(t,p)),0);const noise=y-run.baseline[i][1]-Math.min(1800,total);return [t,Math.min(1800,fractions.reduce((sum,[p,f])=>sum+(p.mu===null?0:peakShape(t,p)*f),0))+noise*.08];});
 }
 function cosine(a,b){const m=new Map(b),dot=a.reduce((v,[mz,y])=>v+y*(m.get(mz)||0),0),aa=a.reduce((v,p)=>v+p[1]*p[1],0),bb=b.reduce((v,p)=>v+p[1]*p[1],0);return aa&&bb?dot/Math.sqrt(aa*bb):0;}
 function matches(spectrum,library){return library.map(record=>({record,score:cosine(spectrum,record.peaks)})).sort((a,b)=>b.score-a.score);}
 function regression(rows){
  if(rows.length<4||new Set(rows.map(p=>p.x)).size<4||!rows.some(p=>p.x===0)||rows.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
  const n=rows.length,x=rows.reduce((v,p)=>v+p.x,0)/n,y=rows.reduce((v,p)=>v+p.y,0)/n,xx=rows.reduce((v,p)=>v+(p.x-x)**2,0);if(!xx)return null;
  const slope=rows.reduce((v,p)=>v+(p.x-x)*(p.y-y),0)/xx,intercept=y-slope*x,total=rows.reduce((v,p)=>v+(p.y-y)**2,0),residual=rows.reduce((v,p)=>v+(p.y-intercept-slope*p.x)**2,0);
  return {slope,intercept,r2:total?1-residual/total:1,min:Math.min(...rows.map(p=>p.x)),max:Math.max(...rows.map(p=>p.x))};
 }
 function resolution(a,b){return a&&b?Math.abs(b.time-a.time)/(Math.max(.001,a.width+b.width)/2):null;}
 function measureTarget(run,record,blank){
  const t=retention(record,run.settings);if(t===null||run.saturated)return null;
  const measured=peaks(run,blank).filter(p=>Math.abs(p.time-t)<Math.max(.08,t*.025)).sort((a,b)=>Math.abs(a.time-t)-Math.abs(b.time-t))[0];
  // A zero-concentration standard is still integrated in the same reference window.
  if(!measured){const area=integrate(corrected(run,blank),Math.max(0,t-.08),Math.min(run.settings.runtime,t+.12));return {area:Math.max(0,area),time:t,overlap:false,blank:true};}
  return measured;
 }
 return {defaults,settings,fingerprint,rng,oven,cooldown,holdUp,retention,peakShape,simulate,interpolate,corrected,integrate,peaks,spectrumAt,eic,cosine,matches,regression,resolution,measureTarget};
});

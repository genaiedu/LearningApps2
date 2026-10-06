(function(root){
  'use strict';
  function interpolate(points,x){
    if(!Number.isFinite(x)||x<points[0][0]||x>points.at(-1)[0])return null;
    let lo=0,hi=points.length-1;
    while(hi-lo>1){const m=(lo+hi)>>1;if(points[m][0]>x)hi=m;else lo=m;}
    if(points[lo][0]===x)return points[lo][1];
    const a=points[lo],b=points[hi];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
  }
  function spectrum(record,pH){return record.curves?record.curves.find(c=>c.pH===Number(pH))?.points:record.points;}
  function cutoff(solvent,material){
    let cut=190;const s=String(solvent).toLowerCase();
    if(/chloroform/.test(s))cut=245;else if(/dichloromethane|methylene chloride/.test(s))cut=235;else if(/dimethyl sulfoxide|dmso/.test(s))cut=265;else if(/acetone/.test(s))cut=330;else if(/cyclohexane|hexane/.test(s))cut=200;else if(/ethanol|methanol/.test(s))cut=210;else if(/acetonitrile/.test(s))cut=190;else if(/toluene/.test(s))cut=285;else if(/benzene/.test(s))cut=280;
    return Math.max(cut,material==='glass'?350:190);
  }
  function absorbance(record,x,settings){
    const points=spectrum(record,settings.pH);if(!points||x<cutoff(record.solvent,settings.material))return null;
    const y=interpolate(points,x);if(y===null)return null;
    return Math.max(0,y)*(record.unit==='epsilon'?settings.c*1e-6:settings.factor)*settings.path;
  }
  // Finite bandwidth averages transmitted light, not absorbance. Rectangular
  // slit profile is an explicitly simplified instrument model.
  function measure(record,x,settings,rng=Math.random){
    if(![settings.c,settings.factor,settings.path,settings.bandwidth].every(Number.isFinite)||settings.path<=0)return null;
    let transmission=0,n=0;
    for(let i=0;i<9;i++){const offset=(i-4)*settings.bandwidth/8;const a=absorbance(record,x+offset,settings);if(a===null)return null;transmission+=10**(-a);n++;}
    let t=transmission/n;
    if(settings.realistic){t=(t+.0005)/(1.0005);t+=(rng()-.5)*.0008;}
    t=Math.max(1e-8,Math.min(1,t));return {A:-Math.log10(t),T:t,I0:100,I:t*100};
  }
  function peak(points,lo,hi){return points.filter(p=>p[0]>=lo&&p[0]<=hi).reduce((a,b)=>!a||b[1]>a[1]?b:a,null);}
  function regression(rows){
    if(rows.length<3||new Set(rows.map(r=>r.c)).size<3)return null;
    const n=rows.length,mx=rows.reduce((s,r)=>s+r.c,0)/n,my=rows.reduce((s,r)=>s+r.A,0)/n;
    const xx=rows.reduce((s,r)=>s+(r.c-mx)**2,0),xy=rows.reduce((s,r)=>s+(r.c-mx)*(r.A-my),0);
    if(xx===0)return null;const slope=xy/xx,intercept=my-slope*mx;
    const total=rows.reduce((s,r)=>s+(r.A-my)**2,0),residual=rows.reduce((s,r)=>s+(r.A-intercept-slope*r.c)**2,0);
    return {slope,intercept,r2:total?Math.max(0,1-residual/total):0,min:Math.min(...rows.map(r=>r.c)),max:Math.max(...rows.map(r=>r.c))};
  }
  function shuffle(items,rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  const api={interpolate,spectrum,cutoff,absorbance,measure,peak,regression,shuffle};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.UVVis=api;
})(typeof window==='undefined'?globalThis:window);

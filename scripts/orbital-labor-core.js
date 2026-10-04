/* Original qualitative teaching models. Ground configurations: NIST;
   AO angular functions: real spherical harmonics; MO: elementary LCAO/Hückel.
   No experimental orbital densities or quantitative molecular energies implied. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.OrbitalCore=api;
})(typeof self!=='undefined'?self:globalThis,function(){
  'use strict';
  const names='Wasserstoff Helium Lithium Beryllium Bor Kohlenstoff Stickstoff Sauerstoff Fluor Neon Natrium Magnesium Aluminium Silicium Phosphor Schwefel Chlor Argon Kalium Calcium Scandium Titan Vanadium Chrom Mangan Eisen Cobalt Nickel Kupfer Zink Gallium Germanium Arsen Selen Brom Krypton Rubidium Strontium Yttrium Zirconium Niob Molybdän Technetium Ruthenium Rhodium Palladium Silber Cadmium Indium Zinn Antimon Tellur Iod Xenon'.split(' ');
  const symbols='H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe'.split(' ');
  const groups=[1,18,1,2,13,14,15,16,17,18,1,2,13,14,15,16,17,18,...Array.from({length:18},(_,i)=>i+1),...Array.from({length:18},(_,i)=>i+1)];
  const order=['1s','2s','2p','3s','3p','4s','3d','4p','5s','4d','5p'];
  const exceptions={24:{'4s':1,'3d':5},29:{'4s':1,'3d':10},41:{'5s':1,'4d':4},42:{'5s':1,'4d':5},44:{'5s':1,'4d':7},45:{'5s':1,'4d':8},46:{'5s':0,'4d':10},47:{'5s':1,'4d':10}};
  const capacity={s:2,p:6,d:10};
  const orientations={s:['s'],p:['px','py','pz'],d:['dxy','dxz','dyz','dx2-y2','dz2']};
  function configuration(z){
    let remaining=z; const result={};
    for(const shell of order){const count=Math.min(remaining,capacity[shell[1]]); if(count)result[shell]=count; remaining-=count;}
    Object.assign(result,exceptions[z]||{});
    return result;
  }
  const elements=symbols.map((symbol,index)=>{
    const z=index+1,config=configuration(z),period=z<=2?1:z<=10?2:z<=18?3:z<=36?4:5;
    const outer=Math.max(...Object.keys(config).filter(key=>config[key]>0).map(key=>Number(key[0])));
    const shells=Array.from({length:outer},(_,n)=>Object.entries(config).filter(([key])=>Number(key[0])===n+1).reduce((sum,[,count])=>sum+count,0));
    return {z,symbol,name:names[index],period,group:groups[index],transition:groups[index]>=3 && groups[index]<=12,config,outer,shells};
  });
  const bySymbol=Object.fromEntries(elements.map(e=>[e.symbol,e]));
  function orbitalOccupancy(count,size){return Array.from({length:size},(_,i)=>(count>i?1:0)+(count>size+i?1:0));}
  function outerOrbitals(element){
    return Object.entries(element.config).filter(([key,count])=>Number(key[0])===element.outer && count>0).flatMap(([key,count])=>{
      const types=orientations[key[1]],occupancy=orbitalOccupancy(count,types.length);
      return types.map((type,index)=>({id:`${key[0]}${type}`,n:element.outer,type,count:occupancy[index],subshell:key}));
    });
  }
  function laguerre(k,alpha,x){
    if(k===0)return 1;
    let a=1,b=1+alpha-x;
    for(let j=2;j<=k;j++){const c=((2*j-1+alpha-x)*b-(j-1+alpha)*a)/j;a=b;b=c;}
    return b;
  }
  function angular(type,x,y,z,r){
    if(type==='s')return 1;
    if(r<1e-10)return 0;
    if(type==='px')return x/r;if(type==='py')return y/r;if(type==='pz')return z/r;
    const r2=r*r;
    if(type==='dxy')return Math.sqrt(3)*x*y/r2;
    if(type==='dxz')return Math.sqrt(3)*x*z/r2;
    if(type==='dyz')return Math.sqrt(3)*y*z/r2;
    if(type==='dx2-y2')return Math.sqrt(3)/2*(x*x-y*y)/r2;
    return (2*z*z-x*x-y*y)/(2*r2);
  }
  function atomicValue(spec,x,y,z){
    const r=Math.hypot(x,y,z),l=spec.type==='s'?0:spec.type[0]==='p'?1:2;
    const angle=angular(spec.type,x,y,z,r);
    if(!spec.radial)return Math.pow(r,l)*Math.exp(-1.6*r)*angle;
    // r is displayed in n²-scaled, dimensionless units. Z_eff is not fitted.
    const rho=2*spec.n*r;
    return Math.pow(rho,l)*laguerre(spec.n-l-1,2*l+1,rho)*Math.exp(-rho/2)*angle;
  }
  const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
  const minus=(a,b)=>a.map((v,i)=>v-b[i]);
  function normal(a,b){const v=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],r=Math.hypot(...v);return v.map(x=>x/r*(v[2]<0?-1:1));}
  function ringGeometry(size,tub){
    const radius=size===6?2.05:2.45;
    const atoms=Array.from({length:size},(_,i)=>{const a=2*Math.PI*(i+.5)/size;return [radius*Math.cos(a),radius*Math.sin(a),tub ? .62*Math.sin(2*a) : 0];});
    const normals=atoms.map((p,i)=>normal(minus(atoms[(i+1)%size],p),minus(atoms[(i+size-1)%size],p)));
    return {atoms,normals};
  }
  function eigenSymmetric(matrix){
    const n=matrix.length,a=matrix.map(row=>[...row]),v=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>Number(i===j)));
    for(let iter=0;iter<100*n*n;iter++){
      let p=0,q=1,max=0;
      for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(a[i][j])>max){max=Math.abs(a[i][j]);p=i;q=j;}
      if(max<1e-12)break;
      const angle=.5*Math.atan2(2*a[p][q],a[q][q]-a[p][p]),c=Math.cos(angle),s=Math.sin(angle),app=a[p][p],aqq=a[q][q],apq=a[p][q];
      a[p][p]=c*c*app-2*s*c*apq+s*s*aqq;a[q][q]=s*s*app+2*s*c*apq+c*c*aqq;a[p][q]=a[q][p]=0;
      for(let k=0;k<n;k++){
        if(k!==p && k!==q){const akp=a[k][p],akq=a[k][q];a[k][p]=a[p][k]=c*akp-s*akq;a[k][q]=a[q][k]=s*akp+c*akq;}
        const vkp=v[k][p],vkq=v[k][q];v[k][p]=c*vkp-s*vkq;v[k][q]=s*vkp+c*vkq;
      }
    }
    return Array.from({length:n},(_,i)=>({energy:a[i][i],coeff:v.map(row=>row[i])})).sort((a,b)=>a.energy-b.energy);
  }
  function fillLevels(levels,electrons){
    levels.forEach(level=>level.count=0);
    for(let i=0;i<levels.length && electrons>0;){
      let end=i+1;while(end<levels.length && Math.abs(levels[end].energy-levels[i].energy)<1e-7)end++;
      for(let pass=0;pass<2;pass++)for(let j=i;j<end && electrons>0;j++){levels[j].count++;electrons--;}
      i=end;
    }
    return levels;
  }
  function ringLevels(size,tub){
    const {atoms,normals}=ringGeometry(size,tub);
    const matrix=Array.from({length:size},()=>Array(size).fill(0));
    for(let i=0;i<size;i++){const j=(i+1)%size,strength=tub?(i%2===0?1:.22*Math.max(0,dot(normals[i],normals[j]))):1;matrix[i][j]=matrix[j][i]=-strength;}
    const levels=eigenSymmetric(matrix).map((level,index)=>({...level,id:`pi-${index+1}`,label:`π${index+1}`,kind:level.energy < -1e-7?'bonding':level.energy>1e-7?'antibonding':'nonbonding',basis:'ring',atoms,normals}));
    return fillLevels(levels,size);
  }
  function diatomicLevels(key){
    if(key==='H2'||key==='He2')return [{id:'s1+',label:'σ1s',basis:'1s',sign:1,energy:-1,kind:'bonding',count:2},{id:'s1-',label:'σ*1s',basis:'1s',sign:-1,energy:1,kind:'antibonding',count:key==='He2'?2:0}];
    const n=key==='N2';
    const levels=[
      {id:'s2+',label:'σ2s',basis:'2s',sign:1,energy:-4,kind:'bonding'},
      {id:'s2-',label:'σ*2s',basis:'2s',sign:-1,energy:-3,kind:'antibonding'},
      {id:'pz+',label:'σ2pᶻ',basis:'pz',sign:-1,energy:n?-1:-2,kind:'bonding'},
      {id:'px+',label:'π2pˣ',basis:'px',sign:1,energy:n?-2:-1,kind:'bonding'},
      {id:'py+',label:'π2pʸ',basis:'py',sign:1,energy:n?-2:-1,kind:'bonding'},
      {id:'px-',label:'π*2pˣ',basis:'px',sign:-1,energy:1,kind:'antibonding'},
      {id:'py-',label:'π*2pʸ',basis:'py',sign:-1,energy:1,kind:'antibonding'},
      {id:'pz-',label:'σ*2pᶻ',basis:'pz',sign:1,energy:2,kind:'antibonding'}
    ].sort((a,b)=>a.energy-b.energy);
    return fillLevels(levels,n?10:12);
  }
  function levelsFor(key,tub=true){return key==='benzene'?ringLevels(6,false):key==='cot'?ringLevels(8,tub):diatomicLevels(key);}
  function bondOrder(levels){return levels.reduce((sum,o)=>sum+(o.kind==='bonding'?o.count:o.kind==='antibonding'?-o.count:0),0)/2;}
  function basisValue(type,x,y,z){
    const r=Math.hypot(x,y,z);
    if(type==='1s')return Math.exp(-1.5*r);
    if(type==='2s')return (1-1.5*r)*Math.exp(-1.5*r);
    return (type==='px'?x:type==='py'?y:z)*Math.exp(-1.5*r);
  }
  function molecularValue(spec,x,y,z){
    const level=spec.level;
    if(level.basis==='ring')return level.atoms.reduce((sum,p,i)=>{const r=[x-p[0],y-p[1],z-p[2]];return sum+level.coeff[i]*dot(r,level.normals[i])*Math.exp(-1.6*Math.hypot(...r));},0);
    return basisValue(level.basis,x,y,z+.82)+level.sign*basisValue(level.basis,x,y,z-.82);
  }
  function fieldValue(spec,x,y,z){return spec.mode==='ao'?atomicValue(spec,x,y,z):molecularValue(spec,x,y,z);}
  return {elements,bySymbol,order,configuration,outerOrbitals,orbitalOccupancy,laguerre,atomicValue,ringGeometry,eigenSymmetric,levelsFor,bondOrder,molecularValue,fieldValue};
});

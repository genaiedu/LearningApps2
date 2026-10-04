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
  function subshellOrbitals(element,key){
    const count=element.config[key],types=orientations[key?.[1]];
    if(!count || !types)return [];
    const occupancy=orbitalOccupancy(count,types.length),n=Number(key[0]);
    return types.map((type,index)=>({id:`${n}${type}`,n,type,count:occupancy[index],subshell:key}));
  }
  function outerOrbitals(element){
    return order.filter(key=>Number(key[0])===element.outer).flatMap(key=>subshellOrbitals(element,key));
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
    if(type==='dz2')return (2*z*z-x*x-y*y)/(2*r2);
    const r3=r2*r;
    // Seven real tesseral l=3 harmonics, in an orthogonal conventional basis.
    // Overall normalization is irrelevant to relative-isovalue surfaces.
    if(type==='fz3')return z*(5*z*z-3*r2)/r3;
    if(type==='fxz2')return x*(5*z*z-r2)/r3;
    if(type==='fyz2')return y*(5*z*z-r2)/r3;
    if(type==='fzx2-y2')return z*(x*x-y*y)/r3;
    if(type==='fxyz')return x*y*z/r3;
    if(type==='fx3-3xy2')return x*(x*x-3*y*y)/r3;
    if(type==='f3x2y-y3')return y*(3*x*x-y*y)/r3;
    throw new Error('Unbekannte Orbitalform');
  }
  function atomicValue(spec,x,y,z){
    const r=Math.hypot(x,y,z),l={s:0,p:1,d:2,f:3}[spec.type[0]];
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
  const hydrocarbonKeys=['methane','ethane','ethene','ethyne'];
  const polyatomicKeys=[...hydrocarbonKeys,'water','ammonia'];
  function polyatomicGeometry(key){
    const atoms=[],labels=[],bonds=[];
    const add=(label,point)=>{labels.push(label);atoms.push(point);return atoms.length-1;};
    const hydrogen=(center,direction,length=1.09)=>{const h=add('H',atoms[center].map((v,i)=>v+length*direction[i]));bonds.push([center,h]);};
    if(key==='water'){
      add('O',[0,0,0]);const angle=104.5*Math.PI/360;
      [-1,1].forEach(side=>hydrogen(0,[side*Math.sin(angle),0,Math.cos(angle)],.96));
    }else if(key==='ammonia'){
      add('N',[0,0,0]);const z=-Math.sqrt((1+2*Math.cos(107*Math.PI/180))/3),radius=Math.sqrt(1-z*z);
      for(let i=0;i<3;i++){const angle=i*2*Math.PI/3;hydrogen(0,[radius*Math.cos(angle),radius*Math.sin(angle),z],1.01);}
    }else if(key==='methane'){
      add('C',[0,0,0]);
      [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].forEach(v=>hydrogen(0,v.map(x=>x/Math.sqrt(3))));
    }else{
      const half=key==='ethane'?.765:key==='ethene'?.67:.60;
      add('C',[-half,0,0]);add('C',[half,0,0]);bonds.push([0,1]);
      for(let carbon=0;carbon<2;carbon++){
        const side=carbon===0?-1:1;
        if(key==='ethane')for(let i=0;i<3;i++){
          const angle=2*Math.PI*i/3+carbon*Math.PI/3;
          hydrogen(carbon,[side/3,Math.sqrt(8/9)*Math.cos(angle),Math.sqrt(8/9)*Math.sin(angle)]);
        }
        else if(key==='ethene')[-1,1].forEach(sign=>hydrogen(carbon,[side/2,sign*Math.sqrt(3)/2,0]));
        else hydrogen(carbon,[side,0,0]);
      }
    }
    return {atoms,labels,bonds};
  }
  function polyatomicLevels(key){
    const {atoms,labels,bonds}=polyatomicGeometry(key),aos=[];
    labels.forEach((label,atom)=>(label!=='H'?['2s','px','py','pz']:['1s']).forEach(type=>aos.push({atom,type})));
    // Original qualitative valence-only LCAO model. These on-site and bond
    // parameters are illustrative, not fitted orbital energies. Bond direction
    // cosines preserve tetrahedral symmetry and the separate pi subspaces.
    const onsite={C:{s:-1.8,p:-.8},N:{s:-2.1,p:-1.1},O:{s:-2.4,p:-1.6}};
    const h=aos.map(a=>aos.map(b=>a===b?(a.type==='1s'?-1:onsite[labels[a.atom]][a.type==='2s'?'s':'p']):0));
    const axis=type=>({px:0,py:1,pz:2})[type];
    for(const [a,b] of bonds){
      const direction=minus(atoms[b],atoms[a]),length=Math.hypot(...direction),u=direction.map(v=>v/length);
      for(let i=0;i<aos.length;i++)for(let j=0;j<aos.length;j++){
        const left=aos[i],right=aos[j];if(left.atom!==a||right.atom!==b)continue;
        const p=axis(left.type),q=axis(right.type);let coupling;
        if(labels[b]==='H')coupling=p===undefined?-({C:1,N:.9,O:.65}[labels[a]]):-1.2*u[p];
        else if(p===undefined&&q===undefined)coupling=-1;
        else if(p===undefined)coupling=1.1*u[q];
        else if(q===undefined)coupling=-1.1*u[p];
        else{const pi=key==='ethyne'?-.48:key==='ethene'?-.40:-.30;coupling=pi*Number(p===q)+(1.4-pi)*u[p]*u[q];}
        h[i][j]=h[j][i]=coupling;
      }
    }
    const electrons=labels.reduce((sum,label)=>sum+({C:4,N:5,O:6,H:1}[label]),0);
    const levels=fillLevels(eigenSymmetric(h),electrons),counts={sigma:0,pi:0,sigmaStar:0,piStar:0};
    const subscripts=['₁','₂','₃','₄','₅','₆','₇'];let t2=0,t2Star=0,a1=2,b2=1,e=0;
    return levels.map((level,index)=>{
      const piWeight=aos.reduce((sum,ao,i)=>sum+((key==='ethene'&&ao.type==='pz')||(key==='ethyne'&&['py','pz'].includes(ao.type))?level.coeff[i]**2:0),0);
      const loneCount=key==='water'?2:key==='ammonia'?1:0,occupied=level.count>0;
      const lone=occupied&&index>=electrons/2-loneCount;
      const family=lone?'lone':piWeight>.9?'pi':'sigma',kind=lone?'nonbonding':occupied?'bonding':'antibonding';
      const serial=lone?index-(electrons/2-loneCount)+1:++counts[family+(occupied?'':'Star')];let label=lone?`n${subscripts[serial-1]}`:`${family==='pi'?'π':'σ'}${occupied?'':'*'}${subscripts[serial-1]}`;
      if(key==='methane'){
        const a1=Math.abs(level.coeff[0])>.1;
        label=`σ${occupied?'':'*'}(${a1?'a₁':'t₂'})${a1?'':subscripts[(occupied?t2++:t2Star++)]}`;
      }
      if(key==='water'){
        const outOfPlane=Math.abs(level.coeff[2])>.9,inPlaneOdd=Math.abs(level.coeff[0])<1e-8&&Math.abs(level.coeff[3])<1e-8;
        label=outOfPlane?'1b₁':inPlaneOdd?`${b2++}b₂`:`${a1++}a₁`;
        if(lone)label+=' · n';
      }
      if(key==='ammonia'){
        const eWeight=level.coeff[1]**2+level.coeff[2]**2;
        label=eWeight>.1?`${Math.floor(e++/2)+1}e${e%2===1?'₁':'₂'}`:`${a1++}a₁`;
        if(lone)label+=' · n';
      }
      return {...level,id:`valence-${index+1}`,label,kind,basis:'valence',family,atoms,atomLabels:labels,bonds,aos,key};
    });
  }
  function levelsFor(key,tub=true){return key==='benzene'?ringLevels(6,false):key==='cot'?ringLevels(8,tub):polyatomicKeys.includes(key)?polyatomicLevels(key):diatomicLevels(key);}
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
    if(level.basis==='valence')return level.aos.reduce((sum,ao,i)=>{
      const p=level.atoms[ao.atom],r=[x-p[0],y-p[1],z-p[2]];
      // The 2s phase convention is positive in its outer radial region.
      const value=ao.type==='1s'?basisValue('1s',...r):ao.type==='2s'?-atomicValue({n:2,type:'s',radial:true},...r):atomicValue({n:2,type:ao.type,radial:true},...r);
      return sum+level.coeff[i]*value;
    },0);
    return basisValue(level.basis,x,y,z+.82)+level.sign*basisValue(level.basis,x,y,z-.82);
  }
  function fieldValue(spec,x,y,z){return spec.mode==='ao'?atomicValue(spec,x,y,z):molecularValue(spec,x,y,z);}
  return {elements,bySymbol,order,configuration,subshellOrbitals,outerOrbitals,orbitalOccupancy,laguerre,atomicValue,ringGeometry,polyatomicGeometry,polyatomicKeys,hydrocarbonKeys,eigenSymmetric,levelsFor,bondOrder,molecularValue,fieldValue};
});

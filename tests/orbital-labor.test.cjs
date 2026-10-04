const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../scripts/orbital-labor-core.js');
const S=require('../scripts/orbital-labor-surface.js');
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);

test('Seven f forms are odd, homogeneous harmonic cubics with independent angular directions',()=>{
  const types=['fz3','fxz2','fyz2','fzx2-y2','fxyz','fx3-3xy2','f3x2y-y3'];
  const polynomial=(type,p)=>C.atomicValue({type,n:4},...p)*Math.exp(1.6*Math.hypot(...p));
  for(const type of types){
    const p=[.43,.67,.81],h=.001,value=polynomial(type,p);
    near(value,-polynomial(type,p.map(v=>-v)));near(polynomial(type,p.map(v=>2*v)),8*value);
    const laplacian=p.reduce((sum,_,axis)=>sum+(polynomial(type,p.map((v,i)=>v+(i===axis?h:0)))-2*value+polynomial(type,p.map((v,i)=>v-(i===axis?h:0))))/(h*h),0);
    near(laplacian,0,1e-6);
    const surface=S.generate({mode:'ao',type,n:4,extent:5.6,resolution:25,threshold:.14},C.fieldValue);
    assert.ok(surface.positive.length>0&&surface.negative.length>0);
    assert.ok([...surface.positive,...surface.negative].every(Number.isFinite));
  }
  for(const p of [[0,1,1],[1,0,1],[1,1,0]])near(C.atomicValue({type:'fxyz',n:4},...p),0);
  near(C.atomicValue({type:'fz3',n:4},Math.sqrt(2/3),0,1),0);
  // Fourier quadrature on sphere: this particular real l=3 basis is orthogonal.
  const integrals=types.map(()=>types.map(()=>0));
  for(let i=0;i<100;i++){const z=-1+(i+.5)*2/100,r=Math.sqrt(1-z*z);for(let j=0;j<160;j++){const a=(j+.5)*2*Math.PI/160,p=[r*Math.cos(a),r*Math.sin(a),z],v=types.map(type=>polynomial(type,p));for(let x=0;x<7;x++)for(let y=0;y<7;y++)integrals[x][y]+=v[x]*v[y];}}
  for(let i=0;i<7;i++)for(let j=0;j<i;j++)near(integrals[i][j]/Math.sqrt(integrals[i][i]*integrals[j][j]),0,1e-3);
});

test('54 elements, all groups through period 5; no duplicated PSE positions',()=>{
  assert.equal(C.elements.length,54);assert.equal(C.bySymbol.Xe.z,54);
  assert.equal(new Set(C.elements.map(e=>`${e.period}/${e.group}`)).size,54);
  for(const period of [4,5])assert.equal(C.elements.filter(e=>e.period===period).length,18);
  for(const e of C.elements){assert.equal(Object.values(e.config).reduce((a,b)=>a+b,0),e.z);assert.equal(e.shells.reduce((a,b)=>a+b,0),e.z);assert.ok(C.outerOrbitals(e).every(o=>o.n===e.outer));assert.equal(C.outerOrbitals(e).reduce((a,b)=>a+b.count,0),e.shells[e.outer-1]);}
});
test('NIST exceptions and outermost occupied shell, including Pd',()=>{
  for(const [symbol,d,s] of [['Cr',5,1],['Cu',10,1],['Nb',4,1],['Mo',5,1],['Ru',7,1],['Rh',8,1],['Pd',10,0],['Ag',10,1]]){
    const e=C.bySymbol[symbol];assert.equal(e.config[`${e.period-1}d`],d);assert.equal(e.config[`${e.period}s`],s);
  }
  assert.equal(C.bySymbol.Pd.outer,4);assert.equal(C.outerOrbitals(C.bySymbol.Pd).length,9);
  assert.deepEqual(C.outerOrbitals(C.bySymbol.Fe).map(o=>o.id),['4s']);
  assert.deepEqual(C.orbitalOccupancy(4,3),[2,1,1]);
});
test('AO angular nodes, sign symmetry, dz² equatorial torus sign',()=>{
  for(const type of ['px','py','pz']){const spec={type,n:2};near(C.atomicValue(spec,1,.3,.4),-C.atomicValue(spec,-1,-.3,-.4));}
  assert.equal(C.atomicValue({type:'px',n:2},0,1,2),0);
  assert.equal(C.atomicValue({type:'dxy',n:3},1,0,2),0);
  assert.ok(C.atomicValue({type:'dz2',n:3},0,0,1)>0);
  assert.ok(C.atomicValue({type:'dz2',n:3},1,0,0)<0);
  near(C.atomicValue({type:'dz2',n:3},Math.sqrt(2),0,1),0);
  // In the n²-scaled coordinates rho = 2*n*r; the 2s radial node is rho=2.
  near(C.atomicValue({type:'s',n:2,radial:true},.5,0,0),0);
  assert.ok(C.atomicValue({type:'s',n:2,radial:true},.2,0,0)>0);
  assert.ok(C.atomicValue({type:'s',n:2,radial:true},1,0,0)<0);
});
test('Every occupied configuration entry offers the correctly occupied individual orbitals, including inner shells',()=>{
  for(const e of C.elements){
    for(const key of C.order.filter(key=>e.config[key]>0)){
      const orbitals=C.subshellOrbitals(e,key);
      assert.equal(orbitals.length,{s:1,p:3,d:5}[key[1]]);
      assert.equal(orbitals.reduce((sum,o)=>sum+o.count,0),e.config[key]);
      assert.ok(orbitals.every(o=>o.n===Number(key[0]) && o.subshell===key && o.count>=0 && o.count<=2));
      assert.equal(new Set(orbitals.map(o=>o.id)).size,orbitals.length);
    }
  }
  assert.deepEqual(C.subshellOrbitals(C.bySymbol.Fe,'3d').map(o=>o.count),[2,1,1,1,1]);
  assert.deepEqual(C.subshellOrbitals(C.bySymbol.Ge,'3d').map(o=>o.id),['3dxy','3dxz','3dyz','3dx2-y2','3dz2']);
  assert.deepEqual(C.subshellOrbitals(C.bySymbol.Ge,'4p').map(o=>o.count),[1,1,0]);
  assert.equal(C.subshellOrbitals(C.bySymbol.Pd,'5s').length,0);
  assert.equal(C.subshellOrbitals(C.bySymbol.H,'2p').length,0);
});
test('MO electron counts, Pauli/Hund occupancy, correct N₂/O₂ ordering',()=>{
  for(const [key,electrons,bo,unpaired] of [['H2',2,1,0],['He2',4,0,0],['N2',10,3,0],['O2',12,2,2]]){
    const levels=C.levelsFor(key);assert.equal(levels.reduce((sum,o)=>sum+o.count,0),electrons);assert.equal(C.bondOrder(levels),bo);assert.equal(levels.filter(o=>o.count===1).length,unpaired);assert.ok(levels.every(o=>o.count<=2));
  }
  const n=C.levelsFor('N2'),o=C.levelsFor('O2');
  assert.ok(n.find(l=>l.id==='px+').energy<n.find(l=>l.id==='pz+').energy);
  assert.ok(o.find(l=>l.id==='px+').energy>o.find(l=>l.id==='pz+').energy);
  assert.equal(o.find(l=>l.id==='px-').count,1);assert.equal(o.find(l=>l.id==='py-').count,1);
});
test('Polyatomic valence models preserve electron counts, orthonormal coefficients and sigma/pi/lone-pair occupations',()=>{
  for(const [key,electrons,sigma,pi,lone] of [['methane',8,4,0,0],['ethane',14,7,0,0],['ethene',12,5,1,0],['ethyne',10,3,2,0],['water',8,2,0,2],['ammonia',8,3,0,1]]){
    const levels=C.levelsFor(key);
    assert.equal(levels.reduce((sum,o)=>sum+o.count,0),electrons);
    assert.equal(levels.filter(o=>o.count===2&&o.family==='sigma').length,sigma);
    assert.equal(levels.filter(o=>o.count===2&&o.family==='pi').length,pi);
    assert.equal(levels.filter(o=>o.count===2&&o.family==='lone').length,lone);
    assert.ok(levels.every(o=>o.count===0||o.count===2));
    assert.equal(levels.length,levels[0].aos.length);
    for(let i=0;i<levels.length;i++)for(let j=0;j<levels.length;j++)near(levels[i].coeff.reduce((sum,v,k)=>sum+v*levels[j].coeff[k],0),Number(i===j));
  }
  const methane=C.levelsFor('methane');near(methane[1].energy,methane[2].energy);near(methane[2].energy,methane[3].energy);
  const ethyne=C.levelsFor('ethyne').filter(o=>o.family==='pi'&&o.count===2);near(ethyne[0].energy,ethyne[1].energy);
  const water=C.levelsFor('water');assert.deepEqual(water.slice(0,4).map(o=>o.label),['2a₁','1b₂','3a₁ · n','1b₁ · n']);
  const b1=water.find(o=>o.label.startsWith('1b₁'));near(Math.abs(b1.coeff[2]),1);near(C.molecularValue({level:b1},.2,0,.3),0);
});
test('Idealized hydrocarbon geometries and bent/pyramidal lone-pair molecules',()=>{
  const directions=(geometry,center)=>geometry.bonds.filter(([a])=>a===center).map(([,b])=>{const r=geometry.atoms[b].map((x,i)=>x-geometry.atoms[center][i]),length=Math.hypot(...r);return r.map(x=>x/length);});
  const angle=(a,b)=>Math.acos(a.reduce((sum,x,i)=>sum+x*b[i],0))*180/Math.PI;
  const methane=directions(C.polyatomicGeometry('methane'),0);
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)near(angle(methane[i],methane[j]),109.4712206,1e-6);
  assert.ok(C.polyatomicGeometry('ethene').atoms.every(p=>p[2]===0));
  assert.ok(C.polyatomicGeometry('ethyne').atoms.every(p=>p[1]===0&&p[2]===0));
  const water=directions(C.polyatomicGeometry('water'),0);near(angle(...water),104.5);
  const ammonia=directions(C.polyatomicGeometry('ammonia'),0);
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)near(angle(ammonia[i],ammonia[j]),107);
  assert.ok(C.polyatomicGeometry('ammonia').atoms.slice(1).every(p=>p[2]<0));
});
test('LCAO bonding/antibonding nodal planes for s, axial p and transverse p',()=>{
  const levels=C.levelsFor('O2');
  for(const id of ['s2-','pz-','px-','py-'])near(C.molecularValue({level:levels.find(l=>l.id===id)},.4,.3,0),0);
  const h=C.levelsFor('H2');assert.ok(C.molecularValue({level:h[0]},0,0,0)>0);near(C.molecularValue({level:h[1]},.5,1,0),0);
  for(const id of ['px+','px-'])near(C.molecularValue({level:levels.find(l=>l.id===id)},0,1,.3),0);
});
test('Ring eigenvalues, orthonormal MO coefficients and occupations',()=>{
  const benz=C.levelsFor('benzene');[-2,-1,-1,1,1,2].forEach((v,i)=>near(benz[i].energy,v));
  const planar=C.levelsFor('cot',false);assert.equal(planar.filter(o=>o.kind==='nonbonding').length,2);assert.equal(planar.filter(o=>o.count===1).length,2);
  const tub=C.levelsFor('cot',true);assert.equal(tub.filter(o=>o.count===1).length,0);assert.ok(tub[4].energy-tub[3].energy>1);
  for(const levels of [benz,planar,tub]){
    assert.equal(levels.reduce((sum,o)=>sum+o.count,0),levels.length);
    for(let i=0;i<levels.length;i++)for(let j=0;j<levels.length;j++)near(levels[i].coeff.reduce((sum,v,k)=>sum+v*levels[j].coeff[k],0),Number(i===j));
  }
  assert.ok(C.ringGeometry(6,false).atoms.every(p=>p[2]===0));assert.ok(C.ringGeometry(8,true).atoms.some(p=>Math.abs(p[2])>.4));
  C.ringGeometry(8,true).normals.forEach(n=>near(Math.hypot(...n),1));
});
test('Marching tetrahedra returns finite signed surfaces and preserves nodal plane',()=>{
  const spec={mode:'ao',type:'px',n:2,resolution:21,extent:3.4,threshold:.14},surface=S.generate(spec,C.fieldValue);
  assert.ok(surface.positive.length>0 && surface.negative.length>0);assert.equal(surface.positive.length%9,0);assert.equal(surface.negative.length%9,0);
  for(const name of ['positive','negative'])assert.ok(surface[name].every(Number.isFinite));
  for(let i=0;i<surface.positive.length;i+=3)assert.ok(surface.positive[i]>0);
  for(let i=0;i<surface.negative.length;i+=3)assert.ok(surface.negative[i]<0);
  const sphere=S.generate({...spec,type:'s',n:1},C.fieldValue);assert.ok(sphere.positive.length>0);assert.equal(sphere.negative.length,0);
});
test('Lowest selectable MO isovalue stays inside the sampled volume',()=>{
  for(const key of ['H2','He2','N2','O2','benzene','cot',...C.polyatomicKeys])for(const level of C.levelsFor(key)){
    const extent=level.basis==='ring'?6.4:5.4;let peak=0,boundary=0;
    for(let ix=0;ix<=16;ix++)for(let iy=0;iy<=16;iy++)for(let iz=0;iz<=16;iz++){
      const x=-extent+2*extent*ix/16,y=-extent+2*extent*iy/16,z=-extent+2*extent*iz/16,v=Math.abs(C.molecularValue({level},x,y,z));peak=Math.max(peak,v);if([ix,iy,iz].some(i=>i===0||i===16))boundary=Math.max(boundary,v);
    }
    assert.ok(boundary/peak<.05,`${key}/${level.id}: surface reaches boundary (${boundary/peak})`);
  }
});

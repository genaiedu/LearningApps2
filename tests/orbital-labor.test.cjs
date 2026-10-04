const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../scripts/orbital-labor-core.js');
const S=require('../scripts/orbital-labor-surface.js');
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);

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
test('MO electron counts, Pauli/Hund occupancy, correct N₂/O₂ ordering',()=>{
  for(const [key,electrons,bo,unpaired] of [['H2',2,1,0],['He2',4,0,0],['N2',10,3,0],['O2',12,2,2]]){
    const levels=C.levelsFor(key);assert.equal(levels.reduce((sum,o)=>sum+o.count,0),electrons);assert.equal(C.bondOrder(levels),bo);assert.equal(levels.filter(o=>o.count===1).length,unpaired);assert.ok(levels.every(o=>o.count<=2));
  }
  const n=C.levelsFor('N2'),o=C.levelsFor('O2');
  assert.ok(n.find(l=>l.id==='px+').energy<n.find(l=>l.id==='pz+').energy);
  assert.ok(o.find(l=>l.id==='px+').energy>o.find(l=>l.id==='pz+').energy);
  assert.equal(o.find(l=>l.id==='px-').count,1);assert.equal(o.find(l=>l.id==='py-').count,1);
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
  for(const key of ['H2','He2','N2','O2','benzene','cot'])for(const level of C.levelsFor(key)){
    const extent=level.basis==='ring'?6.4:5.4;let peak=0,boundary=0;
    for(let ix=0;ix<=16;ix++)for(let iy=0;iy<=16;iy++)for(let iz=0;iz<=16;iz++){
      const x=-extent+2*extent*ix/16,y=-extent+2*extent*iy/16,z=-extent+2*extent*iz/16,v=Math.abs(C.molecularValue({level},x,y,z));peak=Math.max(peak,v);if([ix,iy,iz].some(i=>i===0||i===16))boundary=Math.max(boundary,v);
    }
    assert.ok(boundary/peak<.05,`${key}/${level.id}: surface reaches boundary (${boundary/peak})`);
  }
});

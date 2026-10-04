const test=require('node:test');
const assert=require('node:assert/strict');
const {sample}=require('../scripts/orbital-labor-probability.js');
const near=(value,expected,tolerance)=>assert.ok(Math.abs(value-expected)<tolerance,`${value} != ${expected}`);
function rng(seed){let state=seed;return ()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};}

test('1s and real 2p samples include the radial volume element and correct angular density',()=>{
  for(const type of ['1s','2px','2py','2pz']){
    const random=rng(314159),axis=type==='2px'?0:type==='2py'?1:2;let radial=0,squared=0,angular=0,nodeBand=0,plus=0;
    const count=60000;
    for(let i=0;i<count;i++){
      const p=sample(type,random),r=Math.hypot(...p),mu=p[axis]/r;
      assert.ok(p.every(Number.isFinite));radial+=r;squared+=r*r;angular+=mu*mu;nodeBand+=Math.abs(mu)<.1;plus+=mu>0;
    }
    near(radial/count,type==='1s'?1.5:5,.035);
    near(squared/count,type==='1s'?3:30,.4);
    near(angular/count,type==='1s'?1/3:3/5,.008);
    near(nodeBand/count,type==='1s'?.1:.001,.006);
    near(plus/count,.5,.008);
  }
});

test('p direction choices are exact coordinate rotations, not new artificial density profiles',()=>{
  const z=sample('2pz',rng(23));
  assert.deepEqual(sample('2px',rng(23)),[z[2],z[0],z[1]]);
  assert.deepEqual(sample('2py',rng(23)),[z[0],z[2],z[1]]);
  assert.throws(()=>sample('3d'),RangeError);
  assert.ok(sample('2pz',()=>0).every(Number.isFinite));
});

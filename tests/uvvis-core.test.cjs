const assert=require('node:assert/strict'),C=require('../scripts/uvvis-core.js'),D=require('../data/uvvis-spectra.json'),Q=require('../scripts/uvvis-aufgaben.js');
const settings={c:10,factor:1,path:1,material:'quartz',pH:7,bandwidth:1,realistic:false};
assert.equal(D.substances.length,77);assert.equal(D.substances.filter(r=>r.curves).reduce((s,r)=>s+r.curves.length,0),72);
for(const r of D.substances){assert.ok(r.smiles&&r.cas&&r.source&&r.dataURL&&r.note);for(const pts of [r.points,...(r.curves||[]).map(c=>c.points)]){assert.ok(pts.length>=20);pts.forEach(([x,y],i)=>{assert.ok(Number.isFinite(x)&&Number.isFinite(y));if(i)assert.ok(x>pts[i-1][0]);});}if(r.curves){assert.equal(r.unit,'absorbance');assert.equal(r.curves.length,new Set(r.curves.map(c=>c.pH)).size);assert.ok(r.rights.includes('CC BY'));r.curves.forEach(c=>assert.equal(c.points.length,551));}}
assert.equal(C.interpolate([[200,1],[202,3]],201),2);assert.equal(C.interpolate([[200,1],[202,3]],199),null);assert.equal(C.interpolate([[200,1],[202,3]],203),null);
const ideal={points:[[190,25000],[850,25000]],unit:'epsilon',solvent:'water'};
assert.ok(Math.abs(C.measure(ideal,500,settings).A-.25)<1e-12);assert.ok(Math.abs(C.measure(ideal,500,{...settings,path:2}).A-.5)<1e-12);
assert.ok(Math.abs(C.measure(ideal,500,{...settings,c:20}).A-.5)<1e-12);assert.equal(C.measure(ideal,190,settings),null);assert.equal(C.measure(ideal,250,{...settings,material:'glass'}),null);
assert.equal(C.measure(ideal,500,{...settings,c:NaN}),null);assert.equal(C.absorbance({points:[[250,-.01],[800,.1]],unit:'absorbance',solvent:'water'},250,settings),0);
assert.ok(C.measure(ideal,500,{...settings,c:400,realistic:true},()=>.5).A<C.measure(ideal,500,{...settings,c:400}).A);
const reg=C.regression([{c:0,A:.02},{c:10,A:.27},{c:20,A:.52}]);assert.ok(Math.abs(reg.slope-.025)<1e-12);assert.ok(Math.abs(reg.intercept-.02)<1e-12);assert.equal(reg.r2,1);assert.equal(C.regression([{c:1,A:1},{c:1,A:1},{c:2,A:2}]),null);
const b=D.substances.find(r=>r.id==='A01'),a=D.substances.find(r=>r.id==='A16');assert.equal(b.solvent,a.solvent);assert.ok(C.peak(a.points,265,310)[0]>C.peak(b.points,250,310)[0]);assert.ok(C.peak(a.points,265,310)[1]>C.peak(b.points,250,310)[1]);
const mo=D.substances.find(r=>r.id==='PH-J03');assert.equal(C.spectrum(mo,2)[0][1],.117);assert.equal(C.spectrum(mo,7)[0][1],.217);assert.equal(C.spectrum(mo,2.1),undefined);
assert.equal(Q.length,120);assert.equal(new Set(Q.map(q=>q.id)).size,120);assert.equal(new Set(Q.map(q=>q.group)).size,6);Q.forEach(q=>{assert.equal(new Set(q.options).size,3);assert.ok(q.options[q.correct]&&q.hint&&q.explanation);});
console.log('PASS 77 sources/structures, 72 genuine pH curves, interpolation, units, Beer law, cutoff/bandwidth, stray light, calibration and 120 tasks.');

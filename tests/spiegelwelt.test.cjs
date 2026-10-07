/* Run with: node tests/spiegelwelt.test.cjs */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../scripts/spiegelwelt-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-11,`${a} ≠ ${b}`);
for(let i=-100;i<=100;i++){
  const e=i/100,p=C.pairs(e);
  near(p.aa+p.ab+p.bb,1);
  near(C.response(e),-C.response(-e));
  assert(Math.abs(C.response(e))<=1+1e-12);
  assert(Math.abs(C.response(e))>=Math.abs(e)-1e-12);
  near(C.response(e,'linear'),e);
  near(C.response(e,'negative'),e**3);
  if(Math.abs(e)<1)near(C.response(e),(p.aa-p.bb)/(p.aa+p.bb));
}
near(C.response(.2),.4/1.04);
assert.deepEqual(C.batches(0,10),Array(11).fill(0));
assert(C.batches(.002,10).at(-1)>.96);
assert.deepEqual(C.batches(.02,100),C.batches(.02,10));
const determinant=v=>v[0][0]*(v[1][1]*v[2][2]-v[1][2]*v[2][1])-v[0][1]*(v[1][0]*v[2][2]-v[1][2]*v[2][0])+v[0][2]*(v[1][0]*v[2][1]-v[1][1]*v[2][0]);
const tetra=[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]];
const volume=pts=>determinant(pts.slice(1).map(v=>v.map((a,j)=>a-pts[0][j])));
for(let i=0;i<20;i++){
  near(volume(tetra.map(v=>C.rotate(v,i*.4,i*.2))),volume(tetra));
  near(volume(tetra.map(v=>C.rotate([-v[0],v[1],v[2]],i*.4,i*.2))),-volume(tetra));
}
const html=fs.readFileSync(path.join(__dirname,'../spiegelwelt.html'),'utf8');
assert(!/<img[^>]+src=["']https:/i.test(html),'External images must await explicit consent.');
assert.equal((html.match(/id="film-fullscreen"/g)||[]).length,1);
for(const id of ['consent','wiki-reader','wiki-content','wiki-source','wiki-settings','wiki-revoke','privacy-status'])assert(html.includes(`id="${id}"`));
assert(!html.includes('materialien.html'),'No backlink to the material overview.');
assert(!/id="(?:quiz|aufgaben|check)"/.test(html),'This app has no exercises.');
console.log('Spiegelwelt: model normalization, sign symmetry, fixed points, amplification, orientation preservation and page contracts pass.');

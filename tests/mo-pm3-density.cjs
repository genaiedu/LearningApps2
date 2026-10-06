const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mo-ci-parser-')),file=path.join(folder,'parser.cjs');
require('esbuild').buildSync({entryPoints:[path.join(__dirname,'../scripts/mo-pm3-density.ts')],bundle:true,platform:'node',format:'cjs',outfile:file});
const {readPM3Density,readPM3Singlets,pm3ActiveSpace,pm3FrameRotation,rotatePM3Density,rotatePM3Vector}=require(file);
// Fourteen AOs -> three VECPRT column groups. Simulate the repeated page
// headers and retain off-diagonal entries, not merely the AO populations.
const n=14,basis=Array.from({length:n},(_,i)=>({type:'S',element:'H',atomIndex:i}));
let listing='DENSITY MATRIX IS\n';
for(let first=0;first<n;first+=6){listing+='0\n  S H 1   S H 2\n---------------------\n';for(let i=first;i<n;i++)listing+=' S H '+(i+1)+' '+Array.from({length:Math.min(i+1,first+6)-first},(_,k)=>first+k===i?'1.000000':'0.012000').join(' ')+'\n';}
listing+='MULTI-ELECTRON CONFIGURATION INTERACTION CALCULATION';
const p=readPM3Density(listing,basis,14);assert.equal(p.length,196);assert.equal(p[13*n+1],.012);assert.equal(p[n+13],.012);assert.equal(p[13*n+13],1);
assert.throws(()=>readPM3Density(listing.replace(' S H 14',' S H 99'),basis,14),/Unvollständig/);
assert.throws(()=>readPM3Density(listing,basis,12),/Elektronenzahl/);
assert.deepEqual(readPM3Singlets('STATE ENERGIES\n 1 -.050000 SINGLET .00000 .00000\n 2 4.100000 TRIPLET 2.00000 1.00000\n 3 5.200000 SINGLET .00000 .00000').map(s=>s.root),[1,3]);
assert.equal(pm3ActiveSpace([-30,-18,-15,-12,4,6],4).configurations,36);
assert.equal(pm3ActiveSpace([-30,-12,-12,-12,4,6,10],4).total,5);
assert.equal(pm3ActiveSpace([-30,-15,-15,-10,2,2,2],4).total,4);
assert.throws(()=>pm3ActiveSpace([-30,-12,-12,-12,4,4,4,10],4),/mehr als fünf/);
const source=[0,0,0,1,0,0,0,1,0],target=[3,4,5,3,5,5,2,4,5],rotation=pm3FrameRotation(source,target);
assert.ok(Math.abs(rotatePM3Vector(rotation,[1,0,0])[1]-1)<1e-12);
const sp=['S','Px','Py','Pz'].map(type=>({type,atomIndex:0})),d=new Float64Array(16);d[0]=2;d[5]=1;d[10]=.6;d[15]=.4;d[1]=d[4]=.1;
const rotated=rotatePM3Density(d,sp,rotation);assert.equal(rotated[5],.6);assert.equal(rotated[10],1);assert.equal(rotated[2],.1);assert.equal(rotated[8],.1);assert.equal(rotated[0]+rotated[5]+rotated[10]+rotated[15],4);
assert.throws(()=>pm3FrameRotation(source,[0,0,0,3,0,0,0,1,0]),/andere Molekülgeometrie/);
// Nearly planar MOPAC coordinates acquire ~0.001 Å out-of-plane rounding;
// real interatomic distances must still remain unchanged.
const flat=[0,0,0,1,0,0,0,1,0,1,1,.0001],rounded=[0,0,0,1,0,0,0,1,0,1,1,.0012];
assert.ok(pm3FrameRotation(flat,rounded).every(Number.isFinite));
assert.throws(()=>pm3FrameRotation(flat,[0,0,0,1,0,0,0,1,0,1.002,1,0]),/interatomare/);
console.log('PASS paginated CI matrix, electron count, singlet selection, complete degenerate spaces, AO/dipole frame rotation');

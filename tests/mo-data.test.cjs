const assert=require('node:assert/strict'),C=require('../scripts/mo-data-core');
const j='##TITLE=Synthetic test\n##DATA TYPE=UV/VIS SPECTRUM\n##XUNITS=Wavelength (nm)\n##YUNITS=Logarithm epsilon\n##XYPOINTS=(XY..XY)\n100,2\n200,3\n##END=';
const s=C.spectrum(j);assert.equal(s.points[0].value,.1);assert.equal(s.points[1].value,1);assert.match(s.conversion,/zurückgerechnet/);
assert.equal(C.spectrum('nm,absorption\n100,2\n200,4','csv').points[0].value,.5);
assert.throws(()=>C.spectrum(j.replace('UV/VIS','INFRARED')),/kein IR/);assert.throws(()=>C.spectrum(j.replace('XYPOINTS','XYDATA')),/komprimierte/);assert.throws(()=>C.spectrum(j.replace('Wavelength (nm)','Wavenumber')),/Einheiten/);
const g=C.pubchem({PC_Compounds:[{id:{id:{cid:1}},atoms:{aid:[1,2],element:[1,1]},bonds:{aid1:[1],aid2:[2],order:[1]},coords:[{type:[2],aid:[1,2],conformers:[{x:[0,0],y:[0,0],z:[0,.74],data:[]}]}]}]});assert.equal(g.atoms.length,2);assert.ok(Math.abs(g.atoms[1].xyz[2]-.37)<1e-12);assert.match(g.method,/MMFF94s/);
assert.throws(()=>C.pubchem({PC_Compounds:[]}),/Kein/);
console.log('PASS bounded PubChem parsing, JCAMP UV identification, log epsilon conversion, CSV, explicit unsupported format rejection');

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const data=require('../data/uvvis-spectra.json').substances;
test('Amino comparison switches actual scales and explains both effects',()=>{
  const dom=new JSDOM(fs.readFileSync(require.resolve('../uvvis-labor.html'),'utf8'));
  const context={document:dom.window.document,Node:dom.window.Node,console};
  vm.createContext(context);
  const source=fs.readFileSync(require.resolve('../scripts/uvvis-amino.js'),'utf8').replaceAll('export function ','function ');
  vm.runInContext(source,context);context.mount(data);
  const d=context.document;
  assert.equal(d.getElementById('aux-direction'),null);
  assert.match(d.querySelector('#aux-plot').closest('.compare').querySelector('h3').textContent,/Bathochromer Einfluss/);
  assert.match(d.getElementById('aux-plot').textContent,/Relative Bandenhöhe/);
  const normalized=d.getElementById('aux-plot').innerHTML;
  d.getElementById('amino-scale').value='absolute';d.getElementById('amino-scale').onchange();
  assert.notEqual(d.getElementById('aux-plot').innerHTML,normalized);
  assert.match(d.getElementById('aux-plot').textContent,/ε/);
  assert.match(d.querySelector('.compare').textContent,/Übergangswahrscheinlichkeit/);
  assert.match(d.querySelector('.compare').textContent,/Rotverschiebung direkt ablesen/);
  dom.window.close();
});
test('Complete π-MO schemes retain degeneracy, electron counts and shared energy scale',()=>{
  const C=require('../scripts/orbital-labor-core.js'),context={};vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../scripts/uvvis-amino.js'),'utf8').replaceAll('export function ','function '),context);
  const models=context.aminoModels(C);
  assert.deepEqual(Array.from(models,m=>m.levels.length),[6,7]);
  assert.deepEqual(Array.from(models,m=>m.levels.reduce((s,l)=>s+l.count,0)),[6,8]);
  assert.ok(Math.abs(models[0].levels[1].energy-models[0].levels[2].energy)<1e-10);
  assert.ok(Math.abs(models[0].levels[3].energy-models[0].levels[4].energy)<1e-10);
  const gap=m=>m.levels[m.occupied].energy-m.levels[m.occupied-1].energy;
  assert.ok(gap(models[1])<gap(models[0]));
  const dom=new JSDOM(context.moDiagram(models,[2,3]));
  const d=dom.window.document;
  assert.equal(d.querySelectorAll('[data-orbital]').length,13);
  assert.equal(d.querySelectorAll('.occupied').length,7);
  assert.equal(d.querySelectorAll('.mo-excitation').length,2);
  assert.equal(d.querySelectorAll('[aria-pressed="true"]').length,2);
  const paths=[...d.querySelectorAll('.mo-excitation')].map(p=>p.getAttribute('d').match(/M\S+ ([\d.]+)V([\d.]+)/));
  const lengths=paths.map(p=>Number(p[1])-Number(p[2]));
  assert.ok(lengths[0]>lengths[1]);
  const nitrogenWeight=models[1].levels[3].coeff[6]**2;
  assert.ok(nitrogenWeight>0.01&&nitrogenWeight<0.99);
  dom.window.close();
});
test('Shared orbital geometry preserves positions and uses smooth signed field normals',()=>{
  const C=require('../scripts/orbital-labor-core.js'),S=require('../scripts/orbital-labor-surface.js'),T=require('../../LearningApps/fonts/three.min.js');
  const context={window:{THREE:T},OrbitalCore:C};vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../scripts/orbital-labor-viewer.js'),'utf8'),context);
  const spec={mode:'mo',level:C.levelsFor('benzene')[2],resolution:24,extent:4.6,threshold:.18};
  const data=S.generate(spec,C.fieldValue);
  for(const [name,sign]of [['positive',1],['negative',-1]]){
    const g=context.window.OrbitalViewer.prototype.geometry(data[name],spec,sign),p=g.attributes.position.array,n=g.attributes.normal.array;
    assert.ok(g.index.count>g.attributes.position.count);
    for(let i=0;i<n.length;i+=3)assert.ok(Math.abs(Math.hypot(n[i],n[i+1],n[i+2])-1)<1e-5);
    for(let i=0;i<g.index.count;i++){const j=g.index.array[i]*3;for(let k=0;k<3;k++)assert.ok(Math.abs(p[j+k]-data[name][i*3+k])<1e-6);}
    g.dispose();
  }
});

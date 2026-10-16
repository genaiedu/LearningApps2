const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const I=require('../scripts/uvvis-indicators'),P=require('../scripts/uvvis-presentation'),D=require('../data/uvvis-spectra.json').substances,M=require('../data/uvvis-indicator-structures.json'),extra=require('../data/uvvis-indicator-extra.json');
test('Four azo and four triarylmethane indicators include both reversed effects',()=>{
 assert.equal(I.dyes.length,8);for(const f of ['Azofarbstoffe','Triphenylmethanfarbstoffe'])assert.equal(I.dyes.filter(d=>d.family===f).length,4);
 for(const d of I.dyes)for(const [state] of d.forms){const rows=M[d.id+'-'+state];assert.ok(rows);assert.equal(rows.length,(d.id==='phenolphthalein'&&state==='acid')||(d.id==='malachitegreen'&&state==='base')?1:2);for(const r of rows){assert.ok(fs.existsSync(path.join(__dirname,'..',r.src)));assert.equal(r.charge,rows[0].charge);assert.equal(r.formula,rows[0].formula);}}
 assert.ok(I.dyes.find(d=>d.id==='alizarinyellow').schematic);assert.equal(M['phenolphthalein-base'][0].charge,-2);assert.equal(M['methylred-acid'][0].charge,0);assert.equal(M['methylred-base'][0].charge,-1);
});
test('PP is a labelled model; Malachite keeps 17 real measured curves',()=>{
 const a=I.ppCurve(D,7),b=I.ppCurve(D,10.5);assert.ok(Math.max(...b.map(p=>p[1]))>100*Math.max(...a.map(p=>p[1])));
 assert.equal(extra.curves.length,17);const max=pH=>Math.max(...extra.curves.find(c=>c.pH===pH).points.filter(p=>p[0]>=600&&p[0]<=650).map(p=>p[1]));assert.ok(max(4)>20*max(12));assert.ok(extra.sha256.length===64);
 const pk=pH=>I.ayrCurve(pH).reduce((a,b)=>a[1]>b[1]?a:b)[0];assert.ok(pk(9)<410);assert.ok(pk(12.5)>500);
 assert.ok(P.slides.some(s=>s.visual==='pp-spectrum'&&s.aside.includes('keine gemessene')));
});
test('Every selector works and every colored form has two drawings',async()=>{
 const {JSDOM}=require('jsdom'),root=path.join(__dirname,'..'),dom=new JSDOM(fs.readFileSync(path.join(root,'uvvis-labor.html'),'utf8'),{url:'http://localhost/',runScripts:'outside-only'}),w=dom.window;
 w.UVVisPresentation=P;w.fetch=async url=>({ok:true,json:async()=>url.includes('structures')?M:url.includes('extra')?extra:{substances:D}});
 w.eval(fs.readFileSync(path.join(root,'scripts/uvvis-indicators.js'),'utf8'));await new Promise(r=>setTimeout(r,15));
 const d=w.document,sel=d.getElementById('indicator-dye');assert.equal(sel.options.length,8);assert.equal(d.getElementById('ph-plot').getAttribute('hidden'),'');
 for(const item of I.dyes){sel.value=item.id;sel.dispatchEvent(new w.Event('change'));assert.equal(d.querySelectorAll('#indicator-plot svg').length,1);assert.equal(d.querySelectorAll('#indicator-forms img').length,item.forms.reduce((n,[state])=>n+M[item.id+'-'+state].length,0));assert.ok(!d.getElementById('indicator-result').textContent.includes('NaN'));}
 dom.window.close();
});

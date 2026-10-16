const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),css=fs.readFileSync(path.join(root,'styles/uvvis-labor.css'),'utf8');
test('UV/Vis uses actual local Atelier font cuts with audited number and ligature features',()=>{
  assert.doesNotMatch(css,/dm-sans|Georgia|ui-monospace|font-family:Labor/);
  const all=[];function walk(x){if(!x||typeof x!=='object')return;if(x.path&&x.sha256)all.push(x);Object.values(x).forEach(walk);}walk(JSON.parse(fs.readFileSync(path.join(root,'data/typografie-fontaudit.json'))));
  const matches=[...css.matchAll(/src:url\("(\.\.\/fonts\/typografie\/[^\"]+)"\)/g)];assert.ok(matches.length>=8);
  for(const [,url]of matches){const file=path.resolve(root,'styles',url),entry=all.find(x=>path.resolve(root,x.path)===file);assert.ok(entry,url);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),entry.sha256);assert.equal(entry.germanMissing,'');for(const feature of ['liga','onum','lnum','pnum','tnum'])assert.ok(entry.features.includes(feature),url+' '+feature);}
  assert.match(css,/\.hero h1 em\{[^}]*font-style:italic/);
  assert.match(css,/\.instrument-readout strong\{font-variant-numeric:lining-nums tabular-nums/);
  assert.match(css,/math\{font-family:math/);
});

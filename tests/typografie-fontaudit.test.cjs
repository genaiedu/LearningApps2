const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),A=require('../scripts/typografie-fontaudit.js'),catalogue=require('../data/typografie-fonts.json'),audit=require('../data/typografie-fontaudit.json');
test('all 30 font audits refer to unchanged real local font files',()=>{
 assert.equal(audit.families.length,30);assert.equal(audit.families.reduce((n,f)=>n+f.files.length,0),64);
 for(const f of catalogue.families){const a=audit.families.find(a=>a.id===f.id);assert.equal(a.name,f.name);assert.deepEqual(a.files.map(x=>x.path),f.files.map(x=>x.path));
  for(const file of [...a.files,...a.opticalFiles])assert.equal(file.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root,file.path))).digest('hex'));
 }
});
test('missing German glyphs create a warning; coverage never stands for readability',()=>{
 const f=catalogue.families[0],a=audit.families[0],checks=A.checks(f,a).flatMap(x=>x.items);
 assert.equal(checks.find(c=>c.label==='Deutsche Basiszeichen').state,'pass');
 assert.equal(checks.find(c=>c.label==='Lesbare Details').state,'manual');
 const changed=A.checks(f,{...a,germanMissing:'äß'}).flatMap(x=>x.items).find(c=>c.label==='Deutsche Basiszeichen');
 assert.equal(changed.state,'warning');assert.ok(changed.text.includes('äß'));
 const source=fs.readFileSync(path.join(root,'scripts/typografie-fontaudit.js'),'utf8');assert.ok(source.includes("if(warn)card.append"));
});
test('available cuts, optional capital sharp S, and optical files are not conflated',()=>{
 const pop=audit.families.find(f=>f.id==='poppins');assert.equal(pop.germanMissing,'');assert.ok(pop.optionalMissing.includes('ẞ'));assert.equal(pop.cuts.italic,false);
 const eb=audit.families.find(f=>f.id==='ebgaramond');assert.ok(Object.values(eb.cuts).every(Boolean));assert.equal(eb.optionalMissing,'');
 for(const id of ['inter','dmsans']){const a=audit.families.find(a=>a.id===id),f=catalogue.families.find(f=>f.id===id),item=A.checks(f,a).flatMap(c=>c.items).find(c=>c.label==='Optische Größen');assert.equal(item.state,'pass');assert.ok(item.text.includes('zusätzlichen lokalen Datei'));assert.ok(a.opticalFiles[0].axes.opsz);}
});
test('every family has two valid, non-self partner suggestions, never a passed harmony test',()=>{
 const names=new Set(catalogue.families.map(f=>f.name));
 for(const f of catalogue.families){assert.equal(A.pairings[f.id].length,2);for(const [name,role] of A.pairings[f.id]){assert.ok(names.has(name));assert.notEqual(name,f.name);assert.ok(role.length>20);}
 const groups=A.checks(f,audit.families.find(a=>a.id===f.id));assert.equal(groups.length,4);assert.equal(groups[3].items.find(c=>c.label==='Passt zu …').state,'manual');assert.equal(groups[2].items.find(c=>c.label==='Abstände und Kerning').state,'manual');}
});
test('checklist disclosures and source attribution accompany each font',()=>{
 const source=fs.readFileSync(path.join(root,'scripts/typografie-fontaudit.js'),'utf8'),app=fs.readFileSync(path.join(root,'scripts/typografie-atelier.js'),'utf8'),html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8');
 assert.ok(source.includes("make('details','font-checklist')"));assert.ok(source.includes('Elliot Jay Stocks'));assert.ok(source.includes('a_checklist_for_choosing_type?preview.script=Latn'));
 assert.ok(source.includes('Prüfdaten nicht verfügbar'));assert.ok(app.includes('window.TypoFontAudit.attach(card,f,fontAudits.get(f.id))'));assert.ok(html.includes('creativecommons.org/licenses/by-sa/4.0/'));
});

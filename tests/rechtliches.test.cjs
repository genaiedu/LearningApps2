'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),css=read('styles/rechtliches.css');
const originals={
 'impressum.html':{count:9,sha:'d5071b1badd1530c5268d50827d6ae941d721f69276aee6ff0355426f8687fbe'},
 'datenschutz.html':{count:22,sha:'2965e97539a9d87268a0c568b79c806349d8c78313382367a72c9901c59f09e2'}
};
test('all original legal headings, paragraphs and contact information are unchanged',()=>{
 for(const[file,expected]of Object.entries(originals)){
  const article=read(file).match(/<article\b[^>]*>([\s\S]*?)<\/article>/)[1];
  const parts=[...article.matchAll(/<(h2|p|address)\b[^>]*>([\s\S]*?)<\/\1>/g)].map(m=>m[1]+':'+m[2].replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim());
  assert.equal(parts.length,expected.count,file);assert.equal(crypto.createHash('sha256').update(parts.join('\n')).digest('hex'),expected.sha,file);
 }
});
test('only the two legal pages opt into the new stylesheet and neutral palette',()=>{
 for(const f of Object.keys(originals)){const s=read(f);assert.ok(s.includes('styles/rechtliches.css?v=20261020-1'));assert.ok(!s.includes('styles/shared.css'));assert.ok(s.includes('Schiefergrau'));assert.ok(!/palette-select|fonts\.googleapis|fonts\.gstatic|https?:[^" ]+\.js/.test(s));const ids=[...s.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);for(const a of s.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(a[1]));}
 assert.ok(!/atelier|bordeaux|plum|palette-select/.test(css));
});
test('local genuine fonts provide ligatures, oldstyle and lining numerals and German coverage',()=>{
 const audit=JSON.parse(read('data/typografie-fontaudit.json')).families.flatMap(f=>f.files);
 for(const face of css.matchAll(/src:url\("([^"]+)"\)/g)){const bytes=fs.readFileSync(path.resolve(root,'styles',face[1])),sha=crypto.createHash('sha256').update(bytes).digest('hex'),entry=audit.find(f=>f.sha256===sha);assert.ok(entry);assert.equal(entry.germanMissing,'');for(const feature of['kern','liga','onum','pnum','lnum','tnum'])assert.ok(entry.features.includes(feature));}
 for(const feature of['font-kerning:normal','font-synthesis:none','font-variant-ligatures:common-ligatures','font-variant-numeric:oldstyle-nums proportional-nums','font-variant-numeric:lining-nums proportional-nums'])assert.ok(css.includes(feature));
});
test('appearance selection is scoped, optional and shared without new external dependencies',()=>{
 const js=read('scripts/rechtliches.js');assert.ok(js.includes('learningapps2-legal-theme'));assert.ok(js.includes('try{'));assert.ok(js.includes('button.hidden=false'));assert.ok(!/fetch\(|XMLHttpRequest|sessionStorage|document\.cookie/.test(js));assert.ok(css.includes('@media print'));assert.ok(css.includes('prefers-reduced-motion'));
});

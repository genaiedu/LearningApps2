'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const V=require('../scripts/kohelet-inhalte.js'),T=require('./kohelet-text.cjs');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'data/kohelet-gregor',name+'.json'),'utf8'));
const originals=read('gregor-original'),german=read('gregor-de'),kohelet=read('kohelet-original'),de=read('kohelet-de');
const refs=T.references(originals,german,read('gregor-koheletstellen'));
const counts=[18,26,22,17,19,12,29,17,18,20,10,14];
const corpus={version:1,kohelet:counts.map((count,i)=>({unit:i+1,verses:kohelet.filter(v=>v.ref.startsWith(i+1+'.')).map(v=>({...v,de:de[v.ref]}))})),gregor:V.homilies.map((title,i)=>({unit:i+1,title,chunks:[]}))};
let homily=0;
const compact=s=>s.replace(/\s/gu,'');
const withRefs=(text,offset,lang,page)=>({text,refs:(refs[lang][page]||[]).filter(r=>r.offset>=offset&&r.offset<offset+text.length).map(r=>({...r,offset:r.offset-offset}))});
for(const src of originals){
  const match=/ΟΜΙΛΙΑ\s+[ΑΒΓ∆ΕςΖΗ]\s*ʹ/u.exec(src.el),paras=german[src.page],di=paras.findIndex(p=>p.includes('HOMILIE.'));
  const offsets=[];let n=0;for(const p of paras){offsets.push(n);n+=p.length+1;}
  const append=(el,a,deIndices,h)=>{
    if(!el.trim()&&!deIndices.length)return;
    const greek=T.greekParagraphs(el).map(p=>withRefs(p.text,a+p.offset,'el',src.page));
    const germanParas=deIndices.map(i=>withRefs(paras[i],offsets[i],'de',src.page));
    corpus.gregor[h-1].chunks.push({id:`g-${src.page}-${h}`,el:greek,de:germanParas});
  };
  if(match){
    if(match.index>0&&di>0)append(src.el.slice(0,match.index),0,Array.from({length:di},(_,i)=>i),homily);
    homily++;
    const a=di===0?0:match.index;
    append(src.el.slice(a),a,Array.from({length:paras.length-di},(_,i)=>di+i),homily);
  }else append(src.el,0,paras.map((_,i)=>i),homily);
}
if(homily!==8||corpus.kohelet.reduce((s,c)=>s+c.verses.length,0)!==222)throw Error('Incomplete corpus');
const el=corpus.gregor.flatMap(h=>h.chunks.flatMap(c=>c.el.map(p=>p.text))).join(' '),ger=corpus.gregor.flatMap(h=>h.chunks.flatMap(c=>c.de.map(p=>p.text))).join(' ');
if(compact(el)!==compact(originals.map(p=>p.el).join(' '))||compact(ger)!==compact(Object.values(german).flat().join(' ')))throw Error('Incomplete homily split');
for(const t of V.tasks)for(const r of t.texts){
  if(r.work==='kohelet'){if(!corpus.kohelet[r.unit-1].verses.some(v=>v.ref===r.unit+'.'+r.from))throw Error('Bad verse '+t.id);}
  else if(T.locate(corpus.gregor[r.unit-1].chunks.flatMap(c=>c.de.map(p=>p.text)).join(' '),r.anchor)<0)throw Error('Bad task anchor '+t.id+': '+r.anchor);
}
fs.writeFileSync(path.join(root,'data/kohelet-gregor/lesetexte.json'),JSON.stringify(corpus));
console.log(JSON.stringify({koheletVerses:222,homilies:8,greekParagraphs:corpus.gregor.flatMap(h=>h.chunks.flatMap(c=>c.el)).length,tasks:V.tasks.length,greekAndGermanExact:true}));

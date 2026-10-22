'use strict';
// Reading paragraphs are editorial. They do not claim manuscript paragraphing
// or one-to-one alignment with the independently flowing German paragraphs.
function fold(text){
  let value='',positions=[];
  for(let i=0;i<text.length;){const c=String.fromCodePoint(text.codePointAt(i)),start=i;i+=c.length;
    for(const letter of c.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ').replace(/∆/g,'δ').replace(/[^\p{L}]/gu,'')){value+=letter;positions.push(start);}
  }
  return {value,positions};
}
function locate(text,needle,occurrence=1){const a=fold(text),b=fold(needle).value;let i=-1;if(occurrence==='last')i=a.value.lastIndexOf(b);else for(let n=0;n<occurrence;n++)i=a.value.indexOf(b,i+1);return i<0?-1:a.positions[i];}
function greekParagraphs(text){
  const boundaries=new Set([0,text.length]);
  for(const m of text.matchAll(/[.;;·]\s+(?=\p{Lu})/gu))boundaries.add(m.index+m[0].length);
  // Explicit discourse transitions, including the user's first-homily example.
  for(const anchor of ["πλὴν ἀλλ' ἐπειδὴ",'Καὶ πρῶτόν γε ἡμῖν','Ματαιότης ματαιοτήτων','ἄλλη δὲ ματαιότης λέγεται','ἔστι δὲ πολλάκις κἀκεῖνο','Εἰ οὖν ἤδη νενόηται','οὕτως καὶ ἅγιόν τι']){
    const p=locate(text,anchor);if(p>0)boundaries.add(p);
  }
  // Long prose stretches are divided only after completed sentences. No word,
  // decimal GNO marker, or clause is cut to manufacture equal-sized columns.
  let last=0;
  for(const m of text.matchAll(/(?<=[\p{L}»”')])[.;;]\s+/gu)){
    const end=m.index+m[0].length;
    const existing=[...boundaries].filter(x=>x>last&&x<=end).sort((a,b)=>a-b);
    if(existing.length)last=existing.at(-1);
    if(end-last>850){boundaries.add(end);last=end;}
  }
  const positions=[...boundaries].sort((a,b)=>a-b),out=[];
  for(let i=0;i<positions.length-1;i++){
    const a=positions[i],b=positions[i+1],raw=text.slice(a,b),trimmed=raw.trim();
    if(trimmed)out.push({text:trimmed,offset:a+raw.indexOf(trimmed)});
  }
  if(out.map(x=>x.text).join('').replace(/\s/gu,'')!==text.replace(/\s/gu,''))throw Error('Greek paragraphing lost text');
  return out;
}
function references(originals,german,definitions){const refs={el:{},de:{}};
  definitions.forEach((r,i)=>{for(const lang of ['el','de']){
    const [p,anchor]=r[lang],text=lang==='el'?originals[p-1].el:german[p].join(' '),offset=locate(text,anchor,r[lang+'Occurrence']||1);
    if(offset<0)throw Error(`Reference ${i} ${lang} not found`);
    (refs[lang][p]||=[]).push({offset,label:`Koh ${r.ref}`});
  }});return refs;
}
module.exports={fold,locate,greekParagraphs,references};

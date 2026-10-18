/* Local Knuth–Liang patterns; only discretionary hyphens enter the disposable print DOM. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../../LearningApps/vendor/hypher/hypher-umd.js'),root);else root.TypoHyphenation=factory(root.Hypher,root);})(typeof globalThis!=='undefined'?globalThis:this,(Hypher,root)=>{'use strict';
 const SHY='\u00ad',engines=new Map(),pending=new Map(),cache=new Map();
 const labels={de:'Deutsch · reformierte Rechtschreibung',en:'Englisch · britisch','en-us':'Englisch · amerikanisch',la:'Latein · klassische Trennung'};
 const script=root.document?.currentScript?.src,base=script?new URL('../../LearningApps/vendor/hypher/',script).href:root.location?new URL('../LearningApps/vendor/hypher/',root.location.href).href:'';
 const key=lang=>{const id=String(lang||'').toLowerCase();return ['de','de-de','de-at','de-1996'].includes(id)?'de':['en','en-gb'].includes(id)?'en':id==='en-us'?'en-us':/^la(?:-|$)/.test(id)?'la':null;};
 function register(language,patterns){const id=key(language);if(!id||!Hypher)throw Error('Trennsprache nicht verfügbar');const rules=id==='en-us'?{...patterns,exceptions:[patterns.exceptions,'dem‧o‧crat'].filter(Boolean).join(',')}:patterns;const engine=new Hypher(rules);engines.set(id,engine);cache.set(id,new Map());return engine;}
 async function prepare(language){const id=key(language);if(!id)return null;if(engines.has(id))return engines.get(id);if(!pending.has(id))pending.set(id,root.fetch(base+id+'.json?v=20261018-trennung',{credentials:'omit'}).then(r=>{if(!r.ok)throw Error('Trennmuster fehlen: '+id);return r.json();}).then(p=>register(id,p)).catch(error=>{pending.delete(id);throw error;}));return pending.get(id);}
 function breaks(word,language){
  const id=key(language),engine=engines.get(id);if(!engine||word.includes(SHY)||/^[A-ZÄÖÜẞ]{2,}$/.test(word))return [];
  const words=cache.get(id);if(words.has(word))return words.get(word);
  const map=[];let clean='';for(let i=0;i<word.length;i++)if(word[i]!=='\u200c'){clean+=word[i];map.push(i+1);}
  const result=[];if(clean.length>=6){let consumed=0;const parts=engine.hyphenate(clean);for(const part of parts.slice(0,-1)){consumed+=part.length;const before=clean.slice(0,consumed),after=clean.slice(consumed);if((before.match(/\p{L}/gu)||[]).length>=3&&(after.match(/\p{L}/gu)||[]).length>=3&&!/^\p{M}/u.test(after))result.push(map[consumed-1]);}}
  if(words.size>6000)words.clear();words.set(word,result);return result;
 }
 // URLs, email addresses and explicit author-provided soft hyphens stay intact.
 const tokens=/(?:https?:\/\/|www\.)[^\s<>]+|[\p{L}\p{N}._%+\-]+@[\p{L}\p{N}.\-]+\.[\p{L}]{2,}|[\p{L}\p{M}][\p{L}\p{M}\u00ad\u200c]*/gu;
 function positions(text,language,allowed=()=>true){const result=[];for(const match of text.matchAll(tokens)){if(match[0].includes('@')||/^(?:https?:\/\/|www\.)/i.test(match[0])||!allowed(match.index,match.index+match[0].length))continue;for(const n of breaks(match[0],language))result.push(match.index+n);}return result;}
 function text(value,language){const points=new Set(positions(value,language));let result='';for(let i=0;i<value.length;i++){result+=value[i];if(points.has(i+1))result+=SHY;}return result;}
 function paragraph(element,language){
  const doc=element.ownerDocument,walker=doc.createTreeWalker(element,4),nodes=[];let node,plain='';
  while((node=walker.nextNode())){const start=plain.length;plain+=node.data;nodes.push({node,start,end:plain.length,language:node.parentElement.closest('[lang]')?.lang||language,blocked:Boolean(node.parentElement.closest('code,kbd,samp,a,svg,math,[data-no-hyphenate]'))});}
  const additions=[];
  for(const match of plain.matchAll(tokens)){
   if(match[0].includes('@')||/^(?:https?:\/\/|www\.)/i.test(match[0]))continue;
   const touched=nodes.filter(n=>n.start<match.index+match[0].length&&n.end>match.index),id=key(touched[0]?.language);
   if(!id||touched.some(n=>n.blocked||key(n.language)!==id))continue;
   for(const n of breaks(match[0],id))additions.push(match.index+n);
  }
  for(const part of nodes){const own=additions.filter(n=>n>part.start&&n<=part.end).map(n=>n-part.start);if(!own.length)continue;let output='',from=0;for(const n of own){output+=part.node.data.slice(from,n)+SHY;from=n;}part.node.data=output+part.node.data.slice(from);}
  return additions.length;
 }
 async function apply(article,language){
  const languages=new Set([language,...[...article.querySelectorAll('[lang]')].map(n=>n.lang)]);await Promise.all([...languages].map(prepare));
  let count=0;for(const p of article.querySelectorAll('.print-paragraph,.print-quote')){count+=paragraph(p,language);p.dataset.hyphenation=key(p.closest('[lang]')?.lang||language)||'off';}
  const id=key(language);article.dataset.hyphenation=id||'off';return {label:id?labels[id]:'Keine Trennmuster für diese Sprache',points:count};
 }
 // Paged.js adds a hard U+2011 at a word split across pages. Keep its visible glyph,
 // but move it into generated content so it does not become part of copied source text.
 function finish(host){let count=0;for(const parent of host.querySelectorAll('.pagedjs_hyphen')){if(!parent.closest('.print-paragraph[data-hyphenation],.print-quote[data-hyphenation]'))continue;const walker=parent.ownerDocument.createTreeWalker(parent,4);let node,last;while((node=walker.nextNode()))if(node.data)last=node;if(!last?.data.endsWith('\u2011'))continue;last.data=last.data.slice(0,-1);const marker=parent.ownerDocument.createElement('span');marker.className='print-discretionary-hyphen';marker.setAttribute('aria-hidden','true');last.after(marker);count++;}return count;}
 function copy(event){const selection=root.getSelection?.();if(!event.clipboardData||!selection?.rangeCount)return;const node=selection.getRangeAt(0).commonAncestorContainer,element=node.nodeType===1?node:node.parentElement;if(!element?.closest('#print-pages'))return;const plain=selection.toString();if(!plain.includes(SHY))return;event.clipboardData.setData('text/plain',plain.replace(/\u00ad/g,''));event.preventDefault();}
 root.document?.addEventListener('copy',copy);
 return {key,labels,register,prepare,breaks,text,apply,finish,copy};
});

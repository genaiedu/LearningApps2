/* Paged.js 0.4.3 footnote continuations mistake avoid/auto for forced breaks.
 * Ignore those values only during the footnote handler, never globally.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.SchriftsetzerPagination=api;api.install(root.Paged);}})(typeof window==='object'?window:globalThis,()=>{'use strict';
 const forced=new Set(['page','always','left','right','recto','verso','all']);
 function install(Paged){const proto=Paged?.registeredHandlers?.find(Handler=>Handler.name==='Footnotes')?.prototype;if(!proto||proto.schriftsetzerPatched)return false;const original=proto.afterPageLayout;if(typeof original!=='function')return false;
  proto.afterPageLayout=function(pageElement,page,breakToken,chunker){const data=breakToken?.node?.dataset,saved=[];if(data)for(const key of ['breakBefore','previousBreakAfter'])if(data[key]!==undefined&&!forced.has(data[key])){saved.push([key,data[key]]);delete data[key];}try{return original.call(this,pageElement,page,breakToken,chunker);}finally{for(const [key,value]of saved)data[key]=value;}};
  proto.schriftsetzerPatched=true;return true;
 }
 // In flowing imports, sections are semantic groups, not pagination boxes.
 // Keep their headings/IDs/source markers, but let paragraphs and their notes
 // paginate directly. Explicit new-page/right-page chapter boxes stay intact.
 function prepare(source,doc){if(!doc.imported||doc.fixedPages)return;for(const part of source.querySelectorAll(':scope > .print-section'))if(!['page','right'].includes(part.dataset.bookStart))part.replaceWith(...part.childNodes);}
 return {install,prepare};
});

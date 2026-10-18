/* Book structure and special pages. Shared by the workshop and the print reader. */
(()=>{'use strict';
 const number=(value,fallback,min,max)=>{const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
 const choice=(value,values,fallback)=>values.includes(value)?value:fallback;
 const text=(value,max)=>typeof value==='string'?value.slice(0,max):'';
 const starts=['flow','page','right'];
 function entries(doc){const seen=new Map();return (doc.sections||[]).map((section,index)=>{const title=section.title||'',level=section.level||2,base=JSON.stringify([title,level]),occurrence=seen.get(base)||0;seen.set(base,occurrence+1);return {index,title,level,key:JSON.stringify([title,level,occurrence]),chapter:Boolean(title&&(section.sourceLevel!=null?section.sourceLevel===1:level===2))};}).filter(entry=>entry.title);}
 function normalize(value={}){return {
  titleMode:choice(value.titleMode,['existing','separate','inline','none'],'existing'),
  titleStyle:choice(value.titleStyle,['classic','editorial','quiet'],'classic'),localMetadata:value.localMetadata===true,
  title:text(value.title,160),subtitle:text(value.subtitle,200),author:text(value.author,120),imprint:text(value.imprint,180),
  titleSize:number(value.titleSize,32,20,44),titleTop:number(value.titleTop,2,0,6),
  image:typeof value.image==='string'&&/^blob:/.test(value.image)?value.image:'',imageAlt:text(value.imageAlt,120),
  tocStyle:choice(value.tocStyle,['plain','leaders','compact'],'plain'),tocDepth:choice(value.tocDepth,['all','chapters'],'all'),tocTitle:text(value.tocTitle,80),tocSize:number(value.tocSize,10,9,13),
  chapterStart:choice(value.chapterStart,starts,'flow'),chapterSpace:Math.round(number(value.chapterSpace,3,0,8)),hideChapterHeader:value.hideChapterHeader!==false,
  chapters:(Array.isArray(value.chapters)?value.chapters:[]).slice(0,1000).filter(entry=>entry&&typeof entry.key==='string').map(entry=>({key:entry.key.slice(0,1000),chapter:entry.chapter===true,start:choice(entry.start,['inherit',...starts],'inherit')}))
 };}
 function chapter(entry,book){const override=book.chapters.find(item=>item.key===entry.key);return {chapter:override?override.chapter:entry.chapter,start:override&&override.start!=='inherit'?override.start:book.chapterStart};}
 function fromQuery(query){if(!query.has('book'))return undefined;try{const raw=query.get('book');if(raw.length>30000)return undefined;return normalize(JSON.parse(raw));}catch(_){return undefined;}}
 function prepare(source,doc,s){if(!s.book||doc.fixedPages)return;const book=normalize(s.book),d=source.ownerDocument,make=(tag,cls,value)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
  source.classList.add('print-book-document');
  // Never remove an imported title/image from the user's actual document.
  const oldCover=source.querySelector(':scope > .print-cover');
  if(book.titleMode!=='existing')oldCover?.remove();
  if(['separate','inline'].includes(book.titleMode)){
   const cover=make('header','print-cover '+(book.titleMode==='separate'?'print-book-title-page':'print-book-inline-title'));
   cover.dataset.bookTitleStyle=book.titleStyle;
   if(book.author)cover.append(make('p','print-byline print-book-author',book.author));
   cover.append(make('h1','print-title',book.title||doc.title));
   if(book.subtitle)cover.append(make('p','print-kicker',book.subtitle));
   if(book.image){const image=make('img','print-book-title-image');image.src=book.image;image.alt=book.imageAlt||'Titelbild';image.decoding='sync';cover.append(image);}
   if(book.imprint)cover.append(make('p','print-byline print-book-imprint',book.imprint));
   // An imported cover stays first: its original edge-to-edge @page:first is retained.
   const importedCover=source.querySelector(':scope > .print-import-cover');
   if(book.titleMode==='inline'){const firstText=source.querySelector(':scope > .print-import-intro,:scope > .print-section');if(firstText)firstText.before(cover);else source.append(cover);}
   else if(importedCover)importedCover.after(cover);else source.prepend(cover);
  }
  const headings=[];
  for(const entry of entries(doc)){
   const heading=source.querySelector('#print-section-'+entry.index),part=heading?.closest('.print-section');if(!part)continue;
   const setting=chapter(entry,book);headings.push({heading,entry,...setting});
   if(setting.chapter){part.classList.add('print-book-chapter');part.dataset.bookStart=setting.start;heading.classList.add('print-book-chapter-title');}
  }
  let contents=source.querySelector(':scope > .print-contents');
  if(!s.toc){contents?.remove();return;}
  const included=headings.filter(item=>book.tocDepth==='all'||item.chapter);
  if(!included.length){contents?.remove();return;}
  if(!contents){contents=make('nav','print-contents');const first=source.querySelector(':scope > .print-section');if(first)first.before(contents);else source.append(contents);}
  contents.dataset.bookContentsStyle=book.tocStyle;
  const heading=make('h2','print-contents-title',book.tocTitle||(doc.lang==='la'?'Capita':doc.lang.startsWith('de')?'Inhalt':'Contents')),list=make('ol');
  for(const item of included){const li=make('li',item.chapter?'print-book-contents-chapter':'print-contents-sublevel'),a=make('a','print-contents-link',item.entry.title);a.href='#'+item.heading.id;li.append(a);list.append(li);}
  contents.replaceChildren(heading,list);
 }
 function css(doc,s,geometry){if(!s.book||doc.fixedPages)return '';const b=normalize(s.book),height=geometry.height-geometry.top-geometry.bottom,small=Math.max(9,s.size-1),titleSize=b.titleSize,files=s.roles?.heading?.font?.files||[],cuts=files.filter(f=>f.style==='normal').flatMap(f=>Array.isArray(f.weight)?[Math.max(f.weight[0],Math.min(400,f.weight[1]))]:[f.weight]),quietWeight=cuts.sort((a,b)=>Math.abs(a-400)-Math.abs(b-400))[0]||400;
  return `
@page book-title{@top-left{content:none;}@bottom-left{content:none;}@bottom-right{content:none;}}
@page book-contents{@top-left{content:none;}}
@page:blank{@top-left{content:none;}@bottom-left{content:none;}@bottom-right{content:none;}}
.print-book-title-page{page:book-title;min-height:${Math.max(10,height-1)}mm;padding-top:${b.titleTop*10}mm;margin:0;break-before:page;break-after:page;break-inside:avoid;}
.print-book-title-page .print-title,.print-book-inline-title .print-title{font-size:${titleSize}pt;line-height:1.12;overflow-wrap:anywhere;letter-spacing:-.015em;margin:7mm 0 5mm;}
.print-book-title-page p,.print-book-inline-title p{text-indent:0!important;hyphens:none!important;}
.print-book-title-page .print-kicker,.print-book-inline-title .print-kicker{font-size:${Math.min(15,s.size+2)}pt;line-height:1.4;}
.print-cover[data-book-title-style="classic"],.print-cover[data-book-title-style="quiet"],.print-book-inline-title{text-align:center;}
.print-cover[data-book-title-style="editorial"]{text-align:left;}
.print-cover[data-book-title-style="classic"] p,.print-cover[data-book-title-style="quiet"] p,.print-book-inline-title p{text-align:center;text-align-last:center;}
.print-cover[data-book-title-style="editorial"] p{text-align:left;text-align-last:left;}
.print-cover[data-book-title-style="editorial"] .print-title{border-top:1pt solid currentColor;padding-top:7mm;}
.print-cover[data-book-title-style="quiet"] .print-title{font-weight:${quietWeight};letter-spacing:0;}
.print-book-title-page .print-book-imprint{margin-top:12mm;white-space:pre-line;}
.print-book-title-image{display:block;max-width:100%;width:auto;height:auto;max-height:${Math.max(15,height*.27)}mm;object-fit:contain;margin:7mm auto 0;}
.print-book-inline-title{page:auto;break-after:auto;min-height:0;padding:0;margin:0 0 calc(var(--baseline) * 2);}
.print-book-document>.print-contents{page:book-contents;break-before:page;break-after:page;font-size:${b.tocSize}pt;line-height:1.5;}
.print-book-document>.print-contents .print-contents-title{font-size:1.5em;line-height:1.3;font-weight:inherit;margin:0 0 8mm;}
.print-book-document>.print-contents li{margin:0 0 ${b.tocStyle==='compact'?'1.5':'4'}mm;}
.print-book-document>.print-contents .print-book-contents-chapter{padding-left:0;}
.print-contents[data-book-contents-style="leaders"] .print-contents-link{border-bottom:.5pt dotted #777;padding-bottom:1mm;}
.print-book-chapter[data-book-start="page"]:not([data-split-from]){break-before:page;}
.print-book-chapter[data-book-start="right"]:not([data-split-from]){break-before:right;}
.print-book-chapter[data-book-start="page"]>.print-book-chapter-title:not([data-split-from]),.print-book-chapter[data-book-start="right"]>.print-book-chapter-title:not([data-split-from]){padding-top:calc(var(--baseline) * ${b.chapterSpace});margin-top:0;}
.print-book-title-page-output .pagedjs_margin-top,.print-book-title-page-output .pagedjs_margin-bottom,.print-book-blank-page .pagedjs_margin-top,.print-book-blank-page .pagedjs_margin-bottom,.print-book-contents-page .pagedjs_margin-top${b.hideChapterHeader?',.print-book-chapter-opening .pagedjs_margin-top':''}{visibility:hidden;}
.print-book-document .print-section-title+.print-paragraph{font-size:inherit;}
.print-book-document .print-book-author,.print-book-document .print-book-imprint{font-size:${small}pt;}
`;}
 function decorate(host,doc,s){if(!s.book||doc.fixedPages)return;for(const page of host.querySelectorAll('.pagedjs_page')){
  const blank=page.classList.contains('pagedjs_blank_page');
  if(blank)page.classList.add('print-book-blank-page');
  const cover=page.querySelector('.print-book-title-page,.print-import-cover');
  if(cover)page.classList.add('print-book-title-page-output');
  if(page.querySelector('.print-contents'))page.classList.add('print-book-contents-page');
  const first=page.querySelector('.print-book-chapter:not([data-split-from])');
  if(first&&first.dataset.bookStart!=='flow'&&first.querySelector('.print-book-chapter-title:not([data-split-from])'))page.classList.add('print-book-chapter-opening');
  if(blank||cover)for(const margin of page.querySelectorAll('[data-print-folio]'))margin.dataset.printFolio='';
  if(blank)for(const ribbon of page.querySelectorAll('.print-ribbon'))ribbon.remove();
 }}
 window.TypoBookLayout={entries,normalize,chapter,fromQuery,prepare,css,decorate};
})();

/* Public-domain Vulgate text. A modern book design, not a manuscript transcription. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TypoManuscript=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{'use strict';
 const font={id:'fondamento',name:'Fondamento',group:'handwriting',features:['liga'],files:[{path:'../LearningApps/fonts/fondamento/Fondamento-Regular.ttf',style:'normal',weight:400},{path:'../LearningApps/fonts/fondamento/Fondamento-Italic.ttf',style:'italic',weight:400}]};
 const paper={width:300,height:420};
 const numerals=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
 // Reading paragraphs, not verse-by-verse decorative initials. The source's Vulgate numbering is retained.
 const paragraphEnds=[[2,7,11,18],[3,11,17,23,26],[8,15,22],[3,6,8,12,16,17],[6,8,11,16,19],[6,11],[7,15,23,30],[8,13,17],[6,10,12,18],[7,11,15,20],[6,10],[7,8,12,14]];
 const sentence=text=>text.charAt(0).toUpperCase()+text.slice(1).replace(/[.!?]+$/,'')+'.';
 function build(data){
  if(data.chapters?.length!==12)throw Error('Kohelet: zwölf Kapitel erforderlich');
  return {id:'vulgata',label:'Kohelet · Fondamento',lang:'la',title:'Liber Ecclesiastes',subtitle:'Vanitas vanitatum',author:'Vulgata',date:'Capita I–XII',credit:data.edition,source:data.chapters[0].source,sections:data.chapters.map((chapter,i)=>{
   if(chapter.number!==i+1||chapter.verses.length!==paragraphEnds[i].at(-1))throw Error('Kohelet: unvollständiges Kapitel '+(i+1));
   let from=0;return {title:'Caput '+numerals[i],blocks:paragraphEnds[i].map(to=>{const start=from;from=to;return {kind:'p',verseStart:start+1,verseEnd:to,runs:[{text:chapter.verses.slice(start,to).map(sentence).join(' ')}]};})};
  })};
 }
 let loading;
 function load(){if(!loading)loading=fetch('data/typografie-kohelet.json?v=20261018-kohelet').then(r=>{if(!r.ok)throw Error('Kohelet-Text nicht verfügbar');return r.json();}).then(build).catch(error=>{loading=null;throw error;});return loading;}
 function modern(document){return {...document,id:'kohelet',label:'Kohelet · vollständige Vulgata',title:'Kohelet',subtitle:'Liber Ecclesiastes · alle zwölf Kapitel',date:'',credit:'Vollständiger Kohelet, lateinische Vulgata. Großschreibung, Satzzeichen und Leseabsätze redaktionell für diese Satzprobe eingerichtet. Gemeinfreier Originaltext; keine Übersetzung.'};}
 const loadModern=()=>load().then(modern);
 function settings(){return {kind:'vulgata',format:'book',layout:'classic',size:16,leading:1.45,alignment:'left',headingStyle:'classic',numerals:'oldstyle',toc:false,notes:false,grid:false,spread:true,roles:Object.fromEntries(['body','heading','contents','quote','note','data'].map(id=>[id,{font,weight:400}]))};}
 function css(doc){if(doc.id!=='vulgata')return '';return `
 .pagedjs_sheet{background:#fbf4e1!important;color:#302c24;}
 .pagedjs_page_content{color:#302c24;font-variant-numeric:normal;}
 .print-cover{break-after:page;text-align:center;padding-top:50mm;}
 .pagedjs_page_content .print-cover p{text-align:center;}
 .print-title{font-size:46pt;font-weight:400;line-height:1.25;text-align:center;color:#9c2924;margin:20mm 0;letter-spacing:0;}
 .pagedjs_page_content .print-kicker{font-family:'Fondamento',cursive;font-size:20pt;font-weight:400;color:#9c2924;}
 .pagedjs_page_content .print-byline{font-family:'Fondamento',cursive;font-size:16pt;line-height:1.6;}
 .print-section+.print-section{break-before:auto;}
 .print-section-title{font-size:14pt;font-weight:400;color:#9c2924;margin:23.2pt 0 11.6pt;line-height:23.2pt;}
 .pagedjs_page_content .print-paragraph{text-indent:1em;text-align:left;hyphens:none;line-height:23.2pt;margin:0;}
 .pagedjs_page_content .print-chapter-start{display:flow-root;text-indent:0;}
 .print-chapter-start:not([data-split-from])::first-letter{float:left;font-family:'Fondamento',cursive;font-weight:400;font-size:42pt;line-height:42pt;color:#a52e27;margin:0 4pt 0 0;}
 .pagedjs_page_content .print-paragraph[data-split-from]{text-indent:0;}
 .pagedjs_margin-content{font-family:'Fondamento',cursive!important;color:#8a3028;}
 .reader-blank-page{background:#fbf4e1!important;}
 [data-manuscript-folio]::after{content:attr(data-manuscript-folio)!important;}
 `;}
 return {font,paper,build,load,modern,loadModern,settings,css};
});

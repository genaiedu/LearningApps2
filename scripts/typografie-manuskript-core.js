/* Original Vulgate text; modern punctuation and capitalisation, not a manuscript transcription. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TypoManuscript=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{'use strict';
 const font={id:'fondamento',name:'Fondamento',group:'handwriting',features:['liga'],files:[{path:'../LearningApps/fonts/fondamento/Fondamento-Regular.ttf',style:'normal',weight:400},{path:'../LearningApps/fonts/fondamento/Fondamento-Italic.ttf',style:'italic',weight:400}]};
 const verses=[
 'Omnia tempus habent, et suis spatiis transeunt universa sub caelo.',
 'Tempus nascendi et tempus moriendi; tempus plantandi et tempus evellendi quod plantatum est.',
 'Tempus occidendi et tempus sanandi; tempus destruendi et tempus aedificandi.',
 'Tempus flendi et tempus ridendi; tempus plangendi et tempus saltandi.',
 'Tempus spargendi lapides et tempus colligendi; tempus amplexandi et tempus longe fieri a conplexibus.',
 'Tempus adquirendi et tempus perdendi; tempus custodiendi et tempus abiciendi.',
 'Tempus scindendi et tempus consuendi; tempus tacendi et tempus loquendi.',
 'Tempus dilectionis et tempus odii; tempus belli et tempus pacis.',
 'Quid habet amplius homo de labore suo?',
 'Vidi adflictionem quam dedit Deus filiis hominum, ut distendantur in ea.',
 'Cuncta fecit bona in tempore suo, et mundum tradidit disputationi eorum, ut non inveniat homo opus quod operatus est Deus ab initio usque ad finem.',
 'Et cognovi quod non esset melius nisi laetari et facere bene in vita sua.'
 ];
 const document={id:'vulgata',label:'Kohelet · Fondamento',lang:'la',title:'Liber Ecclesiastes',subtitle:'Omnia tempus habent',author:'Vulgata',date:'Caput III',credit:'Kohelet 3,1–12 · lateinische Vulgata; Interpunktion und Absatzbildung für diese Satzprobe eingerichtet. Keine Nachbildung einer bestimmten Handschrift.',source:'https://vulgate.org/ot/ecclesiastes_3.htm',sections:[{title:'Caput III · 1–6',blocks:verses.slice(0,6).map(text=>({kind:'p',runs:[{text}]}))},{title:'Caput III · 7–12',blocks:verses.slice(6).map(text=>({kind:'p',runs:[{text}]}))}]};
 function settings(){return {kind:'vulgata',format:'book',layout:'classic',size:14,leading:1.4,alignment:'left',headingStyle:'classic',numerals:'oldstyle',toc:false,notes:false,grid:false,spread:true,roles:Object.fromEntries(['body','heading','contents','quote','note','data'].map(id=>[id,{font,weight:400}]))};}
 function css(doc){if(doc.id!=='vulgata')return '';return `
 .pagedjs_sheet{background:#fbf4e1!important;color:#302c24;}
 .pagedjs_page_content{color:#302c24;font-variant-numeric:normal;}
 .print-cover{break-after:page;text-align:center;padding-top:22mm;}
 .pagedjs_page_content .print-cover p{text-align:center;}
 .print-title{font-size:29pt;font-weight:400;line-height:1.25;text-align:center;color:#9c2924;margin:12mm 0;letter-spacing:0;}
 .pagedjs_page_content .print-kicker{font-family:'Fondamento',cursive;font-size:13pt;font-weight:400;color:#9c2924;}
 .pagedjs_page_content .print-byline{font-family:'Fondamento',cursive;font-size:12pt;line-height:1.6;}
 .print-section+.print-section{break-before:page;}
 .print-section-title{font-size:11pt;font-weight:400;color:#9c2924;margin:0 0 8pt;line-height:20pt;}
 .pagedjs_page_content .print-paragraph{display:flow-root;text-indent:0;text-align:left;hyphens:none;line-height:20pt;margin:0 0 6pt;}
 .print-paragraph::first-letter{float:left;font-family:'Fondamento',cursive;font-weight:400;font-size:30pt;line-height:30pt;color:#a52e27;margin:0 3pt 0 0;}
 .pagedjs_margin-content{font-family:'Fondamento',cursive!important;color:#8a3028;}
 .reader-blank-page{background:#fbf4e1!important;}
 .pagedjs_page[data-page-number="1"] .pagedjs_margin-bottom-right .pagedjs_margin-content::after{content:none!important;}
 .pagedjs_page[data-page-number="2"] .pagedjs_margin-bottom-left .pagedjs_margin-content::after{content:"2"!important;}
 .pagedjs_page[data-page-number="3"] .pagedjs_margin-bottom-right .pagedjs_margin-content::after{content:"3"!important;}
 `;}
 return {font,verses,document,settings,css};
});

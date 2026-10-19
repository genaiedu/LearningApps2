/* Editable Word export. Page geometry comes from the same source as the reader. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SchriftsetzerWord=api;})(typeof window==='object'?window:globalThis,()=>{'use strict';
 const twips=mm=>Math.round(mm*1440/25.4),ptTwips=pt=>Math.round(pt*20);
 const language=lang=>({'de':'de-DE','en':'en-GB','en-US':'en-US','la':'la'}[lang]||'de-DE');
 function pageSettings(settings,geometry){const g=geometry.geometry(settings.format,settings.layout,settings.pageMode);return {geometry:g,page:{size:{width:twips(g.width),height:twips(g.height)},margin:{top:twips(g.top),bottom:twips(g.bottom),left:twips(g.inner),right:twips(g.outer),gutter:0,header:twips(Math.max(3,g.top-11)),footer:twips(Math.max(3,g.bottom-11))}}};}
 function filename(title){return (String(title||'Schriftsetzer').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').trim().slice(0,100)||'Schriftsetzer')+'.docx';}
 function notices(job){return [
  (job.settings.pageMode&&job.settings.pageMode!=='spread'?'Papierformat und einseitige Ränder werden übernommen.':'Papierformat und gespiegelte Satzränder werden übernommen.')+' Word berechnet Zeilen und Seiten neu.',
  'Die verwendeten Schriftschnitte werden vollständig eingebettet. Moderne Word-Desktopversionen können sie ohne vorherige Installation verwenden.',
  ...(job.settings.toc?['Das Inhaltsverzeichnis in Word bei Bedarf mit „Felder aktualisieren“ neu berechnen.']:[]),
  ...(job.settings.ribbons?.length?['Banderolen werden nicht in Word übernommen. Für diese Gestaltung PDF verwenden.']:[]),
  ...(job.settings.design==='medieval'&&job.settings.dropCaps!==false?['Schmuckinitialen werden als normale Buchstaben exportiert. Für die genaue historische Gestaltung PDF verwenden.']:[])
 ];}
 async function build(job,{docx:D,fflate:F,geometry,bookLayout,loadImage,fonts}){
  const doc=job.document,s=job.settings;if(doc.fixedPages)throw new Error('Unveränderte PDF-Originalseiten bitte als PDF sichern. Für bearbeitbares Word erneut mit „Neuer Satz“ importieren.');
  if(!doc?.sections?.length)throw new Error('Es ist noch kein Text zum Exportieren vorhanden.');
  const {page,geometry:g}=pageSettings(s,geometry),book=bookLayout.normalize(s.book),entries=bookLayout.entries(doc),size=Number(s.size)||11,baseline=size*(Number(s.leading)||1.4),align=s.alignment==='justify'?D.AlignmentType.JUSTIFIED:D.AlignmentType.LEFT;
  const lang=language(doc.lang),footnotes={},sections=[];let noteId=0,sourceNoteUsed=false;
  if(!fonts)throw new Error('Die Schriften zum Einbetten sind noch nicht verfügbar. Bitte erneut versuchen.');
  const role=(id,extra={})=>{const {fontObject,...attributes}=extra,r=s.roles[id]||s.roles.body,weight=extra.bold===true?700:extra.bold===false?400:r.weight,face=fonts.resolve(fontObject||r.font,weight,!!extra.italics);return {size:size*2,kern:2,language:{value:lang},color:'18251E',...attributes,font:face.name,bold:face.bold,italics:face.italic};};
  function runs(values,id='body',extra={},absoluteSize=false){return (values||[]).flatMap(r=>{
   if(r.note){const n=++noteId;footnotes[n]={children:[new D.Paragraph({children:[new D.TextRun({...role('note',{size:18}),text:r.note})]})]};return [new D.FootnoteReferenceRun(n)];}
   const preserve=!doc.imported||doc.preserveFormatting!==false,style=preserve?{...(r.bold!==undefined?{bold:!!r.bold}:{}),...(r.size?{size:(doc.imported&&!absoluteSize?r.size/(doc.baseSize||11)*size:r.size)*2}:{}),...(/^#?[0-9a-f]{6}$/i.test(r.color||'')?{color:r.color.replace('#','')}:{}),...(r.superScript?{superScript:true}:{}),...(r.subScript?{subScript:true}:{})}:{};
   const selected=(s.titleFonts||[]).find(f=>f.id===r.fontId);
   return String(r.text||'').split('\n').map((text,index)=>new D.TextRun({...role(id,{...extra,...style,...(selected?{fontObject:selected}:{}),italics:r.em===undefined?!!extra.italics:!!r.em,vanish:r.hidden===true}),text,...(index?{break:1}:{})}));
  });}
  const para=(text,id='body',options={})=>{const values=typeof text==='string'?[{text}]:text,largest=(doc.imported||doc.rich)&&doc.preserveFormatting!==false?Math.max(size,...(values||[]).map(r=>r.size?(doc.imported?r.size/(doc.baseSize||11)*size:r.size):size)):size,spacing={before:0,after:0,line:ptTwips(baseline),lineRule:D.LineRuleType.EXACT,...options.spacing};if(largest>size){spacing.line=Math.max(spacing.line,ptTwips(largest*1.2));spacing.lineRule=D.LineRuleType.AT_LEAST;}return new D.Paragraph({alignment:align,widowControl:true,...options,spacing,children:runs(values,id)});};
  const blank=()=>new D.Paragraph({spacing:{before:0,after:0,line:20,lineRule:D.LineRuleType.EXACT},children:[]});
  function header(empty=false){return new D.Header({children:[empty?blank():new D.Paragraph({alignment:D.AlignmentType.LEFT,spacing:{before:0,after:0},children:[new D.TextRun({...role('data',{size:16}),text:doc.author||''})]})]});}
  function footer(left=false,empty=false){return new D.Footer({children:[empty?blank():new D.Paragraph({alignment:left?D.AlignmentType.LEFT:D.AlignmentType.RIGHT,spacing:{before:0,after:0},children:[new D.TextRun({...role('data',{size:18}),children:[D.PageNumber.CURRENT]})]})]});}
  function section(children,{type=D.SectionType.NEXT_PAGE,cover=false,chapter=false}={}){
   const firstEmpty=cover||(chapter&&book.hideChapterHeader);
   return {properties:{page,type,titlePage:firstEmpty},headers:{default:header(cover),even:header(cover),first:header(true)},footers:{default:footer(false,cover),even:footer(true,cover),first:footer(false,cover)},children:children.length?children:[blank()]};
  }
  async function figure(item,maxHeight=g.textHeight*.55){
   if(!item.src)return [para(item.alt||'[Bild fehlt]','note')];
   const image=await loadImage(item),maxW=g.textWidth*96/25.4,maxH=maxHeight*96/25.4,scale=Math.min(maxW/image.width,maxH/image.height,1);
   const picture=new D.ImageRun({type:image.type,data:image.data,transformation:{width:Math.max(1,Math.round(image.width*scale)),height:Math.max(1,Math.round(image.height*scale))},altText:{title:item.alt||'Abbildung',description:item.alt||'Abbildung',name:item.alt||'Abbildung'}});
   const caption=[item.caption,item.credit].filter(Boolean).join(' '),nodes=[new D.Paragraph({alignment:D.AlignmentType.CENTER,keepNext:!!caption,spacing:{before:ptTwips(baseline),after:ptTwips(baseline/2)},children:[picture]})];
   if(caption)nodes.push(para(item.captionRuns||caption,'note',{alignment:D.AlignmentType.LEFT,keepLines:true,spacing:{before:0,after:ptTwips(baseline)}}));return nodes;
  }
  async function table(item){
   const rows=item.richRows||[...(item.heads?.length?[{header:true,cells:item.heads.map(text=>({blocks:[{kind:'p',runs:[{text}]}]}))}]:[]),...(item.rows||[]).map(row=>({cells:row.map(text=>({blocks:[{kind:'p',runs:[{text:String(text)}]}]}))}))];
   const count=Math.max(1,...rows.map(row=>row.cells.reduce((sum,c)=>sum+(c.colSpan||1),0))),width=twips(g.textWidth),cellWidth=Math.floor(width/count),border={style:D.BorderStyle.SINGLE,size:4,color:'D9D9D9'};
   const result=new D.Table({width:{size:width,type:D.WidthType.DXA},columnWidths:Array(count).fill(cellWidth),borders:{top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border},rows:await Promise.all(rows.map(async row=>new D.TableRow({tableHeader:!!row.header,children:await Promise.all(row.cells.map(async cell=>{const content=await blocks(cell.blocks||[],false,true);return new D.TableCell({columnSpan:cell.colSpan||1,rowSpan:cell.rowSpan||1,width:{size:cellWidth*(cell.colSpan||1),type:D.WidthType.DXA},margins:{top:100,bottom:100,left:100,right:100},verticalAlign:D.VerticalAlign.CENTER,shading:row.header?{fill:'EEEEEE'}:undefined,children:content.length?content:[blank()]});}))})))});
   return [...(item.caption?[para(item.captionRuns||item.caption,'note',{keepNext:true,spacing:{before:ptTwips(baseline),after:ptTwips(baseline/2)}})]:[]),result,blank()];
  }
  async function blocks(items,chapter=false,inTable=false){const out=[];let previousParagraph=false;
   for(const item of items){if(item.kind==='figure'){out.push(...await figure(item,s.illustrations==='pages'?g.textHeight-18:undefined));previousParagraph=false;continue;}
    if(item.kind==='table'){out.push(...await table(item));previousParagraph=false;continue;}
    const quote=item.kind==='quote',title=item.kind==='title',subtitle=item.kind==='subtitle',id=inTable?'data':title?'heading':subtitle?'data':quote?'quote':'body',values=[...(item.runs||[{text:item.text||''}])];
    if(!sourceNoteUsed&&!inTable&&s.notes&&doc.note){sourceNoteUsed=true;values.push({note:doc.note});}
    if(values.length&&values.every(r=>r.hidden))continue;
    const paragraphAlignment={left:D.AlignmentType.LEFT,right:D.AlignmentType.RIGHT,center:D.AlignmentType.CENTER,justify:D.AlignmentType.JUSTIFIED}[item.align||item.style?.align];
    const p=para(values,id,{...(title?{style:'Title'}:{}),alignment:paragraphAlignment||(quote||inTable?D.AlignmentType.LEFT:align),indent:quote?{left:ptTwips(size),right:ptTwips(size)}:previousParagraph&&!title&&!subtitle?{firstLine:ptTwips(size)}:undefined,spacing:{before:quote||title?ptTwips(baseline):0,after:quote||title||subtitle?ptTwips(baseline):0,line:ptTwips(size*(item.style?.leading||s.leading)),lineRule:title||subtitle?D.LineRuleType.AT_LEAST:D.LineRuleType.EXACT}});
    out.push(p);previousParagraph=!quote;
   }return out;
  }
  const metadata=['separate','inline'].includes(book.titleMode)?book:doc;let inlineTitle=[];
  if(doc.cover)sections.push(section(await figure(doc.cover,g.textHeight-15),{cover:true}));
  if(book.titleMode!=='none'&&!(book.titleMode==='existing'&&doc.imported)){
   const titleAlign=book.titleStyle==='editorial'?D.AlignmentType.LEFT:D.AlignmentType.CENTER,title=metadata.title||doc.title;
   const titleNodes=[];if(metadata.author)titleNodes.push(para(metadata.author,'heading',{alignment:titleAlign,spacing:{before:twips((book.titleMode==='separate'?book.titleTop:1)*10),after:ptTwips(baseline)}}));
   titleNodes.push(new D.Paragraph({style:'Title',alignment:titleAlign,spacing:{before:titleNodes.length?0:twips(book.titleTop*10),after:ptTwips(baseline),line:ptTwips(book.titleSize*1.2),lineRule:D.LineRuleType.AT_LEAST},children:[new D.TextRun({...role('heading',{size:book.titleSize*2,color:s.design==='medieval'?(s.initialColor||'#a52e27').slice(1):'18251E'}),text:title})]}));
   if(metadata.subtitle)titleNodes.push(para(metadata.subtitle,'heading',{alignment:titleAlign}));
   if(book.image)titleNodes.push(...await figure({src:book.image,alt:book.imageAlt},g.textHeight*.4));
   if(metadata.imprint||doc.date)titleNodes.push(para(metadata.imprint||doc.date,'data',{alignment:titleAlign,spacing:{before:ptTwips(baseline),after:0}}));
   if(book.titleComposition&&book.titleBlocks.length){titleNodes.length=0;for(const [index,block]of book.titleBlocks.entries()){const values=block.runs||[{text:block.text}];if(!values.some(r=>!r.hidden&&r.text.trim()))continue;const largest=Math.max(block.size,...values.filter(r=>!r.hidden).map(r=>r.size||block.size)),before=block.space*10+(index===0&&book.titleMode==='separate'?book.titleTop*10:0);titleNodes.push(new D.Paragraph({alignment:{left:D.AlignmentType.LEFT,right:D.AlignmentType.RIGHT,center:D.AlignmentType.CENTER,justify:D.AlignmentType.JUSTIFIED}[block.align],spacing:{before:twips(before),after:0,line:ptTwips(largest*block.leading),lineRule:D.LineRuleType.AT_LEAST},children:runs(values,block.role,{size:block.size*2,...(block.emphasis==='bold'?{bold:true}:{}),italics:block.emphasis==='italic'},true)}));}if(book.image)titleNodes.push(...await figure({src:book.image,alt:book.imageAlt},g.textHeight*.4));}
   if(book.titleMode==='inline')inlineTitle=titleNodes;else sections.push(section(titleNodes,{cover:true}));
  }
  const tocEntries=entries.filter(e=>book.tocDepth!=='chapters'||bookLayout.chapter(e,book).chapter);
  if(s.toc&&tocEntries.length){
   const contents=tocEntries.map(e=>new D.Paragraph({style:e.chapter?'TOC1':'TOC2',alignment:D.AlignmentType.LEFT,tabStops:[{type:D.TabStopType.RIGHT,position:twips(g.textWidth)-50,leader:book.tocStyle==='leaders'?D.LeaderType.DOT:D.LeaderType.NONE}],children:[new D.InternalHyperlink({anchor:'ss-section-'+e.index,children:[new D.TextRun({...role('contents',{size:book.tocSize*2}),text:e.title}),new D.TextRun({text:'\t'}),new D.PageReference('ss-section-'+e.index)]})]}));
   sections.push(section([para(book.tocTitle||(doc.lang==='la'?'Capita':doc.lang?.startsWith('de')?'Inhalt':'Contents'),'heading',{keepNext:true,spacing:{before:0,after:ptTwips(baseline)}}),new D.TableOfContents('',{hyperlink:true,stylesWithLevels:[new D.StyleLevel('Kapitel',1),...(book.tocDepth==='chapters'?[]:[new D.StyleLevel('Zwischenüberschrift',2)])],contentChildren:contents})]));
  }
  let children=inlineTitle,currentChapter=false,currentType=D.SectionType.NEXT_PAGE;
  const flush=()=>{if(children.length){sections.push(section(children,{type:currentType,chapter:currentChapter}));children=[];}};
  for(let index=0;index<doc.sections.length;index++){
   if(index===0&&book.titleComposition&&book.titleReplaceIntro&&!doc.sections[0].title&&['separate','inline'].includes(book.titleMode))continue;const part=doc.sections[index],entry=entries.find(e=>e.index===index),config=entry?bookLayout.chapter(entry,book):{chapter:false,start:'flow'},newPage=config.chapter&&config.start!=='flow';
   if(newPage){flush();currentType=config.start==='right'?D.SectionType.ODD_PAGE:D.SectionType.NEXT_PAGE;currentChapter=true;}
   if(part.title){const headingSize=s.headingStyle==='hierarchy'?size*1.4:s.headingStyle==='capitals'?size*.9:size;
    children.push(new D.Paragraph({style:config.chapter?'Chapter':'Subheading',alignment:{left:D.AlignmentType.LEFT,right:D.AlignmentType.RIGHT,center:D.AlignmentType.CENTER,justify:D.AlignmentType.JUSTIFIED}[part.style?.align]||align,keepNext:true,spacing:{before:ptTwips(newPage?book.chapterSpace*baseline:baseline),after:ptTwips(baseline),line:ptTwips(part.style?.leading?Math.max(headingSize,...(part.headingRuns||[]).map(r=>r.size?(doc.imported?r.size/(doc.baseSize||11)*size:r.size):headingSize))*part.style.leading:s.headingStyle==='hierarchy'?baseline*2:baseline),lineRule:D.LineRuleType.AT_LEAST},children:[new D.Bookmark({id:'ss-section-'+index,children:runs(part.headingRuns||[{text:part.title}],'heading',{size:headingSize*2,allCaps:s.headingStyle==='capitals',...(s.headingStyle==='capitals'?{characterSpacing:Math.round(size*1.6)}:{}),color:s.design==='medieval'?(s.initialColor||'#a52e27').slice(1):'18251E'})})]}));
   }
   // Image plates use real page breaks, not large blank paragraphs.
   if(s.illustrations!=='pages'){children.push(...await blocks(part.blocks||[],config.chapter));continue;}
   for(const item of part.blocks||[]){if(item.kind==='figure'){
     if(children.length)children.push(new D.Paragraph({pageBreakBefore:true,spacing:{line:1,before:0,after:0},children:[]}));
     children.push(...await figure(item,g.textHeight-22));children.push(new D.Paragraph({pageBreakBefore:true,spacing:{line:1,before:0,after:0},children:[]}));
    }else children.push(...await blocks([item],config.chapter));
   }
  }flush();
  if(!doc.own&&doc.credit)sections.push(section([para(doc.lang?.startsWith('de')?'Quelle des Textes':'Text source','heading',{keepNext:true,spacing:{before:0,after:ptTwips(baseline)}}),para(doc.credit,'note'),...(doc.source?[para(doc.source,'note')]:[])]));
  const bodyRun=role('body');
  const file=new D.Document({title:metadata.title||doc.title,creator:metadata.author||doc.author||'',description:'Mit Schriftsetzer gestaltet',evenAndOddHeaderAndFooters:!s.pageMode||s.pageMode==='spread',features:{updateFields:true},hyphenation:{autoHyphenation:s.alignment==='justify',consecutiveHyphenLimit:2,doNotHyphenateCaps:true},footnotes,
   styles:{default:{document:{run:bodyRun,paragraph:{alignment:align,spacing:{before:0,after:0,line:ptTwips(baseline),lineRule:D.LineRuleType.EXACT},widowControl:true}}},paragraphStyles:[{id:'Title',name:'Title',basedOn:'Normal',run:role('heading')},{id:'Chapter',name:'Kapitel',basedOn:'Normal',next:'Normal',run:role('heading'),paragraph:{outlineLevel:0,keepNext:true}},{id:'Subheading',name:'Zwischenüberschrift',basedOn:'Normal',next:'Normal',run:role('heading'),paragraph:{outlineLevel:1,keepNext:true}},...['TOC1','TOC2'].map(id=>({id,name:id,basedOn:'Normal',run:role('contents',{size:book.tocSize*2}),paragraph:{spacing:{after:book.tocStyle==='compact'?0:ptTwips(baseline/2)}}}))]},sections});
  // mirrorMargins is not yet exposed by docx. Insert it in schema order before
  // displayBackgroundShape; left/right then mean inside/outside on facing pages.
  const packed=new Uint8Array(await D.Packer.toArrayBuffer(file)),zip=F.unzipSync(packed);
  const settingsXML=F.strFromU8(zip['word/settings.xml']);
  const xml=!s.pageMode||s.pageMode==='spread'?settingsXML.replace('<w:displayBackgroundShape','<w:mirrorMargins/><w:displayBackgroundShape'):settingsXML;
  zip['word/settings.xml']=F.strToU8(xml);
  const fontCount=await fonts.embed(zip,F);
  return {data:F.zipSync(zip,{level:6}),filename:filename(metadata.title||doc.title),geometry:g,fontCount,notices:notices(job)};
 }
 return {build,pageSettings,twips,filename,notices};
});

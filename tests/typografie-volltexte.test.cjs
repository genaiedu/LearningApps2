const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),data=JSON.parse(read('data/typografie-langtexte.json')),catalogue=JSON.parse(read('data/typografie-fonts.json')),sources=JSON.parse(read('assets/typografie/originale/bildnachweise.json'));
const doc=id=>data.documents.find(d=>d.id===id),blocks=id=>doc(id).sections.flatMap(s=>s.blocks),plain=id=>blocks(id).flatMap(b=>b.runs?.map(r=>r.text)||[]).join(' ').replace(/\s+/g,' ');
test('both former excerpts are complete works, with original divisions and intact endings',()=>{
 assert.equal(doc('book').complete,true);assert.equal(doc('article').complete,true);
 assert.deepEqual(doc('book').sections.map(s=>s.title),['I.','II.','III.']);
 assert.equal(blocks('book').filter(b=>b.runs).length,256);assert.ok(plain('book').split(' ').length>8400);
 assert.match(plain('book'),/^To Sherlock Holmes she is always the woman/);assert.match(plain('book'),/it is always under the honourable title of the woman\.$/);
 assert.equal(doc('article').sections.length,1);assert.equal(doc('article').sections[0].title,'');assert.equal(blocks('article').length,36);assert.ok(plain('article').split(' ').length>5000);
 assert.match(plain('article'),/^Wenn der Mensch mit regsamem Sinne die Natur/);assert.match(plain('article'),/frei und unvergänglich, wie dieser, ist\.$/);
 for(const id of ['book','article'])assert.doesNotMatch(plain(id),/\[pg \d+\]|FULL PROJECT GUTENBERG|Reading section|Die Fülle des Lebens/);
 assert.ok(blocks('book')[0].runs.some(r=>r.em&&r.text==='the'));assert.equal(blocks('article').filter(b=>b.kind==='figure').length,0);
});
test('all ten Paget illustrations are attributed, local, proportioned and placed at their scenes',()=>{
 const images=blocks('book').filter(b=>b.kind==='figure');assert.equal(images.length,10);assert.equal(new Set(images.map(i=>i.src)).size,10);
 for(const img of images){assert.match(img.src,/^assets\/typografie\/originale\/holmes-1891-s\d+\.jpg$/);assert.ok(img.width>700&&img.height>1000);assert.ok(img.alt.length>25&&img.caption);assert.match(img.credit,/Sidney Paget/);assert.match(img.source,/^https:\/\/commons.wikimedia.org\/wiki\/File:Strand2-/);const all=blocks('book'),previous=all[all.indexOf(img)-1];assert.ok(previous.runs,'Illustration follows a scene paragraph');}
 assert.match(blocks('book').find((b,i,a)=>a[i+1]?.src?.endsWith('s62.jpg')).runs.map(r=>r.text).join(''),/Then he stood before the fire/);
});
test('exactly two facsimiles introduce the examples, all twelve files have checked provenance and unchanged bytes',()=>{
 assert.equal(data.historicalPages.length,2);assert.equal(sources.images.length,12);
 for(const page of data.historicalPages){assert.ok(page.alt.length>40&&page.comment.length>100);assert.match(page.source,/^https:\/\//);assert.ok(sources.images.some(i=>i.file===page.src));}
 for(const img of sources.images){const bytes=fs.readFileSync(path.join(root,img.file));assert.equal(bytes.readUInt16BE(0),0xffd8);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),img.sha256);assert.match(img.rights,/gemeinfrei|Public Domain/i);assert.ok(img.creator&&img.publication&&img.source&&img.download);}
 assert.match(data.historicalPages[0].credit,/ETH-Bibliothek Zürich, Rar 6000/);assert.match(data.historicalPages[1].comment,/keiner Tageszeitung/);
 const script=read('scripts/typografie-langtext.js');assert.match(script,/originalPages\(data.historicalPages\)/);assert.match(script,/pages.slice\(0,2\)/);assert.match(script,/Originalseite vergrößern/);assert.doesNotMatch(script,/innerHTML/);
 const versions=[];for(const file of ['schriftsetzer.html','typografie-atelier.html']){versions.push(read(file).match(/scripts\/typografie-langtext.js\?v=([^"&]+)/)[1]);assert.match(read(file),/styles\/typografie-langtext.css\?v=20261018-initialen2/);}assert.equal(versions[0],versions[1]);
});
async function render(t,id,settings={}){
 const dom=new JSDOM(read('typografie-lesedruck.html'),{runScripts:'outside-only',url:'https://example.test/LearningApps2/typografie-lesedruck.html?embedded=1'}),w=dom.window;t.after(()=>w.close());
 Object.defineProperty(w.document,'fonts',{value:{load:async()=>[],ready:Promise.resolve()}});w.Range.prototype.getClientRects=()=>[];let captured,decoded=0;
 w.HTMLImageElement.prototype.decode=async()=>{decoded++;};
 w.Paged={Previewer:class{constructor(){this.polisher={destroy(){}};}async preview(source,styles,host){captured={source:source.firstElementChild||source,css:Object.values(styles[0])[0]};assert.equal(decoded,source.querySelectorAll('img').length,'images decoded before pagination');const pages=w.document.createElement('div');pages.className='pagedjs_pages';const page=w.document.createElement('div');page.className='pagedjs_page';const content=w.document.createElement('div');content.className='pagedjs_page_content';content.append(source);page.append(content);pages.append(page);host.append(pages);return{total:1};}}};
 w.eval(read('scripts/typografie-satzspiegel-core.js'));w.eval(read('scripts/typografie-lesedruck.js'));
 const s={format:'book',layout:'classic',alignment:'justify',headingStyle:'classic',numerals:'oldstyle',size:11,leading:1.4,toc:true,notes:true,roles:Object.fromEntries(['body','heading','contents','quote','note','data'].map(role=>[role,{font:catalogue.families.find(f=>f.id==='ebgaramond'),weight:role==='heading'?600:400}])),...settings};
 w.dispatchEvent(new w.MessageEvent('message',{origin:'https://example.test',source:w.parent,data:{type:'typography-layout',id:1,document:typeof id==='string'?doc(id):id,settings:s}}));await new Promise(r=>setImmediate(r));assert.equal(w.document.documentElement.dataset.ready,'true');return captured;
}
test('book and A4 picture blocks keep image and caption together and adapt to large type without distorting images',async t=>{
 for(const settings of [{},{format:'a4'},{format:'a5',size:14,leading:1.9}]){
  const {source,css}=await render(t,'book',settings);assert.equal(source.querySelectorAll('figure.print-illustration').length,10);assert.equal(source.querySelectorAll('figcaption').length,10);assert.equal(source.querySelectorAll('.print-contents-link').length,3);
  for(const image of source.querySelectorAll('figure img')){assert.match(image.src,/^https:\/\/example.test\/LearningApps2\/assets\//);assert.ok(image.width&&image.height&&image.alt);assert.ok(image.nextElementSibling.matches('figcaption'));}
  assert.match(css,/\.print-illustration\{[^}]*break-inside:avoid;page-break-inside:avoid/);assert.match(css,/object-fit:contain/);assert.match(css,/grid-template-rows:minmax\(0,1fr\)/);const lines=Number(css.match(/\.print-illustration\{[^}]*?height:calc\(var\(--baseline\) \* (\d+)/)[1]);assert.ok(lines>=6&&lines<=16);if(settings.size===14)assert.ok(lines<12);
 }
});
test('the full unillustrated Humboldt has no invented section titles or automatically invented quotation',async t=>{
 const {source,css}=await render(t,'article');assert.equal(source.querySelectorAll('.print-paragraph').length,36);assert.equal(source.querySelectorAll('figure,.print-contents,.print-quote').length,0);assert.equal(source.querySelectorAll('.print-footnote').length,1);assert.match(css,/\.print-cover\{[^}]*break-after:page/);
});
test('the compact twelve-part choice reaches real print CSS for Humboldt and illustrated Holmes',async t=>{
 for(const id of ['article','book'])for(const format of ['book','a4']){const {source,css}=await render(t,id,{format,layout:'raster12'});assert.match(css,format==='book'?/margin:18.75mm 25mm 37.5mm 12.5mm/:/margin:24.75mm 35mm 49.5mm 17.5mm/);assert.equal(source.querySelectorAll('figure').length,id==='book'?10:0);}
 assert.match(read('scripts/typografie-langtext.js'),/Satzspiegel → Zwölferteilung · kompakter Teilungskanon/);assert.match(read('scripts/typografie-langtext.js'),/keine Rekonstruktion der Humboldt-Seite/);
});
test('optional Holmes plates take a whole text area on separate pages, retain all ten images and do not change other works',async t=>{
 for(const format of ['book','a4']){const {source,css}=await render(t,'book',{format,layout:'raster12',illustrations:'pages'});assert.equal(source.querySelectorAll('figure.print-illustration').length,10);assert.equal(source.querySelectorAll('figcaption').length,10);assert.match(css,/\.print-illustration\{[^}]*margin:0;[^}]*break-before:page;break-after:page/);assert.match(css,/object-fit:contain/);const lines=Number(css.match(/\.print-illustration\{[^}]*?height:calc\(var\(--baseline\) \* (\d+)/)[1]);assert.ok(lines>=30);}
 const {css}=await render(t,'article',{illustrations:'pages'});assert.doesNotMatch(css,/break-before:page;break-after:page/);
});
test('medieval preset decorates chapter openings, not every paragraph or subheading, and initials can be disabled',async t=>{const paragraph=text=>({kind:'p',runs:[{text}]}),document={id:'own',own:true,title:'Probe',author:'',lang:'de',sections:[{title:'Kapitel Eins',level:2,blocks:[paragraph('Anfang des ersten Kapitels.'),paragraph('Danach ein normaler Absatz.')]},{title:'Ein Unterabschnitt',level:3,blocks:[paragraph('Dieser Absatz braucht keine neue Kapitelinitiale.')]},{title:'Kapitel Zwei',level:2,blocks:[paragraph('Beginn des zweiten Kapitels.')]}]};const first=await render(t,document,{design:'medieval',dropCaps:true,initialColor:'#185d8c'});assert.equal(first.source.querySelectorAll('.print-decorated-initial').length,2);assert.match(first.css,/color:#185d8c/);assert.match(first.css,/print-decorated-initial:not\(\[data-split-from\]\)::first-letter/);assert.match(first.css,/font-family:inherit/);assert.doesNotMatch(first.css,/font-family:'Fondamento'/);assert.match(first.css,/#fbf4e1/);const off=await render(t,document,{design:'medieval',dropCaps:false,initialColor:'red;}.bad{display:none'});assert.equal(off.source.querySelectorAll('.print-decorated-initial').length,0);assert.doesNotMatch(off.css,/::first-letter|\.bad/);assert.match(off.css,/#a52e27/);assert.equal(off.source.querySelectorAll('.print-paragraph').length,4);});

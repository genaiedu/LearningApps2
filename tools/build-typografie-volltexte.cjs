/* Rebuild the two complete reading examples from the attributed public-domain
 * sources, preserving paragraph boundaries and emphasis. Run with NODE_PATH
 * pointing at jsdom and pass the directory containing the downloaded sources:
 * holmes.html = https://www.gutenberg.org/files/1661/1661-h/1661-h.htm
 * humboldt.html = https://www.gutenberg.org/files/22761/22761-h/22761-h.html
 * paget-1.html ... paget-10.html = Commons file descriptions listed below.
 * Image files are downloaded separately, unmodified, into assets/typografie/originale.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),input=process.argv[2];
if(!input)throw Error('Pass the directory containing the downloaded original sources.');
const parse=name=>new JSDOM(fs.readFileSync(path.join(input,name),'utf8')).window.document;
const readJson=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const writeJson=(name,data)=>fs.writeFileSync(path.join(root,name),JSON.stringify(data,null,2)+'\n');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function runs(node){
 const out=[];
 function walk(n,em=false){
  if(n.nodeType===3){const text=n.data.replace(/\s+/g,' ');if(!text)return;const last=out.at(-1);if(last&&Boolean(last.em)===em)last.text+=text;else out.push({text,...(em?{em:true}:{})});return;}
  if(n.nodeType!==1||n.matches('.tei-pb,.pagenum,.pginternal,.tei-anchor'))return;
  if(n.tagName==='BR'){walk(n.ownerDocument.createTextNode(' '),em);return;}
  for(const child of n.childNodes)walk(child,em||n.matches('em,i')||n.style.fontStyle==='italic');
 }
 walk(node);for(const r of out)r.text=r.text.replace(/\s+/g,' ');if(out.length){out[0].text=out[0].text.trimStart();out.at(-1).text=out.at(-1).text.trimEnd();}return out.filter(r=>r.text);
}
function jpeg(file){
 const bytes=fs.readFileSync(path.join(root,file));if(bytes[0]!==255||bytes[1]!==216)throw Error('Not a JPEG: '+file);
 for(let i=2;i<bytes.length;){if(bytes[i++]!==255)throw Error('Invalid JPEG marker');while(bytes[i]===255)i++;const marker=bytes[i++],size=bytes.readUInt16BE(i);if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return {width:bytes.readUInt16BE(i+5),height:bytes.readUInt16BE(i+3),sha256:hash(bytes)};i+=size;}
 throw Error('JPEG size missing: '+file);
}
const pages=[62,63,64,65,67,69,70,71,73,74];
const names=['ThenHeStoodBeforeTheFire','ICarefullyExaminedTheWriting','AManEntered','HeToreTheMaskFromHisFace','ADrunkenLookingGroom','IFoundMyselfMumblingResponses','ASimpleMindedClergyman','HeGaveACryAndDropped','GoodnightMrSherlockHolmes','ThisPhotograph'];
const captions=['Then he stood before the fire.','I carefully examined the writing.','A man entered.','He tore the mask from his face.','A drunken-looking groom.','I found myself mumbling responses.','A simple-minded clergyman.','He gave a cry and dropped.','Good night, Mr. Sherlock Holmes.','This photograph!'];
const alts=['Holmes steht am Kamin, während Watson im Sessel sitzt.','Watson und Holmes untersuchen den Brief.','Der maskierte Besucher tritt ein.','Der König nimmt seine Maske ab.','Holmes ist als heruntergekommener Pferdeknecht verkleidet.','Holmes steht als Trauzeuge vor dem Altar.','Holmes trägt die Verkleidung eines Geistlichen.','Der verkleidete Holmes fällt vor Briony Lodge zu Boden.','Eine junge Gestalt wünscht Holmes einen guten Abend.','Der König betrachtet das zurückgelassene Porträt.'];
// Place each illustration immediately after its corresponding scene, not at
// arbitrary intervals or at historical page numbers in the newly flowing text.
const anchors=['Then he stood before the fire','I carefully examined the writing','A man entered who','he tore the mask','a drunken-looking groom','mumbling responses','simple-minded Nonconformist','he gave a cry and dropped','Good-night, Mister Sherlock Holmes','This photograph!'];
const media=pages.map((page,i)=>{
 const file='assets/typografie/originale/holmes-1891-s'+page+'.jpg',title='Strand2-0'+page+'-'+names[i]+'.jpg',source='https://commons.wikimedia.org/wiki/File:'+title,d=parse('paget-'+(i+1)+'.html');
 if(!/public domain/i.test(d.querySelector('#mw-content-text').textContent))throw Error('Commons rights statement missing: '+source);
 return {file,...jpeg(file),title:captions[i],creator:'Sidney Paget (1860–1908)',publication:'The Strand Magazine, Juli 1891, S. '+page,source,download:d.querySelector('.fullImageLink a').href.split('?')[0],rights:'Gemeinfrei · Public Domain Mark',rightsUrl:'https://creativecommons.org/publicdomain/mark/1.0/',changes:'Unveränderte Bilddatei; neuer Satz mit separat gesetzter historischer Bildunterschrift.'};
});
const holmes=parse('holmes.html').querySelector('.chapter');
if(!holmes.textContent.includes('A SCANDAL IN BOHEMIA')||holmes.textContent.includes('THE RED-HEADED LEAGUE'))throw Error('Unexpected story boundaries');
const sections=[];let section=null;
for(const node of holmes.children){
 if(node.tagName==='H3'){section={title:node.textContent.trim(),blocks:[]};sections.push(section);}
 else if(node.tagName==='P'){if(!section)throw Error('Paragraph before first section');const block={kind:node.classList.contains('letter')?'quote':'p',runs:runs(node)};if(node.classList.contains('right'))block.align='right';section.blocks.push(block);}
}
if(sections.length!==3)throw Error('Holmes must have three original sections.');
for(const [i,anchor]of anchors.entries()){
 const matches=sections.flatMap(s=>s.blocks.map((b,n)=>({s,b,n}))).filter(({b})=>b.runs?.map(r=>r.text).join('').toLowerCase().includes(anchor.toLowerCase()));
 if(matches.length!==1)throw Error('Illustration anchor must be unique: '+anchor+' ('+matches.length+')');
 const {s,n}=matches[0],m=media[i];s.blocks.splice(n+1,0,{kind:'figure',src:m.file,width:m.width,height:m.height,alt:alts[i],caption:captions[i],credit:'Sidney Paget · 1891',source:m.source});
}
const humboldt=parse('humboldt.html'),body=humboldt.querySelector('.tei-body'),paragraphs=[...body.querySelectorAll('p')].map(p=>({kind:'p',runs:runs(p)}));
const texts=readJson('data/typografie-langtexte.json');
const article=texts.documents.find(d=>d.id==='article'),book=texts.documents.find(d=>d.id==='book');
Object.assign(book,{label:'Buch · Sherlock Holmes · vollständig illustriert (Englisch)',complete:true,subtitle:'The complete story · with ten illustrations by Sidney Paget',credit:'Arthur Conan Doyle: A Scandal in Bohemia (1891). Vollständige Erzählung nach Project Gutenberg Nr. 1661, mit den drei originalen Abschnitten I–III. Zehn Illustrationen von Sidney Paget aus The Strand Magazine, Juli 1891, S. 62–74, nach gemeinfreien Scans auf Wikimedia Commons. Titelblatt, Inhaltsverzeichnis, Bildanordnung und Quellenanmerkung sind redaktionell für diese heutige Satzprobe eingerichtet; kein Faksimile und keine historischen Seitenumbrüche.',note:'Vollständiger englischer Originaltext. Die drei Abschnitte I–III stammen aus der Erzählung. Pagets Illustrationen von 1891 sind den zugehörigen Szenen zugeordnet; ihre Größe und der Seitenumbruch folgen dem hier gewählten Satz.',sections});
Object.assign(article,{label:'Essay · Humboldt · vollständig (Deutsch)',complete:true,subtitle:'Naturkundlicher Essay · vollständiger Text von 1806',credit:'Alexander von Humboldt: Ideen zu einer Physiognomik der Gewächse. Tübingen: J. G. Cotta, 1806. Vollständiger Originaltext nach Project Gutenberg Nr. 22761; historische Schreibweise beibehalten. Die unbebilderte Schrift hat keine Zwischenüberschriften. Titelblatt und Quellenanmerkung sind redaktionell für diese heutige Satzprobe eingerichtet; keine historischen Seitenumbrüche.',note:'Vollständiger Text der Schrift von 1806, ohne nachträglich erfundene Zwischenüberschriften oder Illustrationen. Historische Schreibweise und naturkundliche Aussagen gehören zum damaligen Wissensstand; sie werden hier nicht als heutige Fachauskunft wiedergegeben.',sections:[{title:'',blocks:paragraphs}]});
texts.historicalPages=[
 {title:'Humboldt · 1806',src:'assets/typografie/originale/humboldt-1806-s3.jpg',...jpeg('assets/typografie/originale/humboldt-1806-s3.jpg'),alt:'Erste Textseite der Humboldt-Schrift von 1806 mit einspaltigem Antiquasatz und großem Freiraum über dem Text.',comment:'Die erste Textseite der unbebilderten Schrift: einspaltige Antiqua, deutliche Ränder und ein großer Freiraum über dem Beginn. Dieser große Kopfsteg gehört zur Eröffnungsseite – nicht jede Folgeseite sieht so aus. Ruhe entsteht hier aus dem Verhältnis von Schrift, Zeilenlänge und freier Fläche.',credit:'Alexander von Humboldt: Ideen zu einer Physiognomik der Gewächse, Tübingen 1806, S. 3. ETH-Bibliothek Zürich, Rar 6000 · Public Domain Mark.',source:'https://doi.org/10.3931/e-rara-22999'},
 {title:'Sherlock Holmes · 1891',src:'assets/typografie/originale/strand-1891-s62.jpg',...jpeg('assets/typografie/originale/strand-1891-s62.jpg'),alt:'Originalseite 62 des Strand Magazine mit zweispaltigem Text, der um Sidney Pagets Illustration von Holmes und Watson herumläuft.',comment:'Eine Seite der Erstveröffentlichung in der illustrierten Monatszeitschrift The Strand Magazine, keiner Tageszeitung. Pagets Bild greift in den zweispaltigen Text ein. Das wirkt lebendig, erzeugt links aber sehr kurze Zeilen. Im neuen Satz unten erhalten die Bilder einen eigenen Platz mit zusammengehaltener Bildunterschrift.',credit:'Arthur Conan Doyle / Sidney Paget: A Scandal in Bohemia, The Strand Magazine, Juli 1891, S. 62. Scan: Internet Archive / Wikimedia Commons · gemeinfrei.',source:'https://en.wikisource.org/wiki/Page:The_Strand_Magazine_(Volume_2).djvu/63'}
];
writeJson('data/typografie-langtexte.json',texts);
const historical=[{file:'assets/typografie/originale/humboldt-1806-s3.jpg',...jpeg('assets/typografie/originale/humboldt-1806-s3.jpg'),creator:'Alexander von Humboldt (1769–1859)',publication:'Ideen zu einer Physiognomik der Gewächse. Tübingen: J. G. Cotta, 1806, S. 3.',institution:'ETH-Bibliothek Zürich, Rar 6000',source:'https://doi.org/10.3931/e-rara-22999',download:'https://www.e-rara.ch/download/webcache/1000/7187531',rights:'Public Domain Mark · laut Titelaufnahme der ETH-Bibliothek',rightsUrl:'https://creativecommons.org/publicdomain/mark/1.0/',changes:'Unveränderte historische Seitenabbildung.'},{file:'assets/typografie/originale/strand-1891-s62.jpg',...jpeg('assets/typografie/originale/strand-1891-s62.jpg'),creator:'Arthur Conan Doyle (1859–1930), Illustration Sidney Paget (1860–1908)',publication:'The Strand Magazine, Band II, Juli 1891, S. 62.',source:'https://en.wikisource.org/wiki/Page:The_Strand_Magazine_(Volume_2).djvu/63',download:'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/The_Strand_Magazine_%28Volume_2%29.djvu/page63-960px-The_Strand_Magazine_%28Volume_2%29.djvu.jpg',rights:'Gemeinfrei · PD-scan / Public Domain Mark laut Commons-Dateibeschreibung',rightsUrl:'https://commons.wikimedia.org/wiki/File:The_Strand_Magazine_(Volume_2).djvu',changes:'Unveränderte historische Seitenabbildung.'}];
writeJson('assets/typografie/originale/bildnachweise.json',{checked:'2026-10-18',note:'Historische Originale und mechanische Scans, keine KI-Rekonstruktionen. Alle Bilddateien werden lokal ausgeliefert.',images:[...historical,...media]});
const plain=d=>d.sections.flatMap(s=>s.blocks.flatMap(b=>b.runs?.map(r=>r.text)||[])).join(' ');
for(const doc of [article,book])console.log(doc.id,plain(doc).split(/\s+/).length,'words',doc.sections.map(s=>[s.title,s.blocks.length]),'last:',plain(doc).slice(-150));

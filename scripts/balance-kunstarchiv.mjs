// Add verified non-canvas works, never replace existing IDs or download images.
// API responses and reviewable patches are generated outside the repository.
// node scripts/balance-kunstarchiv.mjs /private/tmp/kunst-balance-cache
import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url).pathname, cache=resolve(process.argv[2]||'/private/tmp/kunst-balance-cache');
mkdirSync(cache,{recursive:true});
const checked='2026-10-09', headers={'User-Agent':'LearningApps-Kunsttresor/3.0 (educational; JSON metadata only)',Accept:'application/json'};
const pause=ms=>new Promise(done=>setTimeout(done,ms));
async function request(url,key) {
  const file=resolve(cache,key+'.json');
  if(existsSync(file))return JSON.parse(readFileSync(file,'utf8'));
  for(let attempt=0;attempt<4;attempt++) {
    let retryAfter=0;
    try {
      const response=await fetch(url,{headers,signal:AbortSignal.timeout(45000)});
      if(!response.ok){retryAfter=Number(response.headers.get('retry-after'))*1000||0;throw Error('HTTP '+response.status);}
      const json=await response.json();if(json.error)throw Error(JSON.stringify(json.error));
      writeFileSync(file,JSON.stringify(json));await pause(3200);return json;
    } catch(error) {if(attempt===3)throw error;console.log('Retry',key,error.message);await pause(Math.min(60000,Math.max(retryAfter,30000*(attempt+1))));}
  }
}
const hash=s=>createHash('sha256').update(s).digest('hex');
const archive=JSON.parse(readFileSync(root+'data/kunstarchiv.json','utf8'));
const media=JSON.parse(readFileSync(root+'data/kunstbilder.json','utf8'));
const wiki=JSON.parse(readFileSync(root+'data/kunst-wikipedia.json','utf8'));
const priorTitles=JSON.parse(readFileSync(root+'data/kunst-titel-de.json','utf8'));
const knownIds=new Set(archive.works.map(x=>x.id));
const knownItems=new Set(media.images.map(x=>x.wikidata?.split('/').at(-1)).filter(Boolean));
const styleMap={Renaissance:'Renaissance',Baroque:'Barock',Rococo:'Rokoko',Neoclassicism:'Klassizismus',Romanticism:'Romantik',Realism:'Realismus',Impressionism:'Impressionismus','Post-Impressionism':'Postimpressionismus',Pointillism:'Pointillismus',Symbolism:'Symbolismus',Expressionism:'Expressionismus',Cubism:'Kubismus','Art Nouveau':'Jugendstil',Fauvism:'Fauvismus',Mannerism:'Manierismus',Surrealism:'Surrealismus',romantic:'Romantik','Barbizon School':'Schule von Barbizon',Modernism:'Moderne',Pictorialism:'Piktorialismus',Aestheticism:'Ästhetizismus','Aesthetic Movement':'Ästhetizismus','Arts and Crafts Movement':'Arts and Crafts'};
const wdStyles={Q131808:'Manierismus',Q4692:'Renaissance',Q37853:'Barock',Q122960:'Rokoko',Q14378:'Klassizismus',Q37068:'Romantik',Q10857409:'Realismus',Q40415:'Impressionismus',Q166713:'Postimpressionismus',Q164800:'Symbolismus',Q80113:'Expressionismus',Q42934:'Kubismus',Q166593:'Fauvismus',Q34636:'Jugendstil',Q39427:'Surrealismus',Q184814:'Präraffaeliten'};
Object.assign(wdStyles,{
  Q2455000:'Deutsche Renaissance',Q1472236:'Frührenaissance',Q1404472:'Italienische Renaissance',Q1474884:'Hochrenaissance',Q979160:'Protorenaissance',
  Q947129:'Gotische Malerei',Q867769:'Internationale Gotik',Q46825:'Gotik',Q443153:'Altniederländische Malerei',Q1332178:'Schule von Siena',
  Q1378978:'Kretische Schule',Q5732065:'Ionische Schule',Q2478178:'Umbrische Schule',Q3357314:'Florentinische Schule',Q610687:'Venezianische Schule',Q610877:'Nordische Renaissance',
  Q42865:'Orientalismus',Q189458:'Akademische Kunst',Q1122677:'Katalanischer Modernismus',Q256922:'Ästhetizismus',Q160218:'Neue Sachlichkeit',Q152778:'Die Brücke',
  Q55996:'Naturalismus',Q577147:'Klassizismus',Q170292:'Klassizismus',Q2914470:'Italienische Renaissance',Q1133779:'Renaissance',Q808561:'Barock',
  Q2477787:'Amerikanischer Impressionismus',Q1133329:'Junges Polen',Q422681:'Nazarener',Q117035:'Der Blaue Reiter',Q1294605:'Jugendstil',
  Q208208:'Wiener Secession',Q574985:'Macchiaioli',Q2352880:'Niederländisches Goldenes Zeitalter',Q878985:'Moderne',Q281108:'Naive Kunst',Q211884:'Byzantinische Kunst'
});
const entities=new Map(), pages=new Map();
const oldCache='/private/tmp/kunst-1000-cache';
for(const folder of [oldCache,cache])if(existsSync(folder))for(const file of readdirSync(folder).filter(x=>x.endsWith('.json'))) {
  if(!/^(entities-|commons-)/.test(file))continue;
  const data=JSON.parse(readFileSync(resolve(folder,file),'utf8'));
  for(const e of Object.values(data.entities||{}))entities.set(e.id,e);
  for(const p of data.query?.pages||[])pages.set(p.title,p);
  for(let i=0;i<3;i++)for(const alias of [...(data.query?.redirects||[]),...(data.query?.normalized||[])])if(pages.has(alias.to))pages.set(alias.from,pages.get(alias.to));
}
const values=(e,p)=>(e?.claims?.[p]||[]).filter(x=>x.rank!=='deprecated'&&x.mainsnak?.snaktype==='value').map(x=>x.mainsnak.datavalue.value);
const ids=(e,p)=>[...new Set(values(e,p).map(x=>x?.id).filter(Boolean))];
const name=e=>e?.labels?.de?.value||e?.labels?.en?.value||'';
const article=e=>{const a=e?.sitelinks?.dewiki||e?.sitelinks?.enwiki;return a?{title:a.title,language:a.site==='dewiki'?'de':'en'}:null;};
async function loadEntities(list) {
  const missing=[...new Set(list)].filter(id=>!entities.has(id)).sort();
  for(let i=0;i<missing.length;i+=40) {
    const batch=missing.slice(i,i+40),query={action:'wbgetentities',format:'json',ids:batch.join('|'),props:'labels|claims|sitelinks',languages:'de|en',sitefilter:'dewiki|enwiki'};
    const data=await request('https://www.wikidata.org/w/api.php?'+new URLSearchParams(query),'entities-'+hash(batch.join('|')));
    for(const e of Object.values(data.entities||{}))entities.set(e.id,e);
    console.log('Entity metadata',Math.min(i+40,missing.length),'/',missing.length);
  }
}
function technique(medium) {
  const s=medium.toLowerCase();
  if(/oil/.test(s))return null;
  if(/tempera/.test(s))return 'Tempera';
  if(/pastel/.test(s)&&!/watercolou?r/.test(s))return 'Pastell';
  if(/watercolou?r|aquarell/.test(s)&&!/pastel/.test(s))return 'Aquarell';
  if(/gouache/.test(s))return 'Gouache';
  if(/etching/.test(s)&&/aquatint/.test(s))return 'Radierung mit Aquatinta';
  if(/etching/.test(s)&&!/engraving|lithograph|woodcut/.test(s))return 'Radierung';
  if(/engraving/.test(s)&&!/etching|wood|lithograph/.test(s))return 'Kupferstich';
  if(/woodcut|woodblock/.test(s))return 'Holzschnitt';
  if(/lithograph/.test(s)&&!/etching|woodcut/.test(s))return 'Lithografie';
  if(/drypoint/.test(s)&&!/etching|engraving/.test(s))return 'Kaltnadelradierung';
  if(/pen.*ink|brush.*ink|tusche|\btinte\b/.test(s))return 'Tuschezeichnung';
  if(/graphite|bleistift/.test(s)&&!/pastel|ink|tusche|tinte/.test(s))return 'Graphitzeichnung';
  if(/charcoal|zeichenkohle/.test(s)&&!/pastel|ink|tusche|tinte/.test(s))return 'Kohlezeichnung';
  if(/chalk|kreide|rötel/.test(s)&&!/pastel|ink|tusche|tinte/.test(s))return 'Kreidezeichnung';
  return null;
}
// These queries explicitly target materials/processes, not a fixed 1000-work cap.
// Dates, attribution, movement and image rights are validated separately below.
const materialQueries={
  watercolour:'wdt:P186 wd:Q3374389',pastel:'wdt:P186 wd:Q189085',
  tempera:'wdt:P186 wd:Q175166',gouache:'wdt:P186 wd:Q204330',
  pencil:'wdt:P186 wd:Q14674',ink:'wdt:P186 wd:Q127418',
  etching:'wdt:P2079 wd:Q186986',woodcut:'wdt:P2079 wd:Q173242',
  engraving:'wdt:P2079 wd:Q139106',lithograph:'wdt:P2079 wd:Q133036'
};
const researched=[];
for(const [key,predicate]of Object.entries(materialQueries)) {
  const query=`SELECT DISTINCT ?item WHERE { ?item ${predicate}; wdt:P135 ?style; wdt:P170 ?artist; wdt:P571 ?date; wdt:P18 ?image. } LIMIT 700`;
  try {
    const data=await request('https://query.wikidata.org/sparql?'+new URLSearchParams({query,format:'json'}),'material-'+key);
    const items=data.results.bindings.map(row=>row.item.value.split('/').at(-1));researched.push(...items);console.log('Material candidates',key,items.length);
  } catch(error) { console.log('Unavailable material query',key,error.message); }
}
await loadEntities(researched.filter(id=>!knownItems.has(id)));
await loadEntities([...entities.values()].filter(e=>researched.includes(e.id)).flatMap(e=>['P170','P186','P195','P2079'].flatMap(p=>ids(e,p))));
await loadEntities([...entities.values()].filter(e=>ids(e,'P170').length&&values(e,'P18').length).flatMap(e=>ids(e,'P135')));
writeFileSync(resolve(cache,'styles-review.json'),JSON.stringify([...new Set([...entities.values()].flatMap(e=>ids(e,'P135')))].map(id=>({id,german:entities.get(id)?.labels?.de?.value,english:entities.get(id)?.labels?.en?.value})),null,2));
const candidates=new Map();
const fields=['id','title','artist_title','artist_display','date_display','date_start','date_end','style_title','style_titles','medium_display','image_id','is_public_domain'];
for(let page=1,total=Infinity;(page-1)*100<total;page++) {
  const params={query:{bool:{filter:[{term:{is_public_domain:true}},{terms:{'style_titles.keyword':Object.keys(styleMap)}},{exists:{field:'image_id'}},{range:{date_start:{gte:1350}}},{range:{date_end:{lte:1955}}}],must_not:[{match:{medium_display:'oil'}}]}},page,limit:100,fields};
  const data=await request('https://api.artic.edu/api/v1/artworks/search?params='+encodeURIComponent(JSON.stringify(params)),'aic-non-oil-'+page);total=data.pagination.total;
  for(const art of data.data) {
    if(knownIds.has('aic-'+art.id))continue;
    const death=art.artist_display?.match(/(?:\b\d{4})\s*[–—-]\s*(\d{4})\b/)?.[1]||art.artist_display?.match(/died\s+(\d{4})/)?.[1];
    const tech=technique(art.medium_display||''),styleOriginal=styleMap[art.style_title]?art.style_title:art.style_titles.find(x=>styleMap[x]);
    if(!art.artist_title||!death||+death>1955||!tech||!styleOriginal||!art.date_display||/unknown|workshop|school of|circle of|after |attributed|follower|anonymous|unidentified/i.test(art.artist_display))continue;
    candidates.set(String(art.id),{id:'aic-'+art.id,title:art.title,artist:art.artist_title,artistDeath:+death,date:art.date_display.replace(/c\./g,'ca.').replace(/about /g,'um '),style:styleMap[styleOriginal],styleOriginal,styleTerms:art.style_titles,technique:tech,medium:art.medium_display,imageId:art.image_id,source:'https://www.artic.edu/artworks/'+art.id,museum:'Art Institute of Chicago',metadataProvider:'Art Institute of Chicago',rights:'CC0 / Public Domain',publicDomain:true});
  }
  console.log('Museum metadata',Math.min(page*100,total),'/',total,'eligible',candidates.size);
}
const raw=[];
const museumIds=[...candidates.keys()];
for(let i=0;i<museumIds.length;i+=100) {
  const batch=museumIds.slice(i,i+100), query=`SELECT ?id ?item ?image WHERE { VALUES ?id { ${batch.map(id=>'"'+id+'"').join(' ')} } ?item wdt:P4610 ?id; wdt:P18 ?image. }`;
  const data=await request('https://query.wikidata.org/sparql?'+new URLSearchParams({query,format:'json'}),'aic-matches-'+hash(batch.join('|')));
  for(const row of data.results.bindings) {
    const qid=row.item.value.split('/').at(-1),work=candidates.get(row.id.value);if(knownItems.has(qid))continue;
    raw.push({...work,wikidata:row.item.value,imageTitle:'File:'+decodeURIComponent(row.image.value.split('/').at(-1)).replace(/_/g,' '),qid});
  }
  console.log('Museum Commons identities',raw.length);
}
await loadEntities(raw.map(x=>x.qid));
await loadEntities(raw.flatMap(x=>ids(entities.get(x.qid),'P170')));
// Also use already researched Wikidata works whose techniques were previously excluded.
for(const e of [...entities.values()]) {
  if(knownItems.has(e.id)||raw.some(w=>w.qid===e.id))continue;
  // A wall-painting's chalk ground is not a chalk drawing, and illustrated books
  // or portfolios do not identify one unambiguous standalone gallery artwork.
  if(['Q684689','Q21155503','Q24237382','Q2324840','Q100436727'].includes(e.id))continue;
  const styles=ids(e,'P135').filter(id=>wdStyles[id]),artists=ids(e,'P170'),materials=ids(e,'P186');
  if(!styles.length||artists.length!==1||!materials.length||materials.some(id=>['Q296955','Q265559','Q274988'].includes(id)))continue;
  const artist=entities.get(artists[0]),death=Number(values(artist,'P570')[0]?.time?.slice(1,5)),artistArticle=article(artist);
  const dates=[...values(e,'P571'),...(e.claims?.P571||[]).flatMap(s=>['P1319','P1326'].flatMap(p=>(s.qualifiers?.[p]||[]).map(q=>q.datavalue?.value)))].filter(x=>x?.precision>=9&&/^\+\d{4}-/.test(x.time));
  const years=[...new Set(dates.map(x=>+x.time.slice(1,5)))].sort((a,b)=>a-b);
  const labels=materials.map(id=>name(entities.get(id))),processes=ids(e,'P2079'),processLabels=processes.map(id=>name(entities.get(id)));
  const wdTechnique=processes.includes('Q186986')?'Radierung':processes.includes('Q173242')?'Holzschnitt':processes.includes('Q139106')?'Kupferstich':processes.includes('Q133036')?'Lithografie':null;
  const tech=wdTechnique||technique(labels.join(' ')),image=values(e,'P18').find(x=>typeof x==='string'&&/\.(jpg|jpeg|png)$/i.test(x));
  if(!artistArticle||!death||death>1955||death<=1300||!years.length||years[0]<1350||years.at(-1)>1955||years.at(-1)-years[0]>12||!tech||labels.some(x=>!x)||!image||!name(e))continue;
  const approximate=(e.claims.P571||[]).some(x=>x.qualifiers?.P1480?.length);
  raw.push({id:'wd-'+e.id,qid:e.id,title:name(e),artist:name(artist)||artistArticle.title.replace(/\s*\([^)]*\)$/,''),artistDeath:death,date:(approximate?'um ':'')+(years.length===1?years[0]:years[0]+'–'+years.at(-1)),style:wdStyles[styles[0]],styleOriginal:wdStyles[styles[0]],styleTerms:styles.map(id=>wdStyles[id]),technique:tech,medium:[...labels,...processLabels].join(' · '),materialIds:materials,...(processes.length?{techniqueIds:processes}:{}),imageId:e.id,source:'https://www.wikidata.org/wiki/'+e.id,museum:ids(e,'P195').map(id=>name(entities.get(id))).filter(Boolean).join(' · ')||'Sammlung laut verlinktem Werkdatensatz',metadataProvider:'Wikidata',styleSource:'P135 am Werk, nicht vom Künstler abgeleitet',rights:'CC0 / Public Domain',publicDomain:true,wikidata:'https://www.wikidata.org/wiki/'+e.id,artistWikidata:'https://www.wikidata.org/wiki/'+artists[0],imageTitle:'File:'+image.replace(/_/g,' ')});
}
const requested=[...new Set(raw.map(x=>x.imageTitle))].filter(title=>!pages.has(title));
for(let i=0;i<requested.length;i+=25) {
  const batch=requested.slice(i,i+25),query={action:'query',format:'json',formatversion:'2',redirects:'1',titles:batch.join('|'),prop:'imageinfo|categories',cllimit:'max',iiprop:'url|extmetadata|mime|size',iiurlwidth:'960'};
  const data=await request('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams(query),'commons-'+hash(batch.join('|')));
  for(const page of data.query?.pages||[])pages.set(page.title,page);
  for(let pass=0;pass<3;pass++)for(const alias of [...(data.query?.redirects||[]),...(data.query?.normalized||[])])if(pages.has(alias.to))pages.set(alias.from,pages.get(alias.to));
  console.log('Commons metadata',Math.min(i+25,requested.length),'/',requested.length);
}
const plain=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();
const usedImages=new Set(media.images.map(x=>x.imageOriginalURL)),usedQ=new Set(knownItems),additions=[],newImages=[],titleReview=[];
for(const work of raw) {
  const entity=entities.get(work.qid),artistId=ids(entity,'P170');
  const artistArticle=article(entities.get(artistId[0]))||wiki.artists[work.artist],workArticle=article(entity);
  if(!artistArticle||artistId.length!==1||usedQ.has(work.qid))continue;
  const page=pages.get(work.imageTitle),img=page?.imageinfo?.[0],meta=img?.extmetadata,license=plain(meta?.LicenseShortName?.value);
  if(!img||!/^image\//.test(img.mime)||!/public domain|cc0|cc-zero/i.test(license)||page.categories?.some(x=>/deletion|copyright violation|permission pending/i.test(x.title))||Math.min(img.width,img.height)<250||img.width*img.height<250000||usedImages.has(img.url))continue;
  const original=new URL(img.url),preview=new URL(img.thumburl||img.url);
  if(original.protocol!=='https:'||original.hostname!=='upload.wikimedia.org'||!['upload.wikimedia.org','thumb.wikimedia.org'].includes(preview.hostname))continue;
  original.search='';preview.search='';usedImages.add(original.href);usedQ.add(work.qid);
  const {qid,imageTitle,...record}=work;
  if(qid==='Q18339689'){record.galleryTitle='Ein Künstlerwappen';record.galleryTitleNote='Für das Quiz gekürzt, weil der Originaltitel den Künstler nennt.';}
  additions.push(record);
  newImages.push({id:work.id,wikidata:work.wikidata,imageURL:preview.href,imageLargeURL:img.size>8*1048576?preview.href:original.href,imageOriginalURL:original.href,imageSource:img.descriptionurl,imageLicense:license,imageCredit:plain(meta?.Artist?.value),imageLicenseURL:meta?.LicenseUrl?.value||'https://commons.wikimedia.org/wiki/Commons:Reuse_of_PD-Art_photographs',imageWidth:img.width,imageHeight:img.height,imageMime:img.mime,imageBytes:img.size,imageDownloadAllowed:true,downloadRightsChecked:checked});
  wiki.artists[work.artist]=artistArticle;if(workArticle)wiki.works[work.id]=workArticle;
  for(const id of ids(entity,'P135').filter(id=>wdStyles[id])) {
    const styleArticle=article(entities.get(id));
    if(styleArticle)(wiki.styles||={})[wdStyles[id]]=styleArticle;
  }
  titleReview.push({id:work.id,title:work.title,german:entity?.labels?.de?.value||null,article:workArticle,artist:work.artist,technique:work.technique,style:work.style,source:work.source,imageSource:img.descriptionurl});
}
if(!additions.length)throw Error('No verified additions');
const translations=new Map(readFileSync(root+'data/kunst-titel-balance-uebersetzungen.tsv','utf8').trim().split('\n').map(line=>{const [id,...text]=line.split('\t');return [id,text.join('\t')];}));
const nextTitles={...priorTitles,checked,titles:{...priorTitles.titles},ownTranslations:[...priorTitles.ownTranslations],retainedTitles:[...priorTitles.retainedTitles]};
for(const work of additions){
  const reviewed=titleReview.find(x=>x.id===work.id),sourceTitle=reviewed.german||(reviewed.article?.language==='de'?reviewed.article.title.replace(/\s+\([^)]*\)$/,''):'');
  const text=work.galleryTitle||translations.get(work.id)||sourceTitle;
  if(!text)throw Error('German title requires editorial review: '+work.id+' / '+work.title);
  nextTitles.titles[work.id]=text;
  (translations.has(work.id)&&text!==work.title&&text!==sourceTitle&&!work.galleryTitle?nextTitles.ownTranslations:nextTitles.retainedTitles).push(work.id);
}
const output={'kunstarchiv.json':{...archive,version:3,checked,works:[...archive.works,...additions]},'kunstbilder.json':{...media,checked,images:[...media.images,...newImages]},'kunst-wikipedia.json':{...wiki,checked},'kunst-titel-de.json':nextTitles};
// Small append-only patches are reviewable and preserve every existing object.
let patchIndex=0;
for(const [filename,data]of Object.entries(output)) {
  if(filename==='kunst-wikipedia.json'||filename==='kunst-titel-de.json') {
    const old=readFileSync(root+'data/'+filename,'utf8'),text=JSON.stringify(data,null,2);
    writeFileSync(resolve(cache,'patch-'+String(patchIndex++).padStart(3,'0')+'.patch'),'*** Begin Patch\n*** Update File: '+root+'data/'+filename+'\n@@\n'+old.trimEnd().split('\n').map(x=>'-'+x).join('\n')+'\n'+text.split('\n').map(x=>'+'+x).join('\n')+'\n*** End Patch\n');
    continue;
  }
  const key=filename==='kunstarchiv.json'?'works':'images',items=filename==='kunstarchiv.json'?additions:newImages;
  for(let i=0;i<items.length;i+=15) {
    const chunk=items.slice(i,i+15),lines=chunk.map(item=>JSON.stringify(item,null,2).split('\n').map(line=>'    '+line).join('\n')).join(',\n')+',\n';
    writeFileSync(resolve(cache,'patch-'+String(patchIndex++).padStart(3,'0')+'.patch'),'*** Begin Patch\n*** Update File: '+root+'data/'+filename+'\n@@\n   "'+key+'": [\n'+lines.trimEnd().split('\n').map(x=>'+'+x).join('\n')+'\n*** End Patch\n');
  }
}
writeFileSync(resolve(cache,'additions.json'),JSON.stringify({works:additions,images:newImages,titles:titleReview},null,2));
writeFileSync(resolve(cache,'report.json'),JSON.stringify({existing:archive.works.length,added:additions.length,total:archive.works.length+additions.length,patches:patchIndex,techniques:output['kunstarchiv.json'].works.reduce((s,x)=>(s[x.technique]=(s[x.technique]||0)+1,s),{}),titleReview},null,2));
console.log('Ready for review:',additions.length,'additions;',patchIndex,'patches; no images downloaded.');

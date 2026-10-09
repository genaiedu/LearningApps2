// Metadata-only expansion. Generated cache/output stays outside the repository.
// node scripts/expand-kunstarchiv.mjs /private/tmp/kunst-1000-cache
// Apply the generated .patch files with apply_patch after reviewing the report.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const cache = resolve(process.argv[2] || '/private/tmp/kunst-1000-cache');
mkdirSync(cache, { recursive: true });
const root = new URL('../', import.meta.url).pathname;
const checked = '2026-10-09';
const headers = { 'User-Agent': 'LearningApps-Kunsttresor/2.0 (educational; metadata only)', Accept: 'application/json' };
const pause = ms => new Promise(done => setTimeout(done, ms));
async function request(url, name) {
  const file = resolve(cache, (name.length>150 ? name.split('-')[0]+'-'+createHash('sha256').update(name).digest('hex') : name) + '.json');
  if (existsSync(file)) {
    const saved=JSON.parse(readFileSync(file, 'utf8'));
    const requested=new URL(url).searchParams.get('titles');
    const cachedTitles=new Set([...(saved.query?.pages||[]).map(p=>p.title),...(saved.query?.redirects||[]).map(r=>r.from),...(saved.query?.normalized||[]).map(n=>n.from)]);
    if (!requested || requested.split('|').every(title=>cachedTitles.has(title))) return saved;
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    let retryAfter = 0;
    try {
      const r = await fetch(url, { headers, signal: AbortSignal.timeout(45000) });
      if (!r.ok) {
        const retry = r.headers.get('retry-after');
        retryAfter = retry ? (Number.isFinite(Number(retry)) ? Number(retry)*1000 : Date.parse(retry)-Date.now()) : 0;
        throw Error('HTTP ' + r.status);
      }
      const json = await r.json();
      if (json.error) throw Error(JSON.stringify(json.error));
      writeFileSync(file, JSON.stringify(json)); // Generated API cache, not application source.
      await pause(3200);
      return json;
    } catch (error) {
      const delay = Math.min(45000, Math.max(retryAfter, 20000 + attempt*5000));
      console.log('Retry', name.slice(0,60), attempt + 1, error.message, 'waiting', delay/1000, 'seconds');
      if (attempt === 5) throw error;
      await pause(delay);
    }
  }
}
function api(query) { return 'https://www.wikidata.org/w/api.php?' + new URLSearchParams({format:'json',...query}); }
const styles = {
  Q131808:'Manierismus', Q4692:'Renaissance', Q37853:'Barock', Q122960:'Rokoko',
  Q14378:'Klassizismus', Q37068:'Romantik', Q10857409:'Realismus', Q40415:'Impressionismus',
  Q166713:'Postimpressionismus', Q164800:'Symbolismus', Q80113:'Expressionismus',
  Q42934:'Kubismus', Q166593:'Fauvismus', Q34636:'Jugendstil', Q39427:'Surrealismus', Q184814:'Präraffaeliten'
};
const found = new Map();
for (const style of Object.keys(styles)) {
  const query = `SELECT DISTINCT ?item ?links WHERE {
    ?item wdt:P135 wd:${style}; wdt:P170 ?artist; wdt:P571 ?date; wdt:P18 ?image; wdt:P186 ?material; wikibase:sitelinks ?links.
    ?artist wdt:P570 ?death. FILTER(YEAR(?death)<=1955 && YEAR(?death)>1300 && YEAR(?date)>=1350 && YEAR(?date)<=1955)
  } ORDER BY DESC(?links) LIMIT 220`;
  const url = 'https://query.wikidata.org/sparql?' + new URLSearchParams({query,format:'json'});
  try {
    const data = await request(url, 'style-' + style);
    for (const row of data.results.bindings) {
      const id = row.item.value.split('/').at(-1);
      if (!found.has(id)) found.set(id,{id,style,links:Number(row.links.value)});
    }
    console.log(styles[style], data.results.bindings.length, 'candidates:', found.size);
  } catch (error) { console.log('Skipped unavailable query',style,error.message); }
}
// Expand a densely documented style only if the broad first pass was insufficient.
if (found.size < 1400) {
  for (const style of ['Q40415','Q10857409','Q37068','Q37853']) {
    const query = `SELECT DISTINCT ?item ?links WHERE {
      ?item wdt:P135 wd:${style}; wdt:P170 ?artist; wdt:P571 ?date; wdt:P18 ?image; wdt:P186 ?material; wikibase:sitelinks ?links.
      ?artist wdt:P570 ?death. FILTER(YEAR(?death)<=1955 && YEAR(?death)>1300 && YEAR(?date)>=1350 && YEAR(?date)<=1955)
    } ORDER BY DESC(?links) LIMIT 500`;
    const data = await request('https://query.wikidata.org/sparql?' + new URLSearchParams({query,format:'json'}),'more-'+style);
    for (const row of data.results.bindings) {
      const id=row.item.value.split('/').at(-1);
      if (!found.has(id)) found.set(id,{id,style,links:Number(row.links.value)});
    }
    console.log('Expanded',styles[style],found.size);
  }
}
const entities = new Map();
async function getEntities(ids) {
  const missing = [...new Set(ids)].filter(id=>!entities.has(id)).sort();
  for (let i=0;i<missing.length;i+=40) {
    const batch = missing.slice(i,i+40);
    const name = 'entities-'+batch.join('-');
    const data = await request(api({action:'wbgetentities',ids:batch.join('|'),props:'labels|claims|sitelinks',languages:'de|en',sitefilter:'dewiki|enwiki'}),name);
    for (const e of Object.values(data.entities)) entities.set(e.id,e);
    console.log('Metadata',Math.min(i+40,missing.length),'/',missing.length);
  }
}
const values = (e,p) => (e?.claims?.[p]||[]).filter(s=>s.rank!=='deprecated' && s.mainsnak?.snaktype==='value').map(s=>s.mainsnak.datavalue?.value);
const ids = (e,p) => values(e,p).map(v=>v?.id).filter(Boolean);
const name = e => e?.labels?.de?.value || e?.labels?.en?.value || '';
function article(e) {
  const a=e?.sitelinks?.dewiki || e?.sitelinks?.enwiki;
  return a ? {title:a.title,language:a.site==='dewiki'?'de':'en'} : null;
}
await getEntities([...found.keys()]);
const related = [...entities.values()].flatMap(e=>['P170','P186','P195'].flatMap(p=>ids(e,p)));
await getEntities(related);
function medium(e) {
  const materials=ids(e,'P186').map(id=>({id,label:name(entities.get(id))}));
  const m=materials.map(x=>x.label.toLowerCase());
  const oil=materials.some(x=>x.id==='Q296955') || m.some(x=>/^oil paint|^ölfarbe|^ölmalerei/.test(x));
  const tempera=materials.some(x=>x.id==='Q175166') || m.some(x=>/tempera/.test(x));
  if (oil && tempera) return null; // Do not collapse documented mixed techniques.
  let technique;
  if (tempera) technique='Tempera';
  else if (oil && materials.some(x=>x.id==='Q929186')) technique='Öl und Metallauflage';
  else if (oil && m.some(x=>/leinwand|canvas/.test(x))) technique='Öl auf Leinwand';
  else if (oil && m.some(x=>/holz|wood|eichen|oak|pappel|poplar|panel|mahagon|birken|birch|walnut|nussbaum|beech|kiefer|pine|linde|limewood/.test(x))) technique='Öl auf Holz';
  else if (oil && m.some(x=>/papier|paper|karton|cardboard/.test(x))) technique='Öl auf Papier / Karton';
  else if (m.some(x=>/watercolou?r|aquarell/.test(x))) technique='Aquarell';
  else if (m.some(x=>/pastell|pastel/.test(x))) technique='Pastell';
  if (!technique || materials.some(x=>!x.label)) return null;
  return {technique,medium:materials.map(x=>x.label).join(' · '),materialIds:materials.map(x=>x.id)};
}
function dating(e) {
  const bounds=(e?.claims?.P571||[]).flatMap(s=>['P1319','P1326'].flatMap(p=>(s.qualifiers?.[p]||[]).map(q=>q.datavalue?.value)));
  const dates=[...values(e,'P571'),...bounds].filter(v=>v && v.precision>=9 && /^\+\d{4}-/.test(v.time));
  const years=[...new Set(dates.map(v=>Number(v.time.slice(1,5))))].sort((a,b)=>a-b);
  if (!years.length || years[0]<1350 || years.at(-1)>1955 || years.at(-1)-years[0]>12) return null;
  const approximate=(e.claims.P571||[]).some(s=>s.qualifiers?.P1480?.length);
  return (approximate?'um ':'') + (years.length===1?years[0]:years[0]+'–'+years.at(-1));
}
const archive=JSON.parse(readFileSync(root+'data/kunstarchiv.json','utf8'));
const media=JSON.parse(readFileSync(root+'data/kunstbilder.json','utf8'));
const wikipedia=JSON.parse(readFileSync(root+'data/kunst-wikipedia.json','utf8'));
delete wikipedia.artists[''];
const existingMedia=new Map(media.images.map(i=>[i.id,i]));
const oldPlayable=archive.works.filter(w=>w.id.startsWith('aic-') && existingMedia.has(w.id) && wikipedia.artists[w.artist]);
const oldItems=new Set(media.images.filter(i=>i.id.startsWith('aic-')).map(i=>i.wikidata?.split('/').at(-1)).filter(Boolean));
// Preserve source titles; quiz headings may omit artist names that would reveal an answer.
const galleryTitles={
  Q18010009:'Porträt der Ehefrau', Q15074981:'Gastmahl im Haus des Simon',
  Q61962113:'Altarpiece of Mare de Déu de la Misericordia',
  Q3630749:'Porträt des Sir Endimion Porter und Selbstporträt',
  Q21503834:'Le Cauchemar', Q29117166:'Reconciliation',
  Q74589192:'Altarpiece Santo Domingo Antiguo', Q21045432:'Selbstporträt',
  Q19162488:'Interior', Q19820692:'Pan and Psyche', Q28047587:'Selbstporträt',
  Q7289817:'Zwei Männer im Automobil', Q4884677:'Belshazzar’s Feast',
  Q4889277:'Zwei Männer auf einem Tandem', Q109308645:'Kinder', Q55418032:'Die zwölf Apostel',
  Q18518827:'Portrait de Jean-Pierre-François Gilibert', Q106628689:'Fleurs et fruits'
};
const raw=[];
for (const record of found.values()) {
  if (oldItems.has(record.id)) continue;
  const e=entities.get(record.id), artists=ids(e,'P170'), date=dating(e), tech=medium(e);
  if (artists.length!==1 || !date || !tech || !name(e)) continue;
  const artist=entities.get(artists[0]), death=values(artist,'P570')[0];
  const artistDeath=Number(death?.time?.slice(1,5)), artistArticle=article(artist);
  if (!artistArticle || !Number.isInteger(artistDeath) || artistDeath>1955 || artistDeath<=1300) continue;
  // Wikidata may store a person's name only under the multilingual label.
  // Their canonical personal Wikipedia title is an explicit, documented fallback.
  const artistName=name(artist) || artistArticle.title.replace(/\s*\([^)]*\)$/,'');
  if (!artistName.trim()) continue;
  const styleIds=ids(e,'P135').filter(id=>styles[id]);
  if (!styleIds.length) continue;
  const image=values(e,'P18').find(v=>typeof v==='string' && /\.(jpg|jpeg|png|tif|tiff)$/i.test(v));
  if (!image) continue;
  const collection=ids(e,'P195').map(id=>name(entities.get(id))).filter(Boolean).join(' · ');
  const sourceURL=values(e,'P973').find(v=>typeof v==='string' && /^https:\/\//.test(v) && !/wikipedia|wikimedia|wikidata/.test(v));
  raw.push({id:'wd-'+record.id,title:name(e),artist:artistName,artistDeath,date,
    ...(galleryTitles[record.id]?{galleryTitle:galleryTitles[record.id],galleryTitleNote:'Für das Quiz gekürzt, um den Künstler nicht zu verraten.'}:{}),
    style:styles[styleIds[0]],styleOriginal:styles[styleIds[0]],styleTerms:styleIds.map(id=>styles[id]),
    ...tech,imageId:record.id,source:'https://www.wikidata.org/wiki/'+record.id,
    catalogueSource:sourceURL || null,museum:collection || 'Sammlung laut verlinktem Werkdatensatz',
    rights:'CC0 / Public Domain',publicDomain:true,metadataProvider:'Wikidata',styleSource:'P135 am Werk, nicht vom Künstler abgeleitet',
    wikidata:'https://www.wikidata.org/wiki/'+record.id,artistWikidata:'https://www.wikidata.org/wiki/'+artists[0],
    imageTitle:'File:'+image.replace(/_/g,' '),importance:record.links,artistArticle,workArticle:article(e)});
}
console.log('Complete metadata candidates:',raw.length,'preserved:',oldPlayable.length);
const info=new Map();
const plain = s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();
const titles=[...new Set(raw.map(w=>w.imageTitle))];
// Reuse verified page metadata across batch boundaries if a stricter filter changes the list.
const cachedPages=new Map(), cachedAliases=[];
for (const filename of readdirSync(cache).filter(n=>/^commons-.*\.json$/.test(n))) {
  const data=JSON.parse(readFileSync(resolve(cache,filename),'utf8'));
  for (const page of data.query?.pages||[]) cachedPages.set(page.title,page);
  cachedAliases.push(...(data.query?.redirects||[]),...(data.query?.normalized||[]));
}
for (let pass=0;pass<3;pass++) for (const alias of cachedAliases) if (cachedPages.has(alias.to)) cachedPages.set(alias.from,cachedPages.get(alias.to));
const missingTitles=titles.filter(title=>!cachedPages.has(title));
for (let i=0;i<missingTitles.length;i+=30) {
  const batch=missingTitles.slice(i,i+30);
  const url='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',formatversion:'2',redirects:'1',titles:batch.join('|'),prop:'imageinfo|categories',cllimit:'max',iiprop:'url|extmetadata|mime|size',iiurlwidth:'1600'});
  const key='commons-extra-'+createHash('sha256').update(batch.join('|')).digest('hex');
  const data=await request(url,key);
  for (const page of data.query?.pages||[]) cachedPages.set(page.title,page);
  const aliases=[...(data.query?.redirects||[]),...(data.query?.normalized||[])];
  for (let pass=0;pass<3;pass++) for (const alias of aliases) if (cachedPages.has(alias.to)) cachedPages.set(alias.from,cachedPages.get(alias.to));
  console.log('Additional Commons metadata',Math.min(i+30,missingTitles.length),'/',missingTitles.length);
}
for (let i=0;i<titles.length;i+=30) {
  const batch=titles.slice(i,i+30);
  const url='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',formatversion:'2',redirects:'1',titles:batch.join('|'),prop:'imageinfo|categories',cllimit:'max',iiprop:'url|extmetadata|mime|size',iiurlwidth:'1600'});
  const data=batch.every(title=>cachedPages.has(title))
    ? {query:{pages:[...new Set(batch.map(title=>cachedPages.get(title)))],redirects:batch.map(title=>({from:title,to:cachedPages.get(title).title}))}}
    : await request(url,'commons-'+i+'-'+batch.length);
  const aliases=new Map((data.query?.redirects||[]).map(r=>[r.from,r.to]));
  for (const page of data.query?.pages||[]) {
    const img=page.imageinfo?.[0],meta=img?.extmetadata,license=plain(meta?.LicenseShortName?.value);
    if (!img || !/^image\//.test(img.mime) || !/public domain|cc0|cc-zero/i.test(license)) continue;
    if (page.categories?.some(c=>/deletion|copyright violation|permission pending/i.test(c.title))) continue;
    if (Math.min(img.width,img.height)<250 || img.width*img.height<250000) continue;
    const original=new URL(img.url),large=new URL(img.thumburl||img.url);
    if (original.protocol!=='https:' || original.hostname!=='upload.wikimedia.org' || !['upload.wikimedia.org','thumb.wikimedia.org'].includes(large.hostname)) continue;
    large.search='';
    const image={imageURL:large.href,imageLargeURL:large.href,imageOriginalURL:original.href,imageSource:img.descriptionurl,
      imageLicense:license,imageCredit:plain(meta?.Artist?.value),imageLicenseURL:meta?.LicenseUrl?.value||'https://commons.wikimedia.org/wiki/Commons:Reuse_of_PD-Art_photographs',
      imageWidth:img.width,imageHeight:img.height,imageMime:img.mime,imageBytes:img.size,imageDownloadAllowed:true,downloadRightsChecked:checked};
    info.set(page.title,image);
    for(const [from,to]of aliases)if(to===page.title)info.set(from,image);
  }
  console.log('Commons licenses',Math.min(i+30,titles.length),'/',titles.length,'verified',info.size);
}
const seenImages=new Set(oldPlayable.map(w=>existingMedia.get(w.id).imageOriginalURL));
const eligible=raw.sort((a,b)=>b.importance-a.importance).filter(w=>{
  const image=info.get(w.imageTitle);
  if (!image || ids(entities.get(w.imageId),'P31').includes('Q15727816') || seenImages.has(image.imageOriginalURL)) return false;
  seenImages.add(image.imageOriginalURL);
  return true;
});
// Fill diverse styles round-robin rather than publishing 700 works from one movement.
const sorted=eligible.sort((a,b)=>b.importance-a.importance || a.id.localeCompare(b.id));
const buckets=Object.values(styles).map(style=>sorted.filter(w=>w.style===style));
const additions=[];
while(additions.length<1000-oldPlayable.length && buckets.some(b=>b.length))for(const bucket of buckets){
  if (bucket.length && additions.length<1000-oldPlayable.length) additions.push(bucket.shift());
}
if(oldPlayable.length+additions.length!==1000) throw Error('Not enough verified unique works: '+(oldPlayable.length+additions.length));
const imageNames=new Set(oldPlayable.map(w=>existingMedia.get(w.id).imageOriginalURL));
for(const w of additions){
  const image=info.get(w.imageTitle);
  if(imageNames.has(image.imageOriginalURL))throw Error('Duplicate image '+w.id);
  imageNames.add(image.imageOriginalURL);
}
const clean=w=>{const {imageTitle,artistArticle,workArticle,...rest}=w;return rest;};
const finalWorks=[...oldPlayable,...additions.map(clean)];
const finalMedia=[...oldPlayable.map(w=>existingMedia.get(w.id)),...additions.map(w=>({id:w.id,wikidata:w.wikidata,...info.get(w.imageTitle)}))];
for(const w of additions){ wikipedia.artists[w.artist]=w.artistArticle;if(w.workArticle)wikipedia.works[w.id]=w.workArticle; }
// Curated closing set: artworks with their own Wikipedia articles in many languages.
// The ranked candidates and exact titles are saved for review before publication.
const featured=additions.filter(w=>w.workArticle && w.importance>=5).sort((a,b)=>b.importance-a.importance).slice(0,100);
if(featured.length!==100)throw Error('Only '+featured.length+' documented landmark works');
const output={
  'kunstarchiv.json':{...archive,version:2,source:['https://api.artic.edu/docs/','https://www.wikidata.org/'],
    selection:'1.000 eindeutig zugeordnete Werke mit Datierung, am Werk dokumentierter Stilrichtung und Technik. Bildrechte einzeln auf Commons geprüft. Frühere spielbare Datensätze und IDs bleiben erhalten.',works:finalWorks},
  'kunstbilder.json':{checked,matching:'Art Institute IDs and Wikidata artwork identities; individually verified Commons originals and public-domain licenses.',images:finalMedia},
  'kunst-wikipedia.json':{...wikipedia,checked},
  'kunst-hauptwerke.json':{version:1,checked,selection:'100 bekannte Hauptwerke mit eigenem Wikipediaartikel und breiter Wikimedia-Rezeption; ausgewählt und auf die vier Quizangaben und eine gemeinfreie Commons-Bildfassung geprüft.',works:featured.map(w=>({id:w.id,title:w.title,artist:w.artist,source:w.source,wikipedia:w.workArticle,wikimediaSitelinks:w.importance}))}
};
for(const [filename,data]of Object.entries(output)){
  const target=root+'data/'+filename,old=existsSync(target)?readFileSync(target,'utf8'):null;
  const content=JSON.stringify(data,null,2);
  const patch='*** Begin Patch\n*** '+(old?'Update':'Add')+' File: '+target+'\n'+(old?'@@\n'+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n':'')+content.split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch\n';
  writeFileSync(resolve(cache,filename+'.patch'),patch);
}
writeFileSync(resolve(cache,'report.json'),JSON.stringify({total:finalWorks.length,featured:featured.map(w=>[w.id,w.title,w.artist,w.importance]),styles:finalWorks.reduce((n,w)=>(n[w.style]=(n[w.style]||0)+1,n),{}),artists:new Set(finalWorks.map(w=>w.artist)).size,techniques:new Set(finalWorks.map(w=>w.technique)).size},null,2));
console.log('Prepared',finalWorks.length,'works;',featured.length,'closing masterpieces. No images downloaded.');

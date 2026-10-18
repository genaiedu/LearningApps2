// Public metadata and licence research only; no images, player data or AI calls.
// Generated API cache remains outside the repository. No published data is edited.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const cache=process.argv[2]||'/private/tmp/kunst-portrait-cache';await fs.mkdir(cache,{recursive:true});
const option=name=>process.argv.find(arg=>arg.startsWith(name+'='))?.slice(name.length+1);
const artistIds=option('--artists')?.split(',');
if(artistIds?.some(id=>!/^Q\d+$/.test(id)))throw Error('Invalid artist IDs');
const perArtist=process.argv.includes('--per-artist');
const limit=Number(option('--limit')||60);
if(!Number.isInteger(limit)||limit<1||limit>200)throw Error('Invalid candidate limit');
const plan=option('--plan')?JSON.parse(await fs.readFile(path.resolve(option('--plan')),'utf8')):null;
const headers={'User-Agent':'LearningApps-Kunsttresor/3.0 (educational; public metadata review)','Accept':'application/json'};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function request(url,name){
 const file=path.join(cache,name+'.json');try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{}
 for(let attempt=0;attempt<3;attempt++){
  let cooldown=15000*(attempt+1);
  try{const r=await fetch(url,{headers,signal:AbortSignal.timeout(45000)});if(!r.ok){const retry=Number(r.headers.get('retry-after'));if(Number.isFinite(retry)&&retry>0)cooldown=Math.max(cooldown,retry*1000);throw Error('HTTP '+r.status);}const value=await r.json();if(value.error)throw Error(value.error.code||'API error');await fs.writeFile(file,JSON.stringify(value));await pause(3500);return value;}
  catch(e){console.log(name,attempt+1,e.message);if(attempt===2||cooldown>60000)throw e;await pause(cooldown);}
 }
}
const wiki=params=>'https://www.wikidata.org/w/api.php?'+new URLSearchParams({format:'json',...params});
const commons=params=>'https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({format:'json',formatversion:'2',...params});
if(process.argv.includes('--discover')){
 const refs=await request(wiki({action:'wbgetentities',ids:artistIds?.join('|')||'Q40599|Q82445|Q34661|Q39931|Q180788|Q23402|Q51252|Q19675|Q134307|Q517|Q1511',props:'labels|claims',languages:'de|en'}),'references-v2');
 console.log(Object.values(refs.entities).map(e=>e.id+' '+(e.labels.de?.value||e.labels.en?.value)).join('\n'));
 const artistQuery=ids=>`SELECT DISTINCT ?item ?links WHERE { VALUES ?artist {${ids.map(id=>'wd:'+id).join(' ')}} ?item wdt:P170 ?artist; wdt:P18 ?image; wdt:P571 ?date; ${process.argv.includes('--relaxed-material')?'':'wdt:P186 ?material; '}wikibase:sitelinks ?links. } ORDER BY DESC(?links) LIMIT ${perArtist?limit:120}`;
 const queries=artistIds?(perArtist?Object.fromEntries(artistIds.map(id=>[id,artistQuery([id])])):{masters:artistQuery(artistIds)}):{
  artists:'SELECT DISTINCT ?item ?links WHERE { VALUES ?artist {wd:Q40599 wd:Q82445 wd:Q34661} ?item wdt:P170 ?artist; wdt:P18 ?image; wdt:P571 ?date; wdt:P186 ?material; wikibase:sitelinks ?links. } ORDER BY DESC(?links) LIMIT 200',
  'portraits-500':'SELECT DISTINCT ?item ?links WHERE { VALUES ?collection {wd:Q180788 wd:Q23402 wd:Q51252 wd:Q19675} ?item wdt:P195 ?collection; wdt:P136 wd:Q134307; wdt:P170 ?artist; wdt:P18 ?image; wdt:P571 ?date; wdt:P186 ?material; wikibase:sitelinks ?links. ?artist wdt:P570 ?death. FILTER(YEAR(?death)<=1955) } ORDER BY DESC(?links) LIMIT 500',
  'napoleon-v2':'SELECT DISTINCT ?item ?links WHERE { VALUES ?person {wd:Q517 wd:Q1511} ?item wdt:P180 ?person; wdt:P170 ?artist; wdt:P18 ?image; wdt:P571 ?date; wdt:P186 ?material; wikibase:sitelinks ?links. ?artist wdt:P570 ?death. FILTER(YEAR(?death)<=1955) } ORDER BY DESC(?links) LIMIT 55'
 };
 const found=new Map();
 for(const [name,query]of Object.entries(queries)){
  const value=await request('https://query.wikidata.org/sparql?'+new URLSearchParams({query,format:'json'}),'discover-'+name);
  for(const row of value.results.bindings){const id=row.item.value.split('/').at(-1);if(!found.has(id))found.set(id,{id,links:Number(row.links.value),groups:[]});found.get(id).groups.push(name);}
  console.log(name,value.results.bindings.length);
 }
 const baseline=JSON.parse(await fs.readFile(new URL('../data/kunstarchiv.json',import.meta.url),'utf8'));
 const known=new Set(baseline.works.flatMap(w=>[w.wikidata?.split('/').at(-1),w.id.startsWith('wd-')?w.id.slice(3):null]).filter(Boolean));
 for(const id of plan?.works?.map(w=>w[0])||(!artistIds?['Q19883512','Q19801071']:[]))if(!known.has(id))found.set(id,{id,links:0,groups:['requested']});
 const candidates=[...found.values()].filter(row=>!known.has(row.id));await fs.writeFile(path.join(cache,'candidates.json'),JSON.stringify(candidates,null,2));
 console.log('new candidates',candidates.length);
}
if(process.argv.includes('--requested')){
 const rows=JSON.parse(await fs.readFile(path.join(cache,'candidates.json'),'utf8'));
 for(const id of plan?.works?.map(w=>w[0])||['Q19883512','Q19801071'])if(!rows.some(row=>row.id===id))rows.push({id,links:0,groups:['requested']});
 await fs.writeFile(path.join(cache,'candidates.json'),JSON.stringify(rows,null,2));
 const files=plan?Object.values(plan.requestedFiles||{}):['File:Richard Wagner (Auguste Renoir, 1882).jpg','File:Gustav Klimt - Hope, II - Google Art Project.jpg','File:David - Napoleon crossing the Alps - Malmaison1.jpg'];
 const value=files.length?await request(commons({action:'query',titles:files.join('|'),redirects:'1',prop:'imageinfo|categories',cllimit:'max',iiprop:'url|extmetadata|mime|size',iiurlwidth:'960'}),'requested-files'):{query:{pages:[]}};
 await fs.writeFile(path.join(cache,'requested.json'),JSON.stringify(value));
}
if(process.argv.includes('--metadata')){
 const rows=JSON.parse(await fs.readFile(path.join(cache,'candidates.json'),'utf8')),entities={};
 async function collect(ids){const missing=[...new Set(ids)].filter(id=>!entities[id]);for(let i=0;i<missing.length;i+=40){const batch=missing.slice(i,i+40),key=createHash('sha256').update(batch.join('|')).digest('hex');const value=await request(wiki({action:'wbgetentities',ids:batch.join('|'),props:'labels|claims|sitelinks',languages:'de|en|fr|it',sitefilter:'dewiki|enwiki|frwiki|itwiki'}),'entities-'+key);Object.assign(entities,value.entities);}}
 await collect(rows.map(row=>row.id));
 const ids=(e,p)=>(e?.claims?.[p]||[]).filter(s=>s.rank!=='deprecated').map(s=>s.mainsnak?.datavalue?.value?.id).filter(Boolean);
 await collect(Object.values(entities).flatMap(e=>['P170','P135','P186','P195','P31'].flatMap(p=>ids(e,p))));
 await fs.writeFile(path.join(cache,'entities.json'),JSON.stringify(entities));
 const files=[...new Set(rows.flatMap(row=>(entities[row.id]?.claims?.P18||[]).filter(s=>s.rank!=='deprecated').map(s=>s.mainsnak?.datavalue?.value).filter(v=>typeof v==='string').slice(0,1)).map(v=>'File:'+v.replace(/_/g,' ')))];
 const pages=[],aliases=[];
 for(let i=0;i<files.length;i+=25){const titles=files.slice(i,i+25),key=createHash('sha256').update(titles.join('|')).digest('hex');const value=await request(commons({action:'query',titles:titles.join('|'),redirects:'1',prop:'imageinfo|categories',cllimit:'max',iiprop:'url|extmetadata|mime|size',iiurlwidth:'960'}),'commons-'+key);pages.push(...value.query.pages);aliases.push(...value.query.normalized||[],...value.query.redirects||[]);console.log('licences',Math.min(i+25,files.length),files.length);}
 await fs.writeFile(path.join(cache,'commons.json'),JSON.stringify({pages,aliases}));console.log('public metadata collected');
}

// Append-only, reviewed artwork expansion. Reads cached public API metadata;
// emits an apply_patch patch. Never downloads images or modifies published data.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const cache=path.resolve(process.argv[2]||'/private/tmp/kunst-portrait-cache');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const sourceText=async name=>process.argv.includes('--review-unpublished')?execFileSync('git',['show','20751be1e3d8f79fe14af41084614dd0f0bd5c0b:data/'+name+'.json'],{cwd:root,maxBuffer:12*1024*1024}).toString():fs.readFile(root+'/data/'+name+'.json','utf8');
const planArg=process.argv.find(arg=>arg.startsWith('--plan='));
const plan=await read(planArg?path.resolve(planArg.slice(7)):root+'/data/kunst-portraets-2026.json');
const entities=await read(cache+'/entities.json'),commons=await read(cache+'/commons.json'),requested=await read(cache+'/requested.json');
const pages=new Map([...commons.pages,...requested.query.pages].map(page=>[page.title,page]));
for(const alias of [...commons.aliases,...requested.query.normalized||[],...requested.query.redirects||[]])if(pages.has(alias.to))pages.set(alias.from,pages.get(alias.to));
const claims=(e,p)=>(e?.claims?.[p]||[]).filter(c=>c.rank!=='deprecated'&&c.mainsnak?.datavalue);
const val=(e,p)=>claims(e,p).map(c=>c.mainsnak.datavalue.value);
const label=id=>entities[id]?.labels?.de?.value||entities[id]?.labels?.en?.value||entities[id]?.sitelinks?.dewiki?.title||entities[id]?.sitelinks?.enwiki?.title||id;
const clean=text=>String(text||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const article=e=>e?.sitelinks?.dewiki?{title:e.sitelinks.dewiki.title,language:'de'}:e?.sitelinks?.enwiki?{title:e.sitelinks.enwiki.title,language:'en'}:null;
const year=value=>value?.time?.match(/^\+(\d+)-/) ? Number(value.time.match(/^\+(\d+)-/)[1]) : null;
export function dating(e){
  const all=claims(e,'P571'),preferred=all.filter(c=>c.rank==='preferred'),entries=preferred.length?preferred:all;
  const dates=entries.map(s=>{
    const base=s.mainsnak.datavalue.value,q=s.qualifiers||{},get=p=>q[p]?.[0]?.datavalue?.value;
    const min=year(get('P1319')||get('P580'))??(base.precision>=9?year(base):null),max=year(get('P1326')||get('P582'))??(base.precision>=9?year(base):null);
    const approximate=Boolean(q.P1480||q.P31?.some(x=>x.datavalue?.value?.id==='Q26961029'));
    return {min,max,approximate,source:s.references?.flatMap(r=>r.snaks.P854?.map(x=>x.datavalue?.value)||[]).find(url=>/^https?:\/\//.test(url)&&!/(?:wikipedia|wordpress|web.archive)/.test(url))};
  });
  if(dates.length!==1||dates.some(d=>!d.min||!d.max||d.min>d.max||d.max-d.min>80))throw Error('Datierung muss einzeln geklärt werden');
  const d=dates[0];return {date:(d.approximate?'um ':'')+(d.min===d.max?d.min:d.min+'–'+d.max),dateStart:d.min,dateEnd:d.max,...(d.source?{catalogueSource:d.source.replace(/^http:/,'https:')}:{} )};
}
const archive=JSON.parse(await sourceText('kunstarchiv')),media=JSON.parse(await sourceText('kunstbilder')),wiki=JSON.parse(await sourceText('kunst-wikipedia')),titles=JSON.parse(await sourceText('kunst-titel-de')),knowledge=await read(root+'/data/kunst-glossar.json');
const knownIds=new Set(archive.works.map(w=>w.id)),knownImages=new Set(media.images.map(w=>w.imageOriginalURL));
const knownIdentities=new Set(archive.works.map(w=>w.wikidata||w.id));
const additions=[],images=[];
if(process.argv.includes('--inventory')){
 const candidates=await read(cache+'/candidates.json'),rows=[],rejected=[];
 for(const row of candidates){try{
  const e=entities[row.id],makers=val(e,'P170'),maker=entities[makers[0]?.id];
  if(makers.length!==1||claims(e,'P170').some(s=>s.qualifiers?.P5102)||!article(maker)||!(year(val(maker,'P570')[0])<=1955))throw Error('artist');
  const override=plan.overrides?.[row.id],dated=override?.date?override:dating(e),file=pages.get(plan.requestedFiles?.[row.id]||'File:'+val(e,'P18')[0]?.replace(/_/g,' ')),i=file?.imageinfo?.[0];
  if(!i||!/^image\/(jpeg|png|webp)$/.test(i.mime)||!/^(?:Public domain|CC0)$/i.test(i.extmetadata?.LicenseShortName?.value||'')||file.categories?.some(c=>/deletion request|copyright violation|permission pending|in the UK with copyright claims/i.test(c.title)))throw Error('image');
  if(knownImages.has(i.url)||archive.works.some(w=>w.wikidata==='https://www.wikidata.org/wiki/'+row.id||w.artistWikidata==='https://www.wikidata.org/wiki/'+maker.id&&w.title.toLowerCase()===(e.labels.de?.value||e.labels.en?.value||'').toLowerCase()))throw Error('duplicate');
  const materials=val(e,'P186').map(x=>label(x.id));if(!materials.some(x=>/Ölfarbe|Tempera|Pastellkreiden/.test(x))&&!override?.technique)throw Error('medium');
  if(!val(e,'P195').length)throw Error('collection');
  rows.push({...row,title:e.labels.de?.value||e.labels.en?.value||e.labels.fr?.value||e.labels.it?.value,artist:label(maker.id),date:dated.date,styles:val(e,'P135').map(x=>label(x.id)),materials,museum:val(e,'P195').map(x=>label(x.id)).join(' · ')});
 }catch(e){rejected.push({id:row.id,reason:e.message});}}
 await fs.writeFile(cache+'/inventory.json',JSON.stringify({rows,rejected},null,2));
 console.log(JSON.stringify({eligible:rows.length,rejected:rejected.length,inventory:cache+'/inventory.json'}));process.exit(0);
}
const reviewed=[...plan.works,...Object.entries(plan.supplement||{}).flatMap(([style,ids])=>ids.map(id=>[id,plan.supplementTitles?.[id]||entities[id]?.labels?.de?.value||label(id),style]))];
const errors=[];
for(const [qid,titleDe,style,museum]of reviewed){
 try{
  if(knownIds.has('wd-'+qid))continue;
  const e=entities[qid],makers=val(e,'P170'),override=plan.overrides?.[qid]||{};
  // One museum-documented anonymous exception, not a general relaxation of attribution.
  const anonymous=qid==='Q1195610'&&override.artist==='Unbekannter Künstler'&&override.attribution==='unknown'&&override.artistDeath===null&&override.catalogueSource==='https://search.smb.museum/object/obj-865524';
  const verified=override.verifiedArtistId&&override.catalogueSource&&makers.some(m=>m.id===override.verifiedArtistId);
  const maker=entities[verified?override.verifiedArtistId:makers[0]?.id],death=year(val(maker,'P570')[0]);
  if(!e||!anonymous&&((makers.length!==1&&!verified)||claims(e,'P170').some(s=>s.qualifiers?.P5102)||!death||death>1955||!article(maker)))throw Error('Unklare Künstlerangabe '+qid);
  const dated=override.date?{date:override.date,dateStart:override.dateStart,dateEnd:override.dateEnd}:dating(e);
  const materials=override.materialIds||val(e,'P186').map(x=>x.id);
  const technique=override.technique||(materials.includes('Q296955')?(materials.some(x=>['Q897','Q880','Q929186'].includes(x))?'Öl und Metallauflage':materials.some(x=>['Q106857709','Q106857823','Q106857865','Q134621705','Q239788','Q287','Q291034'].includes(x))?'Öl auf Holz':materials.includes('Q12321255')||materials.includes('Q4259259')?'Öl auf Leinwand':materials.some(x=>['Q389782','Q18668582','Q11472'].includes(x))?'Öl auf Papier / Karton':null):materials.includes('Q175166')||materials.includes('Q1321267')?'Tempera':materials.includes('Q189085')?'Pastell':null);
  const file=pages.get(plan.requestedFiles?.[qid]||'File:'+val(e,'P18')[0]?.replace(/_/g,' ')),info=file?.imageinfo?.[0],m=info?.extmetadata;
  if(!info||!/^image\/(jpeg|png|webp)$/.test(info.mime)||!/^(?:Public domain|CC0)$/i.test(m?.LicenseShortName?.value||'')||file.categories?.some(c=>/deletion request|copyright violation|permission pending|in the UK with copyright claims/i.test(c.title)))throw Error('Bildrechte nicht verifiziert '+qid+' '+file?.title);
  if(!knowledge.styles[style]||!knowledge.techniques[technique]||!materials.length||!titleDe?.trim()||!anonymous&&dated.dateEnd>death)throw Error('Ungeklärte Angaben '+qid+' '+technique);
  if(knownImages.has(info.url)||knownIdentities.has('https://www.wikidata.org/wiki/'+qid))throw Error('Doppeltes Werk '+qid);
  const styles=val(e,'P135').map(x=>label(x.id)),documented=styles.includes(style)||plan.styleAliases?.[style]?.some(term=>styles.includes(term));
  const originalStyle=documented?(styles.includes(style)?style:styles.find(term=>plan.styleAliases?.[style]?.includes(term))):style;
  const work={id:'wd-'+qid,title:e.labels.de?.value||e.labels.en?.value||titleDe,artist:label(maker?.id),artistDeath:death,...dated,style,styleOriginal:originalStyle,styleTerms:documented?styles:[style],technique,medium:override.medium||materials.map(label).join(' · '),materialIds:materials,imageId:qid,source:'https://www.wikidata.org/wiki/'+qid,museum:val(e,'P195').map(x=>label(x.id)).join(' · '),metadataProvider:'Wikidata',styleSource:documented?'P135 am Werk; gegebenenfalls deutscher Oberbegriff für die dokumentierte Tradition':'Redaktionelle Einordnung dieses Einzelwerks nach Bildsprache, Datierung und dokumentiertem Werkzusammenhang; kein P135-Befund und keine einzig mögliche Stilzuweisung',rights:'CC0 / Public Domain',publicDomain:true,wikidata:'https://www.wikidata.org/wiki/'+qid,artistWikidata:maker?'https://www.wikidata.org/wiki/'+maker.id:undefined,artForm:'painting',introEligible:true,...override};
  if(museum)work.museum=museum;
  if(anonymous)delete work.artistWikidata;
  delete work.verifiedArtistId;
  if(!work.museum||/^Q\d+$/.test(work.museum)||work.medium.split(' · ').some(s=>/^Q\d+$/.test(s)))throw Error('Unübersetzte Katalogangaben '+qid+' '+work.medium);
  const image={id:work.id,wikidata:work.wikidata,imageURL:info.thumburl||info.url,imageLargeURL:info.thumburl||info.url,imageOriginalURL:info.url,imageSource:info.descriptionurl,imageLicense:m.LicenseShortName.value,imageLicenseURL:m.LicenseUrl?.value||'https://commons.wikimedia.org/wiki/Commons:Reuse_of_PD-Art_photographs',imageCredit:clean(m.Artist?.value)||work.artist,imageWidth:info.width,imageHeight:info.height,imageMime:info.mime,imageBytes:info.size,imageDownloadAllowed:true,downloadRightsChecked:plan.reviewed};
  additions.push(work);images.push(image);knownIds.add(work.id);knownImages.add(info.url);knownIdentities.add(work.wikidata);
  titles.titles[work.id]=titleDe;(titleDe===work.title?titles.retainedTitles:titles.ownTranslations).push(work.id);
  if(!wiki.artists[work.artist])wiki.artists[work.artist]=anonymous?{title:'Unbekannter Künstler',language:'de',unknown:true}:article(maker);
  const entry=article(e);if(entry)wiki.works[work.id]=entry;
 }catch(error){errors.push({id:qid,error:error.message});}
}
if(errors.length){console.log(JSON.stringify({accepted:additions.length,errors},null,2));throw Error('Review rejected entries before generating a patch');}
if(!additions.length){console.log('Reviewed works already present.');process.exit(0);}
if(archive.works.length!==plan.baseline)throw Error('Unexpected baseline');
archive.works.push(...additions);media.images.push(...images);
archive.expansion.addedIds.push(...additions.map(w=>w.id));archive.expansion.added=archive.expansion.addedIds.length;
archive.expansion.reason=plan.expansionReason||'Unterrepräsentierte Techniken, frühe Moderne, Fotografie und plastische Kunst sowie Porträts aus europäischen Sammlungen; alle bisherigen Werkdaten bleiben erhalten.';
archive.checked=media.checked=wiki.checked=titles.checked=plan.reviewed;
const patches=[];
function bounds(text,key){let first=text.indexOf(':',text.indexOf(JSON.stringify(key)))+1;while(/\s/.test(text[first]))first++;let depth=0,quoted=false,escape=false;for(let end=first;end<text.length;end++){const c=text[end];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue;}if(c==='"'){quoted=true;continue;}if(c==='{'||c==='[')depth++;if(c==='}'||c===']')if(--depth===0)return[first,end];}throw Error('Missing '+key);}
function appendProperty(text,key,added){const[first,last]=bounds(text,key),content=text.slice(first,last+1),array=content[0]==='[';const body=(array?added:Object.entries(added)).map(item=>array?JSON.stringify(item,null,2).split('\n').map(line=>'    '+line).join('\n'):'    '+JSON.stringify(item[0])+': '+JSON.stringify(item[1],null,2).split('\n').join('\n    ')).join(',\n');if(!body)return text;const closing=text.lastIndexOf('\n',last),prefix=text.slice(0,closing).trimEnd();return prefix+(content.slice(1,-1).trim()?',':'')+'\n'+body+text.slice(closing);}
const replaceLine=(text,key,value)=>text.replace(new RegExp('^  "'+key+'":.*$','m'),'  '+JSON.stringify(key)+': '+JSON.stringify(value)+',');
for(const[name,json]of [['kunstarchiv',archive],['kunstbilder',media],['kunst-wikipedia',wiki],['kunst-titel-de',titles]]){
 const file=root+'/data/'+name+'.json',temp=cache+'/review-'+name+'.json',original=await sourceText(name),old=JSON.parse(original);let text=original;
 if(name==='kunstarchiv'){text=replaceLine(text,'expansion',json.expansion);text=appendProperty(text,'works',additions);}
 if(name==='kunstbilder')text=appendProperty(text,'images',images);
 for(const key of name==='kunst-wikipedia'?['artists','works']:name==='kunst-titel-de'?['titles']:[])text=appendProperty(text,key,Object.fromEntries(Object.entries(json[key]).filter(([id])=>!Object.hasOwn(old[key],id))));
 if(name==='kunst-titel-de')for(const key of ['ownTranslations','retainedTitles'])text=appendProperty(text,key,json[key].filter(id=>!old[key].includes(id)));
 text=replaceLine(text,'checked',plan.reviewed);if(JSON.stringify(JSON.parse(text))!==JSON.stringify(json))throw Error('Append-only mismatch '+name);
 await fs.writeFile(temp,text);let difference;try{execFileSync('git',['diff','--no-index','--no-ext-diff','--unified=3','--',file,temp],{maxBuffer:12*1024*1024});continue;}catch(e){if(e.status!==1)throw e;difference=e.stdout.toString();}
 const lines=difference.split('\n');patches.push('*** Update File: '+file+'\n'+lines.slice(lines.findIndex(line=>line.startsWith('@@'))).map(line=>line.startsWith('@@')?'@@':line).join('\n').trimEnd());
}
await fs.writeFile(cache+'/extension.patch','*** Begin Patch\n'+patches.join('\n')+'\n*** End Patch\n');
console.log(JSON.stringify({added:additions.length,total:archive.works.length,patch:cache+'/extension.patch'}));

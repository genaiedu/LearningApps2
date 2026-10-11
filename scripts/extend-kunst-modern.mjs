// Reviewed, append-only collection extension. Public JSON metadata only; no AI
// calls or image downloads. Pass the directory containing the reviewed API cache.
// Emits an apply_patch patch for review; never writes the published data itself.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const cache=path.resolve(process.argv[2] || '/private/tmp/kunst-modern-cache');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const plan=await read(root+'/data/kunst-erweiterung-2026.json');
// Only for this unpublished, reviewed extension: regenerate from the immutable
// 1438-work baseline. Existing published records stay byte-for-byte unchanged.
const reviewUnpublished=process.argv.includes('--review-unpublished');
const baseline='86fbe2834de467f1d0094eaf65c56c9bdd26ebb4';
const sourceText=async name=>reviewUnpublished ? execFileSync('git',['show',baseline+':data/'+name+'.json'],{cwd:root,maxBuffer:12*1024*1024}).toString() : fs.readFile(root+'/data/'+name+'.json','utf8');
const archive=JSON.parse(await sourceText('kunstarchiv')), media=JSON.parse(await sourceText('kunstbilder'));
const wiki=JSON.parse(await sourceText('kunst-wikipedia')), titles=JSON.parse(await sourceText('kunst-titel-de'));
if(reviewUnpublished&&archive.works.length!==1438)throw Error('Unexpected extension baseline');
const entities={...(await read(cache+'/modern-entities.json')).entities,...(await read(cache+'/modern-artists.json')).entities,...(await read(cache+'/modern-references.json')).entities};
const commons=(await read(cache+'/modern-commons.json')).query;
const pages=new Map(commons.pages.map(page=>[page.title,page]));
for(const alias of [...commons.normalized||[],...commons.redirects||[]]) if(pages.has(alias.to))pages.set(alias.from,pages.get(alias.to));
const val=(e,p)=>(e?.claims?.[p]||[]).filter(c=>c.rank!=='deprecated').map(c=>c.mainsnak?.datavalue?.value).filter(Boolean);
const label=id=>entities[id]?.labels?.de?.value || entities[id]?.labels?.en?.value || id;
const clean=text=>String(text||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const article=e=>e?.sitelinks?.dewiki ? {title:e.sitelinks.dewiki.title,language:'de'} : e?.sitelinks?.enwiki ? {title:e.sitelinks.enwiki.title,language:'en'} : null;
const additions=[],images=[];
const knownIds=new Set(archive.works.map(work=>work.id)), knownImages=new Set(media.images.map(image=>image.imageOriginalURL));
function append(work,image,titleDe,artistArticle){
 if(knownIds.has(work.id))return;
 if(knownImages.has(image.imageOriginalURL))throw Error('Duplicate image '+work.id);
 if(!titleDe || !work.medium || !work.date || !work.style || !work.source)throw Error('Incomplete '+work.id);
 additions.push(work);images.push(image);knownIds.add(work.id);knownImages.add(image.imageOriginalURL);
 titles.titles[work.id]=titleDe;
 if(titleDe!==work.title)titles.ownTranslations.push(work.id);else titles.retainedTitles.push(work.id);
 if(!wiki.artists[work.artist]){if(!artistArticle)throw Error('Missing artist link '+work.artist);wiki.artists[work.artist]=artistArticle;}
}
function museumImage(work,url,large,source,width,height,bytes){
 return {id:work.id,imageURL:url,imageLargeURL:large,imageOriginalURL:large,imageSource:source,imageLicense:'CC0',imageLicenseURL:'https://creativecommons.org/publicdomain/zero/1.0/',imageCredit:work.museum,imageMime:'image/jpeg',imageDownloadAllowed:true,downloadRightsChecked:plan.reviewed,...(width&&height?{imageWidth:Number(width),imageHeight:Number(height)}:{}),...(bytes?{imageBytes:Number(bytes)}:{})};
}
for(const [qid,titleDe,style] of plan.wikidata){
 const e=entities[qid], maker=entities[val(e,'P170')[0]?.id];
 const dated=e.claims.P571.filter(c=>c.rank!=='deprecated').sort((a,b)=>b.mainsnak.datavalue.value.precision-a.mainsnak.datavalue.value.precision)[0];
 const date=dated?.mainsnak.datavalue.value, death=Number(val(maker,'P570')[0]?.time.slice(1,5));
 const styles=val(e,'P135').map(x=>label(x.id));
 if(!styles.includes(style)||!date||date.precision<9||!Number.isInteger(death)||death>1955)throw Error('Unverified work '+qid);
 const year=Number(dated.qualifiers?.P1319?.[0]?.datavalue?.value?.time.slice(1,5)||date.time.slice(1,5));
 const end=Number(dated.qualifiers?.P1326?.[0]?.datavalue?.value?.time.slice(1,5)||date.time.slice(1,5));
 if(year>death||end>death||end<year)throw Error('Unverified painting date '+qid);
 const materials=val(e,'P186').map(x=>x.id);
 if(!materials.includes('Q296955'))throw Error('Unexpected painting medium '+qid);
 const technique=materials.some(x=>['Q219803','Q106857709','Q287','Q40088'].includes(x))?'Öl auf Holz':'Öl auf Leinwand';
 const file=pages.get('File:'+val(e,'P18')[0]),info=file?.imageinfo?.[0],metadata=info?.extmetadata;
 if(!info?.thumburl||!/public domain|cc0/i.test(metadata?.LicenseShortName?.value||'')||file.categories?.some(c=>/deletion|copyright violation|permission pending/i.test(c.title)))throw Error('Unverified image '+qid);
 const work={id:'wd-'+qid,title:e.labels.de?.value||e.labels.en?.value,artist:label(maker.id),artistDeath:death,date:year===end?String(year):year+'–'+end,dateStart:year,dateEnd:end,style,styleOriginal:style,styleTerms:styles,technique,medium:materials.map(label).join(' · '),materialIds:materials,imageId:qid,source:'https://www.wikidata.org/wiki/'+qid,museum:val(e,'P195').map(x=>label(x.id)).join(' · '),metadataProvider:'Wikidata',styleSource:'P135 am Werk, nicht vom Künstler abgeleitet',rights:'CC0 / Public Domain',publicDomain:true,wikidata:'https://www.wikidata.org/wiki/'+qid,artistWikidata:'https://www.wikidata.org/wiki/'+maker.id,artForm:'painting',introEligible:true};
 const image={id:work.id,wikidata:work.wikidata,imageURL:info.thumburl,imageLargeURL:info.thumburl,imageOriginalURL:info.url,imageSource:info.descriptionurl,imageLicense:metadata.LicenseShortName.value,imageCredit:clean(metadata.Artist?.value)||work.artist,imageLicenseURL:'https://commons.wikimedia.org/wiki/Commons:Reuse_of_PD-Art_photographs',imageWidth:info.width,imageHeight:info.height,imageMime:info.mime,imageBytes:info.size,imageDownloadAllowed:true,downloadRightsChecked:plan.reviewed};
 append(work,image,titleDe,article(maker));
 const entry=article(e);if(entry)wiki.works[work.id]=entry;
}
const aic=await read(cache+'/selected-aic.json');
const commonsCandidates={};
for(const file of ['aic-commons-candidates','aic-commons-title'])for(const [id,entry] of Object.entries(await read(cache+'/'+file+'.json')))(commonsCandidates[id]||=[]).push(...entry.pages);
const artists={ 'Vasily Kandinsky':['Wassily Kandinsky',1944], 'Piet Mondrian':['Piet Mondrian',1944], 'Alfred Stieglitz':['Alfred Stieglitz',1946], 'Lewis Wickes Hine':['Lewis Hine',1940], 'Jean-Eugène-Auguste Atget':['Eugène Atget',1927], 'Antonio Canova':['Antonio Canova',1822], 'Auguste Rodin':['Auguste Rodin',1917] };
const styleEnglish={Moderne:'Modernism','Der Blaue Reiter':'Blaue Reiter',Expressionismus:'Expressionism',Klassizismus:'Neoclassicism',Postimpressionismus:'Post-Impressionism',Piktorialismus:'Pictorialism'};
for(const [id,titleDe,style,technique,artForm,date] of plan.aic){
 const o=aic.data.find(work=>work.id===id),maker=artists[o?.artist_title];
 if(!o?.is_public_domain||!o.image_id||!maker||!o.artist_display.includes(String(maker[1])))throw Error('Unverified AIC '+id);
 if((artForm==='sculpture')!==(o.artwork_type_title==='Sculpture'))throw Error('Unexpected object type '+id);
 const documented=o.style_titles.includes(styleEnglish[style]);
 const work={id:'aic-'+id,title:o.title,artist:maker[0],artistDeath:maker[1],date,dateOriginal:o.date_display,dateStart:o.date_start,dateEnd:o.date_end,style,styleOriginal:documented?styleEnglish[style]:style,styleTerms:documented?o.style_titles:[style],technique,medium:o.medium_display,imageId:o.image_id,source:'https://www.artic.edu/artworks/'+id,museum:'Art Institute of Chicago',metadataProvider:'Art Institute of Chicago',styleSource:documented?'Stilbegriff am einzelnen Werk im Museumskatalog':'Redaktionelle Einordnung nach Werkform, Museumsbeschreibung und historischem Zusammenhang; kein automatischer Stilbefund',rights:'CC0 / Public Domain',publicDomain:true,artForm,introEligible:artForm!=='sculpture'};
 // Chicago's image gateway rejects embedding in some browsers. These are
 // reviewed Commons reproductions of the same inventory object, not another
 // museum's print or cast. A sculpture needs an explicit photograph licence.
 const page=commonsCandidates[id]?.find(p=>p.title===plan.aicCommons[id]),info=page?.imageinfo?.[0],m=info?.extmetadata;
 if(!info?.thumburl||!/public domain|cc0/i.test(m?.LicenseShortName?.value||'')||
   (artForm==='sculpture'&&!/\{\{(?:cc-zero|cc0)\}\}/i.test(page.revisions?.[0]?.slots?.main?.content||'')))throw Error('Unverified same-object Commons image '+id);
 const mime=info.mime||(/\.jpe?g$/i.test(new URL(info.url).pathname)?'image/jpeg':null);
 if(!mime)throw Error('Unknown image format '+id);
 const image={id:work.id,imageURL:info.thumburl,imageLargeURL:info.responsiveUrls?.['2']||info.thumburl,imageOriginalURL:info.url,imageSource:info.descriptionurl,imageLicense:m.LicenseShortName.value,imageLicenseURL:m.LicenseUrl?.value||'https://commons.wikimedia.org/wiki/Commons:Reuse_of_PD-Art_photographs',imageCredit:clean(m.Artist?.value)||work.artist,imageMime:mime,imageWidth:info.width,imageHeight:info.height,imageBytes:info.size,imageDownloadAllowed:true,downloadRightsChecked:plan.reviewed};
 append(work,image,titleDe,{title:maker[0],language:'de'});
}
const cma=[];
for(const group of ['Egypt','Achaemenid','Assyrian','Sumerian','Greek','Roman','Rodin','Stieglitz','Atget','Käsebier','Demachy','Clarence H. White','Frederick H. Evans'])cma.push(...(await read(cache+'/cma-'+group+'.json')).data);
for(const [id,titleDe,style,technique,artForm,date] of plan.clevelandNamed){
 const o=cma.find(work=>work.id===id),maker=o?.creators?.[0];
 if(o?.share_license_status!=='CC0'||!o.images?.web?.url||o.creators.length!==1||!maker.death_year||Number(maker.death_year)>1955||
   (artForm==='sculpture'?o.type!=='Sculpture':o.type!=='Photograph'))throw Error('Unverified named Cleveland work '+id);
 const artist=maker.description.replace(/\s*\(.+$/,'');
 const work={id:'cma-'+o.accession_number,title:o.title,artist,artistDeath:Number(maker.death_year),date,dateOriginal:o.creation_date,dateStart:o.creation_date_earliest,dateEnd:o.creation_date_latest,style,styleOriginal:style,styleTerms:[style],technique,medium:o.technique,imageId:String(id),source:o.url.replace('https://clevelandart.org','https://www.clevelandart.org'),museum:'Cleveland Museum of Art',metadataProvider:'Cleveland Museum of Art',styleSource:'Redaktionelle Einordnung nach Werkform, Museumsbeschreibung und historischem Zusammenhang; kein automatischer Stilbefund',rights:'CC0 / Public Domain',publicDomain:true,artForm,introEligible:artForm==='photograph',...(o.external_resources.wikidata?.[0]?{wikidata:o.external_resources.wikidata[0]}:{})};
 append(work,museumImage(work,o.images.web.url,o.images.print.url,work.source,o.images.print.width,o.images.print.height,o.images.print.filesize),titleDe,{title:artist,language:artist==='Clarence H. White'?'en':'de'});
}
for(const [id,titleDe,style,technique,artForm,date] of plan.cleveland){
 const o=cma.find(work=>work.id===id);
 if(o?.share_license_status!=='CC0'||o.type!=='Sculpture'||!o.images?.web?.url||o.creators.length||o.creation_date_latest>600)throw Error('Unverified ancient work '+id);
 const work={id:'cma-'+o.accession_number,title:o.title,artist:'Unbekannter Künstler',artistDeath:null,attribution:'unknown',rightsBasis:'Ancient work; museum Open Access',date,dateOriginal:o.creation_date,dateStart:o.creation_date_earliest,dateEnd:o.creation_date_latest,style,styleOriginal:o.culture.join('; '),styleTerms:o.culture,technique,medium:o.technique,imageId:String(id),source:o.url.replace('https://clevelandart.org','https://www.clevelandart.org'),museum:'Cleveland Museum of Art',metadataProvider:'Cleveland Museum of Art',styleSource:'Redaktionell übersetzte kulturelle beziehungsweise zeitliche Tradition aus dem Museumskatalog; kein aus einem Künstlernamen abgeleiteter Stil',rights:'CC0 / Public Domain',publicDomain:true,artForm,introEligible:false,...(o.external_resources.wikidata?.[0]?{wikidata:o.external_resources.wikidata[0]}:{})};
 const image=museumImage(work,o.images.web.url,o.images.print.url,work.source,o.images.print.width,o.images.print.height,o.images.print.filesize);
 append(work,image,titleDe,{title:'Unbekannter Künstler',language:'de',unknown:true});
}
for(const [id,titleDe,style,technique,artForm,date] of plan.met){
 const o=await read(cache+'/met-'+id+'.json');
 if(!o.isPublicDomain||!o.primaryImage||o.classification!=='Sculpture'||o.artistDisplayName!=='Antonio Canova'||o.artistEndDate!=='1822')throw Error('Unverified Met '+id);
 const work={id:'met-'+id,title:o.title,artist:o.artistDisplayName,artistDeath:Number(o.artistEndDate),date,dateOriginal:o.objectDate,dateStart:o.objectBeginDate,dateEnd:o.objectEndDate,style,styleOriginal:style,styleTerms:[style],technique,medium:o.medium,imageId:String(id),source:o.objectURL,museum:'Metropolitan Museum of Art',metadataProvider:'Metropolitan Museum of Art',styleSource:'Redaktionelle Einordnung nach der antiken Bezugnahme, Werkbeschreibung und Canovas klassizistischer Formensprache',rights:'CC0 / Public Domain',publicDomain:true,artForm,introEligible:false,wikidata:o.objectWikidata_URL,artistWikidata:o.artistWikidata_URL};
 append(work,museumImage(work,o.primaryImageSmall,o.primaryImage,work.source),titleDe,{title:'Antonio Canova',language:'de'});
}
if(!additions.length){console.log('All reviewed extension works are already present; no patch needed.');process.exit(0);}
Object.assign(wiki.styles,{
 'Neue Sachlichkeit':{title:'Neue Sachlichkeit',language:'de'},Konstruktivismus:{title:'Konstruktivismus',language:'de'},Neoplastizismus:{title:'Neoplastizismus',language:'de'},Piktorialismus:{title:'Piktorialismus',language:'de'},'Dokumentarfotografie':{title:'Dokumentarfotografie',language:'de'},'Moderne Fotografie':{title:'Fotografie',language:'de'},'Moderne Skulptur':{title:'Skulptur',language:'de'},'Altägyptische Kunst':{title:'Altägyptische Kunst',language:'de'},'Amarna-Kunst':{title:'Amarna',language:'de'},'Achämenidische Kunst':{title:'Achämenidenreich',language:'de'},'Neuassyrische Kunst':{title:'Mesopotamische Kunst',language:'de'},'Sumerische Kunst':{title:'Mesopotamische Kunst',language:'de'},'Griechische Archaik':{title:'Archaik',language:'de'},'Griechische geometrische Kunst':{title:'Geometrischer Stil',language:'de'},'Römische Kunst':{title:'Römische Kunst',language:'de'}
});
archive.works.push(...additions);media.images.push(...images);
archive.expansion.addedIds.push(...additions.map(work=>work.id));archive.expansion.added=archive.expansion.addedIds.length;
archive.expansion.reason='Unterrepräsentierte Techniken, frühe Moderne, Fotografie und plastische Kunst; alle bisherigen Werkdaten bleiben erhalten.';
archive.checked=media.checked=wiki.checked=titles.checked=plan.reviewed;
archive.selection='Dokumentierte Einzelwerke mit eindeutigem Künstler beziehungsweise ausdrücklich unbekannter Urheberschaft, Datierung, Stil oder kultureller Tradition und Material / Technik. Skulpturen und Reliefs sind vom Vorspann ausgeschlossen. Rechte am Werk und an der konkreten Abbildung wurden getrennt geprüft.';
archive.source.push('https://www.clevelandart.org/open-access','https://www.metmuseum.org/policies/image-resources');
media.matching='Museum object IDs and Wikidata artwork identities. Individually verified Commons Public Domain images and museum Open Access images (CC0), including separately licensed photographs of sculpture.';
const patches=[];
function bounds(text,key){
 const start=text.indexOf(':',text.indexOf(JSON.stringify(key)))+1;
 let first=start;while(/\s/.test(text[first]))first++;
 let depth=0,quoted=false,escape=false;
 for(let end=first;end<text.length;end++){
  const char=text[end];
  if(quoted){if(escape)escape=false;else if(char==='\\')escape=true;else if(char==='"')quoted=false;continue;}
  if(char==='"'){quoted=true;continue;}
  if(char==='{'||char==='[')depth++;
  if(char==='}'||char===']'){if(--depth===0)return [first,end];}
 }
 throw Error('Missing structured property '+key);
}
function appendProperty(text,key,added){
 const [first,last]=bounds(text,key),content=text.slice(first,last+1),array=content[0]==='[';
 const body=(array?added:Object.entries(added)).map(item=>array?JSON.stringify(item,null,2).split('\n').map(line=>'    '+line).join('\n'):'    '+JSON.stringify(item[0])+': '+JSON.stringify(item[1],null,2).split('\n').join('\n    ')).join(',\n');
 if(!body)return text;
 const closing=text.lastIndexOf('\n',last),prefix=text.slice(0,closing).trimEnd();
 return prefix+(content.slice(1,-1).trim()?',':'')+'\n'+body+text.slice(closing);
}
function replaceLine(text,key,value){return text.replace(new RegExp('^  "'+key+'":.*$','m'),'  '+JSON.stringify(key)+': '+JSON.stringify(value)+',');}
for(const [name,json] of [['kunstarchiv',archive],['kunstbilder',media],['kunst-wikipedia',wiki],['kunst-titel-de',titles]]){
 const file=root+'/data/'+name+'.json',temp=cache+'/review-'+name+'.json';
 const original=await sourceText(name),old=JSON.parse(original);let text=original;
 if(name==='kunstarchiv'){text=replaceLine(text,'expansion',json.expansion);text=replaceLine(text,'selection',json.selection);text=appendProperty(text,'source',json.source.filter(url=>!old.source.includes(url)));text=appendProperty(text,'works',additions);}
 if(name==='kunstbilder'){text=replaceLine(text,'matching',json.matching);text=appendProperty(text,'images',images);}
 for(const key of name==='kunst-wikipedia'?['artists','styles','works']:name==='kunst-titel-de'?['titles']:[]){text=appendProperty(text,key,Object.fromEntries(Object.entries(json[key]).filter(([id])=>!Object.hasOwn(old[key],id))));}
 if(name==='kunst-titel-de')for(const key of ['ownTranslations','retainedTitles'])text=appendProperty(text,key,json[key].filter(id=>!old[key].includes(id)));
 text=replaceLine(text,'checked',plan.reviewed);
 if(JSON.stringify(JSON.parse(text))!==JSON.stringify(json))throw Error('Append-only patch mismatch '+name);
 await fs.writeFile(temp,text);
 let difference;try{execFileSync('diff',['-U','3',file,temp],{maxBuffer:8*1024*1024});continue;}catch(e){if(e.status!==1)throw e;difference=e.stdout.toString();}
 patches.push('*** Update File: '+file+'\n'+difference.split('\n').slice(2).map(line=>line.startsWith('@@')?'@@':line).join('\n').trimEnd());
}
await fs.writeFile(cache+'/extension.patch','*** Begin Patch\n'+patches.join('\n')+'\n*** End Patch\n');
console.log(JSON.stringify({added:additions.length,total:archive.works.length,forms:Object.fromEntries([...new Set(additions.map(w=>w.artForm))].map(form=>[form,additions.filter(w=>w.artForm===form).length])),patch:cache+'/extension.patch'}));

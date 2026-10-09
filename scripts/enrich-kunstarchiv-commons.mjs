// Match the museum's stable artwork identifier to Wikidata and Commons.
// Only JSON metadata is fetched. Images are never downloaded or stored.
import {readFileSync} from 'node:fs';
const file = new URL('../data/kunstarchiv.json',import.meta.url).pathname;
const old = readFileSync(file,'utf8'), archive = JSON.parse(old);
const ids = archive.works.map(work => '"'+work.id.slice(4)+'"').join(' ');
const query = `SELECT ?id ?item ?image WHERE { VALUES ?id { ${ids} } ?item wdt:P4610 ?id; wdt:P18 ?image. }`;
const url = new URL('https://query.wikidata.org/sparql'); url.search = new URLSearchParams({query,format:'json'});
const response = await fetch(url,{headers:{Accept:'application/sparql-results+json','User-Agent':'LearningApps-Kunsttresor/1.0 (educational, metadata-only)'}});
if (!response.ok) throw Error('Wikidata HTTP '+response.status);
const rows = (await response.json()).results.bindings;
const matches = new Map();
for (const row of rows) {
  const title = 'File:'+decodeURIComponent(row.image.value.split('/').at(-1)).replace(/_/g,' ');
  if (!matches.has(row.id.value)) matches.set(row.id.value,{title,wikidata:row.item.value});
}
console.error('Wikidata matches:',matches.size);
const titles = [...matches.values()].map(match => match.title), info = new Map();
const plain = value => String(value||'').replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();
for(let offset=0;offset<titles.length;offset+=40) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({action:'query',format:'json',formatversion:'2',titles:titles.slice(offset,offset+40).join('|'),prop:'imageinfo|categories',cllimit:'max',iiprop:'url|extmetadata',iiurlwidth:'960'});
  const result = await fetch(api,{headers:{'User-Agent':'LearningApps-Kunsttresor/1.0 (educational, metadata-only)'}});
  if(!result.ok) throw Error('Commons HTTP '+result.status);
  const data = await result.json();
  for(const page of data.query?.pages||[]) {
    const image = page.imageinfo?.[0], meta = image?.extmetadata;
    const license = plain(meta?.LicenseShortName?.value);
    if(!image || !license || !/public domain|cc0|cc-zero/i.test(license)) continue;
    if(page.categories?.some(cat=>/deletion|copyright violation|permission pending/i.test(cat.title))) continue;
    if(!image.thumburl || !['upload.wikimedia.org','thumb.wikimedia.org'].includes(new URL(image.thumburl).hostname)) continue;
    const imageURL = new URL(image.thumburl); imageURL.search = '';
    info.set(page.title,{imageURL:imageURL.href,imageSource:image.descriptionurl,imageLicense:license,imageCredit:plain(meta?.Artist?.value)||'Reproduktion des historischen Kunstwerks',imageLicenseURL:meta?.LicenseUrl?.value||'https://commons.wikimedia.org/wiki/Commons:Reuse_of_PD-Art_photographs'});
  }
  console.error('Commons metadata:',offset+Math.min(40,titles.length-offset));
}
const images = archive.works.flatMap(work => {
  const match = matches.get(work.id.slice(4));
  const image = match && info.get(match.title);
  return image ? [{id:work.id,...image,wikidata:match.wikidata}] : [];
});
if(images.length<150) throw Error('Too few verified Commons images: '+images.length);
console.error('Verified Commons pool:',images.length);
const content = JSON.stringify({checked:'2026-10-09',matching:'Wikidata ARTIC artwork ID (P4610) and Commons image (P18); verified Public Domain / CC0 image metadata.',images});
console.log('*** Begin Patch\n*** Add File: '+new URL('../data/kunstbilder.json',import.meta.url).pathname+'\n+'+content+'\n*** End Patch');

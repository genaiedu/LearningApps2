// Refresh exact Commons image URLs and free licenses; no image is downloaded.
import {readFileSync} from 'node:fs';
const file = new URL('../data/kunstbilder.json',import.meta.url).pathname;
const old = readFileSync(file,'utf8'), data = JSON.parse(old);
const titleOf = image => decodeURIComponent(new URL(image.imageSource).pathname.slice('/wiki/'.length)).replace(/_/g,' ');
const titles = [...new Set(data.images.map(titleOf))], info = new Map();
const plain = value => String(value||'').replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();
const safe = value => { try { const url=new URL(value); return url.protocol==='https:' && ['upload.wikimedia.org','thumb.wikimedia.org'].includes(url.hostname); } catch { return false; } };
for (let offset=0;offset<titles.length;offset+=40) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({action:'query',format:'json',formatversion:'2',redirects:'1',titles:titles.slice(offset,offset+40).join('|'),prop:'imageinfo|categories',cllimit:'max',iiprop:'url|extmetadata|mime|size',iiurlwidth:'1920'});
  const response=await fetch(url,{headers:{'User-Agent':'LearningApps-Kunsttresor/1.0 (educational, metadata-only)'}});
  if (!response.ok) throw Error('Commons HTTP '+response.status);
  const result=await response.json(), aliases=new Map((result.query?.redirects||[]).map(link=>[link.from,link.to]));
  for (const page of result.query?.pages||[]) {
    const image=page.imageinfo?.[0], license=plain(image?.extmetadata?.LicenseShortName?.value);
    if (!image || !/public domain|cc0|cc-zero/i.test(license) || page.categories?.some(cat=>/deletion|copyright violation|permission pending/i.test(cat.title))) continue;
    if (!safe(image.url) || !safe(image.thumburl||image.url)) continue;
    const large=new URL(image.thumburl||image.url); large.search='';
    const record={imageLargeURL:large.href,imageOriginalURL:image.url,imageMime:image.mime,imageBytes:image.size,imageLicense:license,imageDownloadAllowed:true,downloadRightsChecked:'2026-10-09'};
    info.set(page.title,record);
    for (const [from,to] of aliases) if (to===page.title) info.set(from,record);
  }
  console.error('Download licenses checked:',Math.min(offset+40,titles.length),'/',titles.length);
  await new Promise(resolve=>setTimeout(resolve,1050));
}
const images=data.images.map(image=>({...image,...(info.get(titleOf(image))||{imageDownloadAllowed:false})}));
console.error('Licensed image downloads:',images.filter(image=>image.imageDownloadAllowed).length);
const next=JSON.stringify({...data,images});
console.log('*** Begin Patch\n*** Update File: '+file+'\n@@\n'+old.trimEnd().split('\n').map(line=>'-'+line).join('\n')+'\n+'+next+'\n*** End Patch');

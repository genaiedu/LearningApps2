// Canonical article titles from Wikidata; no article text or image download.
import {readFileSync,existsSync} from 'node:fs';
const archive = JSON.parse(readFileSync(new URL('../data/kunstarchiv.json',import.meta.url),'utf8'));
const outputFile = new URL('../data/kunst-wikipedia.json',import.meta.url).pathname;
const previous = existsSync(outputFile) ? readFileSync(outputFile,'utf8') : null;
const old = previous ? JSON.parse(previous) : {artists:{},works:{}};
const candidates = archive.works.filter(work=>!old.artists[work.artist] || !old.works[work.id]), rows=[];
for (let offset=0;offset<candidates.length;offset+=150) {
const ids = candidates.slice(offset,offset+150).map(work => '"'+work.id.slice(4)+'"').join(' ');
const query = `SELECT ?id ?de ?en ?workDE ?workEN WHERE {
 VALUES ?id { ${ids} } ?item wdt:P4610 ?id.
 OPTIONAL { ?item wdt:P170 ?artist. OPTIONAL { ?de schema:about ?artist; schema:isPartOf <https://de.wikipedia.org/>. } OPTIONAL { ?en schema:about ?artist; schema:isPartOf <https://en.wikipedia.org/>. } }
 OPTIONAL { ?workDE schema:about ?item; schema:isPartOf <https://de.wikipedia.org/>. }
 OPTIONAL { ?workEN schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>. }
}`;
const url = new URL('https://query.wikidata.org/sparql'); url.search = new URLSearchParams({query,format:'json'});
const response = await fetch(url,{headers:{Accept:'application/sparql-results+json','User-Agent':'LearningApps-Kunsttresor/1.0 (educational, metadata-only)'}});
if(!response.ok) throw Error('Wikidata HTTP '+response.status);
rows.push(...(await response.json()).results.bindings);
await new Promise(resolve=>setTimeout(resolve,1050));
}
function article(de,en) {
  const value = de?.value || en?.value; if(!value) return null;
  const url = new URL(value); return {title:decodeURIComponent(url.pathname.slice(6)).replace(/_/g,' '),language:url.hostname.startsWith('de.')?'de':'en'};
}
const artists = {...old.artists}, works = {...old.works};
for(const row of rows) {
  const work = archive.works.find(work => work.id === 'aic-'+row.id.value);
  const artistArticle = article(row.de,row.en), workArticle = article(row.workDE,row.workEN);
  if(artistArticle) artists[work.artist] = artistArticle;
  if(workArticle) works[work.id] = workArticle;
}
console.error('Canonical artist articles:',Object.keys(artists).length,'; artwork articles:',Object.keys(works).length);
console.log('*** Begin Patch\n*** '+(previous?'Update':'Add')+' File: '+outputFile+'\n'+(previous?'@@\n'+previous.trimEnd().split('\n').map(line=>'-'+line).join('\n')+'\n':'')+'+'+JSON.stringify({checked:'2026-10-09',source:'https://www.wikidata.org/',artists,works})+'\n*** End Patch');

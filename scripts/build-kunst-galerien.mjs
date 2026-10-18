// Generate portable gallery-only imports, without invented game/history records.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'data',name+'.json'),'utf8'));
const core=require('./kunsttresor-core.js'),curator=require('./kunst-kurator.js'),gallery=require('./kunsttresor-gallery.js'),save=require('./kunsttresor-save.js'),progress=require('./kunsttresor-progress.js'),history=require('./kunsttresor-history.js');
const archive=read('kunstarchiv'),media=read('kunstbilder'),wiki=read('kunst-wikipedia'),titles=read('kunst-titel-de'),landmarks=new Set(read('kunst-hauptwerke').works.map(w=>w.id));
const images=new Map(media.images.map(w=>[w.id,w]));
const pool=archive.works.map(w=>({...w,...images.get(w.id),titleDe:titles.titles[w.id],artistIdentity:wiki.artists[w.artist].language+':'+wiki.artists[w.artist].title}));
const impressionists=new Set(['Claude Monet','Edgar Degas','Édouard Manet','Pierre-Auguste Renoir','Berthe Morisot','Mary Cassatt','Camille Pissarro','Alfred Sisley','Gustave Caillebotte','Frédéric Bazille','Eva Gonzalès','Marie Bracquemond','Eugène Louis Boudin','Jean Baptiste Armand Guillaumin'].map(curator.artistKey));
const modernStyles=new Set(['Moderne','Expressionismus','Kubismus','Fauvismus','Surrealismus','Der Blaue Reiter','Neue Sachlichkeit','Konstruktivismus','Jugendstil']);
function select(filter) {
  const groups=new Map();
  const candidates=pool.filter(w=>filter(w)&&!['sculpture','relief','photograph'].includes(w.artForm)&&/Öl|Pastell|Aquarell|Gouache|Tempera/i.test(w.technique));
  candidates.sort((a,b)=>Number(landmarks.has(b.id))-Number(landmarks.has(a.id))||a.id.localeCompare(b.id));
  for(const w of candidates){const key=curator.artistKey(w.artist);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(w);}
  const buckets=[...groups].sort((a,b)=>a[0].localeCompare(b[0])).map(([,works])=>works),selected=[];
  while(selected.length<80&&buckets.some(bucket=>bucket.length))for(const bucket of buckets)if(bucket.length&&selected.length<80)selected.push(bucket.shift());
  if(selected.length!==80)throw Error('Not enough suitable works');
  return selected;
}
const destination=path.resolve(process.argv[2]||path.join(root,'..','output','Kunsttresor'));
fs.mkdirSync(destination,{recursive:true});
const result=[];
for(const [slug,name,motto,filter] of [
  ['impressionismus','Impressionisten','Licht, Farbe und der flüchtige Augenblick.',w=>w.style==='Impressionismus'&&impressionists.has(curator.artistKey(w.artist))],
  ['moderne','Klassische Moderne','Neue Formen. Neue Farben. Neue Blicke.',w=>modernStyles.has(w.style)]
]) {
  const works=select(filter),at=Date.now();
  const collection={...gallery.fresh(),liked:works.map(w=>({id:w.id,source:'curated',at})),film:{name,motto,items:works.slice(0,10).map(w=>gallery.item(w.id))}};
  const payload={app:save.APP,version:save.VERSION,kind:'gallery',savedAt:at,gallery:collection};
  const content=await save.encode(payload),checked=save.validate(await save.decode(content),pool,archive.replacements||[],core,progress,history,gallery);
  if(!checked.galleryOnly||checked.gallery.liked.length!==80||!gallery.validateFilm(checked.gallery))throw Error('Invalid gallery export');
  const filename='kunsttresor-galerie-'+slug+'.json',file=path.join(destination,filename);
  fs.writeFileSync(file,content+'\n');
  result.push({name,file,filename,works:works.length,artists:new Set(works.map(w=>curator.artistKey(w.artist))).size,filmWorks:10});
}
console.log(JSON.stringify(result,null,2));

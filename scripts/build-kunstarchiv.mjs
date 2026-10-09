// Rebuild with: node scripts/build-kunstarchiv.mjs > /tmp/kunstarchiv.patch
// Outputs an apply_patch document. Fetches metadata only; never images.
const root = new URL('../', import.meta.url).pathname;
const styleMap = {
  Renaissance: 'Renaissance', Baroque: 'Barock', Rococo: 'Rokoko',
  Neoclassicism: 'Klassizismus', Romanticism: 'Romantik', Realism: 'Realismus',
  Impressionism: 'Impressionismus', 'Post-Impressionism': 'Postimpressionismus',
  Pointillism: 'Pointillismus', Symbolism: 'Symbolismus', Expressionism: 'Expressionismus',
  Cubism: 'Kubismus', 'Art Nouveau': 'Jugendstil', Fauvism: 'Fauvismus',
  Mannerism: 'Manierismus', Surrealism: 'Surrealismus',
  romantic: 'Romantik', 'Barbizon School': 'Schule von Barbizon',
  Modernism: 'Moderne', Pictorialism: 'Piktorialismus',
  Aestheticism: 'Ästhetizismus', 'Aesthetic Movement': 'Ästhetizismus',
  'Arts and Crafts Movement': 'Arts and Crafts',
};
function technique(medium) {
  const s = medium.toLowerCase();
  if (/oil/.test(s) && /canvas/.test(s)) return 'Öl auf Leinwand';
  if (/oil/.test(s) && /panel|wood/.test(s)) return 'Öl auf Holz';
  if (/oil/.test(s) && /board|paper/.test(s)) return 'Öl auf Papier / Karton';
  if (/tempera/.test(s) && !/oil/.test(s)) return 'Tempera';
  if (/pastel/.test(s) && !/watercolor|oil/.test(s)) return 'Pastell';
  if (/watercolor/.test(s) && !/oil|pastel/.test(s)) return 'Aquarell';
  if (/etching/.test(s) && /aquatint/.test(s)) return 'Radierung mit Aquatinta';
  if (/etching/.test(s) && !/engraving|lithograph|woodcut/.test(s)) return 'Radierung';
  if (/engraving/.test(s) && !/etching|wood|lithograph/.test(s)) return 'Kupferstich';
  if (/woodcut|woodblock/.test(s)) return 'Holzschnitt';
  if (/lithograph/.test(s) && !/etching|woodcut/.test(s)) return 'Lithografie';
  if (/drypoint/.test(s) && !/etching|engraving/.test(s)) return 'Kaltnadelradierung';
  if (/pen.*ink|brush.*ink/.test(s) && !/watercolor/.test(s)) return 'Tuschezeichnung';
  if (/graphite/.test(s) && !/watercolor|pastel|ink/.test(s)) return 'Graphitzeichnung';
  if (/chalk/.test(s) && !/watercolor|pastel|ink/.test(s)) return 'Kreidezeichnung';
  if (/photogravure/.test(s)) return 'Fotogravüre';
  if (/gelatin silver/.test(s)) return 'Silbergelatineabzug';
  if (/platinum|platinotype/.test(s)) return 'Platindruck';
  if (/gum bichromate/.test(s)) return 'Gummidruck';
  return null;
}
const {readFileSync,existsSync} = await import('node:fs');
const file = root+'data/kunstarchiv.json';
const old = existsSync(file) ? readFileSync(file,'utf8') : null;
// Preserve previously published facts and IDs so saved rounds remain valid.
const records = new Map((old ? JSON.parse(old).works : []).map(work => [Number(work.id.slice(4)),work]));
const fields = ['id','title','artist_title','artist_display','date_display','date_start','date_end','style_title','style_titles','medium_display','image_id','is_public_domain'];
for (const [style, translated] of Object.entries(styleMap)) {
 let total = Infinity, accepted = 0;
 for (let page=1;page<=6 && (page-1)*100<total;page++) {
  const params = {query:{bool:{filter:[{term:{is_public_domain:true}},{term:{'style_titles.keyword':style}},{exists:{field:'image_id'}}]}},page,limit:100,fields};
  const url = 'https://api.artic.edu/api/v1/artworks/search?params='+encodeURIComponent(JSON.stringify(params));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${style}: HTTP ${response.status}`);
  const json = await response.json();
  total = json.pagination.total;
  for (const art of json.data) {
    const artist = art.artist_title?.trim();
    const death = art.artist_display?.match(/(?:\b\d{4})\s*[–—-]\s*(\d{4})\b/)?.[1];
    const tech = technique(art.medium_display || '');
    if (!artist || !death || Number(death)>1955 || !tech || !art.date_display || !art.image_id || !art.is_public_domain) continue;
    if (/unknown|workshop|school of|circle of|after |attributed|follower|anonymous|unidentified/i.test(art.artist_display)) continue;
    if (Number(art.date_end)>1955 || Number(art.date_start)<1350) continue;
    const styleOriginal = styleMap[art.style_title] ? art.style_title : style;
    if (!records.has(art.id)) records.set(art.id, {id:'aic-'+art.id,title:art.title,artist,artistDeath:Number(death),date:art.date_display.replace(/c\./g,'ca.').replace(/about /g,'um ').replace(/, border added/g,', Rahmen ergänzt'),style:styleMap[styleOriginal],technique:tech,medium:art.medium_display,styleOriginal,styleTerms:art.style_titles,imageId:art.image_id,source:`https://www.artic.edu/artworks/${art.id}`,museum:'Art Institute of Chicago',rights:'CC0 / Public Domain',publicDomain:true});
    accepted++;
  }
  await new Promise(resolve=>setTimeout(resolve,1050));
 }
 process.stderr.write(`${style}: ${accepted} / ${total}\n`);
}
const pool = [...records.values()];
if (pool.length<160) throw new Error(`Pool too small: ${pool.length}`);
const dataset = {version:1,checked:'2026-10-09',source:'https://api.artic.edu/docs/',license:'https://creativecommons.org/publicdomain/zero/1.0/',selection:'Nur als gemeinfrei markierte Museumsabbildungen mit benanntem Künstler (Tod bis 1955), dokumentierter Datierung, Stilzuordnung und Technik. Deutsche Stil- und Technikbegriffe sind vereinfachte Übersetzungen; die Originalangaben bleiben gespeichert.',works:pool};
const counts = {};
for(const art of pool) counts[art.technique]=(counts[art.technique]||0)+1;
process.stderr.write(JSON.stringify({total:pool.length,techniques:counts})+'\n');
const content = JSON.stringify(dataset)+'\n';
const lines = old ? old.trimEnd().split('\n').map(line=>'-'+line).join('\n')+'\n' : '';
console.log('*** Begin Patch\n*** '+(old?'Update':'Add')+' File: '+file+'\n'+(old?'@@\n':'')+lines+'+'+content.trimEnd()+'\n*** End Patch');

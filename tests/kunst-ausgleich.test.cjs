const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),vm=require('node:vm');
const archive=require('../data/kunstarchiv.json'),media=require('../data/kunstbilder.json'),titles=require('../data/kunst-titel-de.json'),wiki=require('../data/kunst-wikipedia.json'),plan=require('../data/kunst-ausgleich-2026.json'),knowledge=require('../data/kunst-glossar.json'),film=require('../data/kunst-filmtexte.json');
const context={KunstWallEnabled:true,URL};vm.runInNewContext(fs.readFileSync(require.resolve('../scripts/kunsttresor-core.js'),'utf8'),context);const core=context.KunstTresor;
const images=new Map(media.images.map(w=>[w.id,w])),pool=archive.works.map(w=>({...w,...images.get(w.id),titleDe:titles.titles[w.id],artistIdentity:wiki.artists[w.artist].language+':'+wiki.artists[w.artist].title})),added=pool.slice(plan.baseline);
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
test('all 23 requested artists expand by at least six works, while 1921 published records remain byte-equivalent',()=>{
 assert.equal(Object.keys(plan.artists).length,23);assert.equal(pool.length,2220);assert.equal(added.length,299);
 assert.equal(hash(archive.works.slice(0,1921)),plan.legacyWorksSHA256);assert.equal(hash(media.images.slice(0,1921)),plan.legacyImagesSHA256);
 for(const [id,baseline]of Object.entries(plan.artists)){const url='https://www.wikidata.org/wiki/'+id,works=added.filter(w=>w.artistWikidata===url),artist=works[0]?.artist;assert.ok(artist,id);assert.equal(pool.slice(0,1921).filter(w=>w.artist===artist).length,baseline,id);assert.ok(works.length>=6,id);}
 assert.deepEqual(new Set(added.map(w=>w.id)),new Set(plan.works.map(w=>'wd-'+w[0])));
 assert.equal(new Set(pool.map(w=>w.id)).size,pool.length);assert.equal(new Set(pool.map(w=>w.imageOriginalURL)).size,pool.length);
 for(const id of Object.keys(plan.excluded))assert.ok(!added.some(w=>w.id==='wd-'+id),id);
});
test('each addition has free image evidence, readable German metadata and a valid seven-work room',()=>{
 for(const w of added){assert.ok(core.validWork(w),w.id);assert.ok(core.canDownload(w),w.id);assert.match(w.imageLicense,/^(Public domain|CC0)$/);assert.equal(w.downloadRightsChecked,plan.reviewed);assert.equal(new URL(w.imageSource).hostname,'commons.wikimedia.org');assert.equal(new URL(w.imageOriginalURL).hostname,'upload.wikimedia.org');assert.ok(w.imageWidth>0&&w.imageHeight>0&&w.imageBytes>0);assert.ok(w.titleDe&&w.museum&&w.medium);assert.ok(!/(?:^| · )Q\d+(?:$| · )/.test(w.medium));assert.ok(w.dateStart<=w.dateEnd&&w.dateEnd<=w.artistDeath);assert.ok(knowledge.styles[w.style]&&knowledge.techniques[w.technique]);
  const chosen=[w];for(const other of pool)if(chosen.length<7&&core.compatible(chosen,other))chosen.push(other);assert.equal(chosen.length,7,w.id);assert.ok(core.restore(core.newState(chosen,null,Math.random,false,{}),pool),w.id);
 }
 assert.ok(core.restore(core.newState(pool.slice(0,1921)),pool));
});
test('Japanese print compositions and sculpture photographs are identified separately from painting',()=>{
 const prints=added.filter(w=>w.style==='Ukiyo-e');assert.equal(prints.length,24);for(const w of prints){assert.equal(w.artForm,'print');assert.equal(w.technique,'Farbholzschnitt');assert.match(knowledge.workNotes[w.id].text,/Abzüge/);}
 const sculptures=added.filter(w=>w.artForm==='sculpture');assert.equal(sculptures.length,3);for(const w of sculptures){assert.equal(w.introEligible,false);assert.equal(w.technique,'Marmorskulptur');assert.ok(core.canDownload(w));}
 for(const name of ['Fresko','Farbholzschnitt']){assert.equal(knowledge.techniques[name].clues.length,3);assert.ok(JSON.stringify(film).includes(name));}
 for(const name of ['Ukiyo-e','Suprematismus'])assert.ok(knowledge.styles[name]&&JSON.stringify(film).includes(name));
});
test('primary catalogue corrections preserve dates, mixed techniques and honest biographical uncertainty',()=>{
 const get=id=>added.find(w=>w.id==='wd-'+id);
 assert.equal(get('Q556553').date,'1567');assert.equal(get('Q1473546').technique,'Tempera');assert.match(get('Q1473546').medium,/grassa/);assert.equal(get('Q22049132').date,'1907');assert.equal(get('Q103300447').technique,'Lithografie');assert.equal(get('Q83862').date,'1513–1515');assert.equal(get('Q1516449').date,'um 1430');assert.equal(get('Q321303').date,'1490–1500');
 for(const w of added.filter(w=>w.artist==='Artemisia Gentileschi')){assert.equal(w.artistDeathApproximate,true);assert.match(w.artistDeathText,/1654 oder später/);assert.match(knowledge.workNotes[w.id].text,/kein gesichertes Datum/);}
 for(const[qid,file]of Object.entries(plan.requestedFiles)){const w=get(qid);assert.equal(decodeURIComponent(new URL(w.imageSource).pathname).replaceAll('_',' '),'/wiki/'+file);}
 for(const w of added.filter(w=>w.artist==='Giotto di Bondone'&&w.museum.includes('Scrovegni'))){assert.equal(w.technique,'Fresko');assert.equal(w.date,'1303–1305');}
});

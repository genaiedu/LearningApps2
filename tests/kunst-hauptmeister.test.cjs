const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm'),fs=require('node:fs');
const archive=require('../data/kunstarchiv.json'),media=require('../data/kunstbilder.json'),wiki=require('../data/kunst-wikipedia.json'),titles=require('../data/kunst-titel-de.json'),knowledge=require('../data/kunst-glossar.json'),plan=require('../data/kunst-leonardo-turner-2026.json');
const curator=require('../scripts/kunst-kurator.js'),ki=require('../services/kunst-kurator/lib/kunst-ki.js');
const scope={KunstWallEnabled:true,URL};vm.runInNewContext(fs.readFileSync(require.resolve('../scripts/kunsttresor-core.js'),'utf8'),scope);const core=scope.KunstTresor;
const images=new Map(media.images.map(w=>[w.id,w])),pool=archive.works.map(w=>({...w,...images.get(w.id),titleDe:titles.titles[w.id],artistIdentity:wiki.artists[w.artist].language+':'+wiki.artists[w.artist].title}));
const added=pool.slice(plan.baseline),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function roomWith(work){const chosen=[work];for(const w of pool)if(chosen.length<7&&core.compatible(chosen,w))chosen.push(w);assert.equal(chosen.length,7);return core.newState(chosen,null,Math.random,false,{});}
function solved(state){for(const id of state.ids)for(const f of core.fieldsFor(state))state=core.choose(state,id,f,pool.find(w=>w.id===id)[f]);return core.inspect(state,pool).state;}
test('114 reviewed additions preserve every one of the 1807 published works and images',()=>{
 assert.equal(pool.length,1921);assert.equal(added.length,114);
 assert.equal(hash(archive.works.slice(0,plan.baseline)),plan.legacyWorksSHA256);assert.equal(hash(media.images.slice(0,plan.baseline)),plan.legacyImagesSHA256);
 assert.deepEqual(new Set(added.map(w=>w.id)),new Set(plan.works.map(w=>'wd-'+w[0])));
 assert.equal(new Set(pool.map(w=>w.id)).size,pool.length);assert.equal(new Set(pool.map(w=>w.imageOriginalURL)).size,pool.length);
 const expected={'Leonardo da Vinci':18,'William Turner':30,'Rembrandt van Rijn':30,'Peter Paul Rubens':30,'Jan Vermeer':34};for(const[n,count]of Object.entries(expected))assert.equal(pool.filter(w=>w.artist===n).length,count,n);
 for(const id of Object.keys(plan.excluded))assert.ok(!added.some(w=>w.id==='wd-'+id));
});
test('each new work has free reproduction evidence, complete display data and a playable seven-work room',()=>{
 for(const w of added){assert.ok(core.validWork(w),w.id);assert.ok(core.canDownload(w),w.id);assert.equal(w.downloadRightsChecked,'2026-10-18');assert.match(w.imageLicense,/^(Public domain|CC0)$/);assert.equal(new URL(w.imageSource).hostname,'commons.wikimedia.org');assert.equal(new URL(w.imageOriginalURL).hostname,'upload.wikimedia.org');assert.ok(w.imageWidth&&w.imageHeight&&w.imageBytes);assert.ok(knowledge.styles[w.style]&&knowledge.techniques[w.technique]);assert.ok(w.titleDe&&w.museum&&w.medium);assert.ok(w.dateStart<=w.dateEnd);if(w.attribution!=='unknown')assert.ok(w.dateEnd<=w.artistDeath);assert.ok(core.restore(roomWith(w),pool));}
 assert.ok(core.restore(core.newState(pool.slice(0,plan.baseline)),pool));
});
test('museum decisions preserve Mona Lisa dates, dry-wall technique, transfers and the secure Vermeer attribution',()=>{
 const get=id=>pool.find(w=>w.id==='wd-'+id);
 assert.equal(get('Q12418').date,'1503–1519');assert.equal(get('Q128910').technique,'Secco-Wandmalerei');assert.match(knowledge.techniques['Secco-Wandmalerei'].caution,/kein|nicht automatisch/);
 for(const id of ['Q11935346','Q1142058','Q571416']){assert.equal(get(id).technique,'Öl auf Leinwand');assert.match(get(id).medium,/ursprünglich auf Holz/);}
 assert.equal(get('Q782639').artist,'Jan Vermeer');assert.match(get('Q782639').catalogueSource,/smb.museum/);assert.ok(!Object.hasOwn(get('Q782639'),'verifiedArtistId'));
 assert.match(decodeURIComponent(get('Q1216387').imageSource),/The_lacemaker/);
 const featured=require('../data/kunst-hauptwerke.json').works;for(const id of ['Q12418','Q128910','Q185372','Q219831'])assert.ok(featured.some(w=>w.id==='wd-'+id));assert.equal(featured.length,100);
});
test('Goldhelm is the only additional anonymous painting and is not a named Rembrandt',()=>{
 const work=pool.find(w=>w.id==='wd-Q1195610');assert.equal(added.filter(w=>w.attribution==='unknown').length,1);assert.equal(work.artist,'Unbekannter Künstler');assert.equal(work.artistDeath,null);assert.equal(work.artistWikidata,undefined);assert.ok(core.validWork(work));
 for(const change of [{id:'another-anonymous-painting'},{dateEnd:1661},{dateStart:1600},{artistDeath:0},{catalogueSource:'https://example.org'},{rightsBasis:'assumed'},{attribution:'named'}])assert.equal(core.validWork({...work,...change}),false);
 const s=solved(roomWith(work)),explanation=curator.explain(work,s,knowledge,pool);
 assert.match(explanation.workNote,/Unbekannter Künstler/);assert.match(explanation.workNote,/nicht Rembrandt/);assert.match(explanation.workNote,/1986/);assert.match(explanation.workNote,/keine KI-Fälschung/);assert.ok(explanation.sources.some(s=>s.url===work.catalogueSource));
 const context=ki.context(ki.payload(s,{events:[]}),pool,knowledge,curator),item=context.works.find(w=>w.id===work.id);assert.equal(item.attribution,'unknown');assert.match(item.programText,/1986/);assert.match(item.programText,/nicht Rembrandt/);
 assert.ok(core.restore(s,pool));
});

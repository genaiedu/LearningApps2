// Metadata only: retain source titles, IDs, answers and image URLs unchanged.
// node scripts/localize-kunsttitel.mjs /private/tmp/kunst-1000-cache [initial-translations.tsv]
// Review /private/tmp/kunst-titel-de.patch and apply it with apply_patch.
import {readFileSync, readdirSync, existsSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root = new URL('../',import.meta.url).pathname;
const cache = resolve(process.argv[2] || '/private/tmp/kunst-1000-cache');
const archive = JSON.parse(readFileSync(root+'data/kunstarchiv.json','utf8'));
const media = new Map(JSON.parse(readFileSync(root+'data/kunstbilder.json','utf8')).images.map(x=>[x.id,x]));
const wiki = JSON.parse(readFileSync(root+'data/kunst-wikipedia.json','utf8'));
const target = 'data/kunst-titel-de.json', old = existsSync(root+target)?readFileSync(root+target,'utf8'):'';
const prior = old ? JSON.parse(old) : {titles:{},ownTranslations:[],retainedTitles:[]};
const overrides = new Map([...prior.ownTranslations,...prior.retainedTitles].map(id=>[id,prior.titles[id]]));
if (process.argv[3]) for (const line of readFileSync(process.argv[3],'utf8').trim().split('\n')) {
  const [id,...parts]=line.split('\t'); overrides.set(id,parts.join('\t').trim());
}
const entities = new Map();
for (const file of readdirSync(cache).filter(f=>f.startsWith('entities-')&&f.endsWith('.json'))) {
  for (const entity of Object.values(JSON.parse(readFileSync(resolve(cache,file),'utf8')).entities||{})) entities.set(entity.id,entity);
}
const titles={},ownTranslations=[],retainedTitles=[];
for (const work of archive.works) {
  const qid=(work.wikidata||media.get(work.id)?.wikidata||'').split('/').at(-1), entity=entities.get(qid);
  const article=entity?.sitelinks?.dewiki?.title || (wiki.works[work.id]?.language==='de'?wiki.works[work.id].title:'');
  const german=article?.replace(/\s+\([^)]*\)$/,'') || entity?.labels?.de?.value;
  let text = overrides.get(work.id) || (work.galleryTitle && work.galleryTitle!=='Reconciliation'?work.galleryTitle:'') || german;
  if (!text) throw Error('German display title missing: '+work.id+' / '+work.title);
  // A source title can include a creator's name; the existing quiz-safe shortening takes precedence.
  if (work.galleryTitle && work.galleryTitle!=='Reconciliation') text=work.galleryTitle;
  titles[work.id]=text;
  if (overrides.has(work.id)) {
    if (text!==work.title && ![german,work.galleryTitle].includes(text)) ownTranslations.push(work.id);
    else retainedTitles.push(work.id);
  }
}
if (Object.keys(titles).length!==1000) throw Error('Expected 1000 titles');
const data={version:1,language:'de',checked:'2026-10-09',
  note:'German Wikipedia/Wikidata titles where available; otherwise individually edited German display translations. Proper names and established non-English titles may remain unchanged. Source titles remain in kunstarchiv.json. Own translations are labelled in the solution, not presented as official museum titles.',
  titleNotes:{'wd-Q19162715':{title:'Mestiza',source:'https://artsandculture.google.com/asset/mestiza-juan-luna-novicio/2gGB0jK-kSj_JA'},'wd-Q18947711':{source:'https://www.museunacional.cat/sites/default/files/inventari_ainaud_1.pdf'}},
  titles,ownTranslations,retainedTitles};
const next=JSON.stringify(data,null,2)+'\n';
const patch='*** Begin Patch\n'+(old?'*** Update File: '+root+target+'\n@@\n'+old.trimEnd().split('\n').map(x=>'-'+x).join('\n')+'\n':'*** Add File: '+root+target+'\n')+next.trimEnd().split('\n').map(x=>'+'+x).join('\n')+'\n*** End Patch\n';
writeFileSync('/private/tmp/kunst-titel-de.patch',patch);
console.log(JSON.stringify({titles:Object.keys(titles).length,ownTranslations:ownTranslations.length,retainedTitles:retainedTitles.length,patch:'/private/tmp/kunst-titel-de.patch'}));

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=new URL('./',import.meta.url);
// Pinned public fallback; local/package sources must contain the current 2220 works.
// Public, pinned sources only. No API key is used during the build.
const revision='06de3120c1fecf5c6d4be1a0c6eacee6832fa7b9';
const files=['scripts/kunsttresor-core.js','scripts/kunst-kurator.js','data/kunstarchiv.json','data/kunst-glossar.json','data/kunst-titel-de.json','data/kunst-wikipedia.json'];
await mkdir(new URL('generated/',root),{recursive:true});
for (const path of files) {
  let content;
  try { content=await readFile(new URL('../../'+path,root)); }
  catch {
    try { content=await readFile(new URL('generated/'+path.split('/').at(-1),root)); }
    catch {
      const response=await fetch('https://raw.githubusercontent.com/genaiedu/LearningApps2/'+revision+'/'+path,{signal:AbortSignal.timeout(20000)});
      if (!response.ok) throw Error('Verified source unavailable: '+path);
      content=Buffer.from(await response.arrayBuffer());
    }
  }
  await writeFile(new URL('generated/'+path.split('/').at(-1),root),content);
}
const archive=JSON.parse(await readFile(new URL('generated/kunstarchiv.json',root),'utf8'));
if (archive.works.length!==2220) throw Error('Unexpected source archive; review before deploying.');
console.log('Prepared verified curator sources for '+archive.works.length+' works in '+fileURLToPath(new URL('generated/',root)));

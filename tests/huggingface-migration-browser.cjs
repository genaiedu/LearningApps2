const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),workspace=path.dirname(root),legacy=path.join(workspace,'LearningApps');
const files=['huggingface-fall.css','huggingface-fall-cinema.css','huggingface-fall.js','huggingface-fall-data.js','huggingface-fall-art.js','huggingface-fall-scenes.js','assets/huggingface-fall/schwarm-intro.mp4','assets/huggingface-fall/schwarm-intro-poster.jpg','output/pdf/huggingface-fall-begleitskript.pdf','output/pdf/der-schwarm-der-nicht-geplant-war.pdf'];
for(const file of files){assert(fs.statSync(path.join(root,file)).isFile());assert(!fs.existsSync(path.join(legacy,file)),'no duplicated presentation file: '+file);}
assert.match(fs.readFileSync(path.join(legacy,'materialien.html'),'utf8'),/href="https:\/\/genaiedu.github.io\/LearningApps2\/huggingface-fall.html"/);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.pdf':'application/pdf','.mp4':'video/mp4','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(workspace,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(![root,legacy].some(base=>file.startsWith(base+path.sep))){res.writeHead(403).end();return;}
 fs.readFile(file,(error,body)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(body);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.addInitScript(()=>{window.migrationEntry=location.href;});
  const origin='http://127.0.0.1:'+server.address().port;
  for(const base of [origin+'/LearningApps','file://'+legacy]){
   await page.goto(base+'/huggingface-fall.html?from=legacy#schwarm-organigramm');
   await page.waitForURL('**/LearningApps2/huggingface-fall.html?from=legacy#auftakt');
   const entry=new URL(await page.evaluate(()=>migrationEntry));
   assert(entry.pathname.endsWith('/LearningApps2/huggingface-fall.html'));assert.equal(entry.search,'?from=legacy');assert.equal(entry.hash,'#schwarm-organigramm');
   assert(await page.locator('#startOpeningButton').isVisible());
   assert(await page.locator('#openingVideo').evaluate(v=>v.paused&&v.currentTime===0),'redirect never starts the movie');
   await page.locator('#next').click();await page.evaluate(()=>document.fonts.ready);
   const fonts=await page.evaluate(()=>[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family));
   assert(fonts.includes('Inter')&&fonts.includes('Outfit'),'shared fonts loaded over '+entry.protocol);
  }
  for(const file of files){const response=await page.request.get(origin+'/LearningApps2/'+file);assert.equal(response.status(),200,file);if(file.endsWith('.pdf'))assert.equal((await response.body()).subarray(0,4).toString(),'%PDF');}
  const withoutJS=await browser.newPage({javaScriptEnabled:false});await withoutJS.goto(origin+'/LearningApps/huggingface-fall.html');await withoutJS.waitForURL('**/LearningApps2/huggingface-fall.html');assert(await withoutJS.locator('noscript a').isVisible());await withoutJS.close();
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log('PASS: legacy redirect on HTTP and local files preserves incoming query/hash; no autoplay; shared fonts; both PDFs and all runtime assets; fallback without JavaScript; no duplicate presentation files.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});

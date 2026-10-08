const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('/Users/clausunterberg/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const root=path.resolve(__dirname,'../..');
 const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.woff2')?'font/woff2':'text/plain');fs.readFile(file,(e,x)=>{res.statusCode=e?404:200;res.end(e?'':x);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=process.env.TOWN_WEBKIT?await webkit.launch({executablePath:path.join(root,'sitzplan-pruefung/browsers/webkit-2336/pw_run.sh'),headless:true}):await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/LearningApps2/in-town-a1.html');
 assert.equal(await page.locator('.place').count(),24);assert.equal(await page.locator('#options button').count(),4);
 await page.locator('.place').first().click();assert.equal(await page.locator('#xp').textContent(),'2');await page.locator('.place').first().click();assert.equal(await page.locator('#xp').textContent(),'2');
 await page.locator('#flash').click();assert.equal(await page.locator('#got').isEnabled(),true);await page.locator('#got').click();assert.equal(await page.locator('#known').textContent(),'1');
 await page.reload();assert.equal(await page.locator('#known').textContent(),'1');assert.equal(await page.locator('#visited').textContent(),'1');
 await page.locator('#search').fill('Bahnhof');assert.equal(await page.locator('#vocab tr').count(),1);
 const ids=await page.evaluate(()=>round.map(q=>q.id));assert.equal(new Set(ids).size,12);assert.equal(await page.evaluate(()=>pool.length),96);
 for(let i=0;i<12;i++){const right=await page.evaluate(()=>round[index].w.id);await page.locator('#options button[data-id="'+right+'"]').click();await page.locator('#next').click();}
 assert.match(await page.locator('#question').textContent(),/12 von 12/);assert.match(await page.locator('#badges').textContent(),/Town Expert/);
 await page.locator('#new-quiz').click();const next=await page.evaluate(()=>round.map(q=>q.id));assert.equal(next.some(id=>ids.includes(id)),false);
 await page.locator('#reset').click();await page.locator('#cancel-reset').click();assert.notEqual(await page.locator('#xp').textContent(),'0');await page.locator('#reset').click();await page.locator('#confirm-reset').click();assert.equal(await page.locator('#xp').textContent(),'0');assert.equal(await page.locator('#known').textContent(),'0');assert.equal(await page.locator('#vocab tr').count(),24);
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);}
 await page.setViewportSize({width:1440,height:1100});await page.screenshot({path:'/private/tmp/town-explorer.png',fullPage:false});assert.deepEqual(errors,[]);console.log('PASS: pool, quiz completion, fresh questions, flashcards, persistence, reset, 390/768/1440 layout, no browser errors');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

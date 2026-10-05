const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const root=path.resolve(__dirname,'..'),workspace=path.dirname(root),shots=fs.mkdtempSync(path.join(os.tmpdir(),'hf-html-films-'));
const server=http.createServer((req,res)=>{const file=path.resolve(workspace,'.'+decodeURIComponent(req.url.split('?')[0]));if(![root,path.join(workspace,'LearningApps/fonts')].some(p=>file.startsWith(p+path.sep)))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream');res.end(b);});});
const state=(page,id)=>page.evaluate(id=>new Promise(resolve=>{
 const frame=document.getElementById(id),listener=e=>{if(e.source===frame.contentWindow&&e.data?.channel==='hf-film-v1'){removeEventListener('message',listener);resolve(e.data);}};
 addEventListener('message',listener);frame.contentWindow.postMessage({channel:'hf-film-v1',command:'hello'},'*');
}),id);
const seek=(page,id,time)=>page.evaluate(({id,time})=>document.getElementById(id).contentWindow.postMessage({channel:'hf-film-v1',command:'seek',value:time},'*'),{id,time});
const jump=async(page,id)=>{await page.evaluate(id=>location.hash=id,id);await page.waitForFunction(id=>document.getElementById('slideTitle').textContent===HF_CASE_DATA.slides.find(s=>s.id===id).title,id);if(['aufarbeitung','quintessenz'].includes(id))await page.waitForFunction(()=>document.getElementById('filmFallback').hidden);};
const geometry=page=>page.evaluate(()=>Object.fromEntries(['.topbar','.transport','#viewport'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,[r.x,r.y,r.width,r.height]];})));
(async()=>{
 let browser;await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],missing=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:')&&!r.url().startsWith('file:'))remote.push(r.url());assert(!r.url().includes('.mp4'),'HTML films do not fetch MP4');assert(!r.url().includes('/transitions/'),'no rejected transition clips');});
  const url='http://127.0.0.1:'+server.address().port+'/LearningApps2/huggingface-fall.html';
  await page.goto(url);await page.waitForTimeout(700);
  assert.equal((await state(page,'openingFilm')).time,0);assert((await state(page,'openingFilm')).paused);assert(await page.locator('#startOpeningButton').isVisible());
  const bars=await geometry(page);await page.locator('#settings').click();await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);assert((await state(page,'openingFilm')).paused);
  await page.locator('#settings').click();await page.locator('#fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);
  await page.locator('#play').click();await page.waitForTimeout(400);assert((await state(page,'openingFilm')).time>.1);
  await page.locator('#play').click();const paused=await state(page,'openingFilm');await page.waitForTimeout(250);assert.equal((await state(page,'openingFilm')).time,paused.time);
  await page.locator('#play').click();await page.waitForTimeout(200);assert((await state(page,'openingFilm')).time>paused.time,'resume, not restart');
  await page.locator('#play').click();await seek(page,'openingFilm',14.9);await page.waitForTimeout(100);
  const titleBefore=await page.locator('.portrait-field').boundingBox();await page.screenshot({path:path.join(shots,'intro-title-before.png')});
  await page.locator('#play').click();await page.waitForFunction(()=>document.getElementById('openingStage').hidden);
  const titleAfter=await page.locator('.portrait-field').boundingBox();for(const p of ['x','y','width','height'])assert(Math.abs(titleBefore[p]-titleAfter[p])<.1,'same actual title at film end: '+p);
  assert.deepEqual(await geometry(page),bars);assert.equal(await page.locator('#position').textContent(),'Folie 01 / 31');
  await page.locator('#next').click();await page.waitForSelector('.docking-copy');assert.equal(await page.locator('#slide').getAttribute('class').then(s=>s.includes('agent-concept')),true,'original title flight survives');
  for(const theme of ['dark','light'])for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:844,height:390}]){
   await page.setViewportSize(viewport);await page.locator('#settings').click();await page.locator('input[name=theme][value='+theme+']').check();await page.locator('#motion').uncheck();await page.locator('[data-close=settingsDialog]').click();
   await jump(page,'aufarbeitung');
   for(let i=0;i<3;i++){
    if(i)await page.locator('#next').click();await page.waitForTimeout(120);
    const snap=await state(page,'sceneFilm');assert(Math.abs(snap.time-[.9,2.25,5][i])<.01);assert(snap.paused);
    assert.match(await page.locator('.calendar').textContent(),new RegExp(['16.–17. Juli','19. Juli','20. Juli'][i]));
    assert.match(await page.locator('.investigation-status .visible').textContent(),new RegExp(['als Kunde','Sicherheitsalarm','Dieselben Zugangsdaten'][i]));
    const frame=page.frameLocator('#sceneFilm');assert.equal(await frame.locator('#topbar').isVisible(),false);assert.equal(await frame.locator('#heading').isVisible(),false);
    const scale=await frame.locator('#net').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a);assert(Math.abs(scale-(i===0?1:.63))<.01);
    await page.screenshot({path:path.join(shots,`${theme}-${viewport.width}-discovery-${i}.png`)});
   }
   await jump(page,'quintessenz');assert.match(await page.locator('#position').textContent(),/30 \/ 31/);
   for(let i=0;i<4;i++){
    if(i)await page.locator('#next').click();await page.waitForTimeout(100);assert(Math.abs((await state(page,'sceneFilm')).time-[3.55,5.55,8.6,15][i])<.01);
    await page.screenshot({path:path.join(shots,`${theme}-${viewport.width}-finale-${i}.png`)});
   }
   await page.locator('#next').click();assert.equal(await page.locator('#position').textContent(),'Folie 31 / 31');assert(await page.locator('#next').isDisabled());assert(await page.locator('#downloadText').isVisible());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  // The native title is identical at the film/slide boundary at every size,
  // including resizing while the intro is paused on its title.
  for(const viewport of [{width:1024,height:768},{width:390,height:844},{width:844,height:390}]){
   await page.setViewportSize(viewport);await page.locator('#settings').click();await page.locator('#motion').check();await page.locator('#reset').click();await page.locator('#confirmReset').click();
   assert((await state(page,'openingFilm')).paused);await page.locator('#play').click();await seek(page,'openingFilm',14.9);await page.waitForTimeout(100);
   const rect=await page.locator('.portrait-field').boundingBox();await page.locator('#play').click();await page.waitForFunction(()=>document.getElementById('openingStage').hidden);
   const final=await page.locator('.portrait-field').boundingBox();for(const p of ['x','y','width','height'])assert(Math.abs(rect[p]-final[p])<.1,'responsive title boundary '+viewport.width+' '+p);
  }
  // Film segments finish and stop; opening settings cancels pending playback.
  await page.setViewportSize({width:1440,height:900});await page.locator('#settings').click();await page.locator('#motion').check();await page.locator('[data-close=settingsDialog]').click();
  await jump(page,'aufarbeitung');await page.waitForTimeout(1400);assert((await state(page,'sceneFilm')).paused);assert(Math.abs((await state(page,'sceneFilm')).time-.9)<.01);
  await page.locator('#next').click();await page.waitForTimeout(200);await page.locator('#settings').click();const stopped=await state(page,'sceneFilm');await page.waitForTimeout(300);assert.equal((await state(page,'sceneFilm')).time,stopped.time);await page.locator('[data-close=settingsDialog]').click();
  await page.locator('#play').click();await page.waitForTimeout(1600);assert(Math.abs((await state(page,'sceneFilm')).time-2.25)<.01);assert((await state(page,'sceneFilm')).paused);
  await jump(page,'quintessenz');await seek(page,'sceneFilm',15);await page.waitForTimeout(100);assert.equal(await page.locator('#position').textContent(),'Folie 30 / 31','film end does not auto-navigate');
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();assert(await page.locator('#startOpeningButton').isVisible());await page.locator('#play').click();assert(await page.locator('#openingStage').isHidden());
  // The same message bridge works for local file://, without same-origin access.
  await page.goto('file://'+path.join(root,'huggingface-fall.html'));await page.waitForTimeout(600);assert((await state(page,'openingFilm')).paused);await page.locator('#next').click();await jump(page,'quintessenz');assert((await state(page,'sceneFilm')).ready);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert.deepEqual(remote,[]);
  console.log('PASS: manual start, fullscreen, pause/resume/replay, identical live title, dated discovery stages, four finale stages, downloads last, 5 layouts / 2 themes, reduced motion, local file support, no remote assets. Screenshots: '+shots);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

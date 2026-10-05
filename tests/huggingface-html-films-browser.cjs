const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {PNG}=require('pngjs');
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
   let zoomCenter,headingAt19;
   for(let i=0;i<3;i++){
    if(i)await page.locator('#next').click();await page.waitForTimeout(120);
    const snap=await state(page,'sceneFilm');assert(Math.abs(snap.time-[.9,2.25,5][i])<.01);assert(snap.paused);
    assert.match(await page.locator('.calendar').textContent(),new RegExp(['16.–17. Juli','19. Juli','20. Juli'][i]));
    assert.match(await page.locator('.investigation-status .visible').textContent(),new RegExp(['als Kunde','Sicherheitsalarm','Dieselben Zugangsdaten'][i]));
    const heading=await page.locator('.slide-heading').evaluate(e=>[...e.children].map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent,rect:[r.x,r.y,r.width,r.height]};}));
    if(i===1)headingAt19=heading;
    if(i===2){heading.forEach((item,n)=>{item.rect.forEach((v,k)=>{if(n===1&&k===2)return;assert(Math.abs(v-headingAt19[n].rect[k])<.1,'heading does not move on discovery: '+theme+' '+viewport.width+' child '+n+' before '+headingAt19[n].rect+' after '+item.rect);});if(n!==1)assert.equal(item.text,headingAt19[n].text,'only the date changes');});}
    const frame=page.frameLocator('#sceneFilm');assert.equal(await frame.locator('#topbar').isVisible(),false);assert.equal(await frame.locator('#heading').isVisible(),false);
    const scale=await frame.locator('#net').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a);assert(Math.abs(scale-(i===0?1:.63))<.01);
    const center=await frame.locator('#net').evaluate(e=>{const p=new DOMPoint(460,257.5).matrixTransform(e.getScreenCTM());return [p.x,p.y];});
    if(i===0)zoomCenter=center;else center.forEach((v,k)=>assert(Math.abs(v-zoomCenter[k])<.1,`zoom keeps the same center: ${theme} ${viewport.width} step ${i}: ${center} vs ${zoomCenter}`));
    await page.screenshot({path:path.join(shots,`${theme}-${viewport.width}-discovery-${i}.png`)});
   }
   const transparent=await page.frameLocator('#sceneFilm').locator('html,body,#root').evaluateAll(es=>es.every(e=>getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)'));
   assert(transparent,'the whole embedded image reveals the host flock');
   // Computed transparent backgrounds alone miss Chromium's white canvas when
   // the iframe's color scheme differs from the parent's. Check painted pixels.
   const box=await page.locator('#sceneFilm').boundingBox(),clip={x:Math.ceil(box.x+4),y:Math.ceil(box.y+4),width:16,height:16};
   const painted=PNG.sync.read(await page.screenshot({clip}));
   await page.locator('#sceneFilm').evaluate(e=>e.style.opacity='0');
   const behind=PNG.sync.read(await page.screenshot({clip}));
   await page.locator('#sceneFilm').evaluate(e=>e.style.opacity='');
   assert(painted.data.every((v,k)=>Math.abs(v-behind.data[k])<=2),'painted iframe canvas is transparent in '+theme+' mode');
   assert.equal((await state(page,'sceneFlight')).time,0,'flight waits for an explicit gesture');
   assert.equal(await page.locator('#next').textContent(),'Schwarm auflösen →');
   const originalAgents=await page.frameLocator('#sceneFilm').locator('#net .agent svg').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
   const artBox=await page.locator('#sceneFilm').boundingBox();
   await page.locator('#next').click();await page.waitForTimeout(140);
   assert.equal((await state(page,'sceneFlight')).time,6);assert((await state(page,'sceneFlight')).paused);
   const flightBox=await page.locator('#sceneFlight').boundingBox(),flightView=await page.locator('#viewport').boundingBox();
   for(const p of ['x','y','width','height'])assert(Math.abs(flightBox[p]-flightView[p])<1,'agent flight uses the full presentation window '+p);
   const exits=await page.frameLocator('#sceneFlight').locator('#front > [id^=ag]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return r.right<0||r.bottom<0||r.left>innerWidth||r.top>innerHeight;}));
   assert.equal(exits.length,8);assert(exits.every(Boolean),'all eight agents fly completely beyond the actual viewport');
   const landed=await page.frameLocator('#sceneFlight').locator('.falling-feather').evaluateAll(es=>es.map(e=>({top:parseFloat(e.style.top)+gsap.getProperty(e,'y'),floor:HF_FLIGHT_BOUNDS.floorY,rotation:gsap.getProperty(e,'rotation')})));
   assert.equal(landed.length,16);assert(landed.every(e=>Math.abs(e.top-e.floor)<.1&&e.rotation===90),'all feathers land horizontally at the full presentation floor');
   await seek(page,'sceneFlight',0);await page.waitForTimeout(80);
   const restored=await page.frameLocator('#sceneFlight').locator('#net .agent svg').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
   restored.forEach((r,i)=>{for(const p of ['width','height'])assert(Math.abs(r[p]-originalAgents[i][p])<.7,'starting agent size stays unchanged');assert(Math.abs(r.x+flightBox.x-originalAgents[i].x-artBox.x)<.7&&Math.abs(r.y+flightBox.y-originalAgents[i].y-artBox.y)<.7,'starting agent position stays unchanged');});
   await seek(page,'sceneFlight',6);await page.waitForTimeout(80);
   assert.equal(await page.locator('.flock-layer').evaluate(e=>getComputedStyle(e).opacity),'0','reduced motion skips to the empty flock');
   await page.screenshot({path:path.join(shots,`${theme}-${viewport.width}-flight-end.png`)});
   await jump(page,'quintessenz');assert.match(await page.locator('#position').textContent(),/30 \/ 31/);
   assert.equal((await state(page,'sceneFilm')).time,0,'finale waits for start');
   assert.equal(await page.locator('#next').textContent(),'Abschlussfilm starten →');
   await page.locator('#next').click();await page.waitForTimeout(100);
   assert.equal((await state(page,'sceneFilm')).time,15,'reduced motion shows final image');
   const filmBox=await page.locator('#sceneFilm').boundingBox(),viewBox=await page.locator('#viewport').boundingBox();
   for(const p of ['x','y','width','height'])assert(Math.abs(filmBox[p]-viewBox[p])<1,'finale fills whole cinema window '+p);
   for(let i=0;i<4;i++){
    await seek(page,'sceneFilm',[3.55,5.55,8.6,15][i]);await page.waitForTimeout(100);
    const frame=page.frameLocator('#sceneFilm');
    const cover=await frame.locator('body').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight};});
    assert(cover.x<=.1&&cover.y<=.1&&cover.right>=cover.width-.1&&cover.bottom>=cover.height-.1,'no letterboxing');
    const caption=frame.locator(['#c1p','#c2p','#c3p','#f1'][i]),captionBox=await caption.boundingBox();
    assert(captionBox.x>=filmBox.x-1&&captionBox.x+captionBox.width<=filmBox.x+filmBox.width+1&&captionBox.y>=filmBox.y-1&&captionBox.y+captionBox.height<=filmBox.y+filmBox.height+1,'captions remain inside visible image');
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
  // Slide 24 stays visible while slide 25 loads, then dissolves without moving
  // the foreground or rebuilding/fading out the background birds.
  await jump(page,'aufarbeitung');await page.locator('#prev').click();await page.waitForTimeout(4700);
  assert.match(await page.locator('#position').textContent(),/24 \/ 31/);
  await page.evaluate(()=>window.testFlock=document.querySelector('#slide>.flock-layer'));
  const discoveryRoute='**/02-folie-25-die-spuren.html*';
  await page.route(discoveryRoute,async route=>{await new Promise(r=>setTimeout(r,900));await route.continue();});
  await page.locator('#next').click();await page.waitForTimeout(100);
  assert(await page.evaluate(()=>window.testFlock===document.querySelector('#slide>.flock-layer')),'retain the exact flock DOM');
  assert.equal(await page.locator('.slide-crossfade').evaluate(e=>getComputedStyle(e).opacity),'1','old slide remains fully visible until film ready');
  assert.equal(await page.locator('#slide>.stage').evaluate(e=>getComputedStyle(e).opacity),'0','loading film cannot cover the flock');
  for(let i=0;i<5;i++){
   const birds=await page.locator('#slide .flock-bird.present').evaluateAll(es=>({count:es.length,minOpacity:Math.min(...es.map(e=>Number(getComputedStyle(e).opacity)))}));
   assert(birds.count>=300&&birds.minOpacity===1,'birds never restart their arrival or disappear: '+JSON.stringify(birds));
   await page.waitForTimeout(60);
  }
  await page.waitForFunction(()=>document.getElementById('filmFallback').hidden);
  await page.waitForTimeout(200);
  const fading=await page.locator('.slide-crossfade').evaluate(e=>Number(getComputedStyle(e).opacity));
  assert(fading>0&&fading<1,'crossfade starts only after the first film frame is ready');
  assert.equal(await page.locator('#slide>.stage').evaluate(e=>getComputedStyle(e).transform),'none','pure dissolve, no vertical slide');
  await page.screenshot({path:path.join(shots,'slide-24-to-25-crossfade.png')});
  await page.waitForFunction(()=>!document.querySelector('.slide-crossfade'));
  await page.unroute(discoveryRoute);
  await page.evaluate(()=>delete window.testFlock);
  await jump(page,'aufarbeitung');await page.waitForTimeout(1400);assert((await state(page,'sceneFilm')).paused);assert(Math.abs((await state(page,'sceneFilm')).time-.9)<.01);
  await page.locator('#next').click();await page.waitForTimeout(200);await page.locator('#settings').click();const stopped=await state(page,'sceneFilm');await page.waitForTimeout(300);assert.equal((await state(page,'sceneFilm')).time,stopped.time);await page.locator('[data-close=settingsDialog]').click();
  await page.locator('#play').click();await page.waitForTimeout(1600);assert(Math.abs((await state(page,'sceneFilm')).time-2.25)<.01);assert((await state(page,'sceneFilm')).paused);
  await page.locator('#next').click();await page.waitForTimeout(3000);assert((await state(page,'sceneFilm')).paused);assert.equal((await state(page,'sceneFilm')).time,5);
  await page.waitForTimeout(350);assert.equal((await state(page,'sceneFlight')).time,0);assert.equal(await page.locator('#slide').getAttribute('data-step'),'2','discovery stays until explicitly dissolved');
  // Both compositions pose exactly the same scaled network and the new agent
  // copies sit on the original agents, not on coordinates from the full-page preview.
  const oldBox=await page.frameLocator('#sceneFilm').locator('#net .agent svg').first().boundingBox();
  await page.locator('#next').click();await page.waitForTimeout(150);await page.locator('#play').click();
  const flightBox=await page.frameLocator('#sceneFlight').locator('#net .agent svg').first().boundingBox();
  for(const p of ['x','y','width','height'])assert(Math.abs(oldBox[p]-flightBox[p])<.7,'no geometry jump to flight '+p);
  const frozen=await state(page,'sceneFlight');const nativeTime=await page.locator('.flock-bird').first().evaluate(e=>e.getAnimations().find(a=>a.effect.getTiming().duration===6000)?.currentTime);
  await page.waitForTimeout(250);assert.equal((await state(page,'sceneFlight')).time,frozen.time);assert.equal(await page.locator('.flock-bird').first().evaluate(e=>e.getAnimations().find(a=>a.effect.getTiming().duration===6000)?.currentTime),nativeTime);
  await page.locator('#play').click();await page.waitForTimeout(1800);await page.locator('#play').click();await page.screenshot({path:path.join(shots,'flight-middle.png')});
  await seek(page,'sceneFlight',3.2);await page.waitForTimeout(100);
  const illustration=await page.locator('#sceneFilm').boundingBox(),fullFlight=await page.locator('#sceneFlight').boundingBox();
  const expanded=await page.frameLocator('#sceneFlight').locator('#front > [id^=ag]').evaluateAll((es,{art,frame})=>es.some(e=>{const r=e.getBoundingClientRect(),x=r.x+frame.x,y=r.y+frame.y;return r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight&&(x<art.x||y<art.y||x+r.width>art.x+art.width||y+r.height>art.y+art.height);}),{art:illustration,frame:fullFlight});
  assert(expanded,'flying agents remain visible beyond the old small illustration boundary');
  await page.screenshot({path:path.join(shots,'agents-full-window.png')});
  await seek(page,'sceneFlight',3);await page.waitForTimeout(100);
  const feather=page.frameLocator('#sceneFlight').locator('.falling-feather').first(),featherBefore=await feather.boundingBox();
  await page.waitForTimeout(150);assert.deepEqual(await feather.boundingBox(),featherBefore,'feathers pause with the flight');
  await seek(page,'sceneFlight',5.2);await page.waitForTimeout(100);const featherAfter=await feather.boundingBox();
  assert(featherAfter.y>featherBefore.y+50,'feathers keep falling after leaving the agents');
  await page.screenshot({path:path.join(shots,'feathers-landing.png')});
  await seek(page,'sceneFlight',6);await page.waitForTimeout(100);assert.equal(await page.locator('#slide').getAttribute('data-step'),'3','flight end does not advance');
  assert.equal(await page.locator('.flock-bird').first().evaluate(e=>getComputedStyle(e).opacity),'0');
  await page.locator('#prev').click();assert.equal(await page.locator('#slide').getAttribute('data-step'),'2');assert.equal(await page.locator('.flock-bird').first().evaluate(e=>e.getAnimations().filter(a=>a.effect.getTiming().duration===6000).length),0,'going back restores the intact swarm');
  await jump(page,'quellen');await jump(page,'quintessenz');
  assert.equal((await state(page,'sceneFilm')).time,0);assert((await state(page,'sceneFilm')).paused);assert(await page.locator('.finale-backdrop').isVisible(),'previous slide remains for fade-in');
  await page.screenshot({path:path.join(shots,'finale-before-start.png')});
  await page.locator('#next').click();await page.waitForTimeout(700);
  const midOpacity=await page.locator('#sceneFilm').evaluate(e=>Number(getComputedStyle(e).opacity));assert(midOpacity>0&&midOpacity<1,'slow fade-in is in progress');
  await page.screenshot({path:path.join(shots,'finale-fade.png')});
  await page.locator('#play').click();const finalePaused=await state(page,'sceneFilm'),fadePaused=await page.locator('#sceneFilm').evaluate(e=>getComputedStyle(e).opacity);await page.waitForTimeout(200);assert.equal((await state(page,'sceneFilm')).time,finalePaused.time);assert.equal(await page.locator('#sceneFilm').evaluate(e=>getComputedStyle(e).opacity),fadePaused,'fade pauses with film');await page.locator('#play').click();
  await page.waitForTimeout(3600);assert((await state(page,'sceneFilm')).time>3.55);assert.equal((await state(page,'sceneFilm')).paused,false,'first former boundary does not stop film');
  await page.waitForTimeout(2500);assert((await state(page,'sceneFilm')).time>5.55);assert.equal((await state(page,'sceneFilm')).paused,false,'second former boundary does not stop film');
  await page.waitForTimeout(3200);assert((await state(page,'sceneFilm')).time>8.6);assert.equal((await state(page,'sceneFilm')).paused,false,'third former boundary does not stop film');
  await page.waitForFunction(()=>document.getElementById('next').textContent==='Zusatzmaterialien →');
  assert.equal((await state(page,'sceneFilm')).time,15);assert((await state(page,'sceneFilm')).paused);assert.equal(await page.locator('#position').textContent(),'Folie 30 / 31','film end does not auto-navigate');
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();assert(await page.locator('#startOpeningButton').isVisible());await page.locator('#play').click();assert(await page.locator('#openingStage').isHidden());
  // The same message bridge works for local file://, without same-origin access.
  await page.goto('file://'+path.join(root,'huggingface-fall.html'));await page.waitForTimeout(600);assert((await state(page,'openingFilm')).paused);await page.locator('#next').click();await jump(page,'quintessenz');assert((await state(page,'sceneFilm')).ready);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert.deepEqual(remote,[]);
  console.log('PASS: manual start, fullscreen, pause/resume/replay, identical live title, dated discovery stages, transparent flock, landing feathers, uninterrupted 15-second finale, slow fade from previous slide, edge-to-edge image, readable captions, downloads last, 5 layouts / 2 themes, reduced motion, local file support, no remote assets. Screenshots: '+shots);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const root=path.resolve(__dirname,'..'),workspace=path.dirname(root),sharedFonts=path.join(workspace,'LearningApps','fonts')+path.sep,shots=fs.mkdtempSync(path.join(os.tmpdir(),'hf-controlled-start-'));
const server=http.createServer((req,res)=>{
 const file=path.resolve(workspace,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!file.startsWith(root+path.sep)&&!file.startsWith(sharedFonts)){res.writeHead(403).end();return;}
 fs.stat(file,(error,stat)=>{
  if(error||!stat.isFile()){res.writeHead(404).end();return;}
  const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp4':'video/mp4','.jpg':'image/jpeg','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream';
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/),start=range?+range[1]:0,end=range&&range[2]?Math.min(+range[2],stat.size-1):stat.size-1;
  res.writeHead(range?206:200,{'Content-Type':type,'Content-Length':end-start+1,'Accept-Ranges':'bytes',...(range?{'Content-Range':'bytes '+start+'-'+end+'/'+stat.size}:{})});fs.createReadStream(file,{start,end}).pipe(res);
 });
});
const same=(a,b,label)=>{for(const key of ['x','y','width','height'])assert(Math.abs(a[key]-b[key])<.6,label+' '+key+': '+a[key]+' versus '+b[key]);};
async function bars(page){return [await page.locator('.topbar').boundingBox(),await page.locator('.transport').boundingBox()];}
async function ready(page){
 await page.waitForFunction(()=>document.getElementById('openingVideo').readyState>=1);
 assert.equal(await page.locator('#position').textContent(),'Start');assert(await page.locator('#startOpeningButton').isVisible());
 assert.equal(await page.locator('#play').textContent(),'Start');
 assert.equal(await page.locator('#openingVideo').isVisible(),false);assert.equal(await page.locator('#slide').isVisible(),false);
 assert(await page.locator('#openingVideo').evaluate(v=>v.paused&&v.currentTime===0));
 assert.equal(await page.locator('.opening-start').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(0, 0, 0)');
 assert.equal(await page.locator('#startOpeningButton').textContent(),'Start');
 const b=await page.locator('#startOpeningButton').boundingBox(),s=await page.locator('.opening-start').boundingBox();
 assert(Math.abs(b.x+b.width/2-s.x-s.width/2)<1&&Math.abs(b.y+b.height/2-s.y-s.height/2)<1,'Start is centered');
}
(async()=>{
 let browser;await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/LearningApps2/huggingface-fall.html';
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],remote=[];
  await page.addInitScript(()=>{window.mediaStarts=0;const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.mediaStarts++;return play.call(this);};});
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:'))remote.push(r.url());assert(!r.url().includes('/transitions/'),'removed clips must never be requested');});
  await page.goto(url);await ready(page);await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>mediaStarts),0,'no automatic play calls');
  await page.locator('#settings').click();await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);
  await ready(page);assert.equal(await page.evaluate(()=>mediaStarts),0);assert.equal(await page.locator('dialog[open]').count(),0);
  await page.locator('#startOpeningButton').click();await page.waitForFunction(()=>document.getElementById('openingVideo').currentTime>.1);
  assert.equal(await page.locator('#position').textContent(),'Auftaktfilm');assert(await page.locator('#openingVideo').isVisible());
  const meta=await page.locator('#openingVideo').evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight,muted:v.muted,inline:v.playsInline,controls:v.controls,loop:v.loop}));
  assert.deepEqual(meta,{duration:15,width:1920,height:1080,muted:true,inline:true,controls:false,loop:false});
  const movie=await page.locator('#openingVideo').boundingBox(),movieBars=await bars(page);
  await page.locator('#openingVideo').evaluate(v=>v.currentTime=14.8);await page.waitForFunction(()=>!document.getElementById('slide').hidden);
  assert.equal(await page.locator('#position').textContent(),'Folie 01 / 30');same(movie,await page.locator('.title-portrait').boundingBox(),'fullscreen video and title');
  assert.equal(await page.locator('#openingStage').evaluate(e=>e.hidden),false,'last frame dissolves over the already rendered title');
  await page.waitForFunction(()=>document.getElementById('openingStage').hidden);const titleBars=await bars(page);movieBars.forEach((b,i)=>same(b,titleBars[i],'fullscreen bars'));
  await page.locator('#next').click();await page.waitForSelector('.docking-copy');assert.equal(await page.locator('#position').textContent(),'Folie 02 / 30');
  assert.equal(await page.evaluate(()=>typeof HF_TRANSITIONS),'undefined');
  await page.locator('#settings').click();await page.locator('#fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);
  for(const theme of ['dark','light'])for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:844,height:390}]){
   await page.setViewportSize(viewport);await page.reload();await ready(page);assert.equal(await page.evaluate(()=>mediaStarts),0);
   await page.locator('#settings').click();await page.locator('input[name="theme"][value="'+theme+'"]').check();await page.locator('[data-close=settingsDialog]').click();
   const start=await page.locator('#openingStage').boundingBox(),before=await bars(page);await page.screenshot({path:path.join(shots,theme+'-start-'+viewport.width+'x'+viewport.height+'.png')});
   await page.locator('#play').click();await page.waitForFunction(()=>!document.getElementById('openingVideo').paused);
   same(start,await page.locator('#openingVideo').boundingBox(),'start and video');(await bars(page)).forEach((b,i)=>same(before[i],b,'start and film bars'));
   await page.locator('#play').click();assert(await page.locator('#openingVideo').evaluate(v=>v.paused));
   await page.locator('#replay').click();await page.waitForFunction(()=>!document.getElementById('openingVideo').paused);
   assert(await page.locator('#openingVideo').evaluate(v=>v.currentTime<1));
   await page.locator('#openingVideo').evaluate(v=>new Promise(resolve=>{v.pause();v.addEventListener('seeked',resolve,{once:true});v.currentTime=14.8;}));await page.screenshot({path:path.join(shots,theme+'-film-'+viewport.width+'x'+viewport.height+'.png')});
   await page.locator('#play').click();await page.waitForFunction(()=>document.getElementById('openingStage').hidden);
   same(start,await page.locator('.title-portrait').boundingBox(),'video and first slide');(await bars(page)).forEach((b,i)=>same(before[i],b,'start and slide bars'));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(shots,theme+'-title-'+viewport.width+'x'+viewport.height+'.png')});
  }
  await page.locator('#settings').click();await page.locator('#reset').click();await page.locator('#confirmReset').click();await ready(page);
  await page.locator('#overview').click();assert(await page.locator('#openingVideo').evaluate(v=>v.paused));await page.locator('[data-slide="2"]').click();assert.equal(await page.locator('#position').textContent(),'Folie 03 / 30');
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await ready(page);await page.locator('#startOpeningButton').click();await page.waitForFunction(()=>!document.getElementById('openingVideo').paused);
  await page.locator('#openingVideo').evaluate(v=>v.currentTime=14.8);await page.waitForFunction(()=>document.getElementById('openingStage').hidden);assert.equal(await page.locator('#position').textContent(),'Folie 01 / 30');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;let first=true;HTMLMediaElement.prototype.play=function(){if(first){first=false;return Promise.reject(new Error('Playback blocked'));}return play.call(this);};});
  await page.reload();await ready(page);await page.locator('#startOpeningButton').click();await page.waitForFunction(()=>!document.getElementById('openingHint').hidden);
  assert(await page.locator('#startOpeningButton').isVisible());await page.locator('#play').click();await page.waitForFunction(()=>!document.getElementById('openingVideo').paused);
  await page.locator('#openingVideo').evaluate(v=>v.dispatchEvent(new Event('error')));assert.match(await page.locator('#openingHint').textContent(),/nicht geladen/);await page.locator('#next').click();
  assert.equal(await page.locator('#position').textContent(),'Folie 01 / 30');assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  console.log('PASS: black centered manual Start; no autoplay; fullscreen before playback; matching start/video/title bounds and fixed bars in both themes at five sizes; old animations restored; pause/replay/skip/end/reset, reduced motion and errors. Screenshots '+shots);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

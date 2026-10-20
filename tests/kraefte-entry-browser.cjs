/* Vorgeschalteter Hinweis, Direktlinks, Bildfreigabe und Porträtformat. */
const{chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const url=process.argv[2]||'http://127.0.0.1:8878/LearningApps2/kraefte-labor.html',p=await b.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'}),external=[],errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(new URL(r.url()).origin!==new URL(url).origin)external.push(r.url());});
  await p.goto(url+'#praesentation');await p.evaluate(()=>KraefteApp.whenReady());assert.equal(await p.locator('#entry-screen').isVisible(),true);assert.equal(await p.locator('#app-shell').isVisible(),false);assert.equal(external.length,0);
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'start-without-images');
  for(const size of[{width:1280,height:800},{width:768,height:1024},{width:390,height:844},{width:320,height:740}]){
   await p.setViewportSize(size);
   for(const palette of['graphite','atelier','slate','plum','bordeaux'])for(const theme of['light','dark']){
    await p.evaluate(({palette,theme})=>Object.assign(document.documentElement.dataset,{palette,theme}),{palette,theme});
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    if(palette==='graphite')await p.screenshot({path:'/private/tmp/kraefte-entry-'+size.width+'-'+theme+'.png'});
   }
  }
  await p.setViewportSize({width:1280,height:800});await p.click('#start-without-images');assert.equal(external.length,0);assert.equal(await p.locator('#app-shell').isVisible(),true);await p.waitForFunction(()=>document.activeElement.closest('#praesentation'));
  await p.click('#view-open');assert.equal(await p.locator('#media-toggle').isVisible(),true);await p.click('#media-toggle');await p.locator('[data-close=view-dialog]').click();
  const profile=p.locator('#knowledge [data-photo=newton]');await profile.scrollIntoViewIfNeeded();await p.waitForFunction(()=>{const i=document.querySelector('#knowledge [data-photo=newton] img');return i?.complete&&i.naturalWidth>0;});
  for(const root of['#knowledge','#slide']){
   if(root==='#slide'){await p.locator('#slide-select').selectOption('2');await p.evaluate(()=>KraefteApp.whenReady());}
   const frame=p.locator(root+' [data-photo=newton] .media-frame');await frame.scrollIntoViewIfNeeded();const ratio=await frame.evaluate(e=>e.clientWidth/e.clientHeight);assert.ok(Math.abs(ratio-2218/2671)<.01,root+' Hochformat');
   await p.locator(root+' [data-photo=newton]').screenshot({path:'/private/tmp/kraefte-portrait-'+(root==='#knowledge'?'text':'slide')+'.png'});
  }
  assert.ok(external.some(x=>x.includes('upload.wikimedia.org')));await p.reload();await p.evaluate(()=>KraefteApp.whenReady());assert.equal(await p.locator('#entry-screen').isVisible(),true);assert.equal(await p.locator('img').count(),0);
  await p.click('#start-with-images');assert.equal(await p.locator('#app-shell').isVisible(),true);assert.ok(await p.locator('img').count()>0);await p.click('#view-open');await p.click('#media-toggle');assert.equal(await p.locator('img').count(),0);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({errors,entrySizes:4,palettes:10,portrait:true,consent:true}));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

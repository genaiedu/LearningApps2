const {chromium}=require('playwright');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'hf-intro-'));
 console.log('Screenshots: '+out);
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='file://'+path.resolve(__dirname,'../huggingface-fall.html');
  for(const theme of ['dark','light'])for(const [w,h]of [[1440,900],[1024,768],[768,1024],[390,844]]){
   await page.setViewportSize({width:w,height:h});await openStory(page,url);
   await page.locator('#settings').click();
   await page.locator('#motion').uncheck();
   await page.locator('input[name="theme"][value="'+theme+'"]').check();
   await page.locator('[data-close=settingsDialog]').click();
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('#position').textContent(),'Folie 01 / 31');
   assert.match(await page.locator('.title-portrait').textContent(),/Claus Unterberg/);
   assert.equal(await page.locator('.title-portrait .bird-anon1').count(),1);
   assert.equal(await page.locator('.concept-agent .bird-anon1').count(),0);
   for(const selector of ['.title-author','.title-portrait h2','.title-portrait .portrait-sticker']){
    const b=await page.locator(selector).boundingBox(),nav=await page.locator('.transport').boundingBox();
    assert.ok(b.x>=0&&b.x+b.width<=w&&b.y>=0&&b.y+b.height<nav.y,selector+' clipped '+w+' '+theme);
   }
   await page.screenshot({path:path.join(out,theme+'-'+w+'-title.png')});
   await page.locator('#next').click();assert.equal(await page.locator('#position').textContent(),'Folie 02 / 31');
   assert.equal(await page.locator('.concept-agent .bird-anon1').count(),1);
   assert.equal(await page.locator('.concept-agent .bird-hero').count(),0);
   for(let i=0;i<4;i++){
    assert.equal(await page.locator('.concept-card:visible').count(),1);
    const card=page.locator('.concept-card.visible');
    const b=await card.boundingBox(),nav=await page.locator('.transport').boundingBox();
    assert.ok(b.x>=0&&b.x+b.width<=w&&b.y+b.height<nav.y,'concept clipped '+w+' '+i);
    await page.screenshot({path:path.join(out,theme+'-'+w+'-concept-'+i+'.png')});
    await page.locator('#next').click();
   }
   assert.equal(await page.locator('#position').textContent(),'Folie 03 / 31');
  }
  for(const width of [1024,390]){
   await page.setViewportSize({width,height:844});await openStory(page,url);
   await page.locator('#settings').click();await page.locator('#motion').check();await page.locator('[data-close=settingsDialog]').click();
   const titleFont=await page.locator('.title-portrait h2').evaluate(el=>getComputedStyle(el).fontSize);
   await page.locator('#next').click();await page.waitForFunction(()=>!!document.querySelector('.docking-copy'));
   assert.equal(await page.locator('.docking-bird .bird-anon1').count(),1);
   if(width>520)assert.equal(await page.locator('.concept-agent .bird-anon1.arriving').count(),1);
   assert.equal(await page.locator('.docking-copy h2').evaluate(el=>getComputedStyle(el).fontSize),titleFont);
   assert.match(await page.locator('.docking-copy').textContent(),/Claus Unterberg/);
   await page.waitForTimeout(250);
   const travel=await page.evaluate(()=>['.docking-copy','.docking-backdrop'].map(s=>{const m=new DOMMatrix(getComputedStyle(document.querySelector(s)).transform);return [m.e,m.f];}));
   assert.ok(travel[0][0]>0&&travel[0][1]<0&&travel[1][0]<0&&travel[1][1]>0,'text and background fly in opposite directions');
   await page.screenshot({path:path.join(out,'title-flight-'+width+'.png')});
   await page.waitForFunction(()=>!document.querySelector('.docking-copy'));
   assert.equal(await page.locator('.arriving').count(),0);assert.equal(await page.locator('.concept-card:visible').count(),1);
   await openStory(page,url);await page.locator('#next').click();await page.locator('#prev').click();
   assert.equal(await page.locator('.docking-copy').count(),0,'back cancels flight');
   await page.locator('#settings').click();await page.locator('#motion').uncheck();await page.locator('[data-close=settingsDialog]').click();
   await page.locator('#next').click();assert.equal(await page.locator('.docking-copy').count(),0,'reduced motion skips flight');
  }
  await openStory(page,url);await page.locator('#notes').click();
  assert.match(await page.locator('#notesBody').textContent(),/Regie · Übergang.*Schrift nach rechts oben/s);
  await page.locator('[data-close=notesDialog]').click();
  await page.evaluate(()=>location.hash='mitnehmen');await page.waitForSelector('#downloadText');
  const downloading=page.waitForEvent('download');await page.locator('#downloadText').click();const download=await downloading;
  assert.match(fs.readFileSync(await download.path(),'utf8'),/REGIE · ÜBERGANG.*Schrift nach rechts oben/s);
  assert.deepEqual(errors,[]);console.log('PASS: title and four explanation builds, dark/light, desktop/tablet/mobile, no clipping; title flight, interruption, reduced motion and matching script notes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
async function openStory(page,url){await page.goto(url);await page.locator('#next').click();}

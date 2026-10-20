'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{
 const base=process.argv[2]||'http://127.0.0.1:8881/LearningApps2/',context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),p=await context.newPage(),errors=[],external=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(!r.url().startsWith('data:')&&new URL(r.url()).origin!==new URL(base).origin)external.push(r.url());});
 for(const file of['impressum.html','datenschutz.html']){
  await p.goto(base+file);await p.evaluate(()=>document.fonts.ready);assert.equal(await p.evaluate(()=>document.fonts.check('400 17px "Fira Sans"')),true);assert.equal(await p.evaluate(()=>document.fonts.check('500 70px "EB Garamond"')),true);
  assert.equal(await p.locator('h1').count(),1);assert.equal(await p.locator('.legal-content h2').count(),file==='impressum.html'?4:7);
  for(const size of[{width:1440,height:1000},{width:768,height:1024},{width:390,height:844},{width:320,height:740}]){
   await p.setViewportSize(size);
   for(const theme of['light','dark']){
    if(await p.evaluate(()=>document.documentElement.dataset.theme)!==theme)await p.locator('#theme-toggle').click();
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,JSON.stringify({file,size,theme}));
    const style=await p.locator('.legal-content').evaluate(e=>{const s=getComputedStyle(e);return{family:s.fontFamily,ligatures:s.fontVariantLigatures,numerals:s.fontVariantNumeric,align:s.textAlign};});assert.match(style.family,/Fira Sans/);assert.equal(style.ligatures,'common-ligatures');assert.equal(style.numerals,'oldstyle-nums proportional-nums');assert.equal(style.align,'left');
    await p.screenshot({path:'/private/tmp/rechtliches-'+file+'-'+size.width+'-'+theme+'.png',fullPage:size.width===1440});
   }
  }
  await p.locator('.contents summary').click();if(!await p.locator('.contents').evaluate(e=>e.open))await p.locator('.contents summary').click();const target=await p.locator('.contents nav a').last().getAttribute('href');await p.locator('.contents nav a').last().click();assert.equal(new URL(p.url()).hash,target);
 }
 // Die zuletzt gewählte Darstellung bleibt beim Wechsel und beim Neuladen bestehen.
 await p.goto(base+'impressum.html');assert.equal(await p.evaluate(()=>document.documentElement.dataset.theme),'dark');await p.reload();assert.equal(await p.evaluate(()=>document.documentElement.dataset.theme),'dark');
 const blocked=await browser.newPage();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}});});await blocked.goto(base+'datenschutz.html');await blocked.locator('#theme-toggle').click();assert.equal(await blocked.evaluate(()=>document.documentElement.dataset.theme),'dark');await blocked.close();
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:740}}),fallback=await nojs.newPage();await fallback.goto(base+'datenschutz.html');assert.equal(await fallback.locator('#theme-toggle').isVisible(),false);assert.equal(await fallback.locator('.legal-content h2').count(),7);assert.equal(await fallback.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await nojs.close();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(JSON.stringify({pages:2,viewports:4,themes:2,errors,external}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

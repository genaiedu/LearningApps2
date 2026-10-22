// Real museum image requests and real soundtrack; isolated synthetic gallery.
// No student profiles and no image-generation requests are used.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const pool=require('../data/kunstarchiv.json').works;
const url=process.env.KUNST_APP_URL||'https://genaiedu.github.io/LearningApps2/kunsttresor.html';
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[],failures=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));
  const gallery={version:1,liked:pool.slice(0,28).map(w=>({id:w.id,source:'curated',at:Date.now()})),film:{name:'Material und Blick',motto:'Ein eigener Blick verbindet verschiedene Werke.',items:pool.slice(0,8).map(w=>({id:w.id,caption:'custom',text:process.env.EMPTY_CAPTIONS?'':'Das Material prägt die Möglichkeiten der Gestaltung.',variant:0}))}};
  await page.addInitScript(g=>{if(window!==top||localStorage.getItem('film-qa-seeded'))return;localStorage.setItem('film-qa-seeded','yes');localStorage.setItem('kunsttresor-wall-gallery-v1',JSON.stringify(g));localStorage.setItem('kunsttresor-forgery-rare-enabled-v2','no');},gallery);
  await page.route('https://kunstkurator-dienst.vercel.app/**',route=>route.fulfill({status:503,json:{error:'disabled_in_playback_test'}}));
  await page.goto(url);await page.locator('#launch-skip').click();await page.locator('#start-game').click();await page.locator('#game-gallery').click();await page.locator('#gallery-edit-open').click();await page.locator('#gallery-play').click();
  try{await page.locator('#gallery-film-dialog').waitFor({state:'visible',timeout:3000});}
  catch(error){console.log('Film did not open:',await page.locator('#gallery-status').textContent());throw error;}
  await page.waitForFunction(()=>['gallery-film-start','gallery-film-silent','gallery-film-retry'].some(id=>!document.getElementById(id).hidden),{},{timeout:45000});
  console.log('Preparation:',await page.locator('#gallery-film-loading-text').textContent());
  assert.equal(await page.locator('#gallery-film-start').isVisible(),true,'real images and soundtrack must be ready');
  await page.locator('#gallery-film-start').click();await page.waitForFunction(()=>document.getElementById('gallery-film-loading').hidden);
  await page.waitForFunction(()=>document.getElementById('gallery-film-meter').value>1,{},{timeout:10000});
  assert.equal(await page.locator('#gallery-film-stage img').count(),1);assert.ok((await page.locator('#gallery-film-heading').textContent()).trim());
  await page.locator('#gallery-film-pause').click();await page.locator('#gallery-film-stop').click();assert.equal(await page.locator('#gallery-film-dialog').isVisible(),false);
  assert.deepEqual(errors,[]);console.log('PASS: actual museum images loaded, actual MP3 started, frames advance, pause and stop work. Failed requests:',JSON.stringify(failures));
 }catch(error){throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

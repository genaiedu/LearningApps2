// Real browser UI; synthetic isolated gallery, public catalogue IDs only.
// Set KUNST_LIVE_AI=yes explicitly for an actual model request. No learner API.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const pool=require('../data/kunstarchiv.json').works;
const url=process.env.KUNST_APP_URL||'http://127.0.0.1:8879/LearningApps2/kunsttresor.html',live=process.env.KUNST_LIVE_AI==='yes';
const samples=['Leonardo','Dürer','Hokusai','Monet','Rembrandt','Rodin','Evans','Greco'].map(name=>pool.find(w=>w.artist.includes(name)));
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[],requests=[],responses=[];
  page.on('pageerror',e=>errors.push(e.message));
  const gallery={version:1,liked:[...new Map([...samples,...pool.slice(0,28)].map(w=>[w.id,w])).values()].map(w=>({id:w.id,source:'curated',at:Date.now()})),film:{name:'Isolierter Redaktionstest',motto:'Eigenes Motto bleibt erhalten.',items:samples.map(w=>({id:w.id,caption:'both',text:'Mein bisheriger Text.',variant:0}))}};
  await page.addInitScript(g=>{if(window!==top||localStorage.getItem('film-qa-seeded'))return;localStorage.setItem('film-qa-seeded','yes');localStorage.setItem('kunsttresor-wall-gallery-v1',JSON.stringify(g));localStorage.setItem('kunsttresor-ai-consent-v2-wall','yes');localStorage.setItem('kunsttresor-ai-enabled-v1-wall','yes');localStorage.setItem('kunsttresor-forgery-rare-enabled-v2','no');},gallery);
  await page.route('**/api/state/**',()=>{throw Error('No learner profiles in this test');});
  await page.route('https://kunstkurator-dienst.vercel.app/api/forgery',r=>r.fulfill({status:503,json:{error:'disabled_in_test'}}));
  await page.route('https://kunstkurator-dienst.vercel.app/api/feedback',async route=>{
   const body=route.request().postDataJSON();assert.equal(body.kind,'film-caption');assert.deepEqual(Object.keys(body).sort(),['id','kind','position','variation','version','withMotto']);requests.push(body);
   if(live)return route.continue();
   return route.fulfill({json:{id:body.id,text:'Antwort 1: Ein neuer Blick beginnt beim Material, nicht erst beim fertigen Werk.'}});
  });
  page.on('response',async response=>{if(response.url()==='https://kunstkurator-dienst.vercel.app/api/feedback')try{responses.push({status:response.status(),body:await response.json()});}catch{}});
  await page.goto(url);await page.locator('#launch-skip').click();await page.locator('#start-game').click();await page.locator('#game-gallery').click();await page.locator('#gallery-edit-open').click();
  assert.equal(requests.length,0);assert.equal(await page.locator('[data-film-ai-work]').count(),8);
  const snapshot=()=>page.evaluate(()=>KunstLernstand.adapter.getSnapshot().gallery);
  const before=await snapshot();await page.locator('[data-film-ai-work]').nth(1).click();
  assert.equal(await page.locator('.film-edit-card').nth(1).locator('select').first().inputValue(),'custom');
  await page.waitForFunction(()=>document.getElementById('film-ai-cancel').hidden,{},{timeout:35000});
  const notice=await page.locator('#film-ai-status').textContent();assert.match(notice,/KI-Text für dieses Bild eingesetzt/,JSON.stringify(responses)+' '+notice);
  const after=await snapshot();assert.equal(requests.length,1);assert.equal(requests[0].id,samples[1].id);assert.equal(after.film.items[1].caption,'custom');assert.notEqual(after.film.items[1].text,before.film.items[1].text);assert.doesNotMatch(after.film.items[1].text,/^(Antwort|Vorschlag|Variante|Text)\s*\d*\s*:/i);assert.equal(after.film.motto,before.film.motto);
  for(let i=0;i<8;i++)if(i!==1)assert.deepEqual(after.film.items[i],before.film.items[i]);
  assert.equal(await page.locator('#film-selection textarea').nth(1).inputValue(),after.film.items[1].text);
  if(process.env.KUNST_LIVE_BULK==='yes'){
   await page.locator('#film-ai-generate').click();await page.waitForFunction(()=>document.getElementById('film-ai-cancel').hidden,{},{timeout:240000});
   const message=await page.locator('#film-ai-status').textContent();assert.match(message,/KI-Filmtexte eingesetzt/,JSON.stringify(responses)+' '+message);
   assert.equal(requests.length,9);const bulk=await snapshot();assert.ok(bulk.film.items.every(w=>w.caption==='custom'&&w.text!=='Mein bisheriger Text.'));Object.assign(after,bulk);
  }
  for(const width of [1400,390]){await page.setViewportSize({width,height:1000});await page.locator('.film-edit-card').nth(1).scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>{const d=document.getElementById('gallery-dialog');return d.scrollWidth>d.clientWidth;}),false);if(process.env.QA_SCREENSHOT_DIR)await page.screenshot({path:process.env.QA_SCREENSHOT_DIR+'/film-single-'+width+'.png'});}
  const requestCount=requests.length;await page.reload();await page.locator('#launch-read').click();await page.evaluate(()=>document.getElementById('game-gallery').click());await page.locator('#gallery-edit-open').click();assert.deepEqual((await snapshot()).film,after.film);assert.equal(requests.length,requestCount,'reload never generates');assert.deepEqual(errors,[]);
  console.log('PASS: '+(live?'REAL AI response':'mocked response')+' adopted into exactly one picture, other texts untouched, stored and restored after reload; desktop/mobile. '+JSON.stringify(responses));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

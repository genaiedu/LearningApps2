// Serve sibling LearningApps/LearningApps2 checkouts; run with Playwright on NODE_PATH.
// All profiles, responses and gallery entries are isolated synthetic test data.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const pool=require('../data/kunstarchiv.json').works;
const URL=process.env.KUNST_APP_URL||'http://127.0.0.1:8879/LearningApps2/kunsttresor.html';
const captions=['Ein Bild ist mehr als sein Motiv: Auch das Material prägt seine Wirkung.','Zwischen Handwerk und Vorstellung entsteht eine eigene Bildsprache.','Eine vertraute Tradition kann Raum für neue Entscheidungen lassen.','Was ein Material ermöglicht, begrenzt zugleich die Gestaltung.','Eine Bildfläche kann Tiefe andeuten, ohne selbst tief zu sein.','Künstlerische Entscheidungen hinterlassen mehr als sichtbare Spuren.','Die Zeitangabe ordnet ein Werk ein, erklärt aber nicht seine ganze Wirkung.','Den Zusammenhang dieser Werke bestimmt auch der Blick ihrer Betrachter.'];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:1100}}),errors=[];let filmRequests=0,release=null,hold=true,profileRequests=0,puts=0;
  page.on('pageerror',e=>errors.push(e.message));
  const gallery={version:1,liked:pool.slice(0,28).map(w=>({id:w.id,source:'curated',at:Date.now()})),film:{name:'Testfilm',motto:'Eigenes Schlussmotto',items:pool.slice(0,8).map(w=>({id:w.id,caption:'both',text:'Vorheriger eigener Text.',variant:0}))}};
  await page.addInitScript(g=>{if(window!==top||localStorage.getItem('film-qa-seeded'))return;localStorage.setItem('film-qa-seeded','yes');localStorage.setItem('kunsttresor-wall-gallery-v1',JSON.stringify(g));localStorage.setItem('kunsttresor-ai-consent-v2-wall','yes');localStorage.setItem('kunsttresor-ai-enabled-v1-wall','yes');},gallery);
  await page.route('**/*',async route=>{
   const r=route.request();if(r.resourceType()==='image'&&!r.url().startsWith(new globalThis.URL(URL).origin))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#aaa"/></svg>'});return route.continue();
  });
  await page.route('https://kunstkurator-dienst.vercel.app/api/feedback',async route=>{
   const body=route.request().postDataJSON();assert.equal(body.kind,'film');assert.deepEqual(Object.keys(body).sort(),['ids','kind','variation','version']);filmRequests++;
   if(hold)await new Promise(r=>release=r);
   await route.fulfill({json:{motto:'Ein gemeinsamer Blick auf verschiedene Materialien.',works:body.ids.map((id,i)=>({id,text:captions[i]}))}});
  });
  const remote={profileId:'profile-browser-synthetic',appId:'kunsttresor',revision:0,updatedAt:null,state:null};
  await page.route('https://learningapps-lerncode.spunky-snipe-1289.chatgpt.site/api/state/kunsttresor',async route=>{
   profileRequests++;const r=route.request();if(r.method()==='PUT'){const body=r.postDataJSON();assert.equal(body.baseRevision,remote.revision);remote.state=body.state;remote.revision++;remote.updatedAt=new Date().toISOString();puts++;}
   await route.fulfill({json:r.method()==='GET'?remote:{profileId:remote.profileId,appId:remote.appId,revision:remote.revision,updatedAt:remote.updatedAt}});
  });
  await page.goto(URL);await page.locator('#launch-skip').click();await page.locator('#start-game').click();await page.locator('#game-gallery').click();await page.locator('#gallery-edit-open').click();assert.equal(filmRequests,0);
  await page.locator('#film-ai-generate').click();await page.waitForFunction(()=>document.querySelector('#film-selection textarea')?.readOnly===true);
  assert.equal(await page.locator('#film-selection select').first().inputValue(),'custom');assert.equal(await page.locator('#film-selection textarea').first().isVisible(),true);assert.equal(await page.locator('#film-selection textarea').first().inputValue(),'Vorheriger eigener Text.');
  await page.waitForFunction(()=>document.getElementById('film-ai-cancel').hidden===false);while(!release)await new Promise(r=>setTimeout(r,10));hold=false;release();
  await page.waitForFunction(()=>document.querySelector('#film-selection textarea')?.value.startsWith('Ein Bild ist mehr'));
  assert.equal(filmRequests,1);assert.equal(await page.locator('#film-selection select').first().inputValue(),'custom');assert.equal(await page.locator('#gallery-motto').inputValue(),'Eigenes Schlussmotto');assert.equal(await page.locator('#film-ai-undo').isVisible(),true);
  await page.locator('#film-ai-undo').click();assert.equal(await page.locator('#film-selection select').first().inputValue(),'both');
  await page.locator('#film-ai-generate').click();await page.waitForFunction(()=>document.querySelector('#film-selection textarea')?.value.startsWith('Ein Bild ist mehr'));
  const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem(KunstLerncode.scopedKey('kunsttresor-wall-gallery-v1',KunstLerncode.storedProfileId()))));
  assert.ok((await stored()).film.items.every((item,i)=>item.caption==='custom'&&item.text===captions[i]));
  for(const width of [1400,390]){
   await page.setViewportSize({width,height:1100});await page.locator('.film-edit-card').first().scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>{const d=document.getElementById('gallery-dialog');return d.scrollWidth>d.clientWidth;}),false);
   if(process.env.QA_SCREENSHOT_DIR)await page.screenshot({path:process.env.QA_SCREENSHOT_DIR+'/film-direct-'+width+'.png'});
  }
  await page.setViewportSize({width:1400,height:1100});await page.locator('#film-selection textarea').first().fill('Mein bearbeiteter KI-Text.');assert.equal((await stored()).film.items[0].text,'Mein bearbeiteter KI-Text.');assert.equal(await page.locator('#film-ai-undo').isVisible(),false);
  await page.locator('#gallery-dialog [data-close="gallery-dialog"]').click();await page.locator('#open-save').click();await page.locator('#lerncode-input').fill('2'.repeat(26));await page.locator('#lerncode-connect').click();await page.locator('#lerncode-upload').click();await page.waitForFunction(()=>KunstLernstand.controller.getStatus().kind==='saved');
  const room=await page.evaluate(()=>KunstLernstand.adapter.getSnapshot().state.roomToken);assert.ok(room);assert.equal(puts,1);
  const device=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem(LearningProfile.deviceKey('kunsttresor')));return{enabled:s.enabled,profileId:s.profileId};});assert.equal(device.enabled,true);assert.equal(device.profileId,remote.profileId);
  const synced=structuredClone(remote.state);
  remote.state.gallery.film.items[0].text='Neuerer Text vom anderen Gerät.';remote.revision++;remote.updatedAt=new Date().toISOString();const before=profileRequests;
  await page.reload();
  try{await page.waitForFunction(()=>window.KunstLernstand?.controller.getStatus().kind==='saved',{},{timeout:10000});}
  catch(error){const local=await page.evaluate(()=>window.KunstLernstand?.adapter.getSnapshot());const differences=[];function compare(a,b,p=''){if(p==='savedAt')return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))compare(a[k],b[k],p?p+'.'+k:k);}else if(a!==b)differences.push({field:p,before:a,after:b});}compare(synced,local);console.log('Resume diagnostic',await page.evaluate(()=>({status:window.KunstLernstand?.controller.getStatus(),sameLocal:window.KunstLernstand?.adapter.getProfileId(),launch:document.getElementById('launch-dialog').open})),differences);throw error;}
  assert.ok(profileRequests>before);assert.equal(puts,1,'automatic resume must not overwrite newer cloud');assert.equal(await page.locator('#launch-dialog').isVisible(),true,'initial image/AI choice is not bypassed');
  assert.equal(await page.evaluate(()=>KunstLernstand.adapter.getSnapshot().state.roomToken),room);assert.equal(await page.evaluate(()=>KunstLernstand.adapter.getSnapshot().gallery.film.items[0].text),'Neuerer Text vom anderen Gerät.');assert.equal(await page.evaluate(()=>KunstLernstand.controller.getStatus().enabled),true);
  await page.locator('#launch-read').click();await page.evaluate(()=>document.getElementById('game-gallery').click());await page.locator('#gallery-edit-open').click();assert.equal(await page.locator('#film-selection textarea').first().inputValue(),'Neuerer Text vom anderen Gerät.');assert.equal(filmRequests,2,'reload never generates AI texts');
  await page.locator('#gallery-dialog [data-close="gallery-dialog"]').click();await page.evaluate(()=>KunstLernstand.controller.disconnect());await page.reload();await page.waitForFunction(()=>window.KunstLernstand);assert.equal(await page.evaluate(()=>KunstLernstand.controller.getStatus().enabled),false);assert.equal(await page.evaluate(()=>localStorage.getItem(LearningProfile.deviceKey('kunsttresor'))),null);
  assert.deepEqual(errors,[]);console.log('PASS: direct editable/saved AI texts, undo, desktop/mobile layout, remembered connection, automatic newest-cloud resume, unchanged room, start consent, logout. Synthetic profile and mocked providers only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

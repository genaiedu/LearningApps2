const {chromium, webkit} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.APP_URL || 'http://127.0.0.1:8879/LearningApps2/moderatorenproblem.html';
const out = path.join(__dirname, '../tmp');fs.mkdirSync(out, {recursive:true});

(async()=>{
  const browser = await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || 'chrome'});
  const page = await browser.newPage({viewport:{width:1366,height:1024},deviceScaleFactor:1});
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.goto(base);await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('#demo-doors .door-button').count(),3);
  assert.equal(await page.locator('#demo-doors .scene').count(),0,'No hidden prize markup before reveal');
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  await page.locator('#demo-doors .door-button').nth(0).click();
  await page.getByRole('button',{name:'Moderator öffnet ein Tor',exact:true}).click();
  await page.locator('#demo-actions button').first().waitFor();
  assert.equal(await page.locator('#demo-doors .open').count(),1);
  assert.match(await page.locator('#demo-doors .open .door-button').getAttribute('aria-label'),/Zonk/);
  await page.locator('#demo-actions button').last().click();
  await page.getByRole('button',{name:'Noch eine Runde',exact:true}).waitFor();
  await page.screenshot({path:path.join(out,'opened.png'),fullPage:true});
  assert.equal(await page.locator('#demo-doors .open').count(),3);
  await page.getByRole('button',{name:'Noch eine Runde',exact:true}).click();
  assert.equal(await page.locator('#demo-doors .open').count(),0);
  await page.locator('#fullscreen').click();
  assert.equal(await page.locator('#fullscreen').getAttribute('aria-pressed'),'true');
  await page.screenshot({path:path.join(out,'fullscreen.png')});
  const full=await page.locator('#spiel').boundingBox();assert.ok(full.height>1000);
  await page.locator('#fullscreen').click();
  await page.emulateMedia({reducedMotion:'reduce'});
  for(let i=0;i<20;i++){
    await page.locator('#lab-doors .door-button').nth(i%3).click();
    await page.locator('#lab-actions button').click();
    await page.locator('#lab-actions button').waitFor();
    const decision=await page.locator('#lab-actions button').innerText();
    assert.match(decision,i<10?/wechseln/:/bleiben/);
    await page.locator('#lab-actions button').click();
    await page.locator('#lab-actions button').waitFor();
    const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('learningapps2.monty.lab.v1')));
    assert.equal(stored.switch.length+stored.stay.length,i+1);
    await page.locator('#lab-actions button').click();
  }
  assert.equal(await page.locator('#lab-summary').isVisible(),true);
  assert.equal(await page.locator('#erklaerung').isVisible(),false);
  const records=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('learningapps2.monty.lab.v1')));
  for(const key of ['switch','stay']){
    const wins=records[key].filter(r=>r.won).length;
    assert.equal(await page.locator(`#result-${key} .result-ratio`).innerText(),`${wins} / 10`);
    for(const r of records[key]){assert.notEqual(r.opened,r.first);assert.notEqual(r.opened,r.prize);assert.equal(r.won,r.final===r.prize);assert.equal(r.final===r.first,key==='stay');}
  }
  await page.locator('#show-explanation').click();await page.locator('#simulate').click();
  assert.match(await page.locator('#simulation-result').innerText(),/1.000 gemeinsame Auslosungen/);
  await page.screenshot({path:path.join(out,'results.png'),fullPage:true});
  const downloadPromise=page.waitForEvent('download');await page.locator('#export-results').click();
  const download=await downloadPromise;await download.saveAs(path.join(out,'protocol.txt'));
  assert.match(fs.readFileSync(path.join(out,'protocol.txt'),'utf8'),/IMMER WECHSELN[\s\S]*IMMER BLEIBEN/);
  await page.reload();assert.equal(await page.locator('#lab-summary').isVisible(),true);
  await page.locator('#backstage summary').click();
  await page.locator('.gallery .prize-scene').first().waitFor();
  assert.equal(await page.locator('.gallery .prize-scene').count(),10);
  assert.equal(await page.locator('.gallery .zonk-scene').count(),10);
  await page.locator('#backstage').screenshot({path:path.join(out,'gallery.png')});
  for(const width of [375,768,1024]){
    await page.setViewportSize({width,height:width===1024?768:1024});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No horizontal overflow at ${width}`);
    await page.screenshot({path:path.join(out,`width-${width}.png`),fullPage:true});
  }
  page.on('dialog',d=>d.accept());await page.locator('#reset-lab').click();
  assert.equal(await page.locator('#lab-summary').isVisible(),false);
  assert.equal(await page.locator('#lab-doors .open').count(),0);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  await browser.close();
  console.log('PASS Chromium: full game, twenty trials, protocol, restore/reset, ten prizes/ten bird Zonks, fullscreen and responsive layouts.');
  let safari;
  try { safari=await webkit.launch({headless:true}); }
  catch(e){console.log('WebKit unavailable: '+e.message.split('\n')[0]);return;}
  const ipad=await safari.newPage({viewport:{width:820,height:1180},isMobile:true,hasTouch:true});
  const safariErrors=[];ipad.on('pageerror',e=>safariErrors.push(e.message));
  await ipad.goto(base);await ipad.locator('#fullscreen').click();
  assert.equal(await ipad.locator('#fullscreen').getAttribute('aria-pressed'),'true');
  await ipad.locator('#demo-doors .door-button').nth(1).click();await ipad.locator('#demo-actions button').click();
  await ipad.locator('#demo-actions button').first().waitFor();await ipad.locator('#demo-actions button').first().click();
  await ipad.getByRole('button',{name:'Noch eine Runde',exact:true}).waitFor();
  await ipad.screenshot({path:path.join(out,'ipad-webkit.png')});
  assert.deepEqual(safariErrors,[]);await safari.close();console.log('PASS WebKit touch/iPad viewport: full game and fullscreen/fallback.');
})().catch(e=>{console.error(e);process.exit(1);});

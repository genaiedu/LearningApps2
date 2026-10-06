/* Run with the bundled Playwright runtime on NODE_PATH. No remote images are downloaded. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const data=require('../scripts/wetterwelten-inhalte.js');
const root=path.resolve(__dirname,'../..');
assert.equal(data.groups.length,8);
assert.equal(data.projects.length,14);
assert.equal(data.projects.filter(p=>p.scope.startsWith('Kleineres')).length,8);
assert.equal(Object.keys(data.media).length,19);
const tasks=data.groups.flatMap(g=>g.tasks);
assert.equal(tasks.length,80);
assert.equal(new Set(tasks.map(t=>t.id)).size,80);
assert.equal(new Set(tasks.map(t=>t.prompt)).size,80);
for(const g of data.groups){assert.equal(g.tasks.length,10);for(const t of g.tasks){assert.ok(t.explanation&&t.hint);if(t.type!=='number'){assert.ok(t.correct.length);t.correct.forEach(i=>assert.ok(i>=0&&i<t.options.length));}}}
for(const m of Object.values(data.media)){assert.ok(m.date&&m.credit&&m.license&&m.source);const u=new URL(m.url);assert.ok(['upload.wikimedia.org','assets.science.nasa.gov'].includes(u.hostname));}
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,body)=>{if(e){res.writeHead(404).end();return;}const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(body);});});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port+'/LearningApps2/wetterwelten-labor.html';
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',request=>{if(request.url().startsWith('https://'))requests.push(request.url());});
    await page.route(/^https:\/\//,route=>{if(route.request().url().includes('/w/api.php'))return route.fulfill({contentType:'application/json',body:JSON.stringify({parse:{title:'Testartikel',revid:123,text:'<div class="mw-parser-output"><p>Fachtext</p><span class="mwe-math-element"><math><mi>x</mi></math></span></div>'}})});return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#638d82"/></svg>'});});
    await page.goto(url);await page.waitForTimeout(150);
    assert.equal(await page.locator('#consent').evaluate(e=>e.open),true);
    assert.equal(requests.length,0,'no external requests before consent');
    await page.locator('#consent [value=offline]').click();
    assert.equal(await page.locator('.task').count(),24);
    assert.equal(await page.locator('.project').count(),14);
    assert.equal(await page.locator('#team-topic option').count(),15);
    assert.equal(await page.locator('#projects .project').filter({hasText:'Kleineres Einzelprojekt'}).count(),8);
    assert.equal(await page.locator('#image-credits article').count(),19);
    assert.equal(requests.length,0,'offline mode makes no external requests');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('#lottery-result tbody tr').count(),0);
    for(const count of [1,2,6,14,26,6]){await page.locator('#lottery-count').fill(String(count));await page.locator('#lottery-draw').click();const result=await page.locator('#lottery-result tbody tr').evaluateAll(rows=>rows.map(r=>[r.querySelector('th').textContent,r.querySelector('td').textContent]));assert.equal(result.length,count);assert.deepEqual(result.map(r=>r[0]),Array.from({length:count},(_,i)=>'Gruppe '+(i+1)));assert.deepEqual(result.map(r=>r[1]).sort(),Array.from({length:count},(_,i)=>'Thema '+String.fromCharCode(65+i)));}
    const lottery=await page.locator('#lottery-result').textContent();
    for(const value of ['0','27','2.5','']){await page.locator('#lottery-count').fill(value);await page.locator('#lottery-draw').click();assert.equal(await page.locator('#lottery-result').textContent(),lottery,'invalid count does not replace the distribution');}
    const ids=await page.locator('.task').evaluateAll(xs=>xs.map(x=>x.id));
    const selectedIds=ids.map(x=>x.slice(5));
    assert.equal(new Set(selectedIds).size,24);
    for(const group of data.groups)assert.equal(selectedIds.filter(id=>id.startsWith(group.id+'-')).length,3);
    const core=await page.evaluate(()=>window.WetterWelten.groups.flatMap(g=>g.tasks).map(t=>({id:t.id,right:WetterWeltenTest.answerCorrect(t,t.type==='number'?String(t.answer):t.correct),wrong:WetterWeltenTest.answerCorrect(t,t.type==='number'?'':[])})));
    assert.ok(core.every(x=>x.right&&!x.wrong),'all task keys and blank answers');
    const t=tasks.find(t=>selectedIds.includes(t.id)&&t.type==='single');
    const card=page.locator('#task-'+t.id);
    await card.locator('input[value="1"]').check();await card.locator('button[type=submit]').click();
    await assert.match(await page.locator('#task-'+t.id+' .feedback').textContent(),/zweiter Versuch/);
    await page.locator('#task-'+t.id+' input[value="0"]').check();await page.locator('#task-'+t.id+' button[type=submit]').click();
    assert.match(await page.locator('#points').textContent(),/0,5/);
    await page.locator('[data-note=question]').fill('Wie wird aus einem globalen Muster eine lokale Folge?');
    await page.locator('#quality-checks input').first().check();
    await page.reload();await page.locator('#consent [value=offline]').click();
    assert.equal(await page.locator('#lottery-result').textContent(),lottery,'lottery survives reload');assert.equal(await page.locator('#lottery-count').inputValue(),'6');
    assert.deepEqual(await page.locator('.task').evaluateAll(xs=>xs.map(x=>x.id)),ids,'same saved round');
    assert.match(await page.locator('#points').textContent(),/0,5/);
    assert.equal(await page.locator('[data-note=question]').inputValue(),'Wie wird aus einem globalen Muster eine lokale Folge?');
    await page.locator('#new-round').click();assert.equal(await page.locator('#reset-dialog').evaluate(e=>e.open),true);await page.locator('#reset-dialog [value=confirm]').click();
    assert.equal(await page.locator('#points').textContent(),'0 / 24 XP');
    assert.equal(await page.locator('#lottery-result').textContent(),lottery,'new quiz round preserves lottery');
    assert.notDeepEqual(await page.locator('.task').evaluateAll(xs=>xs.map(x=>x.id)),ids,'fresh round');
    assert.equal(await page.locator('[data-note=question]').inputValue(),'Wie wird aus einem globalen Muster eine lokale Folge?','round preserves notes');
    const round=await page.locator('.task').evaluateAll(xs=>xs.map(x=>x.id.slice(5)));
    for(const id of round){const t=tasks.find(x=>x.id===id),card=page.locator('#task-'+id);if(t.type==='number')await card.locator('input').fill(String(t.answer).replace('.',','));else if(t.type==='order'){for(let desired=0;desired<t.options.length;desired++){let order=await card.locator('.order-item').evaluateAll(xs=>xs.map(x=>x.querySelector('span').textContent.replace(/^\d+\./,'')));let pos=order.findIndex(text=>text===t.options[desired]);while(pos>desired){await card.locator('.order-item').nth(pos).locator('button').first().click();pos--;}}}else for(const i of t.correct)await card.locator('input[value="'+i+'"]').check();await card.locator('button[type=submit]').click();}
    assert.equal(await page.locator('#points').textContent(),'24 / 24 XP');
    assert.equal(await page.locator('.badge:not(.locked)').count(),8);
    assert.match(await page.locator('#quiz-summary').textContent(),/Runde abgeschlossen/);
    await page.locator('#sun-angle').fill('30');assert.match(await page.locator('#sun-result').textContent(),/50 %/);
    await page.locator('[data-hemi=south]').click();assert.match(await page.locator('#wind-result').textContent(),/im Uhrzeigersinn/);
    await page.locator('[data-enso=nino]').click();assert.match(await page.locator('#enso-result').textContent(),/El Niño/);
    await page.locator('[data-season=january]').click();assert.match(await page.locator('#season-result').textContent(),/Winter/);
    await page.locator('[data-full=wind-model]').click();await page.waitForFunction(()=>document.fullscreenElement?.id==='wind-model');await page.locator('[data-full=wind-model]').click();await page.waitForFunction(()=>!document.fullscreenElement);
    await page.locator('#wiki-settings').click();await page.locator('#consent [value=allow]').click();await page.locator('#start').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.hero-photo img')?.naturalWidth>0);assert.ok(requests.length>0,'images only after permission');
    await page.locator('[data-wiki=Corioliskraft]').click();await page.waitForFunction(()=>document.querySelector('#wiki-content').textContent.includes('Fachtext'));assert.equal(await page.locator('#wiki-reader').evaluate(e=>e.open),true);assert.ok(await page.locator('#wiki-content math').count()>0);await page.locator('#wiki-close').click();
    await page.locator('.hero-photo .photo-zoom').click();assert.equal(await page.locator('#photo-view').evaluate(e=>e.open),true);await page.locator('#photo-close').click();
    await page.locator('#wiki-revoke').click();assert.equal(await page.locator('main img').count(),0);await page.waitForFunction(()=>document.querySelector('#privacy-status').textContent.includes('nicht freigegeben'));
    const before=requests.length;await page.locator('[data-hemi=north]').click();await page.waitForTimeout(100);assert.equal(requests.length,before,'no new external loads after revoke');
    await page.locator('#theme').click();assert.equal(await page.locator('body').getAttribute('data-theme'),'dark');
    await page.setViewportSize({width:390,height:500});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('#navigation summary').click();await page.locator('#navigation').evaluate(n=>n.scrollTop=n.scrollHeight);const scrollable=await page.locator('#navigation').evaluate(n=>n.scrollHeight>n.clientHeight&&n.scrollTop>0);assert.ok(scrollable,'small-screen contents scrolls');
    await page.locator('#navigation summary').click();
    await page.locator('#reset').click();await page.locator('#reset-dialog [value=confirm]').click();assert.equal(await page.locator('[data-note=question]').inputValue(),'');assert.equal(await page.locator('#points').textContent(),'0 / 24 XP');assert.equal(await page.locator('body').getAttribute('data-theme'),'light');assert.equal(await page.locator('#quality-checks input:checked').count(),0);
    assert.equal(await page.locator('#lottery-result tbody tr').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('wetterwelten:v1:lottery')),null,'full reset clears saved lottery');
    assert.deepEqual(errors,[]);
    console.log('WetterWelten: 80 task keys, 24/80 draw, scoring, persistence, reset, 14 projects, media consent/revocation, reader math, models and mobile navigation passed.');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.jpg':'image/jpeg','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(err?'Not found':data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[],foreign=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text());});page.on('request',r=>{if(!r.url().startsWith(origin))foreign.push(r.url());});
  await page.route('https://**/*',r=>r.abort());
  await page.goto(origin+'/LearningApps2/schroedinger-labor.html');
  await page.waitForTimeout(1500);console.log('Startup:',await page.evaluate(()=>({consent:document.querySelector('#consent').open,formulas:document.querySelectorAll('mjx-container').length,math:typeof MathJax,lessons:document.querySelectorAll('.lesson-step').length})));await page.screenshot({path:'/tmp/schroedinger-startup.png'});
  await page.waitForFunction(()=>document.querySelector('#consent').open&&document.querySelectorAll('mjx-container').length>1);
  await page.evaluate(()=>MathJax.startup.promise);console.log('Rendered formulas:',await page.locator('mjx-container').count(),'Errors:',errors);
  assert.equal(foreign.length,0);assert.equal(await page.locator('mjx-merror').count(),0);
  await page.locator('#consent button[value=offline]').click();
  assert.equal(await page.locator('.energy-choice').count()>10,true);
  await page.locator('[data-lesson=box] .lesson-next').click();assert.match(await page.locator('[data-lesson=box] .lesson-count').innerText(),/2 von 12/);
  await page.locator('[data-lesson=box] .lesson-all').click();assert.equal(await page.locator('[data-lesson=box] .lesson-step:visible').count(),12);
  await page.locator('[data-lesson=box] .lesson-all').click();
  await page.locator('#box-energy [data-level="3"]').click();assert.equal(await page.locator('#box-n').inputValue(),'3');
  await page.locator('#osc-energy [data-level="4"]').click();assert.equal(await page.locator('#osc-n').inputValue(),'4');
  await page.locator('#well-depth').evaluate(el=>{el.value='.2';el.dispatchEvent(new Event('input'));});assert.equal(await page.locator('#well-state option').count(),1);
  await page.locator('#well-depth').evaluate(el=>{el.value='8';el.dispatchEvent(new Event('input'));});assert.equal(await page.locator('#well-state option').count()>3,true);
  assert.equal(await page.locator('#hydrogen-derivation').getAttribute('open'),null);
  await page.locator('#hydrogen-derivation summary').click();await page.locator('[data-lesson=hydrogen] .lesson-all').click();assert.equal(await page.locator('[data-lesson=hydrogen] mjx-merror').count(),0);
  await page.locator('#hydrogen-derivation summary').click();
  await page.locator('#quiz form').first().locator('input[value="1"]').check();await page.locator('#quiz form').first().locator('button').click();assert.equal(await page.locator('#quiz form').first().locator('.quiz-feedback').isVisible(),true);
  await page.locator('#string-motion').click();const before=await page.locator('#string-path').getAttribute('d');await page.waitForTimeout(120);assert.notEqual(await page.locator('#string-path').getAttribute('d'),before);await page.locator('#string-motion').click();
  await page.locator('#string-sound').click();await page.waitForFunction(()=>document.querySelector('#string-sound').getAttribute('aria-pressed')==='true');await page.keyboard.press('Escape');assert.equal(await page.locator('#string-sound').getAttribute('aria-pressed'),'false');
  await page.locator('[data-fullscreen="box-lab"]').click();await page.waitForFunction(()=>document.fullscreenElement?.id==='box-lab'||document.querySelector('#box-lab').classList.contains('fullscreen-fallback'));await page.locator('[data-fullscreen="box-lab"]').click();
  await page.evaluate(()=>Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined,configurable:true}));await page.locator('[data-fullscreen="well-lab"]').click();assert.equal(await page.locator('#well-lab').evaluate(el=>el.classList.contains('fullscreen-fallback')),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#well-lab').evaluate(el=>el.classList.contains('fullscreen-fallback')),false);
  for(const [width,height] of [[1600,1100],[1280,800],[768,1024],[390,844]]){
   await page.setViewportSize({width,height});for(const dark of [false,true]){await page.evaluate(d=>document.body.classList.toggle('dark',d),dark);await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'horizontal page overflow at '+width);await page.screenshot({path:'/tmp/schroedinger-'+width+'-'+(dark?'dark':'light')+'.png'});}
  }
  await page.setViewportSize({width:1400,height:1100});await page.evaluate(()=>{document.body.classList.remove('dark');document.body.classList.add('collapsed');document.querySelector('#box-n').value=3;document.querySelector('#box-n').dispatchEvent(new Event('input'));});
  await page.locator('#box-lab').screenshot({path:path.join(root,'LearningApps2/images/schroedinger-labor-vorschau.jpg'),type:'jpeg',quality:90});
  assert.equal(foreign.length,0,'offline mode contacts external providers');assert.deepEqual(errors,[]);
  console.log('PASS mathematics render, controls, audio opt-in, fullscreens, 8 layouts, offline privacy');
  // Deterministic permission and sanitization checks with untrusted Wikipedia payload.
  await page.unroute('https://**/*');
  if(process.argv.includes('--wiki-live')){
   await page.evaluate(()=>document.body.classList.remove('collapsed'));await page.locator('#wiki-settings').click();await page.locator('#consent button[value=allow]').click();
   await page.waitForFunction(()=>[...document.querySelectorAll('.portrait')].every(el=>el.querySelector('img')||el.textContent.includes('momentan')),{},{timeout:25000});
   console.log('Live Wikimedia:',await page.locator('.portrait').allTextContents(),'loaded:',await page.locator('.portrait img').count());assert.equal(await page.locator('.portrait img').count(),3);
   await page.locator('[data-wiki="Solvay-Konferenz"]').click();await page.waitForFunction(()=>document.querySelector('#wiki-content').textContent.includes('Solvay'),{},{timeout:25000});assert.equal(await page.locator('#wiki-content img').count()>0,true);await page.locator('#wiki-close').click();await page.locator('#wiki-revoke').click();console.log('PASS live portraits and Solvay reader');
  }
  await page.route('https://commons.wikimedia.org/w/api.php**',r=>r.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:{query:{pages:[{categories:[],imageinfo:[{url:'https://upload.wikimedia.org/test-portrait.png',descriptionurl:'https://commons.wikimedia.org/wiki/File:Test.png',extmetadata:{LicenseShortName:{value:'Public domain'},Artist:{value:'Historisches Archiv'}}}]}]}}}));
  await page.route('https://upload.wikimedia.org/**',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4iMAAAAASUVORK5CYII=','base64')}));
  await page.route('https://de.wikipedia.org/w/api.php**',r=>r.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:{parse:{title:'Testartikel',revid:42,text:'<div class="mw-parser-output"><p onclick="window.attack=1">Geprüfter Inhalt</p><script>window.attack=1</script><img src="https://evil.test/track.png"><iframe src="https://evil.test"></iframe><a href="/wiki/Atomorbital">Weiter im Fenster</a></div>'}}}));
  await page.evaluate(()=>document.body.classList.remove('collapsed'));await page.locator('#wiki-settings').click();await page.locator('#consent button[value=allow]').click();await page.waitForFunction(()=>document.querySelectorAll('.portrait img').length===3);
  await page.locator('[data-wiki="Atomorbital"]').first().click();await page.waitForFunction(()=>document.querySelector('#wiki-content').textContent.includes('Geprüfter Inhalt'));
  assert.equal(await page.locator('#wiki-content script, #wiki-content iframe, #wiki-content [onclick], #wiki-content img').count(),0);assert.equal(await page.evaluate(()=>window.attack),undefined);
  await page.locator('#wiki-content a').click();await page.waitForFunction(()=>document.querySelector('#wiki-status').textContent.includes('bleiben in diesem Fenster'));await page.locator('#wiki-close').click();
  await page.locator('#wiki-revoke').click();assert.equal(await page.locator('.portrait img').count(),0);const count=foreign.length;await page.locator('[data-wiki="Atomorbital"]').first().click();assert.equal(await page.locator('#consent').evaluate(el=>el.open),true);await page.locator('#consent button[value=offline]').click();assert.equal(foreign.length,count);assert(!foreign.some(url=>url.includes('evil.test')));assert.deepEqual(errors,[]);console.log('PASS consent, in-window links, injection filtering, revocation');
  // Capture a real local view of the Bohr lab for the chemistry recommendation.
  await page.goto(origin+'/LearningApps/bohrsches-atommodell.html');await page.locator('[data-external-media-decline]').click();await page.waitForFunction(()=>document.querySelector('#energySvg').childElementCount>0);await page.locator('#lab-jump').click();await page.waitForTimeout(1400);await page.locator('#spectrum-lab').screenshot({path:path.join(root,'LearningApps/images/bohr-mission-vorschau.jpg'),type:'jpeg',quality:90});
  console.log('PASS preview assets created from the actual apps');
  for(const [file,gate,id,target] of [['LearningApps/bohrsches-atommodell.html','[data-external-media-decline]','#weiter-chemie','periodensystem-wertigkeiten.html'],['LearningApps/periodensystem-wertigkeiten.html','[data-external-media-decline]','#weiter-physik','bohrsches-atommodell.html'],['LearningApps2/orbital-labor.html','#wiki-start-dialog button[value=offline]','#weiter-physik','schroedinger-labor.html']]){
   await page.goto(origin+'/'+file);if(await page.locator(gate).isVisible())await page.locator(gate).click();const card=page.locator(id);assert.equal(await card.locator('a.app-recommendation').getAttribute('href'),target);assert.match(await card.innerText(),/Fächerübergreifend/i);
   for(const width of [1400,390]){await page.setViewportSize({width,height:1000});for(const dark of [false,true]){await page.evaluate(d=>{document.body.classList.toggle('dark',d);document.documentElement.dataset.theme=d?'dark':'light';},dark);await card.scrollIntoViewIfNeeded();await page.waitForFunction(selector=>document.querySelector(selector+' img').naturalWidth>0,id);assert.equal(await card.locator('a.app-recommendation').evaluate(el=>getComputedStyle(el).display),'grid');await card.screenshot({path:'/tmp/'+file.split('/')[1]+'-'+width+'-'+dark+'.png'});assert.equal(await card.evaluate(el=>{const b=el.getBoundingClientRect();return b.width<=innerWidth+1&&b.left>=-1&&b.right<=innerWidth+1;}),true,'recommendation overflow '+file+' '+width);}}
  }
  console.log('PASS reciprocal end cards, preview images and mobile/light/dark layouts');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

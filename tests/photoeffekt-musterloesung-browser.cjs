const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const name='musterloesung-photoeffekt-ph-gk-q2.html';
const base=process.env.PHOTOEFFEKT_QA_BASE;
const server=http.createServer((req,res)=>{
  const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
  assert(process.env.LEARNINGAPPS_VAULT_PASSWORD,'Provide the vault code in the process environment; never save it in test files.');
  const html=fs.readFileSync(path.join(root,'LearningApps2',name),'utf8');
  assert.match(html,/noindex,nofollow/);assert.doesNotMatch(html,/\/Fonts\/|src="Ls\//);
  for(const file of ['LearningApps/materialien.html','LearningApps2/index.html']){
    const text=fs.readFileSync(path.join(root,file),'utf8');assert.equal(text.includes(name),false,'No public overview link');
  }
  // Existing encrypted materials and all their access codes remain unchanged.
  const vm=require('node:vm'),C=require(path.join(root,'LearningApps/protected-materials-crypto.js'));
  const record=text=>{const ctx={};vm.runInNewContext(text,ctx);return ctx.ProtectedMaterialsData;};
  const before=record(execFileSync('git',['show','HEAD:protected-materials-data.js'],{cwd:path.join(root,'LearningApps'),encoding:'utf8'}));
  const after=record(fs.readFileSync(path.join(root,'LearningApps/protected-materials-data.js'),'utf8'));
  for(const key of Object.keys(before).filter(key=>key!=='catalogue'))assert.equal(JSON.stringify(after[key]),JSON.stringify(before[key]));
  const password=process.env.LEARNINGAPPS_VAULT_PASSWORD;
  const catalogue=JSON.parse(new TextDecoder().decode(await C.open('catalogue',after.catalogue,password)));
  const prior=JSON.parse(new TextDecoder().decode(await C.open('catalogue',before.catalogue,password)));
  const href='https://genaiedu.github.io/LearningApps2/'+name;
  assert.deepEqual(catalogue.apps.filter(a=>a.href!==href),prior.apps.filter(a=>a.href!==href));
  assert.equal(catalogue.apps.filter(a=>a.href===href).length,1);
  if(!base)await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const host=base||'http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],bad=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url());});
    await page.goto(host+'/LearningApps/passwoerter.html');
    assert.equal(await page.locator('[data-password-list] a').count(),0,'Link not visible before unlocking');
    await page.locator('#vaultPassword').fill('incorrect-test-code');await page.locator('.protected-unlock button').click();
    await page.waitForFunction(()=>document.querySelector('#passwordVault [role=status]').textContent.includes('passt nicht'));
    assert.equal(await page.locator('[data-password-list] a').count(),0);
    await page.locator('#vaultPassword').fill(password);await page.locator('.protected-unlock button').click();
    await page.locator('[data-password-content]').waitFor({state:'visible'});
    assert.equal(await page.locator('[data-password-list] a[href="'+href+'"]').count(),1);
    assert.equal(await page.locator('[data-password-list] a[href="'+href+'"]').textContent(),'Musterlösung zum Photoeffekt öffnen');
    assert.equal(await page.locator('.password-entry').count(),prior.apps.reduce((n,a)=>n+a.entries.length,0));
    await page.locator('[data-lock-vault]').click();assert.equal(await page.locator('[data-password-list] a').count(),0);
    await page.goto(host+'/LearningApps2/'+name);await page.evaluate(()=>document.fonts.ready);
    assert.match(await page.title(),/Musterlösung.*Photoeffekt/);
    assert.ok(await page.locator('svg.lucide').count()>0,'Icons load');
    assert.ok(await page.evaluate(()=>document.fonts.check('700 20px Poppins')&&document.fonts.check('400 20px Inter')));
    const slides=await page.locator('.slide').count();assert.ok(slides>25);
    await page.locator('#btn-next').click();assert.equal(await page.locator('.slide.active').getAttribute('data-badge'),'Vorab');
    await page.locator('#btn-all').click();
    assert.equal(await page.locator('.slide.active .step:not(.shown)').count(),0);
    await page.locator('#btn-ov').click();assert.equal(await page.locator('.ov.open').count(),1);
    const index=await page.locator('.slide').evaluateAll(nodes=>nodes.findIndex(s=>s.dataset.badge==='1.5'));
    await page.locator('.ov-item[data-idx="'+index+'"]').click();
    assert.match(await page.locator('.slide.active').textContent(),/maximale Helligkeit/);
    await page.locator('#btn-dark').click();assert.equal(await page.locator('body.dark').count(),1);
    await page.locator('#btn-full').click();await page.waitForFunction(()=>!!document.fullscreenElement);
    await page.locator('#btn-full').click();await page.waitForFunction(()=>!document.fullscreenElement);
    for(const viewport of [{width:1600,height:1000},{width:1024,height:768},{width:844,height:390},{width:390,height:844}]){
      await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    }
    await page.setViewportSize({width:1600,height:1000});await page.locator('#btn-dark').click();
    if(!base)await page.screenshot({path:'/private/tmp/photoeffekt-musterloesung-published-preview.png'});
    assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
    console.log('PASS: existing vault entries/documents preserved, link only after unlock, wrong code/lock, fonts/icons, presentation steps/overview/fullscreen/theme and four viewport sizes.');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});

const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const p=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[],bad=[],requests=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push([r.url(),r.status()]);});p.on('request',r=>requests.push(r.url()));
  await p.goto('https://genaiedu.github.io/LearningApps2/mo-rechenlabor.html',{waitUntil:'domcontentloaded'});
  await p.getByRole('button',{name:'Ohne externe Inhalte starten',exact:true}).click();await p.waitForFunction(()=>!document.getElementById('calculate').disabled,{},{timeout:30000});
  await p.locator('[data-smiles="O"]').click();await p.locator('#calculate').click();await p.waitForFunction(()=>MOApp.result&&!MOApp.busy,{},{timeout:90000}).catch(async e=>{console.log('Status',await p.locator('#job-status').textContent());throw e;});
  const q=await p.evaluate(()=>({energy:MOApp.result.energy,n:MOApp.result.n,states:MOApp.result.states.length,elapsed:MOApp.result.elapsedMs}));console.log('Live water calculation',q);assert.equal(q.n,7);assert.equal(q.states,10);assert.ok(q.energy<-74.9);assert.ok(Number(await p.locator('#orbital-view').getAttribute('data-triangles'))>100);
  await p.locator('#show-lumo').click();await p.waitForFunction(()=>!MOApp.busy);assert.equal(await p.locator('#orbital-view').getAttribute('data-orbital'),'5');await p.locator('#tab-spectrum').click();assert.equal(await p.locator('#transitions tr').count(),10);
  await p.screenshot({path:'/tmp/mo-live-browser.png'});assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.ok(requests.every(url=>url.startsWith('https://genaiedu.github.io/')||url.startsWith('blob:')||url.startsWith('data:')),'no external content without consent');
  // Test Wikipedia workflow with a deterministic API fixture, not a live
  // third-party request. No images or article contents fetched externally.
  await p.route('https://de.wikipedia.org/w/api.php**',route=>route.fulfill({json:{parse:{title:'Hartree-Fock-Methode',revid:1,text:'<div class="mw-parser-output"><p>Testartikel</p><script>alert(1)</script></div>'}}}));
  await p.locator('[data-wiki="Hartree-Fock-Methode"]').click();await p.locator('#consent[open]').waitFor();await p.getByRole('button',{name:'Wikipedia erlauben und starten',exact:true}).click();await p.locator('#wiki-reader[open]').waitFor();await p.getByText('Testartikel',{exact:true}).waitFor();assert.equal(await p.locator('#wiki-content script').count(),0);await p.locator('#wiki-close').click();
  const response=await p.request.get('https://genaiedu.github.io/LearningApps2/orbital-labor.html');assert.ok((await response.text()).includes('href="mo-rechenlabor.html"'));
  console.log('PASS published app, hosted WASM/force field, actual MO/CIS, privacy, Wikipedia consent/reader and reciprocal link');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

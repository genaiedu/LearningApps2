const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':({'.js':'text/javascript','.wasm':'application/wasm','.html':'text/html','.css':'text/css'})[path.extname(file)]||'application/octet-stream'});res.end(e?'Not found':b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=process.env.MO_LIVE==='1'?'https://genaiedu.github.io':'http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const p=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],requests=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
  await p.goto(origin+'/LearningApps2/mo-rechenlabor.html');await p.getByRole('button',{name:'Ohne externe Inhalte starten',exact:true}).click();await p.waitForFunction(()=>document.querySelectorAll('#licht mjx-container').length>=4,{},{timeout:20000});console.log('Theory formulas',await p.locator('mjx-container').count());
  const chapters=await p.evaluate(()=>[...document.querySelectorAll('.sidebar nav a[href^="#"]')].slice(1).map(a=>({nav:a.textContent,heading:document.querySelector(a.getAttribute('href'))?.querySelector('.eyebrow')?.textContent})));
  assert.equal(chapters.length,12);chapters.forEach((c,i)=>{const n=String(i+1).padStart(2,'0');assert.ok(c.nav.startsWith(n+' · '),c.nav);assert.ok(c.heading?.startsWith(n+' · '),JSON.stringify(c));});
  assert.equal(await p.locator('#scf-idee .theory-steps>li').count(),6);assert.equal(await p.locator('#zustaende-idee .theory-steps>li').count(),4);assert.equal(await p.locator('#basis-idee svg').count(),1);assert.match(await p.locator('#dichte-idee').textContent(),/Übergangsdipolmoment/);assert.match(await p.locator('#verfahren').textContent(),/Parametric Method 3/);assert.ok((await p.locator('#mehr-elektronen,#basis-idee,#scf-idee,#verfahren,#geometrie-idee,#zustaende-idee,#dichte-idee,#licht').allTextContents()).join(' ').split(/\s+/).length>2800);
  await p.locator('#menu-close').click();await p.waitForFunction(()=>document.getElementById('sidebar').getBoundingClientRect().right<=1);await p.locator('#basis-idee').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-85));await p.screenshot({path:'/tmp/mo-theory-desktop.png'});
  await p.setViewportSize({width:390,height:844});
  for(const id of ['mehr-elektronen','basis-idee','scf-idee','zustaende-idee','dichte-idee','licht']){
   await p.locator('#'+id).scrollIntoViewIfNeeded();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' must not overflow');
  }
  await p.locator('#scf-idee details summary').click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'expanded mathematical details must scroll locally');
  await p.locator('#scf-idee').scrollIntoViewIfNeeded();await p.screenshot({path:'/tmp/mo-theory-mobile.png'});
  await p.locator('#menu').click();await p.locator('#theme').click();await p.locator('#menu-close').click();await p.waitForFunction(()=>document.getElementById('sidebar').getBoundingClientRect().right<=1);await p.locator('#dichte-idee').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-85));await p.screenshot({path:'/tmp/mo-theory-mobile-dark.png'});
  assert.equal(await p.locator('mjx-merror').count(),0);assert.deepEqual(errors,[]);assert.ok(requests.every(url=>url.startsWith(origin)||url.startsWith('blob:')||url.startsWith('data:')),'no unrequested external theory contents');
  assert.equal(await p.evaluate(()=>MOApp.result),null,'reading theory must not start a molecular calculation');
  console.log('PASS theory numbering 01–12, detailed explanations, MathJax, mobile/light/dark, expandable mathematics, privacy and no automatic computation');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

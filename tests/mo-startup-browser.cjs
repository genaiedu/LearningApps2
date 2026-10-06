const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':({'.js':'text/javascript','.wasm':'application/wasm','.html':'text/html','.css':'text/css'})[path.extname(file)]||'application/octet-stream'});res.end(e?'Not found':b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const brokenAsset of ['RDKit_minimal.js','RDKit_minimal.wasm']){
   const p=await browser.newPage(),errors=[];let fail=true; p.on('pageerror',e=>errors.push(e.message));
   await p.route('**/'+brokenAsset+'*',route=>fail?route.fulfill({status:503,body:'Temporary test failure'}):route.continue());
   await p.goto(origin+'/LearningApps2/mo-rechenlabor.html');await p.getByRole('button',{name:'Ohne externe Inhalte starten',exact:true}).click();
   await p.getByRole('button',{name:'Rechenkern erneut laden',exact:true}).waitFor({timeout:35000});assert.equal(await p.locator('#calculate').isEnabled(),true);assert.equal(await p.evaluate(()=>MOApp.result),null);
   const smiles='C=CC=C';await p.locator('#smiles').fill(smiles);fail=false;await p.locator('#calculate').click();
   await p.getByRole('button',{name:'Geometrie, Orbitale & Spektrum berechnen',exact:true}).waitFor({timeout:35000});assert.equal(await p.locator('#calculate').isEnabled(),true);assert.equal(await p.locator('#smiles').inputValue(),smiles);assert.equal(await p.evaluate(()=>MOApp.result),null,'reload must not automatically start molecule calculation');
   await p.locator('[data-smiles="O"]').click();await p.locator('#calculate').click();await p.waitForFunction(()=>MOApp.result&&!MOApp.busy,{},{timeout:90000});assert.equal(await p.evaluate(()=>MOApp.result.n),7);assert.equal(await p.evaluate(()=>MOApp.result.calculationRoute),'standard');assert.deepEqual(errors,[]);await p.close();
   console.log('PASS recovery after unavailable '+brokenAsset+', preserved input and explicit calculation');
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

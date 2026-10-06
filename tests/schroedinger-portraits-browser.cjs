const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'../..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(err?'Not found':data);});
});
(async()=>{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const page=await browser.newPage(),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(r.url().startsWith('https:'))external.push(r.url());});
    if(!process.argv.includes('--live')){
      await page.route('https://commons.wikimedia.org/w/api.php**',r=>r.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:{query:{pages:[{categories:[],imageinfo:[{url:'https://upload.wikimedia.org/test-portrait.svg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Test.svg',extmetadata:{LicenseShortName:{value:'Public domain'},Artist:{value:'Test'}}}]}]}}}));
      // High intrinsic image dimensions reproduce the old implicit grid overflow.
      await page.route('https://upload.wikimedia.org/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600"><rect width="1200" height="1600" fill="#ddd"/><rect x="10" y="10" width="1180" height="1580" fill="none" stroke="#222" stroke-width="20"/><circle cx="600" cy="700" r="300" fill="#777"/></svg>'}));
    }
    await page.goto('http://127.0.0.1:'+server.address().port+'/LearningApps2/schroedinger-labor.html');
    await page.waitForFunction(()=>document.querySelector('#consent').open);
    assert.equal(external.length,0,'images contacted before consent');
    await page.locator('#consent button[value=allow]').click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.portrait img')].length===3,{},{timeout:25000});
    for(const [width,height] of [[2560,1440],[1920,1080],[1440,1000],[1024,768],[768,1024],[390,844]])for(const collapsed of [false,true])for(const dark of [false,true]){
      await page.setViewportSize({width,height});await page.evaluate(({collapsed,dark})=>{document.body.classList.toggle('collapsed',collapsed);document.body.classList.toggle('dark',dark);},{collapsed,dark});
      const images=await page.locator('.portrait img').evaluateAll(imgs=>imgs.map(img=>{const frame=img.parentElement.getBoundingClientRect(),box=img.getBoundingClientRect(),style=getComputedStyle(img);return {frame:{x:frame.x,y:frame.y,width:frame.width,height:frame.height},box:{x:box.x,y:box.y,width:box.width,height:box.height},fit:style.objectFit,natural:img.naturalHeight};}));
      for(const image of images){assert(image.natural>0);assert.equal(image.fit,'contain');assert(image.frame.width<=240.1);assert(Math.abs(image.box.width-image.frame.width)<1);assert(Math.abs(image.box.height-image.frame.height)<1,'image taller than its frame at '+width);assert(Math.abs(image.box.x-image.frame.x)<1);assert(Math.abs(image.box.y-image.frame.y)<1);}
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow '+width);
      if(width===1920&&!dark&&!collapsed)await page.locator('.people-grid').screenshot({path:'/tmp/schroedinger-portraits-wide.png'});
    }
    await page.locator('#wiki-revoke').click();assert.equal(await page.locator('.portrait img').count(),0);
    assert.deepEqual(errors,[]);console.log('PASS uncropped contained portraits at 6 sizes, expanded/collapsed sidebar, light/dark, consent and revocation.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

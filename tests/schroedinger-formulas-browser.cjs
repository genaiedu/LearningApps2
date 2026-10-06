const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
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
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
    await page.goto('http://127.0.0.1:'+server.address().port+'/LearningApps2/schroedinger-labor.html');
    await page.waitForFunction(()=>document.querySelectorAll('mjx-container').length>120);
    await page.evaluate(()=>MathJax.startup.promise);
    await page.locator('#consent button[value=offline]').click();
    await page.locator('#hydrogen-derivation summary').click();
    for(let i=0;i<8;i++)await page.locator('[data-lesson=hydrogen] .lesson-next').click();
    await page.waitForFunction(()=>document.querySelector('[data-lesson=hydrogen] .lesson-step.active p:last-child mjx-msubsup'));
    assert.equal(await page.locator('mjx-merror').count(),0);
    assert.equal(await page.locator('[data-lesson=hydrogen] .lesson-step.active p:last-child mjx-container').count(),3);
    await page.locator('[data-lesson=hydrogen] .lesson-step.active').screenshot({path:'/tmp/schroedinger-formula-fixed.png'});
    for(const [width,height] of [[1440,1000],[768,1024],[390,844]]){
      await page.setViewportSize({width,height});await page.locator('[data-lesson=hydrogen] .lesson-all').click();
      await page.waitForTimeout(200);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow '+width);
      const raw=await page.evaluate(()=>{
        const walker=document.createTreeWalker(document.querySelector('main'),NodeFilter.SHOW_TEXT),bad=[];
        while(walker.nextNode()){
          const node=walker.currentNode;
          if(!node.parentElement.closest('mjx-container,script,style')&&/[_^{}]|\\[()[\]]/.test(node.textContent))bad.push(node.textContent);
        }
        return bad;
      });
      assert.deepEqual(raw,[]);await page.locator('[data-lesson=hydrogen] .lesson-all').click();
    }
    assert.deepEqual(errors,[]);
    console.log('PASS rendered Laguerre indices/exponents, no raw notation or MathJax errors, desktop/tablet/mobile layouts. Formulas:',await page.locator('mjx-container').count());
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

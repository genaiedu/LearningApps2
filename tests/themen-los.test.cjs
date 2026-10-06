const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,body)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(body);});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],failed=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400)failed.push(response.url());});
    const url='http://127.0.0.1:'+server.address().port+'/LearningApps2/themen-los.html';
    await page.goto(url);assert.equal(await page.locator('#result table').count(),0);
    for(let count=1;count<=26;count++){
      await page.locator('#group-count').fill(String(count));await page.locator('#draw').click();
      const rows=await page.locator('#result tbody tr').evaluateAll(nodes=>nodes.map(node=>[node.children[0].textContent,node.children[1].textContent]));
      assert.deepEqual(rows.map(row=>row[0]),Array.from({length:count},(_,i)=>'Gruppe '+(i+1)));
      assert.deepEqual(rows.map(row=>row[1]).sort(),Array.from({length:count},(_,i)=>'Thema '+String.fromCharCode(65+i)));
    }
    const before=await page.locator('#result').textContent();
    for(const invalid of ['0','27','2.5','']){await page.locator('#group-count').fill(invalid);await page.locator('#draw').click();assert.equal(await page.locator('#result').textContent(),before);}
    await page.locator('#group-count').fill('6');await page.locator('#draw').click();
    const saved=await page.locator('#result').textContent();await page.reload();
    assert.equal(await page.locator('#result').textContent(),saved);assert.equal(await page.locator('#group-count').inputValue(),'6');
    await page.locator('#group-count').fill('8');assert.match(await page.locator('#status').textContent(),/noch nicht ausgelost/);assert.equal(await page.locator('#result').textContent(),saved);
    await page.locator('#group-count').fill('6');
    await page.screenshot({path:'/tmp/themen-los-desktop.png',fullPage:true});
    await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);
    await page.locator('#fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);
    await page.locator('#theme').click();assert.equal(await page.locator('body').getAttribute('data-theme'),'dark');
    await page.setViewportSize({width:390,height:650});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:'/tmp/themen-los-mobile.png',fullPage:true});
    await page.locator('#clear').click();assert.equal(await page.locator('#result table').count(),0);assert.equal(await page.locator('#group-count').inputValue(),'6');
    assert.equal(await page.evaluate(()=>localStorage.getItem('themen-los:v1')),null);
    await page.evaluate(()=>localStorage.setItem('themen-los:v1',JSON.stringify({count:2,topics:[0,0]})));await page.reload();assert.equal(await page.locator('#result table').count(),0);
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    console.log('Themen-Los: 1–26 groups, unique topics, validation, persistence, clear, theme, fullscreen and mobile passed.');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});

const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':({'.js':'text/javascript','.wasm':'application/wasm','.html':'text/html','.css':'text/css'})[path.extname(f)]||'application/octet-stream'});res.end(e?'Not found':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=process.env.MO_LIVE==='1'?'https://genaiedu.github.io':'http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox']});
try{
 const p=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://commons.wikimedia.org/w/api.php**',r=>r.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:{query:{pages:[{}]}}}));
 await p.route('https://upload.wikimedia.org/**',r=>r.abort());
 await p.goto(origin+'/LearningApps2/mo-rechenlabor.html');await p.locator('#consent button[value=allow]').click();await p.locator('#menu-close').click();
 const links=await p.locator('[data-wiki]').evaluateAll(els=>els.map(el=>({title:el.dataset.wiki,language:el.dataset.wikiLanguage||'de',fragment:el.dataset.wikiFragment||''})));
 for(const language of ['de','en']){
  const titles=[...new Set(links.filter(l=>l.language===language).map(l=>l.title))];const data=await p.evaluate(async({language,titles})=>{const u=new URL('https://'+language+'.wikipedia.org/w/api.php');u.search=new URLSearchParams({action:'query',titles:titles.join('|'),redirects:'1',format:'json',formatversion:'2',origin:'*'});return(await fetch(u)).json();},{language,titles});
  assert.ok(!data.error,JSON.stringify(data));assert.ok(data.query.pages.every(page=>!page.missing&&!page.invalid),JSON.stringify(data.query.pages));console.log('PASS existing article titles',language,titles.length);
 }
 for(const title of ['Hartree-Fock-Methode','Multi-configurational self-consistent field','Theoretische Chemie','Energy minimization','Møller–Plesset perturbation theory']){
  await p.locator('[data-wiki="'+title+'"]').first().click();await p.waitForFunction(()=>document.getElementById('wiki-status').textContent.includes('bleiben'),{},{timeout:25000});
  assert.ok((await p.locator('#wiki-content').textContent()).length>1000);assert.equal(await p.locator('#wiki-content annotation,#wiki-content annotation-xml').count(),0);assert.ok(!(await p.locator('#wiki-content').textContent()).includes('displaystyle'));
  if(title==='Hartree-Fock-Methode'){assert.ok(await p.locator('#wiki-content math').count()>5);await p.locator('#wiki-reader').screenshot({path:'/tmp/wiki-live-hartree-fock.png'});}
  if(title==='Theoretische Chemie'){assert.match(await p.locator('#wiki-content').textContent(),/Semiempirische Methoden/);assert.ok(await p.locator('#wiki-content').evaluate(el=>el.scrollTop>0),'requested section scrolled into view');await p.locator('#wiki-reader').screenshot({path:'/tmp/wiki-live-semiempirical.png'});}
  console.log('PASS actual Wikipedia article in reading window',title,'MathML',await p.locator('#wiki-content math').count());await p.locator('#wiki-close').click();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

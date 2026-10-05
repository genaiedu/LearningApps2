const {chromium,webkit}=require('playwright');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const root=path.resolve(__dirname,'..'),shots=fs.mkdtempSync(path.join(os.tmpdir(),'hf-arrows-'));
(async()=>{
 console.log('Screenshots: '+shots);
 for(const [name,type,options] of [['chrome',chromium,{channel:'chrome'}],['webkit',webkit,process.env.HF_WEBKIT_EXECUTABLE_PATH?{executablePath:process.env.HF_WEBKIT_EXECUTABLE_PATH}:{}]]){
  const browser=await type.launch({headless:true,...options});
  try{
   const page=await browser.newPage();
   const checkArrow=async label=>{
    assert.ok(await page.locator('#slide .edge.flow.visible > path').evaluateAll(es=>es.every(e=>getComputedStyle(e).strokeDasharray==='none')),'solid arrows never use a partial dash reveal');
    const points=await page.locator('#slide .edge.flow.visible > path').evaluateAll(paths=>paths.flatMap(p=>{
      const length=p.getTotalLength(),matrix=p.getScreenCTM();
      return Array.from({length:24},(_,i)=>{const q=p.getPointAtLength(length*(.70+i*.012));const point=new DOMPoint(q.x,q.y).matrixTransform(matrix);return {x:point.x,y:point.y};});
    }));
    const file=path.join(shots,name+'-'+label+'.png');
    const png=PNG.sync.read(await page.screenshot({path:file}));
    const gaps=points.filter(({x,y})=>{
      if(y<0||y>=png.height)throw Error('Sample offscreen');
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
        const px=Math.round(x)+dx,py=Math.round(y)+dy;
        if(px<0||py<0||px>=png.width||py>=png.height)continue;
        const at=(py*png.width+px)*4,r=png.data[at],g=png.data[at+1],b=png.data[at+2];
        if(g>r+25&&b>r+20)return false;
      }
      return true;
    });
    assert.equal(gaps.length,0,name+' '+label+': arrow shaft must reach its tip; gaps '+JSON.stringify(gaps));
   };
   for(const [width,height] of [[1440,900],[1024,768],[768,1024],[390,844],[1180,820],[1536,900],[1900,1000],[2622,1222]])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height});
    await openStory(page,'file://'+path.join(root,'huggingface-fall.html'));
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('#settings').click();await page.locator('#motion').uncheck();
    await page.locator('input[name=theme][value='+theme+']').check();await page.locator('[data-close=settingsDialog]').click();
    await page.locator('#next').click();await page.locator('#next').click();
    await checkArrow(width+'-'+theme);
   }
   if(name==='chrome'){
    await page.setViewportSize({width:1180,height:820});
    await page.locator('#settings').click();await page.locator('#fullscreen').click();
    await page.waitForFunction(()=>!!document.fullscreenElement);await checkArrow('fullscreen');
    await page.locator('#settings').click();await page.locator('#fullscreen').click();
    await page.waitForFunction(()=>!document.fullscreenElement);await checkArrow('back-to-window');
   }
   // During animated entry the whole shaft is present together with its arrowhead.
   await page.locator('#settings').click();await page.locator('#motion').check();await page.locator('[data-close=settingsDialog]').click();
   await page.locator('#replay').click();await page.locator('#next').click();await page.waitForTimeout(120);
   const entering=await page.locator('#slide .edge.flow.visible').first().evaluate(e=>({opacity:Number(getComputedStyle(e).opacity),dash:getComputedStyle(e.querySelector('path')).strokeDasharray}));
   assert.ok(entering.opacity>0&&entering.opacity<1,'arrow fades in');assert.equal(entering.dash,'none','no animated gap near tip');
   console.log('PASS: '+name+' solid arrow endpoints in eight window layouts, both themes and animated entry.');
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
async function openStory(page,url){await page.goto(url);await page.locator('#next').click();}

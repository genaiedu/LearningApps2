'use strict';
// Isolated browser QA; never contacts a model provider or a billing service.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const core=require('../scripts/ki-auf-webseiten-core.js');
const url=process.env.LESSON_URL||'http://127.0.0.1:8894/LearningApps2/ki-auf-webseiten.html';
const out=process.env.QA_OUTPUT||'/private/tmp/ki-webseiten-qa';
async function main(){
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage(),unexpected=[],errors=[],bad=[];
  const origin=new URL(url).origin;
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin){unexpected.push(u.href);return route.abort();}return route.continue();});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)bad.push([response.status(),response.url()]);});
  try{
    await page.goto(url,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.KIWebLesson&&document.querySelector('#design-palette'));
    await page.evaluate(()=>document.fonts.ready);
    assert.match(await page.title(),/Aufgaben, Datenwege und Kostenschutz/);
    assert.equal(await page.locator('html').getAttribute('data-palette'),'graphite');
    assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
    const fonts=await page.evaluate(()=>({sans:document.fonts.check('400 18px "Fira Sans"'),serif:document.fonts.check('italic 400 30px "EB Garamond"'),features:getComputedStyle(document.body).fontVariantLigatures,numbers:getComputedStyle(document.body).fontVariantNumeric}));
    assert.equal(fonts.sans,true);assert.equal(fonts.serif,true);assert.match(fonts.features,/common-ligatures/);assert.match(fonts.numbers,/oldstyle-nums/);
    for(const [scenario,steps] of Object.entries(core.cases)){
      await page.locator('#journey-case').selectOption(scenario);
      assert.equal(await page.locator('[data-journey-node="image"]').isVisible(),steps.some(step=>step.node==='image'));
      for(let i=0;i<steps.length;i++){
        assert.equal(await page.locator('#journey-title').innerText(),steps[i].title);
        assert.equal(await page.locator('[aria-current="step"]').getAttribute('data-journey-node'),steps[i].node);
        if(i<steps.length-1)await page.locator('#journey-next').click();
      }
      assert.equal(await page.locator('#journey-next').isDisabled(),true);
      await page.locator('#journey-back').click();
      assert.equal(await page.locator('#journey-title').innerText(),steps.at(-2).title);
      await page.locator('#journey-reset').click();
    }
    for(const [question,right,wrong] of [['algorithm','rules','model'],['cost','stop','safe'],['secret','server','browser'],['origin','limits','safe'],['fallback','local','retry']]){
      const form=page.locator('[data-question="'+question+'"]');
      await form.locator('button').click();assert.match(await form.locator('.check-feedback').innerText(),/Wähle zuerst/);
      for(const value of [wrong,right]){await form.locator('[value="'+value+'"]').check();await form.locator('button').click();assert.equal(await form.locator('.check-feedback').getAttribute('data-correct'),String(value===right));}
    }
    await page.locator('#chapter-menu summary').click();
    await page.locator('#chapter-menu a[href="#kosten"]').click();
    assert.equal(await page.locator('#chapter-menu').getAttribute('open'),null);
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:1000});
      const overflow=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(overflow.scroll<=overflow.client+1,JSON.stringify({width,overflow}));
      for(const section of ['kunstbeispiel','kosten','datenreise']){
        await page.locator('#'+section).scrollIntoViewIfNeeded();
        const boxes=await page.locator('#'+section+' .task-card, #'+section+' .role, #'+section+' .journey').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width,scroll:node.scrollWidth,client:node.clientWidth};}));
        for(const box of boxes)assert.ok(box.x>=0&&box.right<=width+1&&box.scroll<=box.client+1,JSON.stringify({width,section,box}));
      }
      if(width===390)await page.locator('#kunstbeispiel').screenshot({path:path.join(out,'mobile-tasks.png')});
    }
    await page.setViewportSize({width:1440,height:1000});
    for(const palette of ['graphite','atelier','slate','plum','bordeaux'])for(const theme of ['light','dark']){
      await page.getByRole('button',{name:'Ansicht',exact:true}).click();
      await page.locator('#design-palette').selectOption(palette);
      await page.locator('[name="design-theme"][value="'+theme+'"]').check();
      await page.getByRole('button',{name:'Ansicht schließen',exact:true}).click();
      assert.equal(await page.locator('html').getAttribute('data-palette'),palette);assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
      await page.locator('#kosten').screenshot({path:path.join(out,'cost-'+palette+'-'+theme+'.png')});
    }
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('html').getAttribute('data-palette'),'bordeaux');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    assert.equal(await page.locator('input[type="radio"][name="cost"]:checked').count(),0);
    await page.getByRole('button',{name:'Ansicht',exact:true}).click();
    await page.locator('#design-palette').selectOption('graphite');await page.locator('[name="design-theme"][value="light"]').check();await page.getByRole('button',{name:'Ansicht schließen',exact:true}).click();
    await page.locator('#kunstbeispiel').screenshot({path:path.join(out,'tasks-desktop.png')});
    await page.locator('#journey-case').selectOption('image');
    for(let i=0;i<3;i++)await page.locator('#journey-next').click();
    await page.locator('#journey').screenshot({path:path.join(out,'image-journey.png')});
    await page.locator('#start').screenshot({path:path.join(out,'hero.png')});
    assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(unexpected,[]);
    console.log(JSON.stringify({ok:true,scenarios:Object.keys(core.cases).length,checks:5,widths:[320,390,768,1440],appearances:10,fonts,unexpected,errors,bad,output:out},null,2));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

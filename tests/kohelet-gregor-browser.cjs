'use strict';
// Isolated local browser QA. No real learner data, service writes or external media.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const V=require('../scripts/kohelet-inhalte.js'),C=require('../scripts/kohelet-core.js'),corpus=require('../data/kohelet-gregor/lesetexte.json');
const out=process.env.KOHELET_QA_DIR||'/private/tmp/kohelet-app-qa',base=process.env.KOHELET_URL||'http://127.0.0.1:8886/LearningApps2/kohelet-gregor.html';
fs.mkdirSync(out,{recursive:true});
const compact=s=>s.replace(/\s/gu,'');
const contrast=(a,b)=>{const luminance=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
(async()=>{
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage(),errors=[],externals=[],badResponses=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)badResponses.push([r.status(),r.url()]);});
    await page.route('**/*',r=>{if(!r.request().url().startsWith(new URL(base).origin)){externals.push(r.request().url());return r.abort();}return r.continue();});
    await page.goto(base);await page.evaluate(()=>document.fonts.ready);assert.equal(await page.locator('html').getAttribute('data-palette'),'graphite');
    const justified=async selector=>assert.equal(await page.locator(selector).first().evaluate(e=>getComputedStyle(e).textAlign),'justify',selector);
    await justified('.reading-copy p');
    await page.screenshot({path:path.join(out,'01-einstieg.png')});
    for(const t of V.tasks){await page.goto(base+'#arbeiten/'+t.id);await page.locator('#task-title').waitFor();assert.equal(await page.locator('#task-title').innerText(),t.title);assert.equal(await page.locator('.task-steps li').count(),t.steps.length);await page.locator('[data-excerpt]').first().click();await page.locator('#excerpt-full').waitFor();}
    await page.goto(base+'#arbeiten/sklaverei');await page.locator('#task-draft').fill('Mein textgestütztes Argument: „Menschen sind kein Besitz“. <b>Kein HTML</b>');await page.locator('[data-check="0"]').check();await page.locator('#task-done').check();
    await justified('.task-steps li');await justified('#task-draft');
    await page.reload();assert.ok((await page.locator('#task-draft').inputValue()).includes('<b>Kein HTML</b>'));assert.equal(await page.locator('#task-draft b').count(),0);assert.ok(await page.locator('#task-done').isChecked());
    await page.locator('[data-excerpt]').nth(1).click();await page.locator('#excerpt-full').waitFor();await page.locator('#comparison summary').click();await page.screenshot({path:path.join(out,'02-textarbeit.png'),fullPage:true});
    for(let n=1;n<=12;n++){await page.goto(base+`#lesen/kohelet/${n}`);await page.locator('#reader-text h2').waitFor();const actual=await page.locator('.reader-body .reader-column').allTextContents();assert.equal(compact(actual.join(' ')),compact(corpus.kohelet[n-1].verses.map(v=>v.de).join(' ')));}
    await page.locator('#mode-parallel').click();assert.ok(await page.locator('.original-he').count()>0);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,'03-kohelet-zweisprachig.png')});
    await justified('.original-he p');
    for(let n=1;n<=8;n++){await page.goto(base+`#lesen/gregor/${n}`);await page.locator('#reader-text h2').waitFor();assert.ok(await page.locator('.original-el p').count()>10);const actual=await page.locator('.reader-body').evaluate(el=>{const copy=el.cloneNode(true);copy.querySelectorAll('.original-el,.bibref').forEach(n=>n.remove());return copy.textContent;});assert.equal(compact(actual),compact(corpus.gregor[n-1].chunks.flatMap(c=>c.de.map(p=>p.text)).join(' ')));}
    await page.goto(base+'#lesen/gregor/1');await page.locator('#reader-text h2').waitFor();await page.screenshot({path:path.join(out,'04-gregor-absatzwechsel.png')});
    await justified('.original-el p');
    await page.goto(base+'#material');
    const downloads=await page.locator('#all-downloads a[download]').evaluateAll(nodes=>nodes.map(n=>n.href));assert.equal(downloads.length,10);
    for(const url of downloads){const response=await context.request.get(url);assert.equal(response.status(),200,url);const data=await response.body();if(url.endsWith('.pdf'))assert.equal(data.subarray(0,4).toString(),'%PDF');else assert.ok(data.length>1000);}
    await page.goto(base+'#gespraech/juedisch');assert.ok(await page.locator('#essay-juedisch').isVisible());await page.screenshot({path:path.join(out,'05-begleittext.png')});
    await justified('.essay-text section p:not(.eyebrow)');
    const paletteResults=[];
    for(const palette of ['graphite','atelier','slate','plum','bordeaux'])for(const theme of ['light','dark']){
      await page.goto(base+'#arbeiten/hauch');await page.locator('#view-open').click();await page.locator('#palette').selectOption(palette);await page.locator(`[name=theme][value=${theme}]`).check();await page.locator('[data-close=view-dialog]').click();
      const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,palette:document.documentElement.dataset.palette,theme:document.documentElement.dataset.theme,bodyFont:getComputedStyle(document.body).fontFamily,ligatures:getComputedStyle(document.querySelector('#task-workspace')).fontVariantLigatures,numerals:getComputedStyle(document.querySelector('.task-steps')).fontVariantNumeric}));assert.ok(layout.scroll<=layout.width,JSON.stringify(layout));assert.equal(layout.palette,palette);assert.equal(layout.theme,theme);assert.ok(layout.bodyFont.includes('Fira Sans'));assert.ok(layout.ligatures.includes('common-ligatures'));assert.ok(layout.numerals.includes('oldstyle-nums'));paletteResults.push(layout);
      const colors=await page.evaluate(()=>{const b=getComputedStyle(document.querySelector('.path-filter [aria-pressed=true]')),t=getComputedStyle(document.querySelector('#task-draft')),p=getComputedStyle(document.querySelector('#task-draft'),'::placeholder');return{button:[b.color,b.backgroundColor],placeholder:[p.color,t.backgroundColor]};});for(const [name,pair]of Object.entries(colors))assert.ok(contrast(...pair)>=4.5,`${palette} ${theme} ${name}: ${pair}`);
      await page.screenshot({path:path.join(out,`palette-${palette}-${theme}.png`)});
    }
    await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    await page.locator('#presentation-open').click();const slideOverflows=[];
    for(let n=0;n<V.slides.length+V.tasks.length;n++){
      await page.locator('#slide-select').selectOption(String(n));assert.equal(await page.locator('#slide svg').count(),1);
      const overflow=await page.locator('#slide').evaluate(e=>({n:Number(document.querySelector('#slide-select').value),height:e.clientHeight,scrollHeight:e.scrollHeight,width:e.clientWidth,scrollWidth:e.scrollWidth}));if(overflow.scrollHeight>overflow.height+2||overflow.scrollWidth>overflow.width+2)slideOverflows.push(overflow);
    }
    await page.locator('#slide-select').selectOption('8');await page.locator('#fullscreen-open').click();await page.waitForFunction(()=>Boolean(document.fullscreenElement));
    assert.equal(await page.locator('.presentation-bar').isVisible(),false);assert.equal(await page.locator('.presentation-help').isVisible(),false);assert.equal(await page.locator('.presentation-navigation button:visible').count(),2);await page.screenshot({path:path.join(out,'06-praesentation-vollbild.png')});
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.fullscreenElement);await page.locator('#presentation-close').click();
    await page.locator('#save-open').click();const dl=page.waitForEvent('download');await page.locator('#backup-export').click();const saved=await dl;const payload=JSON.parse(fs.readFileSync(await saved.path(),'utf8'));assert.equal(payload.app,'kohelet-gregor');assert.ok(payload.data.answers.sklaverei.text);assert.ok(!JSON.stringify(payload).includes('learningapps-lerncode'));
    await page.locator('#backup-file').setInputFiles({name:'falsch.json',mimeType:'application/json',buffer:Buffer.from('{"app":"falsch"}')});await page.waitForFunction(()=>document.getElementById('import-status').textContent.length>0);
    const imported=C.backup(C.fresh());imported.data.answers.hauch={text:'Ein importierter Text',checks:[0],done:false};
    await page.locator('#backup-file').setInputFiles({name:'richtig.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});await page.locator('#import-confirm').click();await page.goto(base+'#arbeiten/hauch');assert.equal(await page.locator('#task-draft').inputValue(),'Ein importierter Text');
    await page.locator('#reset-open').click();await page.locator('#reset-confirm').click();await page.goto(base+'#arbeiten/hauch');assert.equal(await page.locator('#task-draft').inputValue(),'');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    for(const size of [{width:768,height:1024},{width:390,height:844},{width:360,height:780}]){
      await page.setViewportSize(size);await page.goto(base);await page.screenshot({path:path.join(out,`mobil-${size.width}-einstieg.png`),fullPage:true});
      for(const route of ['#arbeiten/sabbat','#lesen/gregor/1','#gespraech/juedisch','#material']){await page.goto(base+route);if(route.includes('lesen'))await page.locator('#reader-text h2').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),size.width+' '+route);}
      await page.goto(base+'#arbeiten/sabbat');await page.screenshot({path:path.join(out,`mobil-${size.width}-textarbeit.png`),fullPage:true});
    }
    await context.close();
    const blocked=await browser.newContext({viewport:{width:1000,height:800}});await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked');}});});const b=await blocked.newPage();await b.goto(base+'#arbeiten/hauch');await b.locator('#task-draft').fill('Bleibt trotz gesperrtem Speicher bedienbar');assert.ok(await b.locator('#save-status').isVisible());const d=b.waitForEvent('download');await b.locator('#answers-export').click();await d;await blocked.close();
    assert.deepEqual(errors,[]);assert.deepEqual(externals,[]);assert.deepEqual(badResponses,[]);
    const report={tasks:16,koheletChapters:12,homilies:8,downloadFiles:10,slides:35,palettes:paletteResults.length,viewportWidths:[1440,768,390,360],storageReload:true,backupImport:true,confirmedReset:true,blockedStorageUsable:true,noExternalRequests:true,errors,badResponses,slideOverflows};
    fs.writeFileSync(path.join(out,'browser-pruefung.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

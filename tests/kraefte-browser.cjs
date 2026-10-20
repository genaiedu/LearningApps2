/* Browserprüfung: NODE_PATH=<Playwright-Module> node tests/kraefte-browser.cjs [App-URL]
 * Screenshots bleiben ausschließlich im temporären Verzeichnis.
 */
const{chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const p=await b.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'}),errors=[],external=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(new URL(r.url()).origin!==new URL(url).origin)external.push(r.url());});
  const url=process.argv[2]||'http://127.0.0.1:8878/LearningApps2/kraefte-labor.html';await p.goto(url);await p.evaluate(()=>KraefteApp.whenReady());
  assert.equal(external.length,0,'Keine externen Abrufe vor Freigabe');
  assert.equal(await p.locator('#entry-screen').isVisible(),true);assert.equal(await p.locator('#app-shell').isVisible(),false);await p.locator('#start-without-images').click();
  assert.equal(await p.evaluate(()=>document.fonts.check('400 17px "Fira Sans"')),true);
  const before=await p.evaluate(()=>KraefteApp.snapshot().seed),tasks=await p.evaluate(()=>KraefteApp.round());
  for(let i=0;i<tasks.length;i++){
   await p.locator('[data-task="'+i+'"]').click();const t=tasks[i];
   if(t.type==='choice')await p.locator('#answer-form [value="'+t.correctIndex+'"]').check();
   else{
    const units=await p.evaluate(d=>KraefteCore.units[d],t.dimension);
    for(const u of units){await p.locator('#answer-unit').selectOption(u[0]);const format=await p.evaluate(({t,unit})=>KraefteCore.answerFormat(t,unit),{t,unit:u[0]});assert.equal(await p.locator('#answer-number').getAttribute('placeholder'),format.example);assert.equal(await p.locator('#answer-format').innerText(),format.instruction);}
    await p.locator('#answer-unit').selectOption(units[0][0]);
    assert.match(await p.locator('#answer-note').innerText(),/±2 %/);
    if(i===2){
     for(const size of[{width:1280,height:900},{width:390,height:844}]){
      await p.setViewportSize(size);
      for(const palette of['graphite','atelier','slate','plum','bordeaux'])for(const theme of['light','dark']){
       await p.locator('#view-open').click();await p.selectOption('#palette',palette);await p.locator('[name=theme][value='+theme+']').check();await p.locator('[data-close=view-dialog]').click();
       const colors=await p.locator('#answer-number').evaluate(e=>({placeholder:getComputedStyle(e,'::placeholder').color,opacity:getComputedStyle(e,'::placeholder').opacity,text:getComputedStyle(e).color,muted:getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()}));
       assert.notEqual(colors.placeholder,colors.text);assert.equal(colors.opacity,'1');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
       if(palette==='graphite')await p.locator('#task-card').screenshot({path:'/private/tmp/kraefte-answer-'+size.width+'-'+theme+'.png',style:'.floating-header{visibility:hidden}'});
      }
     }
     await p.setViewportSize({width:1280,height:800});await p.locator('#view-open').click();await p.selectOption('#palette','graphite');await p.locator('[name=theme][value=light]').check();await p.locator('[data-close=view-dialog]').click();
    }
    await p.locator('#answer-number').fill(String(t.expectedSI*1.019).replace('.',','));
   }
   await p.locator('#answer-form button[type=submit]').click();await p.evaluate(()=>KraefteApp.whenReady());
   assert.match(await p.locator('#task-card').innerText(),/Vollständige Musterlösung/);
  }
  assert.match(await p.locator('#score').innerText(),/10 \/ 10/);assert.equal(await p.locator('#badges [data-earned=true]').count(),5);
  await p.locator('#task-card').screenshot({path:'/private/tmp/kraefte-solution.png'});
  await p.reload();await p.evaluate(()=>KraefteApp.whenReady());assert.equal(await p.locator('#entry-screen').isVisible(),true);await p.locator('#start-without-images').click();assert.equal(await p.evaluate(()=>KraefteApp.snapshot().seed),before);assert.match(await p.locator('#score').innerText(),/10 \/ 10/);
  for(const mode of['single','series','parallel'])for(const mass of[5,15,30]){
   await p.locator('[data-mode='+mode+']').click();await p.locator('#mass-range').evaluate((e,m)=>{e.value=m;e.dispatchEvent(new Event('input'));},mass);await p.locator('#measure').click();
  }
  assert.equal(await p.locator('#badges [data-earned=true]').count(),6);assert.equal(await p.locator('#measurements tr').count(),9);
  const fitText=(await p.locator('#fit-results').innerText()).replace(/\s/g,'');assert.match(fitText,/2,5/);assert.match(fitText,/10/);
  const layout=[];
  for(const size of[{width:1440,height:960},{width:768,height:1024},{width:390,height:844},{width:320,height:740}]){
   await p.setViewportSize(size);
   const geometry=await p.locator('.measurement-grid').evaluate(e=>{
    const grid=e.getBoundingClientRect(),table=e.firstElementChild.getBoundingClientRect(),chart=e.querySelector('.measurement-plot').getBoundingClientRect(),plot=e.querySelector('#spring-plot').getBoundingClientRect();
    return{width:grid.width,chartWidth:chart.width,plotWidth:plot.width,belowTable:chart.top>=table.bottom};
   });
   assert.ok(Math.abs(geometry.chartWidth-geometry.width)<1,'Diagrammbereich nutzt die volle Inhaltsbreite');
   assert.ok(Math.abs(geometry.plotWidth-geometry.width)<1,'SVG nutzt die volle Inhaltsbreite');assert.equal(geometry.belowTable,true,'Diagramm steht unter dem Messprotokoll');
   if(size.width===1440||size.width===390)await p.locator('.measurement-plot').screenshot({path:'/private/tmp/kraefte-plot-'+size.width+'.png'});
   await p.locator('#view-open').click();
   for(const palette of['graphite','atelier','slate','plum','bordeaux'])for(const theme of['light','dark']){
    await p.selectOption('#palette',palette);await p.locator('[name=theme][value='+theme+']').check();
    assert.equal(await p.evaluate(()=>document.documentElement.dataset.theme),theme);
    const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    if(overflow)layout.push({size,palette,theme,type:'page'});
    if(size.width===390&&palette==='graphite')await p.screenshot({path:'/private/tmp/kraefte-mobile-'+theme+'.png'});
   }
   await p.locator('[data-close=view-dialog]').click();
  }
  await p.setViewportSize({width:1280,height:720});await p.locator('#presentation-fullscreen').click();const slides=await p.evaluate(()=>KraefteApp.slides());
  for(const size of[{width:1280,height:720},{width:390,height:844}]){
   await p.setViewportSize(size);
   for(let i=0;i<slides.length;i++){
    await p.evaluate(i=>{const s=document.getElementById('slide-select');s.value=i;s.dispatchEvent(new Event('change'));},i);await p.evaluate(()=>KraefteApp.whenReady());
    const over=await p.locator('#slide').evaluate(e=>e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2);
    if(over)layout.push({size,slide:i+1,title:slides[i].title,type:'fullscreen'});
   }
  }
  console.log(JSON.stringify({errors,layout,external:external.length}));await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.fullscreenElement);assert.equal(await p.evaluate(()=>!!document.fullscreenElement),false);
  await p.locator('#reset-open').click();await p.locator('#reset-confirm').click();assert.notEqual(await p.evaluate(()=>KraefteApp.snapshot().seed),before);assert.equal(await p.locator('#measurements tr').count(),1);
  assert.deepEqual(errors,[]);assert.deepEqual(layout,[]);
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

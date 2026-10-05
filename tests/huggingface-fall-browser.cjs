const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),vm=require('node:vm'),os=require('node:os');
const root=path.resolve(__dirname,'..'),ctx={window:{}};
for(const file of ['huggingface-fall-data.js','huggingface-fall-scenes.js'])vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
const data=ctx.window.HF_CASE_DATA,scenes=ctx.window.HF_SCENES.scenes;
const swarm=data.slides.find(s=>s.scene==='swarm');
const signatures=data.slides.find(s=>s.id==='signaturen');
const handoffSteps=data.slides.find(s=>s.id==='uebergabe').cues.length;
assert.deepEqual(Array.from(data.slides.slice(0,3),s=>s.id),['auftakt','agenten','ein-test']);
assert.equal(data.slides[0].author,'Claus Unterberg');
assert.equal(data.slides[1].conceptCards.length,data.slides[1].cues.length);
const owlIndex=data.slides.findIndex(s=>s.introductions?.some(i=>i.agent==='p'));
assert.equal(data.slides[owlIndex].id,'flag-umweg');
assert.equal(data.slides[owlIndex+1].id,'bewertung');
assert.equal(data.slides.find(s=>s.population?.some(p=>p.phase==='research')).id,'aufgabenverteilung','large research crowd must not appear before the board has grown');
assert.equal(ctx.window.HF_SCENES.cast.d[0],'CDA23');
assert.equal(ctx.window.HF_SCENES.cast.d[3],'Rotkehlchen');
assert.deepEqual(Array.from(scenes.access.edges,e=>[e.from,e.to]),[['c','key'],['key','data'],['data','hf']],'credentials lead into the dataset route rather than a dead end');
assert.equal(signatures.introductions[0].agent,'d');
assert.match(signatures.notes[0],/versehentlich/);
assert.match(signatures.notes[1],/Allererstes.*nicht eindeutig/);
assert.match(signatures.notes[3],/kein belegter Erstentdecker/);
assert.equal(swarm.introductions.length,8);
assert.match(swarm.date,/13/);
assert.equal(data.slides.length,31);assert.equal(new Set(data.slides.map(s=>s.id)).size,31);
assert.match(data.slides.find(s=>s.id==='warnzeichen').notes[2],/Begründung.*nennt.*nicht/);
assert.equal(data.slides.find(s=>s.id==='warnzeichen').milestones[2].date,'27. Juni');
assert.ok(data.slides.every(s=>s.cues.every(c=>!/Weiter führt|nimmt den Platz im Organigramm/.test(c))));
const deepDives=data.slides.flatMap(s=>s.deepDives||[]);
assert.equal(deepDives.length,12);assert.equal(new Set(deepDives.map(q=>q.id)).size,12);
assert.ok(!fs.existsSync(path.join(root,'scripts/huggingface-fall-qa.json')),'no separate Q&A appendix source');
for(const s of data.slides)for(const q of s.deepDives||[]){
 assert.ok(Number.isInteger(q.step)&&q.step>=0&&q.step<s.notes.length);
 assert.ok(q.question&&q.answer.length>=2&&q.sources.every(id=>data.speakerSources[id]));
}
assert.equal(data.populations.board53.label,'53 Agenten');assert.equal(data.populations.board76.label,'76 Agenten');
assert.match(data.populations.attack.detail,/nicht zwingend gleichzeitig/);assert.match(data.populations.total.detail,/Teilmenge/);
assert.ok(Object.values(data.populations).every(p=>p.birds<=360));
assert.ok(data.populations.total.birds>=300&&data.populations.attack.birds>=200,'late scenes build a dense crowd');
for(const s of data.slides){
 assert.equal(s.notes.length,s.cues.length);assert.ok(s.notes.every(n=>n.length>150));assert.ok(s.date);
 assert.ok(s.notes.every(n=>!/(Wir zeigen|Beim Weitergehen|Beim nächsten Weiter|Nach dem Verkleinern|verkleinerte Figur|Regiezeile|Porträt|Schaubild|Animation)/i.test(n)),'speaker notes must not narrate presentation mechanics: '+s.id);
 assert.ok(s.sources.every(id=>data.sources.some(x=>x.id===id)));assert.ok(!s.questions&&!s.question&&!s.prompt);
 assert.ok(!s.title.includes('?'));assert.ok(scenes[s.scene]||['sources','download','early-warning','investigation','quintessence','title-card','agent-concept'].includes(s.scene));
 if(scenes[s.scene])for(const edge of scenes[s.scene].edges)assert.ok([edge.from,edge.to].every(id=>scenes[s.scene].nodes.some(n=>n.id===id)));
}
assert.ok(fs.existsSync(path.join(root,'output/pdf/huggingface-fall-begleitskript.pdf')));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.pdf':'application/pdf','.mp4':'video/mp4','.jpg':'image/jpeg'};
const workspace=path.dirname(root),sharedFonts=path.join(workspace,'LearningApps','fonts')+path.sep;
const server=http.createServer((req,res)=>{const p=path.resolve(workspace,'.'+decodeURIComponent(req.url.split('?')[0]));if(!p.startsWith(root+path.sep)&&!p.startsWith(sharedFonts)){res.writeHead(403).end();return;}fs.readFile(p,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(p)]||'text/plain');res.end(b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const shots=fs.mkdtempSync(path.join(os.tmpdir(),'hf-story-qa-'));console.log('Screenshots: '+shots);
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true}),errors=[],requests=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));page.on('response',r=>{if(r.status()===404)missing.push(r.url());});
  const origin='http://127.0.0.1:'+server.address().port,base=origin+'/LearningApps2',app=base+'/huggingface-fall.html';
  await openStory(page,app);await page.evaluate(()=>document.fonts.ready);
  const jump=async id=>{await page.evaluate(id=>{location.hash=id},id);await page.waitForFunction(id=>location.hash==='#'+id&&document.getElementById('slideTitle').textContent===HF_CASE_DATA.slides.find(s=>s.id===id).title,id);};
  await page.locator('#settings').click();await page.locator('#motion').uncheck();await page.locator('[data-close=settingsDialog]').click();
  const overflow=[];
  for(const [width,height]of [[1440,900],[1024,768],[1180,820],[768,1024],[390,844]]){
   await page.setViewportSize({width,height});
   for(const s of data.slides){
    await jump(s.id);await page.locator('#replay').isVisible().then(async v=>{if(v)await page.locator('#replay').evaluate(e=>e.click());});
    for(let step=0;step<s.cues.length;step++){
      assert.equal(await page.locator('#cue').textContent(),s.cues[step]);
      if(s.id==='warnzeichen'){
        assert.equal(await page.locator('.warning-history li.visible').count(),step+1);
        assert.equal(await page.locator('.investigation-magnifier').count(),0,'quiet history has no discovery spectacle');
      }
      if(s.id==='aufarbeitung'){
        assert.equal(await page.locator('#sceneFilm').count(),1,'one controlled HTML illustration');
        assert.equal(await page.locator('.flock-eyes').first().evaluate(e=>getComputedStyle(e).display),step>=2?'inline':'none');
        if(step===2){
          assert.notEqual(await page.locator('.flock-outline').first().evaluate(e=>getComputedStyle(e).stroke),'none');
          assert.equal(await page.locator('.flock-outline').first().evaluate(e=>getComputedStyle(e).fillOpacity),'1','foreground birds fully cover birds behind them');
          assert.equal(await page.locator('.flock-bird').first().locator('.flock-eyes circle').count(),2,'frontal bird has two close-set eyes');
          assert.equal(await page.locator('.flock-bird').first().locator('.flock-eyes').evaluate(e=>Number(e.children[1].getAttribute('cx'))-Number(e.children[0].getAttribute('cx'))),4);
          assert.equal(await page.locator('.flock-eyes').first().evaluate(e=>getComputedStyle(e).animationName),'none','reduced movement keeps the eyes still');
        }
        assert.match(await page.locator('.calendar').textContent(),new RegExp(['16.–17. Juli','19. Juli','20. Juli','Zum Nachspiel'][step]));
      }
      if(s.overviewPortraits){
        const start=s.introductions.length*2;
        assert.equal(await page.locator('#slide .edge.visible').count(),Math.max(0,Math.min(step-start+1,scenes[s.scene].edges.length)),'one arrow per beat after all portraits');
        if(step===start-1)assert.equal(await page.locator('#slide .actor.named.visible').count(),8,'all eight arrive before the first arrow');
      }
      if(s.id==='koordination'&&step===3){assert.match(await page.locator('#cue').textContent(),/Herauskopieren/);assert.match(await page.locator('#quoteArea').textContent(),/I_prepare_safe_exfil/);}
      const intro=s.introductions?.find(i=>i.step===step);
      const population=data.populations[s.population?.filter(p=>p.step<=step).at(-1)?.phase];
      const afterDiscovery=data.slides.indexOf(s)>data.slides.findIndex(x=>x.id==='aufarbeitung');
      assert.equal(await page.locator('#slide .flock-bird.present').count(),afterDiscovery?0:Math.max(2,...data.slides.slice(0,data.slides.indexOf(s)+1).flatMap((x,i)=>(x.population||[]).filter(p=>i<data.slides.indexOf(s)||p.step<=step).map(p=>data.populations[p.phase].birds))));
      if(afterDiscovery)assert.equal(await page.locator('#slide .flock-bird').count(),0,'all later backgrounds remain empty');
      assert.equal(await page.locator('#slide .flock-band').count(),3,'only three background animation groups');
      assert.ok(await page.locator('#slide .flock-layer').evaluate((e,{revealed,flight})=>{const css=getComputedStyle(e);return css.pointerEvents==='none'&&(flight?Number(css.opacity)===0:revealed?Number(css.opacity)===1:Number(css.opacity)>=.1&&Number(css.opacity)<=.13)},{revealed:s.id==='aufarbeitung'&&step>=2,flight:s.id==='aufarbeitung'&&step===3}));
      assert.equal(await page.locator('#slide.flock-revealed').count(),s.id==='aufarbeitung'&&step>=2?1:0);
      assert.equal(await page.locator('#populationNote').isVisible(),!!population&&!intro);
      if(population&&!intro)assert.match(await page.locator('#populationNote').textContent(),new RegExp(population.label.replace('.','\\.')));
      if(intro){
        // Large named portraits keep their established flight transition.
        assert.ok(await page.locator('#introPanel').isVisible(),'hidden introduction '+s.id+' / '+step);
        assert.equal(await page.locator('.intro-role').count(),0,'keine Rollen-Untertitel bei den Namensporträts');
        assert.equal(await page.locator('.intro-contribution').count(),0,'keine Erläuterungs-Untertitel bei den Namensporträts');
        assert.equal(await page.locator('.portrait-sticker').count(),1,'ein Tätigkeits-Sticker am Porträt');
        assert.equal(await page.locator('#introName').evaluate(e=>getComputedStyle(e).outlineStyle),'none','focused portrait names have no browser outline');
        assert.equal(await page.locator('.introducing .scene-bottom').isVisible(),false,'Porträts bleiben ohne untere Bildunterschrift');
        assert.ok(!(await page.locator('.slide-heading').isVisible()),'hide future role during introduction');
        if(width>=768)assert.ok(await page.locator('#viewport').evaluate(e=>e.scrollHeight<=e.clientHeight+2),'intro vertical overflow '+s.id+' '+step+' '+width);
        const art=await page.locator('.intro-art').boundingBox(),nav=await page.locator('.transport').boundingBox();
        assert.ok(art.y>=0&&art.y+art.height<nav.y,'portrait and navigation together');
        if(width===1024||width===390)await page.screenshot({path:path.join(shots,width+'-'+s.id+'-intro-'+step+'.png')});
      }
      if(step<s.cues.length-1)await page.locator('#next').evaluate(e=>e.click());
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow '+s.id+' '+width);
    assert.ok(await page.locator('#viewport').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'slide overflow '+s.id+' '+width);
    const nav=await page.locator('.transport').boundingBox();assert.ok(nav.y+nav.height<=height+1,'navigation offscreen');
    if(width>=768){const scroll=await page.locator('#viewport').evaluate(e=>e.scrollHeight-e.clientHeight);if(scroll>2)overflow.push([width,s.id,scroll]);}
    const overlaps=await page.locator('.diagram').count()?await page.locator('.diagram').evaluate(el=>{
      const r=el.getBoundingClientRect();const nodes=[...el.querySelectorAll('.actor.visible:not(.dimmed)')].map(n=>({name:n.innerText,r:n.getBoundingClientRect()}));
      return nodes.flatMap((a,i)=>nodes.slice(i+1).filter(b=>Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left)>2&&Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)>2).map(b=>a.name+' overlaps '+b.name));
    }):[];
    assert.deepEqual(overlaps,[],'overlapping diagram nodes '+s.id+' '+width);
    if(width===1024){
      await page.locator('#notes').tap();assert.match(await page.locator('#notesTitle').textContent(),new RegExp('Folie '+(data.slides.indexOf(s)+1)+':'));assert.equal(await page.locator('.script-step').count(),s.cues.length);
      assert.equal(await page.locator('.script-depth').count(),(s.deepDives||[]).length);
      for(const q of s.deepDives||[]){
        const detail=page.locator('.script-depth').filter({hasText:q.question});
        assert.equal(await detail.getAttribute('open'),null,'optional explanation starts collapsed');
        await detail.locator('summary').tap();assert.ok(await detail.locator('p').first().isVisible());
        assert.ok((await detail.textContent()).includes(q.answer.at(-1)));
        assert.equal(await detail.locator('a').count(),q.sources.length);
      }
      if(s.id==='signaturen')await page.screenshot({path:path.join(shots,'integrated-notes-ipad.png')});
      await page.locator('[data-close=notesDialog]').tap();
    }
    await page.locator('#viewport').evaluate(e=>e.scrollTop=0);
    if(width===1024||['nachrichtenbrett','koordination','schwarm-organigramm','schwarm-probleme','mitnehmen'].includes(s.id))await page.screenshot({path:path.join(shots,width+'-'+s.id+'.png')});
   }
  }
  console.log('Tablet/desktop vertical overflow:',JSON.stringify(overflow));
  assert.deepEqual(overflow,[],'slides must fit tablet and desktop views');
  await page.setViewportSize({width:1024,height:768});await jump('uebergabe');await page.locator('#replay').tap();
  assert.equal(await page.locator('.actor.visible').count(),1);await page.locator('#next').tap();assert.equal(await page.locator('.actor.visible').count(),2);
  await page.reload();await page.locator('#next').click();assert.equal(await page.locator('#position').textContent(),'Folie 01 / 31');assert.equal(await page.locator('#buildPosition').textContent(),'Aufbau 1 / 1');
  await jump('uebergabe');await page.locator('#next').tap();
  await page.locator('#prev').tap();assert.equal(await page.locator('#buildPosition').textContent(),'Aufbau 1 / '+handoffSteps);
  await page.locator('#play').tap();await page.waitForTimeout(4200);assert.equal(await page.locator('#buildPosition').textContent(),'Aufbau 2 / '+handoffSteps);
  await page.locator('#notes').tap();await page.waitForTimeout(4200);assert.equal(await page.locator('#buildPosition').textContent(),'Aufbau 2 / '+handoffSteps);await page.locator('[data-close=notesDialog]').tap();
  await page.locator('#play').tap();await page.waitForTimeout((handoffSteps-2)*4100);assert.equal(await page.locator('#buildPosition').textContent(),'Aufbau '+handoffSteps+' / '+handoffSteps);assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#position').textContent(),'Folie 10 / 31');
  await jump('mitnehmen');
  const response=await page.request.get(base+'/output/pdf/huggingface-fall-begleitskript.pdf');assert.equal(response.status(),200);assert.equal((await response.body()).subarray(0,4).toString(),'%PDF');
  const overview=await page.request.get(base+'/output/pdf/der-schwarm-der-nicht-geplant-war.pdf');assert.equal(overview.status(),200);assert.equal((await overview.body()).subarray(0,4).toString(),'%PDF');assert.equal(await page.locator('.overview-download').getAttribute('download'),'Der-Schwarm-der-nicht-geplant-war.pdf');assert.equal(await page.locator('.download-scene .overview-download').getAttribute('class'),'primary download-link overview-download');assert.equal(await page.locator('.download-scene .overview-download').evaluate(el=>el.nextElementSibling?.getAttribute('download')),'Hugging-Face-Fall-Vortragsskript.pdf');
  const downloadPromise=page.waitForEvent('download');await page.locator('#downloadText').tap();const download=await downloadPromise;assert.match(download.suggestedFilename(),/\.txt$/);const text=fs.readFileSync(await download.path(),'utf8');assert.ok(text.includes('FOLIE 31'));assert.ok(text.includes('AUFBAU 3'));assert.ok(text.includes('https://huggingface.co/'));assert.ok(!text.includes('Gesprächsimpuls'));
  for(const q of deepDives){assert.ok(text.includes(q.question));for(const p of q.answer)assert.ok(text.includes(p));}
  assert.equal((text.match(/VERTIEFUNG BEI NACHFRAGEN/g)||[]).length,12);
  await page.locator('#overview').tap();assert.equal(await page.locator('#slideList button').count(),31);await page.locator('[data-slide="0"]').tap();assert.ok(await page.locator('#prev').isDisabled());
  await page.locator('#slideTitle').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#buildPosition').textContent(),'Aufbau 1 / 4');await page.keyboard.press('End');assert.ok(await page.locator('#next').isDisabled());
  await page.locator('#settings').tap();await page.locator('#reset').tap();assert.match(await page.locator('#resetDialog').textContent(),/keine Antworten/);await page.locator('#confirmReset').tap();assert.equal(await page.locator('#position').textContent(),'Start');await page.locator('#next').click();assert.equal(await page.locator('#position').textContent(),'Folie 01 / 31');
  await jump('schwarm-organigramm');await page.locator('#settings').tap();await page.locator('#motion').check();await page.locator('[data-close=settingsDialog]').tap();
  for(let i=0;i<swarm.introductions.length*2-1;i++)await page.locator('#next').tap();
  assert.equal(await page.locator('#slide .edge.visible').count(),0);
  for(let i=0;i<scenes.swarm.edges.length;i++){
    await page.locator('#next').tap();
    assert.equal(await page.locator('#slide .edge.visible').count(),i+1);
    assert.deepEqual(await page.locator('.coordinating').evaluateAll(es=>es.map(e=>e.dataset.agent)),i<3?['b']:i>=7&&i<=10?['j','l']:[]);
    if([0,3,7].includes(i))await page.screenshot({path:path.join(shots,'swarm-arrow-'+(i+1)+'.png')});
  }
  await page.locator('#next').tap();assert.equal(await page.locator('.coordinating').count(),0);
  assert.equal(await page.locator('.edge.visible').count(),scenes.swarm.edges.length);
  for(let i=0;i<scenes.swarm.edges.length+1;i++)await page.locator('#prev').tap();
  assert.equal(await page.locator('#slide .edge.visible').count(),0,'backwards removes arrows before portraits');
  await jump('flag-umweg');assert.equal(await page.locator('#introPanel .bird').count(),1);assert.ok((await page.locator('.intro-art').boundingBox()).width>=220);
  assert.equal(await page.locator('#introPanel .bird-head').first().evaluate(e=>getComputedStyle(e).animationIterationCount),'infinite');
  const before=await page.locator('#introPanel .bird-head').first().evaluate(e=>getComputedStyle(e).transform);await page.waitForTimeout(2100);const after=await page.locator('#introPanel .bird-head').first().evaluate(e=>getComputedStyle(e).transform);assert.notEqual(before,after,'bird loop must move');


  // Crossfade old and new slides simultaneously, with no duplicate IDs.
  await jump('auftrag');await page.waitForFunction(()=>!document.querySelector('.slide-crossfade'));
  await jump('paketdienst');assert.equal(await page.locator('.slide-crossfade').count(),1);
  await page.waitForTimeout(180);
  const fade=await page.evaluate(()=>({old:Number(getComputedStyle(document.querySelector('.slide-crossfade')).opacity),next:Number(getComputedStyle(document.querySelector('#slide.introducing .intro-panel')||document.querySelector('#slide .slide-heading')).opacity),ids:[...document.querySelectorAll('[id]')].map(e=>e.id)}));
  assert.ok(fade.old>0&&fade.old<1&&fade.next>0&&fade.next<1,'both slides blend');
  assert.equal(new Set(fade.ids).size,fade.ids.length,'unique snapshot IDs');
  assert.equal(await page.locator('.slide-crossfade .flock-layer').count(),0,'flock is not duplicated or faded during transitions');
  assert.equal(await page.locator('#slide .flock-band').first().evaluate(e=>getComputedStyle(e).animationName),'none','flock never drifts, including with animations enabled');
  assert.equal(await page.locator('#slide').evaluate(e=>getComputedStyle(e).opacity),'1','only foreground content fades');
  await page.screenshot({path:path.join(shots,'crossfade.png')});
  await page.waitForFunction(()=>!document.querySelector('.slide-crossfade'));
  await jump('auftrag');await page.locator('#next').tap();assert.equal(await page.locator('.slide-crossfade').count(),0);
  await page.evaluate(()=>localStorage.setItem('huggingface-fall:story-v4',JSON.stringify({index:19,step:10,motion:true})));
  await openStory(page,app+'?fresh-entry=1#schwarm-organigramm');assert.equal(await page.locator('#position').textContent(),'Folie 01 / 31');
  assert.equal(await page.locator('#buildPosition').textContent(),'Aufbau 1 / 1');
  assert.deepEqual(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('huggingface-fall:story-v4')))),['motion','theme','projector']);
  await page.locator('#next').tap();await page.reload();await page.locator('#next').click();assert.equal(await page.locator('#buildPosition').textContent(),'Aufbau 1 / 1');
  // The title uses the same simple agent as the concept slide and docks without
  // the former three-dimensional turn or a second arrival animation.
  await jump('auftakt');
  assert.equal(await page.locator('.title-portrait .bird-anon1').count(),1);
  assert.equal(await page.locator('.title-portrait .bird-hero').count(),0);
  assert.ok(await page.locator('.title-portrait .bird-head').evaluate(e=>{
    const beak=e.querySelector('.bird-beak'),head=e.querySelector('circle');
    return !!beak&&!!head&&Boolean(beak.compareDocumentPosition(head)&Node.DOCUMENT_POSITION_FOLLOWING);
  }),'head overlays the beak root so it cannot appear detached');
  const titleBird=await page.locator('.title-portrait .intro-art').boundingBox();
  await page.screenshot({path:path.join(shots,'title-minimal.png')});
  await page.locator('#next').tap();await page.waitForFunction(()=>!!document.querySelector('.docking-bird'));
  const titleFrames=await page.locator('.docking-bird').evaluate(e=>e.getAnimations()[0].effect.getKeyframes().map(f=>f.transform));
  assert.equal(titleFrames.length,2);assert.ok(titleFrames.every(f=>!String(f).includes('rotateY')&&!String(f).includes('perspective')),'title uses normal two-frame docking');
  assert.equal(await page.locator('.concept-agent > .bird.arriving').evaluate(e=>getComputedStyle(e).visibility),'hidden');
  await page.waitForTimeout(420);const titleMid=await page.locator('.docking-bird').boundingBox();assert.ok(titleMid.width<titleBird.width&&titleMid.width>25,'title bird shrinks in flight');
  await page.screenshot({path:path.join(shots,'title-minimal-flight.png')});
  await page.waitForFunction(()=>!document.querySelector('.docking-bird'));
  assert.ok(await page.locator('.concept-agent > .bird').isVisible());assert.equal(await page.locator('.arriving').count(),0);
  // Every first appearance and every recap portrait docks at its actual node.
  for(const s of data.slides.filter(s=>s.introductions)){
    for(const intro of s.introductions){
      await jump(s.id);await page.locator('#replay').tap();
      for(let i=0;i<intro.step;i++)await page.locator('#next').evaluate(e=>e.click());
      if(intro.step>0){
        assert.equal(await page.locator('.slide-crossfade').count(),1,'scene fades into portrait '+intro.agent);
        await page.waitForTimeout(180);
        const opacity=await page.evaluate(()=>[Number(getComputedStyle(document.querySelector('.slide-crossfade')).opacity),Number(getComputedStyle(document.querySelector('#slide.introducing .intro-panel')||document.querySelector('#slide .slide-heading')).opacity)]);
        assert.ok(opacity.every(v=>v>0&&v<1),'old scene and new portrait blend simultaneously');
        if(s.overviewPortraits&&intro.agent==='b')await page.screenshot({path:path.join(shots,'portrait-crossfade.png')});
      }
      await page.waitForFunction(()=>!document.querySelector('.slide-crossfade'));
      const from=await page.locator('.intro-art').boundingBox();
      await page.locator('#next').tap();
      await page.waitForFunction(()=>!!document.querySelector('.docking-bird'));
      assert.ok(await page.locator('[data-agent="'+intro.agent+'"] .portrait').evaluate(e=>e.classList.contains('arriving')));
      await page.waitForTimeout(420);
      const mid=await page.locator('.docking-bird').boundingBox();
      assert.ok(mid.width<from.width&&mid.width>25,'portrait shrinks in flight');
      await page.waitForTimeout(430);
      const nearEnd=await page.locator('.docking-bird').boundingBox();
      const destination=await page.locator('[data-agent="'+intro.agent+'"] .portrait').boundingBox();
      assert.ok(Math.abs(nearEnd.x-destination.x)<8&&Math.abs(nearEnd.y-destination.y)<8,'portrait lands at its actual node');
      if(s.id==='flag-umweg'||s.scene==='swarm')await page.screenshot({path:path.join(shots,'flight-'+s.id+'-'+intro.agent+'.png')});
      await page.waitForFunction(()=>!document.querySelector('.docking-bird'));
      assert.ok(await page.locator('[data-agent="'+intro.agent+'"] .portrait').isVisible());
      assert.equal(await page.locator('.arriving').count(),0);
    }
  }
  // Returning to a portrait, replaying and interrupting a blend stay clean.
  await page.locator('#prev').tap();assert.equal(await page.locator('.slide-crossfade').count(),1);
  await page.locator('#settings').tap();assert.equal(await page.locator('.slide-crossfade').count(),0);
  await page.locator('[data-close=settingsDialog]').tap();await page.locator('#replay').tap();
  assert.equal(await page.locator('.slide-crossfade').count(),1);
  await page.locator('#next').tap();assert.equal(await page.locator('.slide-crossfade').count(),0);
  // Resize, dialog opening and rapid navigation must not leave ghost portraits.
  await jump('flag-umweg');await page.locator('#next').tap();await page.locator('#settings').tap();
  assert.equal(await page.locator('.docking-bird').count(),0);
  await page.locator('[data-close=settingsDialog]').tap();
  await page.locator('#prev').tap();await page.locator('#next').tap();await page.setViewportSize({width:1180,height:820});
  await page.waitForFunction(()=>!document.querySelector('.docking-bird'));assert.equal(await page.locator('.arriving').count(),0);
  // Real fullscreen entry/exit: modal closed before top-layer promotion.
  await jump('mitnehmen');await page.locator('#settings').tap();
  const fullPosition=await page.locator('#position').textContent();await page.locator('#fullscreen').tap();
  await page.waitForFunction(()=>!!document.fullscreenElement);
  assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.locator('#position').textContent(),fullPosition);
  await page.locator('#settings').tap();
  assert.ok(await page.locator('#settingsDialog').evaluate(d=>{const r=d.getBoundingClientRect();return d.contains(document.elementFromPoint(r.x+r.width/2,r.y+40));}),'settings must be topmost in fullscreen');
  await page.screenshot({path:path.join(shots,'fullscreen-settings.png')});
  await page.locator('#fullscreen').tap();await page.waitForFunction(()=>!document.fullscreenElement);assert.equal(await page.locator('dialog[open]').count(),0);
  // Unsupported/fullscreen-denied browsers get an operable explanation.
  await page.evaluate(()=>{window.originalFullscreen=document.documentElement.requestFullscreen;document.documentElement.requestFullscreen=()=>Promise.reject(Error('denied'));});
  await page.locator('#settings').tap();await page.locator('#fullscreen').tap();
  await page.waitForFunction(()=>document.getElementById('fullscreenStatus').textContent.includes('nicht verfügbar'));
  assert.ok(await page.locator('#settingsDialog').isVisible());await page.locator('[data-close=settingsDialog]').tap();
  await page.evaluate(()=>document.documentElement.requestFullscreen=window.originalFullscreen);
  await jump('flag-umweg');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.body.classList.contains('no-motion'));
  assert.equal(await page.locator('#slide .flock-band').first().evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.equal(await page.locator('#introPanel .bird-head').first().evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.locator('#next').tap();assert.equal(await page.locator('.docking-bird').count(),0);assert.equal(await page.locator('.arriving').count(),0);
  await openStory(page,app+'?fresh-entry=2#entscheidung');await page.waitForURL('**#auftakt');await page.evaluate(()=>location.hash='entscheidung');await page.waitForURL('**#bewertung');
  assert.equal(await page.locator('.slide-crossfade').count(),0);

  // The light palette changes text and diagram strokes, not the narrative position.
  await jump('flag-umweg');const themePosition=await page.locator('#buildPosition').textContent();
  await page.locator('#settings').tap();await page.locator('input[name=theme][value=light]').check();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  assert.equal(await page.locator('#buildPosition').textContent(),themePosition);
  await page.screenshot({path:path.join(shots,'light-settings.png')});
  await page.locator('[data-close=settingsDialog]').tap();await page.reload();await page.locator('#next').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  assert.equal(await page.locator('#position').textContent(),'Folie 01 / 31');
  const luminance=h=>{const rgb=h.trim().slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
  const palette=await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);return Object.fromEntries(['bg','ink','muted','gold','mint','order','risk',...['p','b','c','r','m','j','l'].map(k=>'agent-'+k)].map(k=>[k,s.getPropertyValue('--'+k)]));});
  for(const [key,color]of Object.entries(palette).filter(([k])=>k!=='bg'))assert.ok((luminance(palette.bg)+.05)/(luminance(color)+.05)>=4.5,'light text contrast '+key);
  for(const [width,height]of [[1024,768],[768,1024],[390,844]]){
    await page.setViewportSize({width,height});
    for(const s of data.slides){
      await jump(s.id);await page.locator('#replay').isVisible().then(async v=>{if(v)await page.locator('#replay').tap();});
      if(s.introductions?.some(i=>i.step===0)&&width===1024)await page.screenshot({path:path.join(shots,'light-intro-'+s.id+'.png')});
      for(let step=1;step<s.cues.length;step++)await page.locator('#next').evaluate(e=>e.click());
      assert.ok(await page.locator('#viewport').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'light horizontal overflow '+s.id);
      if(width>=768)assert.ok(await page.locator('#viewport').evaluate(e=>e.scrollHeight<=e.clientHeight+2),'light vertical overflow '+s.id);
      if(['schwarm-organigramm','nachrichtenbrett','mitnehmen'].includes(s.id))await page.screenshot({path:path.join(shots,'light-'+width+'-'+s.id+'.png')});
    }
  }
  await page.locator('#settings').tap();await page.locator('input[name=theme][value=dark]').check();await page.locator('[data-close=settingsDialog]').tap();await page.reload();await page.locator('#next').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  console.log('PASS: light/dark selection, persistence, contrast and light tablet/mobile layouts.');
  // Stronger projector silhouettes, independent of palette and narrative position.
  await page.setViewportSize({width:1024,height:768});await jump('schwarm-organigramm');
  const projectorPosition=await page.locator('#buildPosition').textContent();
  await page.locator('#settings').tap();await page.locator('#projector').check();
  assert.equal(await page.locator('#buildPosition').textContent(),projectorPosition);
  for(const theme of ['dark','light']){
    await page.locator('input[name=theme][value='+theme+']').check();
    await page.locator('[data-close=settingsDialog]').tap();
    assert.equal(await page.locator('#slide .flock-layer').evaluate(e=>getComputedStyle(e).opacity),'0.23');
    await page.screenshot({path:path.join(shots,'projector-'+theme+'.png')});
    await page.locator('#settings').tap();
  }
  await page.locator('[data-close=settingsDialog]').tap();await page.reload();await page.locator('#next').click();
  assert.equal(await page.locator('html').getAttribute('data-projector'),'true');
  assert.equal(await page.locator('#position').textContent(),'Folie 01 / 31');
  await page.locator('#settings').tap();assert.ok(await page.locator('#projector').isChecked());
  await page.locator('#projector').uncheck();await page.locator('[data-close=settingsDialog]').tap();
  assert.equal(await page.locator('#slide .flock-layer').evaluate(e=>getComputedStyle(e).opacity),'0.13');
  console.log('PASS: projector contrast in both palettes, touch controls and saved preference.');
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert.ok(requests.every(u=>u.startsWith(base+'/')||u.startsWith(origin+'/LearningApps/fonts/')||u.startsWith('blob:')),'unexpected external request');
  await openStory(page,'file://'+path.join(root,'huggingface-fall.html')+'#nachrichtenbrett');assert.equal(await page.locator('#position').textContent(),'Folie 01 / 31');await jump('flag-umweg');await page.locator('#next').tap();assert.match(await page.locator('#buildPosition').textContent(),/2 \/ 4/);
  console.log('PASS: 31 narrative slides; 5 layouts; no node collisions; staged diagrams; playback pause/end; start at slide one; notes; reset; reduced motion; downloads; local files; no remote requests.');
  let w;
  try{w=await webkit.launch({headless:true,...(process.env.HF_WEBKIT_EXECUTABLE_PATH?{executablePath:process.env.HF_WEBKIT_EXECUTABLE_PATH}:{})});const p=await w.newPage({viewport:{width:1024,height:768},hasTouch:true});await openStory(p,app);await p.locator('#next').tap();assert.equal(await p.locator('#buildPosition').textContent(),'Aufbau 1 / 4');await p.locator('#settings').tap();await p.locator('#motion').uncheck();await p.locator('[data-close=settingsDialog]').tap();for(const s of data.slides){await openStory(p,app+'?fresh-entry='+s.id+'#'+s.id);assert.equal(await p.locator('#position').textContent(),'Folie 01 / 31');await p.evaluate(id=>location.hash=id,s.id);await p.waitForFunction(id=>document.getElementById('slideTitle').textContent===HF_CASE_DATA.slides.find(s=>s.id===id).title,s.id);await p.evaluate(()=>document.fonts.ready);assert.ok(await p.locator('#viewport').evaluate(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+2),'WebKit overflow '+s.id);}
    await p.locator('#settings').tap();await p.locator('#motion').check();await p.locator('[data-close=settingsDialog]').tap();
    for(const s of data.slides.filter(s=>s.introductions)){
      await openStory(p,app+'?fresh-entry='+s.id+'#'+s.id);assert.equal(await p.locator('#position').textContent(),'Folie 01 / 31');await p.evaluate(id=>location.hash=id,s.id);await p.waitForFunction(id=>document.getElementById('slideTitle').textContent===HF_CASE_DATA.slides.find(s=>s.id===id).title,s.id);await p.locator('#replay').tap();
      const intro=s.introductions[0];for(let i=0;i<intro.step;i++)await p.locator('#next').tap();
      if(intro.step>0)assert.equal(await p.locator('.slide-crossfade').count(),1,'WebKit portrait fade');
      await p.waitForFunction(()=>!document.querySelector('.slide-crossfade'));
      await p.locator('#next').tap();await p.waitForFunction(()=>!!document.querySelector('.docking-bird'));
      await p.waitForFunction(()=>!document.querySelector('.docking-bird'));
      assert.ok(await p.locator('[data-agent="'+intro.agent+'"] .portrait').isVisible());
    }
    await p.locator('#settings').tap();await p.locator('#fullscreen').tap();
    await p.waitForFunction(()=>!!document.fullscreenElement||document.getElementById('fullscreenStatus').textContent.includes('nicht verfügbar'));
    if(await p.evaluate(()=>!!document.fullscreenElement)){
      assert.equal(await p.locator('dialog[open]').count(),0);
      await p.locator('#settings').tap();await p.locator('#fullscreen').tap();
      await p.waitForFunction(()=>!document.fullscreenElement);
    }else assert.ok(await p.locator('#settingsDialog').isVisible());

    if(!await p.locator('#settingsDialog').isVisible())await p.locator('#settings').tap();
    await p.locator('input[name=theme][value=light]').check();await p.locator('[data-close=settingsDialog]').tap();await p.reload();await p.locator('#next').click();
    assert.equal(await p.locator('html').getAttribute('data-theme'),'light');
    assert.equal(await p.locator('#position').textContent(),'Folie 01 / 31');
    console.log('PASS: WebKit touch, all slide layouts, animated docking, fullscreen/fallback and theme persistence.');

}catch(e){if(/Executable doesn't exist|browserType.launch/.test(e.message))console.log('WebKit unavailable; no claim of physical iPad testing.');else throw e;}finally{await w?.close();}
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
async function openStory(page,url){await page.goto(url);await page.locator('#next').click();}

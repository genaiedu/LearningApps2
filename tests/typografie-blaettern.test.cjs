const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
async function setup(t,{count=8,reduced=false,animation=true}={}){
 const dom=new JSDOM(read('typografie-lesedruck.html'),{runScripts:'outside-only',url:'https://example.test/typografie-lesedruck.html?embedded=1'}),w=dom.window;t.after(()=>w.close());
 const q=s=>w.document.querySelector(s),animations=[];
 Object.defineProperty(w.document,'fonts',{value:{load:async()=>[],ready:Promise.resolve()}});w.Range.prototype.getClientRects=()=>[];w.matchMedia=()=>({matches:reduced});w.scrollTo=()=>{};
 Object.defineProperty(w.HTMLElement.prototype,'offsetWidth',{get(){return 600;}});Object.defineProperty(w.HTMLElement.prototype,'offsetHeight',{get(){return 900;}});Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 1200;}});
 w.HTMLElement.prototype.getBoundingClientRect=function(){return{x:300,y:60,left:300,top:60,width:300,height:450,right:600,bottom:510};};
 if(animation)w.HTMLElement.prototype.animate=function(keyframes,options){const a={node:this,keyframes,options,cancelled:false,cancel(){this.cancelled=true;},finish(){this.onfinish?.();}};animations.push(a);return a;};
 w.Paged={Previewer:class{constructor(){this.polisher={destroy(){}};}async preview(source,styles,host){const book=w.document.createElement('div');book.className='pagedjs_pages';for(let i=0;i<count;i++){const page=w.document.createElement('div');page.className='pagedjs_page';page.id='page-'+i;page.dataset.pageNumber=i+1;const content=w.document.createElement('div');content.className='pagedjs_page_content';content.textContent='Text auf Seite '+(i+1);content.id='text-'+i;page.append(content);book.append(page);}host.append(book);return{total:count};}}};
 const catalogue=JSON.parse(read('data/typografie-fonts.json')),font=catalogue.families.find(f=>f.id==='ebgaramond'),settings={format:'book',alignment:'justify',headingStyle:'classic',numerals:'oldstyle',size:11,leading:1.4,toc:false,notes:false,roles:Object.fromEntries(['body','heading','contents','quote','note','data'].map(role=>[role,{font,weight:400}]))};
 w.eval(read('scripts/typografie-satzspiegel-core.js'));w.eval(read('scripts/typografie-lesedruck.js'));
 const layout=async()=>{w.dispatchEvent(new w.MessageEvent('message',{origin:w.location.origin,source:w.parent,data:{type:'typography-layout',id:1,document:{id:'probe',lang:'de',title:'Probe',sections:[],credit:'Probe',source:''},settings}}));await new Promise(r=>setImmediate(r));};await layout();
 const button=name=>[...q('.reader-navigation').querySelectorAll('button')].find(b=>b.textContent===name),visible=()=>[...q('#print-pages').querySelectorAll('.pagedjs_page:not(.reader-page-hidden)')].map(p=>Number(p.dataset.pageNumber));
 return{w,q,animations,layout,button,visible,next:()=>button('Weiter →').click(),back:()=>button('← Zurück').click(),finish:()=>animations.at(-1).finish()};
}
test('forward turn masks the OLD resting page and puts new text only on the reverse of the turning leaf',async t=>{
 const s=await setup(t);s.next();let stage=s.q('.reader-leaf-stage');assert.equal(stage.dataset.direction,'forward');assert.equal(stage.getAttribute('aria-hidden'),'true');assert.equal(stage.querySelector('.reader-resting-page').textContent,'','title has a blank left page');assert.ok(stage.querySelector('.reader-resting-page .reader-blank-page'),'blank retains the manuscript paper style');assert.match(stage.querySelector('.reader-turning-leaf>.reader-leaf-face').textContent,/Seite 1$/);assert.match(stage.querySelector('.reader-leaf-back').textContent,/Seite 2$/);assert.equal(stage.style.getPropertyValue('--leaf-scale'),'0.5');assert.equal(stage.querySelectorAll('[id]').length,0);assert.ok(s.button('Weiter →').disabled);s.finish();assert.deepEqual(s.visible(),[2,3]);
 s.next();stage=s.q('.reader-leaf-stage');assert.match(stage.querySelector('.reader-resting-page').textContent,/Seite 2$/);assert.equal(stage.querySelector('.reader-resting-page').style.left,'-100%');assert.match(stage.querySelector('.reader-turning-leaf>.reader-leaf-face').textContent,/Seite 3$/);assert.match(stage.querySelector('.reader-leaf-back').textContent,/Seite 4$/);assert.deepEqual(s.visible(),[4,5]);
 const a=s.animations.at(-1);assert.equal(a.keyframes.at(-1).transform,'rotateY(-180deg)');assert.equal(a.options.duration,850);s.next();assert.equal(s.animations.length,2,'cannot interleave turns');s.finish();assert.equal(s.q('.reader-leaf-stage'),null);assert.equal(a.cancelled,true);assert.ok(!s.button('Weiter →').disabled);
});
test('old-page snapshots are attached BEFORE the underlying spread changes visibility',async t=>{
 const s=await setup(t);s.next();s.finish();const records=[],observer=new s.w.MutationObserver(list=>records.push(...list));observer.observe(s.w.document.body,{childList:true,attributes:true,subtree:true,attributeFilter:['class']});s.next();await new Promise(r=>setImmediate(r));observer.disconnect();
 const mounted=records.findIndex(r=>[...r.addedNodes].some(n=>n.classList?.contains('reader-leaf-stage'))),reveal=records.findIndex(r=>r.type==='attributes'&&r.target.id==='page-3');assert.ok(mounted>=0&&reveal>mounted,'no frame can expose the next left page before the old page masks it');
});
test('a grey-value blur stays on the page snapshots outside the original page container',async t=>{
 const s=await setup(t);for(const area of s.q('#print-pages').querySelectorAll('.pagedjs_page_content'))area.style.filter='blur(1.5px)';s.next();for(const area of s.q('.reader-leaf-stage').querySelectorAll('.pagedjs_page_content'))assert.equal(area.style.filter,'blur(1.5px)');
});
test('backward turn preserves the old RIGHT page, including the final blank, and returns to the title',async t=>{
 const s=await setup(t,{count:6});s.next();s.finish();s.next();s.finish();s.next();s.finish();assert.deepEqual(s.visible(),[6]);assert.ok(s.button('Weiter →').disabled);
 s.back();let stage=s.q('.reader-leaf-stage');assert.equal(stage.dataset.direction,'backward');assert.equal(stage.querySelector('.reader-resting-page').textContent,'','blank last right page remains blank');assert.equal(stage.querySelector('.reader-resting-page').style.left,'100%');assert.match(stage.querySelector('.reader-turning-leaf>.reader-leaf-face').textContent,/Seite 6$/);assert.match(stage.querySelector('.reader-leaf-back').textContent,/Seite 5$/);assert.equal(s.animations.at(-1).keyframes.at(-1).transform,'rotateY(180deg)');s.finish();s.back();s.finish();s.back();stage=s.q('.reader-leaf-stage');assert.match(stage.querySelector('.reader-resting-page').textContent,/Seite 3$/);assert.match(stage.querySelector('.reader-leaf-back').textContent,/Seite 1$/);s.finish();assert.deepEqual(s.visible(),[1]);assert.ok(s.button('← Zurück').disabled);
});
test('reduced motion and missing animation support change spreads without snapshots',async t=>{
 for(const options of [{reduced:true},{animation:false}]){const s=await setup(t,options);s.next();assert.deepEqual(s.visible(),[2,3]);assert.equal(s.animations.length,0);assert.equal(s.q('.reader-leaf-stage'),null);s.back();assert.deepEqual(s.visible(),[1]);}
});
test('stationary masks cover exactly ONE page and reader CSS is cache-busted together with its script',()=>{
 const css=read('styles/typografie-lesedruck.css');assert.match(css,/\.reader-resting-page\{[^}]*width:100%;right:auto/);assert.match(css,/\.reader-turning-leaf\{[^}]*z-index:1/);
 const dom=new JSDOM(read('typografie-lesedruck.html'),{url:'https://example.test/typografie-lesedruck.html'}),document=dom.window.document,version=new URL(document.querySelector('script[src*="scripts/typografie-lesedruck.js"]').src).searchParams.get('v'),styleVersion=new URL(document.querySelector('link[href*="styles/typografie-lesedruck.css"]').href).searchParams.get('v');dom.window.close();assert.equal(styleVersion,version);assert.ok(read('scripts/typografie-langtext.js').includes('styles/typografie-lesedruck.css?v='+version));
});
test('the centre fold sits above opaque sheet backgrounds, is non-interactive and screen-only',()=>{
 const dom=new JSDOM('<style>'+read('styles/typografie-lesedruck.css')+'</style>'),sheet=dom.window.document.styleSheets[0];
 const screen=[...sheet.cssRules].find(rule=>rule.conditionText==='screen'),rules=[...screen.cssRules];
 const fold=rules.find(rule=>rule.selectorText==='.reader-paging .pagedjs_sheet::after');
 assert.ok(fold,'the sheet overlay also follows cloned pages during a turn');
 assert.equal(fold.style.content,"''");assert.equal(fold.style.position,'absolute');assert.equal(fold.style.inset,'0');
 assert.equal(fold.style['pointer-events'],'none');assert.equal(fold.style['z-index'],'9');assert.match(fold.style['box-shadow'],/inset/);
 assert.ok(![...sheet.cssRules].some(rule=>rule.selectorText?.includes('.pagedjs_sheet::after')),'no fold overlay in print media');
 assert.equal(rules.find(rule=>rule.selectorText==='.reader-paging .pagedjs_page').style['box-shadow'],'0 3px 14px #0002','the inner shadow is not doubled');
 dom.window.close();
});
test('resize, zoom, scrolling, fullscreen, printing and new layout clean up an active turn',async t=>{
 const s=await setup(t);for(const action of [()=>s.w.dispatchEvent(new s.w.Event('resize')),()=>s.button('+').click(),()=>s.q('#print-pages').dispatchEvent(new s.w.Event('scroll')),()=>s.w.dispatchEvent(new s.w.MessageEvent('message',{origin:s.w.location.origin,source:s.w.parent,data:{type:'typography-expanded',expanded:true}})),()=>s.w.dispatchEvent(new s.w.Event('beforeprint')),()=>s.button('Scrollansicht').click(),()=>s.layout()]){if(!s.w.document.documentElement.classList.contains('reader-paging'))s.button('Blätteransicht').click();s.next();assert.ok(s.q('.reader-leaf-stage'));const animation=s.animations.at(-1);await action();assert.equal(s.q('.reader-leaf-stage'),null);assert.equal(animation.cancelled,true);assert.equal(animation.onfinish,null);if(s.w.document.documentElement.classList.contains('reader-paging')){s.back();if(s.q('.reader-leaf-stage'))s.finish();}}
});

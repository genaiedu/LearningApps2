'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),tick=()=>new Promise(r=>setTimeout(r,190));
test('the standalone app loads local clipboard assets and responsive, palette-aware dialog styles',()=>{
 const html=read('schriftsetzer.html'),css=read('styles/schriftsetzer-zwischenablage.css');assert.ok(html.includes('scripts/schriftsetzer-zwischenablage.js?v=20261018-einfuegen'));assert.ok(html.includes('styles/schriftsetzer-zwischenablage.css?v=20261018-einfuegen'));
 assert.ok(css.includes('background:var(--white);color:var(--ink)'));assert.ok(css.includes('var(--button-ink,#fff)'));assert.ok(css.includes('@media(max-width:550px)'));assert.ok(css.includes('font-variant-ligatures:common-ligatures'));assert.ok(css.includes('font-kerning:normal'));
});
async function setup(t){
 const dom=new JSDOM(read('schriftsetzer.html'),{runScripts:'outside-only',url:'https://example.test/schriftsetzer.html'}),w=dom.window;t.after(()=>w.close());
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
 w.document.queryCommandState=()=>false;w.document.execCommand=()=>true;w.URL.createObjectURL=()=> 'blob:https://example.test/pasted';w.URL.revokeObjectURL=()=>{};
 w.fetch=async()=>({ok:true,json:async()=>JSON.parse(read('data/typografie-langtexte.json'))});
 let reads=0,clipboard=async()=> 'Wort aus der Zwischenablage';Object.defineProperty(w.navigator,'clipboard',{value:{readText:()=>{reads++;return clipboard();}}});
 w.eval(read('scripts/typografie-satzspiegel-core.js'));w.eval(read('scripts/typografie-langtext.js'));w.eval(read('scripts/schriftsetzer-zwischenablage.js'));w.TypoLongtext.setCatalogue(JSON.parse(read('data/typografie-fonts.json')));await new Promise(r=>setImmediate(r));
 const q=id=>w.document.getElementById(id),frame=w.document.querySelector('.longtext-print-frame'),sent=[];frame.contentWindow.postMessage=m=>sent.push(m);w.dispatchEvent(new w.MessageEvent('message',{origin:w.location.origin,source:frame.contentWindow,data:{type:'typography-ready'}}));await tick();
 return{w,q,sent,reads:()=>reads,clipboard(fn){clipboard=fn;},input(id,value){q(id).value=value;q(id).dispatchEvent(new w.Event('input'));}};
}
test('a visible entry opens a labeled native dialog without reading the clipboard',async t=>{
 const s=await setup(t);assert.equal(s.q('clipboard-open').disabled,false);assert.ok(s.q('clipboard-open').closest('section').compareDocumentPosition(s.w.document.querySelector('.document-import'))&s.w.Node.DOCUMENT_POSITION_FOLLOWING);
 s.q('clipboard-open').click();assert.equal(s.q('clipboard-dialog').open,true);assert.equal(s.w.document.activeElement,s.q('clipboard-text'));assert.equal(s.reads(),0);assert.equal(s.q('clipboard-apply').disabled,true);
 s.q('clipboard-cancel').click();assert.equal(s.q('clipboard-dialog').open,false);assert.equal(s.w.document.activeElement,s.q('clipboard-open'));assert.equal(s.sent.at(-1).document.id,'book');
});
test('manual paste creates safe paragraphs, reaches the real book workflow, and never uploads text',async t=>{
 const s=await setup(t);s.q('clipboard-open').click();s.input('clipboard-text','Erster Absatz.\r\n\r\nZweiter Absatz mit <script>kein Code</script>.');s.input('clipboard-name','Meine Satzprobe');s.q('clipboard-language').value='de';s.q('clipboard-apply').click();await tick();
 const job=s.sent.at(-1);assert.equal(job.document.id,'own');assert.equal(job.document.title,'Meine Satzprobe');assert.equal(job.document.lang,'de');assert.equal(job.settings.alignment,'justify');assert.equal(job.document.sections[0].blocks.length,2);assert.match(job.document.sections[0].blocks[1].runs[0].text,/<script>kein Code<\/script>/);assert.equal(s.q('longtext-editor').querySelector('script'),null);assert.match(s.q('longtext-print-view').href,/^blob:/);assert.equal(s.q('clipboard-dialog').open,false);assert.equal(s.q('clipboard-text').value,'');assert.equal(s.reads(),0);assert.equal(s.w.document.activeElement,s.q('longtext-editor'));
});
test('explicit clipboard read works, denial leaves a keyboard-paste fallback, and large input is never truncated',async t=>{
 const s=await setup(t);s.q('clipboard-open').click();s.q('clipboard-read').click();await tick();assert.equal(s.reads(),1);assert.equal(s.q('clipboard-text').value,'Wort aus der Zwischenablage');assert.equal(s.q('clipboard-apply').disabled,false);
 s.clipboard(async()=>{throw Error('denied');});s.q('clipboard-read').click();await tick();assert.match(s.q('clipboard-status').textContent,/⌘V oder Strg\+V/);assert.equal(s.w.document.activeElement,s.q('clipboard-text'));
 s.input('clipboard-text','x'.repeat(60001));assert.equal(s.q('clipboard-apply').disabled,true);assert.equal(s.q('clipboard-text').value.length,60001);assert.match(s.q('clipboard-status').textContent,/nicht abgeschnitten/);s.q('clipboard-apply').click();assert.equal(s.sent.at(-1).document.id,'book');
});
test('delayed clipboard responses cannot overwrite typing or a cancelled/reopened draft',async t=>{
 const s=await setup(t);let release;s.clipboard(()=>new Promise(resolve=>{release=resolve;}));s.q('clipboard-open').click();s.q('clipboard-read').click();s.input('clipboard-text','Selbst geschrieben');release('Alter Inhalt');await tick();assert.equal(s.q('clipboard-text').value,'Selbst geschrieben');
 s.q('clipboard-read').click();s.q('clipboard-cancel').click();s.q('clipboard-open').click();release('Zu spät angekommen');await tick();assert.equal(s.q('clipboard-text').value,'Selbst geschrieben');assert.equal(s.q('clipboard-read').disabled,false);
});

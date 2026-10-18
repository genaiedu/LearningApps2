'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),script=read('scripts/typografie-grauwert-vorschau.js'),css=read('styles/typografie-grauwert-vorschau.css');
function setup(t,file='schriftsetzer.html',{late=false}={}){
  const dom=new JSDOM(read(file),{runScripts:'outside-only',url:'https://example.test/'+file}),w=dom.window,q=s=>w.document.querySelector(s),frame=w.document.createElement('iframe'),sent=[];
  frame.className='longtext-print-frame';q('#longtext-stage').append(frame);frame.contentWindow.postMessage=(data,origin)=>sent.push({data,origin});
  if(late)frame.contentDocument.documentElement.dataset.ready='true';
  w.eval(script);t.after(()=>w.close());
  const message=(data,origin='https://example.test',source=frame.contentWindow)=>w.dispatchEvent(new w.MessageEvent('message',{data,origin,source}));
  return{w,q,frame,sent,message};
}
test('both applications load the shared preview controls; only the isolated renderer filters the pages',()=>{
  for(const file of ['typografie-atelier.html','schriftsetzer.html','typografie-lesedruck.html']){
    const html=read(file);assert.ok(html.includes('scripts/typografie-grauwert-vorschau.js?v=20261018-grauwert'));assert.ok(html.includes('styles/typografie-grauwert-vorschau.css?v=20261018-grauwert'));
  }
  assert.ok(css.includes('@media screen{#print-pages.grauwert-distance .pagedjs_page_content{filter:blur(1.5px)}}'));
  assert.ok(css.includes('@media print'));assert.ok(css.includes('filter:none!important'));
  assert.ok(!/\.longtext-print-frame\{[^}]*filter|\.print-toolbar[^}]*filter/.test(css));
  assert.ok(!/fetch\(|localStorage|setInterval|innerHTML|typography-layout/.test(script));
});
test('the atelier and standalone app gain reversible accessible controls after pagination',t=>{
  for(const file of ['typografie-atelier.html','schriftsetzer.html']){
    const s=setup(t,file),before=s.q('#longtext-stage').innerHTML;
    assert.equal(s.q('#longtext-grauwert-distance').disabled,true);
    s.message({type:'typography-paginated'});
    assert.equal(s.q('#longtext-grauwert-distance').disabled,false);
    s.q('#longtext-grauwert-distance').click();
    assert.equal(s.q('#longtext-grauwert-distance').getAttribute('aria-pressed'),'true');
    assert.equal(s.q('#longtext-grauwert-read').getAttribute('aria-pressed'),'false');
    assert.deepEqual(JSON.parse(JSON.stringify(s.sent.at(-1))),{data:{type:'typography-grauwert',distant:true},origin:'https://example.test'});
    assert.ok(s.q('#longtext-grauwert-note').textContent.includes('Druck und exportierte Dokumente bleiben scharf'));
    assert.equal(s.q('#longtext-grauwert-note').getAttribute('role'),'status');
    assert.equal(s.q('#longtext-grauwert-distance').getAttribute('aria-controls'),'longtext-stage');
    s.q('#longtext-grauwert-read').click();assert.equal(s.sent.at(-1).data.distant,false);
    assert.equal(s.q('#longtext-stage').innerHTML,before,'Only screen state is messaged; no document or frame URL is rewritten');
  }
});
test('untrusted messages are ignored; the selected view survives repagination and renderer recovery',t=>{
  const s=setup(t);s.message({type:'typography-paginated'},'https://other.test');s.message({type:'typography-paginated'},'https://example.test',s.w);
  assert.equal(s.q('#longtext-grauwert-distance').disabled,true);
  s.message({type:'typography-paginated'});s.q('#longtext-grauwert-distance').click();
  s.message({type:'typography-error'});assert.equal(s.q('#longtext-grauwert-distance').disabled,true);
  s.message({type:'typography-ready'});assert.equal(s.sent.at(-1).data.distant,true);
  s.message({type:'typography-paginated'});assert.equal(s.sent.at(-1).data.distant,true);assert.equal(s.q('#longtext-grauwert-distance').disabled,false);
  s.message({type:'typography-grauwert-state',distant:false});assert.equal(s.q('#longtext-grauwert-read').getAttribute('aria-pressed'),'true');assert.equal(s.sent.at(-1).data.distant,false);
  const late=setup(t,'schriftsetzer.html',{late:true});assert.equal(late.q('#longtext-grauwert-distance').disabled,false);
});
test('the embedded renderer accepts only its same-origin parent and keeps its original content',t=>{
  const dom=new JSDOM('<main id="print-pages"><div class="pagedjs_page_content">Ein Text.</div></main><nav class="reader-navigation"></nav>',{runScripts:'outside-only',url:'https://example.test/typografie-lesedruck.html?embedded=1'}),w=dom.window,sent=[],parent={postMessage:data=>sent.push(data)};t.after(()=>w.close());
  Object.defineProperty(w,'parent',{value:parent});w.eval(script);const pages=w.document.getElementById('print-pages'),before=pages.innerHTML;
  const message=(data,origin='https://example.test',source=parent)=>w.dispatchEvent(new w.MessageEvent('message',{data,origin,source}));
  message({type:'typography-grauwert',distant:true},'https://other.test');message({type:'typography-grauwert',distant:true},'https://example.test',w);assert.equal(pages.className,'');
  message({type:'typography-grauwert',distant:true});assert.ok(pages.classList.contains('grauwert-distance'));
  message({type:'typography-grauwert',distant:'true'});assert.equal(pages.className,'');assert.equal(pages.innerHTML,before);
  const toggle=w.document.querySelector('.grauwert-preview-toggle');assert.ok(toggle);toggle.click();assert.equal(toggle.getAttribute('aria-pressed'),'true');assert.ok(pages.classList.contains('grauwert-distance'));assert.equal(sent.at(-1).type,'typography-grauwert-state');assert.equal(sent.at(-1).distant,true);
});
test('standalone and exported print documents never adopt preview blur',t=>{
  for(const query of ['', '?embedded=1']){
    const dom=new JSDOM('<main id="print-pages"><div class="pagedjs_page_content">Scharf gedruckt.</div></main>',{runScripts:'outside-only',url:'https://example.test/typografie-lesedruck.html'+query}),w=dom.window;t.after(()=>w.close());w.eval(script);
    w.dispatchEvent(new w.MessageEvent('message',{source:w,origin:'https://example.test',data:{type:'typography-grauwert',distant:true}}));
    assert.equal(w.document.getElementById('print-pages').className,'');
  }
});

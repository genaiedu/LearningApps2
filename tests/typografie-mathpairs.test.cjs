const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../scripts/typografie-mathpairs.js'),root=path.resolve(__dirname,'..');
test('four genuine math families, six local reading families and five formula tasks',()=>{
  assert.deepEqual(Object.keys(C.fonts),['newcm','stix2','pagella','fira']);
  assert.equal(Object.keys(C.bodies).length,6);assert.equal(Object.keys(C.examples).length,5);
  const catalogue=JSON.parse(fs.readFileSync(path.join(root,'data/typografie-fonts.json')));
  for(const body of Object.values(C.bodies))assert.ok(catalogue.families.some(f=>f.name===body.name));
  for(const font of Object.keys(C.fonts))for(const body of Object.keys(C.bodies)){
    const s=C.settings({font,body,example:'matrix'});assert.deepEqual(s,{font,body,example:'matrix'});
    assert.ok(C.advice(font,body).startsWith(C.bodies[body].name));
  }
});
test('unknown values cannot select an arbitrary URL, font or formula',()=>{
  for(const unsafe of ['https://evil.example/font','__proto__','constructor','toString',null]){
    assert.deepEqual(C.settings({font:unsafe,body:unsafe,example:unsafe}),{font:'newcm',body:'garamond',example:'fraction'});
  }
  for(const font of Object.keys(C.fonts))assert.equal(C.settings({font,body:'suggested'}).body,C.fonts[font].body);
});
test('browser font components and dynamic parts are local and version-matched',()=>{
  for(const name of ['stix2','pagella','fira']){
    const dir=path.join(root,'fonts/mathjax/mathjax-'+name),script=fs.readFileSync(path.join(dir,'chtml.js'),'utf8');
    assert.ok(script.includes('"4.1.2","font"'));assert.ok(script.includes('mathjax-'+name));
    const files=fs.readdirSync(path.join(dir,'chtml/woff2'));assert.ok(files.length>10);assert.ok(files.every(f=>f.endsWith('.woff2')));
    assert.ok(fs.existsSync(path.join(dir,'chtml/dynamic/accents.js')));
  }
  assert.ok(fs.readFileSync(path.join(root,'fonts/mathjax/LICENSE-MathJax.txt'),'utf8').includes('Apache License'));
  for(const name of ['stix2','fira'])assert.ok(fs.readFileSync(path.join(root,'fonts/mathjax/mathjax-'+name+'/OFL.txt'),'utf8').includes('SIL OPEN FONT LICENSE'));
  assert.ok(fs.readFileSync(path.join(root,'fonts/mathjax/mathjax-pagella/GUST-FONT-LICENSE.txt'),'utf8').includes('GUST Font License'));
  assert.ok(fs.readFileSync(path.join(root,'fonts/mathjax/mathjax-pagella/LPPL-1.3c.txt'),'utf8').includes('LaTeX Project Public License'));
  assert.ok(fs.existsSync(path.resolve(root,'../LearningApps/fonts/mathjax-newcm/chtml/woff2')));
  const child=fs.readFileSync(path.join(root,'scripts/typografie-mathvergleich.js'),'utf8');
  assert.ok(child.includes("dynamicPrefix:base+'/chtml/dynamic'"));assert.ok(child.includes('matchFontHeight:false'));
  assert.ok(!/https?:\/\//.test(child));
});
test('comparison documents enforce local assets and keep real accessible math',()=>{
  const html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8'),frame=fs.readFileSync(path.join(root,'typografie-mathvergleich.html'),'utf8');
  assert.equal((html.match(/data-math-font=/g)||[]).length,4);
  assert.equal((html.match(/<iframe loading="lazy" data-math-font=/g)||[]).length,4);
  assert.ok(frame.includes("font-src 'self'"));assert.ok(frame.includes("script-src 'self'"));
  assert.ok(frame.includes('id="pair-inline"'));assert.ok(frame.includes('id="pair-display"'));
  for(const key of Object.keys(C.examples))assert.ok(html.includes('value="'+key+'"'));
  for(const [name] of Object.entries(C.fonts))assert.ok(html.includes('id="math-pair-note-'+name+'"'));
  for(const phrase of ['Serifentext + Serifenformel','Sans-Text + Sans-Formel','Sans-Text + Serifenformel','Schriftfarbe:','keine vorgeschriebenen Kombinationen','Alle Textschriftproben'])assert.ok(html.includes(phrase));
  assert.ok(!html.includes('Alle Schriftproben dieser App verwenden lokal eingebundene Google-Font-Familien.'));
});
test('parent synchronizes all four frames and ignores stale or unrelated messages',()=>{
  const source=fs.readFileSync(path.join(root,'scripts/typografie-atelier.js'),'utf8');
  const code=source.slice(source.indexOf('  const mathExamples='),source.indexOf('  let mathQueue='));
  const elements={'math-pair-body':{value:'suggested'},'math-example':{value:'fraction'},'math-pair-status':{textContent:''}},frames=[],messages=[],handlers={};
  for(const font of Object.keys(C.fonts)){
    for(const prefix of ['math-pair-label-','math-pair-note-'])elements[prefix+font]={textContent:''};
    frames.push({dataset:{mathFont:font},style:{},contentWindow:{postMessage(data,origin){messages.push({font,data,origin});}}});
  }
  vm.runInNewContext(code,{$:id=>elements[id],window:{TypoMathPairs:C},document:{querySelectorAll:()=>frames},location:{origin:'http://127.0.0.1:8891',protocol:'http:'},addEventListener:(event,fn)=>handlers[event]=fn});
  assert.equal(messages.length,4);
  for(const {font,data,origin} of messages){assert.equal(data.body,C.fonts[font].body);assert.equal(origin,'http://127.0.0.1:8891');}
  elements['math-pair-body'].value='sourcesans';elements['math-pair-body'].onchange();
  assert.ok(messages.slice(-4).every(m=>m.data.body==='sourcesans'));
  for(const frame of frames){
    assert.ok(elements['math-pair-label-'+frame.dataset.mathFont].textContent.includes('ohne Serifen'));
    const data={type:'typografie-math-rendered',font:frame.dataset.mathFont,body:'sourcesans',example:'fraction'};
    handlers.message({origin:'http://127.0.0.1:8891',source:frame.contentWindow,data});
  }
  assert.ok(elements['math-pair-status'].textContent.startsWith('Alle vier'));
  const previous=elements['math-pair-status'].textContent;
  handlers.message({origin:'https://evil.example',source:frames[0].contentWindow,data:{type:'typografie-math-error',font:'newcm'}});
  handlers.message({origin:'http://127.0.0.1:8891',source:{},data:{type:'typografie-math-error',font:'newcm'}});
  assert.equal(elements['math-pair-status'].textContent,previous);
  elements['math-pair-body'].value='suggested';elements['math-example'].value='integral';elements['math-pair-body'].onchange();
  assert.ok(messages.slice(-4).every(m=>m.data.example==='integral'&&m.data.body===C.fonts[m.font].body));
  const loading=elements['math-pair-status'].textContent;
  handlers.message({origin:'http://127.0.0.1:8891',source:frames[0].contentWindow,data:{type:'typografie-math-rendered',font:'newcm',body:'sourcesans',example:'fraction'}});
  assert.equal(elements['math-pair-status'].textContent,loading);
  handlers.message({origin:'http://127.0.0.1:8891',source:frames[0].contentWindow,data:{type:'typografie-math-height',font:'newcm',height:100000}});
  assert.equal(frames[0].style.height,'1600px');
});

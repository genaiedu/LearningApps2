const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const S=require('../scripts/uvvis-spectrum-colors.js');
test('Visible strip respects wavelength coordinates and leaves UV uncoloured',()=>{
 const dom=new JSDOM('<svg>'+S.strip(280,650,{left:100,right:840,y:320,id:'test-spectrum'})+'</svg>');
 const d=dom.window.document,rect=d.querySelector('rect[fill="url(#test-spectrum)"]');
 assert.equal(Number(rect.getAttribute('x')),300);assert.equal(Number(rect.getAttribute('width')),540);
 assert.match(d.querySelector('svg').textContent,/UV · unsichtbar/);
 assert.doesNotMatch(S.strip(250,310),/linearGradient/);
 assert.match(S.strip(700,850),/IR · unsichtbar/);dom.window.close();
});
test('Interactive additive colour circle shows opposite pairs and keyboard selection',()=>{
 const dom=new JSDOM('<article id="wheel"></article>',{runScripts:'outside-only'}),w=dom.window;
 w.eval(fs.readFileSync(path.resolve(__dirname,'../scripts/uvvis-spectrum-colors.js'),'utf8'));
 const host=w.document.getElementById('wheel');w.UVVisSpectrumColors.mount(host);
 assert.equal(host.querySelectorAll('[data-sector]').length,12);
 const select=host.querySelector('select');select.value='8';select.dispatchEvent(new w.Event('change'));
 assert.match(host.querySelector('.complement-pair').textContent,/Herausgefiltert: Blau/);assert.match(host.querySelector('.complement-pair').textContent,/Gegenüberliegend: Gelb/);
 host.querySelector('[data-sector="0"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 assert.match(host.querySelector('.complement-pair').textContent,/Gegenüberliegend: Cyan/);dom.window.close();
});
test('Measured multiband and shoulder presets switch dyes, reveal curves and retain colour strip',()=>{
 const dom=new JSDOM(fs.readFileSync(path.resolve(__dirname,'../uvvis-labor.html'),'utf8'),{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 w.UVVis=require('../scripts/uvvis-core.js');w.UVVisCuvette={...require('../scripts/uvvis-cuvette.js'),scene:()=>({update(){}})};w.UVVisProbability={mount(){}};
 for(const file of ['uvvis-spectrum-colors','uvvis-experiments'])w.eval(fs.readFileSync(path.resolve(__dirname,'../scripts/'+file+'.js'),'utf8'));
 w.UVVisExperiments.mount(require('../data/uvvis-spectra.json').substances);
 const buttons=[...d.querySelectorAll('.band-examples button')];assert.equal(buttons.length,3);buttons[0].click();assert.equal(d.getElementById('color-dye').value,'L02');assert.match(d.querySelector('.band-task').textContent,/617/);assert.ok(d.querySelector('#color-spectrum linearGradient'));assert.ok(d.querySelector('#color-spectrum path[stroke="#ad6d8b"]'));
 buttons[1].click();assert.equal(d.getElementById('color-dye').value,'N05');assert.match(d.querySelector('.band-task').textContent,/485/);
 d.getElementById('color-dye').value='J03';d.getElementById('color-dye').onchange();assert.equal(d.querySelector('.band-task').textContent,'');dom.window.close();
});

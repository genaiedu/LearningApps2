const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8');
const script=fs.readFileSync(path.join(root,'scripts/typografie-geschichte.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles/typografie-geschichte.css'),'utf8');
const chapter=html.slice(html.indexOf('<section class="chapter wrap letter-history"'),html.indexOf('<section class="chapter wrap" id="schriftformen">'));
const history=require('../scripts/typografie-geschichte.js');
const credits=JSON.parse(fs.readFileSync(path.join(root,'assets/typografie/geschichte/bildnachweise.json'),'utf8'));

test('history really opens the characters part and all nine labels match its navigation',()=>{
  const part=html.slice(html.indexOf('data-part="zeichen"'),html.indexOf('data-part="papier"'));
  const ids=['buchstabengeschichte','schriftformen','details','lucide','mathematiksatz','beginn','lokal','katalog','schrift-downloads'];
  const nav=part.match(/<nav class="part-contents"[\s\S]*?<\/nav>/)[0];
  assert.deepEqual([...nav.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]),ids);
  assert.deepEqual([...part.matchAll(/class="section-label">I\.(\d+)/g)].map(x=>Number(x[1])),[1,2,3,4,5,6,7,8,9]);
  assert.deepEqual([...chapter.matchAll(/<article class="history-station" id="([^"]+)"/g)].map(x=>x[1]),['geschichte-griechen','geschichte-roemer','geschichte-minuskel','geschichte-buchdruck','geschichte-zeitung','geschichte-computer']);
  assert.equal((chapter.match(/class="history-look"/g)||[]).length,6);
  assert.doesNotMatch(chapter,/author-comment|comment-opening/);
  assert.match(chapter,/nicht die Geschichte aller Schriftsysteme/);
  assert.match(chapter,/nicht einfach verkleinerte Kopien/);
  assert.match(chapter,/er erfindet die Kleinbuchstaben nicht allein/);
  assert.match(chapter,/ältere Vorläufer in Ostasien/);
});

test('every station has an actual local picture, intact proportions and verified image credits',()=>{
  const images=[...chapter.matchAll(/<img src="([^"]+)" width="(\d+)" height="(\d+)"[^>]+alt="([^"]+)"/g)];
  assert.equal(images.length,6);assert.equal(credits.images.length,9);
  for(const [i,image] of images.entries()){
    const credit=credits.images[i];
    assert.equal(image[1],history.base+credit.file);
    assert.equal(Number(image[2]),credit.width);assert.equal(Number(image[3]),credit.height);
    assert.ok(image[4].length>40);assert.ok(credit.creator.length>10);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,image[1]))).digest('hex'),credit.sha256);
    assert.ok(chapter.includes(credit.source.replace(/&/g,'&amp;')));
    assert.match(credit.license,/CC BY|Public domain/);
  }
  assert.match(chapter,/zeitung-linotype\.jpg/);assert.match(chapter,/computer-vt100\.jpg/);
  assert.match(chapter,/nicht die eigentliche Druckpresse/);
  assert.match(chapter,/Foto: Dave Fischer/);assert.match(chapter,/spätere Aufnahme des historischen Geräts/);
  assert.match(chapter,/CC BY-SA 3\.0/);assert.match(chapter,/CC BY-SA 2\.0/);assert.match(chapter,/CC BY 2\.5/);
  assert.doesNotMatch(chapter,/<img[^>]+src="https?:/);
  assert.doesNotMatch(script,/\bfetch\(|localStorage|sessionStorage/);
});

test('external links reject active or credential-bearing URLs and raster values stay bounded',()=>{
  for(const u of ['javascript:alert(1)','http://example.com','data:text/html,test','https://name:secret@example.com','not a url'])assert.equal(history.externalURL(u),null);
  assert.equal(history.externalURL('https://commons.wikimedia.org/wiki/File:Vt100-adventure.jpg'),'https://commons.wikimedia.org/wiki/File:Vt100-adventure.jpg');
  assert.equal(history.resolution('invalid'),16);assert.equal(history.resolution(Infinity),16);
  assert.equal(history.resolution(-100),12);assert.equal(history.resolution(1000),64);assert.equal(history.resolution(22.8),23);
});

test('first-opening disclaimer is cancellable, forgets consent on reload and preserves native link action',()=>{
  function setup(){
    const listeners=[],nodes={};
    for(const id of ['history-external-dialog','history-external-open','history-external-cancel','history-external-name'])nodes[id]={events:{},open:false,addEventListener(type,fn){this.events[type]=fn;},showModal(){this.open=true;this.shown=(this.shown||0)+1;},close(){this.open=false;this.events.close?.();}};
    const document={getElementById:id=>nodes[id]||null,addEventListener(type,fn){if(type==='click')listeners.push(fn);}};
    vm.runInNewContext(script,{document,URL});
    function click(href){const anchor={href,focus(){this.focused=true;}};const event={target:{closest:selector=>selector==='a[data-history-external]'?anchor:null},preventDefault(){this.prevented=true;}};listeners.forEach(fn=>fn(event));return event;}
    return {nodes,click};
  }
  const {nodes,click}=setup();const dialog=nodes['history-external-dialog'],open=nodes['history-external-open'];
  assert.ok(click('https://commons.wikimedia.org/wiki/File:test.jpg').prevented);assert.ok(dialog.open);
  nodes['history-external-cancel'].events.click();assert.equal(dialog.open,false);
  assert.ok(click('https://creativecommons.org/licenses/by-sa/3.0/').prevented);assert.ok(dialog.open);
  const event={preventDefault(){this.prevented=true;}};open.events.click(event);
  assert.equal(event.prevented,undefined);assert.equal(dialog.open,false);
  assert.equal(open.href,'https://creativecommons.org/licenses/by-sa/3.0/');
  assert.equal(click('https://www.loc.gov/').prevented,undefined);
  assert.ok(click('javascript:alert(1)').prevented);
  assert.ok(setup().click('https://www.loc.gov/').prevented);
});

test('pixel and outline experiment isolates the same local font, resolution and accessible feedback',()=>{
  assert.match(script,/document\.fonts\.load\('400 88px "Fira Sans"','a'\)/);
  assert.match(script,/fonts\.length>0/);assert.match(script,/ctx\.imageSmoothingEnabled=false/);
  assert.match(script,/sample\.font='400 '\+\(n\*\.88\)/);
  assert.match(css,/svg text\{font-family:"Fira Sans"/);
  assert.match(chapter,/kein historischer Font/);assert.match(chapter,/deren Entwürfe oder Hinting nicht nach/);
  assert.match(chapter,/id="history-resolution" type="range" min="12" max="64"/);
  assert.match(chapter,/id="history-raster-status" role="status"/);
  assert.match(script,/attributeFilter:\['data-theme','data-palette','style'\]/);
  assert.match(script,/picture\.removeAttribute\('src'\)/);assert.match(script,/child\.cloneNode\(true\)/);
  assert.match(css,/@media\(max-width:900px\)/);assert.match(css,/@media\(max-width:480px\)/);assert.match(css,/@media print/);
  assert.match(css,/background:var\(--paper\);color:var\(--ink\)/);
});

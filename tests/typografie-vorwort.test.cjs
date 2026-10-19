'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8'),html=read('typografie-atelier.html');
function setup(t){const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.test/typografie-atelier.html'});t.after(()=>dom.window.close());return dom.window;}
test('the expanded personal essay appears once as a preface before Part I, with no chapter retrospection',t=>{
 const w=setup(t),d=w.document,preface=d.querySelector('[data-reading-preface]'),voice=preface.querySelector('[data-randstimme="handschrift"]');
 assert.equal(d.querySelectorAll('#handschrift-der-seite').length,1);
 assert.equal(d.querySelectorAll('[data-randstimme="handschrift"]').length,1);
 assert.ok(preface.compareDocumentPosition(d.getElementById('teil-zeichen'))&w.Node.DOCUMENT_POSITION_FOLLOWING);
 assert.equal(preface.closest('.atelier-part'),null);
 assert.match(preface.querySelector('.section-label').textContent,/Vorwort.*Typografie im KI-Zeitalter/);
 assert.ok(voice.querySelectorAll('p').length>8);
 assert.doesNotMatch(voice.textContent,/Ich habe.*erzählt|im ersten Teil|aus dem zweiten Teil|Dort lautete|zum Schluss/);
 assert.equal(voice.querySelectorAll('a[href^="#"]').length,0);
 for(const phrase of ['Warum sich heute noch mit Typografie beschäftigen?','Wirklich?','Geeignete Schriftdateien und Satzprogramme','Die Antworten muss ich am Ergebnis überprüfen.','Die KI kann setzen. Ob die Seite nach mir aussieht, entscheide ich.'])assert.ok(voice.textContent.includes(phrase),phrase);
 assert.equal(d.querySelector('#start .primary').hash,'#handschrift-der-seite');
 assert.equal(d.querySelector('.skip').hash,'#handschrift-der-seite');
 assert.equal(d.querySelector('[data-part="bildschirm"] a[href="#handschrift-der-seite"]'),null);
});
test('the reading path lists the preface first and only once, not as a final appendix',t=>{
 const w=setup(t),d=w.document;w.eval(read('scripts/lesepfad.js'));
 const groups=d.querySelectorAll('.reading-menu-group');
 assert.equal(groups[0].querySelector('p').textContent,'Vorwort');
 assert.equal(groups[1].querySelector('p').textContent,'I · Zeichen');
 assert.equal(d.querySelectorAll('.reading-menu a[href="#handschrift-der-seite"]').length,1);
 assert.equal(d.querySelector('[data-reading-preface] .reading-next a').hash,'#buchstabengeschichte');
 assert.equal(groups[groups.length-1].querySelector('a[href="#handschrift-der-seite"]'),null);
 assert.ok(d.body.classList.contains('reading-ready'));
});

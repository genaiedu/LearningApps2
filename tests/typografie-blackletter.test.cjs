'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('typografie-atelier.html'),css=read('styles/typografie-atelier.css');
const catalogue=require('../data/typografie-fonts.json'),audit=require('../data/typografie-fontaudit.json'),A=require('../scripts/typografie-fontaudit.js');
const section=html.slice(html.indexOf('id="gebrochene-schriften"'),html.indexOf('id="buchstaben-varianten"'));

test('broken scripts follow the completed Sans discussion and explain the Fraktur name',()=>{
  assert.ok(html.indexOf('id="sans-formen"')<html.indexOf('id="gebrochene-schriften"'));
  assert.ok(html.indexOf('font-role-explanation')<html.indexOf('id="gebrochene-schriften"'));
  for(const phrase of ['fractura</em> – Bruch','gebrochenen Rundungen','Textura ist nicht nur ein anderer Name.','keine originalgetreue historische Textura'])assert.ok(section.toLowerCase().includes(phrase.toLowerCase()),phrase);
  assert.ok(html.includes('href="#gebrochene-schriften"'));
  assert.match(html,/<option value="blackletter">Gebrochene Schriften<\/option>/);
  const cards=section.match(/<div class="blackletter-grid"[\s\S]*?<\/div>/)[0];
  assert.equal((cards.match(/<article>/g)||[]).length,3);
  assert.equal((cards.match(/Form folgt Gedanken\./g)||[]).length,3);
  for(const name of ['UnifrakturMaguntia','Pirata One','Texturina']){
    assert.ok(cards.includes('data-google-font="'+name+'"'));
    assert.ok(cards.includes('specimen/'+name.replace(/ /g,'+')+'?preview.script=Latn'));
    assert.ok(css.includes("font-family:'"+name+"',serif"));
  }
  assert.ok(css.includes('font-synthesis:none'));
  assert.match(css,/@media\(max-width:1000px\)\{\.blackletter-grid\{grid-template-columns:1fr/);
});

test('three licensed original families retain real weights, optical axes and actual German coverage',()=>{
  const newFonts=catalogue.families.filter(f=>f.group==='blackletter');
  assert.deepEqual(newFonts.map(f=>f.id),['unifrakturmaguntia','pirataone','texturina']);
  for(const f of newFonts){
    assert.equal(f.license,'SIL OFL 1.1');assert.ok(fs.existsSync(path.join(root,f.licensePath)));
    assert.ok(f.source.includes('github.com/google/fonts/tree/main/ofl/'+f.id));
    for(const file of f.files){assert.ok(fs.existsSync(path.join(root,file.path)));assert.ok(fs.existsSync(path.join(root,file.path.replace(/\.woff2$/,'.ttf'))));}
    const a=audit.families.find(x=>x.id===f.id);assert.equal(a.germanMissing,'');
    const check=A.checks(f,a).flatMap(x=>x.items).find(x=>x.label==='Langes ſ für historischen Satz');
    assert.equal(check.state,f.id==='unifrakturmaguntia'?'pass':'partial');
    assert.ok(a.files.every(x=>x.longSPresent===(f.id==='unifrakturmaguntia')));
  }
  for(const id of ['unifrakturmaguntia','pirataone']){
    const f=newFonts.find(f=>f.id===id),a=audit.families.find(f=>f.id===id);
    assert.equal(f.files.length,1);assert.equal(f.files[0].weight,400);assert.equal(f.files[0].style,'normal');
    assert.deepEqual(a.cuts,{regular:true,bold:false,italic:false,boldItalic:false});
  }
  const t=audit.families.find(f=>f.id==='texturina');assert.equal(t.files.length,2);
  assert.ok(Object.values(t.cuts).every(Boolean));
  for(const file of t.files){assert.deepEqual(file.axes.wght,[100,900]);assert.deepEqual(file.axes.opsz,[12,72]);}
  assert.ok(audit.families.find(f=>f.id==='ebgaramond').files.every(x=>x.longSPresent),'The Antiqua long-s probe must not silently use a fallback');
});

test('long-s origins are factual notes, not a green author voice or a fabricated evolution drawing',()=>{
  const origin=section.match(/<aside class="note blackletter-origin-note"[\s\S]*?<\/aside>/)[0];
  assert.ok(!origin.includes('author-comment'));assert.ok(!origin.includes('comment-opening'));
  for(const phrase of ['römischen Kursive','viel älter als die Fraktur','kein einfach nach oben gestrecktes modernes s','um 1800','EB Garamond · Antiqua','https://typefoundry.blogspot.com/2008/01/long-s.html'])assert.ok(origin.includes(phrase),phrase);
  for(const phrase of ['ſagen · leſen','Haus · Haustür','nicht alle s außer dem letzten automatisch ersetzen','weder ein f noch das ß','U+017F','keine vorgetäuschten ſ-Proben'])assert.ok(section.includes(phrase),phrase);
  assert.ok(section.includes('Dokumentation_en_antiqua.pdf#page=33'));
});

test('historical voice has the shared restrained layout, no attribution and a sourced 1941 distinction',()=>{
  const voice=section.match(/<aside class="author-essay author-comment" data-randstimme="fraktur"[\s\S]*?<\/aside>/)[0];
  for(const phrase of ['Bayern','Münchner Wirtshäuser','rechten Subkulturen','zunächst selbst','1941','heutige Assoziation nicht einfach ungeschehen'])assert.ok(voice.includes(phrase),phrase);
  assert.equal((voice.match(/aria-hidden="true">„<\/span>/g)||[]).length,1);
  assert.ok(!/Claus|Unterberg|Autorenkommentar|“|”/.test(voice));
  assert.ok(!/\.blackletter-statement\{/.test(css));
  assert.ok(section.includes('3. Januar 1941'));assert.ok(section.includes('https://www.uni-heidelberg.de/unimut/themen/fraktur-verbot.html'));
  assert.ok(section.includes('https://www.bundesarchiv.de/'));assert.ok(section.includes('antisemitischen Falschbehauptung'));
});

test('new terms are explained inline and link from the glossary back to the examples',()=>{
  for(const [id,target] of [['fraktur','gebrochene-schriften'],['gebrochene-schriften','gebrochene-schriften'],['langes-s','langes-s'],['textura','gebrochene-schriften']]){
    const entry=html.match(new RegExp('<div id="glossar-'+id+'">[\\s\\S]*?</div>'))[0];
    assert.ok(entry.includes('href="#'+target+'"'));
  }
});

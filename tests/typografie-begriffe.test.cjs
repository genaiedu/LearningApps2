const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');
const html=read('typografie-atelier.html'),script=read('scripts/typografie-atelier.js');

test('font catalogue omits author-facing addition notices',()=>{
  const catalogue=script.slice(script.indexOf('  function renderFonts(){'),script.indexOf("  on(['font-search','font-group']"));
  assert.ok(!catalogue.includes('Für das Atelier ergänzt'));
  assert.ok(!catalogue.includes('Für dieses Atelier ergänzt'));
  assert.ok(!catalogue.includes('new-tag'));
  assert.ok(catalogue.includes('window.TypoFontPortraits.render'));
  const portraits=read('scripts/typografie-fontportraits.js');
  assert.ok(portraits.includes('window.TypoFontLinks.link(download,f.name)'));
  assert.ok(!portraits.includes('Vorhandener Schnitt'));
});

test('Sans comparison initializes named fonts and covers every pair of the four positions',()=>{
  const code=script.slice(script.indexOf('  const sansStyles='),script.indexOf('  const glossaryEntries='));
  const ids=['sans-pair','sans-sample-a','sans-sample-b','sans-label-a','sans-label-b','sans-download-a','sans-download-b','sans-comparison-note'];
  const elements=Object.fromEntries(ids.map(id=>[id,{value:id==='sans-pair'?'humanist':'',style:{},dataset:{}}]));
  vm.runInNewContext(code,{$:id=>elements[id]});
  assert.equal(elements['sans-sample-a'].style.fontFamily,'"Inter",sans-serif');
  assert.equal(elements['sans-sample-b'].style.fontFamily,'"Source Sans 3",sans-serif','The specimen must not silently inherit the Fira reading font');
  const options=[...html.match(/<select id="sans-pair"[\s\S]*?<\/select>/)[0].matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(options.length,7);
  const combinations=new Set();
  for(const key of options){
    elements['sans-pair'].value=key;elements['sans-pair'].onchange();
    const families=[];
    for(const side of ['a','b']){
      const sample=elements['sans-sample-'+side],link=elements['sans-download-'+side],label=elements['sans-label-'+side];
      families.push(link.dataset.googleFont);
      assert.equal(sample.style.fontFamily,'"'+link.dataset.googleFont+'",sans-serif');
      assert.equal(sample.style.fontWeight,'400');assert.equal(sample.style.fontStyle,'normal');
      assert.ok(label.textContent.startsWith(link.dataset.googleFont+' · '));
      assert.ok(link.href.endsWith('?preview.script=Latn'));assert.ok(link.textContent.includes(link.dataset.googleFont));
    }
    assert.ok(elements['sans-comparison-note'].textContent.length>60);
    if(key==='humanist-families')assert.deepEqual(families,['Source Sans 3','Fira Sans']);
    else combinations.add(families.sort().join('|'));
  }
  assert.equal(combinations.size,6);
  for(const a of ['Inter','Source Sans 3','Poppins','Nunito'])for(const b of ['Inter','Source Sans 3','Poppins','Nunito'])if(a!==b)assert.ok(combinations.has([a,b].sort().join('|')));
  elements['sans-pair'].value='not-a-pair';elements['sans-pair'].onchange();
  assert.equal(elements['sans-sample-b'].style.fontFamily,'"Source Sans 3",sans-serif');
});

test('definitions precede the comparison and distinguish form, tradition and file technology',()=>{
  const at=id=>html.indexOf('id="'+id+'"');
  const section=html.slice(at('sans-formen'),at('buchstaben-varianten'));
  for(const phrase of ['Schreib- und Buchkultur der Renaissance','nicht einfach auf „freundlich“','Formprinzip','sechs Paarungen','Die Positionen überschneiden sich'])assert.ok(section.includes(phrase),phrase);
  assert.ok(!section.includes('sans-category-note'));
  assert.ok(!section.includes('„Dynamisch / humanistisch“ ist hier kein Gegensatz.'));
  assert.ok(section.indexOf('sans-term-guide')<section.indexOf('id="sans-pair"'));
  assert.ok(section.includes('https://www.monotype.com/resources/guide-type-styles'));
  assert.ok(section.includes('https://www.typolexikon.de/grotesk/'));
});

test('glossary is the final chapter, with unique alphabetic terms and valid example links',()=>{
  const block=html.slice(html.indexOf('<section class="chapter wrap glossary"'),html.indexOf('</main>'));
  const chapters=[...html.matchAll(/<section class="chapter[^>]*id="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(chapters.at(-1),'glossar');assert.ok(html.indexOf('id="quellen"')<html.indexOf('id="glossar"'));
  const entries=[...block.matchAll(/<div id="(glossar-[^"]+)"><dt>([^<]+)<\/dt><dd>([\s\S]*?)<\/dd><\/div>/g)];
  assert.ok(entries.length>=80);assert.equal(new Set(entries.map(m=>m[1])).size,entries.length);
  const terms=entries.map(m=>m[2]);assert.deepEqual(terms,[...terms].sort((a,b)=>a.localeCompare(b,'de')));
  for(const term of ['Dynamisch','Humanistisch / Humanist','Statisch','Ligatur','Mediävalziffern / Oldstyle','Versalziffern / Lining','Kerning / Unterschneidung','Punzen','Strichkontrast','Variable Font','MathJax'])assert.ok(terms.some(t=>t===term||term==='Punzen'&&t==='Punze'),term);
  const pageIds=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const link of block.matchAll(/href="#([^"]+)"/g))assert.ok(pageIds.has(link[1]),link[1]);
  for(const entry of entries)assert.ok(entry[3].replace(/<[^>]+>/g,'').trim().length>50,entry[1]);
  assert.ok(block.includes('id="glossary-tools" hidden'),'Without JavaScript all definitions remain readable, without dead search controls');
});

test('glossary search normalizes umlauts and sharp s, filters groups, handles no match and resets',()=>{
  const code=script.slice(script.indexOf('  const glossaryEntries='),script.indexOf("  $('variable-weight')"));
  const entries=['Humanistisch. Häufig dynamisch.','Mediävalziffern mit Unterlängen.','Weißraum lässt Text atmen.'].map(textContent=>({textContent,hidden:false}));
  const groups=entries.map(entry=>({hidden:false,querySelectorAll:()=>[entry]}));
  const elements=Object.fromEntries(['glossary-search','glossary-reset','glossary-tools','glossary-status','glossary-index'].map(id=>[id,{value:'',hidden:false,focus(){this.focused=true;}}]));
  let onClick;
  vm.runInNewContext(code,{$:id=>elements[id],document:{querySelectorAll:selector=>selector==='#glossar dl>div'?entries:groups,addEventListener:(type,fn)=>{if(type==='click')onClick=fn;}}});
  assert.equal(entries.filter(e=>!e.hidden).length,3);assert.equal(elements['glossary-reset'].disabled,true);assert.equal(elements['glossary-tools'].hidden,false);
  for(const [query,index] of [['DYNAMISCH',0],['mediaevalziffern',1],['WEISSRAUM',2],['häufig humanistisch',0]]){
    elements['glossary-search'].value=query;elements['glossary-search'].oninput();
    entries.forEach((entry,i)=>assert.equal(entry.hidden,i!==index));groups.forEach((group,i)=>assert.equal(group.hidden,i!==index));
    assert.ok(elements['glossary-status'].textContent.startsWith('1 von 3'));assert.equal(elements['glossary-index'].hidden,true);
  }
  elements['glossary-search'].value='nichtvorhanden';elements['glossary-search'].oninput();assert.ok(entries.every(e=>e.hidden));assert.ok(elements['glossary-status'].textContent.includes('Kein Begriff gefunden'));
  elements['glossary-reset'].onclick();assert.equal(elements['glossary-search'].value,'');assert.equal(elements['glossary-search'].focused,true);assert.ok(entries.every(e=>!e.hidden));assert.ok(groups.every(e=>!e.hidden));assert.equal(elements['glossary-index'].hidden,false);
  elements['glossary-search'].value='  ';elements['glossary-search'].oninput();assert.ok(entries.every(e=>!e.hidden));
  elements['glossary-search'].value='humanistisch';elements['glossary-search'].oninput();
  onClick({target:{closest:()=>null}});assert.equal(entries[1].hidden,true);
  onClick({target:{closest:()=>({})}});assert.ok(entries.every(e=>!e.hidden),'A direct definition link must not land on a previously filtered-out term');
});

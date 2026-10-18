const test=require('node:test'),assert=require('node:assert/strict');
const order=require('../scripts/kunsttresor-artist-order.js'),gallery=require('../scripts/kunsttresor-gallery.js'),archive=require('../data/kunstarchiv.json');
test('every catalogue name has an explicitly reviewed filing key without altering its display spelling',()=>{
 for(const name of new Set(archive.works.map(work=>work.artist))){assert.ok(Object.hasOwn(order.names,name),name);assert.equal(typeof order.key(name),'string');assert.ok(order.key(name).length);}
 assert.ok(Object.isFrozen(order.names));assert.equal(order.key('Noch nicht eingeordneter Name'),'Noch nicht eingeordneter Name');
});
test('surname keys ignore given names, nobility particles, clerical titles and generational suffixes',()=>{
 for(const [name,key]of Object.entries({'Claude Monet':'Monet','Vincent van Gogh':'Gogh','Franz von Stuck':'Stuck','Alexej von Jawlensky':'Jawlensky','Jan van Eyck':'Eyck','Rogier van der Weyden':'Weyden','Frits Van den Berghe':'Berghe','Georges de la Tour':'Tour','Henri de Toulouse-Lautrec':'Toulouse-Lautrec','Ercole de’ Roberti':'Roberti','Lucas Cranach der Ältere':'Cranach','Lucas Cranach der Jüngere':'Cranach','Hans Holbein der Jüngere':'Holbein','Fra Angelico':'Angelico'}))assert.equal(order.key(name),key,name);
});
test('artist names and ambiguous patronymics are not mechanically reduced to their last word',()=>{
 for(const name of ['El Greco','Leonardo da Vinci','Giotto di Bondone','Duccio di Buoninsegna','Katsushika Hokusai','Utagawa Hiroshige','Unbekannter Künstler','Meister von Schloss Lichtenstein'])assert.equal(order.key(name),name);
 assert.equal(order.key('Domenico Theotokópoulos, called El Greco'),'El Greco');
 assert.deepEqual(['Vincent van Gogh','El Greco','Albrecht Dürer','Claude Monet'].sort(order.compare),['Albrecht Dürer','El Greco','Vincent van Gogh','Claude Monet']);
});
test('compound surnames retain their first part instead of sorting by a later family name or place name',()=>{
 for(const [name,key]of Object.entries({'Alonso Sánchez Coello':'Sánchez Coello','Juan Sánchez Cotán':'Sánchez Cotán','Baldomer Gili i Roig':'Gili i Roig','Joaquín Sorolla y Bastida':'Sorolla y Bastida','Narcisse Virgile Diaz de la Peña':'Diaz de la Peña','Pierre Puvis de Chavannes':'Puvis de Chavannes','Joseph Wright of Derby':'Wright','Michelangelo Merisi da Caravaggio':'Merisi'}))assert.equal(order.key(name),key,name);
});
test('artist facets and image order agree for the complete archive and do not mutate collection or film data',()=>{
 const works=archive.works,before=JSON.stringify(works),facets=gallery.viewFacets(works,{},'artist'),sorted=gallery.viewWorks(works,{sort:'artist'});
 for(const list of [facets.map(item=>item.value),sorted.map(work=>work.artist)])for(let i=1;i<list.length;i++)assert.ok(order.compare(list[i-1],list[i])<=0,list[i-1]+' / '+list[i]);
 assert.equal(JSON.stringify(works),before);assert.equal(sorted.length,works.length);
});

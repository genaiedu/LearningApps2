const fs=require('node:fs'),path=require('node:path'),C=require('../scripts/typografie-core.js');
const dir=path.resolve(__dirname,'../downloads/typografie');
for(const kind of ['bericht','brief','einladung','protokoll']){
  const text=C.texDocument({kind,title:'Ein Raum für Gedanken',author:'Beispielname',date:'9. Oktober 2026',recipient:'Beispielschule\nMusterstraße 1\n12345 Musterstadt',body:'Ein guter Text lädt zum Weiterdenken ein. Die Gestaltung ordnet Gedanken, ohne sie zu überlagern.\n\nSchriftwahl, Zeilenlänge und Durchschuss bilden ein System. Ein Preis von 10 € oder 50 % wird hier als normaler Text behandelt.'});
  fs.writeFileSync(path.join(dir,kind+'-a4.tex'),text);
}
// Check the alternate engine on the same representative report.
fs.writeFileSync(path.join(dir,'bericht-lualatex-a4.tex'),C.texDocument({engine:'luatex',title:'Ein Raum für Gedanken',author:'Beispielname',date:'9. Oktober 2026',body:'Ein guter Text lädt zum Weiterdenken ein.\n\nDer Satz beginnt mit einer klaren Struktur.'}));
console.log('Five standalone TeX examples generated.');

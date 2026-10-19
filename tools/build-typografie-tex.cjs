const fs=require('node:fs'),path=require('node:path'),C=require('../scripts/typografie-core.js');
const dir=path.resolve(__dirname,'../downloads/typografie');
for(const kind of ['bericht','brief','einladung','protokoll'])for(const variant of ['classic','modern']){
  const text=C.texDocument({kind,variant,title:'Ein Raum für Gedanken',author:'Beispielname',date:'19. Oktober 2026',recipient:'Beispielschule\nMusterstraße 1\n12345 Musterstadt',body:'Ein guter Text lädt zum Weiterdenken ein. Die Gestaltung ordnet Gedanken, ohne sie zu überlagern.\n\nSchriftwahl, Zeilenlänge und Durchschuss bilden ein System. Ein Preis von 10 € oder 50 % wird hier als normaler Text behandelt.'});
  fs.writeFileSync(path.join(dir,kind+'-a4-zw12'+(variant==='modern'?'-modern':'')+'.tex'),text);
}
console.log('Eight standalone TeX examples generated; archived originals unchanged.');

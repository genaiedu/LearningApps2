/* Build-time only: download Wikimedia files and retain their individual licences. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'assets/hundegenetik');
const files=[
 ['chihuahua','Chihuahua','Chihuahuasmoothcoat.jpg'],
 ['mastiff','Mastiff','Westgort Anticipation 17 months.JPG'],
 ['dackel','Dackel','닥스훈트(단모종) (Dachshund (Short)).jpg'],
 ['dogge','Deutsche Dogge','Dog niemiecki żółty LM980.jpg'],
 ['mops','Mops','Mops oct09 cropped2.jpg'],
 ['saluki','Saluki','Red Smooth Saluki.jpg'],
 ['husky','Siberian Husky','Husky L.jpg'],
 ['pudel','Pudel','Full attention (8067543690).jpg'],
 ['collie','Border Collie','Border Collie 600.jpg'],
 ['dobermann','Dobermann','Jean Dark Snö of Sweden.jpg'],
 ['dalmatiner','Dalmatiner','Sun Dog Dalmatian.jpg'],
 ['mischling','Mischling','Mongrel 1.jpg'],
 ['schaeferhund','Deutscher Schäferhund','German Shepherd - DSC 0346 (10096362833).jpg'],
 ['wolf','Grauwolf','Eurasian wolf 2.jpg'],
 ['fuchs','Rotfuchs','Vulpes vulpes 1 (Martin Mecnarowski).jpg'],
 ['trut','Ljudmila Trut mit einem Fuchs, 1974','L. Trut and domestic Fox-1974.jpg'],
 ['afghane','Afghanischer Windhund','Afghan Hound.jpg']
];
const decode=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
const get=url=>execFileSync('curl',['-L','--fail','--retry','2','--max-time','60','-sS','-A','LearningApps-Hundegenetik/1.0 (https://github.com/genaiedu/LearningApps2)',url],{maxBuffer:40*1024*1024});
(async()=>{
 fs.mkdirSync(dir,{recursive:true});const records=[];
 for(const [id,title,file]of files){
  const api=new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({action:'query',format:'json',titles:'File:'+file,prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'1400',uselang:'en'}).forEach(([k,v])=>api.searchParams.set(k,v));
  const page=Object.values(JSON.parse(get(api.href)).query.pages)[0],info=page.imageinfo?.[0];
  if(!info)throw Error('No metadata: '+file);
  const meta=info.extmetadata,license=decode(meta.LicenseShortName?.value),author=decode(meta.Artist?.value||meta.Attribution?.value);
  if(!/CC BY|CC0|Public domain/i.test(license)||!author)throw Error('Review licence: '+file+' '+license);
  const bytes=get(info.thumburl||info.url),out=path.join(dir,id+'.webp');
  await sharp(bytes).rotate().resize({width:1400,height:1400,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toFile(out);
  const dimensions=await sharp(out).metadata();
  records.push({id,title,file,src:'assets/hundegenetik/'+id+'.webp',width:dimensions.width,height:dimensions.height,author,license,licenseUrl:meta.LicenseUrl?.value||'',source:info.descriptionurl,original:info.url,credit:decode(meta.Credit?.value),modifications:'Verkleinert und in WebP umgewandelt; Bildinhalt unverändert. Die App zeigt das vollständige Foto ohne Beschneidung, auch beim Darüberfahren mit der Maus.',retrieved:'2026-10-21',metadata:meta});
  process.stdout.write(id+' · '+license+' · '+author.slice(0,100)+'\n');
 }
 fs.writeFileSync(path.join(root,'data/hundegenetik-medien.json'),JSON.stringify(records,null,2)+'\n');
})();

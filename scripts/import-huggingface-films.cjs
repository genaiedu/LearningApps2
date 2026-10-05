// Mechanical import of the user's three compositions. Originals stay untouched.
// Usage: node scripts/import-huggingface-films.cjs /path/to/videos/html
const fs=require('node:fs'),path=require('node:path');
const source=process.argv[2];if(!source)throw Error('Source directory required');
const output=path.resolve(__dirname,'../assets/huggingface-fall/films');fs.mkdirSync(output,{recursive:true});
const files=['01-intro-der-schwarm.html','02-folie-25-die-spuren.html','03-abschluss-voegel-auf-dem-draht.html'];
for(const [i,file] of files.entries()){
 let html=fs.readFileSync(path.join(source,file),'utf8');
 const vendor=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('GSAP')&&m[1].includes('greensock'));
 if(!vendor)throw Error('GSAP not found in '+file);
 if(i===0)fs.writeFileSync(path.join(output,'gsap.min.js'),vendor[1]);
 html=html.replace(vendor[0],'<script src="gsap.min.js"></script>');
 let font=0;const fonts=['inter-v20-latin-regular','inter-v20-latin-600','outfit-v15-latin-600'];
 html=html.replace(/url\("data:[^"]+"\)/g,()=>`url("../../../../LearningApps/fonts/${fonts[font++]}.woff2")`);
 if(font!==3)throw Error('Unexpected embedded font count');
 // Remove the preview wrapper: it auto-starts and resets on every click.
 const wrapper=html.lastIndexOf('<style>');if(!html.slice(wrapper).includes('var W = 1920'))throw Error('Preview wrapper missing');
 html=html.slice(0,wrapper)+'<link rel="stylesheet" href="../film-player.css">\n<script src="../film-player.js"></script>\n</body></html>\n';
 html=html.replace('<body',`<body data-film="${['intro','discovery','finale'][i]}"`);
 fs.writeFileSync(path.join(output,file),html);
 console.log(file+': '+Buffer.byteLength(html)+' bytes');
}

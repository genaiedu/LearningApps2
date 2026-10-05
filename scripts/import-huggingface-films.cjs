// Mechanical import of the user's compositions. Originals stay untouched.
// Usage: node scripts/import-huggingface-films.cjs /path/to/videos/html
const fs=require('node:fs'),path=require('node:path');
const source=process.argv[2];if(!source)throw Error('Source directory required');
const output=path.resolve(__dirname,'../assets/huggingface-fall/films');fs.mkdirSync(output,{recursive:true});
const files=[['01-intro-der-schwarm.html','intro'],['02-folie-25-die-spuren.html','discovery'],['03-abschluss-voegel-auf-dem-draht.html','finale'],['02b-folie-25-die-voegel-fliehen.html','flight']];
for(const [file,kind] of files){
 let html=fs.readFileSync(path.join(source,file),'utf8');
 const vendor=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('GSAP')&&m[1].includes('greensock'));
 if(!vendor)throw Error('GSAP not found in '+file);
 if(kind==='intro')fs.writeFileSync(path.join(output,'gsap.min.js'),vendor[1]);
 html=html.replace(vendor[0],'<script src="gsap.min.js"></script>');
 let font=0;const fonts=['inter-v20-latin-regular','inter-v20-latin-600','outfit-v15-latin-600'];
 html=html.replace(/url\("data:[^"]+"\)/g,()=>`url("../../../../LearningApps/fonts/${fonts[font++]}.woff2")`);
 if(font!==3)throw Error('Unexpected embedded font count');
 // Remove the preview wrapper: it auto-starts and resets on every click.
 const wrapper=html.lastIndexOf('<style>');if(!html.slice(wrapper).includes('var W = 1920'))throw Error('Preview wrapper missing');
 html=html.slice(0,wrapper)+'<script src="../film-player.js?v=20261006-full-agent-flight"></script>\n</body></html>\n';
 // Load layout overrides before the flight script measures agent positions.
 html=html.replace('</head>','<link rel="stylesheet" href="../film-player.css?v=20261006-full-agent-flight">\n</head>');
 html=html.replace('<body',`<body data-film="${kind}"`);
 if(kind==='discovery'||kind==='flight'){
  // One camera centre: all agents and their links shrink together, without a pan.
  html=html.replaceAll('x: 40, y: 10, scale: 1, svgOrigin: "0 0"','x: 40, y: 10, scale: 1, svgOrigin: "460 257.5"')
   .replace('x: 20, y: 120, scale: 0.63, svgOrigin: "0 0", duration: 0.9, ease: "power3.inOut"','x: 40, y: 10, scale: 0.63, duration: 1.2, ease: "sine.inOut"');
 }
 if(kind==='flight'){
  // The host's continuous flock is animated separately, so no duplicate flock
  // appears when the supplied agent-flight composition takes over.
  html=html.replace('// Animation 4 –', 'fb.length = 0; document.getElementById("flock").replaceChildren();\n// Animation 4 –');
  // Feathers drift all the way to a common floor inside the cinema frame,
  // rather than stopping at a fixed displacement in mid-air. The landing
  // finishes within the same six-second, seekable/pauseable timeline.
  html=html.replace('const featherColors =',
   'const floor = document.createElement("div");\n    floor.className = "feather-floor";\n    floor.style.cssText = "position:absolute;left:180px;right:180px;top:1076px;height:2px;background:linear-gradient(90deg,transparent,#77768d88 20%,#77768d88 80%,transparent);opacity:0";\n    front.appendChild(floor);\n    T.to(floor, { opacity: 1, duration: 0.65 }, 4.3);\n    const featherColors =');
  html=html.replace('fe.setAttribute("viewBox", "-10 -36 20 40");',
   'fe.setAttribute("viewBox", "-10 -36 20 40");\n        fe.setAttribute("class", "falling-feather");\n        const floorY = () => (window.HF_FLIGHT_BOUNDS?.floorY ?? 1048) - (cy - 18);');
  html=html.replace('{ x: sx * 0.4 + 30, y: 90, rotation: 50, duration: 0.8, ease: "sine.inOut" },',
   '{ x: sx * 0.4 + 30, y: () => floorY() * 0.22, rotation: 50, duration: 0.7, ease: "sine.inOut" },')
   .replace('{ x: sx * 0.7 - 30, y: 190, rotation: -35, duration: 0.8, ease: "sine.inOut" },',
   '{ x: sx * 0.7 - 30, y: () => floorY() * 0.49, rotation: -35, duration: 0.8, ease: "sine.inOut" },')
   .replace('{ x: sx + 25, y: 290 + rng() * 80, rotation: 30, duration: 0.9, ease: "sine.inOut" },',
   '{ x: sx + 25, y: () => floorY() * 0.78, rotation: 30, duration: 0.85, ease: "sine.inOut" },\n          { x: sx - 18, y: () => floorY() * 0.94, rotation: -24, duration: 0.65, ease: "sine.inOut" },\n          { x: sx + 12, y: floorY, rotation: 90, duration: 0.5, ease: "sine.out" },');
  // Responsive flight endpoints use the full host viewport, while the agents
  // keep their original starting coordinates and the same seekable timeline.
  html=html.replace('const out = outward(cx, cy, 1800 + r.w * 18 * 0.75);',
   'const out = () => { const b = window.HF_FLIGHT_BOUNDS || { width: 1920, height: 1080 }; return outward(cx, cy, Math.max(b.width, b.height) * 1.8 + Math.hypot(r.w, r.h) * 18); };')
   .replace('T.to(box, { x: out.x - cx, y: out.y - cy, scale: 18,',
   'T.to(box, { x: () => out().x - cx, y: () => out().y - cy, scale: 18,')
   .replace('T.to(owl, { x: ox + 40, y: oy + 260, scale: 90,',
   'T.to(owl, { x: ox + 40, y: () => { const b = window.HF_FLIGHT_BOUNDS || { top: 0, height: 1080 }; return b.top + b.height + ob.h * 90 - ob.y; }, scale: 90,');
 }
 fs.writeFileSync(path.join(output,file),html);
 console.log(file+': '+Buffer.byteLength(html)+' bytes');
}

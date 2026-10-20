/* node tools/build-sammellinsen-pdf.cjs [lokale Arbeitsblatt-URL] */
const path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const r=await p.goto(process.argv[2]||'http://127.0.0.1:8878/LearningApps2/material/sammellinsen-arbeitsblatt.html');if(r.status()!==200)throw Error('Arbeitsblatt nicht gefunden');await p.evaluate(async()=>{await document.fonts.ready;await MathJax.startup.promise;});await p.emulateMedia({media:'print'});
 const overflow=await p.locator('.page').evaluateAll(pages=>pages.map((p,i)=>{const end=Math.max(...[...p.children].filter(e=>!e.classList.contains('footer')).map(e=>e.getBoundingClientRect().bottom));return{page:i+1,overflow:p.scrollHeight>p.clientHeight+1||end>p.querySelector('.footer').getBoundingClientRect().top-8};}).filter(r=>r.overflow));if(errors.length||overflow.length)throw Error(JSON.stringify({errors,overflow}));
 const output=path.resolve(__dirname,'../material/sammellinsen-arbeitsblatt.pdf');await p.pdf({path:output,format:'A4',preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false,tagged:true});console.log(output);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

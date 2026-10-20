/* Reproduzierbarer PDF-Export der druckfähigen HTML-Quelle.
 * Voraussetzung: Playwright (nur Entwicklung), lokaler Server im gemeinsamen Elternordner.
 * node tools/build-kraefte-pdf.cjs http://127.0.0.1:8878/LearningApps2/material/kraefte-arbeitsblatt.html
 * CHROME_PATH kann einen vorhandenen Chromium-/Chrome-Browser auswählen.
 */
const path=require('node:path');
const{chromium}=require('playwright');
(async()=>{
  const url=process.argv[2]||'http://127.0.0.1:8878/LearningApps2/material/kraefte-arbeitsblatt.html';
  const output=path.resolve(__dirname,'../material/kraefte-arbeitsblatt.pdf');
  const executablePath=process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
  const browser=await chromium.launch({headless:true,executablePath});
  try{
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(url);if(response.status()!==200)throw new Error('Arbeitsblatt nicht erreichbar.');
    await page.evaluate(async()=>{await document.fonts.ready;await MathJax.startup.promise;});
    await page.emulateMedia({media:'print'});
    const overflow=await page.locator('.page').evaluateAll(pages=>pages.map((p,i)=>{
      const footer=p.querySelector('.footer').getBoundingClientRect();
      const end=Math.max(...[...p.children].filter(e=>!e.classList.contains('footer')).map(e=>e.getBoundingClientRect().bottom));
      return{page:i+1,overflow:p.scrollHeight>p.clientHeight+1||end>footer.top-8};
    }).filter(x=>x.overflow));
    if(errors.length||overflow.length)throw new Error(JSON.stringify({errors,overflow}));
    await page.pdf({path:output,format:'A4',preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false,tagged:true});
    console.log(output);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

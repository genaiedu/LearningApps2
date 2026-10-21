const{test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..'),shared=path.join(root,'LearningApps');
function htmlFiles(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?['.git','node_modules','fonts','vendor','.wrangler','.sites-runtime','outputs'].includes(e.name)?[]:htmlFiles(path.join(dir,e.name)):e.isFile()&&e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);}
test('neither repository publishes generator links in HTML pages, including hub and privacy notices',()=>{
 for(const repo of ['LearningApps','LearningApps2'])for(const file of htmlFiles(path.join(root,repo))){const source=fs.readFileSync(file,'utf8');assert.equal(/href\s*=\s*["'][^"']*lerncode\.html(?:[?#][^"']*)?["']/i.test(source),false,path.relative(root,file));}
});
test('the former public generator is only a teacher information page, without anonymous generation controls',()=>{
 const dom=new JSDOM(fs.readFileSync(path.join(shared,'lerncode.html'),'utf8')),d=dom.window.document;
 assert.equal(d.querySelector('#create-code'),null);assert.equal(d.querySelector('#another-code'),null);assert.equal(d.querySelector('script[src*="scripts/lerncode.js"]'),null);
 assert.equal(d.querySelector('#admin-open').href,'https://learningapps-lerncode.spunky-snipe-1289.chatgpt.site/admin');assert.match(d.querySelector('main').textContent,/berechtigte Lehrkraft/);dom.window.close();
});
test('shared learner panel asks for a teacher-issued code and never creates a new profile',async()=>{
 const dom=new JSDOM('<dialog id="save-dialog"><p>Speichern</p></dialog>',{url:'https://example.test/LearningApps2/demo.html',runScripts:'outside-only'}),w=dom.window,requests=[];
 w.fetch=async(url,opts)=>{requests.push({url,method:opts.method});return{ok:true,json:async()=>({profileId:'synthetic-profile-0001',appId:'policy-test',state:null,revision:0,updatedAt:null})};};
 w.eval(fs.readFileSync(path.join(shared,'scripts/learning-profile.js'),'utf8'));
 const payload={app:'policy-test',version:1,savedAt:0,data:{}};
 const adapter={getSnapshot:()=>payload,getProfileId:()=>null,validateSnapshot:()=>payload,replaceSnapshot:()=>{},freshSnapshot:()=>payload,readProfileSnapshot:()=>null,signOut:()=>{}};
 const c=w.LearningProfile.mount(adapter,{appId:'policy-test'});
 try{
  const panel=w.document.getElementById('kunst-lerncode-panel');assert.match(panel.textContent,/Deinen Lerncode erhältst du von deiner Lehrkraft/);assert.equal(panel.querySelector('.lerncode-get'),null);assert.equal(panel.querySelector('a[href*="lerncode.html"]'),null);assert.equal(requests.length,0);
  await c.connect('2'.repeat(26));assert.equal(requests.length,1);assert.equal(requests[0].method,'GET');assert.ok(requests[0].url.endsWith('/api/state/policy-test'));assert.equal(requests.some(r=>r.method==='POST'),false);
 }finally{c.destroy();w.close();}
});

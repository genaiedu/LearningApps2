const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../scripts/gc-device.js'),'utf8');
function fixture(){
 const description={textContent:''},window={},context=vm.createContext({window,document:{getElementById(){return description;}}});
 vm.runInContext(source,context);
 const host={dataset:{},elements:[],get innerHTML(){return this.html;},set innerHTML(html){this.html=html;this.elements=[...html.matchAll(/<(g|button)\b[^>]*data-part="([^"]+)"[^>]*>/g)].map(m=>({tagName:m[1],dataset:{part:m[2]},handlers:{},attributes:{'aria-pressed':m[0].includes('aria-pressed="true"')?'true':'false'},addEventListener(k,fn){this.handlers[k]=fn;},setAttribute(k,v){this.attributes[k]=v;}}));},querySelectorAll(){return this.elements;}};
 return {host,description,render:window.GCDevice.render};
}
test('every detector, casing and gas-flow state produces a complete illustration',()=>{
 for(const detector of ['ms','fid'])for(const inside of [false,true])for(const flow of [false,true])for(const running of [false,true]){
  const {host,render}=fixture();render(host,{detector,length:30,temperature:180},{inside,flow,running});
  assert.equal(host.elements.length,8);assert.ok(!/undefined|NaN|MASS SELECTIVE/.test(host.innerHTML));
  const ids=[...host.innerHTML.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  for(const [,id]of host.innerHTML.matchAll(/url\(#([^)]+)\)/g))assert.ok(ids.includes(id),id);
  assert.ok(host.innerHTML.includes('device-temperature'));assert.equal(host.innerHTML.includes('class="gas-path"'),flow);
  if(detector==='ms'&&(inside||flow))for(const label of ['EI-Quelle','Quadrupol','Detektor','Vakuumsystem'])assert.ok(host.innerHTML.includes(label));
  if(detector==='fid')assert.ok(host.innerHTML.includes('VERGRÖSSERTE DETAILANSICHT'));
 }
});
test('component buttons and keyboard activation explain the part and preserve selection',()=>{
 const {host,description,render}=fixture(),s={detector:'ms',length:30,temperature:60};render(host,s);
 host.elements.find(e=>e.tagName==='button'&&e.dataset.part==='ms').handlers.click();
 assert.ok(description.textContent.startsWith('Massenspektrometer:'));assert.equal(host.dataset.selected,'ms');assert.equal(host.elements.filter(e=>e.attributes['aria-pressed']==='true').length,2);
 render(host,s,{inside:true});assert.equal(host.elements.filter(e=>e.attributes['aria-pressed']==='true').length,2);
 render(host,{...s,detector:'fid'});assert.equal(host.dataset.selected,'fid');assert.ok(description.textContent.startsWith('Flammenionisationsdetektor:'));assert.equal(host.elements.filter(e=>e.attributes['aria-pressed']==='true').length,2);
 let prevented=false;host.elements.find(e=>e.tagName==='g'&&e.dataset.part==='column').handlers.keydown({key:'Enter',preventDefault(){prevented=true;}});
 assert.ok(prevented);assert.ok(description.textContent.startsWith('Säulenofen:'));assert.equal(host.dataset.selected,'column');
});

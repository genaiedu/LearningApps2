const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../scripts/schroedinger-core.js'),root=path.resolve(__dirname,'..');
const near=(a,b,t=1e-7)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);
test('box energy, boundary conditions, probability and normalization',()=>{
  near(C.box(1,1).energy,.376030162,2e-8);
  for(let n=1;n<=6;n++)for(const L of [.3,1,2]){
    const s=C.box(n,L);near(s.psi(0),0);near(s.psi(L),0);near(C.integrate(s.density,0,L),1);near(s.probability(0,1),1);near(s.probability(0,.5),.5);near(C.box(n,L/2).energy,4*s.energy);near(C.box(n,L,2).energy,s.energy/2);
    near(C.integrate(s.density,.25*L,.75*L),s.probability(.25,.75));
  }
});
test('finite well solves true even/odd matching, includes all bound roots and tails',()=>{
  for(const width of [.3,.65,1,2])for(const depth of [.2,1,3,8]){
    const states=C.finiteWell(width,depth),a=width/2;assert(states.length>=1);
    for(const s of states){assert(s.energy>0&&s.energy<depth);near(s.z+Math.asin(s.z/s.z0),(s.index+1)*Math.PI/2);near(s.even?s.k*Math.tan(s.z):-s.k/Math.tan(s.z),s.kappa,1e-7);
      const eps=1e-7;near(s.psi(a-eps),s.psi(a+eps),1e-5);const h=1e-5,left=(3*s.psi(a)-4*s.psi(a-h)+s.psi(a-2*h))/(2*h),right=(-3*s.psi(a)+4*s.psi(a+h)-s.psi(a+2*h))/(2*h);near(left,right,2e-6);
      const inside=C.integrate(s.density,-a,a),tail=C.integrate(s.density,a,a+20/s.kappa);near(inside+2*tail,1,1e-7);near(2*tail,s.outside,1e-7);near(s.psi(-.17),s.even?s.psi(.17):-s.psi(.17));
    }
    const z0=states[0].z0;assert((states.length+1)*Math.PI/2>=z0+Math.PI/2-1e-12);
  }
  const deep=C.finiteWell(1,1e6);near(deep[0].energy,C.box(1,1).energy,.001);
});
test('Hermite eigenfunctions are normalized, orthogonal and satisfy their ODE',()=>{
  near(C.hermite(2,.3),4*.3**2-2);near(C.hermite(3,.3),8*.3**3-12*.3);
  for(let n=0;n<=5;n++){const s=C.oscillator(n,.3);near(s.energy,(n+.5)*.3);near(C.integrate(s.density,-10,10),1,1e-8);const dx=1e-4;for(const x of [-2,-.4,0,.4,2]){const second=(s.psi(x+dx)-2*s.psi(x)+s.psi(x-dx))/dx**2;near(second+(2*n+1-x*x)*s.psi(x),0,2e-6);}if(n<5){const t=C.oscillator(n+1);near(C.integrate(x=>s.psi(x)*t.psi(x),-10,10),0);}}
});
test('authored scripts parse, advanced derivation starts closed and local assets exist',()=>{
  const html=fs.readFileSync(path.join(root,'schroedinger-labor.html'),'utf8');
  assert.match(html,/<details id="hydrogen-derivation" class="advanced">/);assert(!/<details id="hydrogen-derivation"[^>]*\bopen\b/.test(html));
  assert(!/<img[^>]+src="https:/.test(html));assert.match(html,/Freiwillige Vertiefung/);assert.match(html,/fächerübergreifend|Physik → Chemie/i);
  for(const match of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css|jpg))(?:\?[^"#]*)?"/g))if(!/^https?:/.test(match[1]))assert(fs.existsSync(path.resolve(root,match[1])),match[1]);
  for(const name of ['core','inhalte','labor','wikipedia'])new vm.Script(fs.readFileSync(path.join(root,'scripts/schroedinger-'+name+'.js'),'utf8'));
  const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/schroedinger-inhalte.js'),'utf8'),sandbox);
  assert.equal(sandbox.window.QMLessons.box.length,12);assert.equal(sandbox.window.QMLessons.hydrogen.length,12);assert.equal(sandbox.window.QMQuiz.length,8);
});
test('lesson formulas never expose raw TeX indices or powers in prose',()=>{
  const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/schroedinger-inhalte.js'),'utf8'),sandbox);
  for(const steps of Object.values(sandbox.window.QMLessons))for(const step of steps){
    const prose=step.html.replace(/\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g,'').replace(/<[^>]*>/g,'');
    assert(!/[_^]|[{}]/.test(prose),'Unrendered mathematical notation in '+step.title+': '+prose);
    assert(!/\\[()[\]]/.test(prose),'Unbalanced math delimiters in '+step.title);
  }
  assert(sandbox.window.QMLessons.hydrogen[8].html.includes(String.raw`\(L_{n-l-1}^{2l+1}(\rho)\)`));
});

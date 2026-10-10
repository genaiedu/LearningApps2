const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const H=require('../scripts/typografie-hero-core.js'),A=require('../scripts/typografie-ansicht-core.js');
const root=path.resolve(__dirname,'..'),data=require('../data/typografie-hero.json');
const html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8'),ui=fs.readFileSync(path.join(root,'scripts/typografie-hero.js'),'utf8'),css=fs.readFileSync(path.join(root,'styles/typografie-hero.css'),'utf8');
test('four genuine local a outlines have matching ring topology, checked provenance and a shared baseline',()=>{
  assert.equal(data.character,'a');assert.equal(data.baseline,300);assert.equal(data.emSize,400);
  assert.deepEqual(data.families.map(f=>f.name),['EB Garamond','Source Sans 3','Libre Bodoni','Inter']);
  for(const f of data.families){assert.equal(f.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root,f.source))).digest('hex'));assert.ok(fs.existsSync(path.resolve(root,f.licensePath)));assert.deepEqual(f.contours.map(c=>c.length),[512,256]);
    for(const ring of f.contours)for(const [x,y] of ring){assert.ok(Number.isFinite(x)&&x>20&&x<270);assert.ok(Number.isFinite(y)&&y>65&&y<310);}
  }
});
test('all morphs interpolate actual points, keep two closed contours, are finite and cycle continuously',()=>{
  for(let i=0;i<4;i++){
    const f=data.families[i],g=data.families[(i+1)%4],pair=H.pair(f.contours,g.contours);
    assert.notEqual(H.outline(pair,0),H.outline(pair,1));
    const segments=pair.reduce((sum,[a])=>sum+a.length-1,0);
    for(let t=0;t<=1;t+=.025){const d=H.outline(pair,t);assert.equal((d.match(/M/g)||[]).length,2);assert.equal((d.match(/Z/g)||[]).length,2);assert.equal((d.match(/L/g)||[]).length,segments);assert.ok(!/NaN|Infinity/.test(d));}
    assert.notEqual(H.outline(pair,.5),H.outline(pair,0));assert.notEqual(H.outline(pair,.5),H.outline(pair,1));
  }
  assert.equal(H.phase(0).t,0);assert.equal(H.phase(2).t,0);assert.equal(H.phase(5).t,1);assert.deepEqual(H.phase(24),H.phase(0));assert.deepEqual(H.phase(-1),H.phase(23));
});
test('monotone correspondence keeps intermediate outer contours free of self-crossing spikes',()=>{
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  for(let f=0;f<4;f++){
    const [a,b]=H.pair(data.families[f].contours,data.families[(f+1)%4].contours)[0];
    for(const t of [.2,.4,.6,.8]){
      const points=a.map((p,i)=>[H.lerp(p[0],b[i][0],t),H.lerp(p[1],b[i][1],t)]);
      for(let i=0;i<points.length;i++)for(let j=i+2;j<points.length;j++){
        if(i===0&&j===points.length-1)continue;
        const p=points[i],q=points[(i+1)%points.length],r=points[j],s=points[(j+1)%points.length];
        const crosses=cross(p,q,r)*cross(p,q,s)<-1e-6&&cross(r,s,p)*cross(r,s,q)<-1e-6;
        assert.ok(!crosses,'Contour crossing: font '+f+', t='+t+', edges '+i+'/'+j);
      }
    }
  }
});
test('the counter remains inside the real outline throughout each transition',()=>{
  function inside(p,ring){
    let result=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i],b=ring[j];
      if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;
    }
    return result;
  }
  for(let f=0;f<4;f++){
    const pairs=H.pair(data.families[f].contours,data.families[(f+1)%4].contours);
    for(let k=1;k<20;k++){
      const rings=pairs.map(([a,b])=>a.map((p,i)=>[H.lerp(p[0],b[i][0],k/20),H.lerp(p[1],b[i][1],k/20)]));
      assert.ok(rings[1].every(p=>inside(p,rings[0])),'Counter outside outline: font '+f+', t='+k/20);
    }
  }
  assert.ok(html.includes('EB Garamond, Source Sans 3, Libre Bodoni und Inter'));
});
test('same words and breaks move from block to left to center and back without losing their order',()=>{
  assert.equal(data.text,H.text);const widths=data.wordWidths,rows=H.lines(widths),flat=rows.flat();
  assert.deepEqual(flat,widths.map((_,i)=>i));assert.ok(rows.length<=10);
  const layouts=Object.fromEntries(['block','left','center'].map(mode=>[mode,H.positions(rows,widths,mode)]));
  for(const mode of Object.keys(layouts))for(const row of rows){for(let j=1;j<row.length;j++)assert.ok(layouts[mode][row[j]].x>=layouts[mode][row[j-1]].x+widths[row[j-1]]);assert.ok(layouts[mode][row[0]].x>=22);assert.ok(layouts[mode][row.at(-1)].x+widths[row.at(-1)]<=216.01);}
  for(const row of rows.slice(0,-1)){assert.equal(layouts.block[row[0]].x,22);assert.ok(Math.abs(layouts.block[row.at(-1)].x+widths[row.at(-1)]-216)<.001);}
  for(const row of rows){const center=layouts.center;assert.ok(Math.abs(center[row[0]].x-22-(216-center[row.at(-1)].x-widths[row.at(-1)]))<.001);}
  assert.equal(H.setting(0).from,'block');assert.equal(H.setting(8).from,'left');assert.equal(H.setting(16).from,'center');assert.equal(H.setting(23).to,'block');assert.equal(H.setting(23).t,1);
});
function luminance(hex){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('every color transition retains reading contrast in both light and dark; it never changes global settings',()=>{
  for(const theme of ['light','dark'])for(let i=0;i<4;i++)for(let t=0;t<=1;t+=.01){const p=H.palette(A.palettes[i][theme],A.palettes[(i+1)%4][theme],t);assert.ok(contrast(p.paper,p.ink)>=4.5);assert.ok(contrast(p.paper,p.red)>=3);}
  assert.equal(H.color('#000000','#ffffff',0),'#000000');assert.equal(H.color('#000000','#ffffff',1),'#ffffff');
  assert.ok(!ui.includes('A.apply('));assert.ok(!ui.includes('root.dataset.palette='));assert.ok(ui.includes('element.style.fill='));
});
test('hero and clone respect pause, visibility, local assets, reduced motion and font loading',()=>{
  for(const marker of ['prefers-reduced-motion: reduce','motion-paused','document.hidden','IntersectionObserver','requestAnimationFrame','cancelAnimationFrame','visibilitychange','typography-motion-change','typography-hero-preview-change','document.fonts.load'])assert.ok(ui.includes(marker));
  assert.ok(ui.includes("fetch('data/typografie-hero.json?"));assert.ok(!/https?:\/\//.test(ui.replace('http://www.w3.org/2000/svg','')));
  assert.ok(html.includes('data-hero-morph aria-hidden="true"'));assert.ok(html.includes('Zwischenformen sind keine neuen Schriften'));assert.ok(css.includes('border-radius:0'));assert.ok(!fs.readFileSync(path.join(root,'scripts/typografie-atelier.js'),'utf8').includes('heroIndex'));
  assert.ok(fs.readFileSync(path.join(root,'scripts/typografie-bilder.js'),'utf8').includes("dispatchEvent(new Event('typography-hero-preview-change'))"));
});

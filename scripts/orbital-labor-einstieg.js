/* Locally calculated illustrations: real harmonics, hydrogenic nodes,
   and independent samples from the normalized hydrogen 1s density. */
(function(){
  'use strict';
  const C=window.OrbitalCore,S=window.OrbitalSurface,$=id=>document.getElementById(id);
  const families=[
    {family:'s',n:1,l:0,types:[['s','s']]},
    {family:'p',n:2,l:1,types:[['px','pₓ'],['py','pᵧ'],['pz','p𝓏']]},
    {family:'d',n:3,l:2,types:[['dxy','dₓᵧ'],['dxz','dₓ𝓏'],['dyz','dᵧ𝓏'],['dx2-y2','dₓ²₋ᵧ²'],['dz2','d𝓏²']]},
    {family:'f',n:4,l:3,types:[['fz3','f𝓏³'],['fxz2','fₓ𝓏²'],['fyz2','fᵧ𝓏²'],['fzx2-y2','f𝓏₍ₓ²₋ᵧ²₎'],['fxyz','fₓᵧ𝓏'],['fx3-3xy2','fₓ₍ₓ²₋₃ᵧ²₎'],['f3x2y-y3','fᵧ₍₃ₓ²₋ᵧ²₎']]}
  ];
  const viewer=new OrbitalViewer($('atlas-canvas'));
  let atlasSelected=false;
  function thumbnail(canvas,spec){
    const data=S.generate({...spec,resolution:29,threshold:.16,extent:5.6},C.fieldValue),ctx=canvas.getContext('2d'),triangles=[];
    const project=([x,y,z])=>{const a=.65,b=-.45,u=Math.cos(a)*x+Math.sin(a)*z,v=-Math.sin(a)*x+Math.cos(a)*z;return [u,Math.cos(b)*y-Math.sin(b)*v,Math.sin(b)*y+Math.cos(b)*v];};
    let extent=0;
    for(const [field,color] of [['positive',[235,153,101]],['negative',[80,184,207]]]){
      const mesh=data[field];
      for(let i=0;i<mesh.length;i+=9){const points=[0,3,6].map(j=>project([...mesh.slice(i+j,i+j+3)]));points.forEach(p=>extent=Math.max(extent,Math.abs(p[0]),Math.abs(p[1])));
        const [a,b,c]=points,u=b.map((v,j)=>v-a[j]),v=c.map((t,j)=>t-a[j]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...normal)||1,light=.65+.35*Math.abs((normal[0]*.25+normal[1]*.5+normal[2]*.83)/len);
        triangles.push({points,depth:points.reduce((s,p)=>s+p[2],0)/3,color:`rgb(${color.map(v=>Math.round(v*light)).join(',')})`});
      }
    }
    const scale=Math.min(canvas.width,canvas.height)*.43/(extent||1);ctx.clearRect(0,0,canvas.width,canvas.height);
    triangles.sort((a,b)=>a.depth-b.depth).forEach(t=>{ctx.beginPath();t.points.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](canvas.width/2+p[0]*scale,canvas.height/2-p[1]*scale));ctx.closePath();ctx.fillStyle=t.color;ctx.fill();});
    if(spec.mode==='mo')for(const z of [-.82,.82]){const p=project([0,0,z]);ctx.beginPath();ctx.arc(canvas.width/2+p[0]*scale,canvas.height/2-p[1]*scale,3,0,2*Math.PI);ctx.fillStyle='#647783';ctx.fill();}
  }
  function select(family,type,label){
    atlasSelected=true;
    document.querySelectorAll('[data-atlas]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.atlas===type)));
    $('atlas-title').textContent=`${family.n}${label} · ${family.family}-Familie`;
    $('atlas-explanation').textContent=`ℓ = ${family.l}: ${family.l} Winkelknoten. Die ${family.family}-Unterschale umfasst ${family.types.length} räumliche Orbitale und fasst insgesamt ${family.types.length*2} Elektronen. Das hier gewählte einzelne Orbital fasst höchstens zwei. ${family.family==='f'?'Die sieben f-Formen gehören zu ℓ = 3; Knoten können Ebenen und Kegelflächen sein. Die Kurzbezeichnungen stehen für die üblichen reellen harmonischen Funktionen, etwa z(5z² − 3r²) bei f𝓏³.':family.family==='d'?'Der ringförmige Bereich bei d𝓏² gehört zum selben Orbital wie seine beiden Lappen. Er ist weder eine Elektronenbahn noch ein weiteres Orbital.':family.family==='p'?'Beide Lappen gehören zum selben Orbital; die Ebene zwischen ihnen ist ein Winkelknoten.':'Kugelsymmetrisch bedeutet: keine bevorzugte Richtung. Es bedeutet nicht, dass das Elektron auf der Kugeloberfläche kreist.'}`;
    viewer.orbital({mode:'ao',n:family.n,type,radial:false,threshold:.14,resolution:65,extent:5.6,fit:true});
  }
  let queued=[];
  for(const family of families){
    const section=document.createElement('section');section.className='atlas-family';
    const heading=document.createElement('h3');heading.textContent=`${family.family} · ℓ = ${family.l} · ${family.types.length} ${family.types.length===1?'Orbital':'Orbitale'}`;section.append(heading);
    const row=document.createElement('div');row.className='atlas-family-orbitals';section.append(row);
    for(const [type,label] of family.types){
      const button=document.createElement('button');button.type='button';button.dataset.atlas=type;button.setAttribute('aria-pressed',String(type==='s'));button.setAttribute('aria-label',`${family.n}${label} in drehbarer 3D-Ansicht`);
      const canvas=document.createElement('canvas');canvas.width=220;canvas.height=180;canvas.setAttribute('aria-hidden','true');const text=document.createElement('span');text.textContent=label;button.append(canvas,text);row.append(button);
      button.addEventListener('click',()=>select(family,type,label));queued.push(()=>thumbnail(canvas,{mode:'ao',n:family.n,type,radial:false}));
    }
    $('orbital-atlas-grid').append(section);
  }
  // Generate previews incrementally when approaching the atlas, not during launch.
  const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();const next=()=>{queued.shift()?.();if(queued.length)setTimeout(next,0);};next();if(!atlasSelected)select(families[0],'s','s');},{rootMargin:'300px'});observer.observe($('orbital-atlas-grid'));
  const cloud=$('probability-cloud'),ctx=cloud.getContext('2d');let samples=[];
  function drawCloud(){ctx.clearRect(0,0,cloud.width,cloud.height);ctx.fillStyle='#b27750';for(const [x,y] of samples){ctx.globalAlpha=.42;ctx.beginPath();ctx.arc(x,y,1.15,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;ctx.strokeStyle='#6b7e8b';ctx.beginPath();ctx.arc(cloud.width/2,cloud.height/2,4,0,Math.PI*2);ctx.stroke();$('probability-count').textContent=`${samples.length.toLocaleString('de-DE')} unabhängige Messungen`;}
  $('probability-more').onclick=()=>{if(samples.length>=12000){$('probability-count').textContent='12.000 Messungen · Für einen neuen Versuch die Punktwolke leeren.';return;}for(let i=0;i<300;i++){const r=-Math.log(Math.max(Number.MIN_VALUE,Math.random()*Math.random()*Math.random()))/2,cos=2*Math.random()-1,phi=2*Math.PI*Math.random(),s=Math.sqrt(1-cos*cos);samples.push([cloud.width/2+60*r*s*Math.cos(phi),cloud.height/2+60*r*cos]);}drawCloud();};
  $('probability-reset').onclick=()=>{samples=[];drawCloud();};drawCloud();
  function nodeExample(key){
    const n=Number(key[0]),l={s:0,p:1,d:2,f:3}[key[1]],k=n-l-1,radial=r=>Math.pow(2*n*r,l)*C.laguerre(k,2*l+1,2*n*r)*Math.exp(-n*r),points=Array.from({length:501},(_,i)=>[i*4/500,radial(i*4/500)]),max=Math.max(...points.map(p=>Math.abs(p[1]))),roots=[];
    for(let i=1;i<points.length;i++)if(points[i-1][1]*points[i][1]<0){let a=points[i-1][0],b=points[i][0];for(let j=0;j<35;j++){const m=(a+b)/2;if(radial(a)*radial(m)<=0)b=m;else a=m;}roots.push((a+b)/2);}
    $('node-result').textContent=`${key}: ${l} Winkelknoten + ${k} Radialknoten = ${n-1} Knoten insgesamt.`;
    $('node-examples').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.node===key)));
    const path=points.map(([r,v],i)=>`${i?'L':'M'}${(45+r/4*420).toFixed(2)},${(130-v/max*90).toFixed(2)}`).join(' ');
    $('radial-chart').innerHTML=`<title>${key}: ${k} Radialknoten und ${l} Winkelknoten</title><path class="chart-axis" d="M45 25V230 M45 130H470"/><text x="15" y="22">R(r)</text><text x="475" y="147">r</text><text x="30" y="148">0</text><path class="radial-curve" d="${path}"/>${roots.map(r=>`<path class="radial-node" d="M${45+r/4*420} 30V225"/>`).join('')}<text x="55" y="250">${k===0?'Keine Radialknoten':`${k} Radialknoten: R(r) = 0`}</text>`;
  }
  document.querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>nodeExample(b.dataset.node));nodeExample('1s');
  document.querySelectorAll('[data-node-mo]').forEach(canvas=>thumbnail(canvas,{mode:'mo',level:C.levelsFor('H2')[canvas.dataset.nodeMo==='bonding'?0:1]}));
})();

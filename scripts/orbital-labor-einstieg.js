/* Locally calculated illustrations: real harmonics, hydrogenic nodes,
   and independent samples from the normalized hydrogen 1s density. */
(function(){
  'use strict';
  const C=window.OrbitalCore,$=id=>document.getElementById(id);
  const families=[
    {family:'s',n:1,l:0,types:[['s','s']]},
    {family:'p',n:2,l:1,types:[['px','pₓ'],['py','pᵧ'],['pz','p𝓏']]},
    {family:'d',n:3,l:2,types:[['dxy','dₓᵧ'],['dxz','dₓ𝓏'],['dyz','dᵧ𝓏'],['dx2-y2','dₓ²₋ᵧ²'],['dz2','d𝓏²']]},
    {family:'f',n:4,l:3,types:[['fz3','f𝓏³'],['fxz2','fₓ𝓏²'],['fyz2','fᵧ𝓏²'],['fzx2-y2','f𝓏₍ₓ²₋ᵧ²₎'],['fxyz','fₓᵧ𝓏'],['fx3-3xy2','fₓ₍ₓ²₋₃ᵧ²₎'],['f3x2y-y3','fᵧ₍₃ₓ²₋ᵧ²₎']]}
  ];
  const viewer=new OrbitalViewer($('atlas-canvas'));
  const minis=new OrbitalMiniRenderer(viewer);
  let atlasSelected=false;
  function select(family,type,label){
    atlasSelected=true;
    document.querySelectorAll('[data-atlas]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.atlas===type)));
    $('atlas-title').textContent=`${family.n}${label} · ${family.family}-Familie`;
    $('atlas-explanation').textContent=`ℓ = ${family.l}: ${family.l} Winkelknoten. Die ${family.family}-Unterschale umfasst ${family.types.length} räumliche Orbitale und fasst insgesamt ${family.types.length*2} Elektronen. Das hier gewählte einzelne Orbital fasst höchstens zwei. ${family.family==='f'?'Die sieben f-Formen gehören zu ℓ = 3; Knoten können Ebenen und Kegelflächen sein. Die Kurzbezeichnungen stehen für die üblichen reellen harmonischen Funktionen, etwa z(5z² − 3r²) bei f𝓏³.':family.family==='d'?'Der ringförmige Bereich bei d𝓏² gehört zum selben Orbital wie seine beiden Lappen. Er ist weder eine Elektronenbahn noch ein weiteres Orbital.':family.family==='p'?'Beide Lappen gehören zum selben Orbital; die Ebene zwischen ihnen ist ein Winkelknoten.':'Kugelsymmetrisch bedeutet: keine bevorzugte Richtung. Es bedeutet nicht, dass das Elektron auf der Kugeloberfläche kreist.'}`;
    viewer.orbital({mode:'ao',n:family.n,type,radial:false,threshold:.14,resolution:65,extent:5.6,fit:true,opaque:true});
  }
  // Keep all 16 choices inside the large viewer's fullscreen boundary.
  for(const family of families){
    const group=document.createElement('div');group.className='atlas-choice-family';group.setAttribute('role','group');group.setAttribute('aria-label',`${family.family}-Orbitale für die Großansicht`);
    const name=document.createElement('strong');name.textContent=family.family;group.append(name);
    const choices=document.createElement('div');group.append(choices);
    for(const [type,label] of family.types){
      const button=document.createElement('button');button.type='button';button.dataset.atlas=type;button.dataset.atlasChoice=type;button.textContent=`${family.n}${label}`;button.setAttribute('aria-label',`${family.n}${label} groß darstellen`);button.setAttribute('aria-pressed',String(type==='pz'));button.addEventListener('click',()=>select(family,type,label));choices.append(button);
    }
    $('atlas-choices').append(group);
  }
  for(const family of families){
    const section=document.createElement('section');section.className='atlas-family';
    const heading=document.createElement('h3');heading.textContent=`${family.family} · ℓ = ${family.l} · ${family.types.length} ${family.types.length===1?'Orbital':'Orbitale'}`;section.append(heading);
    const row=document.createElement('div');row.className='atlas-family-orbitals';section.append(row);
    for(const [type,label] of family.types){
      const button=document.createElement('button');button.type='button';button.dataset.atlas=type;button.setAttribute('aria-pressed',String(type==='pz'));button.setAttribute('aria-label',`${family.n}${label} in drehbarer 3D-Ansicht`);
      const tile=document.createElement('div');tile.className='atlas-tile mini-orbital';
      const canvas=document.createElement('canvas');canvas.dataset.label=`${family.n}${label}`;canvas.dataset.miniOrbital=type;canvas.className='mini-3d-canvas';
      const reset=document.createElement('button');reset.type='button';reset.dataset.miniReset='';reset.className='mini-reset';reset.textContent='↺';reset.setAttribute('aria-label',`${family.n}${label} ausrichten`);reset.title='Ansicht ausrichten';
      const text=document.createElement('span');text.textContent=label;const hint=document.createElement('small');hint.textContent='Groß ansehen';button.append(text,hint);
      tile.append(canvas,reset,button);row.append(tile);
      button.addEventListener('click',()=>{select(family,type,label);$('atlas-lab').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});minis.add(canvas,{mode:'ao',n:family.n,type,radial:false,resolution:49,threshold:.14,extent:5.6});
    }
    $('orbital-atlas-grid').append(section);
  }
  const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();if(!atlasSelected)select(families[1],'pz','p𝓏');},{rootMargin:'300px'});observer.observe($('atlas-lab'));
  function nodeExample(key){
    const n=Number(key[0]),l={s:0,p:1,d:2,f:3}[key[1]],k=n-l-1,radial=r=>Math.pow(2*n*r,l)*C.laguerre(k,2*l+1,2*n*r)*Math.exp(-n*r),points=Array.from({length:501},(_,i)=>[i*4/500,radial(i*4/500)]),max=Math.max(...points.map(p=>Math.abs(p[1]))),roots=[];
    for(let i=1;i<points.length;i++)if(points[i-1][1]*points[i][1]<0){let a=points[i-1][0],b=points[i][0];for(let j=0;j<35;j++){const m=(a+b)/2;if(radial(a)*radial(m)<=0)b=m;else a=m;}roots.push((a+b)/2);}
    $('node-result').textContent=`${key}: ${l} Winkelknoten + ${k} Radialknoten = ${n-1} Knoten insgesamt.`;
    $('node-examples').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.node===key)));
    const path=points.map(([r,v],i)=>`${i?'L':'M'}${(45+r/4*420).toFixed(2)},${(130-v/max*90).toFixed(2)}`).join(' ');
    $('radial-chart').innerHTML=`<title>${key}: ${k} Radialknoten und ${l} Winkelknoten</title><path class="chart-axis" d="M45 25V230 M45 130H470"/><text x="15" y="22">R(r)</text><text x="475" y="147">r</text><text x="30" y="148">0</text><path class="radial-curve" d="${path}"/>${roots.map(r=>`<path class="radial-node" d="M${45+r/4*420} 30V225"/>`).join('')}<text x="55" y="250">${k===0?'Keine Radialknoten':`${k} Radialknoten: R(r) = 0`}</text>`;
  }
  document.querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>nodeExample(b.dataset.node));nodeExample('1s');
  document.querySelectorAll('[data-node-mo]').forEach(canvas=>minis.add(canvas,{mode:'mo',level:C.levelsFor('H2')[canvas.dataset.nodeMo==='bonding'?0:1],resolution:73,threshold:.14,extent:4.2}));
  minis.add($('hero-orbital-canvas'),{mode:'mo',level:C.levelsFor('benzene')[0],resolution:65,threshold:.14,extent:5.6});
})();

(function(root){
  'use strict';
  const SVG='http://www.w3.org/2000/svg';
  function overshoot(font,flat,round){
    const f=font.glyphs[flat].bounds,r=font.glyphs[round].bounds;
    return {top:r[3]-f[3],belowBaseline:-r[1],belowFlat:f[1]-r[1],upm:font.unitsPerEm};
  }
  function layout(font,characters,options={}){
    const width=options.width||900,pad=30;
    const total=[...characters].reduce((sum,c)=>sum+font.glyphs[c].advance,0);
    const scale=Math.min(290/font.unitsPerEm,(width-2*pad)/total);
    const upper=Math.max(...[...characters].map(c=>font.glyphs[c].bounds[3]));
    const lower=Math.min(0,...[...characters].map(c=>font.glyphs[c].bounds[1]));
    const baseline=pad+upper*scale,height=baseline-lower*scale+pad;
    return {width,height,scale,baseline,y:value=>baseline-value*scale};
  }
  const api={overshoot,layout};
  if(typeof module==='object'&&module.exports){module.exports=api;return;}
  const $=id=>document.getElementById(id);
  const create=(tag,attributes={},text)=>{
    const n=document.createElementNS(SVG,tag);
    Object.entries(attributes).forEach(([k,v])=>n.setAttribute(k,String(v)));
    if(text!==undefined)n.textContent=text;
    return n;
  };
  const format=(v,d=2)=>Number(v).toLocaleString('de-DE',{maximumFractionDigits:d});
  function draw(target,font,characters,markers,detail=false){
    const m=layout(font,characters);
    const svg=create('svg',{viewBox:`0 0 ${m.width} ${m.height}`,role:'img','aria-label':font.name+': '+characters+(detail?', vergrößertes Grundliniendetail':', tatsächliche Schriftkonturen')});
    svg.append(create('title',{},font.name+' · '+characters+' · Regular / 400'));
    const highlight=create('g',{'class':'overshoot-bands'});
    if(characters.length===2){
      const f=font.glyphs[characters[0]].bounds,r=font.glyphs[characters[1]].bounds;
      let roundStart=30+font.glyphs[characters[0]].advance*m.scale;
      const roundWidth=font.glyphs[characters[1]].advance*m.scale;
      if(r[3]>f[3])highlight.append(create('rect',{x:roundStart,y:m.y(r[3]),width:roundWidth,height:(r[3]-f[3])*m.scale}));
      if(r[1]<0)highlight.append(create('rect',{x:roundStart,y:m.baseline,width:roundWidth,height:-r[1]*m.scale}));
    }
    svg.append(highlight);
    let x=30;
    const contours=create('g',{'class':'glyph-contours'});
    for(const c of characters){
      contours.append(create('path',{d:font.glyphs[c].path,transform:`translate(${x} ${m.baseline}) scale(${m.scale} ${-m.scale})`,'data-character':c}));
      x+=font.glyphs[c].advance*m.scale;
    }
    svg.append(contours);
    for(const marker of markers){
      const y=m.y(marker.value);
      svg.append(create('line',{x1:0,x2:m.width,y1:y,y2:y,'class':'outline-guide '+(marker.value===0?'guide-baseline':''),'data-guide':marker.name,'vector-effect':'non-scaling-stroke'}));
    }
    if(detail){
      const strip=document.createElement('div');strip.className='overshoot-detail-pair';
      let start=30;
      for(let i=0;i<characters.length;i++){
        const c=characters[i],glyph=font.glyphs[c],b=glyph.bounds;
        const center=start+(i===0?b[0]+(b[2]-b[0])*.18:(b[0]+b[2])/2)*m.scale;
        const cropWidth=font.unitsPerEm*.28*m.scale,span=font.unitsPerEm*.085*m.scale;
        const crop=svg.cloneNode(true);
        crop.setAttribute('viewBox',`${center-cropWidth/2} ${m.baseline-span*.65} ${cropWidth} ${span}`);
        crop.setAttribute('aria-label',font.name+': '+c+', Ausschnitt an der Grundlinie');
        crop.querySelector('title').textContent=font.name+' · '+c+' · Grundliniendetail';
        crop.classList.add('outline-detail');
        const frame=document.createElement('div'),label=document.createElement('span');
        label.className='feature-caption';label.textContent=c+' · Grundliniendetail';
        frame.append(label,crop);strip.append(frame);
        start+=glyph.advance*m.scale;
      }
      target.replaceChildren(strip);
    }else target.replaceChildren(svg);
    target.dataset.font=font.name;
  }
  let families;
  function selected(id){return families.find(f=>f.name===$(id).value);}
  function updateAnatomy(){
    const f=selected('anatomy-font');
    const below=Math.min(f.glyphs.g.bounds[1],f.glyphs.p.bounds[1]);
    draw($('anatomy-word'),f,'abgpx',[
      {name:'b',value:f.glyphs.b.bounds[3]},{name:'x',value:f.glyphs.x.bounds[3]},
      {name:'baseline',value:0},{name:'descender',value:below}]);
    $('anatomy-status').textContent=f.name+' · Grundlinie: Fontkoordinate 0. Die weiteren Linien folgen der Oberkante von b und x sowie der tiefsten Kontur von g/p. Kleine Überstände einzelner Formen sind möglich.';
  }
  function updateOvershoot(){
    const f=selected('overshoot-font');
    [['upper','H','O'],['lower','x','o']].forEach(([id,flat,round])=>{
      const markers=[{name:'top',value:f.glyphs[flat].bounds[3]},{name:'baseline',value:0}];
      draw($('overshoot-'+id),f,flat+round,markers);
      draw($('overshoot-'+id+'-detail'),f,flat+round,markers,true);
      const measure=overshoot(f,flat,round),percent=v=>format(v/f.unitsPerEm*100)+' %';
      $('overshoot-'+id+'-values').textContent=round+' reicht '+percent(measure.top)+' des Schriftgrads über die Oberkante von '+flat+' und '+percent(measure.belowBaseline)+' unter die Grundlinie.';
    });
    $('overshoot-proof').classList.toggle('hide-bands',!$('overshoot-highlight').checked);
    $('overshoot-status').textContent=f.name+' · Originalkonturen der lokal eingebundenen Webfontdatei, Regular / Gewicht 400. Die Detailstreifen zeigen denselben Ausschnitt vergrößert, ohne Buchstabenformen zu verändern.';
  }
  async function init(){
    try{
      const response=await fetch('data/typografie-anatomy.json',{credentials:'omit'});
      if(!response.ok)throw Error('metrics unavailable');
      families=(await response.json()).families;
      $('anatomy-font').addEventListener('change',updateAnatomy);
      $('overshoot-font').addEventListener('change',updateOvershoot);
      $('overshoot-highlight').addEventListener('change',updateOvershoot);
      updateAnatomy();updateOvershoot();
    }catch(_){
      $('anatomy-status').textContent='Die Konturdaten konnten nicht geladen werden. Es werden keine geschätzten Hilfslinien angezeigt.';
      $('overshoot-status').textContent='Die Konturvergleiche sind momentan nicht verfügbar. Bitte die Seite neu laden; die Erklärung bleibt lesbar.';
    }
  }
  init();
})(typeof window==='object'?window:globalThis);

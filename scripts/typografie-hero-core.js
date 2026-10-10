(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.TypoHero=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const duration=24;
  const text='Ein guter Text gibt dem Gedanken Raum. Seine Form ordnet die Wörter, trennt Absätze und macht Zusammenhänge sichtbar. Derselbe Inhalt kann ruhig am linken Rand beginnen, die ganze Zeilenbreite nutzen oder sich um eine gemeinsame Mitte sammeln.';
  const lerp=(a,b,t)=>a+(b-a)*t,clamp=t=>Math.max(0,Math.min(1,t));
  const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
  function phase(seconds,count=4){
    const time=((Number(seconds)||0)%duration+duration)%duration,slot=duration/count,index=Math.floor(time/slot),local=time%slot;
    return {index,next:(index+1)%count,t:ease((local-slot/3)/(slot/2))};
  }
  // Match cyclic contour start points, not just arbitrary SVG command positions.
  function alignRing(a,b){
    if(a.length!==b.length)throw Error('Contour lengths differ');
    let best=0,cost=Infinity;
    for(let shift=0;shift<a.length;shift++){
      let sum=0;
      for(let i=0;i<a.length;i+=4){const p=a[i],q=b[(i+shift)%b.length];sum+=(p[0]-q[0])**2+(p[1]-q[1])**2;}
      if(sum<cost){cost=sum;best=shift;}
    }
    return b.slice(best).concat(b.slice(0,best));
  }
  function correspondence(a,b){
    b=alignRing(a,b);
    // A serif, stem and curved bowl have different contour lengths. Merely
    // pairing equal arc-length positions folds them into spikes. A monotone
    // geometric correspondence lets short details collapse or emerge in place.
    const tangent=ring=>ring.map((_,i)=>{const p=ring[(i+ring.length-2)%ring.length],q=ring[(i+2)%ring.length],x=q[0]-p[0],y=q[1]-p[1],length=Math.hypot(x,y)||1;return[x/length,y/length];});
    const ta=tangent(a),tb=tangent(b),n=a.length,size=n+1,cost=new Float64Array(size*size).fill(Infinity),step=new Uint8Array(size*size);
    cost[0]=0;
    for(let i=1;i<=n;i++)for(let j=1;j<=n;j++){
      const k=i*size+j,p=a[i-1],q=b[j-1],directionCost=400*(1-ta[i-1][0]*tb[j-1][0]-ta[i-1][1]*tb[j-1][1]);
      const distance=(p[0]-q[0])**2+(p[1]-q[1])**2+directionCost;
      let value=cost[k-size-1],direction=0;
      if(cost[k-size]+16<value){value=cost[k-size]+16;direction=1;}
      if(cost[k-1]+16<value){value=cost[k-1]+16;direction=2;}
      cost[k]=distance+value;step[k]=direction;
    }
    const x=[],y=[];let i=n,j=n;
    while(i&&j){x.push(a[i-1]);y.push(b[j-1]);const direction=step[i*size+j];if(direction!==2)i--;if(direction!==1)j--;}
    return [x.reverse(),y.reverse()];
  }
  function pair(a,b){return a.map((ring,i)=>correspondence(ring,b[i]));}
  function outline(pairs,t){
    t=clamp(t);
    return pairs.map(([a,b])=>a.map((p,i)=>(i?'L':'M')+lerp(p[0],b[i][0],t).toFixed(2)+' '+lerp(p[1],b[i][1],t).toFixed(2)).join('')+'Z').join('');
  }
  function lines(widths,width=194,gap=3.2){
    const out=[];let row=[],used=0;
    widths.forEach((w,index)=>{
      if(row.length&&used+gap+w>width){out.push(row);row=[];used=0;}
      row.push(index);used+=w+(row.length>1?gap:0);
    });
    if(row.length)out.push(row);return out;
  }
  function positions(rows,widths,mode,width=194,gap=3.2){
    const result=Array(widths.length);
    rows.forEach((row,line)=>{
      const natural=row.reduce((sum,i)=>sum+widths[i],0)+gap*(row.length-1);
      const space=mode==='block'&&line<rows.length-1&&row.length>1?(width-row.reduce((sum,i)=>sum+widths[i],0))/(row.length-1):gap;
      let x=mode==='center'?(width-natural)/2:0;
      for(const index of row){result[index]={x:22+x,y:90+line*20};x+=widths[index]+space;}
    });return result;
  }
  function setting(seconds){
    const p=phase(seconds,3),modes=['block','left','center'],names=['Blocksatz','Linksbündiger Flattersatz','Zentriert'];
    return {...p,from:modes[p.index],to:modes[p.next],label:p.t===0?names[p.index]:p.t===1?names[p.next]:names[p.index]+' → '+names[p.next]};
  }
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const linear=n=>(n/=255)<=.04045?n/12.92:((n+.055)/1.055)**2.4;
  const encoded=n=>255*(n<=.0031308?12.92*n:1.055*n**(1/2.4)-.055);
  function color(a,b,t){
    const x=rgb(a),y=rgb(b);return '#'+x.map((n,i)=>Math.round(encoded(lerp(linear(n),linear(y[i]),clamp(t)))).toString(16).padStart(2,'0')).join('');
  }
  function palette(a,b,t){return Object.fromEntries(['paper','ink','red','line'].map(key=>[key,color(a[key],b[key],t)]));}
  return {duration,text,lerp,ease,phase,pair,outline,lines,positions,setting,color,palette};
});

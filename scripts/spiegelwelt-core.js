(function(root){
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function response(e,mode='positive'){e=clamp(e,-1,1);return mode==='linear'?e:mode==='negative'?e**3:2*e/(1+e*e);}
  function batches(seed,count){const values=[clamp(seed,-1,1)];for(let i=0;i<clamp(Math.floor(count),0,10);i++)values.push(response(values.at(-1)));return values;}
  function pairs(e){const p=(clamp(e,-1,1)+1)/2,q=1-p;return {aa:p*p,ab:2*p*q,bb:q*q};}
  function rotate(v,y,x){const cy=Math.cos(y),sy=Math.sin(y),cx=Math.cos(x),sx=Math.sin(x);const a=v[0]*cy+v[2]*sy,b=-v[0]*sy+v[2]*cy;return [a,v[1]*cx-b*sx,v[1]*sx+b*cx];}
  const api={clamp,response,batches,pairs,rotate};root.SpiegelCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);

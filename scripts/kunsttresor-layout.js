(function(root){
 'use strict';
 // Choose complete, equally high rows. Scrolling replaces shrinking the whole
 // wall to the viewport; every image retains its original aspect ratio.
 function rows(aspects,width,{gap=8,target=300}={}){
  if(!aspects.length||!(width>0))return [];
  const ratios=aspects.map(a=>Number.isFinite(a)&&a>0?a:1),cost=Array(ratios.length+1).fill(Infinity),next=[];
  cost[ratios.length]=0;
  for(let i=ratios.length-1;i>=0;i--){
   let sum=0;
   for(let j=i;j<Math.min(ratios.length,i+6);j++){
    sum+=ratios[j];const height=(width-gap*(j-i))/sum;
    if(height<=0)break;
    const score=Math.log(height/target)**2+cost[j+1];
    if(score<cost[i]){cost[i]=score;next[i]=j+1;}
   }
  }
  const result=[];
  for(let i=0;i<ratios.length;){
   const end=next[i],sum=ratios.slice(i,end).reduce((a,b)=>a+b,0),height=(width-gap*(end-i-1))/sum;
   let x=0;const items=[];
   for(let j=i;j<end;j++){const w=height*ratios[j];items.push({index:j,x,width:w});x+=w+gap;}
   result.push({height,items});i=end;
  }
  return result;
 }
 root.KunstWallLayout={rows};
 if(typeof module!=='undefined'&&module.exports)module.exports={rows};
})(typeof globalThis!=='undefined'?globalThis:this);

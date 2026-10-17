const test=require('node:test'),assert=require('node:assert/strict'),{rows}=require('../scripts/kunsttresor-layout.js');
test('complete rows use the full width without cropping, including the last row',()=>{
 for(const width of [320,390,760,1280,1920,2560])for(const aspects of [[.55,1.8,.8,1.4,.7,1,2],[.3,.4,.5,.6,.8,.3,.4],[4,3,2,1,5,.4,1],Array(48).fill(1.2)]){
  const layout=rows(aspects,width,{gap:8,target:width<=760?210:340}),indices=[];
  for(const row of layout){assert.ok(row.height>0);assert.equal(row.items[0].x,0);
   const last=row.items.at(-1);assert.ok(Math.abs(last.x+last.width-width)<1e-7);
   row.items.forEach((item,i)=>{indices.push(item.index);assert.ok(Math.abs(item.width/row.height-aspects[item.index])<1e-7);if(i)assert.ok(Math.abs(item.x-row.items[i-1].x-row.items[i-1].width-8)<1e-7);});
  }
  assert.deepEqual(indices,aspects.map((_,i)=>i));
 }
});
test('missing dimensions have a stable fallback and empty walls stay empty',()=>{
 assert.deepEqual(rows([],1200),[]);assert.deepEqual(rows([1],0),[]);
 const layout=rows([NaN,0,-1],1200);assert.equal(layout.flatMap(r=>r.items).length,3);
 assert.ok(layout.every(r=>Number.isFinite(r.height)));
});

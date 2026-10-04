'use strict';
importScripts('orbital-labor-core.js?v=20261004-4','orbital-labor-surface.js');
self.onmessage=({data})=>{
  try{
    const result=OrbitalSurface.generate(data.spec,OrbitalCore.fieldValue);
    self.postMessage({id:data.id,...result},[result.positive.buffer,result.negative.buffer]);
  }catch(error){self.postMessage({id:data.id,error:String(error.message||error)});}
};

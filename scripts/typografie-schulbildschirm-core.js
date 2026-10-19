/* Physical display sizes, not CSS viewport sizes. All calculations stay local. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TypoSchoolScreen=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const tablet=Object.freeze({name:'iPad (A16)',shortPixels:1640,longPixels:2360,ppi:264,source:'https://support.apple.com/de-de/122240'});
  // OS/2 sxHeight / head unitsPerEm, read from the shipped Regular TTFs.
  const fonts=Object.freeze({fira:Object.freeze({name:'Fira Sans',xHeight:.527}),garamond:Object.freeze({name:'EB Garamond',xHeight:.4})});
  // AVIXA's publicly available BDM table, not a certification or a universal
  // reading threshold. Use its conservative upper band, without extrapolation.
  const bands=Object.freeze([[1,.005],[1.5,.0075],[2,.01],[3,.015],[4,.02],[5,.025],[6,.03],[7,.035],[8,.04],[9,.045],[10,.05]].map(Object.freeze));
  function positive(value){const n=Number(value);if(!Number.isFinite(n)||n<=0)throw RangeError('Ein positiver endlicher Wert ist erforderlich.');return n;}
  function tabletPage(options={}){
    const size=positive(options.size??12),landscape=options.landscape===true,whole=options.whole===true;
    const short=tablet.shortPixels/tablet.ppi*25.4,long=tablet.longPixels/tablet.ppi*25.4;
    const width=landscape?long:short,height=landscape?short:long;
    const factor=whole?Math.min(width/210,height/297):width/210;
    return {width,height,factor,size,effective:size*factor,pageHeight:297*factor,scroll:297*factor>height+.01};
  }
  function projection(options={}){
    const distance=positive(options.distance??8),width=positive(options.width??2.4);
    const aspect=Object.hasOwn({'16:9':1,'16:10':1,'4:3':1},options.aspect)?options.aspect:'16:9';
    const [a,b]=aspect.split(':').map(Number),height=width*b/a,ratio=distance/height;
    const band=ratio>=.8?bands.find(([upper])=>ratio<=upper):null;
    if(!band)return {distance,width,height,ratio,supported:false};
    const elementFraction=band[1],elementMm=height*1000*elementFraction;
    const documentWidth=options.document==='landscape'?297:210,font=Object.hasOwn(fonts,options.font)?fonts[options.font]:fonts.fira;
    const enlargement=width*1000/documentWidth,points=elementMm/(enlargement*font.xHeight*25.4/72);
    return {distance,width,height,ratio,supported:true,elementFraction,elementMm,documentWidth,enlargement,font:font.name,xHeight:font.xHeight,points};
  }
  return Object.freeze({tablet,fonts,bands,tabletPage,projection});
});

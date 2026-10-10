(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TypoBackground=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const themes={paper:{background:'#eee9df',ink:'#202823'},night:{background:'#18251f',ink:'#f3eee3'},sage:{background:'#e3e9df',ink:'#233d32'},blue:{background:'#e0e8ee',ink:'#142f4f'}};
  const fonts={'Cardo':400,'Source Sans 3':700,'Libre Bodoni':400};
  const defaults={glyph:'&',font:'Cardo',theme:'paper',tone:'darker',strength:8,size:170,x:50,y:52,width:960,mode:'normal',speed:.3,shield:false,visible:true};
  const clamp=(value,min,max,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};
  function settings(o={}){return {
    glyph:['&','A','g','?','§','R'].includes(o.glyph)?o.glyph:defaults.glyph,
    font:Object.hasOwn(fonts,o.font)?o.font:defaults.font,
    theme:Object.hasOwn(themes,o.theme)?o.theme:defaults.theme,
    tone:o.tone==='lighter'?'lighter':'darker',strength:clamp(o.strength,0,100,defaults.strength),size:clamp(o.size,80,300,defaults.size),
    x:clamp(o.x,-30,130,defaults.x),y:clamp(o.y,10,90,defaults.y),width:[320,600,960].includes(Number(o.width))?Number(o.width):defaults.width,
    mode:o.mode==='parallax'?'parallax':'normal',speed:clamp(o.speed,0,1,defaults.speed),shield:o.shield===true,visible:o.visible!==false
  };}
  // Percentage is a channel mixture with white/black, not a luminance percentage.
  function color(background,tone,strength){
    if(!/^#[0-9a-f]{6}$/i.test(background))throw Error('Sechsstellige Hintergrundfarbe erforderlich');
    const t=tone==='lighter'?255:0,f=clamp(strength,0,100,defaults.strength)/100;
    return '#'+[1,3,5].map(i=>Math.round(parseInt(background.slice(i,i+2),16)*(1-f)+t*f).toString(16).padStart(2,'0')).join('');
  }
  // The glyph is inside the scrolling document. Compensate only the difference:
  // its visible movement is -speed * scrollTop, versus -scrollTop for the text.
  function shift(scrollTop,speed){return Math.max(0,Number(scrollTop)||0)*(1-clamp(speed,0,1,1));}
  function geometry(options,width,height,scrollTop=0,motionAllowed=true){
    const s=settings(options),effectiveSpeed=s.mode==='parallax'&&motionAllowed?s.speed:1;
    return {fontSize:Math.max(1,Number(width)||320)*s.size/100,top:Math.max(1,Number(height)||500)*s.y/100,left:s.x,shift:shift(scrollTop,effectiveSpeed),speed:effectiveSpeed};
  }
  return {themes,fonts,defaults,settings,color,shift,geometry};
});

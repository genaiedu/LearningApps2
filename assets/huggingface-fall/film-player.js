(() => {
 'use strict';
 const channel='hf-film-v1',root=document.querySelector('[data-composition-id]');
 const duration=Number(root.dataset.duration),clips=[...document.querySelectorAll('[data-start]')].filter(e=>e!==root).map(el=>({el,start:Number(el.dataset.start),end:Number(el.dataset.start)+Number(el.dataset.duration||1e9)}));
 let timeline,time=0,end=duration,paused=true,raf=0,last=0,lastReport=0,ready=false;
 const report=type=>parent.postMessage({channel,type,time,end,duration,paused,ready},'*');
 function fit(){
  const finale=document.body.dataset.film==='finale';
  const scale=(finale?Math.max:Math.min)(innerWidth/1920,innerHeight/1080),x=(innerWidth-1920*scale)/2,y=(innerHeight-1080*scale)/2;
  document.body.style.transform=`translate(${x}px,${y}px) scale(${scale})`;
  if(finale){
   const values={'--visible-left':-x/scale,'--visible-top':-y/scale,'--visible-width':innerWidth/scale,'--visible-height':innerHeight/scale,'--safe-inline':24/scale,'--safe-bottom':Math.max(24,innerHeight*.06)/scale,'--caption-size':Math.max(19,Math.min(44,innerWidth*.024))/scale,'--finale-size':Math.min(112,(innerWidth/scale-48/scale)/13),'--kick-size':Math.min(24,(innerWidth/scale-48/scale)/22)};
   for(const [name,value]of Object.entries(values))document.body.style.setProperty(name,value+'px');
  }
 }
 function show(){timeline.time(time,false);clips.forEach(c=>c.el.style.visibility=(time>=c.start&&(time<c.end||time>=duration&&c.end>=duration))?'visible':'hidden');}
 function pause(){if(raf)cancelAnimationFrame(raf);raf=0;paused=true;last=0;report('state');}
 function seek(value){pause();time=Math.max(0,Math.min(duration,Number(value)||0));show();report('state');}
 function frame(now){
  if(paused)return;
  if(last)time=Math.min(end,time+Math.max(0,Math.min((now-last)/1000,.1)));
  last=now;show();
  if(now-lastReport>45){report('state');lastReport=now;}
  if(time>=end){pause();report('ended');}else raf=requestAnimationFrame(frame);
 }
 function playTo(value){pause();end=Math.max(time,Math.min(duration,Number(value)));if(time>=end){report('ended');return;}paused=false;last=0;report('state');raf=requestAnimationFrame(frame);}
 // Only our embedding window can command a film. Works for Pages and file://.
 addEventListener('message',event=>{
  const m=event.data;if(event.source!==parent||!m||m.channel!==channel)return;
  if(m.command==='hello'){report('ready');return;}if(!ready)return;
  if(m.command==='pause')pause();
  if(m.command==='seek')seek(m.value);
  if(m.command==='play')playTo(m.value);
  if(m.command==='theme'){document.body.dataset.theme=m.value==='light'?'light':'dark';document.documentElement.dataset.theme=document.body.dataset.theme;}
 });
 function initialize(){
  timeline=window.__timelines[root.dataset.compositionId];
  if(!timeline)return setTimeout(initialize,25);
  timeline.pause();ready=true;show();report('ready');
  // A paused GSAP timeline needs no independent rendering ticker.
  gsap.ticker.sleep();
 }
 addEventListener('resize',fit);fit();
 (document.fonts?document.fonts.ready:Promise.resolve()).then(initialize);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 addEventListener('pagehide',pause);
 // No autoplay, click-to-restart, global keyboard handler or endless loop.
})();

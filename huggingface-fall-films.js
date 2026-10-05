window.HFMovie=class {
 constructor(frame,callbacks={}){
  this.frame=frame;this.callbacks=callbacks;this.time=0;this.paused=true;this.ready=false;this.pending=[];this.disposed=false;
  this.message=event=>{
   if(this.disposed||event.source!==this.frame.contentWindow||event.data?.channel!=='hf-film-v1')return;
   const m=event.data;this.time=m.time;this.paused=m.paused;this.end=m.end;this.duration=m.duration;
   if(m.ready&&!this.ready){this.ready=true;for(const [command,value] of this.pending)this.send(command,value);this.pending=[];callbacks.ready?.();}
   callbacks.change?.(this);if(m.type==='ended')callbacks.ended?.(this);
  };
  window.addEventListener('message',this.message);
  this.loaded=()=>this.send('hello');frame.addEventListener('load',this.loaded);
  this.send('hello');
 }
 send(command,value){if(!this.disposed)this.frame.contentWindow?.postMessage({channel:'hf-film-v1',command,value},'*');}
 command(command,value){if(this.ready)this.send(command,value);else this.pending.push([command,value]);}
 seek(value){this.paused=true;this.time=value;this.command('seek',value);}
 playTo(value){this.paused=false;this.command('play',value);}
 pause(){this.paused=true;this.pending=this.pending.filter(([c])=>c!=='play');this.command('pause');}
 theme(value){this.command('theme',value);}
 dispose(){this.pause();this.disposed=true;window.removeEventListener('message',this.message);this.frame.removeEventListener('load',this.loaded);this.pending=[];}
};

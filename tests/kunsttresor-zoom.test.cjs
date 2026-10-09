const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {create} = require('../scripts/kunsttresor-zoom.js');

function fixture({width=1000,height=800,naturalWidth=1000,naturalHeight=800}={}) {
  const handlers = new Map(), captured = new Set(), classes = new Set();
  const view = {clientWidth:width,clientHeight:height,clientLeft:2,clientTop:3,
    getBoundingClientRect:()=>({left:30,top:50}),
    classList:{toggle:(name,value)=>value?classes.add(name):classes.delete(name),remove:name=>classes.delete(name)},
    addEventListener:(type,handler)=>{if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(handler);},
    setPointerCapture:id=>captured.add(id),releasePointerCapture:id=>captured.delete(id)};
  const dimension=(style,axis,fallback)=>style[axis]?.endsWith('px')?parseFloat(style[axis]):fallback;
  const stage={style:{},get clientWidth(){return dimension(this.style,'width',view.clientWidth);},get clientHeight(){return dimension(this.style,'height',view.clientHeight);}};
  const image={naturalWidth,naturalHeight,style:{},get clientWidth(){return dimension(this.style,'width',stage.clientWidth);},get clientHeight(){return dimension(this.style,'height',stage.clientHeight);}};
  let left=0,top=0;
  Object.defineProperties(view,{
    scrollLeft:{get:()=>left,set:v=>{left=Math.max(0,Math.min(stage.clientWidth-view.clientWidth,v));}},
    scrollTop:{get:()=>top,set:v=>{top=Math.max(0,Math.min(stage.clientHeight-view.clientHeight,v));}}
  });
  const label={},zoomIn={},zoomOut={},viewer=create({view,image,stage,label,zoomIn,zoomOut});
  function emit(type,id,x,y,extra={}) {
    if (['pointerup','pointercancel','lostpointercapture'].includes(type)) captured.delete(id);
    const event={pointerId:id,clientX:x+32,clientY:y+53,pointerType:'touch',button:0,preventDefault(){this.prevented=true;},...extra};
    for(const handle of handlers.get(type)||[])handle(event);
    return event;
  }
  function pointAt(x,y) {return {u:(left+x-(stage.clientWidth-image.clientWidth)/2)/image.clientWidth,v:(top+y-(stage.clientHeight-image.clientHeight)/2)/image.clientHeight};}
  return {viewer,view,image,stage,label,zoomIn,zoomOut,emit,pointAt,captured,classes};
}
function near(actual,expected){assert.ok(Math.abs(actual-expected)<.000001,`${actual} ≈ ${expected}`);}
function pinchOut(f){f.emit('pointerdown',1,300,200);f.emit('pointerdown',2,400,200);f.emit('pointermove',1,250,200);f.emit('pointermove',2,450,200);}

test('pinch starts at fit-to-screen, continuously enlarges and shrinks the picture',()=>{
  const f=fixture();assert.equal(f.label.textContent,'100 %');
  pinchOut(f);near(f.viewer.zoom,200);assert.equal(f.label.textContent,'200 %');
  assert.equal(f.image.clientWidth,2000);assert.equal(f.view.scrollLeft,350);
  f.emit('pointermove',1,300,200);f.emit('pointermove',2,400,200);
  near(f.viewer.zoom,100);assert.equal(f.view.scrollLeft,0);assert.equal(f.view.scrollTop,0);
  assert.equal(f.zoomOut.disabled,true);
});
test('both horizontal and diagonal finger movement use their actual two-dimensional distance',()=>{
  const f=fixture();f.emit('pointerdown',1,300,200);f.emit('pointerdown',2,400,300);
  f.emit('pointermove',1,250,150);f.emit('pointermove',2,450,350);
  near(f.viewer.zoom,200);near(f.pointAt(350,250).u,.35);near(f.pointAt(350,250).v,.3125);
});
test('the image detail stays underneath an off-centre pinch midpoint, including portrait margins',()=>{
  const f=fixture({naturalWidth:600,naturalHeight:800});
  const anchor=f.pointAt(400,250);
  f.emit('pointerdown',1,350,250);f.emit('pointerdown',2,450,250);
  f.emit('pointermove',1,300,250);f.emit('pointermove',2,500,250);
  near(f.pointAt(400,250).u,anchor.u);near(f.pointAt(400,250).v,anchor.v);
  assert.equal(f.image.clientWidth,1200);assert.equal(f.stage.clientWidth,1200);
});
test('moving two fingers together pans at the current zoom instead of snapping to the centre',()=>{
  const f=fixture();for(let i=0;i<4;i++)f.zoomIn.onclick();
  const anchor=f.pointAt(500,400);
  f.emit('pointerdown',1,400,400);f.emit('pointerdown',2,600,400);
  f.emit('pointermove',1,450,450);f.emit('pointermove',2,650,450);
  near(f.viewer.zoom,200);near(f.pointAt(550,450).u,anchor.u);near(f.pointAt(550,450).v,anchor.v);
});
test('lifting either finger leaves a one-finger pan with no jump',()=>{
  for(const lifted of [1,2]){
    const f=fixture();pinchOut(f);const left=f.view.scrollLeft,top=f.view.scrollTop;
    f.emit('pointerup',lifted,0,0);assert.equal(f.view.scrollLeft,left);assert.equal(f.view.scrollTop,top);
    const remaining=lifted===1?2:1,x=remaining===1?250:450;
    f.emit('pointermove',remaining,x-20,180);
    assert.equal(f.view.scrollLeft,left+20);assert.equal(f.view.scrollTop,top+20);
    f.emit('pointerup',remaining,0,0);assert.equal(f.classes.has('is-panning'),false);
  }
});
test('zoom limits are 100–300%, whether changed with fingers or buttons',()=>{
  const f=fixture();f.emit('pointerdown',1,300,300);f.emit('pointerdown',2,400,300);
  f.emit('pointermove',1,100,300);f.emit('pointermove',2,700,300);
  assert.equal(f.viewer.zoom,300);assert.equal(f.zoomIn.disabled,true);
  f.emit('pointermove',1,349,300);f.emit('pointermove',2,351,300);
  assert.equal(f.viewer.zoom,100);assert.equal(f.zoomOut.disabled,true);
  for(let i=0;i<20;i++)f.zoomIn.onclick();assert.equal(f.viewer.zoom,300);
  for(let i=0;i<20;i++)f.zoomOut.onclick();assert.equal(f.viewer.zoom,100);
});
test('cancelling gestures, losing capture and closing/reopening do not retain stale fingers',()=>{
  for(const type of ['pointercancel','lostpointercapture']){
    const f=fixture();pinchOut(f);f.emit(type,2,0,0);
    f.emit('pointermove',1,230,200);assert.equal(f.view.scrollLeft,370);
    f.viewer.cancel();const left=f.view.scrollLeft;
    f.emit('pointermove',1,100,100);assert.equal(f.view.scrollLeft,left);assert.equal(f.captured.size,0);
    f.viewer.reset();assert.equal(f.viewer.zoom,100);assert.equal(f.view.scrollLeft,0);
    pinchOut(f);assert.equal(f.viewer.zoom,200);
  }
});
test('mouse dragging and zoom buttons still work, while other mouse buttons are ignored',()=>{
  const f=fixture();f.zoomIn.onclick();assert.equal(f.viewer.zoom,125);
  const left=f.view.scrollLeft;
  f.emit('pointerdown',8,300,200,{pointerType:'mouse',button:2});f.emit('pointermove',8,250,200);
  assert.equal(f.view.scrollLeft,left);
  const event=f.emit('pointerdown',9,300,200,{pointerType:'mouse'});assert.equal(event.prevented,true);
  f.emit('pointermove',9,250,200,{pointerType:'mouse'});assert.equal(f.view.scrollLeft,left+50);
  f.emit('pointerup',9,250,200,{pointerType:'mouse'});assert.equal(f.classes.has('is-panning'),false);
});
test('an extra finger or initially coincident fingers cannot produce a non-finite zoom',()=>{
  const f=fixture();f.emit('pointerdown',1,300,200);f.emit('pointerdown',2,300,200);
  f.emit('pointermove',1,290,200);assert.equal(f.viewer.zoom,100);
  f.emit('pointermove',2,310,200);near(f.viewer.zoom,200);
  f.emit('pointerdown',3,400,300);f.emit('pointermove',3,420,300);assert.ok(Number.isFinite(f.viewer.zoom));
  f.emit('pointerup',1,0,0);f.emit('pointermove',2,320,200);assert.ok(Number.isFinite(f.viewer.zoom));
});
test('a higher resolution image keeps the zoom and detail instead of resetting the view',()=>{
  const f=fixture();pinchOut(f);const before=f.pointAt(500,400);
  f.image.naturalWidth=4000;f.image.naturalHeight=3200;f.viewer.layout();
  assert.equal(f.viewer.zoom,200);near(f.pointAt(500,400).u,before.u);near(f.pointAt(500,400).v,before.v);
});
test('the viewer is loaded before the app and confines touch handling to the picture',()=>{
  const root=path.join(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'kunsttresor.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'scripts/kunsttresor.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'styles/kunsttresor.css'),'utf8');
  assert.ok(html.indexOf('scripts/kunsttresor-zoom.js')<html.indexOf('scripts/kunsttresor.js'));
  assert.ok(js.includes('imageViewer.reset()'));assert.ok(js.includes('imageViewer.cancel(); cancelZoomLoad()'));
  assert.match(css,/\.image-dialog \.zoom-view\{[^}]*touch-action:none/);
  assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/);
  assert.ok(html.includes('Zwei Finger'));
});

(function (root) {
  'use strict';
  function create({view, image, stage, label, zoomIn, zoomOut}) {
    let zoom = 100, gesture = null;
    const pointers = new Map();
    function point(event) {
      const rect = view.getBoundingClientRect();
      return {x:event.clientX - rect.left - view.clientLeft, y:event.clientY - rect.top - view.clientTop};
    }
    function anchorAt(x = view.clientWidth / 2, y = view.clientHeight / 2) {
      const width = image.clientWidth, height = image.clientHeight;
      return {x,y,
        u:width ? (view.scrollLeft + x - Math.max(0,(stage.clientWidth - width) / 2)) / width : .5,
        v:height ? (view.scrollTop + y - Math.max(0,(stage.clientHeight - height) / 2)) / height : .5};
    }
    function applyZoom(next, anchor = anchorAt()) {
      zoom = Math.max(100,Math.min(300,next));
      label.textContent = Math.round(zoom) + ' %';
      zoomOut.disabled = zoom <= 100; zoomIn.disabled = zoom >= 300;
      view.classList.toggle('is-zoomed',zoom > 100);
      if (image.naturalWidth && image.naturalHeight && view.clientWidth && view.clientHeight) {
        const fit = Math.min(view.clientWidth / image.naturalWidth,view.clientHeight / image.naturalHeight);
        const width = image.naturalWidth * fit * zoom / 100, height = image.naturalHeight * fit * zoom / 100;
        const stageWidth = Math.max(width,view.clientWidth), stageHeight = Math.max(height,view.clientHeight);
        image.style.width = width + 'px'; image.style.height = height + 'px';
        stage.style.width = stageWidth + 'px'; stage.style.height = stageHeight + 'px';
        view.scrollLeft = Math.max(0,Math.min(stageWidth-view.clientWidth,(stageWidth-width)/2 + anchor.u*width - anchor.x));
        view.scrollTop = Math.max(0,Math.min(stageHeight-view.clientHeight,(stageHeight-height)/2 + anchor.v*height - anchor.y));
      } else {
        image.style.width = image.style.height = stage.style.width = stage.style.height = '100%';
      }
    }
    function pair() {
      const [a,b] = [...pointers.values()];
      return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)};
    }
    function rebase() {
      if (pointers.size >= 2) {
        const {x,y,distance} = pair();
        gesture = {kind:'pinch',distance,zoom,anchor:anchorAt(x,y)};
      } else if (pointers.size === 1) {
        const [start] = pointers.values();
        gesture = {kind:'pan',...start,left:view.scrollLeft,top:view.scrollTop};
      } else gesture = null;
      view.classList.toggle('is-panning',Boolean(gesture) && zoom > 100);
    }
    function down(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      // Remember the first finger even at 100%: the next one can start a pinch.
      pointers.set(event.pointerId,point(event));
      try { view.setPointerCapture(event.pointerId); } catch { /* Capture can be lost when a dialog closes. */ }
      rebase(); event.preventDefault();
    }
    function move(event) {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId,point(event));
      if (gesture?.kind === 'pinch') {
        const {x,y,distance} = pair();
        if (gesture.distance < 1) { rebase(); return; }
        // Keep the same image detail under the moving midpoint of both fingers.
        applyZoom(gesture.zoom * distance / gesture.distance,{...gesture.anchor,x,y});
      } else if (gesture?.kind === 'pan') {
        const current = pointers.get(event.pointerId);
        view.scrollLeft = gesture.left + gesture.x - current.x;
        view.scrollTop = gesture.top + gesture.y - current.y;
      }
      view.classList.toggle('is-panning',zoom > 100); event.preventDefault();
    }
    function end(event) {
      if (!pointers.delete(event.pointerId)) return;
      // Re-anchor remaining fingers so lifting one never jumps the image.
      rebase();
    }
    function cancel() {
      const captured = [...pointers.keys()];
      pointers.clear(); gesture = null; view.classList.remove('is-panning');
      for (const id of captured) {
        try { view.releasePointerCapture(id); } catch { /* The browser may have released it already. */ }
      }
    }
    function layout() { applyZoom(zoom); rebase(); }
    function reset() {
      cancel(); applyZoom(100,{u:.5,v:.5,x:view.clientWidth/2,y:view.clientHeight/2});
    }
    view.addEventListener('pointerdown',down);
    view.addEventListener('pointermove',move);
    for (const type of ['pointerup','pointercancel','lostpointercapture']) view.addEventListener(type,end);
    zoomOut.onclick = () => { cancel(); applyZoom(zoom-25); };
    zoomIn.onclick = () => { cancel(); applyZoom(zoom+25); };
    reset();
    return {layout,reset,cancel,get zoom() { return zoom; }};
  }
  const api = {create};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KunstTresorZoom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

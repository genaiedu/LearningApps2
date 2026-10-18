/* Viewport fallback for browsers that cannot fullscreen an embedded reader.
   Popover's top layer keeps the SAME iframe above sticky navigation, without
   reparenting/reloading it or losing the current page. */
(()=>{'use strict';const states=new WeakMap();
 function toggle(host,expandedClass,bodyClass,notify){
  const old=states.get(host);if(old){old.close();return false;}
  const inert=[],focused=document.activeElement;
  for(let node=host;node.parentElement;node=node.parentElement)for(const sibling of node.parentElement.children){if(sibling!==node&&!sibling.hasAttribute('inert')){sibling.setAttribute('inert','');inert.push(sibling);}}
  host.classList.add(expandedClass);document.body.classList.add(bodyClass);
  if(host.showPopover){host.setAttribute('popover','manual');try{host.showPopover();}catch(_){host.removeAttribute('popover');}}
  const close=()=>{if(!states.has(host))return;states.delete(host);document.removeEventListener('keydown',escape);if(host.hasAttribute('popover')){try{host.hidePopover();}catch(_){}host.removeAttribute('popover');}host.classList.remove(expandedClass);document.body.classList.remove(bodyClass);for(const node of inert)node.removeAttribute('inert');notify(false);if(focused?.isConnected)focused.focus?.({preventScroll:true});};
  const escape=event=>{if(event.key==='Escape'){event.preventDefault();close();}};
  states.set(host,{close});document.addEventListener('keydown',escape);notify(true);return true;
 }
 window.TypoReaderOverlay={toggle};
})();

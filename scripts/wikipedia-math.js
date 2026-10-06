/* Preserve Wikipedia's native MathML without scripts, styles or TeX annotations.
 * MathML is rendered locally by the browser; no remote typesetting service.
 */
(function(){
  'use strict';const ns='http://www.w3.org/1998/Math/MathML',prepared=new WeakSet();
  const tags=new Set('math semantics mrow mi mn mo mtext mfrac msqrt mroot msub msup msubsup munder mover munderover mtable mtr mtd mstyle mpadded mspace menclose mmultiscripts mprescripts none'.split(' '));
  const attrs=new Set('display mathvariant stretchy fence separator largeop movablelimits accent accentunder columnalign rowalign columnspacing rowspacing linethickness width height depth voffset lspace rspace notation'.split(' '));
  function clone(node,doc){
    if(node.nodeType===3)return doc.createTextNode(node.textContent);if(node.nodeType!==1||!tags.has(node.localName))return null;
    const out=doc.createElementNS(ns,node.localName);prepared.add(out);
    for(const a of node.attributes)if(attrs.has(a.name)&&/^[a-zA-Z0-9 .,+\-]*$/.test(a.value))out.setAttribute(a.name,a.value);
    for(const child of node.childNodes){const safe=clone(child,doc);if(safe)out.append(safe);}return out;
  }
  function prepare(body){
    for(const math of [...body.querySelectorAll('math')]){
      if(!body.contains(math))continue;const safe=clone(math,body.ownerDocument);if(!safe||!safe.querySelector('mi,mn,mo,mtext'))continue;
      const wrapper=body.ownerDocument.createElement('span');wrapper.className='wiki-math'+(math.getAttribute('display')==='block'?' wiki-math-block':'');prepared.add(wrapper);wrapper.append(safe);
      // Replace the WHOLE math container: Wikipedia also supplies a hidden
      // accessibility representation and an SVG image of the same formula.
      const group=math.closest('.mwe-math-element')||math.closest('.mwe-math-mathml-a11y')||math;group.replaceWith(wrapper);
    }
    body.querySelectorAll('annotation,annotation-xml').forEach(el=>el.remove());
  }
  window.WikiMath={prepare,isPrepared:node=>prepared.has(node)};
})();

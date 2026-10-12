/* Latin indices in prose, without changing identifiers or TeX source. */
(()=>{
  'use strict';
  const normalize=text=>String(text).replace(/Kₛ/g,'K_S').replace(/Kᵦ/g,'K_B').replace(/\b(p?K)([sbw])\b/g,(_,k,s)=>k+'_'+s.toUpperCase()).replace(/\b(p?K)_([sbw])\b/g,(_,k,s)=>k+'_'+s.toUpperCase());
  function decorate(root){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      if(node.parentElement?.closest('script,style,svg,mjx-container,math,textarea,input,option,select,code'))continue;
      const parts=node.data.split(/(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g),fragment=document.createDocumentFragment();let changed=false;
      for(const part of parts){
        if(/^\\[([]/.test(part)){fragment.append(document.createTextNode(part));continue;}
        const text=normalize(part),pattern=/\b(p?K)_([SBW])([₁₂₃123]?)|\b([cVn])_([\p{L}\p{N},]+)/gu;let start=0,match;
        while((match=pattern.exec(text))){changed=true;fragment.append(document.createTextNode(text.slice(start,match.index)+(match[1]||match[4])));const sub=document.createElement('sub');sub.textContent=match[1]?match[2]+match[3].replace(/[₁₂₃]/g,c=>({'₁':'1','₂':'2','₃':'3'}[c])):match[5];fragment.append(sub);start=pattern.lastIndex;}
        fragment.append(document.createTextNode(text.slice(start)));if(text!==part)changed=true;
      }
      if(changed)node.replaceWith(fragment);
    }
  }
  function text(node,value){node.textContent=normalize(value);if(node.tagName==='OPTION')node.textContent=node.textContent.replace(/K_([SBW])/g,'K$1');else decorate(node);}
  window.AcidNotation={normalize,decorate,text};
})();

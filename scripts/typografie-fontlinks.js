(function(root){
  'use strict';
  const url=name=>'https://fonts.google.com/specimen/'+String(name).trim().split(/\s+/).map(encodeURIComponent).join('+')+'?preview.script=Latn';
  function link(anchor,name,label='Download bei Google Fonts ↗'){
    anchor.href=url(name);anchor.target='_blank';anchor.rel='noopener noreferrer';
    anchor.dataset.googleFont=name;anchor.removeAttribute('download');anchor.textContent=label;
    return anchor;
  }
  if(typeof module==='object'&&module.exports){module.exports={url};return;}
  root.TypoFontLinks={url,link};
  const dialog=document.getElementById('font-external-dialog');
  if(!dialog)return;
  const open=document.getElementById('font-external-open');
  let acknowledged=false,pending=null;
  document.addEventListener('click',event=>{
    const anchor=event.target.closest('a[data-google-font]');
    if(!anchor||acknowledged)return;
    event.preventDefault();pending=anchor.href;open.href=pending;
    document.getElementById('font-external-name').textContent=anchor.dataset.googleFont||'Schriftübersicht';
    dialog.showModal();
  });
  open.addEventListener('click',event=>{
    if(!pending){event.preventDefault();return;}
    acknowledged=true;pending=null;dialog.close();
    // Keep the native link action: keyboard and mouse both open the new tab.
  });
  document.getElementById('font-external-cancel').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{pending=null;});
})(typeof globalThis!=='undefined'?globalThis:this);

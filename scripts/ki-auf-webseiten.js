(()=>{
  'use strict';
  const core=window.KIWebLesson,q=selector=>document.querySelector(selector);
  if(!core)return;
  let scenario='solved',index=0;
  const names={browser:'Browser',server:'Vercel',model:'Groq',image:'Cloudflare'};
  function render(){
    const step=core.at(scenario,index);index=step.index;
    q('#journey-counter').textContent='Schritt '+(index+1)+' von '+step.total;
    q('#journey-title').textContent=step.title;q('#journey-text').textContent=step.text;
    q('#journey-data').textContent=step.data;q('#journey-key').textContent=step.key;
    q('#journey-example').textContent=step.example||'';q('#journey-result').hidden=!step.example;
    q('#journey-back').disabled=index===0;q('#journey-next').disabled=index===step.total-1;
    const seen=core.stages(scenario).slice(0,index+1).map(item=>item.node);
    const hasImage=core.stages(scenario).some(item=>item.node==='image');
    q('.journey-stations').classList.toggle('has-image',hasImage);
    document.querySelectorAll('[data-journey-node]').forEach(node=>{
      const id=node.dataset.journeyNode;
      node.hidden=id==='image'&&!hasImage;
      if(id===step.node)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');
      node.querySelector('.node-state').textContent=id===step.node?'Jetzt: '+names[id]:seen.includes(id)?'Bereits beteiligt':'Noch nicht beteiligt';
    });
  }
  q('#journey-case').addEventListener('change',event=>{scenario=event.target.value;index=0;render();});
  q('#journey-next').addEventListener('click',()=>{index++;render();});
  q('#journey-back').addEventListener('click',()=>{index--;render();});
  q('#journey-reset').addEventListener('click',()=>{index=0;render();});
  document.querySelectorAll('[data-question]').forEach(form=>{
    const feedback=form.querySelector('.check-feedback');
    form.addEventListener('submit',event=>{event.preventDefault();const result=core.check(form.dataset.question,form.querySelector('input:checked')?.value);feedback.textContent=result.text;feedback.dataset.correct=String(result.correct);});
    form.addEventListener('change',()=>{feedback.textContent='';delete feedback.dataset.correct;});
  });
  const menu=q('#chapter-menu');
  menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{menu.open=false;}));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}});
  document.addEventListener('click',event=>{if(menu.open&&!menu.contains(event.target))menu.open=false;});
  render();
})();

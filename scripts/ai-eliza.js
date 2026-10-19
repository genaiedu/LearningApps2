(() => {
 'use strict';
 const $=id=>document.getElementById(id),terminal=$('ai-terminal'),intro=$('introduction'),screen=$('ai-screen'),transcript=$('ai-transcript');
 const input=$('ai-message'),form=$('ai-form'),start=$('start-ai-eliza'),consent=$('ai-consent');
 let active=false,opening=false,history=[],controller=null,epoch=0,pendingRow=null,failedRow=null,follow=true;
 const status=text=>{$('ai-launch-status').textContent=text;};
 function consentState(){start.disabled=!consent.checked;}
 consent.addEventListener('change',consentState);consentState();
 function scroll(force=false){if(force||follow)screen.scrollTop=screen.scrollHeight;}
 screen.addEventListener('scroll',()=>{follow=screen.scrollHeight-screen.clientHeight-screen.scrollTop<80;},{passive:true});
 function resize(){input.style.height='auto';input.style.height=input.scrollHeight+'px';}
 function busy(value){$('ai-send').disabled=value;input.disabled=value;$('ai-stop').hidden=!value;form.setAttribute('aria-busy',String(value));}
 function element(kind,text){const el=document.createElement('div');el.className='ai-turn '+kind;if(text)el.textContent=text;transcript.append(el);return el;}
 function welcome(){
  transcript.replaceChildren();const el=document.createElement('div');el.className='ai-welcome';
  const heading=document.createElement('h2');heading.textContent='Was möchtest du ansprechen?';
  const p=document.createElement('p');p.textContent='Du entscheidest, worüber du schreiben möchtest. AI‑ELIZA ist ein Sprachmodell, kein Mensch und keine Therapie. Verwende bitte erfundene oder anonymisierte Situationen.';
  el.append(heading,p);transcript.append(el);
 }
 function render(answer){
  const el=element('assistant');
  if(answer.personal_opening){const first=document.createElement('p');first.className='personal-opening';first.textContent=answer.personal_opening;el.append(first);}
  const body=document.createElement('p');body.textContent=answer.body;el.append(body);scroll();
 }
 function cancel(){epoch++;controller?.abort();controller=null;pendingRow?.remove();pendingRow=null;busy(false);}
 function discard(){
  active=false;opening=false;cancel();history=[];failedRow=null;input.value='';transcript.replaceChildren();$('ai-error').textContent='';
  terminal.hidden=true;intro.inert=false;document.body.classList.remove('ai-eliza-running');consent.checked=false;consentState();
  consent.focus({preventScroll:true});
 }
 async function end(){
  if(!active&&!opening)return;
  discard();if(document.fullscreenElement===terminal){try{await document.exitFullscreen();}catch{}}
  status('KI-Gespräch beendet. Der lokale Verlauf wurde verworfen; bereits übertragene Daten werden dadurch nicht zurückgeholt.');
 }
 start.addEventListener('click',async()=>{
  if(!consent.checked||active||opening)return;
  status('');
  if(!terminal.requestFullscreen||!document.fullscreenEnabled){status('Dieser Browser erlaubt hier keinen echten Vollbildmodus. Bitte öffne die veröffentlichte Seite direkt in einem Browser mit Vollbildunterstützung.');return;}
  opening=true;terminal.hidden=false;
  try{
   await terminal.requestFullscreen();if(document.fullscreenElement!==terminal)throw Error();
   opening=false;active=true;epoch++;history=[];failedRow=null;follow=true;input.value='';$('ai-error').textContent='';
   intro.inert=true;document.body.classList.add('ai-eliza-running');welcome();busy(false);resize();screen.scrollTop=0;input.focus({preventScroll:true});
  }catch{discard();status('Der Vollbildstart wurde nicht erlaubt. Bitte erteile die Freigabe erneut und versuche den Vollbildstart noch einmal.');}
 });
 document.addEventListener('fullscreenchange',()=>{if(active&&document.fullscreenElement!==terminal){discard();status('Vollbild beendet. Der lokale KI-Verlauf wurde verworfen.');}});
 document.addEventListener('keydown',event=>{if(active&&event.key==='Escape'&&!event.isComposing){event.preventDefault();end();}});
 $('ai-end').addEventListener('click',end);
 $('ai-stop').addEventListener('click',()=>{cancel();$('ai-error').textContent='Warten abgebrochen. Eine bereits gestartete Verarbeitung beim Anbieter kann dadurch nicht sicher gestoppt werden. Du kannst deine Nachricht erneut senden.';input.focus({preventScroll:true});});
 input.addEventListener('input',()=>{resize();});
 input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();form.requestSubmit();}});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!active||controller||!consent.checked||document.fullscreenElement!==terminal)return;
  const text=input.value.trim();if(!text||text.length>2400)return;
  follow=true;$('ai-error').textContent='';
  if(failedRow){failedRow.textContent=text;}else{failedRow=element('user',text);}
  pendingRow=element('waiting','Antwort wird formuliert');scroll(true);busy(true);
  const requestEpoch=++epoch,request=new AbortController();controller=request;
  let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;request.abort();},32000);
  try{
   const response=await fetch(AIElizaCore.endpoint,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/json'},signal:request.signal,body:JSON.stringify({messages:AIElizaCore.context(history,text)})});
   const raw=await response.text();if(raw.length>16000)throw Error('invalid');
   let value;try{value=JSON.parse(raw);}catch{value={};}
   if(!response.ok){const error=new Error('http');error.status=response.status;error.code=value.error;throw error;}
   const answer=AIElizaCore.parse(value);
   if(!active||epoch!==requestEpoch)return;
   pendingRow.remove();pendingRow=null;failedRow=null;render(answer);
   history.push({role:'user',content:text},{role:'assistant',content:AIElizaCore.plain(answer)});history=history.slice(-16);
   input.value='';resize();
  }catch(error){
   if(!active||epoch!==requestEpoch)return;
   pendingRow?.remove();pendingRow=null;
   $('ai-error').textContent=AIElizaCore.message(error.status,timedOut?'timeout':error.code);
  }finally{
   clearTimeout(timeout);
   if(active&&epoch===requestEpoch){controller=null;busy(false);input.focus({preventScroll:true});scroll();}
  }
 });
 addEventListener('pagehide',()=>{if(active||opening)discard();});
 addEventListener('resize',()=>{if(active){resize();scroll();}});
 window.visualViewport?.addEventListener('resize',()=>{if(active)scroll();});
})();

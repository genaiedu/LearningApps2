/* Introduce the experiment without replacing or duplicating its working lab. */
(()=>{
  'use strict';
  const template=document.getElementById('acid-titration-primer-template'),full=document.getElementById('titration');
  if(!template||!full)return;
  const fullHost=document.createElement('div');fullHost.dataset.titrationPrimer='';
  full.querySelector('.two').before(fullHost);
  const descriptions={
    ready:'Die Säureprobe ist mit Phenolphthalein zunächst farblos. Der Hahn ist geschlossen.',
    adding:'Der Hahn ist offen: Maßlösung fließt in die Probe. Ihre OH⁻-Ionen werden durch die Säure verbraucht. Gut mischen; nahe dem Umschlag kleine Portionen wählen.',
    endpoint:'Der Hahn ist wieder geschlossen. Eine schwache, nach dem Mischen bleibende Rosafärbung zeigt hier den Endpunkt. Jetzt den Bürettenstand und daraus den Verbrauch bestimmen.'
  };
  for(const host of document.querySelectorAll('[data-titration-primer]')){
    host.append(template.content.cloneNode(true));const primer=host.querySelector('.titration-primer');
    primer.addEventListener('click',event=>{
      const phase=event.target.closest('[data-primer-phase]');
      if(phase){
        primer.dataset.phase=phase.dataset.primerPhase;
        primer.querySelector('.primer-flask-fill').setAttribute('d',{
          ready:'M61 290H139L153 312H47Z',adding:'M69 281H131L153 312H47Z',endpoint:'M76 273H124L153 312H47Z'
        }[phase.dataset.primerPhase]);
        primer.querySelector('.primer-scene-status').textContent=descriptions[phase.dataset.primerPhase];
        for(const button of primer.querySelectorAll('[data-primer-phase]'))button.setAttribute('aria-pressed',String(button===phase));
      }
      if(event.target.closest('[data-titration-start]')){
        const lab=document.getElementById('titration-lab'),details=lab.closest('details');if(details)details.open=true;
        // A deliberate start control resets only the selected virtual experiment.
        // Moving between page modes never starts a new experiment implicitly.
        lab.querySelector('[data-practical="hcl"]').click();
        document.getElementById('tit-indicator').value='phenolphthalein';
        document.getElementById('tit-indicator').dispatchEvent(new Event('change',{bubbles:true}));
        const anchor=document.body.dataset.learningMode==='simple'?'simple-titrationsversuch':'titration-lab';
        history.replaceState(null,'','#'+anchor);lab.scrollIntoView({block:'start',behavior:'instant'});
        const heading=lab.querySelector('h3');heading.tabIndex=-1;heading.focus({preventScroll:true});
      }
    });
    window.AcidNotation?.decorate(primer);window.AcidTypeset?.typeset([primer]);
  }
})();

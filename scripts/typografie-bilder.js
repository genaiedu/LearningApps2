(function(){
  'use strict';
  const G=window.TypoImages,$=id=>document.getElementById(id);
  if(!G||!$('image-viewport'))return;
  for(const slot of document.querySelectorAll('[data-image-study]'))slot.innerHTML=G.markup(slot.dataset.imageStudy);
  const dialog=$('image-study-dialog');
  for(const button of document.querySelectorAll('[data-enlarge-image-study]'))button.addEventListener('click',()=>{
    const s=G.find(button.dataset.enlargeImageStudy);
    $('image-study-title').textContent=s.title;
    $('image-study-note').textContent=s.note;
    $('image-study-proof').innerHTML=G.markup(s.id);
    $('image-study-download').href='downloads/typografie/bildstudien/'+s.id+'.html';
    dialog.showModal();
  });
  $('image-study-close').addEventListener('click',()=>dialog.close());
  function crop(){
    const o=G.crop({width:$('image-width').value,fit:$('image-fit').value,position:$('image-position').value});
    $('image-viewport').style.width=o.width+'px';
    $('responsive-image').style.objectFit=o.fit;
    $('responsive-image').style.objectPosition=o.position+' center';
    $('image-position').disabled=o.fit==='contain';
    $('image-lab-status').textContent=o.fit==='contain'?'Das ganze Motiv bleibt sichtbar; freie Fläche gehört zur Einpassung.':'Das Feld wird gefüllt. Je nach Format werden Bildteile abgeschnitten. Der Fokus verschiebt den Ausschnitt.';
  }
  for(const id of ['image-width','image-fit','image-position'])$(id).addEventListener('change',crop);
  $('image-reset').addEventListener('click',()=>{$('image-width').value='1000';$('image-fit').value='contain';$('image-position').value='center';crop();});crop();
  const heroNotes={new:'Der neue Auftakt: Die drei Blätter machen die drei Teile sichtbar. Auf schmalen Flächen steht das Motiv unter der Einleitung. Die Bewegung ist nur Dekoration.',previous:'Der bisherige Auftakt: Der Buchstabe selbst ist das grafische Motiv. Das Raster und die große Schriftprobe geben dem Text einen typografischen Kontext.',image:'Die bildbetonte Variante: Ein Bild schafft Atmosphäre, eine deckende Fläche sichert den Kontrast. Bei einem schmalen Format verändert sich der Bildausschnitt.'};
  function hero(){
    const kind=$('hero-study').value,proof=$('hero-example-proof');
    proof.style.width=G.crop({width:$('hero-width').value}).width+'px';
    let fragment;
    if(kind==='previous'||kind==='image')fragment=$(kind==='previous'?'previous-hero-template':'image-hero-template').content.cloneNode(true);
    else{
      fragment=$('start').cloneNode(true);
      const heading=fragment.querySelector('h1'),replacement=document.createElement('h3');
      replacement.className=heading.className;replacement.innerHTML=heading.innerHTML;heading.replaceWith(replacement);
      fragment.removeAttribute('id');fragment.removeAttribute('aria-labelledby');fragment.setAttribute('aria-label','Der neue Hero als Gestaltungsbeispiel');
      for(const n of fragment.querySelectorAll('[id]'))n.removeAttribute('id');
    }
    proof.replaceChildren(fragment);
    for(const glyph of proof.querySelectorAll('[data-hero-letter]'))glyph.style.fontFamily=$('hero-letter').style.fontFamily||'"EB Garamond"';
    for(const label of proof.querySelectorAll('[data-hero-font]'))label.textContent=$('hero-font').textContent;
    $('hero-study-note').textContent=heroNotes[kind]||heroNotes.new;
    window.lucide?.createIcons({attrs:{'aria-hidden':'true','focusable':'false'}});
  }
  $('hero-study').addEventListener('change',hero);$('hero-width').addEventListener('change',hero);hero();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let requested=false;
  function motion(){
    const globallyPaused=document.body.classList.contains('motion-paused'),moving=requested&&!reduced.matches&&!globallyPaused;
    $('animation-canvas').dataset.moving=String(moving);
    $('image-motion-toggle').disabled=reduced.matches;
    $('image-motion-toggle').setAttribute('aria-pressed',String(requested&&!reduced.matches));
    $('image-motion-toggle').textContent=requested?'Beispielanimation anhalten':'Beispielanimation starten';
    $('image-motion-status').textContent=reduced.matches?'Bewegung reduzieren ist im System eingeschaltet. Das Beispiel bleibt als Standbild erhalten.':globallyPaused?'Der globale Animationsschalter oben pausiert auch dieses Beispiel.':moving?'Der Punkt bewegt sich. Alle Stationen bleiben unabhängig davon lesbar.':'Das Beispiel ist angehalten.';
  }
  $('image-motion-toggle').addEventListener('click',()=>{requested=!requested;motion();});
  addEventListener('typography-motion-change',motion);reduced.addEventListener('change',()=>{if(reduced.matches)requested=false;motion();});motion();
})();

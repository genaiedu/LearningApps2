(function(){
  'use strict';
  const $=id=>document.getElementById(id),proofs=$('grauwert-proofs');
  if(!proofs)return;
  const read=$('grauwert-read'),distance=$('grauwert-distance');
  function setView(distant){
    proofs.classList.toggle('is-distance',distant);
    read.setAttribute('aria-pressed',String(!distant));
    distance.setAttribute('aria-pressed',String(distant));
    $('grauwert-view-note').textContent=distant?
      'Blick auf die Textfläche: Die leichte Unschärfe lässt helle Löcher und dunkle Verdichtungen hervortreten. Schriftfarbe und Schriftgröße bleiben unverändert. Zum Entziffern wieder „Lesen“ wählen.':
      'Lies beide Proben. Schriftart, Schriftgrad und Schriftfarbe sind gleich; links sind Wortabstände und Fettungen absichtlich gestört.';
  }
  read.addEventListener('click',()=>setView(false));
  distance.addEventListener('click',()=>setView(true));
  $('grauwert-controls').hidden=false;
  function bookNote(){
    $('book-grauwert-note').textContent=$('book-headings').value==='loud'?
      'Zu viele Auszeichnungen: Die wechselnden Überschriften und die nun fett gesetzten Textstellen bilden dunkle Flecken. Kehre zum zurückhaltenden Satz zurück und vergleiche die Ruhe im Lesetext.':
      'Zurückhaltender Buchsatz: Der Lesetext bleibt gleichmäßig. Überschriften, Fußnote und Seitenzahl haben eigene, klar erkennbare Aufgaben.';
  }
  $('book-headings').addEventListener('input',bookNote);
  $('book-headings').addEventListener('change',bookNote);
  $('book-reset').addEventListener('click',bookNote);
  bookNote();
})();

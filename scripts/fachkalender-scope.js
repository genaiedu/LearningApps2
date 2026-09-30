(function(){
'use strict';
let dialog;
function ask(){
 if(!dialog){
  dialog=document.createElement('dialog');dialog.setAttribute('aria-labelledby','planning-scope-heading');
  dialog.innerHTML='<h2 id="planning-scope-heading">Wie soll neu berechnet werden?</h2><p><strong>Nur verbleibende Unterrichtszeit:</strong> Bereits erteilte Stunden bleiben erhalten. Begonnene und abgeschlossene Vorhaben behalten ihre Position; nur noch nicht begonnene Vorhaben lassen sich verschieben.</p><p><strong>Gesamtes Schuljahr:</strong> Alle Vorhaben werden vom Schuljahresbeginn an neu verteilt, auch bereits begonnene oder abgeschlossene.</p><form method="dialog"><div class="actions"><button class="primary" value="remaining">Nur verbleibende Unterrichtszeit</button><button value="year">Gesamtes Schuljahr neu berechnen</button><button value="cancel">Abbrechen</button></div></form>';
  document.body.append(dialog);
  dialog.addEventListener('cancel',()=>{dialog.returnValue='cancel'});
 }
 if(dialog.open)return Promise.resolve(null);
 return new Promise(resolve=>{
  dialog.returnValue='cancel';dialog.addEventListener('close',()=>resolve(['year','remaining'].includes(dialog.returnValue)?dialog.returnValue:null),{once:true});
  dialog.showModal();
 });
}
window.FachkalenderScope={ask};
})();

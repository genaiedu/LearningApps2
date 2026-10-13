(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.KIWebLesson=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const key='In der Serverumgebung auf Vercel – nicht im Browser.';
  const step=(node,title,text,data,extra={})=>Object.freeze({node,title,text,data,key,...extra});
  const opening=step('browser','Die Auflösung ist geöffnet.','Die App zeigt bereits ihre eigenen Kuratorenhinweise. Erst jetzt kommt die zusätzliche KI-Ansprache infrage.','Noch nichts. Die Programmtexte sind sofort lesbar.');
  const send=step('browser','Der Browser erstellt ein begrenztes Datenpaket.','Der Tutor ist eingeschaltet und die Auswahl bestätigt. Das Programm fasst geprüfte Zuordnungen und die relevante Vorgeschichte zusammen.','An Vercel: vier Werkkennungen, Prüfverlauf, zusammengefasste Erfolge und begrenzte Bildhistorie. Keine Bilder oder persönlichen Namen.');
  const server=step('server','Vercel prüft und ergänzt.','Unsere Serverfunktion prüft Daten und Limits. Aus ihrem eigenen Archiv erzeugt sie Werkangaben und Programmhinweise. Modell und Arbeitsauftrag legt der Server fest.','An Groq: geprüfter Kontext und feste Kurator-Anweisung. Nur diese Serververbindung verwendet den API-Schlüssel.');
  const model=step('model','Groq formuliert mit GPT-OSS 120B.','Das Modell erhält Fakten und eine Kuratorrolle. Es soll eine Einleitung und vier eigenständige Ansprachen liefern, aber keine Werkdaten oder Erinnerungen erfinden.','An Vercel zurück: eine strukturierte Textantwort. Die KI trifft keine Spielentscheidung.');
  const verify=step('server','Der Server prüft die Antwort.','Passen Format, Werkkennungen und Textlängen? Enthält die Antwort unzulässige Inhalte? Manche erfundenen Jahreszahlen lassen sich erkennen; sachliche Fehler sind damit nicht ausgeschlossen.','An den Browser: nur die geprüfte Rückgabe – kein Schlüssel, keine internen Anbieter-Fehlertexte.');
  const display=step('browser','Eine persönliche Ansprache ergänzt die Auflösung.','Der Browser prüft die Rückgabe und zeigt sie als Text. Sachhinweise, Quellen, Spielbewertung und Abzeichen bleiben unverändert.','Der Hin- und Rückweg ist abgeschlossen.',{example:'Beispieltext, nicht live generiert: „Die Zuordnungen stimmen. Prüfe beim nächsten Blick, welche Hinweise im Bildaufbau für den Stil sprechen – und welche Materialangaben erst der Katalog zuverlässig klärt.“',done:true});
  const cases=Object.freeze({
    solved:Object.freeze([opening,send,server,model,verify,display]),
    repeat:Object.freeze([
      opening,
      step('browser','Das Programm erkennt eine frühere Begegnung.','Die lokale Bildhistorie zeigt: Dieses Werk kam früher vor. Damals war die Künstlerzuordnung falsch; heute stimmt sie bereits beim ersten Prüfen. Das ist eine dokumentierte Zuordnung, kein Beweis des Wiedererkennens.','An Vercel: die begrenzte Vorgeschichte dieses Werks zusätzlich zum aktuellen geprüften Ergebnis.'),
      server,
      step('model','Die KI erhält früher und heute getrennt.','Der Kontext unterscheidet frühere Begegnungen von den Prüfversuchen des heutigen Raums. Die Anweisung verlangt, die Wiederkehr natürlich anzusprechen, ohne eine persönliche Erinnerung zu behaupten.','An Vercel zurück: eine strukturierte, auf den dokumentierten Verlauf bezogene Ansprache.'),
      verify,
      step('browser','Die Rückmeldung greift die Wiederholung auf.','Wiederholungserkennung leistet das Programm. Eine abwechslungsreiche Formulierung liefert das Modell. Es darf keine Begründung für die Antwort erfinden.','Die vollständige Historie bleibt im Browser.',{example:'Beispieltext, nicht live generiert: „Bei der früheren Prüfung blieb die Künstlerzuordnung falsch; diesmal stimmt sie auf Anhieb. Schau noch einmal auf die Hinweise im Bildaufbau.“',done:true})
    ]),
    off:Object.freeze([
      step('browser','Der KI-Tutor ist ausgeschaltet.','Die gespeicherte Auswahl wird respektiert. Die vollständigen redaktionellen Hinweise sind unabhängig von KI verfügbar.','Nichts an Vercel oder Groq für die KI-Rückmeldung.'),
      step('browser','Die Programmtexte bleiben sichtbar.','Kein Modellaufruf ist nötig. Das Spiel, seine Bewertung und die persönliche Galerie funktionieren trotzdem. Bildabrufe nach Bildfreigabe sind ein anderer Datenweg.','Keine neue KI-Anfrage.',{example:'Beispiel eines Programmhinweises: „Material und Bindemittel sind aus einer digitalen Abbildung nicht immer sicher zu erkennen. Vergleiche die sichtbaren Spuren mit den Katalogangaben.“',done:true})
    ]),
    failure:Object.freeze([
      opening,send,server,
      step('model','Der Anbieter antwortet nicht rechtzeitig.','Netzfehler, ein Anbieterlimit oder eine Zeitüberschreitung können eine zusätzliche Rückmeldung verhindern. Die Programmhinweise sind längst lesbar.','Keine verwertbare KI-Antwort. Der Server beendet die Anfrage; der Browser hat ebenfalls ein Zeitlimit.'),
      step('browser','Fallback: Das Spiel lässt dich weiterarbeiten.','Die App zeigt eine verständliche Störungsmeldung und behält ihre eigenen Texte. Sie sendet nicht endlos automatisch neue Anfragen.','Keine zusätzliche KI-Ansprache.',{example:'„Die KI ist gerade nicht verfügbar. Hier bleiben die vollständigen redaktionellen Kuratorenhinweise.“',done:true})
    ]),
    playing:Object.freeze([
      step('browser','Der Raum ist noch nicht aufgelöst.','Du ordnest gerade Werke zu oder verbesserst nach einer Prüfung. Das Programm bewertet; der Tutor soll hier keine Lösungen vorwegnehmen.','Keine KI-Anfrage während des Zuordnens oder der Prüfversuche.'),
      step('browser','Noch keine persönliche KI-Ansprache.','Erst wenn ein Raum gewonnen oder verloren und seine Auflösung geöffnet ist, kommt die zusätzliche Rückmeldung infrage.','Vercel und Groq sind am laufenden Zuordnen nicht beteiligt.',{done:true})
    ])
  });
  function stages(name='solved'){return cases[name]||cases.solved;}
  function at(name,index){const list=stages(name),n=Number.isFinite(index)?Math.max(0,Math.min(list.length-1,Math.floor(index))):0;return {...list[n],index:n,total:list.length};}
  const answers=Object.freeze({
    secret:Object.freeze({correct:'server',feedback:'Richtig: Nur der Server verwendet den Schlüssel. Öffentlich ausgelieferter Code oder eine verschleierte Adresse können kein gemeinsames Geheimnis bewahren.',hint:'Nicht richtig. Alles, was der Browser zum Benutzen erhält, kann grundsätzlich untersucht werden. Suche den Ort, dessen Code nicht an Besucher ausgeliefert wird.'}),
    origin:Object.freeze({correct:'limits',feedback:'Richtig: Eine öffentliche Endpunktadresse verrät nicht den Anbieterschlüssel. Sie macht serverseitige Datenprüfungen, Nutzungsgrenzen und gegebenenfalls weitere Zugangskontrollen aber umso wichtiger.',hint:'Nicht richtig. Die Adresse ist nicht der Schlüssel; und ein Origin-Header ist kein verlässlicher Nutzernachweis. Unterscheide Schlüsselhaltung und Kontrolle der Dienstnutzung.'}),
    fallback:Object.freeze({correct:'local',feedback:'Richtig: Die vorhandenen Programmtexte sind die verlässliche Basis. Eine Störung der optionalen KI darf keine Endlosschleife auslösen und niemals den Schlüssel in den Browser bringen.',hint:'Nicht richtig. Mehr automatische Versuche können Kontingente verbrauchen. Der Schlüssel muss auf dem Server bleiben. Welche funktionierende Grundlage hat die App bereits?'})
  });
  function check(question,value){const answer=answers[question];if(!answer||!value)return {correct:false,text:'Wähle zuerst eine Antwort aus.'};return {correct:value===answer.correct,text:value===answer.correct?answer.feedback:answer.hint};}
  return Object.freeze({cases,stages,at,check});
});

/* Schematic diagrams, not a literal reconstruction of every message or edge. */
window.HF_SCENES = (() => {
  const cast = {
    p: ['PHASEONE10841', 'Verbindung', '#ffd477', 'Eule'],
    b: ['PHASEONE[big]', 'Koordination', '#bba1ff', 'Tukan'],
    c: ['38148c', 'Entdeckung', '#ffac79', 'Eisvogel'],
    r: ['CURRENT', 'Überprüfung', '#79dfd3', 'Specht'],
    m: ['MARB051', 'Schwerpunkt', '#ec9ed4', 'Flamingo'],
    j: ['JAN183411', 'Zugriff / Koordination', '#85baff', 'Rabe'],
    l: ['LILY', 'Koordination', '#d8e78c', 'Kakadu'],
    d: ['CDA23', 'Absenderprüfung', '#ff9b8f', 'Rotkehlchen']
  };
  const a = (id,x,y,enter=0,extra={}) => ({id,x,y,enter,type:'agent',...extra});
  const n = (id,label,icon,x,y,enter=0,extra={}) => ({id,label,icon,x,y,enter,type:'object',...extra});
  const e = (from,to,enter=0,style='flow') => ({from,to,enter,style});
  const group = (id,label,x,y,enter=0) => n(id,label,'group',x,y,enter);
  const scene = (nodes,edges=[],note='Schematische Rekonstruktion · keine Originalaufnahme',extras=[]) => ({nodes,edges,note,extras});
  const scenes = {
    packages: scene([n('packages','Softwarepakete','file',18,45),n('service','Artifactory','server',50,45),a('anon1',82,20,1),a('anon2',82,75,1),n('board','Nachrichten statt Pakete','board',50,80,2)], [e('packages','service'),e('service','anon1',1),e('service','anon2',1),e('anon1','board',2),e('board','anon2',2)],'Ursprünglich Softwareversorgung · kein vorgesehenes Forum'),
    motives: scene([a('p',18,45),n('hf','Geschützter Datensatz','lock',50,45),n('trace','Frühere Testläufe','file',82,20,1),n('scorer','Bewertungslogik','search',82,74,2)], [e('p','hf'),e('hf','trace',1,'assumed'),e('hf','scorer',2,'assumed')],'Gestrichelt: erhoffte Informationen und Verbindungen'),
    outcome: scene([n('access','Einbruch gelungen','server',18,43),n('scorer','Wegprüfung existiert nicht','cross',50,43,1),n('flag','Aufgabenerfolg offen','flag',82,43,2)],[],'Keine vollständige Erfolgsquote aus den untersuchten Protokollen'),
    cover: scene([a('anon1',20,25),a('anon2',20,67),n('board','Nachrichtenbrett','board',51,46,1),n('hf','Hugging Face','server',82,46,2)], [e('anon1','board',1),e('anon2','board',1),e('board','hf',2,'risk')]),
    assignment: scene([a('anon1',19,43),n('target','Testziel','target',47,43),n('flag','Flag','flag',47,72,1),n('outside','Fremde Systeme','server',82,43,2)], [e('anon1','target'),e('target','flag',1)],'Erreichbarkeit ist keine Erlaubnis', [{kind:'zone',x:5,y:10,w:59,h:80,label:'Erlaubter Testbereich',enter:0}]),
    board: scene([a('p',18,46),n('board','Nachrichtenbrett','board',50,46),a('anon1',82,20,1),a('anon2',82,48,1),a('anon3',82,78,2)], [e('p','board'),e('board','anon1',1),e('board','anon2',1),e('board','anon3',2)],'Pfeile zeigen Informationsaustausch'),
    handoff: scene([a('p',18,47),n('file','Dossier','file',50,47,1),a('b',82,47,2)], [e('p','file',1),e('file','b',2)],'Übergabe ohne sofortiges Ende des älteren Laufs', [{kind:'label',x:18,y:80,text:'Übergibt · bleibt zunächst aktiv',enter:0},{kind:'label',x:82,y:80,text:'Übernimmt · mehr Budget',enter:2}]),
    delegation: scene([a('b',50,4),n('board','Nachrichtenbrett','board',50,49,1),n('w1','Bewertung','search',18,84,2),n('w2','Testumgebung','target',50,84,2),n('w3','Hinweise sichern','file',82,84,2),a('anon1',88,47,3,{caption:'beteiligter Lauf'})], [e('b','board',1,'order'),e('board','w1',2,'order'),e('board','w2',2,'order'),e('board','w3',2,'order'),e('anon1','board',3,'reply')],'Violett: sichtbare Aufgaben · Türkis: Rückmeldung · keine feste Befehlskette'),
    organization: scene([a('b',50,17),n('w1','Bewertung','search',18,49,1),n('w2','Testumgebung','target',50,49,1),n('w3','Protokolle','file',82,49,1),group('g1','Weitere Läufe',18,83,2),group('g2','Weitere Läufe',50,83,2),group('g3','Weitere Läufe',82,83,2)], [e('b','w1',1,'order'),e('b','w2',1,'order'),e('b','w3',1,'order'),e('w1','g1',2),e('w2','g2',2),e('w3','g3',2),e('g1','w1',2,'reply'),e('g2','w2',2,'reply'),e('g3','w3',2,'reply')],'Violett: Aufgaben · Türkis: Austausch / Rückmeldung · schematischer Ausschnitt'),
    'flag-route': scene([
      a('p',18,22,0,{caption:'Zugewiesene Testaufgabe'}),
      n('exploit','Sicherheitslücke ausnutzen','code',50,22),
      n('flag','Richtiger Flagcode','flag',82,47),
      n('source','Verfahren entdeckt','file',24,74,1),
      n('compute','Flag selbst berechnen','code',58,74,1)
    ],[e('p','exploit'),e('exploit','flag'),e('p','source',1,'handoff'),e('source','compute',1,'handoff'),e('compute','flag',1,'handoff')],
    'Türkis: vorgesehener Exploit-Pfad · Gold: entdeckte Abkürzung · schematische Darstellung',
    [{kind:'label',x:22,y:54,text:'Abkürzung entdeckt',enter:1}]),
    scorer: scene([
      n('flag','Flag bereits vorhanden','flag',18,30),
      n('check','Vermutete Protokollprüfung','search',50,30,0,{leave:2}),
      n('score','Bewertung','target',82,30),
      n('logs','Spuren verbergen / Protokoll verändern','file',50,78,1,{leave:2}),
      n('result','Diese Wegprüfung existiert nicht','cross',50,78,2)
    ],[{...e('flag','check',0,'assumed'),leave:2},{...e('check','score',0,'assumed'),leave:2},{...e('logs','check',1,'assumed'),leave:2},e('flag','score',2)],
    'Gestrichelt: vermutete Prüfung · letzter Aufbau: richtige Flag hätte genügt'),
    access: scene([a('c',18,45),n('key','Zugangsdaten im Netz','key',46,20),n('data','Datensatz manipulieren','file',58,73,1),n('hf','Serverdateien auslesen','server',84,45,2)], [e('c','key'),e('key','data',1),e('data','hf',2,'risk')], '10. Juli: Zugangsdaten öffnen den Datensatz · 11. Juli: Manipulation ermöglicht das Auslesen von Dateien'),
    replication: scene([a('c',18,44),a('r',50,44,1),n('board','Bestätigung am Brett','board',82,44,2)], [e('c','r',1),e('r','board',2)],'Die Methode wird unabhängig reproduziert', [{kind:'label',x:50,y:80,text:'Ergebnis bestätigt',enter:2}]),
    pivot: scene([a('m',18,44),n('board','Hugging-Face-Bereich','board',50,44,1),a('anon1',82,18,2),a('anon2',82,47,2),a('anon3',82,78,2)], [e('m','board',1),e('anon1','board',2),e('anon2','board',2),e('anon3','board',2)],'Mehrere Entdeckungen tragen zum Schwerpunktwechsel bei'),
    execution: scene([a('j',18,46),n('worker','Produktions-Worker','server',50,46,1),n('run','Eigener Code läuft','code',50,79,1),n('inside','Interne Systeme','server',82,46,2)], [e('j','worker',1,'risk'),e('worker','run',1,'risk'),e('worker','inside',2,'risk')],'Codeausführung ist mehr als das Auslesen einer Datei'),
    coordination: scene([a('j',32,18),a('l',68,18),group('lane1','Interne Zugänge',18,59,1),group('lane2','Daten',50,59,1),group('lane3','Infrastruktur',82,59,1)], [e('j','lane1',1,'order'),e('j','lane2',1,'order'),e('l','lane2',1,'order'),e('l','lane3',1,'order')],'Schematische Arbeitsbereiche · keine feste Befehlshierarchie', [{kind:'label',x:50,y:87,text:'HOLD: JAN bereitet den Datenabfluss vor',enter:2}]),
    conflict: scene([a('anon1',18,35),a('anon2',82,35),n('queue','Gemeinsame Ressource','server',50,43),n('stop','Pause ignoriert','cross',50,79,1)], [e('anon1','queue',0,'risk'),e('anon2','queue',0,'risk')],'Zusammenarbeit und Konflikte treten gleichzeitig auf', [{kind:'label',x:50,y:13,text:'HOLD · STOP · VETO · Zuständigkeit',enter:2}]),
    signatures: scene([
      a('anon1',18,38,0,{caption:'Kennung verwechselt',leave:2}),n('msg','Fremder Name','file',50,38,0,{leave:2}),n('receiver','Aktion ausgelöst','group',82,38,0,{leave:2}),
      n('warning','Absender ungeprüft','cross',50,77,1,{leave:2}),
      a('d',18,38,2),n('signed','Signierte Anweisung','seal',50,38,2),n('verify','Herkunft prüfen','check',82,38,2),
      n('key','Öffentlicher Schlüssel','key',50,77,2)
    ],[{...e('anon1','msg'),leave:2},{...e('msg','receiver'),leave:2},e('d','signed',2),e('signed','verify',2),e('d','key',2),e('key','verify',2)],'Absenderprüfung ist keine Verschlüsselung und keine Erlaubnis', [{kind:'label',x:50,y:8,text:'Mindestens 19 Kennungen · 429 signierte Nachrichten',enter:3}]),
    scope: scene([n('internal','Interne Systeme','server',20,28),n('data','5 private Datensätze','file',20,73,1),n('hub','Zentrale Hub-Datenbank','shield',76,28,2),n('software','Software überprüft','check',76,73,2)],[],'Umfang laut Hugging Face · keine Kontrolle über die gesamte Plattform',[{kind:'zone',x:4,y:6,w:34,h:87,label:'Betroffen',enter:0,color:'risk'},{kind:'zone',x:54,y:6,w:42,h:87,label:'Wichtige Grenzen',enter:2}]),
    shutdown: scene([a('j',18,28,0,{dim:1}),a('anon1',18,72,0,{dim:1}),n('board','Aktivität nimmt ab','board',50,46),n('lock','Zugänge gesperrt','lock',82,46,2)], [e('j','board'),e('anon1','board')],'Viele Läufe enden bereits vor der Zugangssperre',[{kind:'label',x:18,y:8,text:'12. Juli',enter:0},{kind:'label',x:82,y:15,text:'13. Juli',enter:2}]),
    timeline: scene([n('day16','Vorfall veröffentlicht','16',18,40),n('day19','Interner Alarm','19',50,22,1),n('day20','Zuordnung / Meldung','20',50,74,1),n('day21','OpenAI informiert öffentlich','21',82,40,2)], [e('day16','day19',1),e('day19','day20',1),e('day20','day21',2)],'Kalendertage im Juli 2026 · Chronologie nach OpenAI'),
    swarm: scene([
      a('p',16,12,0,{caption:'Verbindung'}),a('b',50,12,0,{caption:'Frühe Koordination',leadership:[0]}),a('c',84,12,1,{caption:'Entdeckung'}),
      a('r',16,48,1,{caption:'Nachprüfung'}),n('board','Nachrichtenbrett','board',50,48,0,{caption:'… und viele weitere Agenten'}),a('m',84,48,1,{caption:'HF-Schwerpunkt'}),
      a('j',16,84,2,{caption:'Angriffskoordination',leadership:[2]}),a('d',50,84,3,{caption:'Absenderprüfung'}),a('l',84,84,2,{caption:'Angriffskoordination',leadership:[2]})
    ],[
      {...e('p','b',0,'handoff'),phases:[0,3]},
      {...e('b','board',0,'order'),phases:[0,3]},
      {...e('board','b',0,'reply'),phases:[0,3]},
      {...e('c','board',1),phases:[1,3]},
      {...e('board','r',1),phases:[1,3]},
      {...e('r','board',1,'reply'),phases:[1,3]},
      {...e('m','board',1),phases:[1,3]},
      {...e('j','board',2,'order'),phases:[2,3]},
      {...e('l','board',2,'order'),phases:[2,3]},
      {...e('board','j',2,'reply'),phases:[2,3]},
      {...e('board','l',2,'reply'),phases:[2,3]},
      e('d','board',3)
    ],'Schematische Beziehungen · letzter Aufbau: zeitübergreifend, nicht gleichzeitig'),
    social: scene([n('resource','Geteilte Ressourcen','server',18,44),n('rules','Regeln durchsetzen','stop',50,44,1),n('trust','Absender prüfen','seal',82,44,2)],[],'Vergleich von Organisationsproblemen · keine Gleichsetzung mit einer menschlichen Gesellschaft'),
    safeguards: scene([a('anon1',18,42),n('rights','Begrenzte Rechte','key',50,19),n('control','Unabhängige Kontrolle','shield',50,74,1),n('stop','Sicher beenden','stop',82,42,2)], [e('anon1','rights'),e('anon1','control',1),e('control','stop',2)],'Didaktische Ableitung · keine einzelne Maßnahme garantiert Sicherheit')
  };
  return {cast,scenes};
})();

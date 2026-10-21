# Geschützte KI-Rückmeldungen für den Kunsttresor

## KI-Filmtexte (22. Oktober 2026)

Derselbe geschützte `POST /api/feedback` unterstützt seit Dienstversion 7 zusätzlich
`{version:1,kind:"film",ids:[6 bis 10 eindeutige Archiv-IDs],variation:0..1000000}`.
Kein neuer Dienst und kein weiterer öffentlicher API-Pfad. Die bestehende Firewall,
der Freigabeschalter, Origin- und Ratenbegrenzung gelten unverändert. Der Server
prüft die Werkauswahl und ergänzt ausschließlich geprüfte öffentliche Katalogdaten,
Stil-/Technikdefinitionen und werkbezogene Hinweise. Er akzeptiert keine freien
Prompts, Bild-URLs, Galerie- oder Teilnehmertexte in diesem Datenformat.

Die separate Film-Systemanweisung verlangt kurze eigenständige Einblendungen
mit einem Zusammenhang zur konkreten Auswahl und wechselnden Gedanken statt
Stil-/Materialbausteinen. Keine Bildsicht behaupten, Details erfinden oder
Leistungen bewerten. JSON-Schema und Nachprüfung verlangen alle IDs genau einmal,
höchstens 150 Zeichen/24 Wörter pro Text und 110 Zeichen für das Schlussmotto.
Ungültige, doppelte oder unvollständige Antworten sowie unbelegte Jahreszahlen
werden verworfen. Das garantiert nicht die sachliche Richtigkeit jeder Formulierung.
Version 8 verlangt zusätzlich für jede Einblendung einen unverändert zitierten
Eintrag aus dem serverseitig geprüften Faktenbestand dieses Werks. Dieser interne
Beleg wird validiert und nicht eingeblendet. Wiederholte Künstlernamen werden
abgewiesen; sichtbare Werkangaben bleiben getrennt von der Filmtextredaktion.

Nur der eigene Knopf „Texte von KI erstellen lassen“ im Filmeditor fordert Texte
an, nach informierter KI-Freigabe. Weder Filmstart noch Öffnen/Ändern einer Galerie
lösen eine Generierung aus. Ein Vorschlag verändert zunächst nichts. Übernahme
ersetzt nach sichtbarem Hinweis die Textfelder; das Schlussmotto ist optional.
Die gespeicherten Texte verwenden das vorhandene `caption:"custom"`-Format und
bleiben bearbeitbar, exportierbar und mit dem Lerncode synchronisierbar. Freigaben
selbst gehören weiterhin nicht in die Spielstandsdatei.

Abbruch, Widerruf, Schließen, Profilwechsel und Änderungen am Film verwerfen
offene Vorschläge/Anfragen. Späte Antworten dürfen nichts überschreiben. Bereits
übertragene Daten werden durch einen Browserabbruch nicht zurückgerufen. Der
Browser wartet maximal 28 Sekunden, der Server nutzt dieselben begrenzten zwei
Versuche wie der Kurator. Fehler lassen bestehende Filmtexte unverändert.

## AI-ELIZA: separater Gesprächsendpunkt (19. Oktober 2026)

`POST /api/eliza` ergänzt ausschließlich diesen bestehenden Dienst, nicht die
Kuratorrolle. Modell und Schlüssel bleiben GPT-OSS 120B bei Groq beziehungsweise
das bestehende Production-Secret. `AI_ENABLED` und `ALLOWED_ORIGINS` gelten auch
hier. Die Webseite bleibt auf GitHub Pages. Kein neues Vercel-Projekt.

Die getrennte Systemanweisung orientiert die Sprache an Carl Rogers:
Wertschätzung, vorsichtiges Spiegeln des subjektiven Erlebens, Nichtdirektivität
und Selbstbestimmung, ohne menschliche Gefühle oder eine Therapie zu behaupten.
Keine Diagnose, Behandlung, Exklusivität oder erfundene Hilfekontakte. Ein
konservativer Krisenwortfilter antwortet ohne Provideraufruf mit einem festen
Hinweis auf unmittelbare menschliche Unterstützung und gegebenenfalls Notruf;
weitere Krisenfälle gehören zu den Sicherheitsvorgaben an das Modell. Der
Filter ist keine zuverlässige medizinische Erkennung oder Notfallbetreuung.

Das Modell liefert strikt strukturiert `personal_opening` und `body`. Nur wenn
es selbst einen konkret begründeten, kurzen persönlich zugewandten Satz wählt,
wird der erste Teil in Dancing Script gesetzt. Er darf leer bleiben. Im Chat
erscheint weder diese interne Feldbezeichnung noch ein Empathie-Etikett.
Alle Inhalte bleiben Text, niemals ausführbares HTML. Die restliche Antwort
steht in Fira Sans. Höchstens 220 beziehungsweise 2000 Zeichen pro Feld.

Vor einem KI-Gespräch bestätigt der Besucher die gesonderte Datenweitergabe.
Der Browser sendet erst auf Absenden: aktuelle Nachricht und höchstens acht
vollständige frühere Gesprächspaare, zusammen höchstens 24.000 Zeichen. Keine
Systemrollen aus dem Browser, Modellwahl, Werkzeuge, Cookies oder Bilder.
Einzelne Nachrichten höchstens 2400 Zeichen. Frühere Paare fallen gegebenenfalls
aus dem Modellkontext, bleiben aber bis zum Beenden im lokalen sichtbaren Verlauf.

Keine eigene Datenbank, Gesprächsprotokolle oder Antwortcaches. Diagnosen von
Dienstfehlern enthalten nur feste Fehlerkategorien, Version und Laufzeit, keine
Gesprächsinhalte, IPs, Prompts, Providertexte oder Schlüssel. Eine auf zehn
Minuten begrenzte Instanz-Zugriffsbremse nutzt IP-Digests (20 Anfragen), ersetzt
aber keine Vercel-Firewall. Die vorhandene aktive Vercel-Regel begrenzt nun
POST auf exakt `/api/feedback` oder `/api/eliza` gemeinsam auf 20 Anfragen
pro IP in 600 Sekunden und antwortet bei Überschreitung mit 429. Andere
Pfade und die übrigen Schutzregeln bleiben unverändert. Der Origin-Filter
ist keine Authentifizierung.

Frist: Server insgesamt 27 Sekunden inklusive Antworttext; Vercel 35 Sekunden,
Browser 32 Sekunden. Kein automatischer zweiter Modellaufruf. Fehler bleiben
sichtbar, die Eingabe bleibt editierbar und ein erneutes Absenden erzeugt keine
doppelten Gesprächspaare. Es gibt keinen lokalen Text, der als KI-Antwort
ausgegeben wird. Beenden oder Esc bricht die Browseranfrage ab, verwirft den
lokalen Verlauf und die Freigabe. Bereits übertragene Daten oder eine laufende
Providerverarbeitung werden damit nicht sicher gelöscht oder zurückgerufen.

Die Datenschutzinformation unterscheidet ausdrücklich lokale Verwerfung von
der Datenverarbeitung der Plattformen. Groq nennt mögliche zeitweise
Inhaltsaufbewahrung für Systemzuverlässigkeit und Missbrauchsprüfung; eine
Zero-Data-Retention-Einstellung des Kontos ist hier nicht verifiziert.
Tests verwenden erfundene Beispiele und Mock-Antworten, keine privaten Chats.

## Ergänzung vom 17. Oktober 2026: begrenzte Wiederholung und Fehlerdiagnose

GET `/api/feedback` meldet jetzt Dienstversion 6. Bei einem vorübergehenden
Verbindungs-/Serverfehler, einer kurzen Anfragebegrenzung oder einer nicht
verwertbaren Modellantwort gibt es höchstens einen zweiten Generierungsversuch
innerhalb derselben Browseranfrage. Ein normaler Erfolg wartet nicht zusätzlich.
`Retry-After` wird beachtet; längere Sperrfristen als zwei Sekunden führen direkt
zum lokalen Ersatztext, nicht zu wiederholtem Anfragen während der Sperre.
Authentifizierungs- und ungültige Anfragefehler werden nicht wiederholt.
Ausnahme: Groqs `json_validate_failed` kennzeichnet eine fehlerhafte Generierung
und darf einmal wiederholt werden. Es gibt keine Wiederholungsschleife im Browser.

Jeder Versuch hat höchstens 11,5 Sekunden Zeit. Beide Versuche zusammen bleiben
einschließlich kurzer Pause innerhalb von 25 Sekunden; der Browser wartet maximal
28 Sekunden, der bestehende Server maximal 30. Auch das Einlesen des Antworttexts
liegt innerhalb der Frist. Die lokalen Kuratorentexte bleiben die ganze Zeit lesbar;
Abschalten oder Schließen verhindert verspätete Änderungen im Browser.

Strukturierte Warnprotokolle enthalten ausschließlich Dienstversion, eine pro
Anfrage neu erzeugte zufällige Fehlerreferenz, Versuch, Zeitdauer, eine feste
Fehlerkategorie, HTTP-Status und freigegebene Provider-/Abbruchcodes. Sie enthalten
keine IPs, Werk-IDs, Antworten, Prompts, Schlüssel, rohen Providertexte oder
Fehlermeldungen. Fremde/unbekannte Fehlercodes werden zu `other` zusammengefasst.
Die Referenz ist keine dauerhafte Spielerkennung. Die technischen Zugriffsprotokolle
der Hostingplattform sind davon unabhängig und bleiben unverändert.

Die Webseite zeigt nur feste Hinweise zu Überlastung, Zeitüberschreitung,
Verbindungsproblemen oder einer unvollständigen/nicht sicher übernehmbaren Antwort.
Unverarbeitete Providerdetails werden weder angezeigt noch an den Browser geschickt.
Die bisherigen Größen-, Schema-, Werk-ID- und Datumsprüfungen bleiben erhalten;
eine fehlerhafte Antwort wird auch beim zweiten Versuch nicht ungeprüft akzeptiert.
Tests verwenden simulierte Fehler einschließlich abgeschnittener Antworten,
Timeouts, langer Sperrfristen und absichtlich sensibler Fehlertexte.

## Ergänzung vom 17. Oktober 2026: Joker

Jeder neue Raum beginnt mit genau einem Joker; ungenutzte Joker werden nicht
angespart, ein im selben Raum verbrauchter Joker wird beim Neuladen nicht erneuert.
Der Browser sendet nach der Auflösung zusätzlich `room.jokerUsed` mit höchstens
einer Werk-ID aus dem aktuellen Raum. Der Dienst validiert diese Angabe und
weist den Kurator ausdrücklich an, die automatisch gesetzten Beschriftungen
und Fälschungsmarkierungen nicht als selbstständige Leistung zu loben.
Stattdessen wird der Jokereinsatz freundlich benannt und die Lösung erklärt.
Die feste Joker-Notiz der Webseite bleibt auch bei eingeschaltetem KI-Tutor
sichtbar. Keine Joker-Vorratsdaten, Zeitstempel oder zusätzlichen persönlichen
Angaben werden übertragen. Diese Unterstützung kam mit Dienstversion 5 hinzu.

Dieses Verzeichnis ist ein **separates** Vercel-Projekt. Die eigentlichen
Webseiten bleiben auf GitHub Pages. Der Nutzer hat die Vercel-Sperre am
11. Oktober 2026 ausschließlich für diese Zwischenstation aufgehoben.
Bestehende Vercel-Projekte und die Sperre im Repository-Hauptverzeichnis
bleiben unverändert. Automatische Git-Deployments sind auch hier deaktiviert.

Root Directory: `services/kunst-kurator`, Framework: Other.
Build Command: `npm run build`. Keine zusätzlichen Bibliotheken nötig.

Aktiver Dienst: `https://kunstkurator-dienst.vercel.app/api/feedback`.
Die Veröffentlichung erfolgte als separates Dateipaket, ohne Git-Verknüpfung.
Aktiv: Firewall mit 20 POST-Anfragen pro IP in 600 Sekunden; `AI_ENABLED=true`.
Der Geheimschlüssel ist ausschließlich als Production-Secret auf Vercel hinterlegt.

Nur in Vercels geschützter Umgebung hinterlegen, niemals im Repository:

- `GROQ_API_KEY`: neuer Schlüssel; als sensitive markieren.
- `AI_ENABLED`: `true`, erst nach Einrichtung der Zugriffsbremse aktivieren.
- `ALLOWED_ORIGINS`: `https://genaiedu.github.io`.

Vor der Aktivierung eine Vercel-Firewall-Regel für POST `/api/feedback`
einrichten: beispielsweise höchstens 20 Anfragen pro IP in 10 Minuten,
Antwort 429. Keine kostenpflichtige Erweiterung ohne Nutzerfreigabe aktivieren.
Zusätzlich beim Groq-Konto Ausgaben-/Nutzungsgrenzen kontrollieren.

Der Dienst validiert vier echte Archivwerke und die vollständigen geprüften
Zuordnungen, rekonstruiert die Programmtexte aus geprüften Quellen und erlaubt
keine frei eingegebenen Prompts, Modellwahl oder Bilder. Die KI erhält nur die
Ergebnisse, aggregierte frühere Erfolge und diese Programmtexte. Zusätzlich
ermittelt die App über Werk-IDs wiederkehrende Quizbilder. Für die vier aktuellen
Werke sendet sie Begegnungszahlen und die Richtig/Falsch-Zusammenfassung der
letzten gespeicherten Prüfung. Der Dienst prüft diese begrenzten Daten und
übersetzt sie in die Namen der Zuordnungsfelder; er gibt dem Modell ausdrücklich
vor, jede dokumentierte Wiederholung in der Ansprache zu berücksichtigen.
Keine vollständige Bildhistorie, Zeitstempel, falschen Antworttexte, Namen,
dauerhaften Browser-IDs oder Spielstandsdateien werden gesendet.

Die lokale Bildhistorie erfasst nur tatsächlich geladene Quizbilder, nicht den
Vorspann oder Hero-Bilder. Sie enthält auch verlorene und ungeprüft verlassene
Räume. Laden desselben Raums zählt nicht erneut; ein neuer Raum mit demselben
Werk zählt als neue Begegnung. Die aktuelle Begegnung ist aus der an die KI
gesendeten Vorgeschichte ausgeschlossen. Frühere Spiele vor Einführung der
Funktion sind unbekannt, nicht angeblich erstmalige Besuche. Das Abzeichenprofil
enthält weiterhin nur erfolgreiche Räume. Keines dieser Daten beweist, dass
ein Werk bewusst angesehen oder wiedererkannt wurde.

Die Historie wird im Browser und in der verschlüsselten JSON-Spielstandsdatei
gespeichert. Import führt Verläufe anhand lokaler Raumkennungen zusammen und
verhindert Doppelzählung; widersprüchliche Datensätze werden abgewiesen.
Ältere Dateien ohne Bildhistorie bleiben ladbar und löschen den vorhandenen
Verlauf nicht. Bis zu 10.000 Räume, danach sichtbare Warnung statt stiller
Löschung. Größere Browser-Speicherprobleme werden ebenfalls angezeigt.

Ein Server-Zwischenspeicher und eine lokale Zugriffsbremse begrenzen
wiederholte Anfragen. Beide gelten **nur pro laufender Serverinstanz** und
ersetzen deshalb keine vorgeschaltete Firewall oder Kontogrenze. Ein Origin-
Filter schützt die Browser-Anbindung, ist aber keine Authentifizierung: Ein
öffentlicher Endpunkt lässt sich außerhalb des Browsers grundsätzlich anfragen.

Bei Fehlern werden weder Schlüssel noch Provider-Fehlertexte an den Browser
ausgegeben. Das Spiel zeigt ohne Wartezwang immer die lokalen Hinweise.
KI-Texte ändern niemals Antworten, Versuche, Abzeichen oder Rekorde.
Antworten werden als Text validiert und angezeigt, nicht als HTML. Ein
KI-Absatz ersetzt nur die persönliche Ansprache; die redaktionellen
Sachhinweise und Museumsquellen bleiben unverändert sichtbar. KI kann irren.

Die Startmeldung nennt GPT-OSS 120B von OpenAI bei Groq und die Datenweitergabe.
Beim ersten Besuch ist der KI-Tutor dort voreingestellt eingeschaltet und mit
einem Schalter abschaltbar. Erst der informierte Start mit eingeschalteter KI
erteilt die Freigabe; vor diesem Start und während der Zuordnung wird keine
KI-Anfrage gesendet. Eine zuvor gespeicherte Ausschaltentscheidung bleibt
erhalten. Danach lässt sich mit „KI-Antworten: An/Aus“ direkt zwischen beiden
Textvarianten wechseln.
Ausschalten bricht laufende Browseranfragen ab und stellt die exakten
Programmtexte wieder her. Fertige KI-Texte bleiben im temporären Browsercache,
damit ein Vergleich keine neue Anfrage benötigt. Die An/Aus-Präferenz und die
Freigabe werden getrennt gespeichert; „Freigabe widerrufen“ speichert die
ausdrückliche Ablehnung, schaltet KI-Antworten aus und leert den temporären Cache. Keiner
dieser Werte gehört zur Spielstandsdatei.

Die Einwilligungsversion wird für die Bildhistorie erneuert, weil erstmals auch
frühere Fehlzuordnungen der aktuellen Werke zusammengefasst übertragen werden.

Neue Werkformen werden ausdrücklich mitgegeben: Fotografie, Skulptur oder
Relief sind keine Gemälde. Bei antiken Arbeiten bedeutet „Unbekannter Künstler“
keinen gemeinsamen Urheber; die kulturelle Tradition ersetzt keine gesicherte
Namenszuschreibung. Vollständige Material- und Katalogdatierungen bleiben im
verifizierten Kontext. Der Stand vom 18. Oktober 2026 umfasst 1921 Werke. Die bisherigen 1807 Einträge sind unverändert; 114 Hauptwerke ergänzen Leonardo, Turner, Rembrandt, Rubens und Vermeer. Der Mann mit dem Goldhelm ist als einziges zusätzliches anonymes Gemälde ausdrücklich Unbekannt; sein fester Kuratorhinweis zur abgeschriebenen Rembrandt-Zuschreibung bleibt auch bei KI-Antworten sichtbar.
Erweiterungstests verwenden ausschließlich simulierte Providerantworten,
keine echten Groq-Anfragen und keinen API-Schlüssel.

Der Build übernimmt die vorhandenen lokalen geprüften Quelldateien. Wenn
die Bereitstellung nur dieses Verzeichnis enthält, verwendet er zunächst die
im Dateipaket enthaltenen Quellen, andernfalls lädt er dieselben Quellen aus
der festgelegten öffentlichen GitHub-Revision. `generated/` enthält nur
öffentliche Werkdaten und Programmcode, keine Schlüssel, und bleibt ungetrackt.

Kontrolle: GET `/api/feedback` meldet nur Dienstversion und Betriebsbereitschaft.
POST benötigt die freigegebene Origin und ein gültiges aufgelöstes Spiel.

Didaktische Erklärung und lokales Ablaufmodell:
`https://genaiedu.github.io/LearningApps2/ki-auf-webseiten.html`.
Das Modell dieser Erklärseite stellt keine KI-Anfragen und benötigt keinen Schlüssel.

## Experiment: live erzeugte Fälschungen (16.10.2026)

`api/forgery.js` ergänzt denselben Dienst. Er benötigt serverseitig
`FORGERY_ENABLED=true`, `CLOUDFLARE_ACCOUNT_ID` und `CLOUDFLARE_API_TOKEN`
(Berechtigungen Workers AI: Read und Edit im betreffenden Konto). Keine dieser
Zugangsdaten gehört in die Webseite. Er benötigt außerdem den vorhandenen
`GROQ_API_KEY`, um aus verifizierten Werkdaten eine Motivbeschreibung zu bilden.
FLUX.2 Klein 4B erzeugt daraus per Multipart-Anfrage ein neues Bild (1024 × 1024, feste vier Schritte).
Anschließend denselben separaten Dienst neu veröffentlichen. GET `/api/forgery`
meldet nur `{ready:true/false}`, niemals Zugangsdaten. Eine Live-Erzeugung wurde
hier ohne Cloudflare-Zugangsdaten nicht getestet.

Der Browser-Schalter „Seltene Fälschungen“ ist standardmäßig an. Änderungen gelten
ab dem nächsten Raum. Zwischen zwei tatsächlich erzeugten Fälschungen liegen
mindestens 19 weitere Räume; danach entscheidet pro Raum eine Zufallschance
von fünf Prozent. Es wird höchstens eines der vier Bilder ersetzt. Die Sperre liegt
im lokalen Browser und ist kein kontenübergreifendes Limit. Fehlschläge lassen
alle Originale stehen und verbrauchen keinen Prüfversuch. Die bisherige
Zuordnungsaufgabe bleibt auch für die Nachahmung erhalten. Falsche Markierungen
von Originalen verhindern ebenfalls das Bestehen. Die Lösung zeigt Originale.

Rücknahme: Browser-Schalter aus (ab dem nächsten Raum), serverseitig zusätzlich
`FORGERY_ENABLED=false`. Damit stoppt die Generierung ohne Löschung von
Spielständen. Vollständiger Rückbau betrifft ausschließlich den neuen Endpunkt,
seine Funktionskonfiguration, die Fälschungsabschnitte in `kunsttresor.js`, die
Zusatzprüfung in `kunsttresor-core.js`, den Konfigurationseintrag und Button-CSS.

### Aktueller Test auf Nutzerwunsch, 16.10.2026

`KunstKIConfig.forgeryEveryRoom=true`: standardmäßig eingeschaltet, genau eine
KI-Nachahmung pro Raum statt der regulären Zehner-Sperre. Der Browser-Schalter
kann den Test ausschalten. Bei Generierungsfehlern erscheint ausdrücklich ein
Hinweis auf vier Originale. Zur seltenen Variante `forgeryEveryRoom=false` setzen.

### Stiltreue und Auswertung (16.10.2026)

Die Text-KI ist für die Prompt-Erstellung jetzt verpflichtend: GPT-OSS 120B
verwendet Werkdaten und konkrete Stil-/Technikmerkmale aus dem Kunstglossar.
Ein niedriger Reasoning-Aufwand und 2400 Ausgabe-Tokens vermeiden leere
Antworten; es gibt keinen stillen Standardprompt mehr. FLUX berechnet acht
Schritte. Gesamte Serverlaufzeit maximal 45 Sekunden, Browseranfrage 40 Sekunden.
Die Auswertung zeigt Original und KI-Fälschung nebeneinander, Stilprüffragen,
den verwendeten Prompt und einen lokalen Download der Fälschung. Beim nächsten
Raum wird der alte Bildvergleich aus dem DOM entfernt und der neue Spielstand
enthält das alte generierte Bild nicht mehr. Exportierte Dateien bleiben erhalten.

### Dauerbetrieb nach Freigabe (16.10.2026)

Der Test mit einer Fälschung in jedem Raum ist beendet: `forgeryEveryRoom=false`.
Die Auswahlchance beträgt höchstens fünf Prozent, ergänzt durch mindestens
19 reine Originalräume nach jeder Nachahmung und vor der ersten möglichen
Nachahmung im neuen Seltenheitsmodus. Damit gilt auch für jedes rollende
20-Räume-Fenster höchstens eine Nachahmung. Schlüssel v2 migriert den
Zehner-Testzähler konservativ mit einer neuen Sperre. Begrüßung, Vorspann
und Regeln erklären die Mechanik. Die Bildkarten haben weiterhin vier
Subgrid-Zeilen; beide Knöpfe liegen gemeinsam in `artwork-actions`.

### Automatischer Kurator und Fälschungsrückmeldung

Nach einem gewonnenen Rätsel öffnet sich unmittelbar der Kurator mit einem
Nächster-Raum-Knopf. Prüfungen speichern die Fälschungsmarkierungen getrennt
von den Zuordnungen. Die Nachahmung erhält ausschließlich eine deterministische
Rückmeldung zur ersten/zweiten Markierung und separat gekennzeichnete Fakten
zum Original. Ältere Spielstände ohne Markierungsprotokoll bleiben unbekannt.
Die Text-KI erhält nur Werk-ID und Markierungsstatus, niemals Bild oder Prompt;
ihr Kontext kennzeichnet die Nachahmung und entfernt für dieses Werk frühere
Leistungsvergleiche. Der feste Markierungskommentar wird nicht durch KI ersetzt.

Nach einem gewonnenen Raum wird der nächste Raum einmalig geplant. Eine vorgesehene Fälschung wird bereits während der Kuratoransicht im Arbeitsspeicher erzeugt und beim Weitergehen übernommen. Ein Neustart oder Moduswechsel verwirft diese Vorbereitung. Die gemeinsame Bildenthüllung nach mindestens zehn Sekunden bleibt bestehen.

Stand 16.10.2026, abschließend: Der Testmodusschalter und alle Test-Overrides per URL oder gespeicherter Einstellung sind entfernt. Fälschungen sind ein-/ausschaltbar, maximal eine in sieben Rätseln, mit mindestens sechs Originalräumen dazwischen. Nach der Sperrfrist entscheidet eine Zufallschance von 1/7; die tatsächliche mittlere Häufigkeit liegt daher darunter. Cooldown-Schlüssel v3 beginnt mit sechs Originalräumen. Die Vorausgenerierung während des Kurators bleibt erhalten. Vollbild ist ausschließlich manuell.

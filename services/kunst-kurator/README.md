# Geschützte KI-Rückmeldungen für den Kunsttresor

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

Die Kunstapp startet ohne KI-Freigabe. Nach der einmaligen Zustimmung lässt
sich mit „KI-Antworten: An/Aus“ direkt zwischen beiden Textvarianten wechseln.
Ausschalten bricht laufende Browseranfragen ab und stellt die exakten
Programmtexte wieder her. Fertige KI-Texte bleiben im temporären Browsercache,
damit ein Vergleich keine neue Anfrage benötigt. Die An/Aus-Präferenz und die
Freigabe werden getrennt gespeichert; „Freigabe widerrufen“ entfernt die
Zustimmung, schaltet KI-Antworten aus und leert den temporären Cache. Keiner
dieser Werte gehört zur Spielstandsdatei.

Die Einwilligungsversion wird für die Bildhistorie erneuert, weil erstmals auch
frühere Fehlzuordnungen der aktuellen Werke zusammengefasst übertragen werden.

Der Build übernimmt die vorhandenen lokalen geprüften Quelldateien. Wenn
die Bereitstellung nur dieses Verzeichnis enthält, verwendet er zunächst die
im Dateipaket enthaltenen Quellen, andernfalls lädt er dieselben Quellen aus
der festgelegten öffentlichen GitHub-Revision. `generated/` enthält nur
öffentliche Werkdaten und Programmcode, keine Schlüssel, und bleibt ungetrackt.

Kontrolle: GET `/api/feedback` meldet nur Dienstversion und Betriebsbereitschaft.
POST benötigt die freigegebene Origin und ein gültiges aufgelöstes Spiel.

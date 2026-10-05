# Der Hugging-Face-Fall

Interaktive, deutschsprachige Browser-Präsentation. Stand 21.09.2026.
Der gemeinsame Inhalt steht in huggingface-fall-data.js. Das PDF-Skript erzeugt
scripts/build-huggingface-script.py mit ReportLab. Keine Angriffsbefehle oder
übernommenen Logdateien sind Teil der App. Keine externen Anfragen beim Laden.

## Quellen

- OpenAI, Erstmitteilung vom 21.07.2026, später ergänzt:
  https://openai.com/index/hugging-face-model-evaluation-security-incident/
- OpenAI, ausführliche Untersuchung vom 26.08.2026:
  https://openai.com/index/hugging-face-incident-and-the-road-ahead/
- Hugging Face, technische Rekonstruktion vom 27.07.2026:
  https://huggingface.co/blog/agent-intrusion-technical-timeline
- METR / Redwood, unabhängige Untersuchung vom 26.08.2026:
  https://evals.alignment.org/blog/2026-08-26-openai-hugging-face-incident-investigation/

Die Folien nennen die jeweilige Grundlage. Die Motivdeutung wird zwischen den
Berichten unterschieden. METR untersuchte einen begrenzten Ausschnitt, nicht
sämtliche Aussagen der Betreiber. Zahlen beziehen sich auf unterschiedliche
Grundgesamtheiten. Die Darstellung zu Modal unterscheidet eine Kundenanwendung
vom Anbieter. Der Umfang des belegten Zugriffs ist nicht als Totalübernahme
beschrieben. Sinngemäße Agentenaussagen sind ausdrücklich keine Zitate.

## Gestaltung und Bedienung

Die vier HTML-Kompositionen unter `films/` wurden vom Nutzer am 06.10.2026
bereitgestellt: `01-intro-der-schwarm.html` (15 s),
`02-folie-25-die-spuren.html` (5 s),
`02b-folie-25-die-voegel-fliehen.html` (6 s) und
`03-abschluss-voegel-auf-dem-draht.html` (15 s). Sie wurden aus dessen
Claude-Arbeitsverzeichnis importiert; die Originaldateien bleiben unverändert.
`scripts/import-huggingface-films.cjs` dokumentiert die mechanische Übernahme.
Die eingebetteten Schriften wurden durch gemeinsame lokale Schriftdateien
ersetzt, GSAP 3.14.2 wird einmal mit seinem mitgelieferten Lizenzkopf gespeichert.
Die separate automatische Vorschauwiedergabe wurde entfernt. Die Einbettung
steuert Start, Pause, Fortsetzen, Wiederholen und die Etappengrenzen.
Im Auftakt entsteht ab 10,2 s die echte responsive Titelfolie. Die Zeichnung zur
Aufarbeitung ergänzt den bestehenden datierten Folientext (16.-17., 19. und
20. Juli); sie zeigt keinen belegten exakten menschlichen Entdeckungsmoment.
Das Agentennetz verkleinert sich um einen festen Mittelpunkt. Die transparente
Zeichenfläche lässt den durchgehenden Hintergrundschwarm sichtbar. Nach der
Zuordnung am 20. Juli bleibt die Ansicht stehen. Erst „Schwarm auflösen“ startet
die Fluchtkomposition und die synchronisierte Auflösung des Hintergrundschwarms.
Pause, Fortsetzen und Wiederholen bleiben verfügbar. Das leere Schlussbild
wartet auf den nächsten Klick. Die Flucht ist ein symbolischer Übergang zum
Nachspiel, kein zusätzlich behauptetes oder datiertes Ereignis.
Die zurückgelassenen Federn taumeln innerhalb derselben steuerbaren Zeitleiste
bis zum Boden am unteren Bildrand und bleiben dort liegen.
Die Schlusskomposition bildet vier Etappen unmittelbar vor den Zusatzmaterialien.
Alle 30 bisherigen Folien bleiben erhalten, hinzu kommt die Quintessenz (31 insgesamt).
Sämtliche Animationen sind schematische Visualisierungen, keine Originalaufnahmen.
Sie verwenden keinen externen Video- oder Animationsdienst. Das frühere MP4
`schwarm-intro.mp4` und sein Poster bleiben als ungenutzte ursprüngliche Medien
im Repository erhalten; die App lädt sie nicht mehr.

Eigene typografische Gestaltung und schrittweise HTML-Ablaufdarstellungen,
keine angeblich dokumentarischen KI-Bilder. Keine externen Bilddateien.
Inter und Outfit aus dem gemeinsamen Schriftverzeichnis `../LearningApps/fonts/`.
Die Präsentation, der Auftaktfilm und beide PDF-Downloads liegen seit dem
Umzug in LearningApps2. Die frühere Adresse in LearningApps leitet weiter;
Folienmarkierungen und URL-Parameter bleiben bei dieser Weiterleitung erhalten.
Browser-App statt PowerPoint: Touch-Tasten, Wischen, Tastatur, freie Skalierung,
Folienübersicht, lokal gespeicherter Durchgang, abschaltbare Bewegung.
Der Begleittext und alle Quellen sind zu jeder Folie erreichbar.
Das PDF enthält eingebettete Schriftzeichen und benötigt beim Lesen kein Internet.

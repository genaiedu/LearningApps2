# Kohelet & Gregor · Was bleibt?

Statische LearningApp zur textgestützten Auseinandersetzung mit dem vollständigen Kohelet und Gregors acht Homilien. Veröffentlichung: `https://genaiedu.github.io/LearningApps2/kohelet-gregor.html`. Entdeckung ausschließlich im Religionsteil des zentralen Hubs in LearningApps; keine Rücklinks aus der App zu den Übersichten.

## Unterrichtlicher Aufbau

- Allgemeiner Einstieg, unmittelbar danach deutsche und zweisprachige Textausgaben.
- Vollständiger Leser: zwölf Koheletkapitel / 222 Verse; acht Homilien / kompletter griechischer und deutscher Bestand. Griechisch mit redaktionellen Leseabsätzen. Kein sichtbarer Bezug zu ursprünglichen Dateiseiten in Navigation oder Kopfzeilen.
- Vier Lernwege mit je vier festen Arbeitsaufträgen: Beobachten, Übersetzen, Prüfen, Urteilen. Ein gemeinsamer Datensatz liefert App, Unterrichtspräsentation und Aufgaben-PDF. Keine zufälligen Textaufträge und keine automatische Bewertung offener Interpretationen. Fortschritt ist eine ausdrücklich gesetzte Selbsteinschätzung, kein Punktestand.
- Feste Beispielinterpretation zu Koh 1,2; 35 illustrierte Folien einschließlich exakt derselben Arbeitsaufträge. Im echten Präsentationsvollbild nur Vor/Zurück. Escape beendet Vollbild. Die Vollbildfläche ist ein inneres Element, da ein HTML-Dialog selbst nicht als Vollbildelement zulässig ist.
- Redaktioneller Begleittext unterscheidet jüdisches Buch, christliche Rezeption, benannte heutige Forschung und eigene Anwendung. Kritische Gegenquellen zu Sabbat, Feindesliebe und historischen Geschlechterhierarchien.
- Alle sechs PDFs und vier Textdateien direkt herunterladbar. Die neutral benannten deutschen Lesefassungen haben keine Versnummern; die zweisprachigen Ausgaben behalten die Stellenangaben. Keine Hinweise auf den späteren Verwendungszweck der Lesefassungen.

## Textgrundlagen, Rechte und Grenzen

Die deutschen Übersetzungen sind eigenständige KI-Arbeitsfassungen ohne unabhängige philologische Abnahme. Keine moderne Gesamtübersetzung wird als eigene ausgegeben. Die App verlinkt aktuelle Forschung knapp; sie enthält keine kopierten modernen Infografiken oder externen Fotos. Sämtliche Schemata sind eigene SVG-Zeichnungen. Die Herkunftsangaben der griechischen digitalen Patrologie und die Lizenzhinweise der hebräischen Daten werden erhalten.

Die fünf Quelldateien in `data/kohelet-gregor/` bewahren beide vollständigen Sprachbestände und die editoriellen Kohelet-Verweise. `tools/build-kohelet-data.cjs` erzeugt `lesetexte.json` daraus, ohne Übersetzung oder Textkürzung. `tools/kohelet-text.cjs` gliedert den griechischen Text redaktionell an Satz- und Diskursübergängen; die Gliederung beansprucht keine antike Absatzüberlieferung oder Satzgleichheit der beiden Spalten.

Fira Sans und EB Garamond aus `../LearningApps/fonts/kanban/`; Noto Serif Hebrew aus `../LearningApps/fonts/kohelet/`, jeweils mit SIL-OFL-Lizenzen. Lucide aus dem gemeinsamen lokalen Bestand. Fünf Farbschemata mit Hell/Dunkel, Schriftgrößenwahl, übliche Ligaturen, Mediävalziffern im Lesetext, echte EB-Garamond-Kursive im Titel und reduzierte Bewegung. Druckmaterial mit eigenständigem A4-Zwölfersatzspiegel, nicht als Webseitenscreenshot.

## Speicherung

Keine Lerncode-Anbindung: Der Nutzer hat ausdrücklich klargestellt, dass mit „Profilen verlinken“ die Übersetzungen gemeint waren. Kein Generator-/Registrierungslink und kein neuer Speicherdienst.

Arbeitsstand nur unter `kohelet-gregor:work:v1`, Darstellung unter `kohelet-gregor:view:v1`. Notizen maximal 20.000 Zeichen je Auftrag; strikte Prüfung importierter Sicherungen. Antworten werden ausschließlich als Text behandelt, nicht als HTML. Vor Import und Reset ausdrückliche Bestätigung. Beschädigte bestehende Stände werden nicht still überschrieben. Bei gesperrtem Speicher bleibt die App nutzbar und bietet Dateiexporte an. Keine automatischen externen Abrufe, keine Laufzeit-KI, keine Konten und keine übertragenen Schülerantworten.

## Wiederholbare Prüfung

```text
node tools/build-kohelet-data.cjs
node --test tests/kohelet-gregor.test.cjs
python3 tools/build-kohelet-material.py --node /path/to/node
PLAYWRIGHT_MODULE=/path/to/playwright node tests/kohelet-gregor-browser.cjs
```

Die Browserprüfung erwartet einen statischen Server mit den Geschwisterprojekten LearningApps und LearningApps2, standardmäßig Port 8886. `KOHELET_URL` und `KOHELET_QA_DIR` können für andere lokale Prüfumgebungen gesetzt werden. Ein vorhandener Chrome ist erforderlich. Keine echten Profile oder Datenbank-Schreibtests.

Geprüft: alle 222 deutschen Verse und acht deutschen Homilien in der tatsächlichen Leseansicht, alle 16 Aufträge mit gültigen Textankern, zehn Downloads, 35 illustrierte Folien, zehn Palettenvarianten, Mobil-/Tabletansichten, Vollbild, Reload, Sicherungsimport, bestätigter Reset und gesperrter Speicher. Die technische Prüfung ist keine wissenschaftliche Abnahme der Übersetzungen.

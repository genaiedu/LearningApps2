# Möhnetalsperre · Ein Tal wird See

Eigenständige historische Lernapp, auf ausdrücklichen Wunsch ohne Aufgaben,
Gamifikation, Nutzerkonten oder Lernstandsspeicherung. Veröffentlichung über
GitHub Pages, Eintrag im Hauptkatalog unter Geschichte. Keine Aufnahme in die
ausschließlich physikalisch-chemische Materialienübersicht.

## Inhalt und Quellen

12 Ereignisse; 6 Bauphasen; 5 Schritte zum historischen Mauerbruch;
26 Präsentationsseiten, 12 lizenzgeprüfte Wikimedia-Abbildungen.
Die genaue Zahl der Präsentationsseiten folgt aus `MoehneContent.slides`.
Quellen direkt an den betreffenden Abschnitten und vollständig im Quellenkapitel.
Die Texte sind eigenständig formuliert. Die Originale werden verlinkt, nicht kopiert.

- Umleitungsgraben und 305-m-Stollen: zeitgenössischer Bericht in *Prometheus*,
  26. Mai 1909, S. 536–538 (insbesondere S. 537; PDF-Seite 9).
- Mauermaße, Speicherinhalt einschließlich Teilbecken: Ruhrverband,
  technische Bestandsdaten. Keine historischen Planmaße als Ist-Maße verwenden.
- Die detaillierte Form historischer Absperrungen/Wasserhaltung ist nicht belegt;
  diese Bestandteile der Animation werden ausdrücklich als allgemeines Prinzip
  und nicht als exakte Rekonstruktion erklärt.
- Angriff und Folgen: LWL / Ralf Blank, Ruhrverband und ergänzende Nachweise.
  Unterschiedliche Opferzahlen werden offengelegt statt auf eine vermeintlich
  endgültige Zahl vereinheitlicht. Mindestens 526 getötete Zwangsarbeiterinnen
  bezeichnet nur das Lager Möhnewiesen, nicht die gesamte Katastrophe.
- Karten: drei Ausschnitte der aktuellen OpenStreetMap, keine historische
  Überflutungsgrenze. Die lokale Flussübersicht ist ausdrücklich nicht maßstäblich.

## Externe Inhalte und Datenschutz

Vor dem eigentlichen App-Inhalt steht eine Startentscheidung mit gleichwertigen
Knöpfen für Start mit und ohne externe Inhalte. Die Freigaben leben ausschließlich
im Arbeitsspeicher und werden nach Neuladen neu erfragt. Bilder und Karte lassen
sich nachträglich unabhängig ein-/ausschalten. Keine externen img-/iframe-Adressen
vor Freigabe; kein Preconnect. Bilder laden ohne Credentials (`crossorigin=anonymous`)
und ohne Referrer. Bilder im Präsentationsdialog erst beim Öffnen laden.
Der OSM-iFrame ruft seinerseits Kartendienste ab; deren Verarbeitung wird nicht
als durch die App kontrollierbar dargestellt. Keine Analytics oder Laufzeit-KI.
Hosting-Zugriffsdaten werden unabhängig von der Medienentscheidung erklärt.

Die Darstellungseinstellungen werden getrennt unter `moehne-view` in localStorage
gespeichert. Bei gesperrtem Speicher bleibt die Darstellung für den Besuch nutzbar.
Bei Widerruf Bilder entfernen, Fotodialog schließen, Karte entfernen und auch die
Vergleichsfotos am 3D-Modell aktualisieren. Bereits übermittelte Daten sind nicht
rückholbar; das steht in den Medienhinweisen. Lizenzen und Urheber direkt am Bild.

## Blender und Web-Modell

Erzeugt mit Blender 5.2.2 LTS auf diesem Mac:

```text
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python tools/build-moehne-model.py
```

Generiert `assets/moehne/`:

- `moehnetalsperre.blend`: bearbeitbare Szene einschließlich benannter POI-Empties.
- `moehnetalsperre.glb`: standardisierter 3D-Export derselben Szene.
- `moehne-modell.json`: materialweise zusammengefasste Dreiecke direkt aus Blender,
  plus sechs Orte und vier Fotospots. Keine unabhängig nachgebaute Web-Geometrie.
- `moehne-vorschau.png`: in Blender gerenderte lokale Vorschau, kein historisches Foto.

Hauptmaße: 650 m Kronenlänge, 40,3 m maximale Höhe, 34,2 m Fußbreite,
6,25 m Kronenbreite. Der Darstellungsradius 500 m ist **eine Modellannahme**,
keine behauptete historische Angabe. Gelände, Ufer, Bauwerksdetails und Standpunkte
sind angenähert. Nur ein Stauseeausschnitt. Keine OSM-Geometrie in diesem Modell.
Die dunklen Entlastungsöffnungen sind visuelle Einsätze, kein hydraulisches Modell.
Das intakte Bauwerk bleibt intakt; der POI zur Bresche markiert nur ungefähr deren Ort.

Browser: vorhandenes lokales Three.js r128 aus LearningApps, MIT-Lizenz dort unter
`fonts/chess/THREE-LICENSE.txt`. Keine neue Kopie und kein 3D-CDN.
WebGL erst auf Knopfdruck; bei fehlendem WebGL bleibt die Blender-Vorschau erhalten.
Keine endlose Render-Schleife im Hintergrund: Neuzeichnung bei Interaktion,
Größen-/Darstellungswechsel, während eines Kameraflugs maximal 450 ms.

Fotospots setzen die tatsächliche Kameraposition. Umschauen behält sie bei;
Brennweite verändert nur den Bildwinkel. Berechnung mit 36 mm Bildbreite, auch
bei veränderlichem Viewport-Seitenverhältnis. Brennweitenvorschläge sind gestalterische
Vorschläge für das Schema, keine Zusicherung realer Zugänglichkeit. Vergleichsfotos
sind nicht als Fotos exakt vom Modellstandpunkt ausgegeben. Kein Bokeh-/Objektivmodell.
Downloads und Tastaturbedienung sind unmittelbar in der App erläutert.

## Prüfung

`node --test tests/moehnetalsperre.test.cjs`

Mit lokalem Server aus dem gemeinsamen Elternordner und installiertem Playwright:

```text
NODE_PATH=/Users/clausunterberg/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/moehnetalsperre-browser.cjs
```

Prüfen: keine Fremdabrufe vor Freigabe/bei Start ohne Medien; getrennter Widerruf;
Bildrechte und Fehlerzustände; Timeline/Bau/Angriff; alle Paletten hell/dunkel;
Desktop/Tablet/Handy; Präsentation mit ausschließlich Vor/Zurück im Vollbild;
3D-Orte und alle Fotospots, konstante Position beim Brennweitenwechsel,
Blender-/GLB-Downloads. Screenshots nur nach `/private/tmp`, nicht ins Repository.

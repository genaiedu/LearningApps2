# Kunsttresor: Werkpool und Vorspann

Die App verwendet genau 1000 spielbare Datensätze. Die Bilder werden nicht
im Repository gespeichert; der Browser lädt sie nach Zustimmung direkt von
Wikimedia Commons. Die vier Antwortfelder sind Künstler, Datierung,
Stilrichtung und Technik. Zu jedem Werk bleibt die Einzelquelle erhalten.

## Herkunft

- Die bisherigen 304 spielbaren Werke stammen aus den CC0-Metadaten des
  Art Institute of Chicago. Ihre IDs und Antwortfelder bleiben unverändert,
  damit vorhandene Spielstände weiter funktionieren.
- Weitere Werke stammen aus Wikidata. `P135` dokumentiert den Stil am Werk,
  `P170` den Künstler, `P571` die Datierung und `P186` die Materialien.
  Stilrichtungen werden nicht pauschal vom Künstler abgeleitet.
- Neue Werke haben einen einzelnen benannten Künstler mit Wikipediaartikel,
  eine hinreichend bestimmte Datierung, eine aus den Materialangaben
  nachvollziehbare Technik und eine passende Commons-Abbildung.
- Die Künstler sind spätestens 1955 gestorben. Zusätzlich wird die konkrete
  Bilddatei anhand ihrer Commons-Metadaten auf Public Domain beziehungsweise
  CC0 geprüft. Das Todesjahr allein ist keine Lizenzprüfung.
- Vollständige Materialangaben, Werkquelle und Bildlizenz stehen in der
  Auflösung. Stilzuordnungen und vereinfachte Technikbegriffe sind keine
  Behauptung, Kunstwerke hätten stets eine einzig mögliche Einordnung.

Über den Galerie-Bildern stehen die Werktitel ohne Künstlercredit. Bei
Titeln, die den Künstler bereits nennen, dokumentiert `galleryTitle` eine
gekürzte Quizfassung; `title` bewahrt immer die vollständige Quellenfassung.
Verschiedene Namensformen mit derselben persönlichen Wikipediazuordnung
gelten bei der Raumwahl als ein Künstler, ohne gespeicherte Antwortwerte
umzubenennen.

## Vier Dateien

`kunstarchiv.json` enthält Werkdaten, `kunstbilder.json` die geprüften
Bild-URLs und Rechte, `kunst-wikipedia.json` die zugeordneten Artikel.
`kunst-hauptwerke.json` enthält die vorab ausgewählten 100 Schlussbilder.
Diese Werke haben einen eigenen Wikipediaartikel und breite dokumentierte
Wikimedia-Rezeption. Die Auswahl wird vor Veröffentlichung anhand ihrer
Titel und Künstler überprüft; Wikimedia-Verknüpfungen sind eine Auswahlhilfe,
kein objektives Maß künstlerischer Bedeutung.

Der Vorspann wählt fünf abwechslungsreiche Werke und zuletzt ein Werk aus
dieser festen Hundert-Auswahl. Die ersten fünf Kapitel dauern je sieben
Sekunden. Im elfsekündigen Finale bleibt das Bild vollständig und unverzerrt
sichtbar (`object-fit: contain`), zunächst ohne Haupttitel. Danach erscheinen
„1000 Kunstwerke“ und „Quiz Edition“ in lokal eingebundener Schreibschrift.
Die Musik blendet über das Finale aus. Ein erneuter Vorspann vermeidet die
unmittelbar vorher gezeigten Werke, insbesondere das vorige Schlussbild.

## Wartung

`node scripts/expand-kunstarchiv.mjs /private/tmp/kunst-1000-cache` sammelt nur
JSON-Metadaten. Es respektiert Wartezeiten und zwischengespeicherte Antworten
und erzeugt einen Prüfbericht sowie vier Patchdateien außerhalb des
Repositories. Es verändert die Anwendungsdaten nicht automatisch.
Nach Prüfung werden die Patches eingespielt und
`node --test tests/kunsttresor.test.cjs` ausgeführt. Zusätzlich den Vorspann,
ein zufälliges Spielzimmer und die vergrößerte Bildansicht im Browser testen.
Keine Bilddateien herunterladen oder veröffentlichen.

Primärquellen: [Museums-API](https://api.artic.edu/docs/),
[Wikidata](https://www.wikidata.org/),
[Commons-Bildrechte](https://commons.wikimedia.org/wiki/Commons:Reuse_of_PD-Art_photographs).

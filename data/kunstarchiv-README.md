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

## Fünf Dateien

`kunstarchiv.json` enthält Werkdaten, `kunstbilder.json` die geprüften
Bild-URLs und Rechte, `kunst-wikipedia.json` die zugeordneten Artikel.
`kunst-hauptwerke.json` enthält die vorab ausgewählten 100 Schlussbilder.
`kunst-titel-de.json` ergänzt die deutschen Anzeigetitel für alle 1000 Werke.
Zunächst werden vorhandene deutsche Wikipedia-/Wikidata-Titel berücksichtigt;
fehlende beschreibende Titel wurden einzeln ins Deutsche übertragen. Eigennamen
und etablierte fremdsprachige Titel bleiben gegebenenfalls erhalten. Eigene
Übersetzungen werden in der Auflösung ausdrücklich als solche bezeichnet,
nicht als offizielle Museumstitel. Dort bleibt auch der Originaltitel sichtbar.
Die Galerie, Vergrößerung und Schlussbild-Beschriftung nutzen dieselbe deutsche
Fassung; Wikipedia-Artikelziele und gespeicherte Antworten bleiben unverändert.
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

Beim Öffnen wartet eine bildschirmfüllende Startseite auf einen Klick.
Dieser startet den Vorspann mit eingeschalteter Musik und fordert zugleich
Browser-Vollbild an; ohne Nutzeraktion werden diese Funktionen von Browsern
oft blockiert. Ohne bisherige Bildfreigabe benennt derselbe Startknopf diese
Zustimmung ausdrücklich und erklärt die externe Verbindung davor.
Nach Vorspann oder Überspringen öffnet sich direkt der aktuelle Spielraum,
weiterhin im Vollbild. Ist natives Vollbild nicht verfügbar (etwa in manchen
iPad-Browsern), bleibt die bisherige browserfüllende Ersatzansicht nutzbar.
Die Musik endet mit dem Vorspann; sie spielt nicht während des Rätselns weiter.
Auch die drei Bilder im Eingangsbereich werden bei jedem Öffnen neu gezogen:
drei verschiedene Werke, nach Möglichkeit mit unterschiedlichen Künstlern
und Stilrichtungen. Die unmittelbar vorige Dreierauswahl wird vermieden;
während eines Rundgangs wechseln diese Bilder nicht bei jeder Eingabe.
Die 30-Sekunden-Ladewarnung sperrt ein später erfolgreich geladenes Bild
nicht dauerhaft. Alte Bildanforderungen aus einem inzwischen verlassenen
Raum bleiben dagegen wirkungslos. Für „Nursing Madonna“ wird im Spiel eine
geprüfte 960px-Vorschau verwendet; beim Vergrößern bleibt sie sichtbar,
während die größere Fassung nachlädt. Das Original bleibt für Downloads erhalten.

## Wartung

`node scripts/expand-kunstarchiv.mjs /private/tmp/kunst-1000-cache` sammelt nur
JSON-Metadaten. Es respektiert Wartezeiten und zwischengespeicherte Antworten
und erzeugt einen Prüfbericht sowie vier Patchdateien außerhalb des
Repositories. Es verändert die Anwendungsdaten nicht automatisch.
Nach Prüfung werden die Patches eingespielt und
`node --test tests/kunsttresor.test.cjs` ausgeführt. Zusätzlich den Vorspann,
ein zufälliges Spielzimmer und die vergrößerte Bildansicht im Browser testen.
Keine Bilddateien herunterladen oder veröffentlichen.

`node scripts/localize-kunsttitel.mjs /private/tmp/kunst-1000-cache` erstellt
eine separate Titel-Patchdatei. Bestehende eigene Übersetzungen werden bewahrt;
neue fehlende Titel müssen vor Veröffentlichung redaktionell ergänzt werden.

Primärquellen: [Museums-API](https://api.artic.edu/docs/),
[Wikidata](https://www.wikidata.org/),
[Commons-Bildrechte](https://commons.wikimedia.org/wiki/Commons:Reuse_of_PD-Art_photographs).

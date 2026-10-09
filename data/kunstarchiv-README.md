# Kunsttresor: Werkpool und Vorspann

Die Edition heißt weiterhin „1000 Kunstwerke · Quiz Edition“. Ihr gezielt
erweitertes Archiv verwendet tatsächlich 1438 spielbare Datensätze; die
Oberfläche zeigt die tatsächliche Größe an. Die Bilder werden nicht
im Repository gespeichert; der Browser lädt sie nach Zustimmung direkt von
Wikimedia Commons. Die vier Antwortfelder sind Künstler, Datierung,
Stilrichtung und Technik. Zu jedem Werk bleibt die Einzelquelle erhalten.

## Herkunft

- 304 Werke stammen aus den CC0-Metadaten des Art Institute of Chicago.
  Ihre IDs und Antwortfelder bleiben unverändert.
- Daubignys „On the Bank of the Seine at Portejoie“ (`aic-59004`) wurde
  durch „Sunset on the River Oise“ (`cma-1964.289`, 1866) ersetzt: Die
  Museumsquelle des bisherigen Werks bietet nur eine Schwarzweißaufnahme.
  Das Ersatzwerk ist ein anderes Gemälde, keine kolorierte Reproduktion.
  Titel, Datierung, Holzträger, Sammlung und Inventarnummer sind im
  [Cleveland Museum of Art](https://www.clevelandart.org/art/1964.289)
  dokumentiert; die konkrete JPEG-Farbaufnahme auf Commons ist gemeinfrei.
  „Sonnenuntergang an der Oise“ ist eine eigene deutsche Titelübersetzung.
  Die Einordnung dieser Landschaft als Schule von Barbizon ist redaktionell
  und wird in der Auflösung als solche bezeichnet; Wikidata hat hier kein P135.
  Die alten Werkangaben unter `replacements` dienen ausschließlich der
  Spielstandübernahme und werden nicht zufällig gezogen. Zuordnungen und
  verbrauchte Versuche bleiben bei einer eindeutigen Übernahme erhalten.
  Sollte „1866“ mit einer anderen Antwort kollidieren, wird ein neuer,
  eindeutiger Raum erzeugt; bereits geöffnete Türen und der Rekord bleiben
  erhalten. Neue Fragen verbrauchen keinen Versuch. Verlorene Runden bleiben verloren.
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
`kunst-titel-de.json` ergänzt die deutschen Anzeigetitel für alle Werke.
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

In der bildschirmfüllenden Bildansicht vergrößert und verkleinert eine
Zwei-Finger-Geste das Bild stufenlos zwischen 100 und 300 Prozent. Das Detail
unter dem Mittelpunkt der Finger bleibt nach Möglichkeit an dieser Position.
Mit einem Finger oder der Maus lässt sich der vergrößerte Ausschnitt verschieben;
nach dem Anheben eines Fingers geht die Geste ohne Sprung ins Verschieben über.
Abgebrochene Gesten und das Schließen setzen die Kontaktpunkte zurück.
Plus/Minus, Scrollen und Tastatur bleiben nutzbar. `touch-action: none` gilt nur
für die Bildfläche; das normale Zoomen der Webseite wird nicht global gesperrt.

## Wartung

Die ursprünglichen 1000 Werkdatensätze bleiben vollständig und unverändert
erhalten. `expansion` dokumentiert die 438 zusätzlichen IDs und den SHA-256
der ursprünglichen Werkdaten. Die feste Auswahl der 100 Schlussbilder bleibt
ebenfalls unverändert. Neue Räume können alle 1438 Werke verwenden.

Die Ergänzungen stammen aus ausdrücklich dokumentierten Werkmaterialien und
Stilzuordnungen: 222 weitere Temperabilder, 99 Holzschnitte, 46 Aquarelle,
25 Tuschezeichnungen, 18 Kupferstiche, 9 Pastelle, 7 Graphitzeichnungen,
6 Gouachen sowie jeweils 2 Kohlezeichnungen, Lithografien und Radierungen.
Die vollständigen Materialangaben bleiben neben den vereinfachten
Quizbegriffen sichtbar. Bei Druckgrafiken wird ein dokumentiertes Verfahren
verwendet, statt die Druckfarbe als Zeichenmedium zu interpretieren.
Blake-Drucke ohne eindeutige Verfahrensangabe, Klimts Wandmalerei mit
Kreidegrund sowie ganze Bücher und Portfolios werden nicht als entsprechende
einzelne Zeichnungen aufgenommen. Monochrome Druckgrafik ist absichtlich
schwarzweiß und keine entsättigte Fotografie eines farbigen Gemäldes.

Eine reproduzierbare Simulation vergleicht jeweils 10.000 aufeinanderfolgende
Räume. Sie prüft, dass Giovanni di Paolos Temperabild „Die Enthauptung Johannes
des Täufers“ deutlich seltener gezogen wird als im alten Pool. Alle neuen
Werke müssen zudem vollständige Quizangaben, einen Künstlerartikel und eine
individuell geprüfte Public-Domain-/CC0-Bilddatei besitzen. Zufall bedeutet
weiterhin nicht, dass alle Werke garantiert erscheinen, bevor eines wiederholt
wird; die vier unterschiedlichen Antwortwerte begrenzen zulässige Räume.

`node scripts/balance-kunstarchiv.mjs /private/tmp/kunst-balance-cache` sammelt
nur öffentliche JSON-Metadaten, berücksichtigt Wartezeiten und API-
Zwischenspeicher und erzeugt einen Prüfbericht und kleine Patchdateien.
Die Quellen und deutschen Titel müssen vor Einspielen redaktionell geprüft
werden. Eigene deutsche Übersetzungen stehen zur Wartung zusätzlich in
`kunst-titel-balance-uebersetzungen.tsv`; sie werden nicht als offizielle
Museumstitel ausgegeben. Neue Stil-Untergruppen haben nach Möglichkeit
einen eigenen, auf Deutsch oder Englisch hinterlegten Wikipediaartikel.
Große Originaldateien über 8 MiB werden nicht automatisch beim Vergrößern
geladen; ihre geprüfte Vorschau bleibt sichtbar. Der ausdrücklich angeforderte
Originaldownload ist weiterhin möglich.

Der ältere Builder `expand-kunstarchiv.mjs` ist gegen ein versehentliches
Zurückschneiden eines bereits erweiterten Archivs auf 1000 Werke gesperrt.
Er sammelt nur
JSON-Metadaten. Er respektiert Wartezeiten und zwischengespeicherte Antworten
und erzeugt einen Prüfbericht sowie vier Patchdateien außerhalb des
Repositories. Es verändert die Anwendungsdaten nicht automatisch.
Nach Prüfung werden die Patches eingespielt und
`node --test tests/kunsttresor.test.cjs` ausgeführt. Zusätzlich den Vorspann,
ein zufälliges Spielzimmer und die vergrößerte Bildansicht im Browser testen.
Keine Bilddateien herunterladen oder veröffentlichen.

Der persönliche Highscore wird getrennt vom laufenden Spiel gespeichert.
Ein verlorener Raum, „Neue Runde beginnen“ und der normale Neustart setzen
nur den Rundgang zurück, niemals den Rekord. Er wird nur erhöht oder auf
ausdrücklichen Wunsch mit der separaten Option „Bestmarke löschen“ gelöscht.
Der Speicher ist geräte- und browsergebunden; das Löschen der Browserdaten
kann ihn ebenfalls entfernen.

`node scripts/localize-kunsttitel.mjs /private/tmp/kunst-1000-cache` erstellt
eine separate Titel-Patchdatei. Bestehende eigene Übersetzungen werden bewahrt;
neue fehlende Titel müssen vor Veröffentlichung redaktionell ergänzt werden.

Primärquellen: [Museums-API](https://api.artic.edu/docs/),
[Wikidata](https://www.wikidata.org/),
[Commons-Bildrechte](https://commons.wikimedia.org/wiki/Commons:Reuse_of_PD-Art_photographs).

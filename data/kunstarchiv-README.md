# Kunsttresor: Werkpool und Vorspann

## Erweiterung vom 18. Oktober 2026: gesicherte Hauptwerke

114 Werke ergänzen den unveränderten Bestand von 1807 auf **1921 Werke**:
13 von Leonardo, 24 von Turner, 20 von Rembrandt, 23 von Rubens und 33 von
Vermeer sowie eine ausdrückliche anonyme Ausnahme. Damit enthält das Archiv
18 Leonardo-, je 30 Turner-, Rembrandt- und Rubens- sowie 34 Vermeer-Werke.
Die Auswahl und einzelne belegte Katalogkorrekturen der neuen Einträge stehen
in `kunst-leonardo-turner-2026.json`. Umstrittene Zuschreibungen wie Praxedis,
Mädchen mit Flöte und Salvator Mundi werden nicht neu aufgenommen.

**Der Mann mit dem Goldhelm** (`wd-Q1195610`) ist die einzige zusätzliche
anonyme Ausnahme: Künstler „Unbekannter Künstler“, Datierung 1650–1660,
Gemäldegalerie Berlin. Das ist kein Rembrandt-Werk und keine KI-Fälschung.
Der dauerhaft sichtbare, quellenverlinkte Kuratorhinweis erklärt die 1986
zurückgezogene Zuschreibung. Die Spielvalidierung erlaubt genau diesen
belegten Sonderfall, keine beliebigen neuzeitlichen anonymen Werke.

Die Mona Lisa folgt der Louvre-Datierung 1503–1519. Das Abendmahl wird
ausdrücklich als Secco-Wandmalerei statt Fresko erklärt. Bei übertragenen
Gemälden bleibt der ursprüngliche Holzträger in der Materialbeschreibung
erhalten. Die gegenteilige zweite Künstlerangabe bei Wikidatas Weinbild
(`Q782639`) wird durch die eindeutige Vermeer-Zuschreibung der Berliner
Gemäldegalerie überstimmt; das geschieht nur mit Einzelbeleg im Manifest.
Alle 114 konkreten Commons-Abbildungen wurden auf Public Domain/CC0 geprüft.
Die vollständige Galerie-Datei und der separate KI-Dienst erhalten denselben
Bestand; der frühere Werkpool und bestehende gespeicherte Räume bleiben gültig.

## Erweiterung vom 17. Oktober 2026: 302 weitere Werke

Der Bestand wächst von 1505 auf **1807 Werke**. Alle bisherigen Werk- und
Bilddatensätze bleiben unverändert. Die Ergänzung umfasst 89 Künstler,
darunter 56 weitere Arbeiten Manets, 22 von Toulouse-Lautrec und 26 von Klimt.
Porträts aus der National Gallery London, den Uffizien beziehungsweise dem
Palazzo Pitti und dem Musée d’Orsay bilden einen Schwerpunkt. Weitere
Museumsbestände ergänzen die Auswahl. Die Zahl 302 bezeichnet nicht nur
Porträts: Auch Genreszenen, Landschaften, Allegorien und Stillleben sind dabei.

Die überprüfte Auswahl steht in `kunst-portraets-2026.json`; sie ist keine
automatische Übernahme aller Suchtreffer. `review-kunst-portraits.mjs` sammelt
ausschließlich öffentliche Metadaten in einem externen Arbeitsverzeichnis.
`extend-kunst-portraits.mjs` prüft die explizite Auswahl und erzeugt einen
Append-only-Patch. Es werden keine Bilddateien heruntergeladen oder gebündelt.
Commons-Bildrechte, Künstlerzuschreibung, Datierung und Material werden getrennt
behandelt. Bei mehreren widersprechenden Datierungen ist eine ausdrückliche
Katalogentscheidung nötig; eine gerundete Dekadenangabe wird nicht als exaktes
Jahr verwendet. Qualifizierte Zeitspannen und Näherungen bleiben erhalten.

Wagner nutzt die vom Nutzer vorgeschlagene Renoir-Reproduktion. Klimts
„Hoffnung II“ wird nach dem MoMA-Katalog 1907–1908 datiert; Öl, Gold und Platin
bleiben vollständig genannt. Napoleons Alpenporträt ist ausdrücklich die
Malmaison-Fassung (`Q19801071`), nicht die allgemeine Werkserie; das aktuelle
Louvre-Verzeichnis datiert diese Fassung 1800. Der „Pfeifer“ ist nach Orsay
1866 datiert, „Die Toilette“ nach dessen revidiertem Katalog 1889, nicht 1896.
Die entsprechenden Kataloglinks stehen beim einzelnen Werk.

Nicht alle neuen Werke besitzen eine P135-Stilangabe. Die separat ausgewählten
redaktionellen Einordnungen sind deshalb ausdrücklich als solche markiert;
sie werden nicht als gesicherter Wikidata-Befund oder einzig mögliche
Stilzuweisung ausgegeben. Bei übersetzten Oberbegriffen bleiben Originalterm
und weitere dokumentierte Stilbegriffe erhalten.

Kokoschka wird ohne passende Einzelfreigabe nicht ergänzt. Das vorgeschlagene
Elisabeth-Porträt `Elizabeth1England.jpg` bleibt wegen ausdrücklich umstrittener
Fotorechte und konkurrierender Zuschreibungen außerhalb dieser Auswahl.
Die Entscheidungsquellen stehen ebenfalls im Auswahlmanifest.

## Bildrunden und sichtbare Originale

Die Raumauswahl bevorzugt die am seltensten gezeigten Werke aus der gesamten
gespeicherten Bildhistorie. Zunächst werden noch unbekannte Bilder gewählt;
erst nach Durchlaufen des Bestands beginnt die nächste Stufe. Eindeutige
Titel-, Künstler-, Stil- und Zeitzuordnungen bleiben zwingend. Falls die
verbliebenen Werke keinen vollständigen Raum ergeben, wird mit möglichst
wenigen bekannten Werken aufgefüllt. Technische Vielfalt ist dagegen nur eine
Präferenz: Sie darf keine vermeidbare Bildwiederholung erzwingen. Die Suche
ist begrenzt, um keine langen Blockaden im Browser zu erzeugen.

Ein Neustart löscht die Bildhistorie nicht. Reload und verschlüsselter
Export/Import erhalten sie; ein Import verwirft einen eventuell vorgemerkten
Folgeraum. Vorspann, Startbild und nur vorbereitete Räume verbrauchen keine
Werke. Nicht geladene Quizbilder zählen nicht. Eine geprüfte Nachahmung zählt
für die Rotation des Vorbilds mit, behauptet aber nicht, dass das Original
bereits gesehen wurde. Erst beim Laden des Originals im Kuratorenvergleich
wird auch dessen tatsächliche Anzeige vermerkt.

Nach einem gewonnenen Raum steht das Herz direkt unter dem **Original** im
Fälschungsvergleich. Es wird erst nach erfolgreichem Laden bedienbar. Die
Sammlung enthält ausschließlich die Archiv-ID und Originalabbildung, niemals
die Nachahmung. Auch dieses Lieblingswerk bleibt nach Reload und Dateiübernahme
erhalten. In Rätselansicht und verlorenen Räumen gibt es weiterhin keine Herzen.

Die Edition heißt weiterhin „1000 Kunstwerke · Quiz Edition“. Ihr gezielt
erweitertes Archiv verwendet tatsächlich 1921 spielbare Datensätze; die
Oberfläche zeigt die tatsächliche Größe an. Die Bilder werden nicht
im Repository gespeichert; der Browser lädt sie nach Zustimmung direkt von
Wikimedia Commons und den beteiligten Museumsservern. Die vier Antwortfelder
sind Künstler, Datierung, Stil / Tradition und Material / Technik. Zu jedem
Werk bleibt die Einzelquelle erhalten.

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
- Namentlich bekannte Künstler haben einen zugeordneten Wikipediaartikel
  und sind spätestens 1955 gestorben. Antike Werke ohne überlieferten Namen
  haben stattdessen ausdrücklich `attribution: unknown`, `artistDeath: null`,
  dokumentierte antike Datierungsgrenzen und eine geprüfte Museumsfreigabe.
  „Unbekannter Künstler“ bezeichnet nicht eine gemeinsame Künstlerperson.
- Zusätzlich wird die konkrete Bilddatei anhand ihrer Commons- oder
  Museumsmetadaten auf Public Domain beziehungsweise CC0 geprüft. Bei
  Skulpturen gilt das ausdrücklich für die eigenständigen Fotorechte.
  Das Todesjahr allein und die allgemeine Museumsrichtlinie genügen nicht.
- Vollständige Materialangaben, Werkquelle und Bildlizenz stehen in der
  Auflösung. Stilzuordnungen und vereinfachte Technikbegriffe sind keine
  Behauptung, Kunstwerke hätten stets eine einzig mögliche Einordnung.

Über den Galerie-Bildern stehen die Werktitel ohne Künstlercredit. Bei
Titeln, die den Künstler bereits nennen, dokumentiert `galleryTitle` eine
gekürzte Quizfassung; `title` bewahrt immer die vollständige Quellenfassung.
Verschiedene Namensformen mit derselben persönlichen Wikipediazuordnung
gelten bei der Raumwahl als ein Künstler, ohne gespeicherte Antwortwerte
umzubenennen.

## Werkdateien

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

## Kurator und Glossar

`kunst-glossar.json` ergänzt eine lokale, redaktionell formulierte Wissensbasis:
26 Techniken und 55 im Archiv verwendete Stile, Epochen und regionale Schulen.
Jeder Eintrag enthält Definition, mögliche Erkennungsmerkmale, Zeitkontext,
wichtige Vergleichskünstler, Grenzen der Zuordnung und verlinkte Museumsquellen.
Die Texte sind keine automatische Einzelbildanalyse. Bildträger und Bindemittel
sind anhand einer digitalen Aufnahme oft nicht sicher zu bestimmen.
Gesondert belegte Werkbesonderheiten stehen unter `workNotes`.

`scripts/kunst-kurator.js` erzeugt nach dem Lösen oder Spielende für jedes Werk
eine direkte Rückmeldung. Der Aufbau und die Formulierungen variieren mit dem
Raum und dem Verlauf: erster Treffer, verbesserte Antwort, verlorene richtige
Spur oder letzte Hürde. Eine erneute Anzeige desselben Ergebnisses bleibt stabil.
Die beiden tatsächlich geprüften Antwortstände werden in `attemptLog` gesichert
und bei Werkersetzungen mit übernommen. Alte Spielstände bleiben verwendbar;
fehlende frühere Antworten werden nicht nachträglich erfunden.

Nach der ersten Fehlprüfung gibt es höchstens einen kryptischen Hinweis für
den gesamten Raum, ohne Werk, Stilname oder Jahreszahl. Dafür werden nur große
Zeitwidersprüche bei ausdrücklich dokumentierten Bewegungsanfängen verwendet
(mindestens 40 Jahre Abstand), keine vermeintlich scharfen Epochenränder.
Konkrete Erläuterungen folgen erst in der Auflösung; dort werden auch inzwischen
korrigierte Widersprüche erläutert. Frühe ähnliche Formen können älter sein als
die benannte Bewegung. Ein spätes Datum beweist weder Nachahmung noch Epigonalität.
Eine Häufigkeit im Spielarchiv ist keine Aussage über das gesamte Künstlerœuvre.

Das durchsuchbare Glossar wird erst bei der Auflösung angeboten. Werkquellen,
Bildrechte, erlaubte Downloads und bisherige Wikipedia-Verknüpfungen bleiben
unter den Rückmeldungen erhalten. Die neue Wissensbasis ist eine lokale Datei;
es gibt keine zusätzliche KI-Anfrage, keinen externen Textdienst und keine
Übertragung der Spielerantworten. Prüfung: `node --test tests/kunst*.test.cjs`.

## Vorspann und Bildansicht

Die feste Hundert-Auswahl enthält Werke mit eigenem Wikipediaartikel und breiter dokumentierter
Wikimedia-Rezeption. Die Auswahl wird vor Veröffentlichung anhand ihrer
Titel und Künstler überprüft; Wikimedia-Verknüpfungen sind eine Auswahlhilfe,
kein objektives Maß künstlerischer Bedeutung.

Skulpturen und Reliefs haben `introEligible: false`. Der Vorspann und die
Hero-Auswahl filtern dreidimensionale Werke auch in ihren Ausweichpfaden aus.
Antike Statuen sind ausschließlich vollständig betrachtbare Quizwerke.

Der Vorspann wählt fünf abwechslungsreiche zweidimensionale Werke und zuletzt ein Werk aus
dieser festen Hundert-Auswahl. Die ersten fünf Kapitel dauern je sieben
Sekunden. Im elfsekündigen Finale bleibt das Bild vollständig und unverzerrt
sichtbar (`object-fit: contain`), zunächst ohne Haupttitel. Ab Sekunde 2 des
Finales erscheint „1000 Kunstwerke“. Erst ab Sekunde 6,5 blendet darunter
„Quiz Edition“ in Dancing Script mit verbundenen Buchstaben ein. Die Schrift
liegt im gemeinsamen lokalen Schriftverzeichnis des LearningApps-Repositories
und wird vorab geladen; es gibt keine Verbindung zu einem Schriftanbieter.
Bei reduzierter Bewegung bleiben die Zeitabstände erhalten, ohne Einblendeffekt.
Die Musik blendet über das Finale aus. Ein erneuter Vorspann vermeidet die
unmittelbar vorher gezeigten Werke, insbesondere das vorige Schlussbild.

Beim Öffnen wartet eine bildschirmfüllende Startseite auf einen Klick.
Dieser startet den Vorspann mit eingeschalteter Musik und fordert zugleich
Browser-Vollbild an; ohne Nutzeraktion werden diese Funktionen von Browsern
oft blockiert. Ohne bisherige Bildfreigabe benennt derselbe Startknopf diese
Zustimmung ausdrücklich und erklärt die externe Verbindung davor.
Ein kleinerer zweiter Startknopf überspringt Film und Musik von Anfang an,
öffnet direkt das aktuelle Spiel im Vollbild und erhält eine laufende Runde.
Auch dieser Knopf benennt eine noch fehlende Freigabe externer Kunstbilder.
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

## Persönliche Galerie und Kunstfilm

Nach vollständig gewonnenen Räumen lassen sich ihre vier Werke mit dem Herz
als Lieblingswerke merken. Verlorene und laufende Räume erlauben keine neuen
Likes. Die Galerieprüfung verknüpft jedes Lieblingswerk mit einer gespeicherten
geladenen Bildbegegnung und einer vollständig richtigen Raumprüfung. Das ist
eine nachvollziehbare Belohnung, keine fälschungssichere Serverleistung.

Ab 20 unterschiedlichen Lieblingswerken sind Film und Editor freigeschaltet.
Weniger als 20 (auch nach einer Entfernung) sperren beides wieder. Der Editor
wählt ausschließlich aus der Galerie: 6–10 Werke, automatisch 8. Reihenfolge,
Galerie-Name, Schlussmotto und individuelle Textart/Variante bleiben erhalten.
Aus dem Film entfernte Werke bleiben in der Galerie; aus der Galerie entfernte
Werke werden auch aus der Filmauswahl entfernt. Neue Runden löschen nichts.

`kunst-filmtexte.json` enthält je zwei redaktionelle Impulse zu allen 55 Stilen
und 26 Materialien/Techniken. Diese poetischen Einblendungen sind keine
Bildanalyse. Alternativ sind nur Werkangaben oder eigene Texte möglich.
Eigene Namen, Motto und Texte verlassen den Browser nicht. Es gibt keine
KI-Anfrage für den Film, auch nicht beim Testen oder erneuten Abspielen.

Der Film wartet vor dem Start auf alle decodierten ausgewählten Bilder.
Nicht erreichbare Werke werden angezeigt, nicht stillschweigend ersetzt.
Der bewusste Musikstart ist ein eigener Klick. Die vollständige lokale
Suno-Orchesterfassung (128,4 Sekunden) steuert die Bildzeit über ihre echte
Abspielposition, nicht über unabhängige Timer. Sechs Sekunden Auftakt,
danach zuerst sämtliche Detailfahrten, dann in gleicher Reihenfolge sämtliche
vollständigen Ansichten, zuletzt acht Sekunden Name und handschriftliches
Motto. Unterbrechungen pausieren; keine Zeit läuft unsichtbar weiter.
Reduzierte Bewegung erhält ruhige Bilder. Bei Musikproblemen gibt es eine
ausdrücklich gewählte stille Variante. Anders als beim regulären Vorspann
sind hier auch Fotografien, Skulpturen und Reliefs erlaubt.

Galerie und Film-Entwurf gehören zur vorhandenen AES-GCM-JSON-Spielstandsdatei.
Der Export enthält Bild-IDs, keine Bilder, Musik oder Videodatei. Ältere Dateien
ohne Galerie löschen die vorhandene Sammlung nicht. Neuere Importe vereinigen
die Lieblingswerke und übernehmen nach Bestätigung die Filmgestaltung der
Datei. Beschädigte Sammlungen werden nicht still überschrieben. Eigene Texte
erscheinen über `textContent`, niemals als ausgeführtes HTML.

## Wartung des Werkbestands

Die ursprünglichen 1000 Werkdatensätze bleiben vollständig und unverändert
erhalten. `expansion` dokumentiert die zusätzlichen IDs und den SHA-256
der ursprünglichen Werkdaten. Die Auswahl umfasst weiterhin 100 Schlussbilder; sie wurde am 18. Oktober 2026 um Mona Lisa, Abendmahl, Perlenohrring und Nachtwache ergänzt. Die Gesamtzahl bleibt
ebenfalls unverändert. Neue Räume können alle 1921 Werke verwenden.

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
Werke müssen vollständige Quizangaben, einen Künstlerartikel beziehungsweise
eine explizite anonyme antike Zuschreibung und eine individuell geprüfte
Public-Domain-/CC0-Bilddatei besitzen. Zufall bedeutet
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

Die kuratierte Erweiterung vom 11. Oktober 2026 in `kunst-erweiterung-2026.json`
enthält 67 Einzelwerke: 31 Gemälde, eine Collage, 14 Fotografien,
18 Skulpturen und drei Reliefs. Moderne Beispiele stammen unter anderem von
Kandinsky, Mondrian, Popowa, Beckmann, Kirchner, Marc, Gris und Delaunay;
Fotografien von Stieglitz, Atget, White, Käsebier, Demachy und Evans. Canova und Rodin stehen neben
ägyptischen, persischen, assyrischen, sumerischen, griechischen und römischen
Arbeiten. Keine Mumien, menschlichen Überreste, Särge oder Grabmasken.
Aufnahme/Modell und späterer Druck/Guss bleiben in der Datierung getrennt.
Originalmaterialien und fremdsprachige Katalogdaten bleiben erhalten.

`node scripts/extend-kunst-modern.mjs /private/tmp/kunst-modern-cache` prüft
die zuvor eingeholten öffentlichen JSON-Metadaten und erzeugt ausschließlich
eine append-only Patchdatei außerhalb des Repositorys. Keine KI-Anfrage,
kein Bilderdownload, keine automatischen Änderungen der Anwendungsdaten.
Alle alten 1438 Datensätze bleiben unverändert; neue Quellen müssen
redaktionell geprüft werden. Vor Veröffentlichung offline testen und die
Galerie einschließlich Fotos, Skulpturen und anonymer Werke im Browser prüfen.
Der isolierte KI-Dienst benötigt dieselben neuen öffentlichen Quelldateien;
seine Validierung wird ohne echte Groq-Aufrufe getestet.

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

## Abzeichen und portable Spielstände

`kunsttresor-progress.js` führt zwölf Abzeichen in vier Stufen mit transparenten Bedingungen.
Die Sammlung liegt getrennt vom Rundgang unter `kunsttresor-progress-v1`.
Neustart, Verlust und ausdrücklich zurückgesetzter Highscore löschen sie nicht.
Ein zufälliges `roomToken` identifiziert jeden Raum dauerhaft. Gelöste Räume
werden einmalig protokolliert; wiederholtes Importieren und Zusammenführen
addiert dieselbe Leistung nicht erneut. Nur tatsächlich gewonnene Räume zählen
für Zuordnung, Korrektur und Stil-/Technikvielfalt. Historische Rekorde zählen
für Rundgang-Meilensteine, nicht als erfundene frühere Einzelspiele.
Die höchste Stufe verlangt 25 aufeinanderfolgende Räume im ersten Versuch
innerhalb einer Runde beziehungsweise 500 gewonnene Räume insgesamt. Für die
perfekte Serie werden `runToken`, Elternraum und Raumtiefe geprüft. Getrennte
Runden und importierte Abzweigungen können nicht zu einer falschen Serie
zusammengezählt werden. Eine Korrektur bricht die Serie, widerruft jedoch kein
bereits erworbenes Abzeichen.

`kunsttresor-save.js` exportiert versioniertes JSON mit AES-256-GCM, einem
frischen 96-Bit-IV und authentifizierten Formatangaben. Der Dateiinhalt ist
kein lesbarer Spieltext. Der ausgelieferte Schlüssel ist **nicht geheim**:
Diese rein browserbasierte App kann keine manipulationssicheren Leistungsnachweise
oder vertraulichen Geheimnisse garantieren. Nicht durch bloßes Base64/XOR ersetzen;
Schlüssel und Formatversion für alte Exporte beibehalten beziehungsweise migrieren.

Vor einer Übernahme werden Authentifizierung, Größenlimit, Zähler, Abzeichen und
der Raum gegen das aktuelle Werkarchiv geprüft. Dann bestätigt der Spieler
ausdrücklich den Ersatz seines aktuellen Raums. Bestehende Leistungen werden
ohne Doppelzählung zusammengeführt, der höhere Rekord bleibt. Versuche,
Prüfschnappschüsse und Kuratorhistorie bleiben erhalten; externe Bildfreigaben
werden nicht übertragen. Speicherfehler rollen die drei lokalen Speicherwerte
zurück, bevor der aktive Raum gewechselt wird. Dateien werden nur lokal gelesen,
nicht hochgeladen. Schutzdetails stehen im Spielstandsfenster.

Prüfung: `node --test tests/kunst*.test.cjs`. Zusätzlich Download, Dateiübernahme,
beschädigte Datei, Neuladen, Neustart und Handy-/Tabletansichten im Browser testen.

`node scripts/localize-kunsttitel.mjs /private/tmp/kunst-1000-cache` erstellt
eine separate Titel-Patchdatei. Bestehende eigene Übersetzungen werden bewahrt;
neue fehlende Titel müssen vor Veröffentlichung redaktionell ergänzt werden.

Primärquellen: [Museums-API](https://api.artic.edu/docs/),
[Wikidata](https://www.wikidata.org/),
[Commons-Bildrechte](https://commons.wikimedia.org/wiki/Commons:Reuse_of_PD-Art_photographs).

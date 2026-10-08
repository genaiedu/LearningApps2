# Referenzdaten für das GC Labor

Stand: 8. Oktober 2026. Anwendung: `gaschromatographie-labor.html`.

## Was ist gemessen, was ist simuliert?

Die 24 EI-Massenspektren sind experimentelle Referenzdaten. Die drei Bilder in
`chromatograms/` sind experimentelle Originalchromatogramme. **Die im virtuellen
Labor frei veränderbaren chromatographischen Kurven sind eigene Simulationen**,
keine neu beschrifteten oder digitalisierten Originalmessungen. Originalbilder
werden nur zum Vergleich gezeigt. Es werden keine gemessenen Retentionszeiten
aus EI-Records abgeleitet.

## MassBank: Herkunft und Lizenz

Quelle: [offizielles MassBank-Datenarchiv](https://github.com/MassBank/MassBank-data),
Verzeichnis `Fac_Eng_Univ_Tokyo`, Revision
`befc8a1e2f2aef899747797c081a5d80fab12fe7`.
Import: `scripts/import-gc-data.cjs`. Unveränderte Records stehen in `massbank/`.
`library.json` und `library.js` enthalten die daraus aufbereiteten Diagrammdaten.
Jeder Eintrag nennt Originalgerät, Autorenschaft, Record-ID, Quelllink,
Originaldatei und SHA-256-Prüfsumme. Die App zeigt diese Angaben je Stoff in der
Referenzbibliothek und verlinkt die unveränderte Datei.

Alle verwendeten Records weisen `LICENSE: CC BY-NC-SA` aus. Die Records nennen
keine Lizenzversion; diese Dokumentation ergänzt deshalb keine erfundene
Versionsnummer. Urheberschaft und Lizenz der Daten werden nicht durch die Lizenz
des Anwendungscodes ersetzt. Die bearbeiteten Spektrendaten in `library.json`
und `library.js` werden unter denselben CC-BY-NC-SA-Bedingungen weitergegeben:
Namensnennung, nichtkommerzielle Nutzung, Bearbeitungen unter gleichen Bedingungen.
Für abweichende oder kommerzielle Nutzung muss eine passende Erlaubnis vom
Rechteinhaber eingeholt werden.

Bearbeitungen: Es werden ausschließlich native, einfach geladene EI-Spektren mit
angegebener Elektronenenergie 70 eV und zur Verbindung passender Summenformel
verwendet. m/z werden auf ganze Zahlen gerundet, Originalintensitäten innerhalb
gleicher Bins addiert und relativ zum höchsten Bin auf 100 normiert. Die Peaks
sind keine theoretisch erfundenen Fragmentlisten. Die bibliographischen
Originaldaten bleiben unverändert erhalten.

Die Referenzgeräte sind historische Sektorfeldgeräte (`EI-B`). Das im Lehrgerät
gezeichnete Quadrupol ist ein **anderer** Analysatortyp. Vergleichbare
70-eV-EI-Muster können als Bibliotheksreferenzen dienen; gerätespezifische
Intensitätsunterschiede, Untergrund, Abtastrate und Massendiskriminierung werden
nicht vollständig modelliert. Die App behauptet keine experimentelle Messung
mit dem gezeichneten Gerät.

Weitere Informationen: [MassBank-Dokumentation](https://massbank.github.io/MassBank-documentation/),
[Recordformat und Lizenzfeld](https://github.com/MassBank/MassBank-web/blob/dev/Documentation/MassBankRecordFormat.md),
[MassBank-Publikation](https://doi.org/10.1093/nar/gkaf1193).

## Originalchromatogramme

Die Dateiseiten wurden beim Import auf Lizenzangaben geprüft. Bilder sind nicht
inhaltlich bearbeitet; die App skaliert sie und bietet ein Vergrößerungsfenster.
`chromatograms/sources.json` nennt die genaue Downloadadresse, Originalseite,
Autorenschaft, Lizenz, Beschreibung, Dateigröße und SHA-256-Prüfsumme.
Import: `scripts/import-gc-media.cjs`.

| Lokale Datei | Autorenschaft | Lizenz und Originalseite |
| --- | --- | --- |
| `gc-alcohols.jpg` | Leiem | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), [Commons](https://commons.wikimedia.org/wiki/File:GC_of_alcohols.jpg) |
| `gc-bergamot.png` | E. Melliou, A. Michaelakis, G. Koliopoulos, A.-L. Skaltsounis und P. Magiatis (2009) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), [Commons](https://commons.wikimedia.org/wiki/File:Comparison_of_bergamot_oils_using_GC-MS_analysis_with_enantiomeric_column.png), [Artikel](https://doi.org/10.3390/molecules14020839) |
| `gc-original-kf.png` | Joanna Kośmider | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), [Commons](https://commons.wikimedia.org/wiki/File:Chromatogram_KF.png) |

Beim Alkohol- und KF-Beispiel fehlen vollständige Messbedingungen und/oder
numerische Rohdaten. Sie sind nicht zur quantitativen Referenzkalibrierung
freigegeben worden. Das Bergamott-Beispiel verwendet eine chirale β-DEX-sm-Säule;
die beiden virtuellen Standardsäulen der App sind **nicht chiral**. Gewöhnliche
EI-Spektren erlauben keine allgemeine Unterscheidung von Enantiomeren.

## Lehrmodell

`scripts/gc-core.js` ist ein begrenztes, deterministisch testbares Modell:

- Die Wanderung wird in Schritten von 0,005 min integriert. Der modellierte
  Retentionsfaktor folgt einer exponentiellen Temperaturabhängigkeit mit
  frei festgelegten `k80`-, Enthalpie- und Polaritätsparametern.
- Säulenlänge und Trägergasfluss verändern Durchflusszeit und modellierte
  Effizienz. Innendurchmesser und Filmdicke sind fest (0,25 mm / 0,25 µm).
  Druckabfall, Kompressibilität und reale EPC-Regelung werden nicht gelöst.
- Peaks bestehen aus flächennormierten, leicht versetzten Gaußprofilen.
  Stoffabhängige Modell-Antwortfaktoren, Injektionsstreuung bis ±2,5 %, Tailing,
  Überladung, Drift, Rauschen und ein Sättigungslimit werden berücksichtigt.
- Beim MS-Modell werden die Referenzmuster nach ihrem Gesamtionensignal
  gewichtet und summiert. Ein Scan bei Koelution kann ein Mischspektrum zeigen.
  EICs verwenden die jeweiligen Ionenanteile, nicht den ganzen TIC.
- Integration: Blindwertkorrektur und Trapezregel. Automatische Grenzen sind
  keine validierte Dekonvolution und können Koelution nicht zuverlässig erkennen.
  Manuelle Integration bleibt möglich.
- Quantifizierung: mindestens vier verschiedene Kalibrierstufen einschließlich
  Null; lineare Regression mit Achsenabschnitt. Externes Verfahren oder
  Verhältnisbildung mit internem Standard. Nach Methodenänderung wird eine
  neue Kalibrierung verlangt. Ergebnisse außerhalb des Bereichs werden nicht
  als gültig bewertet. IS wird nach Verdünnung auf 50 mg/L zugesetzt.
- Bibliothekssuche: einfacher Kosinusvergleich innerhalb der 24 Einträge,
  keine Identifikationswahrscheinlichkeit und keine umfassende Spektrendatenbank.

Nicht enthalten: echte Säulendatenbank, reale Stoffdaten für Retentionsindizes,
Lösungsmittelwechselwirkungen, chemische Zersetzung, vollständige Raumladungs-
und Vakuummodelle, Massendrift, echtes Deconvolution-Verfahren, Messunsicherheit
nach einer validierten Labor-SOP. Keine Empfehlung zum Umgang mit den
teils gefährlichen virtuellen Beispielstoffen.

Fachliche Grundlagen: [Agilent zur internen Kalibrierung](https://openlab.help.agilent.com/en/mergedProjects/DataAnalysis/45035999678838923.htm),
[Agilent zu chromatographischen Fehlerbildern](https://www.chem.agilent.com/cag/CABU/gctblshtng.htm),
[UC Davis, Lehrversuch GC-MS](https://chem.libretexts.org/Courses/University_of_California_Davis/CHE_115%3A_Instrumental_Analysis_-_Lab_Manual/Lab_5%3A_Gas_Chromatography_Mass_Spectrometry_%28GSMS%29).

## Lokale Verarbeitung

Spektren, Originalbilder, Simulation und Aufgaben werden ohne externe
Datenbankanfragen verarbeitet. Nur Wikipedia-Fenster laden nach Zustimmung
externe Artikel. Der lokale RDKit-Strukturzeichner wird erst beim Öffnen der
Bibliothek aus `../LearningApps/fonts/` geladen. Es gibt keine CDN-Schriften,
Cloud-Berechnung und Analyse-Tracker. Der Aufgabenfortschritt wird im Browser
gespeichert und kann zurückgesetzt werden. Eigene Messungen gehen beim Neuladen
verloren; CSV und SVG sind deshalb als Exporte verfügbar.

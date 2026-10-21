# Hundegenetik: Fotos und wissenschaftliche Grafik

Die 17 WebP-Fotos wurden am 21. Oktober 2026 von Wikimedia Commons geladen.
Originaldatei, Urheber, individuelle Lizenz, Lizenzadresse, Metadaten und
Änderungshinweise stehen in `../../data/hundegenetik-medien.json` und werden in
der App bei den Fotos, in der Großansicht sowie im Quellenkapitel angezeigt.
Die Dateien wurden verkleinert und konvertiert, nicht inhaltlich retuschiert.
Insbesondere bleiben CC-BY-SA-Dateien unter ihrer jeweiligen CC-BY-SA-Lizenz.
Keine gemeinsame pauschale Lizenz ersetzt diese einzelnen Nachweise.

## Verwandtschaftsgrafik

`parker-2017.svg` adaptiert Abbildung 1 aus:
Heidi G. Parker, Dayna L. Dreger, Maud Rimbault, Brian W. Davis,
Alexandra B. Mullen, Gretchen Carpintero-Ramirez und Elaine A. Ostrander (2017):
Genomic Analyses Reveal the Influence of Geographic Origin, Migration, and
Hybridization on Modern Dog Breed Development. Cell Reports 19, 697–708.
https://doi.org/10.1016/j.celrep.2017.03.079

Original: https://commons.wikimedia.org/wiki/File:Cladogram_of_161_Domestic_Dog_Breeds.png
Lizenz: CC BY 4.0, https://creativecommons.org/licenses/by/4.0/

Änderungen: Geometrie aus dem Original-PDF als Vektoren extrahiert;
maschinenlesbare Beschriftungen separat aufbereitet; Ebenen für Beschriftung
und Stützungszeichen sowie Farbbereiche ergänzt. Interaktive Auswahl, Zoom,
Verschieben und ein Suchindex ergänzt. Kein neu berechneter Baum, keine
zusätzlich erfundenen Verzweigungen. Die Rekonstruktion bleibt von 2017.
Nicht alle Originalbeschriftungen sind als Text gespeichert: einige sind
Zeichenkonturen. Dieser Unterschied wird neben dem Suchfeld erklärt.

Reproduzieren: `tools/build-hundegenetik-tree.py` mit dem Original-PDF und
PyMuPDF. Fotobestand: `tools/build-hundegenetik-assets.cjs` mit Node und sharp.
Diese Werkzeuge laufen nur beim Erstellen, niemals im Browser.

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

## Symbole in den Infografiken

Hund (Dog): originale SVG-Knoten aus der bereits
lokal eingebundenen gemeinsamen Lucide-Bibliothek, ISC.

Fuchs (Fox Face Tail): Lucide Lab / Lucide Contributors, ISC.
https://github.com/lucide-icons/lucide-lab/blob/34b6526d0a67bbe67b8a54b9b101018b1377ef28/icons/fox-face-tail.svg

Originale Pfadgeometrie lokal in `scripts/hundegenetik-grafiken.js` eingebettet;
Größe, Farbe und Liniengewicht an die Komposition angepasst. Vollständiger
Lizenztext: `LICENSE-lucide-lab.txt`. Kein externer Laufzeitabruf.

Mensch (Face, outlined): Google Material Icons, Apache 2.0.
https://github.com/google/material-design-icons/blob/49d4db35df873165d6bd6ba09b063c7dafbac2f4/src/action/face/materialiconsoutlined/24px.svg

Originale Pfadgeometrie lokal in `scripts/hundegenetik-grafiken.js` eingebettet;
Position, Größe und Palettenfarbe angepasst. Die ursprüngliche Linienbreite
von zwei Einheiten wird auch für die benachbarten Fuchssymbole verwendet.
Vollständiger Apache-2.0-Lizenztext bereits lokal unter
`../../fonts/mathjax/LICENSE-MathJax.txt`. Kein externer Laufzeitabruf.

# Hundegenetik – Vielfalt, Verhalten und Gesundheit

Einstieg: `hundegenetik.html`. Ausschließlich GitHub Pages; kein Vercel.
Die App lädt Fotos, Schriften, Symbole und Mathematik lokal; die gemeinsamen
Bibliotheken und Schriften bleiben in `../LearningApps/`.

## Lernweg

Acht erreichbare Kapitel mit schrittweiser Navigation: Fotoerkundung,
Verwandtschaft, Gene und Merkmale, Verhalten, Gesundheit, Exkurs Fuchs,
Training, Quellen. Grundlagen ohne vorausgesetzte Populationsgenetik;
Vertiefungen bleiben eingeklappt. Kein Schülerversuch und deshalb kein
Versuchs-PDF. Keine Anmeldung, externe KI oder Analyseaufrufe.

Die Präsentation nutzt dieselben zehn Aufgaben aus derselben gespeicherten
Runde. Das feste Aa×Aa-Beispiel mit 25 % aa bleibt unverändert. Im
Präsentationsvollbild bleiben nur Vor und Zurück; Esc verlässt die Ansicht.

## Gemeinsame Bildsprache

13 eigene, skalierbare Vektor-Infografiken in `scripts/hundegenetik-grafiken.js`:
DNA-Varianten, Kopienweitergabe, SNP-Abstand, Baum lesen, Körpergröße,
9-%-Erklärungsanteil, Verhaltenseinflüsse, Ahnenvariante, rezessiver Erbgang,
Risikomarker, 24 Erkrankungen, Fuchsselektion und die Grenzen ihrer Deutung.
Die Präsentation und die Kapitel verwenden dieselben Zeichnungsfunktionen,
nicht getrennt gepflegte Nachbauten. Für schmale Ansichten gibt es eigene
Anordnungen statt bloß verkleinerter Querformatgrafiken. Alle Farben folgen
den gewählten Lesepaletten; alle Abbildungen besitzen lesbare Alternativtexte.

Die 23 Einführungs- und Beispielfolien haben jeweils Fotografien, eine
Infografik, das Kreuzungsschema oder den gesetzten Rechenweg. Danach folgen
unverändert die zehn Aufgaben der Runde. Datenabbildungen nennen Studie und
Aussagegrenze; Sequenzen und Erklärungsmodelle sind ausdrücklich schematisch.
Die 13 neuen Grafiken wurden eigens erstellt, keine Studiengrafiken kopiert.
Das separat adaptierte Verwandtschaftsbild von Parker behält seinen Nachweis.
Fotopaare nutzen ihre tatsächlichen Seitenverhältnisse statt gleich breiter
Leerzellen. Im Hochformat stehen sie untereinander. Der frühere Viererblock
ist auf zwei größere Bildvergleiche verteilt. Zusammengehörige Inhalte haben
reduzierte, aber weiterhin klar erkennbare Abstände.

Der redaktionelle Hero führt mit Bildszene, Gestaltungsraster und einer
Fira-/Garamond-Hierarchie ein. „Und doch Hund.“ verwendet in der App und
auf der Titelfolie den echten lokalen EB-Garamond-Kursivschnitt. Dezente
DNA-Zeichnungen strukturieren den Hintergrund. Ihre begrenzte Parallaxe
läuft über passive Scroll-Ereignisse und requestAnimationFrame; bei
reduzierter Bewegung oder ausgeschalteten Animationen bleiben die Ebenen
statisch. In der Präsentation bleibt das Hintergrundmotiv unbewegt.

40 echte Vorlagen, fünf Stufen mit je zwei zufällig ausgewählten Aufgaben.
Zahlen und Antwortreihenfolgen werden einmal je Runde erzeugt. Zwei gültige
Versuche, 1/0,5 Punkte, 20/10 XP. Nach Abschluss vollständige Erklärung.
Zahlenformat und Nachkommastellen stehen am Feld; ±2 % inklusive Grenzen,
exakte Null gesondert erklärt. Keine Scheinrechnungen bei Verständnisfragen.

## Wissenschaftliche Grenzen

- SNP-Abstand, Heterozygotie und Populationsvielfalt nicht gleichsetzen.
- Keine ungemessene Chihuahua-Mastiff-Zahl als Studienergebnis ausgeben.
- Die 9 % betreffen den Rassen-Erklärungsanteil, nicht Gene gegen Erziehung.
- 40 % genomischer Inzuchtwert sind kein Anteil defekter DNA.
- Ein einfacher rezessiver Modell-Erbgang wird ausdrücklich nicht als DCM
  bezeichnet. Variantenbefund, Stoffwechselmerkmal und klinische Folge trennen.
- Rassehunde/Mischlinge: konkrete Daten und Auswahlgrenzen statt Pauschalurteil.
- Fuchs: andere Art, Farmvorgeschichte, genetische Verhaltensauswahl,
  umstrittene Verallgemeinerung zum Domestikationssyndrom. Kritik und Replik.
- Verwandtschaftsbild: Originalgeometrie von 2017; keine neue Genomanalyse.
  Keine Verzweigung als gesicherte historische Elternrasse behaupten.

## Zustand und Datenschutz

Nur `hundegenetik:round:v1` und `hundegenetik:view:v1` in localStorage.
Gesperrter Speicher darf die App nicht blockieren. Der Neustart verändert
keine fremden Daten. Der Einstieg erklärt die lokale Bildbereitstellung und
das Hosting; Fotos sind abschaltbar, ohne Lernfunktionen zu verlieren.
Keine Wikimedia-Anfragen zur Laufzeit. Lizenzen bleiben pro Foto erhalten.

## Prüfung

`node --test tests/hundegenetik.test.cjs`

`node tests/hundegenetik-browser.cjs [URL]` benötigt Playwright/Chromium.
Browserprüfung: alle Kapitel, lokale Ressourcen, echter Formelsatz, Fotos,
Baum-Zoom/Ebenen, beide Fehlversuche, Rundenerhalt, Neustart, alle fünf
Paletten hell/dunkel, gesperrter Speicher und Vollbildfolien.

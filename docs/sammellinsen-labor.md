# Sammellinsen-Labor

Sekundarstufe I, `sammellinsen-labor.html`; Veröffentlichung auf GitHub Pages, beide LearningApps-Übersichten unter Physik/Optik. Kein Vercel. Gemeinsame lokale Schriften, Lucide und MathJax aus dem Nachbarrepository, kanonische Atelier-Paletten und bestehende Unterrichts-/Formularbausteine aus `styles/kraefte-labor.css`; optikspezifische Ergänzungen in eigener CSS-Datei.

## Modell und Unterricht

- Vom Nutzer bestätigt: Brennweite 10 cm. 70-cm-U-Profilbank mit Reitern, Lampe hinter einer Perl-Eins, Sammellinse und Mattscheibe. Die kleinen Linseneinsätze der Eins gehören zur Beleuchtung, nicht zur untersuchten abbildenden Linse.
- Ideales Dünnlinsenmodell in Luft, achsennahe Strahlen. g/b sind Entfernungen, G/B positive Höhen, A positiver Abbildungsmaßstab. Für Rechenaufgaben nur reelle Bilder. Virtuelle und unendlich entfernte Bildebenen werden unterschieden, nicht als scharfes Schirmbild ausgegeben.
- Modell: Gegenstandsebene bei 6 cm, Schirm maximal bei 68 cm, Platz zwischen Gegenstand und Schirm maximal 62 cm. g von 5–45 cm, Schirmweite in 0,1-cm-Schritten. Echte mechanische Geräteabmessungen sind nicht exakt vorgegeben.
- Geometrische Defokussierung schematisch, keine Beugung/Farbfehler. Abweichung bis 1 mm von der idealen Bildebene gilt nur im Modell als scharf genug zum Protokollieren; keine Behauptung über reale Messunsicherheit. Lichtpunkte zu einer Eins angeordnet, umgekehrtes reelles Bild auf der Mattscheibe.
- Vierseitiges A4-PDF für die Papierarbeit vor der App. Eigene scharfe Anordnungen und g/b messen, Bildlage skizzieren, Diagramm zeichnen, f aus Messpaaren bestimmen und vergleichen. Messfelder bleiben leer. Lehrkraft prüft Beleuchtung und Aufbau; kein Blick in Lichtquelle oder gebündelte Sonne.
- Feste Beispielaufgabe f = 10 cm, g = 15 cm, b = 30 cm. Dieselbe Aufgabe in App und Präsentation. 40 Vorlagen, zehn pro Runde, zwei Aufgaben pro Stufe. Präsentation und Training verwenden denselben Rundendatensatz.
- Jede Zahlenantwort nennt Nachkommastellen und zeigt ein graues neutrales Formatbeispiel, passend zur Eingabeeinheit. ±2 % relativ zum ungerundeten SI-Ergebnis, zwei gültige Versuche, danach vollständige mathematische Lösung. 1/0,5 Punkte, 20/10 XP, sechs klar definierte Abzeichen ohne Punkteverdopplung.
- Lokaler Zustand und Darstellung; keine Anmeldung, keine Laufzeit-KI, keine externen Medienabrufe. Quellenlinks öffnen nur nach einem Klick. Historischer Einstieg mit NASA/Library of Congress; Fachgrundlagen LMU, OpenStax und LEIFIphysik.

## Zentrale Formelsammlung

App und lokaler Formeldialog verlinken `../LearningApps/physik-formelsammlung.html#phys-optik` in einem neuen Tab. Ergänzt wurden dort Umstellungen, positiver Abbildungsmaßstab A, Bankgeometrie, Mindestabstand 4f und vertauschte scharfe Linsenstellungen. Gerichtete Höhen heißen y_G/y_B und bleiben von den positiven Beträgen G/B getrennt. Das Kräfte-Labor verlinkt entsprechend `#phys-kraefte`; Kraftbetrag und gerichtete Komponente sind ausdrücklich unterschieden.

## Prüfung und Export

`node --test tests/sammellinsen.test.cjs` benötigt jsdom und prüft 1000 reproduzierbare Runden mit unabhängiger Ergebnisrechnung, Poolabdeckung, Progression, Modellgrenzen, Toleranz, Rundung, zwei Versuche, Protokoll, Speicherung und Reset.

`node tests/sammellinsen-browser.cjs [URL]` benötigt Playwright/Chrome. Es prüft alle zehn Aufgaben, drei Bildgrößen, die Grenzfälle, vier Fenstergrößen, zehn Farbvarianten, die Vollbildfolien, echte Formelausgabe und den Themenlink zur zentralen Sammlung. Screenshots bleiben temporär. `CHROME_PATH` kann eine andere lokale Chromium-Datei wählen.

Bei lokalem Server im gemeinsamen Elternordner erzeugt `node tools/build-sammellinsen-pdf.cjs` das PDF aus `material/sammellinsen-arbeitsblatt.html`. Export wartet auf lokale Fonts und Formelsatz und verwirft Überläufe. Zusätzlich jede endgültige PDF-Seite rendern und visuell prüfen. Fonts sind eingebettet, Formeln und Diagramme vektorbasiert.

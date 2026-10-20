# Kräfte-Labor

Einstieg für die Sekundarstufe I: `kraefte-labor.html`. Veröffentlichung über GitHub Pages; Eintrag in beiden Physik-Übersichten des benachbarten Repositories LearningApps.

## Unterricht und Modell

- Vor dem digitalen Vergleich den echten Federversuch mit dem sechsseitigen Arbeitsblatt durchführen. Die realen Messwerte und die reale Federkonstante bleiben unbekannt; es sind keine simulierten Messergebnisse vorgegeben.
- Die Lehrkraft muss die Federn und die zulässige Belastung prüfen. Höchstens 30 g einschließlich Massehalter und Haken. Geeignete parallele Federn vorsichtig ineinanderschieben und trennen, bei Widerstand stoppen; alternativ gemeinsame Endpunkte nebeneinander.
- Simulation: statisches lineares Modell, masselose Federn/Haken, Einzelfeder 5 N/m, Reihe 2,5 N/m, parallel 10 N/m; 0–30 g, ganzzahlige Schritte. Keine Behauptung, dass beliebige reale Federn 30 g vertragen.
- Ortsfaktor 9,81 N/kg, alle Rechenschritte in SI, Antwortsatz mit passend skalierter Einheit. Haltekraft und Gewichtskraft an derselben Masse sind kein Wechselwirkungspaar des dritten Newtonschen Axioms.
- 40 Aufgabenvorlagen, zehn pro Runde in fünf Stufen; Zahlen und Auswahl über einen lokal gespeicherten Zufallsstartwert. Zwei gültige Versuche, danach Musterlösung; 1 beziehungsweise 0,5 Punkte für richtige Antworten, kein erneuter Punktegewinn bei abgeschlossenen Aufgaben.
- 57 Präsentationsfolien mit denselben zehn Aufgaben und Zahlen wie im Training. Das feste Beispiel (20 g, 40 mm, D = 4,905 N/m) bleibt unverändert.

## Daten und Medien

Nur eigener Fortschritt und Darstellung werden lokal gespeichert. Keine Konten, keine Laufzeit-KI. Schriften, MathJax, Lucide und ihre Lizenzen kommen aus dem gemeinsamen lokalen Bestand `../LearningApps/fonts/`.

Vor dem Lerninhalt erscheint ausschließlich der Disclaimer mit den gleichwertigen Startmöglichkeiten „Ohne Bilder starten“ und „Mit Bildern starten“. Der App-Bereich ist bereits im HTML verborgen und nicht bedienbar. Vier Wikimedia-Bilder werden erst nach ausdrücklicher Freigabe für diesen Besuch eingebunden. Keine externen Bildabrufe, Vorschaubilder oder Vorverbindungen davor. Abruf mit `crossorigin="anonymous"` und `referrerpolicy="no-referrer"`; Erklärungen und Simulation bleiben ohne Fotos benutzbar. Die Freigabe lässt sich später unter „Darstellung“ ändern. Ausschalten entfernt Bilder und unterbindet weitere Abrufe; bereits übertragene Zugriffsdaten sind nicht rückholbar. Quellen, Urheber und Lizenzlinks stehen an jedem Bild. Die Freigabe wird nicht dauerhaft gespeichert; beim Neuladen erscheint die Startauswahl erneut, gespeicherte Aufgaben und Messwerte bleiben erhalten. Direkte Abschnittslinks werden erst nach der Startauswahl angesprungen.

Bilddaten stehen in `scripts/kraefte-inhalte.js`: Godfrey Knellers Newton-Porträt (gemeinfrei, aufgehellte Commons-Fassung), Kugelschreiberfeder von Santeri Viinamäki (CC BY-SA 4.0), Fahrzeugfeder von Trekphiler (CC BY 3.0), Wäscheklammer von Eloquence (gemeinfrei). Die Commons-Vorschaudateien werden ohne eigenen Bildausschnitt dargestellt.

Das Newton-Porträt erhält im Lerntext und auf den Folien einen eigenen Hochformat-Rahmen im Seitenverhältnis 2218 : 2671. Kein Querformat-Kasten mit gefüllten Seitenflächen; die Bildunterschrift darf unabhängig davon die verfügbare Textbreite nutzen.

Fachliche Quellen: Newton Project der Universität Oxford (Axiome in den Principia, 1687), Universität Leipzig (Newtonsche Axiome), KIT-Praktikumsanleitung „Lineare Schwingungen“ (Federkonstanten, Reihe und parallel). Verlinkt im Lerntext beziehungsweise im Quellenfenster.

## Prüfung und PDF

`node --test tests/kraefte-core.test.cjs tests/kraefte-ui.test.cjs` benötigt für die UI-Prüfung jsdom. Der Kern prüft 1.500 verschiedene Runden, die garantierte Progression, Zahlen und SI-Umrechnungen, zwei Versuche, das feste Beispiel und alle Belastungen/Anordnungen. Die UI prüft Speicherungssperren, Reset, Vollbild-Ersatz und die zustimmungsabhängigen Bildabrufe.

`node tests/kraefte-browser.cjs [App-URL]` benötigt Playwright und Chrome (alternativ `CHROME_PATH`). Prüft einen kompletten Durchlauf, Fortschritt nach Neuladen, alle sechs Abzeichen, drei Messreihen, fünf Paletten jeweils hell/dunkel bei vier Fenstergrößen und alle Folien bei 1280 × 720 sowie 390 × 844. Bilder sind dabei aus; deren tatsächliches Laden und die Kontaktanimation wurden zusätzlich im Browser kontrolliert. Screenshots gehören nicht ins Repository.

`node tests/kraefte-entry-browser.cjs [App-URL]` prüft zusätzlich den vorgeschalteten Disclaimer (vier Fenstergrößen, alle zehn Farbvarianten), Tastaturfokus, Direktlinks, beide Startmöglichkeiten, die nachträgliche Bildfreigabe und das echte Porträtformat im Browser.

PDF-Quelle: `material/kraefte-arbeitsblatt.html`; fertiger Download: `material/kraefte-arbeitsblatt.pdf`. Bei lokalem Server im gemeinsamen Elternverzeichnis:

```sh
node tools/build-kraefte-pdf.cjs http://127.0.0.1:8878/LearningApps2/material/kraefte-arbeitsblatt.html
```

Der Export benötigt Playwright und Chrome. Er wartet auf lokale Schriften/MathJax und lehnt Überläufe in die Seitenfußzeile ab. Alle sechs PDF-Seiten zusätzlich visuell prüfen. Der aktuelle Export enthält eingebettete Fira-Sans-Schriften und lokale MathJax-SVG-Formeln.

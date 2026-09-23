# LearningApps2

Dieses Repository enthält neue, eigenständige Lernanwendungen. Die öffentliche
Materialübersicht bleibt im Repository
[LearningApps](https://github.com/genaiedu/LearningApps) unter `materialien.html`.
Jede hier veröffentlichte App erhält dort einen Eintrag in der passenden Rubrik.

## Gemeinsame Gestaltung

Neue Apps laden `styles/shared.css`. Die Datei enthält Schriftzuweisungen,
Farben, Abstände, Seitenlayout, Karten, Schaltflächen und Formularstile. Eine App
ergänzt nur ihre fachlichen oder interaktiven Sonderstile in einer eigenen CSS-Datei.

```html
<link rel="stylesheet" href="styles/shared.css">
<script src="../LearningApps/fonts/lucide.min.js" defer></script>
```

Die gemeinsamen Schriftdateien und Lucide werden auf GitHub Pages direkt aus
`https://genaiedu.github.io/LearningApps/` geladen. Darum liegen hier keine
zweiten Kopien. Die beiden Projektseiten müssen dafür unter demselben Host
`genaiedu.github.io` veröffentlicht sein. Relative Pfade zeigen in das
Nachbarverzeichnis `LearningApps` (in CSS relativ zum CSS-Ordner). So funktionieren
auch lokale Vorschauen, wenn beide Repositories nebeneinander liegen. Eigene
Bilder, Daten und Spezialdateien einer App gehören in dieses Repository.

Für lokal entpackte Offline-Pakete sind die gemeinsamen Dateien zusätzlich im
Paket nötig. Die Webversion benötigt beim ersten Laden eine Internetverbindung.

## Neue App eintragen

1. HTML-Datei und benötigte App-Dateien hier hinzufügen; `styles/shared.css`
   einbinden.
2. Die App lokal und anschließend unter ihrer GitHub-Pages-Adresse prüfen.
3. In `LearningApps/materialien.html` eine Karte in der passenden Fachrubrik mit
   dem vollständigen Link `https://genaiedu.github.io/LearningApps2/DATEI.html`
   ergänzen.

`datenschutz.html` beschreibt GitHub Pages und die lokale Sitzungsspeicherung.
Die Schülerseiten enthalten keine Rückverlinkung zur Materialübersicht.

## Drei Tore – Moderatorenproblem

`moderatorenproblem.html`: beliebig wiederholbare Vorführung mit Vollbild und
iPad-Fallback, gefolgt von zehn Wechsel- und zehn Bleibe-Versuchen. Die Erklärung
erscheint erst nach diesen Versuchen auf Wunsch. Fünf Gewinne und zehn Bewegungen
desselben Zonks werden als SVG/CSS animiert. Bewegungsreduktion wird unterstützt.
Es gibt weder echte Einsätze noch echte Gewinne.

Der Moderator öffnet stets ein anderes Nietentor und bietet immer den Wechsel
an. Zwei Nieten und ein Gewinn werden pro Runde unabhängig ausgelost. Die
Motivreihenfolge ist unabhängig vom Gewinn. Das Protokoll bleibt nur im
Sitzungsspeicher des Tabs und kann als Text exportiert werden.

Prüfung der Spielregeln: `node --test tests/monty-engine.test.cjs`.

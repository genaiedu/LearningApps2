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
<script src="/LearningApps/fonts/lucide.min.js" defer></script>
```

Die gemeinsamen Schriftdateien und Lucide werden auf GitHub Pages direkt aus
`https://genaiedu.github.io/LearningApps/` geladen. Darum liegen hier keine
zweiten Kopien. Die beiden Projektseiten müssen dafür unter demselben Host
`genaiedu.github.io` veröffentlicht sein. Pfade zu gemeinsamen Ressourcen
beginnen mit `/LearningApps/`; eigene Bilder, Daten und Spezialdateien einer App
gehören in dieses Repository.

Für lokal entpackte Offline-Pakete sind die gemeinsamen Dateien zusätzlich im
Paket nötig. Die Webversion benötigt beim ersten Laden eine Internetverbindung.

## Neue App eintragen

1. HTML-Datei und benötigte App-Dateien hier hinzufügen; `styles/shared.css`
   einbinden.
2. Die App lokal und anschließend unter ihrer GitHub-Pages-Adresse prüfen.
3. In `LearningApps/materialien.html` eine Karte in der passenden Fachrubrik mit
   dem vollständigen Link `https://genaiedu.github.io/LearningApps2/DATEI.html`
   ergänzen.

Vor dem Aktivieren von GitHub Pages müssen die rechtlichen Hinweise zum
tatsächlichen Hosting passen. Die derzeitige Datenschutzerklärung des ersten
Repositories beschreibt Vercel und deckt eine neue GitHub-Pages-Seite nicht
automatisch ab.

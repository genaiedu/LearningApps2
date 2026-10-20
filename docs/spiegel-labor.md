# Spiegel-Labor

Eigenständiges interaktives Unterrichtsangebot für Sekundarstufe I, vor dem Sammellinsen-Labor einsetzbar. Keine Linsenkenntnisse, kein praktischer Schülerversuch, kein PDF-Arbeitsblatt. Veröffentlichung auf GitHub Pages; in beiden LearningApps-Übersichten unter Physik/Optik vor dem Linsenlabor einordnen. Kein Vercel.

## Physik und didaktische Reihenfolge

- Reflexion und Lot zuerst; Einfalls- und Reflexionswinkel ausdrücklich zum örtlichen Lot. Hohl- und Wölbspiegel, Kugelfläche, Scheitel S, Kugelmittelpunkt C, Radius R, Fokus und Bildarten werden neu erklärt.
- R ist immer ein positiver Kugelradiusbetrag. Achsennah f ≈ R/2 beim Hohlspiegel, f ≈ −R/2 beim Wölbspiegel. g > 0 für den wirklichen Gegenstand vor dem Spiegel; b > 0 reell davor, b < 0 virtuell dahinter. G/B positive Höhenbeträge, A = |b/g|. Orientierung zusätzlich in Worten.
- Bildmodul: achsennahe Spiegelgleichung, fünf Hohlspiegelfälle einschließlich g = f ohne endliche Bildweite. Wölbspiegel für alle g > 0 virtuell, aufrecht, verkleinert. Tatsächliche Lichtwege mit Pfeilen; rückwärtige Verlängerungen gestrichelt. Der Spiegelumriss ist bewusst überzeichnet; sehr große Bildlagen liegen außerhalb des Ausschnitts und bleiben numerisch beschrieben.
- Formmodul: tatsächliche ideale Flächengeometrie und v′ = v − 2(v·n)n für achsenparalleles Licht. Kugel-Hohlspiegel x = −R + √(R² − y²), Parabel x = −y²/(2Rₛ). Die Kugelnormalen zeigen zu C. Beim Parabol-Hohlspiegel schneiden alle achsenparallelen Strahlen bei x = −Rₛ/2 die Achse; bei der Kugel variiert der Achsenschnittpunkt mit der Strahlenhöhe.
- Die Parabel besitzt keinen überall gleichen Kugelradius. Rₛ ist ihr örtlicher Scheitelkrümmungsradius. Keine Behauptung allgemeiner Fehlerfreiheit bei schrägem Einfall oder nahen Gegenständen. Beugung und räumliche Abbildungsfehler nicht simuliert. Öffnung als h/R beziehungsweise h/Rₛ bezeichnet, nicht als voller Durchmesser.
- Standardmäßig eingeklappte Herleitung f ≈ R/2 aus Reflexion und kleinen Winkeln. Kurzgeschichte mit Newton 1668; Quellen Royal Museums Greenwich, OpenStax und NASA. Nur angeklickte Quellenlinks führen nach außen, keine externen Medien.

## Aufgaben und gemeinsame Bausteine

40 echte Vorlagen, zehn pro Runde, fünf Stufen. Jede Runde garantiert Grundlagen, Oberflächenform, Winkel, Radius, Hohl- und Wölbspiegel, Bildmaßstab, Bildhöhe, Modellgrenzen und Transfer. Auswahl und Zahlen reproduzierbar mit gespeichertem Seed; derselbe Rundendatensatz in Präsentation und Training.

Festes Beispiel: Kugel-Hohlspiegel R = 20 cm, g = 30 cm, f ≈ 10 cm, b = 15 cm. Dasselbe Beispiel in App und Präsentation. Zwei gültige Versuche, ±2 % relativ zum ungerundeten SI-Ergebnis einschließlich Grenzen, 1/0,5 Punkte und 20/10 XP. Rundung und neutrale graue Platzhalter folgen der Eingabeeinheit. Winkelrechnungen in Radiant; Antwort gegebenenfalls in Grad. Sechs sachliche Abzeichen.

Gemeinsame Fira-/Garamond-Schriften, Lucide und MathJax aus dem Nachbarrepository; allgemeine Unterrichtsbausteine aus kraefte-labor.css. Eigene Spiegelgrafik und begrenzte CSS-Selektoren greifen nicht in die Formelausgabe ein. Fünf Atelier-Paletten jeweils hell/dunkel, Graphit hell als Standard. Präsentation nativ im Vollbild mit ausschließlich Vor/Zurück; Fensterfallback und Escape. Neustart bestätigt und nur app-eigene Daten zurückgesetzt.

Jeder Formelsammlungs-Verweis öffnet direkt die vollständige zentrale Physik-Formelsammlung unter ../LearningApps/physik-formelsammlung.html#phys-optik. Dort Spiegelgleichung, Umstellungen, Winkel, Radiuskonvention und Parabel ergänzt; gemeinsam eingebundene Cache-Version in Standalone-Sammlung und Q1-Bootcamp aktualisieren.

## Prüfung

node --test tests/spiegel-labor.test.cjs benötigt jsdom. Prüft 1000 Runden unabhängig, Poolabdeckung, Progression, Vorzeichen, alle Bildfälle, exakte Oberflächenreflexion, Parabelfokus, Kugelfehler, Rundung/Toleranz, Speicherung, gesperrten Speicher und Neustart.

node tests/spiegel-labor-browser.cjs [URL] benötigt Playwright/Chrome. Prüft alle drei Module, echte Slider-/Tastaturbedienung, alle zehn Aufgaben, 40 Vorlagen mit tatsächlichem MathJax, vier Fenstergrößen, zehn Farbvarianten, sämtliche Vollbildfolien, direkte Formelsammlungs-Links, lokale Ressourcen und Wiederherstellung. Screenshots ausschließlich temporär. CHROME_PATH kann eine andere lokale Chromium-Datei wählen.

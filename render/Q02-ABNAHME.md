# Q02 – reproduzierbare Abnahme für Claude

Die GitHub-CI ist blockiert. Die folgenden Befehle sind lokal auszuführen. **Bilder und Performancezahlen sind in diesem Branch noch nicht erzeugt bzw. gemessen.** Das Skript sammelt Messwerte, es behauptet keine bestandene Abnahme.

## Automatische Geometrie- und Regressionstests

```bash
cd render
npm ci
node tests/q02-qualitaet.cjs
node pruef-gestaltung.js --alle --q02 > out/q02-gestaltung.txt 2>&1
grep -E 'Offene Gleisenden|Oberleitung ohne Gleis|Fahrzeuge außerhalb|Dachaufbauten außerhalb|Wiederholung über 15 %' out/q02-gestaltung.txt
```

**Soll:** Alle fünf Q02-Zeilen haben für **jede** der 112 Städte den Wert `0` (Grenzwert jeweils `0`), Exitcode `0`. Bei Abweichungen stehen `Q02-Verstoß`-Einträge mit Koordinaten bzw. Mustern in der Ausgabe. `pruef-gestaltung.js` meldet auch die bisherigen Gestaltungsregeln; deren bestehende Baseline separat vergleichen.

## Bildkataloge – gleiche Kamera und gleiche Daten

```bash
node render-katalog.js q02-verkehr out/q02-verkehr-nachher.png
node render-katalog.js q02-daecher out/q02-daecher-nachher.png
node render-katalog.js q02-flaechen out/q02-flaechen-nachher.png
node spiel-render.js --bundle
node aufnahme-q02-start.cjs
```

**Soll:** Chemnitz ohne frei schwebende Oberleitungen; Essen Hbf nur Züge auf Bahnsteiggleisen; sechs unterschiedliche Dachansichten, jeweils vollständig auf dem Dach; Hannover mit verschiedenen Lauben, Beetgrößen, Feldschlägen und Wohnfassaden. `out/q02-start/messung.json` nennt Soll- und Istzeitpunkte der Aufnahmen **0, 500, 1000, 2000 und 3000 ms**. Wenn der Browser in der Zwischenzeit blockiert, dürfen die Istwerte von den Sollwerten abweichen; diese Abweichung nicht verschweigen.

Für **Vorher** den aktuellen `main` in ein zweites Worktree auschecken, die **vier rein lesenden Katalogmodule** `q02-hilfe.js`, `q02-verkehr.js`, `q02-daecher.js` und `q02-flaechen.js` aus diesem Branch in das Worktree kopieren. Sie benutzen im Worktree die dortige alte Generatorimplementierung. Die drei Kataloge mit Ausgabe `-vorher.png` erneut rendern. Das Aufnahmeskript kann ebenso separat kopiert werden, es greift auf den dortigen Spielstand zu. Die Worktree-Kopien **nicht committen**.

## Budget und Laufzeit

```bash
node spiel-render.js --nur-start
node spiel-render.js --nur-karte
node spiel-render.js --nur-haus
node tests/mobil-smoke.js
node render-katalog.js alle-haeuser out/q02-alle-haeuser.png
```

Alle Abnahmen für `main` und diesen Branch mit denselben Einstellungen, Seeds, Viewports und Browserbedingungen wiederholen. **Kein messbarer Leistungsrückschritt gegenüber `main`** bei Teilezahl, Draw Calls, Dreiecken und Renderdauer. **Maximal 2.500 Teile** je gewöhnlichem Haus, **8.000 Teile** je Warenhaus. Zum Vergleich enthält der ursprüngliche TestFlight-Befund eine Berliner Momentaufnahme mit 965 Draw Calls, 4.480.868 Dreiecken und 228.599 Teilen; das ist **kein allgemeingültiger Grenzwert** und ersetzt keinen gleich konfigurierten Baseline-Vergleich.

## Manuelle Endabnahme

- Straßenbahn Chemnitz: kein Fahrdraht außerhalb von Gleisbereichen, erkennbare Abschlüsse und keine abgeschnittenen Fahrzeuge.
- Hbf Essen: Wagen ausschließlich auf Gleisen, die einen Bahnsteig erreichen; kein Zug über Gleisende.
- Dachaufbauten: Lüftung, Aufzugsüberfahrt, Oberlicht, Solarfeld und Dachgarten prüfen, keine schwebenden Anlagen.
- Hannover: mindestens sechs Laubenformen, unregelmäßige Parzellierung, unterschiedliche Felder, Wege und Wohnhausfarben.
- Spielstart auf iPhone und im Headless-Browser: Ladebild endet erst, wenn Plan und Grundkacheln aufgebaut sind, keine plötzlichen Geometriesprünge im sichtbaren Bereich.

**Merge erst nach lokaler Prüfung und dokumentierten Istwerten.** Die geblockte CI nicht als bestanden markieren.

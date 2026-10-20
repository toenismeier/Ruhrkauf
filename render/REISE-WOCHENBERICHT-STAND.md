# Stand – Spielreise und Wochenabschluss (20.10.2026)

Branch: `feat/spiel-reise-woche`, Ausgangspunkt `main`.
Auftrag: `auftraege/spiel-reise-und-wochenabschluss.md`.

## Implementiert

- Eigene UI-Module `src/ui/reise.js` und `src/ui/wochenbericht.js`, Gestaltung in `src/ui/reise-woche.css`; Engine-Berechnung verbleibt in der Engine.
- Bahnhofs-Pin über `slot:bahnhof`, Bahnhofspanel mit Kit-Porträt, Schreibmaschinentext, Suchfeld, Formatanzahlen und schematischer Deutschlandkarte mit einem Punkt pro Reisestadt; zuletzt besuchte Ziele werden im UI-Spielstand gespeichert und zuerst sortiert.
- Stadtwechsel mit ICE-SVG, dreifach wiederverwendeten, vorgerenderten Kit-Motiven, Parallaxe, Streckenleiste und kreisförmigem Ein-/Ausblenden. Aufbau der Zielstadt beginnt innerhalb des Übergangs; der Bahnhof wird vor der Schlussblende fokussiert.
- Der bisherige Stadt-Selektor ist weiterhin im Menü als direkte Wahl verfügbar.
- Bestätigungsdialog mit Fristablaufwarnung; Ergebnisse aus `E.cockpit(s)`, Vorwochenvergleich in Euro/Prozent, negativer EBITDA rot; 11-Sekunden-Zähler mit Abbruch per Antippen, Optionen voll / kurz / aus sowie reduzierte Animation.
- `Der Handelsbote` mit tatsächlich neuen Presse-/Konkurrenzmeldungen der abgeschlossenen Woche; maximal drei neu hinzugekommene Angebote/Entscheidungen als sequentielle Bottom-Sheets, Sprung in den vorhandenen Posteingang.
- Der bisherige Wochenstreifen wird nur noch im Bot-Modus ausgegeben.
- `spiel-render.js` nutzt ohne ausdrückliches `--mit-animation` den URL-Prüfmodus `ohne-animation`. Neuer Schalter `--nur-reise-woche` testet Essen → Düsseldorf, Bahnhofsfokus, Engine-Zahlen, Zeitung, Vorfälle und JavaScript-Fehler; `--mit-animation` kann Bildfolgen in 100-ms-Schritten unter `render/bilder/reise/` und `render/bilder/wochenbericht/` erzeugen.

## Ausstehende Abnahme

**Durchgeführt:** GitHub-Diff gegen `main` geprüft (nur Dateien unter `render/`); statische JavaScript-Syntaxprüfung der drei veränderten Skripte und der neuen UI-Module ohne Parse-Fehler.

**In dieser Umgebung nicht ausgeführt:** Dependencies installieren, Typecheck, Jest, Browser-/Chromium-Rendering, `pruef-staedte`, visuelle Bildabnahme, Timing gegen ±10 %, 60 FPS auf iPhone. Kein CI-Lauf ausgelöst, weil Actions-Kontingent laut Auftrags-README blockiert ist.

Ausführen, sobald ein lokaler Checkout mit Chromium zur Verfügung steht:

```bash
cd engine
npm ci
npm run typecheck
npm test
cd ../render
npm ci
npm run build
node spiel-render.js --nur-reise-woche --ohne-animation
node spiel-render.js
node pruef-staedte.js
# Für Timing und die Bildfolgen:
node spiel-render.js --nur-reise-woche --mit-animation
```

Die eigentlichen Bilder, gemessenen Zeitreihen und Hardware-FPS sind daher noch **nicht als bestanden zu bewerten**. Die 100-ms-Folge wird erst beim optionalen Lauf erzeugt; sie liegt nicht im Branch.

## Fachliche und gestalterische Grenzen

1. Die Engine stellt keine eigenständigen Zahlungsstromwerte für operatives Geschäft, Investitionen und Finanzierung bereit. Nur Nettobewegung (`cash` vor/nach der Woche) und Cash-Bestand sind belastbar; fehlende Positionen bleiben explizit unbelegt.
2. Die Deutschlandkarte ist ein schematisches Regionalbild. Die bestehenden Stadtmodelle enthalten keine präzisen Standortkoordinaten oder Bundeslandwappen. Statt erfundener Wappen zeigt die Strecke Ortskennzeichen und Stadtnamen.
3. Die drei Reisemotive sind vorhandene Kit-Katalogbilder, keine speziell komponierten Flug-/Fahrkameraszenen. Ihr visueller Zuschnitt ist noch zu prüfen.
4. Die Zeitsteuerung verwendet die Auftrags-Messwerte, aber eine reale Abnahme der Toleranz von ±10 % sowie die 60-FPS-Zielsetzung auf iPhone stehen aus.

**Merge:** ausdrücklich offen, bis die geforderte lokale Abnahme grün ist.
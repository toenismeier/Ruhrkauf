# Spieloberfläche nach Coffee Inc 2 (E47, verbindlich)

Ziel: Jedes Panel sieht aus wie ein Coffee-Inc-2-Bildschirm. Vorlagen: `testflight/vorlage-coffee/01–32.png`. Muster gezeigt in `render/ui-referenz/` (Coffee 05, 20, 26 nachgebaut, Abgleich auf ±1 px) und im Hausdetail (`render/src/ui/haus.js`).

## Regeln
1. **Eine Stildatei:** `render/src/ui/hartwig.css`. Keine neuen Stildateien, keine `style=`-Attribute außer berechneten Zahlen (Höhe eines Balkens, Füllgrad). Alte Klassen (`hk-*`, `karte`, `zeile`, `khead`, `chip`, `mini`, `tab`, eigene Präfixe wie `q11…`, `mk-…`) verschwinden aus dem Markup.
2. **Nur Bausteine** aus `render/src/ui/komponenten.js`: `bereich, sprecher, rumpf, band, abschnitt, gross, balken, balkenPaar, tabelle, zeile, liste, knopf, knoepfe, stepper, feld, schalter, seg, karussell, leer, hinweis, marke, skala, reiterUnten`. Fehlt ein Baustein, wird er an einer Coffee-Vorlage vermessen (`node ui-referenz/abgleich.cjs`) und in `hartwig.css` im eigenen Abschnitt des Bereichs ergänzt.
3. **Aufbau je Panel:** `bereich(name, symbol)` → `sprecher({ text: Befund in einem Satz, person })` → Inhalt in `rumpf()` → optional `reiterUnten`. Sprecher sagt den Befund der Woche, keine Begrüßung, höchstens zwei Zeilen.
4. **Hauptfrage zuerst:** oben die eine Kennzahl oder Entscheidung, um die es geht (`gross`), dann Verlauf (`balken`), dann Details (`tabelle`, `liste`). Höchstens ein Primärknopf je Abschnitt, Rest `zweit`.
5. **Schriftgrößen nur aus der Skala** (siehe `:root` in hartwig.css). Coffee setzt klein: Fließtext ~10,6 px, Text 11,85 px, Kopf 14,4 px, Kennzahl 24,75 px. Nicht größer machen.
6. **Keine Pillenhaufen, keine Karten in Karten, keine hellen Flächen im dunklen Blatt.** Status als leise Versalie (`marke`), Gruppen als Abschnitt mit Liste.
7. **Abnahme nur mit Bild:** Vorher/Nachher bei 390 × 844 (`node tests/q30-panels.cjs --ordner out/p2/<bereich> --nur <panels>`), Stilprüfung 0 Befunde, `npm test` grün. Jedes Bild selbst ansehen und gegen die passende Coffee-Vorlage halten.

## Lokale Läufe
`PLAYWRIGHT_BROWSERS_PATH` muss auf einen Ordner zeigen, der `chromium-1140` enthält (im Container: Verweis auf `/opt/pw-browsers/chromium-1243`). Bündeln: `node spiel-render.js --bundle`.

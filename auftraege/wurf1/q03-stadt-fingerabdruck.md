# Q03: Stadt-Fingerabdruck im Merge-Gate

Branch `feat/q03-fingerabdruck`. 1 Chat.

## Ziel (Ummo, 20.10.2026)
Städte werden aus einem festen Seed gebaut und sollen „möglichst immer gleich aussehen“. Damit sich eine Stadt nicht unbemerkt durch einen anderen Auftrag verändert, bekommt jede Stadt einen Fingerabdruck, der bei jedem PR geprüft wird.

## Umsetzung
1. Skript `render/pruef-fingerabdruck.js`:
   - je Stadt den Stadtplan als Prüfsumme (sortierte Liste aller Kacheln mit Bauer-Id, Lage, Drehung, Variante, gerundet auf cm) und die Geometrie als Prüfsumme (Anzahl Teile, Dreiecke, Bounding Box je Kachel),
   - je Stadt ein Referenzbild aus der Startansicht (512 × 1024, festes Grafikprofil), Bildvergleich mit Toleranz.
2. Ablage `render/fingerabdruck/<stadt-id>.json` und `render/fingerabdruck/bilder/<stadt-id>.png`.
3. Modi: `--pruefen` (Standard: rot bei jeder Abweichung, listet Städte und Art der Abweichung), `--neu <stadt-id …>` (setzt Fingerabdrücke bewusst neu; nur mit Nennung im PR).
4. In `auftraege/README.md` unter „Regeln für alle Aufträge“ ergänzen: Ändert ein PR eine Stadt, nennt er die Stadt und den Grund; ohne Nennung kein Merge.
5. Laufzeit über alle Städte unter 5 Minuten lokal, gruppenweise wie `pruef-alle-gestaltung.js`.

## Abnahme
- Fingerabdrücke für alle Städte auf `main` erzeugt und eingecheckt.
- Gegenprobe: eine absichtliche Änderung an einem Hausbauer macht genau die betroffenen Städte rot.

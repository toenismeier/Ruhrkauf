# Q23: Reise – Deutschlandkarte und Liste

**Befund Ummo (21.10.):** „Die Deutschlandkarte im Travel ist auch komisch. Plus man kann da unten ja nur halb scrollen.“ Bild `testflight/wurf-2/20-reise-karte-scroll.png`, `07-reise.png`.

**Ziel:**
1. **Karte:** echte, saubere Deutschlandsilhouette mit Bundesländergrenzen (vereinfachte Geometrie im Repo, keine Kartendienste zur Laufzeit), Städte als Punkte nach Größe/eigenen Häusern, aktuelle Stadt hervorgehoben, Namen der großen Städte, Antippen wählt die Stadt. Gleiche Karte wie die Deutschlandkarte aus #23 (eine Komponente).
2. **Liste:** komplett scrollbar (heute nur halb, Karte nimmt den Platz), Karte klappt beim Scrollen ein oder Liste als eigenes Blatt; Stadtbild statt „?“ (Wahrzeichen-Symbol je Stadt, Katalogmodul).
Abstimmung mit Q14 (Gestaltung): Q23 baut Funktion und Karte, Gestaltung nach `render/GESTALTUNG-UI.md`.

**Abnahme:** Mobil-Smoketest: letzte Stadt der Liste erreichbar und antippbar; Katalog Reise im iPhone-Format.

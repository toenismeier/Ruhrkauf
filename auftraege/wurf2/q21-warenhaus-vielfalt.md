# Q21: Warenhäuser in einer Stadt sehen verschieden aus

**Befund Ummo (21.10.):** „In Berlin sehen alle Warenhäuser genau gleich aus. Ich dachte, wir hätten da mannigfaltige Vorlagen.“ Bilder `testflight/wurf-2/18-berlin-warenhaeuser-gleich.png`, `10-berlin-1.png`.

**Ursache (Claude):** `render/src/kit/warenhaus.js familieVon()` gibt für jede Lage `center` Familie 6 (Center-Box mit Parkplatz) zurück. Seit #7 bekommen in Städten mit vielen Häusern alle ungeraden Folgehäuser `lage: 'center'` (`engine/src/welt.ts`: `r.nr % 2 === 0 ? 'b' : 'center'`), daher stehen in Berlin mehrere identische Center-Kisten.

**Ziel:** Je Stadt keine zwei Warenhäuser mit derselben Familie, solange Vorlagen frei sind; Lagenmix realistisch (1a-Innenstadt, b-Lage, Stadtteilzentrum, nur wenige echte Center). Innerhalb einer Familie Varianten (Fassade, Höhe, Ecklage, Werbeschrift, Parkhaus statt Parkplatz) deterministisch je Haus-ID. Premiumhäuser behalten ihre eigenen Modelle.

**Abnahme (Claude rendert):** Katalog Berlin, Hamburg, München, Essen mit allen Hartwig-Häusern; Prüfregel „keine zwei gleichen Familie+Variante in einer Stadt“; Fingerabdrücke nur der geänderten Städte neu, mit Begründung; Leistung je Stadt nicht schlechter.

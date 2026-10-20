# FUNDUS – Grafik-Auftrag: Arbeits- und Abnahmestand

Stand: 20.10.2026 · Branch: `feat/grafik-outlet` · PR [#11](https://github.com/toenismeier/Ruhrkauf/pull/11) (Draft)

## Rebase / Integration

- Ausgangsstand des bisherigen Feature-Branches: `e4e3817dbddab5d99d92348a5013d3207f41f791`, 31 Commits vor und 23 hinter `main`.
- Auf `main` `242279b3c9784be25c164723690bfbc1c08d318c` als konsolidierter (squashed) Rebase neu aufgesetzt: `062dbcfca71a03e4e2e05eb7c143984b66d00b3b`. Die 19 ursprünglichen Outlet-Dateiänderungen wurden übernommen.
- Sieben gemeinsam bearbeitete Dateien konfliktbereinigt: `GESTALTUNG.md`, `alle-haeuser.js`, `bauer.js`, `bruecke.js`, `stadtplan.js`, `staedte.js`, `pruef-gestaltung-inhalt.js`.
- Einbindungen der gemergten Volkskauf-Kette sowie der Wettbewerber erhalten. Letzter Commitvergleich während der Bearbeitung: Feature-Branch hinter `main` **0** Commits.
- Keine Änderungen an `engine/` oder `render/src/kit/basis.js`. Keine Änderungen an `main` oder Merge.

## Nachbesserung implementiert

1. **Markenauftritt:** durchgehendes 3,5-m-Fassadenband in `#8c1d40` über +x/+z; weißer, erheblich vergrößerter Schriftzug FUNDUS an beiden sichtbaren Seiten; cremefarbenes Claim-Band (normal: „Marken. Bis zu 60 % unter dem empfohlenen Preis.“, Aktion/Offprice: „Neue Ware jede Woche“); vorspringendes 8 × 4 m Eingangsportal, Zufahrtspylon über 9 m.
2. **Drei Silhouetten:** eingeschossige Box mit 6,65–6,85 m Höhe, zweigeschossiger Fachmarkt mit 10,35–10,71 m Höhe, Glasoberzone/Rolltreppe und umlaufender Geschossfuge, Innenstadt-Geschäftshaus mit zwei bis drei Verkaufsebenen und zusätzlich ein bis zwei Bürogeschossen samt Raster-/Lochfenstern.
3. **Variation:** Grundflächenproportionen, drei Paneelgrautöne, Eingangsposition, Dachoberlichter, Lüftungsaufbauten, Parkplatzlänge und -belegung aus Seed/Fassadenvariante.
4. **Handelsbetrieb:** Schaufenster mit Puppen, Taschen, Schuhen und Home-Auslagen; dichte, aber geordnete Kleiderstangen und Regale mit Größen- und Abteilungsschildern; zusätzliche Wareninseln nur im Nah-LOD; Passanten mit weinroten Tragetaschen und Neueröffnungsschlange.
5. **Dokumentation und Checks:** `render/KIT.md` ergänzt (Ziel 900–1.800 / Obergrenze 3.000 Teile); Höhen, Geschosse und Parkplatzzuordnung in `pruef-outlet-inhalt.js` ergänzt; Vergleichskatalog einheitlich auf `640 × 520` px pro Kachel erhöht.

## Statische Verifikation (20.10.2026)

- GitHub-Vergleich `main...feat/grafik-outlet`: Branch zuletzt 0 Commits hinter `main`; die Änderungen betreffen ausschließlich 20 Outlet-/Grafik-/Doku-/Prüfdateien.
- 11 relevante Dateien einschließlich der zusammengeführten Bau-/Stadt-Dateien auf Einbaupunkte und ausgeglichene Trennzeichen geprüft: keine Abweichung im statischen Scan (ersetzt keinen JavaScript-/TypeScript-Parser).
- `haeuser-outlet.json`: 20 Filialen in 20 verschiedenen Städten, darunter 14 Randlagen und 6 b-Lagen. Bei den sechs Innenstadtfilialen bleibt die Grundfläche nach der neuen Maßformel unter 80 % der größten Hartwig-Grundfläche.
- Die drei Höhenklassen und Büro-/Parkplatzzuordnungen rechnerisch stichprobenfrei für alle 20 Standortdatensätze nachvollzogen.

## Abnahme noch **nicht** erfolgt

In dieser Ausführungsumgebung ist der GitHub-Zugriff nur über den Connector möglich. Ein lokaler Repository-Checkout, `npm ci`, Chromium-Renderlauf und die Ausgabe von PNGs in das Repository waren **nicht möglich**. Deshalb keine erfundenen Testergebnisse oder Bildabnahmen.

Verbindlicher nächster Abnahmelauf auf dem Feature-Branch:

```bash
cd engine
npm ci
npm run typecheck
npx jest
cd ../render
npm ci
npm run build
node spiel-render.js
node pruef-outlet.js
node pruef-staedte.js
node pruef-gestaltung.js
node render-katalog.js outlets
node render-katalog.js outlet-vergleich
node render-katalog.js outlet-lagen
```

Vor einem Merge zusätzlich:
- Alle 20 Häuser und alle drei Bauformen in **mindestens drei Bildrunden** in den erzeugten Kontaktbögen prüfen und gegebenenfalls korrigieren; fertige PNGs mit Protokoll nach `bilder/`.
- `outlets`-Katalogstatistik: Ziel **900–1.800 Teile pro Normalhaus**, maximal 3.000; Fern-LOD separat prüfen. Diese Teilestückzahlen wurden **noch nicht gemessen**.
- Sichtprüfung der mindestens 2,4 m hohen Schrift an Boxen / 2,0 m City ohne Zoom, Claim auf beiden Seiten, Dreifamilienkontrast, Abstand zu Billig-Wettbewerbern.
- `pruef-gestaltung.js` über die gesamte Stadtliste ausführen und 0 Verstöße bestätigen, `spiel-render.js` 0 Abweichungen.
- Vor Merge gegen den dann aktuellen `main` abgleichen. **PR #11 bis zu diesen Nachweisen als Draft belassen.**

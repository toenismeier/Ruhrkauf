# O02 Umsatztreiber: Implementierungs- und Prüfstand

Branch: `feat/op-umsatztreiber` (von `main`).

## Eingebaut
- `engine/src/treiber.ts`: neutrale Quellenfaktoren je Haus, Aufteilung des **gebuchten** Hausumsatzes in Frequenz, Kaufquote, Bon, Teile und Preis. Für alle Standardhäuser startet der Faktor mit 1, sodass sich ohne Maßnahmen kein Umsatz ändert.
- Verlauf 104 Wochen mit 4-Wochen-Blöcken für ältere Wochen. Teilbelegte verdichtete Blöcke werden bei Vorjahresabfragen proportional zugeordnet und als geschätzt gekennzeichnet.
- Additive Umsatzbrücke mit Reihenfolge Frequenz, Kaufquote, Teile, Preis und exakter Summe in Euro. Planvergleich liefert bis O06 `kein Plan vorhanden`.
- `ranking`, `reporting` und `hausTreiber` aus der Engine; Fallback Hauscluster = Region bis O01 gemergt ist.
- `render/src/ui/reporting.js`: Haus-Treiberzeile, Menükachel Reporting, Hierarchien mit aufklappbaren Regionen und Hausclustern, Format- und Periodenfilter, Sortierung, Negativliste mit Haupttreiber.
- `render/spiel-render.js`: prüft die angezeigten Hauswerte und die Brückensumme gegen die Engine.

## Abnahmebefehle (noch auszuführen)
Die GitHub-Verbindung in diesem Bearbeitungslauf ermöglicht Datei-/Branch-/PR-Zugriffe, jedoch keine Ausführung des Repositorys. Die nachstehenden Prüfungen **sind nicht als bestanden protokolliert**.

```sh
cd engine
npm ci
npm run typecheck
npx jest tests/treiber.test.ts --runInBand
npm test -- --runInBand
npx tsx scripts/umsatztreiber-benchmark.ts
npx tsx scripts/kalibrierung.ts 1
npx tsx scripts/bot.ts 1 260 --tief
npx tsx scripts/bot.ts 2 260 --tief
npx tsx scripts/bot.ts 3 260 --tief

cd ../render
npm ci
npm run build
node spiel-render.js
```

## Abnahmekriterien
- Baseline Umsatz und EBITDA Jahr 1 Seeds 1 bis 3: höchstens ±1 %.
- Keine Unterschiede im Neutralfall und mathematisch exakte Umsatzzerlegung und additive Brücke.
- Zusätzliche Laufzeit im A/B-Vergleich 52 Wochen Seed 1: höchstens 10 ms/Woche.
- Browser-Daten gegenüber Engine: 0 Abweichungen.
- Bot C (tief) überlebt Seeds 1 bis 3 über 260 Wochen.
- Vor einem Merge nach `main`: Branch synchronisieren und Prüfungen auf dem aktualisierten Stand erneut durchführen.

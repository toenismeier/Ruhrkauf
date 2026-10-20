# O05 Ware: Implementierungsstand auf feat/op-ware

Basis: main einschließlich O01 Organisation (Stand 20.10.2026, SHA `b812c6364548a4c07a59506f7c816d635e483b5b`). Noch **nicht nach main gemergt**.

## Umgesetzt
- `engine/src/merchandise.ts`: Hauscluster-Kohorten, werttreue Erstverteilung, NOS-Zugänge, Übergangscluster ohne O01, Clusterverbrauch nach Steuerungsänderung, Umlagerungen über 1–2 Wochen und Logistikkosten
- `warenUebersicht`, `warenHaus`: Clusterbestand, Reichweite, Altware, Fehlmengenindikator, lokale Produktivität, Inventurdifferenz
- Merchandise Planning: saisonale OTB-Budgets, Zielmarge, Zielabverkauf, Breite, Vororderquote; gebündelte O01-Vorlage; qualitätsabhängige Budgetverteilung bei Delegation
- Allokationsqualität: Abweichung vom O01-Startniveau und vom Spieler steuerbarer Fehlverteilungsgrad
- Zentraler Reduzierungskalender mit Stufen aus Saisonabverkauf, lokale Reduzierung bis zehn Prozentpunkte, Zentraldurchsetzung mit Sperre und Stimmungseinfluss, Bonwirkung bei aktiviertem Kalender
- Abfluss alter Eigenware an FUNDUS als Erlös/Warenausgang, 25/50-Prozent-Grenze als berechneter Frequenzfaktor
- Flächenumplanung mit 2–6 Wochen Umbau, Inventur KW 6 mit Hausrangfolge, Verlustminderung durch Warensicherung und Verwaltung, aktivierte Bestandskorrektur als Abschrift
- Oberfläche: zusätzliche Einkaufsreiter Merchandise, Allokation, Reduzierung, data-p-Prüfpfade sowie Hauskennzahlen

## Ausstehende Integrationen
- O02 (Umsatztreiber) ist noch nicht in main: Der Preisfaktor wird beim Hausumsatz angewandt. Bei O02-Merge muss er in dessen Bon-Treiber übergeben werden, statt die Buchungszeile separat zu multiplizieren.
- O03 (IT) und O04 (Personal) sind noch nicht in main: Preisschilder/Etikettierstunden und tatsächliche Instore-Logistik-Verfügbarkeit benötigen die späteren Schnittstellen. Inventur nutzt vorhandene Hauspersonalzahlen und Warensicherung.
- FUNDUS ist noch kein wirtschaftlich eigenständiges Format auf main. Sein Frequenzfaktor ist für die spätere Integration bereitgestellt; noch keine Wirkung in einer eigenen FUNDUS-GuV.
- Flächenproduktivität wird aktuell auf Hausebene ausgegeben; bereichsweise Berechnung und Zeitachsenvisualisierung des Reduzierungskalenders sind noch zu ergänzen.

## Prüfschema (noch nicht ausgeführt)
Der GitHub-Connector ermöglicht Datei-/Branch-Änderungen, stellt in dieser Sitzung aber keine lokale Laufzeit bereit. Der externe Git-Clone scheitert an der DNS-Auflösung von github.com. Daher **kein grüner Test-, Build- oder Render-Lauf behauptet**.

```sh
cd engine
npm ci
npm run typecheck
npx jest tests/merchandise.test.ts --runInBand
npm test -- --runInBand
npx tsx scripts/ware-leistung.ts
npx tsx scripts/kalibrierung.ts 1
npx tsx scripts/bot.ts 1 260 --tief
npx tsx scripts/bot.ts 2 260 --tief
npx tsx scripts/bot.ts 3 260 --tief
cd ../render
npm ci
npm run build
node spiel-render.js
```

Akzeptanzgrenzen: Seeds 1–3 Jahr 1 Umsatz/EBITDA maximal ±1 % zum damaligen main, Bot C 260 Wochen überlebt, Warenbestand stimmt je Cluster und Konzern, neue Prüfwerte 0 Abweichungen, `wocheAbspielen` höchstens +10 ms gegenüber unveränderter Vergleichsbasis.

**Merge ausdrücklich offen**, solange diese Abnahme nicht grün ist.

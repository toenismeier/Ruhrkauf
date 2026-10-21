# O09 E-Commerce – Implementierungsstand

Branch: `feat/op-ecommerce` (direkt von `main`, 20.10.2026).

## Umsetzung

- `engine/src/ecommerce.ts`: eigenständiger Kanal hartwig.de, 8 % Online-Baseline der Hartwig-Warengruppen, ohne doppelten Ansatz im Konzern. Abweichungen aus Sortiment, Verfügbarkeit, O03-Plattformgeneration, Online-/CRM-/App-Marketing, Preis, Lieferzeit; O01-Bereichsqualität und CDO-Delegation. Online-Gruppenumsatz und Kanal-KPI.
- Dienstleister zu Beginn, 16-Wochen-Projekt eigenes Lager / 8 Wochen Rückwechsel, Investitions- und Betriebskosten, Dezemberzuschläge. Finanzierungen über `einmalKosten`.
- Click & Collect nach Abholstation, Mitnahmekäufe und Instore-Stunden im Haus. Ship-from-Store nach Hauscluster; zusätzliche Lieferfähigkeit, Altware, Lagerbestand, O04-Kapazitätsgrenze. Retourenquote je Gruppe, Kosten und optionale Rückführung zum Cluster. Regionale Kannibalisierung nach Kundenscore, im Haus-KPI und in der Konzernergebnisrechnung.
- `ecommerceBruecke(s, wochen)`: ausdrücklich benannter Online-Effekt zur Aufnahme in O02-Umsatzbrücke; `WochenKpi.onlineEffekt` und `onlineKannibalisierung`.
- `render/src/ui/ecommerce.js`: Menü „Online“, 26-Wochen-Verlauf, KPIs, Sortiment/Preise/Service, Fulfillment, Cluster-Versand, Abholstationen/Retouren; Haussteckbrief.
- `render/src/kit/abholstation.js`: kleines Schild und Paketboxen am Hartwig-Eingang; `render/src/kataloge/abholstation.js`: Kontaktbogen mit/ohne Station.

## Abhängigkeiten

O03 (IT), O05 (Merchandise/Clusterbestand), O01/O04/O07 und O02 sind als **optionale Adapter** berücksichtigt, da auf dem Ausgangs-`main` zum Branchstart noch nicht vorhanden. **Rebase 21.10.2026:** O01–O08 und N01–N14 vollständig auf aktuellem `main` beibehalten; O09 als konsolidierter Commit neu aufgesetzt. O04-Instore-Stunden nutzen echte O04-Personalpläne; O05-Clusterbestand und O08-Dachtechnik bleiben erhalten. Insbesondere `ecommerceBruecke` in die O02-Umsatzbrücke als separate Position „Online“ einhängen, die O04-Instore-Stunden und O05-Clusterverbrauch gemeinsam validieren.

## Abnahme / Prüfprotokoll

**Lokal noch ausstehend:** Das GitHub-Repository war aus der verfügbaren Ausführungsumgebung nicht auscheckbar (DNS für github.com nicht auflösbar). Es wurden daher **keine grünen TypeScript-/Jest-/Browser- oder Leistungswerte behauptet**. Die fünf neuen/geänderten Grafik-JavaScript-Dateien wurden per JavaScript-Parser auf syntaktische Fehler geprüft; keine Syntaxfehler gefunden.

Ausführung bei verfügbarem Repo:
```bash
cd engine
npm ci
npm run typecheck
npx jest
npx tsx scripts/ecommerce-pruefung.ts
cd ../render
npm ci
npm run build
node spiel-render.js
node render-katalog.js abholstation
```

`engine/tests/ecommerce.test.ts` deckt Startneutralität für Seeds 1–3, 52-Wochen-Referenzvergleich, Umsatzwachstum/Kannibalisierung, Altware/Ship-from-Store, Click & Collect, Retouren und Eigenlager ab. `engine/scripts/ecommerce-pruefung.ts` protokolliert relative Umsatz-/EBITDA-Abweichungen, +10-ms-Laufzeitgrenze und Bot C über 260 Wochen für Seeds 1–3.

**Kein Merge** ohne lokale grüne Abnahme, Integrationsprüfung mit O01–O07 und Rendering. 

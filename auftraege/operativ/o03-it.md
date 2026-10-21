# O03: IT – Systeme als Projekte

Branch `feat/op-it`. Baut auf O01 (Bereiche, `bereichsQualitaet`). Zuerst lesen: `auftraege/operativ/README.md`, `o01-organisation.md`.

## Ziel
IT begrenzt oder beschleunigt fast alle Bereiche. Ohne gutes System kommt ein Bereich nicht über eine bestimmte Qualität hinaus, egal wie gut die Leute sind. Systeme werden als Projekte eingeführt, mit Laufzeit, Budget, Risiko und Rollout Cluster für Cluster.

## 1. Systeme (`engine/src/it.ts`)
| System | Deckelt bzw. wirkt auf | Start |
|---|---|---|
| Kassensoftware | Kassentempo, Ausfälle, Selbstbedienungskassen (eigene Ausbaustufe), mobile Kasse | Generation 2 von 4, 14 Jahre alt |
| Warenwirtschaft | Bestandsgenauigkeit; Deckel für Allokation & Nachschub, Einkauf | Generation 2 |
| Planungssystem | Deckel für Merchandise Planning, Konzern- und Vertriebscontrolling | Generation 1 |
| Personaleinsatz-Software | Deckel für Personaleinsatzplanung | Generation 1 |
| Elektronische Preisschilder | Reduzierungen ohne Umetikettieren (entlastet Instore-Logistik in O04/O05) | nicht vorhanden |
| App & Kundenkarte | Wirkung der CRM-Kanäle im Marketing (vorhandene Hartwig App wird aufgewertet, nicht neu gebaut) | Generation 2 |
| E-Commerce-Plattform | Grundlage für O09 | Generation 2 |
| Datenplattform (BI) | Prognosegüte aller Bereiche (+0 bis +15 % auf `bereichsQualitaet` bei Planung, Allokation, Controlling) | Generation 1 |

- Je System: Generation 0 bis 4, Alter in Jahren, Ausfallwahrscheinlichkeit je Woche (steigt mit dem Alter), Betriebskosten je Woche.
- `itDeckel(s, b)` liefert für jeden Bereich den Deckel aus seinen Systemen. Der Startwert ist so normiert, dass die Ausgangslage unverändert bleibt. Heutige Qualitäten liegen also unter dem Deckel, und die Wirkung entsteht erst bei Verbesserung oder Verfall.

## 2. Projekte
1. **Aktion** `{ typ: 'itProjekt'; system; art: 'kaufen'|'entwickeln'|'dienstleister'; zielGeneration }`:
   - **kaufen** (Standardsoftware): mittlere Kosten, mittlere Dauer, geringes Risiko, Generation höchstens 3.
   - **entwickeln** (Eigenentwicklung): hohe Kosten, lange Dauer, hohes Risiko, Generation 4 möglich.
   - **dienstleister**: niedrige Einmalkosten, hohe laufende Kosten, Generation 3.
2. **Verlauf:** Konzept, Umsetzung, Rollout. Dauer und Kosten werden zu Beginn geschätzt.
   - Je Woche Risiko für Verzug und Mehrkosten, abhängig von der Qualität des Bereichs IT und vom CDO.
   - Projektstand als Vorlage im Posteingang bei Meilensteinen: „Rollout Kasse: Cluster Ruhr West fertig, 2 Störungen“.
3. **Rollout Cluster für Cluster** (O01 Hauscluster): Die Reihenfolge wählt der Spieler oder die IT.
   - In den ersten 4 Wochen nach Umstellung hat ein Cluster Startprobleme: Kassenstörungen, Bestandsfehler.
   - Häuser mit altem und neuem System laufen nebeneinander.
4. **Ereignisse:**
   - Ausfall eines Altsystems: Kassenausfall am Samstag kostet Umsatz in den betroffenen Clustern.
   - Cyberangriff: selten, schwer, abgemildert durch IT-Qualität und Datenplattform.
   - Lieferant kündigt Wartung eines Altsystems.

## 3. Oberfläche
- Seite „IT“ (`render/src/ui/it.js`) unter dem CDO bzw. dem Bereich IT:
  - Systemlandkarte als Karten (Generation, Alter, Ausfallrisiko als Ampel, Kosten).
  - Laufende Projekte mit Fortschrittsbalken und Rollout-Karte der Cluster.
  - Knopf „Neues Projekt“ mit den drei Arten im Vergleich.
- Im Organigramm zeigt jeder Bereich, wenn ihn ein System begrenzt: „gedeckelt durch Planungssystem (Generation 1)“.

## Abnahme
- Tests: Neutral im Standard. Projekt kaufen → nach Laufzeit Generation höher, Deckel höher. Rollout nur in den gewählten Clustern. Ausfallrate steigt mit dem Alter.
- Laufzeitregel aus dem README.

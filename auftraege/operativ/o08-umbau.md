# O08: Umbau und Modernisierung

Branch `feat/op-umbau`. Baut auf O01 (Bereich Bau & Ladenbau). Nutzt den Ladenbau (`render/src/kit/moebel/`, `ladenplan.js`). Zuerst lesen: `auftraege/operativ/README.md`, `auftraege/workstream-ladenbau.md`.

## Ziel
Häuser altern. Modernisierung kostet, bringt Frequenz, Kaufquote und Image, und man sieht sie. Festlegung von Ummo: Umbauten werden **je Haus und Etage** geplant.

## 1. Engine (`engine/src/umbau.ts`)
1. **Zustand je Etage:** `substanz` (heute je Haus) wird zusätzlich je Etage geführt. Dazu kommen `moebelGeneration` (1 = 90er Holz, 2 = 2000er, 3 = aktuell) und `technik` (Klima, Licht, Brandschutz je 0–2). Der Start leitet sich aus Baujahr und heutiger Substanz ab.
2. **Vier Stufen je Etage:**

   | Stufe | Inhalt | Dauer | Kosten je qm (Start) | Wirkung |
   |---|---|---|---|---|
   | Auffrischung | Farbe, Licht, Boden | 2 Wochen | 60 € | Kundenscore +, Substanz +10 |
   | Ladenbau neu | neue Möbelgeneration je Abteilung | 4 bis 6 Wochen | 250 € | Kaufquote + (vor allem Mode, Beauty), Möbelgeneration 3 |
   | Komplettumbau | neues Konzept, Wege, Rolltreppen, Fassade (nur ganzes Haus) | 16 bis 30 Wochen | 900 € | Frequenz +, Image +, Substanz 90 |
   | Technik | Klima, LED, Brandschutz | 3 bis 8 Wochen | 120 € | Energie − (O07), Pflicht erfüllt |

   Wirkungen über die Treiber (O02), normiert. Die Wirkung lässt mit der Zeit nach, weil sich die Substanz abnutzt (heutiger Verfall, je Etage).
3. **Pflicht und Kür:**
   - Brandschutz und Aufzugsprüfung haben Fristen (Ereignis „Behörde setzt Frist“). Wird die Frist versäumt, wird die Etage geschlossen, bis gebaut ist.
   - Alles andere ist Kür.
4. **Bauen im Betrieb:** Etagenweise. Während der Bauzeit fehlt Fläche (Umsatz der Etage −60 %, Rest des Hauses −5 %). Zustand `umbau` in der Grafik.
5. **Bereich Bau & Ladenbau:** Seine Qualität bestimmt Kosten- und Terminüberschreitung (bis +40 % bzw. +50 % bei schwacher Qualität). Er schlägt jährlich ein Modernisierungsprogramm vor (Vorlage im Januar): Häuser und Etagen nach Rendite sortiert, mit Budget aus der Planung (O06).
6. Die bestehende `premiumInvestition` bleibt und zählt als Kür für Premium-Häuser.

## 2. Grafik
- **Möbelgeneration im Ladenbau:** In `render/src/kit/moebel/` je Möbeltyp drei Generationen: Farben und Materialien (Generation 1 Holz/Messing/Beige, 2 Grau/Chrom, 3 aktuell hell mit Akzentfarbe), keine neuen Formen nötig. `ladenplan` wählt nach `moebelGeneration` der Etage.
- **Außen:**
  - Renovierte Fassade sauber, alte Fassade mit Patina (die vorhandene Patina-Logik je Substanz nutzen).
  - Komplettumbau mit Gerüst und Kran (Zustand `umbau`).
  - Technik sichtbar als neue Dachaufbauten (Klimageräte).
- **Katalog** `umbau-generationen.js`: eine Etage in drei Möbelgenerationen nebeneinander, ein Haus vor und nach dem Komplettumbau. Claude rendert.

## 3. Oberfläche
- Im Haussteckbrief ein Reiter „Bau“ mit Etagenliste (Substanz, Möbelgeneration, Technik, Pflichtfristen), Knopf „Umbau planen“ mit Stufe, Zeitraum und Kosten-/Wirkungsschätzung.
- Seite „Modernisierung“ je Konzern: Programm des Bereichs, laufende Baustellen, Budgetverbrauch.

## Abnahme
- Tests:
  - Neutral im Standard (keine Umbauten ohne Aktion; die Pflichtfristen sind so angelegt, dass Bot C sie mit Standardverhalten erfüllt, oder Bot C bekommt die Regel „Pflicht immer bauen“).
  - Ladenbau neu hebt die Kaufquote der Etage.
  - Versäumte Frist schließt die Etage.
- `pruef-ladenbau` 0 Verstöße für alle drei Generationen.

## E48 Ausbau (31.10.2026, Ummo per Auswahl)
- **Gewerke einzeln** (`GEWERKE` in `engine/src/umbau.ts`): Klima, LED-Licht, Brandschutz, Aufzug/Rolltreppe, Möbel, Boden/Decke/Farbe (je Etage), Fassade/Eingang und Komplettumbau (ganzes Haus). Aktion `umbauPlanen` mit `gewerk`; alte Stufen bleiben gültig.
- **Bauprogramm** über mehrere Cluster: `bauprogrammStarten { cluster[], gewerk, bisZustand 0|1, parallel }`, Arbeitsliste schlechteste Etagen und Fristen zuerst, höchstens `parallel` Baustellen, je Haus eine. Vorschau `bauprogrammSchaetzung` (Kosten, Wellen-Bauzeit, Ausfall, Mehrumsatz, Bruttogewinn 41,2 %, Amortisation, Spitze je Woche). `bauprogrammStoppen`.
- **Bestand**: `bestandUebersicht` (je Cluster Anteil gut je Gewerkgruppe, Fristen, Bedarf), `bestandCluster` (Häuser mit Etagenschnitt), `umbauVorherNachher`.
- **Budget**: Start 0,6 % vom Jahresumsatz (vorher immer 0), Aktion `umbauBudget`.
- **Grafik**: Möbelgenerationen über eine Materialwelt je Generation (Fassade, Straße, Rohbau ausgenommen), Baustelle je Etage (`bauEtagen` in zustaende.js), Gerüst mit Kran nur bei Komplett/Fassade, Klimageräte vorn rechts auf dem Hauptdach. Katalog `umbau-generationen`, Panelbilder `bilder/umbau/`.

## E49 Wirkung (31.10.2026, Ummo per Auswahl)
- Alte Möbel kosten Kaufquote ab Spielwoche 52: Generation 1 −0,5 %/Jahr, Generation 2 −0,25 %/Jahr, höchstens −4 % (`malusMoebel`); Möbel neu setzt zurück.
- Alte Fördertechnik kostet in Obergeschossen −0,2 %/Jahr, höchstens −2 % (`malusAufzug`).
- Häuser vor 1975: Brandschutz- und Aufzugsfrist je Haus zwischen Woche 66 und 598 (vorher frühestens Woche 312). Zwölf Wochen vorher Vorlage von Bau & Ladenbau (`pflichtBauen`, Standard beauftragen). Brandschutz versäumt: Etage gesperrt. Aufzug versäumt: stillgelegt, Obergeschosse ×0,75.
- Boden, Decke, Farbe fällt mit der Substanz (unter 72 mittel, unter 45 schlecht); Kundenscore +4 Punkte je Stufe gegenüber Start im Etagenmittel.
- Wirkung Jahr 2, Seed 1, gegen main: Umsatz −0,6 %, EBITDA ohne Eingriffe −16,5 Mio. €, Bot regulär −22,5 Mio. €.

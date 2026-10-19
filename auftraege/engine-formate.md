# Auftrag: Schwesterkette und Outlet als Formate in der Engine

Branch `feat/engine-formate`. Erst nach Merge von `feat/grafik-schwesterkette`, `feat/grafik-outlet` und Phase 1 von `engine-massstab.md` starten. Engine, Brücke und Oberfläche.

**Mengen:** Es gilt der Ruhrkauf-Maßstab aus `engine-massstab.md`: 86 Volkskauf-Häuser und 66 FUNDUS-Häuser. Sie liegen nach Phase 1 dort bereits als Daten in der Welt (`nurDaten: true`). Dieser Auftrag baut ihre Wirtschaft; die Kalibrierung auf die Umsatzziele erfolgt in Phase 3 von `engine-massstab.md`. Die Zahlen 24 und 20 weiter unten stammen aus den Grafik-Aufträgen und sind überholt.

## Ausgangslage
- `Format = 'warenhaus' | 'sport'` (`engine/src/types.ts`). 130 Warenhäuser und 50 Sporthäuser entstehen in `welt.ts neueWelt`/`bauHaus`.
- Die Grafik kennt nach den Grafik-Aufträgen zwei weitere Formate, rein grafisch und ohne Engine:
  - Schwesterkette „Volkskauf“: `render/haeuser-schwester.json`, 24 Häuser `K001` bis `K024`, `format: 'schwester'`, Nachkriegsbauten, Lage 1a oder b, Mittel- und Großstädte, Schwerpunkt NRW, Name als Konstante `NAME_SCHWESTER` in `render/src/kit/schwesterhaus.js`.
  - Off-Price-Kette (TK-Maxx-Prinzip, eigene Marke, Name „FUNDUS“): `render/haeuser-outlet.json`, 20 Häuser `O001` bis `O020`, `format: 'outlet'`, 14 × Lage `rand` (Retail Park), 6 × Lage `b` (Innenstadt), Konstante `NAME_OUTLET` in `render/src/kit/outlet.js`. Format-Kennung im Code bleibt `outlet`.
- Offprice läuft heute je Format über Flächen mit Konzept `offprice` und `einkauf.ts verbraucheAltwareWg(s, format, wert)`, das Altware (`istAlt`) des Formats verbraucht. In `engine.ts` stehen `Record<Format, …>`-Objekte mit festen Schlüsseln `warenhaus` und `sport`.

Vorbild Ruhrkauf: Die Schwesterkette ist „der vergessene Zwilling“: eigener Rechtsträger, eigene Regionalführung und eigenes Warenwirtschaftssystem, nur die Jahresrechnung läuft in die Zentrale. Sie ist härter, früher und standardisierter abzuwickeln, Volumen ohne Profil und kapitalintensiv. Das Outlet ist die Abverkaufsschiene des Konzerns: Was in Warenhaus und Sport nicht verkauft wird, geht dorthin.

## 1. Datenmodell
- `Format = 'warenhaus' | 'sport' | 'schwester' | 'outlet'`. Alle `Record<Format, …>` und `switch`/Vergleiche auf `'sport'` durchgehen (rund 17 Stellen, `grep -rn "'sport'" engine/src`).
- Neue Hilfsfunktion in `daten.ts`: `sortimentVon(f: Format): 'warenhaus' | 'sport' | 'outlet'`, wobei `schwester` das Warenhaussortiment nutzt. `gruppenFuer(f)` nutzt sie. Das Outlet hat keine eigenen Warengruppen, nur Offprice-Flächen.
- `GameState.firma` bekommt `schwesterName` und `outletName` (Startwerte aus Szenario, gleich den Konstanten der Grafik).

## 2. Welt (`welt.ts`)
- Standorte, Mengen und Export (`engine/scripts/haeuser-export.ts`) kommen aus Phase 1 von `engine-massstab.md`. Hier nur `nurDaten` für beide Formate durch echte Wirtschaft ersetzen.
- **Schwesterkette** (`bauHaus` mit Format `schwester`):
  - Warenhausgruppen ohne `food`; UG nur Lager (keine Fläche).
  - Flächenproduktivität ×0,72 gegenüber einem Hartwig-Haus gleicher Lage und Stadtgröße, Kundschaft älter (`alter` ×1,1), Substanz 15 bis 60.
  - Personal: dünnere Führung (Filialleiter-Skill 0,3 bis 0,6), eigene Regionalleitung als Zentralkosten-Block `schwesterZentrale` (fixe Kosten je Woche, kalibriert unten).
  - Eigene, weniger flexible Mietverträge (öfter Altverträge mit hoher Mietquote).
- **Outlet** (`bauHaus` mit Format `outlet`):
  - Off-Price-Markenladen: Abteilungen Damen, Herren, Kinder, Schuhe, Accessoires, Home, Beauty (Warenhausgruppen ohne food und spielwaren), alle Flächen Konzept `offprice`, 2.000 bis 4.500 qm, ein bis drei Etagen. Miete niedrig in Randlage (Mietquote 4 bis 6 %), mittel in b-Lage (7 bis 9 %).
  - Ware aus zwei Quellen (siehe 3): Konzern-Altware und zugekaufte Markenposten. Hohe Frequenz, niedriger Bon, schneller Umschlag.

## 3. Warenfluss Altware
- Neue Steuerung `s.einkauf.altwareOutlet` (0..1, Start 0,5): Anteil der wöchentlich alt werdenden Ware (Warenhaus, Schwester, Sport), der ins Outlet geht statt in die Offprice-Flächen der Häuser bzw. in die Abschrift.
- Neue Funktion `outletVersorgung(s)` in `einkauf.ts`: verschiebt Altware-Kohorten in einen Outlet-Pool (Kohorte bekommt `pool: 'outlet'` oder ein Feld `imOutlet: true`), mit Logistikkosten 3 % vom Einstand. Im Outlet verkauft sich Altware zu 35 bis 55 % des Ursprungspreises, abhängig von Alter und Saison. Ladenhüter (`ladenhueter`) verkaufen sich nur im Outlet, dort aber langsam (6 % je Woche).
- **Zukauf Markenposten:** Neben der Konzern-Altware kauft das Format laufend Markenposten zu (Steuerung `s.einkauf.offpriceZukauf` als Wochenbudget in €, Start so kalibriert, dass Altware rund 35 % und Zukauf rund 65 % des Wareneinsatzes ausmachen). Zukauf zu 30 bis 40 % des ursprünglichen Verkaufspreises, Abverkauf zu 50 bis 70 % davon; Marge damit klar besser als bei Konzern-Altware. Qualität der Posten hängt von der HQ-Einkaufsstufe ab.
- Nachfrage im Outlet: je Haus abhängig von Einzugsgebiet (Kaufkraft niedrig ist kein Nachteil, Faktor `2 - kaufkraft` gekappt 0,8..1,2), Wettbewerb `offprice` in der Stadt, Marketing-Budget.
- Ist zu wenig Ware im Pool, sinkt der Outlet-Umsatz sichtbar (leere Flächen), ist zu viel da, steigen die Abschriften.

## 4. Spieleraktionen (`aktionen.ts`, `SpielerAktion`)
- `{ typ: 'altwareOutlet'; quote: number }`.
- `{ typ: 'offpriceZukauf'; budget: number }`.
- `{ typ: 'schwesterUmflaggen'; haus: string }`: Schwesterhaus wird Hartwig. Umbau 20 bis 30 Wochen (Status über vorhandene Umbaulogik, Fläche teilweise gesperrt), Kosten 180 € je qm Verkaufsfläche, danach `format: 'warenhaus'`, Flächenproduktivität ×0,9 eines Hartwig-Hauses (Kundschaft muss erst kommen, über 52 Wochen auf ×1,0). Nur mit HQ-Abteilung Immobilien Stufe 1 oder höher.
- `{ typ: 'outletEroeffnen'; stadt: string }`: nur in Städten aus einer Kandidatenliste (`outletKandidaten(s)`: Retail-Park- und b-Lagen-Flächen mit Miete, Größe, erwarteter Umsatz), Vorlauf 12 Wochen, Investition 120 € je qm.
- Schließen läuft über die vorhandene Aktion `schliessen` (Sozialplan, Restmiete). Für die Schwesterkette gilt der Ruhrkauf-Grundsatz „härter, früher, standardisierter“: Schließungskosten je FTE ×0,85, Betriebsrat-Reaktion schwächer, Image-Verlust je Schließung halb so hoch wie bei Hartwig.
- Scope `format` in Aktionen und Marketing akzeptiert die neuen Formate.

## 5. Ereignisse und Angebote (`ereignisse.ts`)
- Neues Angebot `kettenverkauf` (Typ in `AngebotTyp`) analog zu `sportVerkauf`: Investor will die gesamte Schwesterkette übernehmen (Kaufpreis niedrig: 0,3 bis 0,6 × Jahresumsatz, abhängig von EBITDA und Substanz; Personal, Mieten und Ware gehen mit). Wahrscheinlichkeit 0,004 je Woche, in der Insolvenz 0,01.
- Outlet: gelegentlich Angebot `sonderposten` direkt fürs Outlet (vorhandener Typ, mit Ziel `outlet`).
- Meldungen: Outlet leer gelaufen, Outlet überfüllt (Abschriften steigen), Schwesterhaus mit Substanz unter 20 (Instandhaltung erzwingt Entscheidung).
- Neue Zufallszahlen über einen eigenen Strom `s.formateRng` (wie in `engine-wettbewerber.md` beschrieben), damit die Zufallsfolge der übrigen Engine gleich bleibt.

## 6. Kalibrierung (Schwierigkeit mittel, Seeds 1 bis 3, Jahr 1 ohne Eingriff)
Vorbild sind die Ruhrkauf-Verhältnisse: Spezialformate klein gegenüber dem Kern.
- Umsatz Schwesterkette rund 11 % des Hartwig-Warenhausumsatzes, EBITDA-Marge −3 % (±1,5 Punkte).
- Umsatz Outlet rund 9 % des Hartwig-Warenhausumsatzes bei `altwareOutlet = 0,5`, EBITDA-Marge −1 % (±1,5 Punkte). Bei guter Steuerung (Quote 0,8, passende Sonderposten) bis +4 %.
- Konzern-EBITDA-Quote der Ausgangslage bleibt rund −4 % (±0,5 Punkte), Q4 positiv.
- Bot C überlebt 5 Jahre auf Seeds 1 bis 3. Bots in `scripts/bot.ts` um sinnvolles Verhalten erweitern: Bot C schließt die schwächsten Schwesterhäuser im Schutzschirm zuerst und setzt `altwareOutlet` auf 0,8. Ergebnisse aller Bots in `engine/README.md` neu eintragen.
- `npx tsx scripts/schwierigkeit-vergleich.ts leicht,mittel,schwer 1,2,3 260`: Monotonie bleibt.

## 7. Abfragen und Oberfläche
- `cockpit` und `portfolio` (`abfragen.ts`) mit Aufteilung nach Format (Umsatz, EBITDA, Häuser, FTE je Format). Neues `outletUebersicht(s)` (Pool-Wert, Reichweite, Abverkaufsquote, Abschriften, Häuser) und `schwesterUebersicht(s)`.
- `bruecke.js`: Häuser der neuen Formate aus dem Spielstand statt aus den JSON-Dateien (wie Hartwig), Zustände über `zustandAusHaus`, Verzweigung auf `schwesterhaus()` bzw. `outlet()` (aus den Grafik-Aufträgen).
- `spiel.js`: Hausdetail zeigt Format im Untertitel (heute nur Sporthaus oder Warenhaus), Aktionen Umflaggen bzw. Outlet-Steuerung im Hausdetail; im Einkauf-Panel (`ui/einkauf.js`) ein Block „Altware ins Outlet“ mit Regler und Pool-Kennzahlen; Cockpit mit Formatfilter.
- `spiel-render.js` prüft die neuen Anzeigen gegen die Abfragen (0 Abweichungen).

## 8. Tests (`engine/tests/formate.test.ts`)
- `neueWelt(1)` erzeugt 86 Volkskauf- und 66 FUNDUS-Häuser, identisch zu den exportierten JSON-Dateien.
- Altwarefluss: Bei Quote 1 landet alte Ware im Outlet-Pool, bei Quote 0 nicht.
- Umflaggen: Format wechselt nach Umbau, Kosten werden gebucht, ohne Immobilienabteilung abgelehnt.
- Kettenverkauf entfernt alle Schwesterhäuser und bucht den Kaufpreis.
- Kalibrierziele aus Abschnitt 6 mit Toleranzen.
- Alle bisherigen Tests bleiben grün (Kalibrierwerte in bestehenden Tests nur anpassen, wenn die Formate sie zwingend verschieben, und das im Commit begründen).

## Abnahme
`cd engine && npm run typecheck && npm test`, Kalibrierung und Bots wie oben, `npx tsx scripts/haeuser-export.ts` ohne Diff gegen die JSON-Dateien, `cd render && npm run build && node spiel-render.js` 0 Abweichungen, `node pruef-staedte.js` 0 Fehler. `engine/README.md` und `EINKAUF-VERTRAG.md` (Altware-Fluss) fortschreiben.

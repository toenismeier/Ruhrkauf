# Auftrag: Wettbewerber als Akteure in der Engine

Branch `feat/engine-wettbewerber`. Nur Engine (`engine/`), keine Grafik. Die Grafik folgt im Auftrag `grafik-wettbewerber-im-spiel.md`.

## Ausgangslage
- Heute ist Wettbewerb ein fester Wert je Haus: `Haus.einzug.wettbewerb` (0..1), gewürfelt in `welt.ts bauHaus` und einmalig in `potenzial` eingerechnet (`fit()` mit Faktor `1 - 0.25 * wettbewerb`, `ereignisse.ts attraktivitaet()` mit `1 - 0.2 * wettbewerb`). Danach ändert er sich nie.
- Die Grafik erzeugt eigene Wettbewerber je Stadt in `render/src/kit/staedte.js` (Zeilen um `WETTBEWERBER`, `ARTEN_1A`): 7 Arten (`modehaus`, `offprice`, `textildiscounter`, `elektronik`, `premium`, `fastfashion`, `leer_ehemals`), Namen aus `render/src/kit/wettbewerber.js NAMEN` (je Art sechs), Anzahl je Stadt: Metropole 3 bis 5, Großstadt 1 bis 3, Mittelstadt 0 bis 1. Engine und Grafik wissen nichts voneinander.
- Ziel: Die Engine besitzt die Wettbewerber. Sie eröffnen, schließen, ziehen um, fahren Preisaktionen, werben Personal ab und reagieren auf Hartwig. Der Spieler spürt das in Umsatz, Meldungen und Entscheidungen.

## Datenmodell (`types.ts`)
```ts
export type WettbewerberArt = 'modehaus' | 'offprice' | 'textildiscounter' | 'elektronik' | 'premium' | 'fastfashion' | 'leer_ehemals';
export interface Wettbewerber {
  id: string;            // 'C001' …
  name: string;          // aus WETTBEWERBER_NAMEN je Art
  art: WettbewerberArt;
  kette: string;         // Kettenname (gleich name, außer bei Modehäusern mit Filialnetz)
  stadt: string;
  lage: Lage;
  grundflaecheQm: number;
  staerke: number;       // 0..1, Zugkraft
  preisdruck: number;    // 0..1, laufender Preisdruck (Aktionen)
  status: 'offen' | 'eroeffnung' | 'raeumung' | 'geschlossen';
  seit: number;          // Woche Eröffnung bzw. Statuswechsel
  bis?: number;          // Ende Eröffnungs-, Räumungs- oder Aktionsphase
  inHartwigGebaeude?: string; // Haus-Id, wenn Nachnutzung eines geschlossenen Hartwig-Hauses
  form: number;          // 0..4, Bauform für die Grafik (wie staedte.js formVon)
}
```
`GameState` bekommt `wettbewerber: Wettbewerber[]` und `wettbewerbRng: number` (eigener Zufallsstrom, siehe unten). `Haus` bekommt `wettbewerbStart: number` (Kopie von `einzug.wettbewerb` beim Spielstart).

## Startbestand (`welt.ts`)
- Je Stadt mit Hartwig-Haus Wettbewerber nach denselben Regeln wie `staedte.js` (Anzahl je Cluster, 1a-Arten `modehaus, fastfashion, premium, leer_ehemals`, sonst alle). Namen nach Art aus einer Kopie der Liste in `daten.ts` (`WETTBEWERBER_NAMEN`, identisch zu `wettbewerber.js NAMEN`). Gleicher Name nie in Nachbarstädten unter 28 km (`standorte.ts KOORDINATEN`).
- **Kalibrierung:** Der Startbestand muss den gewürfelten `einzug.wettbewerb` jedes Hauses erklären. Lege fest: `wettbewerbAus(s, haus)` = Summe über offene Wettbewerber der Stadt von `staerke × Überschneidung(art, haus.format) × Lagefaktor`, gekappt auf 0..1. Erzeuge den Startbestand so, dass `wettbewerbAus` für jedes Haus höchstens ±0,05 von `einzug.wettbewerb` abweicht (Stärken passend wählen, nicht den gewürfelten Wert ändern). Damit bleibt die Ausgangslage unverändert.

## Wirkung (`wirtschaft.ts`, `ereignisse.ts`)
- Jede Woche `einzug.wettbewerb = wettbewerbAus(s, h)` neu setzen.
- Nachfrage je Gruppe in `simuliereHaus` mit Korrekturfaktor `(1 - 0.25 * w_neu_g) / (1 - 0.25 * w_start)` multiplizieren, wobei `w_neu_g` die gruppenspezifische Überschneidung nutzt. `potenzial` nicht neu berechnen.
- Überschneidung Art × Gruppe (0..1), als Tabelle in `daten.ts`:
  - modehaus: damen 1, herren 1, waesche 0,6, accessoires 0,6, kinder 0,3
  - fastfashion: damen 1, herren 0,8, accessoires 0,5, kinder 0,3
  - textildiscounter: kinder 1, waesche 0,8, damen 0,6, herren 0,6
  - offprice: alle Warenhaus-Gruppen 0,4, Sport-Gruppen 0,3; zusätzlich Offprice-Flächen der Häuser 1
  - elektronik: wohnen 0,5, spielwaren 0,3
  - premium: beauty 1, accessoires 1, damen 0,6, food 0,5
  - leer_ehemals: 0 (kein Wettbewerb, aber Frequenzverlust der Lage −2 % für alle Häuser der Stadt)
- Preisdruck: Während einer Wettbewerber-Aktion wirkt `preisdruck` zusätzlich wie Wettbewerb ×(1 + preisdruck) auf die überschnittenen Gruppen.
- Sporthäuser: Für `format === 'sport'` zählen nur `offprice` (0,3) und ein neuer Typ von Sportfilialist; dafür die Art `fastfashion` mit Sport-Überschneidung 0,4 auf sporttextil nutzen, keine neue Art.

## Verhalten (neue Datei `src/wettbewerb.ts`, Aufruf in `engine.ts wocheAbspielen` direkt nach `ereignisse`)
1. **Eigener Zufallsstrom:** alle Zufallszahlen dieses Moduls über `s.wettbewerbRng` (gleiche Mulberry/Hilfsfunktionen wie `util.ts`, aber eigener Zustand). Damit bleibt die Zufallsfolge der übrigen Engine unverändert und alte Kalibrierungen und Tests gelten weiter.
2. **Eröffnung:** Wahrscheinlichkeit je Stadt und Woche 0,002 × Kaufkraft × (1 + Anteil geschlossener Hartwig-Fläche der Stadt). Neue Art nach Lücke: die Art mit der höchsten Nachfrage-Überschneidung zu Hartwig-Gruppen mit hohem Umsatz je qm in der Stadt. Phase `eroeffnung` 4 Wochen mit Sogwirkung (Stärke ×1,5), danach `offen`.
3. **Nachnutzung:** Schließt Hartwig ein Haus (`status` wird `geschlossen`), entsteht mit Wahrscheinlichkeit 0,35 innerhalb von 26 bis 78 Wochen ein Wettbewerber im selben Gebäude (`inHartwigGebaeude`), bevorzugt `offprice`, `textildiscounter` oder `elektronik`. Meldung Typ `presse`.
4. **Schließung:** Wettbewerber mit dauerhaft schwacher Lage (Stärke unter 0,25 und Kaufkraft unter 0,9) schließen mit 0,003 je Woche; Phase `raeumung` 6 Wochen mit Preisdruck 0,6, danach `leer_ehemals` (bleibt als Leerstand stehen, kann später nachgenutzt werden). Für Hartwig in der Stadt ab dann Transferbonus wie bei eigenen Schließungen (`transferBonus`).
5. **Preisaktionen:** Je Wettbewerber 4 bis 8 Aktionen im Jahr, gehäuft in Saisonwechseln (KW 1 bis 4, 26 bis 30, 47, 52). Startet Hartwig eine Aktion (`s.marketing.aktionen`) in einer Stadt, kontern Wettbewerber mit überschnittenen Gruppen mit Wahrscheinlichkeit 0,4 innerhalb von 1 bis 2 Wochen (Preisdruck 0,3 bis 0,6, Dauer wie Hartwig-Aktion).
6. **Abwerbung:** Ersetzt die heutige feste Regel in `ereignisse.ts` (Filialleiter geht „zur Konkurrenz“): nur noch, wenn in der Stadt ein offener Wettbewerber mit Art `modehaus`, `premium` oder `fastfashion` existiert, und dann mit Namen („… geht zu Lindner & Söhne“). Die Wahrscheinlichkeit bleibt im Mittel gleich (Ziel: gleiche Zahl Abgänge über 260 Wochen ±10 %), damit die Kalibrierung hält.
7. **Reaktion auf Hartwig:** Steigt Hartwigs Umsatz in einer Stadt über 13 Wochen um mehr als 8 % gegen Vorjahr, erhöhen Wettbewerber dort die Aktionsfrequenz. Schließt Hartwig mehr als die Hälfte der Fläche in einer Stadt, steigt die Eröffnungswahrscheinlichkeit dort für 52 Wochen auf das Dreifache.
8. **Meldungen und Entscheidungen** (über `melde` und `neueEntscheidung`):
   - Eröffnung: Meldung mit Name, Art, Stadt und erwarteter Wirkung („Rund 3 % weniger Damenmode in Bochum erwartet“).
   - Schließung: Meldung plus Angebot `stadt` oder neues Angebot `uebernahme` (Typ in `AngebotTyp` ergänzen): Hartwig kann die Fläche des schließenden Wettbewerbers für ein eigenes Outlet oder als Erweiterung mieten (Miete, Umbaukosten, Frist 8 Wochen).
   - Konter einer Aktion: Meldung, keine Entscheidung.
   - Großeröffnung eines Premium- oder Modehauses in einer Hartwig-Stadt: Entscheidung mit Frist 3 Wochen, Optionen „Eröffnungsaktion dagegen“ (kostet Marge, dämpft Sogwirkung), „Stammkunden-Mailing“ (nur mit Kundenkarte, kostet Budget), „Nichts tun“ (Standard).
9. **Abfragen** (`abfragen.ts`): `wettbewerbUebersicht(s, stadt?)` (Liste mit Art, Lage, Stärke, Status, Wirkung auf Hartwig in % je Gruppe), `wettbewerbFuerGrafik(s, stadt)` (für die Grafik: id, name, art, form, lage, grundflaecheQm, status, inHartwigGebaeude, rabatt aus laufender Aktion). Hausdetail (`hausDetail`) zeigt die Wettbewerber der Stadt mit Wirkung.

## Tests (`engine/tests/wettbewerb.test.ts`)
- Startbestand: Abweichung `wettbewerbAus` zu `einzug.wettbewerb` je Haus höchstens 0,05.
- Determinismus: gleicher Seed, gleiche Wettbewerberfolge über 260 Wochen.
- Eigener Strom: Ohne Wettbewerbsereignisse (Modul im Test abgeschaltet) bleibt `historie` identisch zum Stand vor dem Auftrag für Seed 1, 52 Wochen.
- Nachnutzung: Schließung eines Hartwig-Hauses führt bei festem Seed zu einer Nachnutzung im erwarteten Fenster.
- Konter: Hartwig-Aktion löst bei passendem Wettbewerber Preisdruck aus.
- Eine offene Entscheidung nach Großeröffnung wird bei Fristablauf mit dem Standard gelöst.

## Kalibrierung und Abnahme
- `npx tsx scripts/kalibrierung.ts 1`: Jahresumsatz und EBITDA der Ausgangslage höchstens ±1 % gegen den Stand vor dem Auftrag.
- `npx tsx scripts/bot.ts <seed> 260 --tief` für Seeds 1 bis 3: Bot C überlebt weiterhin 5 Jahre. Ergebnisse aller Bots wie in `engine/README.md` neu eintragen; Abweichungen in der Überlebenswoche von Bot A, B, D über ±4 Wochen begründen.
- `npx tsx scripts/schwierigkeit-vergleich.ts leicht,mittel,schwer 1,2,3 260`: Monotonie der Stufen bleibt. Die Schwierigkeit skaliert die Schwere der Wettbewerbsereignisse (Stärke, Preisdruck), nicht ihr Eintreten, wie bei den übrigen Ereignissen.
- Neues Skript `scripts/wettbewerb-beispiel.ts` schreibt `render/wettbewerb-beispiel.json` (Seed 1, Woche 0, 30, 104, Bot C) als Datengrundlage für die Grafik.
- `engine/README.md` um `src/wettbewerb.ts` und die Ergebnisse ergänzen.

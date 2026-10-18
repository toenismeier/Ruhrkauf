# Turnaround-Engine (Arbeitstitel)

Spiellogik ohne Grafik für den Warenhaus-Turnaround-Tycoon. Reines TypeScript (strict), deterministisch über einen Seed, Geldbeträge in ganzen Euro. Die Engine kommt später unverändert in die Expo-App.

## Befehle

```
npm install
npm test                       # 55 Tests (davon 19 HQ, 15 Einkauf)
npx tsx scripts/headless.ts 1 104          # Seed 1, 104 Wochen ohne Eingriff
npx tsx scripts/bot.ts 1 260 --tief        # Bot mit Schutzschirm und tiefer Sanierung
npx tsx scripts/bot.ts 1 260 --hq          # Bot C plus HQ-Strategie (Abbau auf Soll, Ausbau, Umzug)
npx tsx scripts/hq-beispiel.ts             # schreibt render/hq-beispiel.json und hq-beispiel-umzug.json
npx tsx scripts/hq-vergleich.ts 1,2,3      # HQ-Strategien keine, pauschal, gut, Kahlschlag, Ausbau (Jahr 1 bis 3)
npx tsx scripts/kalibrierung.ts 1          # Jahres-GuV der Ausgangslage (Einkauf gibt jede Woche alles frei)
npx tsx scripts/einkauf-vergleich.ts 1,2,3 5   # Einkaufsstrategien auf Basis Bot C, je Jahr
npx tsx scripts/einkauf-beispiel.ts        # schreibt render/einkauf-beispiel.json (Woche 30, Seed 1, Bot C)
npx tsx scripts/bot.ts 1 260 --ek-nos      # weitere: --ek-em, --ek-kahlschlag, --ek-kahlschlag-frueh
npx tsx scripts/vergleich.ts               # Jahr 2 je Strategie, Liquidität ausgeblendet
```

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/types.ts` | Spielstand und alle Datentypen |
| `src/daten.ts` | 16 Warengruppen mit Saison, Städte, Lieferanten, Untermieter, Beratungen |
| `src/welt.ts` | Generator: 130 Warenhäuser, 50 Sporthäuser, Etagen, Flächen, Mieten, Personal; Balancing-Parameter `PARAM` |
| `src/wirtschaft.ts` | Nachfrage je Haus und Fläche, Sättigung je Sortiment, Personalbesetzung, Hauskosten |
| `src/ware.ts` | Wareneingang, Zahlungsziele, Kreditversicherer-Limit (Bestand und Disposition liegen jetzt in `einkauf.ts`) |
| `src/stakeholder.ts` | Bank, Kreditversicherer, Lieferanten, Vermieter, Betriebsrat, Image |
| `src/prozesse.ts` | Schließung, Insolvenz, Gläubigerversammlung, Eigentümer-Quartal |
| `src/ereignisse.ts` | Zufallsereignisse, Angebote, Entscheidungen mit Frist |
| `src/aktionen.ts` | Alle Spieleraktionen (`fuehreAus`) |
| `src/engine.ts` | Wochentakt (`wocheAbspielen`) und Liquiditätsvorschau (`vorschau`) |
| `src/hq.ts` | Hauptverwaltung: Bürogebäude, Etagen, 10 Abteilungen, Büroangebote, Zentralkosten, Wirkungen, HQ-Aktionen, `hqUebersicht`, `hqFuerGrafik` |
| `src/einkauf.ts` | 57 Warengruppen (WG) unter den 16 Bereichen, Bestand und Orders je WG, Art (NOS, Saison) und Pool (Fremdware, Eigenmarke), Orderrhythmus, Open to Buy, Freigabe-Eingang, Kennzahlen, Einkaufsaktionen, `einkaufUebersicht`, `wgDetail`, `freigaben` |
| `src/eigenmarken.ts` | Eigenmarken: Startmarken, Passung, Attraktivität, Mehrmarge, Gründen, Neupositionieren, Einstellen, `eigenmarkenUebersicht`, `eigenmarkeVorschau` |
| `src/abfragen.ts` | Cockpit, Portfolio, Hausdetail, HQ-Übersicht, Einkauf und Eigenmarken für die Oberfläche |

## Stand Balancing (Seeds 1 bis 3)

- Ausgangslage: Umsatz rund 3,1 Mrd. €, EBITDA rund -4,0 %, Q4 positiv.
- Ohne Eingriff: Insolvenz und Zerschlagung bis Woche 60 (ohne Freigaben verfallen zusätzlich die Saisonorders).
- Außergerichtliche Sanierung (Bots A und D): scheitert an Sozialplan- und Restmietkosten.
- Schutzschirm mit tiefer Sanierung (Bot C): überlebt 5 Jahre auf allen drei Seeds.

## Hauptverwaltung (HQ)

Die Zentrale ist kein Pauschalposten mehr (Vertrag: `../HQ-VERTRAG.md`). `s.hq` hält gemietete Bürogebäude mit Etagen, die 10 Abteilungen (controlling, einkauf, marketing, personal, immobilien, logistik, ecommerce, recht, vm, verwaltung) und offene Büroangebote.

- **Start:** alte, zu große Hauptverwaltung in Essen (Hartwig-Hochhaus, 12 Etagen à 1.250 qm, plus Verwaltungsscheibe, 5 × 1.300 qm, beide 1960er), alle Abteilungen auf Stufe 1, rund 1.130 FTE, 26 % Leerfläche. Verwaltung und VM sind um 60 % überbesetzt, Marketing und Personal um 25 bis 30 %, Controlling, Immobilien, E-Commerce und Recht sind schlank.
- **Fläche:** Bedarf = FTE × 14 qm, nur auf gemieteten Etagen eines gemieteten Gebäudes; eine Abteilung darf über mehrere Etagen eines Gebäudes reichen (`belegung`, `etage` = erste Etage). Ohne Fläche wirkt sie mit Stufe 0, mit zu wenig Fläche anteilig.
- **Kosten:** `s.zentrale.kostenWoche` = Personal (Lohnniveau des Standorts) + Sachkosten je FTE + Reisekosten (nach Erreichbarkeit der Häuser) + Büromiete + Nebenkosten + Strafen (Verwaltung unter Stufe 1). Die Sachkosten je FTE werden beim Start so kalibriert, dass die bisherige Zentralkostenquote (0,034) exakt getroffen wird. Restmieten gekündigter Büros laufen wie bei Häusern als Sondereffekt (52 Wochen, im Verfahren 13).
- **Soll und Stufe:** Soll-FTE = Norm × Stufenfaktor (0,5 / 1 / 1,25 / 1,5) × Größenfaktor der Kette (schrumpft mit jeder Schließungsentscheidung). Bis 3 % unter Soll ohne Verlust, darunter sinkt die wirksame Stufe stetig. Abbau wirkt verzögert (5 % je Woche), Aufbau sofort, neue FTE aber 8 Wochen nur zur Hälfte. Umzug: 4 Wochen halbe Wirkung. Jede weitere Stadt kostet 4 % Wirkung.
- **Standort** (`src/standorte.ts`): Reiseindex = mittlere Entfernung zu den offenen Häusern, an Verkehrsknoten 20 % kürzer. Er bestimmt Reisekosten und Wirkung (je 100 km über dem Startsitz 6 % weniger). Metropolen: Lohn +4 %, Recruiting billiger, Marketing und E-Commerce stärker. Großstädte außerhalb der Ballungsräume: kleinerer Fachkräftepool, Mittelstädte noch schwächer. Für die Kette mit Schwerpunkt West liegen Ruhrgebiet, Köln, Düsseldorf und Frankfurt vorn, Lübeck, Rostock oder Flensburg kosten spürbar.
- **Wirkungen** (Stufe 1 = bisherige Kalibrierung): Einkauf auf WKZ und Konditionen, Marketing auf die Budgetwirkung, Personal auf Besetzungsnorm, Betriebsrat und Moral der Filialleitungen, Immobilien auf Mietverhandlung, Anschlussmieten, Untermietanfragen und Büropreise, Logistik auf Logistikkosten, E-Commerce und VM auf den Umsatz, Recht auf Sozialplan, Abfindungen und Restmieten, Verwaltung als Pflicht. `s.controllingStufe` folgt der Abteilung Controlling (Stufe 3: genauere Aktionsmessung und Vertrauensbonus bei Bank und Kreditversicherer). Kurven in `HQ_WIRKUNG`.
- **Angebote:** jedes Quartal 2 bis 4 freie Bürogebäude in Städten mit offenen Häusern (6 Typen, Metropolen teurer), eigener Zufallsstrom `hq.rng`, damit die übrige Simulation unverändert bleibt.
- **Aktionen:** `hqMieten`, `hqEtageKuendigen`, `hqGebaeudeKuendigen`, `abteilungSetzen`, `abteilungStufe`. `zentrale` (Prozent) kürzt alle Abteilungen anteilig, `controlling` setzt die Stufe der Abteilung.
- **Abfragen:** `hqUebersicht(s)` für die Oberfläche (inkl. Standortwerten von Sitz und Angeboten), `hqFuerGrafik(s)` als reines JSON für `render/src/kit/hq.js`.

Stand Balancing HQ: `kalibrierung.ts` unverändert (Zentrale 112,8 Mio. €, 3,7 %). Bot C (`--tief`) und Bot C mit HQ-Strategie (`--hq`) überleben 5 Jahre auf Seeds 1 bis 3; ohne jede Zentralmaßnahme scheitert der Schutzschirm auf Seed 1 und 2. `hq-vergleich.ts` (gleiche Filialsanierung, Liquidität und Zufall ausgeblendet, Mittel Seeds 1 bis 3, Jahr 3 gegen "keine"): pauschal 30 % +27 Mio. € EBITDA, gute Strategie +31,5 Mio. € (Zentrale 25 % günstiger), Kahlschlag im ersten Jahr am stärksten, ab Jahr 2 schwächer (+20 Mio. €), Ausbau Einkauf und Immobilien auf Stufe 3 +36 Mio. €.

## Einkauf, Freigaben, Eigenmarken

Vertrag: `../EINKAUF-VERTRAG.md`. Die 16 Gruppen bleiben die Flächenebene (Bereiche). Darunter liegen 57 Warengruppen (`WG_DEF`, Id `bereich.kurz`, z. B. `damen.kleider`) mit Anteil am Bereich, NOS-Anteil, Margen NOS/Saison, Vorläufen (Vororder, Nachorder, NOS), eigener Saisonkurve, Mindestabnahme, Hauptlieferant und Eigenmarkenfähigkeit. Bestand, Bestellungen, Abschriften und Verbrauch laufen je WG, Art (`nos`, `saison`) und Pool (Fremdware oder Eigenmarke, `Kohorte.marke`); die Bereichsfelder (`bestand` je `gruppe`, `basisUmsatz`, Wareneinsatz je Bereich) sind die Aggregation, `wirtschaft.ts` und die übrigen Abfragen laufen unverändert.

- **Nachfrage:** Die Bruttonachfrage der Häuser je Bereich wird nach Saisonanteil auf die WG verteilt; Eigenmarken (Attraktivität aus Bekanntheit, Passung zum Haus, Qualität, Stil-Aktualität, gedämpft über die Wurzel) und der NOS-Mix verändern sie je Haus. Normiert so, dass der Startmix genau die bisherige Nachfrage ergibt.
- **Verfügbarkeit:** NOS nach Servicegrad (90/95/98 % mit Präsentations- und Sicherheitsbestand von 7/10/13 Wochen), Saison nach Reichweite gegen einen Präsentationsbestand von 12 Wochen; Altware (Saison älter 16, NOS älter 52 Wochen) deckt nur einen Teil des Bedarfs (Reduzierungsstrategie früh 45 %, normal 30 %, spät 20 %). Fehlende Eigenmarkenware weicht zur Hälfte auf Fremdware aus.
- **Orderrhythmus:** Vororder je Saison (Frühjahr/Sommer ab KW 7, Herbst/Winter ab KW 33) in der Orderrunde 30 Wochen vor Saisonstart, über 4 Wochen gestaffelt, je WG drei Orders nach Lieferant, Liefertermine 4 Wochen vor bis 9 Wochen nach Saisonstart; Nachorder alle 4 Wochen je WG (Order-up-to auf 14 Wochen); NOS wöchentlich automatisch. Einkäufer disponieren Saisonware mit Planoptimismus (7 % bei Einkauf-Stufe 1, 14 % bei Stufe 0, 1,5 % bei Stufe 3).
- **Freigabe-Eingang** (`s.einkauf.freigaben`): Orders ab der Grenze (Start 50.000 € EK) brauchen eine Freigabe; NOS nur als Sonderorder (ab 5-facher Grenze und über dem 2,1-fachen Wochenbedarf). Nach Ablauf der Frist (Vororder 3, Nachorder 2, NOS 1 Woche) gilt der Modus je WG und Art: `auto` bestellt, `verfall` streicht (Start: NOS auto, Saison verfall). Aktionen: `freigeben`, `freigabeAblehnen`, `freigabeKuerzen`, `sammelfreigabe` (Filter Bereich, WG, Art, Typ, Marke, Wert, Frist), `freigabeGrenze`.
- **Steuerung je WG** (WG-Id, Bereich-Id oder `alle`): `wgLimit` (Open to Buy als Faktor auf den rollierenden Saisonplan, Start 120 %, oder Euro je Saison; kürzt nur Saisonorders), `wgNosZiel`, `wgServicegrad`, `wgVororderquote` (Start 60 %), `wgReduzierung`, `wgFreigabeModus`; `orderLevel` wirkt weiter auf die Saisondisposition und gedämpft auf NOS.
- **Kennzahlen** (`einkaufUebersicht`, `wgDetail`): Umsatz, Rohertrag und Quote, Bestand EK, Lagerumschlag (52 und 13 Wochen), Reichweite, Abverkaufsquote der laufenden Saison, Altwarenanteil, Abschriften und Reduzierungsquote, NOS-Verfügbarkeit, entgangener Umsatz, Limit, offene Orders und Freigaben, Eigenmarkenanteil und -marge, je Kennzahl eine Ampel. Bereiche sind die Summe ihrer WG. Die Controlling-Stufe bestimmt das Rauschen (12/4/0 %), die Einkauf-Stufe Prognosefehler der Dispo, NOS-Verfügbarkeit, Planoptimismus und die Zahl sinnvoll führbarer Eigenmarken (2/4/6/8).
- **Eigenmarken** (`s.eigenmarken`): Start mit Lisanne (Damen 50 plus, klassisch, veraltet, Fernost), Brehm & Sohn (Herren 50 plus, Nahost), Casa Linde (Home, Einstieg, Fernost), Pünktchen (Kinder, Fernost), zusammen rund 8,5 % vom Umsatz. Mehrmarge 7,5 bis 14 Punkte nach Beschaffung, Preislage und Qualität; Fernost 22 Wochen Vorlauf und 150 Tsd. € Mindestabnahme. Ohne Budget veraltet der Stil. Mehr Eigenmarkenanteil als zum Start senkt WKZ und Lieferantenvertrauen der Bereichslieferanten. Aktionen: `eigenmarkeGruenden` (1,2 Mio. € plus 0,25 Mio. € je WG, Aufbau Vorlauf plus 6 Wochen), `eigenmarkeNeupositionieren` (0,8 Mio. €, 12 Wochen, Bekanntheit bleibt zu 70 %), `eigenmarkeEinstellen` (Restbestand wird Altware), `eigenmarkeAnteil`, `eigenmarkeSetzen` (Budget, Qualität, Beschaffung).
- **Bots:** `einkaufStandard` gibt alles frei und kürzt Vororders um den Umsatzanteil der Häuser in Schließung. Kalibrierung (`kalibrierung.ts`) gibt jede Woche alles frei.

Stand Balancing Einkauf (Seed 1, Jahr 1, vorher/nachher): Umsatz 3.082,8 / 3.084,1 Mio. €, Rohertrag 1.262,2 / 1.262,4 Mio. €, Abschriften 32,9 / 33,0 Mio. €, EBITDA -122,4 / -122,2 Mio. €. Bot C und Bot C mit HQ-Strategie überleben 5 Jahre auf Seeds 1 bis 3. `einkauf-vergleich.ts` (Seeds 1 bis 3, Jahr 3, echte Liquidität):

| Strategie | Umsatz | Rohertragsquote | Abschriften | EBITDA | Umschlag | Altware | NOS-Verfügbarkeit | Fehlmengen | Eigenmarken |
|---|---|---|---|---|---|---|---|---|---|
| Bot C (Standard) | 2.054 | 40,9 % | 21 | 15 | 3,9 | 2,9 % | 94,6 % | 80 | 7,8 % |
| NOS-Pflege + Limitdisziplin | 2.085 | 40,7 % | 24 | 21 | 3,7 | 1,2 % | 96,6 % | 61 | 7,8 % |
| Eigenmarken-Offensive | 2.095 | 41,8 % | 13 | 41 | 4,2 | 0,6 % | 95,5 % | 77 | 12,0 % |
| Kahlschlag Limit ab Woche 26 | 1.974 | 41,0 % | 19 | -11 | 4,6 | 3,3 % | 90,2 % | 160 | 8,0 % |

Kahlschlag Limit schon ab Woche 3 drückt das Plan-EBITDA der Gläubigerversammlung unter -25 Mio. €, der Insolvenzplan scheitert auf allen drei Seeds (Woche 23).

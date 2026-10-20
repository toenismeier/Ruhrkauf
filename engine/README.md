# Turnaround-Engine (Arbeitstitel)

Spiellogik ohne Grafik für den Warenhaus-Turnaround-Tycoon. Reines TypeScript (strict), deterministisch über einen Seed, Geldbeträge in ganzen Euro. Die Engine kommt später unverändert in die Expo-App.

## Befehle

```
npm install
npm test                       # alle Tests (davon 19 HQ, 15 Einkauf, 8 Vorstand, 5 Produkte, 9 Marketing)
npx tsx scripts/headless.ts 1 104          # Seed 1, 104 Wochen ohne Eingriff
npx tsx scripts/bot.ts 1 260 --tief        # Bot mit Schutzschirm und tiefer Sanierung
npx tsx scripts/bot.ts 1 260 --hq          # Bot C plus HQ-Strategie (Abbau auf Soll, Ausbau, Umzug)
npx tsx scripts/hq-beispiel.ts             # schreibt render/hq-beispiel.json und hq-beispiel-umzug.json
npx tsx scripts/hq-vergleich.ts 1,2,3      # HQ-Strategien keine, pauschal, gut, Kahlschlag, Ausbau (Jahr 1 bis 3)
npx tsx scripts/kalibrierung.ts 1          # Jahres-GuV der Ausgangslage (Einkauf gibt jede Woche alles frei)
npx tsx scripts/einkauf-vergleich.ts 1,2,3 5   # Einkaufsstrategien auf Basis Bot C, je Jahr
npx tsx scripts/einkauf-beispiel.ts        # schreibt render/einkauf-beispiel.json (Woche 30, Seed 1, Bot C)
npx tsx scripts/marketing-vergleich.ts 1,2,3 3  # Marketingstrategien auf Basis Bot C, je Jahr
npx tsx scripts/schwierigkeit-vergleich.ts leicht,mittel,schwer 1,2,3 260  # Plan-EBITDA und Überleben je Stufe (Bot C, Bot A, ohne Eingriff)
npx tsx scripts/bot.ts 1 260 --tief --schwer  # jeder Bot auch mit --leicht oder --schwer (Standard mittel)
npx tsx scripts/marketing-beispiel.ts      # schreibt render/marketing-beispiel.json (Woche 30, Seed 1, Bot C)
npx tsx scripts/wettbewerb-beispiel.ts     # schreibt render/wettbewerb-beispiel.json (Woche 0, 30, 104, Bot C)
npx tsx scripts/bot.ts 1 260 --ek-nos      # weitere: --ek-em, --ek-kahlschlag, --ek-kahlschlag-frueh
npx tsx scripts/vergleich.ts               # Jahr 2 je Strategie, Liquidität ausgeblendet
npx tsx scripts/vorstand-vergleich.ts 1,2,3 3   # Vorstand gut/schwach/unbesetzt und Produktstrategie gut/schlecht auf Basis Bot C
npx tsx scripts/vorstand-beispiel.ts       # schreibt render/vorstand-beispiel.json und produkte-beispiel.json (Woche 30, Seed 1, Bot C)
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
| `src/wettbewerb.ts` | Persistente Wettbewerber, eigenständiger RNG, Eröffnungen, Schließungen, Aktionen, Gegenmaßnahmen, Standortübernahmen und Grafik-Abfragen |
| `src/aktionen.ts` | Alle Spieleraktionen (`fuehreAus`) |
| `src/engine.ts` | Wochentakt (`wocheAbspielen`) und Liquiditätsvorschau (`vorschau`) |
| `src/hq.ts` | Hauptverwaltung: Bürogebäude, Etagen, 11 Abteilungen (mit Produktentwicklung), Büroangebote, Zentralkosten, Wirkungen, HQ-Aktionen, `hqUebersicht`, `hqFuerGrafik` |
| `src/einkauf.ts` | 57 Warengruppen (WG) unter den 16 Bereichen, Bestand und Orders je WG, Art (NOS, Saison) und Pool (Fremdware, Eigenmarke), Orderrhythmus, Open to Buy, Freigabe-Eingang, Kennzahlen, Einkaufsaktionen, `einkaufUebersicht`, `wgDetail`, `freigaben` |
| `src/eigenmarken.ts` | Eigenmarken: Startmarken, Passung, Attraktivität, Mehrmarge, Gründen, Neupositionieren, Einstellen, `eigenmarkenUebersicht`, `eigenmarkeVorschau` |
| `src/vorstand.ts` | Vorstand: 8 Ressorts, Personen mit Porträt-Merkmalen, Wirkung auf die HQ-Abteilungen, Delegation mit Ressort-KI, Einstellen, Entlassen, Gehalt, Boni, Abwerbung, Vorstandssitzung, `vorstandUebersicht`, `vorstandProfil`, `kandidaten` |
| `src/produkte.ts` | Produktentwicklung der Eigenmarken: Artikeltypen, Farben, Materialien, Trendbericht, Sterne, Kapazität, Wirkung auf Nachfrage und Marge, `produkte`, `produktKatalog`, `trendbericht`, `produktVorschau` |
| `src/marketing.ts` | Marketing: 9 Kanäle mit Wochenbudget, Hartwig Karte und App, CRM-Kampagnen, Aktionskalender mit Mechaniken und Effekten, Auswertung, CMO-Delegation, `marketingUebersicht`, `kanaele`, `kundenkarte`, `crmKampagnen`, `aktionskalender`, `aktionsAuswertung` |
| `src/abfragen.ts` | Cockpit, Portfolio, Hausdetail, HQ-Übersicht, Einkauf und Eigenmarken für die Oberfläche |

## Stand Balancing (Seeds 1 bis 3)

- Ausgangslage: Umsatz rund 3,1 Mrd. €, EBITDA rund -4,0 %, Q4 positiv.
- Ohne Eingriff: Insolvenz und Zerschlagung bis Woche 60 (ohne Freigaben verfallen zusätzlich die Saisonorders).
- Außergerichtliche Sanierung (Bots A und D): scheitert an Sozialplan- und Restmietkosten.
- Schutzschirm mit tiefer Sanierung (Bot C): überlebt 5 Jahre auf allen drei Seeds.
- Alle Tabellen in dieser Datei gelten für Schwierigkeit mittel.
- Ergebnis nach 260 Wochen (mittel, `bot.ts`, Seeds 1 / 2 / 3): Bot A zerschlagen W47 / W46 / W46, Bot B (Schutzschirm) W23 / W23 / W23, Bot C und Bot C mit HQ-Strategie laufen 5 Jahre, Bot D zerschlagen W52 / W45 / W45, ohne Eingriff zerschlagen W58 / W58 / W61.

### Schwierigkeit

`neuesSpiel(seed, { schwierigkeit: 'leicht' | 'mittel' | 'schwer' })`, Standard mittel; Tabelle `SCHWIERIGKEIT` und Auswahl `SCHWIERIGKEITEN` (id, name, beschreibung) in `src/schwierigkeit.ts`. Mittel ist die Kalibrierung, `kalibrierung.ts 1` bleibt exakt.

| Hebel | leicht | mittel | schwer |
|---|---|---|---|
| Image je Schließung in einer Schließungswelle (jede weitere in derselben Woche × Faktor) | 1,5 × 0,9^k | 1,5 × 0,955^k | 1,5, ungedämpft |
| Startkasse und Kreditlinie | × 1,15 | 120 / 90 Mio. € | × 0,9 |
| Geduld der Lieferanten | +0,1 | Start | -0,1 |
| Zielwert Kreditversicherer | +4 | Start | -4 |
| Schwere negativer Zufallsereignisse (Lieferantenausfall, Containerstau, Konjunkturschock, Instandhaltung, Streik); Eintreten und Zufallsfolge auf allen Stufen gleich | × 0,6 | × 1 | × 1,4 |
| Schwelle Plan-EBITDA der Gläubigerversammlung | -35 Mio. € | -25 Mio. € | -17 Mio. € |

Image Bot C nach der Schließungswelle in Woche 13: leicht 22, mittel 7, schwer 0,5. `schwierigkeit-vergleich.ts` (Plan-EBITDA der Gläubigerversammlung in Mio. €, Seeds 1 / 2 / 3, 5 Jahre):

| Stufe | Bot C Plan-EBITDA | Bot C überlebt | Bot A | ohne Eingriff |
|---|---|---|---|---|
| leicht | 17,3 / 14,3 / 14,2 | 3/3 | 0/3 (zerschlagen W50 / W48 / W49) | 0/3 (W58 / W58 / W68) |
| mittel | -2,5 / -6,4 / -7,4 | 3/3 | 0/3 (W47 / W46 / W46) | 0/3 (W58 / W58 / W61) |
| schwer | -13,6 / -15,5 / -18,7 | 2/3 (Seed 3 scheitert W23) | 0/3 (W43 / W42 / W42) | 0/3 (W58 / W54 / W57) |

Auf jedem Seed gilt leicht ≥ mittel ≥ schwer (Plan-EBITDA Bot C, Überlebensdauer Bot A und ohne Eingriff).

Plan-EBITDA zur Gläubigerversammlung je Bot und Seed, vorher (alter Image-Abzug 1,5 je Schließung ohne Dämpfung) und nachher (mittel), Mio. € (Woche):

| Bot | vorher Seed 1 / 2 / 3 | nachher Seed 1 / 2 / 3 |
|---|---|---|
| A (außergerichtlich) | -169,4 / -171,2 / -143,1 (W45 bis W46) | -170,2 / -175,4 / -143,2 (W45 bis W46) |
| B (Schutzschirm) | -147,5 / -123,2 / -118,1 (W22) | -133,5 / -110,6 / -102,8 (W22) |
| C (tiefe Sanierung) | -10,9 / -14,7 / -15,6 (W22) | -2,5 / -6,4 / -7,4 (W22) |
| C mit HQ-Strategie | -1,8 / -5,8 / -6,6 (W22) | 6,6 / 2,5 / 1,7 (W22) |
| D (außergerichtlich, konsequent) | -83,6 / -124,1 / -43,0 (W44 bis W50) | -83,5 / -124,8 / -43,3 (W44 bis W51) |
| ohne Eingriff | -169,8 / -174,6 / -179,2 (W57 bis W60) | -169,8 / -174,6 / -179,2 (W57 bis W60) |

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

Stand Balancing HQ: `kalibrierung.ts` unverändert (Zentrale 112,8 Mio. €, 3,7 %). Bot C (`--tief`) und Bot C mit HQ-Strategie (`--hq`) überleben 5 Jahre auf Seeds 1 bis 3; ohne jede Zentralmaßnahme scheitert der Schutzschirm auf Seed 1 und 2. `hq-vergleich.ts` (gleiche Filialsanierung, Liquidität und Zufall ausgeblendet, Mittel Seeds 1 bis 3, Jahr 3 gegen "keine"): pauschal 30 % +22 Mio. € EBITDA, gute Strategie +31 Mio. € (Zentrale 24 % günstiger), Kahlschlag im ersten Jahr +19 Mio. €, ab Jahr 2 kaum noch (+3 / 0 Mio. €, über drei Jahre mit Sondereffekten -23 Mio. €), Ausbau Einkauf und Immobilien auf Stufe 3 +41 Mio. €.

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
| Bot C (Standard) | 2.024 | 40,9 % | 21 | 2 | 3,9 | 3,1 % | 94,6 % | 78 | 7,9 % |
| NOS-Pflege + Limitdisziplin | 2.055 | 40,7 % | 24 | 9 | 3,6 | 1,3 % | 96,6 % | 60 | 7,9 % |
| Eigenmarken-Offensive | 2.062 | 41,8 % | 14 | 28 | 4,2 | 0,7 % | 95,5 % | 75 | 12,0 % |
| Kahlschlag Limit ab Woche 26 | 1.946 | 41,0 % | 19 | -23 | 4,6 | 3,5 % | 90,2 % | 156 | 8,0 % |

Kahlschlag Limit schon ab Woche 3 drückt das Plan-EBITDA der Gläubigerversammlung unter -25 Mio. €, der Insolvenzplan scheitert auf allen drei Seeds (Woche 23).

## Vorstand

Vertrag: `../VORSTAND-MARKETING-VERTRAG.md`, Abschnitt 1. Der Spieler ist CEO. `s.vorstand` hält 8 Ressorts (CFO, COO, CSO, CPO, CMO, CHRO, CRO, CDO) mit Person, Delegationsschaltern und Kandidaten; eigener Zufallsstrom.

- **Start:** gewachsener, mittelmäßiger Vorstand (Führung 47 bis 56, Fachwissen 46 bis 58, Loyalität 63 bis 78): Renate Kolbeck (CFO), Dieter Hambrock (COO), Murat Demirel (CSO), Gisela Wernicke (CPO), Jens Opitz (CMO), Sabine Lückemeyer (CHRO); CRO und CDO unbesetzt. Gehälter (2,59 Mio. € im Jahr) sind Teil der bisherigen Zentralkosten (Sachkosten je FTE entsprechend niedriger), die Ausgangslage bleibt exakt.
- **Wirkung:** Ressortwert = 0,65 Führung + 0,35 Fachwissen (unbesetzt 0,2), Einarbeitung 12 Wochen. Faktor auf die wirksame Stufe der Abteilungen = 1 + 0,5 × Gewicht × (Wert minus Startwert): CFO Controlling und Verwaltung, COO Logistik (Personal 0,3), CSO VM, CPO Einkauf und Produktentwicklung, CMO Marketing (E-Commerce 0,5), CHRO Personal (0,7), CRO Immobilien und Recht, CDO E-Commerce (0,5). Projekte der Vorstandssitzung wirken als befristete Boosts. `hqKosten` hat die Zeilen `vorstand` und `entwicklung`.
- **Delegation** (17 Bereiche, Start alle aus): Die Ressort-KI entscheidet mit Trefferquote 0,3 + 0,65 × Fachwissen, sonst mit typischen Fehlern (Orderniveau, zu optimistischer Quartalsplan, Freigaben liegen lassen, Kahlschlag-Limit, falsche Aushilfenquote, Halteprämien mit der Gießkanne, zu harte Mietverhandlung). Marketing-Bereiche hängt `marketing.ts` per `registriereDelegation` ein.
- **Personal:** Gehaltsforderung aus Markt je Ressort und Fähigkeiten (+10 % in der Insolvenz für Neue). Loyalität folgt Gehalt gegen Markt, Image, Boni, gewachsener Treue und Insolvenz; Abwerberisiko je Woche 0,002 × ((100 minus Loyalität)/50)³, Insolvenz × 1,5, Haltebonus × 0,4; Abwerbung als Entscheidung (Gegenangebot, Haltebonus, ziehen lassen; Standard: geht nach 4 Wochen). Einstellen über das Kandidatenkarussell (3 bis 5 je Ressort, jedes Quartal neu), Annahme nach Angebot gegen Forderung, Boni, Image, Firmenlage und Wechselwille. Entlassen: Abfindung 1 Jahresgehalt (Insolvenz 0,25) plus offener Haltebonus.
- **Vorstandssitzung** in Woche 6 jedes Quartals: Bericht je Ressort (Zahlen umso genauer, je höher das Fachwissen) und ein Projekt des Ressorts als Entscheidung (umsetzen, kleiner, vertagen); die verdeckte Güte hängt am Fachwissen des Vorschlagenden.

## Produktentwicklung

Vertrag: Abschnitt 3. `s.produkte` hält alle Produkte der Eigenmarken; 36 Artikeltypen in 9 Kategorien, 28 Farben, 10 Materialien (abgestimmt mit `render/src/kit/produktbild.js`).

- **Sterne** (0,5 bis 5) = 0,5 + 4,5 × (0,28 Zielgruppe + 0,25 Trend der Einführungssaison + 0,15 Preis und Qualität + 0,2 Entwicklung + 0,12 Team), bei Einführung mit kleinem Rauschen; nach einem Jahr im Sortiment verlieren Produkte über zwei Jahre bis zu 0,75 Sterne. Zielgruppe: Artikeltyp, Grundfarben und Wertigkeit des Materials je Gruppe (Kinder, bis 29, 30 bis 49, 50 plus). Trend: Messe-Trendbericht je Saison und Gruppe (5 Artikel, 4 Farben, 3 Materialien, 3 Farben out), deterministisch aus Seed und Saison; laufende und nächste Saison sind bekannt. Entwicklung: Budget × Dauer gegen Aufwand des Typs, kurze Entwicklungen weniger effizient. Team: Stufe der Abteilung Produktentwicklung und Fachwissen CPO. Die Vorschau zeigt eine Spanne, die mit dem Fachwissen des CPO schmaler wird.
- **Wirkung:** Gewicht je Produkt 0,375 + 0,25 × Sterne, mal (Normpreis/Preis)^1,1. Faktor auf die Markennachfrage je WG = mittleres Gewicht × Breite (0,7 + 0,15 je Produkt, höchstens 1,12) relativ zum Start, begrenzt 0,5 bis 2, im Einkauf gedämpft über die Wurzel. Margendelta je WG aus Preis, Material und Qualität der Produkte relativ zum Start (`margeVon`). Neue Marken und WG ohne Produkte bekommen ein schlichtes Grundsortiment vom Produzenten.
- **Kapazität** je Marke und Kategorie 3/5/6/8 nach Stufe Produktentwicklung; Lisannes Oberteile und Unterteile sind zum Start voll. Entwicklungsbudget läuft über die Zentralkosten.
- **Startsortiment:** 27 Produkte; Lisanne (Polyester, beige, altrosa, flieder) im Schnitt rund 2 Sterne, Brehm & Sohn, Casa Linde und Pünktchen 2,5 bis 3.

Stand Balancing Vorstand und Produkte: `kalibrierung.ts 1` unverändert (Umsatz 3.084,1, Rohertrag 1.262,4, EBITDA -122,2 Mio. €). Bot C überlebt 5 Jahre auf Seeds 1 bis 3. `vorstand-vergleich.ts 1,2,3 3` (Bot C, echte Liquidität, Strategien ab Woche 24, also nach der Gläubigerversammlung; Mio. €, Δ EBITDA gegen Start):

| Vorstand | ΔEBITDA J1 | ΔEBITDA J2 | ΔEBITDA J3 | Rohertragsquote J3 | Abgänge | überlebt |
|---|---|---|---|---|---|---|
| Start (gewachsen, nichts tun) | 0 | 0 | 0 | 40,9 % | 1,3 | 3/3 |
| gut (starke Leute, Boni, Delegation, Projekte guter Leute) | -0,5 | +8,1 | +20,8 | 41,1 % | 0 | 3/3 |
| schwach (schwache Leute, Gehalt gekürzt, alles delegiert) | -0,3 | -34,5 | +2,8 | 40,0 % | 3,3 | 3/3 |
| unbesetzt (alle entlassen) | -3,8 | -9,7 | -0,9 | 40,8 % | 0 | 3/3 |

| Produkte | ΔEBITDA J2 | ΔEBITDA J3 | Eigenmarken-Umsatz J3 | EM-Rohertragsquote | Sterne |
|---|---|---|---|---|---|
| keine (Startsortiment) | 0 | 0 | 159,7 | 55,0 % | 2,19 |
| gut (Trend und Zielgruppe getroffen) | +2,2 | +5,2 | 179,1 | 53,7 % | 3,26 |
| schlecht (am Ziel vorbei, billig entwickelt, Preise +30 %) | -5,6 | -1,9 | 146,8 | 60,6 % | 1,86 |


## Marketing

Vertrag: `../VORSTAND-MARKETING-VERTRAG.md`, Abschnitt 2. `s.marketing.stand` hält zwei Szenarien: `ist` (was der Spieler steuert) und `plan` (Standardplan: Startbudgets, Startkarte, Start-CRM, Startkalender in `referenz`). Beide laufen jede Woche mit demselben Umsatz, Netz und Zeitverlauf weiter. Alle Wirkungen (Nachfrage, Preis, Altware, Vorzug, Gewöhnung, Image) wirken als Verhältnis Ist zu Plan: Ohne Eingriff ist das Ergebnis Woche für Woche exakt die bisherige Ausgangslage, Saisonkurve und Margen haben das Standardjahr eingepreist. `s.marketing.aktionen` ist der Aktionskalender (bisherige Aktionen sind Einträge darin), `budgetQuote` die Netto-Werbequote.

- **Kanäle** (`KANAELE`): Prospekt und Beilage (größter Block, rund 42 Mio. € im Jahr), Anzeigen, Plakat, Radio, TV, Online, Social und Influencer, Schaufenster und Fläche, CRM-Grundbetrieb. Budget als Quote vom Umsatz (Wochenbudget = Quote × Ø-Umsatz der letzten 13 Wochen), Adstock je Kanal (Prospekt kurz, TV lang), abnehmender Grenznutzen, Abnutzung ab 130 % Dauerdruck, Reichweite je Altersgruppe gegen das Altersprofil des Hauses, Regionalgewichte (Prospekt, Anzeigen, Plakat, Radio, Schaufenster). Kanalwirkung 3 % der Nachfrage wie bisher, Marketingabteilung (HQ) wie bisher. Markenstärke (Start 60) folgt TV, Plakat, Social, Radio und Schaufenster langsam und wirkt auf Nachfrage und Image.
- **Kosten:** brutto 3,06 % vom Umsatz (Kanäle 2,8 %, Karte 0,25 %, App, CRM-Versand). Die Lieferantenbeteiligung an Prospekt und Anzeigen (Start rund 41 %) bringt den Standardplan netto exakt auf die bisherigen 2,5 %; kürzt der Spieler Prospekt und Anzeigen, fällt die Beteiligung anteilig weg. Sonderwerbung einer Aktion kommt dazu.
- **Hartwig Karte und App:** 4,1 Mio. Mitglieder, 38 % aktiv, 34 % Kartenanteil am Umsatz, 1 Punkt je 2 €, 42 % Mail-Einwilligung; App 650 Tsd. Downloads, 170 Tsd. aktive Nutzer, 34 % Push-Einwilligung, Qualität 0,35 (veraltet). Hebel: Punktesatz, Statusstufen (1,2 Mio. € Einführung, 0,15 % vom Kartenumsatz), Kartenrabatt (Erlösminderung), Anmeldeaktion mit Willkommensgutschein, Datenpflege (Datenqualität macht CRM treffsicherer und senkt die Mitnahme), App-Budget, App-Relaunch (1,8 Mio. €, 16 Wochen), Aktionscoupons in der App. Der Kartenanteil wirkt auf Frequenz und Punkteaktionen.
- **CRM:** Segment (alle, Altersgruppe, Kaufkraft, Inaktive, Top-Kunden, Geburtstag, Bereichs-Affinität), Kanal (Mail, Push, Brief), Angebot (Coupon x % ab Mindestbon, Mehrfachpunkte, Gratiszugabe, Info), Frequenz, Kontrollgruppe 10 %. Ergebnis je Versand: Empfänger, Öffnung (Newsletter 18 %, Geburtstag 30 %), Einlösung (Geburtstagscoupon 4,5 %, Kundenbrief 5,7 %), Mehrumsatz, Mitnahme, Rabattkosten, Versandkosten, Abmeldungen; Ermüdung je Kanal bei Dauerversand. Start: Newsletter wöchentlich, Geburtstagsgruß, Kundenbrief an Top-Kunden je Quartal.
- **Aktionskalender** (`STARTKALENDER`, Fortschreibung in KW 40 für das Folgejahr): WSV, Friends and Family, Ostern, Beauty Days, Muttertag, Mid Season Sale, Personalkauf (Sommer, Winter), SSV, Schulanfang, Wäsche Days, Jubiläumswochen, Mehrwertsteuer-Aktion, Black Friday und Cyber Week, Weihnachtspunkte; Räumung läuft je Haus wie bisher. Mechaniken: Rabatt auf alles, auf Bereiche oder gezielt auf eine WG (z. B. nur Parfüm: Nachfrage, Rabatt und Altwarenabbau wirken auf die WG, die Nachbar-WG im Bereich verlieren 25 % des Mehrabsatzes, `marketingWgTilt` in `einkaufNachfrage`), Coupon (Auflage aus Prospekt, App und Karte, Einlösung 2 bis 8 %), Mehrfachpunkte, Staffel 3 für 2, Preisreduzierung, Personalkauf. Effekte: Mehrumsatz mit Mitnahme, Vorzieheffekt (Nachfrage fehlt in den Folgewochen), Kannibalisierung anderer Bereiche im Haus, Altwarenabbau (Sale erlaubt mehr Altware in der Saisonnachfrage, Hook in `einkauf.ts`), Gewöhnung (senkt Normalpreisabsatz und künftige Aktionswirkung), Image (tiefe Rabatte). Prospekt- und Online-Kommunikation tragen 25 % der Aktionswirkung.
- **Auswertung:** wie bisher nach Ende der Aktion (Marketing übertreibt, Controlling schätzt mit Spanne nach Controlling-Stufe, Kontrollhäuser halbieren die Spanne), eigener Zufallsstrom. `aktionsAuswertung` liefert zusätzlich Rohertragseffekt, Rabattkosten, Mitnahme, Vorzieheffekt, Kannibalisierung, Altwarenabbau, Gewöhnung, Image und Ergebnis. Standardjahr (Seed 1, wahre Werte): Black Friday +21 Mio. € Umsatz, Rohertrag +1,2 Mio. €, Mitnahme 14 Mio. €; SSV +20 Mio. € Umsatz, Rohertrag -1,0 Mio. €, Altwarenabbau 3,4 Mio. €; Beauty Days +1,1 Mio. € Umsatz, Rohertrag -1,1 Mio. €.
- **Aktionen:** `kanalBudget`, `kundenkarteSetzen`, `appSetzen`, `crmKampagneAnlegen`, `crmKampagneStoppen`, `aktionPlanen`, `aktionAendern`, `aktionAbsagen`; kompatibel `marketingBudget` (skaliert alle Kanäle, trifft die Netto-Quote exakt), `aktion` (Rabatt auf alles mit Sonderwerbung), `kundenkarte` (Statusstufen, 2,5 Mio. €).
- **CMO-Delegation** (über `registriereDelegation` in `vorstand.ts`): Aktionskalender (gut: Kontrollhäuser, keine Tiefstrabatte; schlecht: Sonderaktionen), CRM (gut: Verlustkampagnen stoppen, Reaktivierung; schlecht: Zusatzmailings), Kanalbudget (Höhe je Quartal und Umschichtung zum besten Grenznutzen; schlecht: falsche Richtung).

Stand Balancing Marketing: `kalibrierung.ts 1` unverändert (3.084,1 / 1.262,4 / -122,2 Mio. €, Marketing 77,1 Mio. €). Bot C und Bot C mit HQ-Strategie überleben 5 Jahre auf Seeds 1 bis 3, Bots A und D sowie ohne Eingriff scheitern. `marketing-vergleich.ts` (Seeds 1 bis 3, Jahr 3, echte Liquidität, Mio. €):

| Strategie | Umsatz | Rohertragsquote | Bons (Mio.) | Image | EBITDA | Kartenanteil | Werbung netto | Gewöhnung |
|---|---|---|---|---|---|---|---|---|
| Standard (Bot C) | 2.024 | 40,9 % | 49 | 40,5 | 2 | 36,4 % | 37 | 0,030 |
| Rabattschlacht ab Woche 26 | 2.000 | 38,7 % | 50 | 37,8 | -52 | 36,4 % | 40 | 0,099 |
| CRM und Karte | 2.080 | 40,7 % | 51 | 40,4 | 12 | 48,2 % | 46 | 0,032 |
| Markenaufbau | 2.051 | 41,3 % | 50 | 41,1 | 0 | 36,3 % | 58 | 0,013 |

Rabattschlacht bringt im ersten Jahr mehr Umsatz (2.395 statt 2.375) und Frequenz, kostet aber gut 2 Punkte Rohertragsquote und treibt die Gewöhnung; ab Jahr 2 liegt der Umsatz unter Standard, das EBITDA rund 50 Mio. € darunter. Schon ab Woche 4 drückt sie das Plan-EBITDA unter die Schwelle, der Insolvenzplan scheitert auf allen drei Seeds (Woche 23). CRM und Karte hebt den Kartenanteil auf 48 % und liegt ab Jahr 1 vorn. Markenaufbau (Budget 2,5 % statt 1,8 %, TV, Plakat, Social, weniger Tiefstrabatte) hat die beste Rohertragsquote und das höchste Image, zahlt sich aber erst langsam aus.

## Wettbewerber als Akteure

Auftrag: `../auftraege/engine-wettbewerber.md`. Der Spielstand enthält die Wettbewerber in `wettbewerber[]` mit Art, Name/Kette, Lage, Stärke, eigener Fläche, Status, laufendem Preisdruck, Aktionszeitraum und gegebenenfalls der Nachnutzung eines Hartwig-Hauses. Die Namenslisten und Bauformen entsprechen dem vorhandenen Stadtbaukasten. Im Startbestand besitzt jede Metropole 3–5, jede Großstadt 1–3 und jede Mittelstadt 0–1 Wettbewerber; identische Namen werden im 28-km-Umkreis vermieden. Das Render-Modul selbst bleibt unverändert.

**Kalibrierung und Zufallsfolgen:** Der bisherige Wert `einzug.wettbewerb` ist individuell je Hartwig-Haus ausgewürfelt, bei mehreren Häusern derselben Stadt also mathematisch nicht allein aus identischen lokalen Wettbewerbern ableitbar. Pro Haus wird deshalb der Ausgangszustand als historischer Offset (`wettbewerbStart`, `wettbewerbRohStart`, `wettbewerbRohGruppenStart`) gespeichert. `wettbewerbAus` und die gruppenspezifische Variante berechnen *nur die Veränderung* gegenüber diesem Startzustand. Damit bleibt der Startwert exakt erhalten und `potenzial` wird nie neu kalibriert. `wettbewerbRng` ist vom übrigen Engine-RNG getrennt. `wettbewerbDeaktiviert` unterdrückt die Dynamik für Regressionstests.

**Wirkung:** Der Marktdruck ist von Warenüberlappung, Standortlage, Stärke, Eröffnungssog und Gegenaktionen abhängig. `wirtschaft.ts` wendet den Quotienten `(1 − 0,25 · w_neu_g) / (1 − 0,25 · w_start)` auf die Bruttonachfrage je Gruppe (auch Konzession) an; Offprice-Flächen erhalten einen separaten Überschneidungsfaktor. Leerstände führen erst bei *zusätzlichem* Leerstand gegenüber dem Ausgangszustand zu −2 % Stadtfrequenz je leerem Wettbewerbsgebäude. Die Schwierigkeit skaliert die Effektschwere, nicht das Eintreten.

**Dynamik und Reaktionen:** Neue Wettbewerber eröffnen marktabhängig, können an bessere Standorte ziehen und führen saisonale Aktionen durch. Hartwig-Marketingaktionen können zeitversetzte Gegenaktionen hervorrufen. Schließungen führen nach Räumungsverkauf zu Leerstand, zusätzlichen Kundentransfers und optionalen Angeboten für Outlet- oder Erweiterungsflächen (`angebotAnnehmen` oder `angebotUebernehmen`). Geschlossene Hartwig-Häuser können nach 26–78 Wochen durch Wettbewerber nachgenutzt werden. Premium- und Modehaus-Großeröffnungen erzeugen befristete Entscheidungen (Aktion, Mailing bei Kundenkarte oder Nichtstun); lokale Abwerbungen nennen den konkreten Arbeitgeber.

**Abfragen:** `wettbewerbUebersicht(s, stadt?)` liefert Akteure und Nachfragerückgang je Gruppe, `wettbewerbFuerGrafik(s, stadt)` die für die spätere Visualisierung benötigten JSON-Felder einschließlich Aktionsrabatt. `hausDetail` enthält die Wettbewerber derselben Stadt. Das Beispielskript exportiert vollständige Stadtsnapshots für Wochen 0, 30 und 104 unter Seed 1/Bot C.

**Abnahme:** `npm run typecheck`, `npm test -- --runInBand`; die neuen Wettbewerbstests prüfen Startkalibrierung, Namensabstände, Determinismus über 260 Wochen, eigenen Zufallsstrom, Nachnutzung, Konter, Fristen, Standortübernahmen und die 1-%-Jahreskalibrierung. Balancing-Ergebnisse sind erst nach erfolgreichen CI-Läufen als bestätigt zu behandeln.

## Nachbesserung Wettbewerber-Engine (19.10.2026)

- Nachfrage: Vergleich je Haus/Warengruppe und Offprice mit eingefrorenem Startwert; unveränderter Bestand ergibt einen Wettbewerbsfaktor von 1,0.
- Keine zusätzliche Verkaufsflächen- oder Umsatzgewichtung im Grundzustand. Attraktivität bei Angeboten relativ zur historischen Startbasis. Wirkungsintensität der Wettbewerbsänderungen: 0,035 (zuvor 0,18). Die Differenz wird vor Addition zum Startwert berechnet, sodass unveränderte Bestände auch auf Bit-Ebene identische Werte liefern.
- Regressionstest für Seeds 1 bis 3, Wochen 0 bis 12: vollständige Identität der `historie` bei aktiver Bestandsrechnung ohne neue Wettbewerbsereignisse gegenüber ausgeschaltetem Modul.
- Abnahmetest: mittlerer Wettbewerbsfaktor 0,97 bis 1,00 über 260 Wochen (Seeds 1–3, Stichprobe alle 13 Wochen); Umsatz und EBITDA im ersten Jahr maximal ±0,2 % zum Altmodell; Bot C auf Seeds 1 bis 3 über 260 Wochen. CI von PR #5 maßgeblich.

Lokale Abnahme: `npm run typecheck && npm test`, `npx tsx scripts/kalibrierung.ts 1`, sowie `npx tsx scripts/bot.ts <seed> 260 --tief` (Seeds 1, 2, 3).

## Premiumhäuser (Branch feat/grafik-premium)

Vier bestehende 1a-Häuser werden regelbasiert als Kronjuwelen gekennzeichnet (Warenhausformat und ID bleiben erhalten). Rang 1 Berlin/München, Rang 2 Hamburg, Rang 3 Düsseldorf. Der Nachfragebonus wird gegen die übrigen Häuser normalisiert, um die Start-Konzernumsatzbasis zu stabilisieren. Beauty/Accessoires erhalten +3 Prozentpunkte Rohmarge, Konzessionsanteil und Beratungs-FTE steigen. Premiumschutz ist standardmäßig aktiv, Investitionen wirken 26 Wochen. In Insolvenz sind getrennte Immobilien-/EBITDA-Verkäufe mit Nachverhandlung möglich. Über `premiumUebersicht` abrufbar.

**Prüfskript:** `npm run check:premium` prüft Seed 1–3, Umsatzdelta vs. A/B-Basis, Premium-Margen und 260 Wochen Bot C; `npm run export:haeuser` aktualisiert die Grafikdaten.

**Lokale Kalibrierung:** In dieser Umgebung ist kein ausführbarer Git-Checkout des privaten Repositories verfügbar. Daher sind die geforderten Typechecks, Jest-Tests, 52-Wochen-Kalibrierung und Bot-C-Simulationen für Seeds 1–3 noch offen; es werden keine ungeprüften Zahlen ausgewiesen.


### Premium-Kronjuwelen – Nachbesserung 20.10.2026 (noch nicht verifiziert)

Bot C nimmt Premiumhäuser bei der Schließungsauswahl in Woche 3 ausdrücklich aus. Auf Basis der Befunde aus Abschnitt 5 wurden die Flächenproduktivitätsfaktoren der Ränge auf **2,20 / 1,84 / 1,57** angepasst und die zusätzlichen Servicekosten auf **4,5 % (P001/P002), 4,3 % (P003), 3,0 % (P004)** des Hausumsatzes reduziert. Beide Hebel wirken über reguläre Nachfrage und `hausKosten`, nicht durch direkte Veränderung der Haus-KPI. Premium-Verkaufsangebote nutzen seitdem eigenständige deterministische IDs und verändern weder `s.rng` noch `s.zaehler`.

Der bestehende Test verlangt für die vier Häuser 11 / 11 / 9 / 6 % EBITDA-Marge mit unveränderter Toleranz von ±2 Prozentpunkten. Die A/B-Umsatzgrenze bleibt ±1,5 % im ersten Jahr. `npm run check:premium` liefert je Seed eine **Vorher-/Nachher-Tabelle pro Haus** (Umsatz, Marge), den A/B-Konzernumsatz und den vollständigen Bot-C-Vergleich inklusive W12-EBITDA, BR-Zustimmungssituation, Planentscheidung W23 sowie Laufzeit bis W260. Die Gläubigerversammlung und ihre Schwelle wurden bewusst **nicht** verändert.

**Abnahmestatus:** Noch keine ausführbaren lokalen Jest-/Typecheck-/Bot-/Render-Läufe in dieser Umgebung. Die veränderten Faktoren sind vorläufig, die Zielwerte und Bot-C-Überleben erst nach gemessenen Seeds 1–3 zu bestätigen. Bei roten Margen: zunächst Rangfaktoren, danach Konzessionen, zuletzt FTE prüfen; die Toleranz nicht aufweichen.


### Premium-Engine – Abschnitt 6 (20.10.2026; nur Engine)

Die operative Kalibrierung ist von der zufälligen Größe des umgewidmeten 1a-Hauses entkoppelt. Die vier Häuser behalten ihre regulären Warenhaus-IDs, erhalten jedoch **fixe Flächen, Etagen und Sortimentsanteile**. Das Hauspotenzial wird aus der echten Verkaufsfläche, einem gemeinsamen Referenzwert von 40 €/m²/Woche und rangabhängiger Produktivität berechnet. Die Nachfrage läuft weiter durch Sättigung, Einkauf, Warenverfügbarkeit, Wettbewerb, Marketing und Hauskosten; weder Umsatz noch DB werden direkt in die KPI geschrieben. Ein gesonderter Premium-RNG wird nicht benötigt, die Initialisierung zieht keine Zufallszahlen.

| Haus | Verkaufsfläche | Grundfläche | Etagen | Produktivitätsfaktor | Servicequote | kalkulatorische Miete am Sollumsatz |
|---|---:|---:|---:|---:|---:|---:|
| P001 Berlin | 30.000 m² | 5.000 m² | 6 | 1,55 | 6,0 % | 5,7 % |
| P002 München | 30.000 m² | 5.000 m² | 6 | 1,55 | 6,0 % | 5,7 % |
| P003 Hamburg | 18.000 m² | 3.600 m² | 5 | 1,52 | 7,0 % | 6,0 % |
| P004 Düsseldorf | 14.000 m² | 2.800 m² | 5 | 1,45 | 9,2 % | 6,5 % |

Die Personalbemessung basiert auf Referenzflächenleistung zuzüglich 15 % Beratungsaufwand; eine höhere Premium-Produktivität löst keine gleich hohe Lohnkostensteigerung aus. Eigengenutzte Immobilien haben stabile kalkulatorische Mietansätze. Für den Konzern wird die **modellierte Start-Nachfragebasis** wie bisher durch gegenläufige Normierung der übrigen Warenhäuser erhalten; die tatsächliche Jahresumsatzabweichung ist gesondert zu messen.

Ergänzte Regressionen in `tests/premium.test.ts` prüfen je Seed 1–3 die Flächen, Stockwerke, seedunabhängige Anfangsnachfrage, 52-Wochen-Umsatzrangfolge sowie weiterhin **unverändert** 11 / 11 / 9 / 6 % mit ±2 Prozentpunkten. `scripts/premium-kalibrierung.ts` berichtet nun zusätzlich Flächen und Umsatzrangfolge. Auch die bisherigen Prüfungen für A/B-Umsatz (±1,5 %), Bot C (260 Wochen), Insolvenz und RNG bleiben bestehen.

**Validierungsstatus:** Der vorliegende Branch wurde über die GitHub-Dateischnittstelle bearbeitet. Der private Checkout ist in dieser Ausführungsumgebung wegen fehlender DNS-Auflösung von `github.com` nicht verfügbar. Daher **keine neuen Messwerte** und **keine Behauptung grüner Tests**. Nach lokalem Checkout ausführen: `cd engine && npm ci && npm run typecheck && npx jest --runInBand && npm run check:premium`; zusätzlich `npx tsx scripts/bot.ts <seed> 260 --tief` für Seed 1, 2 und 3. Bei Abweichungen die Rangparameter anhand der 52-Wochen-Messungen iterieren. Grafik und Renderer wurden in diesem Arbeitsschritt nicht bearbeitet.

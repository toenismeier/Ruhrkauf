# Nachbesserung: Engine-Maßstab Phase 1 (PR #7)

Branch `feat/engine-massstab` (weiterarbeiten). Grundlage bleibt `auftraege/engine-massstab.md`, Stand in `auftraege/massstab-stand.md`.

## Befund (19.10., lokal geprüft, weil die CI wegen des Actions-Kontingents nicht läuft)
- Typecheck: drei Fehler in `welt.ts` (Belegungs-Map als `readonly` typisiert). **Behoben** in Commit `23d1278` auf diesem Branch.
- Tests: 80 grün, 9 rot.
  - `massstab.test.ts` › „S001–S044 behalten ihre IDs; nur zwei Überhang-Standorte ziehen um“: Es ziehen 3 statt 2 um.
  - `hq.test.ts` (5), `einkauf.test.ts` (1), `marketing.test.ts` (1), `vorstand.test.ts` (1): Kalibrierwerte der alten 130er-Welt. Das ist in Phase 1 erwartbar.
- Export der Hausdateien fehlt noch.
- **Fachlicher Fehler:** 53 Städte sind als `metropole` eingestuft, damit die 560 Häuser unter die Obergrenzen passen. Das ist falsch. Deutschland hat 4 Millionenstädte; im Spiel gibt es 7 Metropolen.

## 1. Stadtklassen nach echter Größe
- `metropole` genau 7: Berlin, Hamburg, München, Köln, Frankfurt, Düsseldorf, Stuttgart.
- `grossstadt`: alle übrigen Städte ab 100.000 Einwohnern (in Deutschland rund 75).
- `mittelstadt`: alle übrigen.
- Gesamtzahl der Städte bleibt bei höchstens 220.

## 2. Neue Obergrenzen (ersetzen die Tabelle in `engine-massstab.md`)
| Cluster | alle Häuser zusammen | Hartwig | Volkskauf | Sport | FUNDUS | Premium |
|---|---:|---:|---:|---:|---:|---:|
| Metropole | höchstens 9 | höchstens 5 | höchstens 2 | höchstens 2 | höchstens 2 | höchstens 1 |
| Großstadt | höchstens 6 | höchstens 3 | höchstens 1 | höchstens 1 | höchstens 1 | 0 |
| Mittelstadt | höchstens 2 | höchstens 1 | höchstens 1 | höchstens 1 | 0 | 0 |

- Hartwig und Volkskauf zusammen in einer Mittelstadt höchstens 15 Fälle.
- Mit 7 Metropolen, rund 75 Großstädten und rund 140 Mittelstädten passen die Mengen hinein. Die Hartwig-Kapazität liegt dann bei 35 + 225 + 140 = 400 für 360 benötigte Häuser.
- Größe folgt der Stadt:
  - A-Häuser nur in Metropolen und den 20 größten Großstädten,
  - B-Häuser in Großstädten,
  - C-Häuser überwiegend in Mittelstädten und als Zweit- oder Dritthaus in Großstädten.
- Mehrere Hartwig-Häuser einer Stadt: ein 1a-Haus, die übrigen in b-Lage oder Stadtteilzentrum (`lage`).

## 3. Test zu Sport-IDs
Entweder die Verteilung so ändern, dass wirklich nur die zwei Überhang-Häuser aus Berlin und München umziehen, oder den Test begründet auf die tatsächliche Zahl anpassen, wenn ein dritter Umzug aus der neuen Obergrenze zwingend folgt. Begründung in `massstab-stand.md`.

## 4. Export
```
cd engine && npx tsx scripts/haeuser-export.ts
```
- Zweimal laufen lassen, der zweite Lauf ohne Git-Diff.
- Die drei JSON-Dateien committen.
- Danach `cd render && npm run build && node pruef-staedte.js` lokal für eine Stichprobe von 20 Städten, auch neue.

## 5. Kalibrierungstests
- Die alten Kalibrierwerte in `hq.test.ts`, `einkauf.test.ts`, `marketing.test.ts` und `vorstand.test.ts` **nicht** auf die neue Welt umschreiben, nur um sie grün zu bekommen.
- Stattdessen mit `test.skip` und dem Kommentar `// Maßstab Phase 2: neu kalibrieren` markieren und in `massstab-stand.md` auflisten. Phase 2 nimmt sie wieder rein.

## 6. Ohne CI arbeiten
Die GitHub-Actions-Läufe starten derzeit nicht (Kontingent). Bis das geklärt ist, alle Prüfungen lokal ausführen und die Ausgaben (Tests, Export-Diff, `pruef-staedte`) in `massstab-stand.md` festhalten. Ein lokaler grüner Lauf mit Protokoll gilt als Abnahme für Phase 1.

## 7. Zweite Prüfung (19.10. abends)
- Nach dem Merge der Wettbewerber-Engine waren 23 Tests rot und `spiel-render.js` brach ab („Cannot read properties of undefined (reading 'name')“ in `wettbewerb.ts neuEroeffnet`). Ursache: Volkskauf- und FUNDUS-Häuser mit `nurDaten` liefen durch die Wettbewerbslogik. **Behoben** in Commit `f51ae63` auf diesem Branch: Hilfsfunktion `aktive(s)` in `wettbewerb.ts`.
- Danach sind noch 6 Tests rot. Alle hängen an der Kalibrierung der alten Welt:
  - `abnahme.test.ts`: Ausgangslage 0,2 %, Bot C fünf Jahre,
  - `hq.test.ts`: Aktion „controlling“,
  - `kalibrierung.test.ts`: Bot C Gläubigerversammlung,
  - `engine.test.ts`: tiefe Sanierung fünf Jahre,
  - `wettbewerber.test.ts`: Startkalibrierung exakt.
- Vorgehen wie in Abschnitt 5: diese Tests mit `test.skip` und dem Kommentar `// Maßstab Phase 2: neu kalibrieren` markieren, in `massstab-stand.md` auflisten, **nicht** umschreiben.
- Ausnahme: Ist ein Test wegen eines echten Fehlers rot (NaN, Absturz, Determinismus), wird er nicht übersprungen, sondern der Fehler wird behoben.
- Danach die Punkte 1 bis 4 dieses Auftrags (7 Metropolen, Obergrenzen, Sport-IDs, Export). Sie sind weiterhin offen.
- `spiel-render.js` muss mit dem Branch 0 Abweichungen liefern, bevor Phase 1 als abgenommen gilt.

## 8. Dritte Prüfung (20.10. früh)
- **Phase-1-Daten abgenommen:** 220 Städte (7 Metropolen, 73 Großstädte, 140 Mittelstädte), 360 Hartwig + 4 Premium + 86 Volkskauf + 44 Sport + 66 FUNDUS, höchstens 9 Häuser je Metropole. Typecheck grün, 95 Tests grün, 14 sauber als Phase 2 übersprungen.
- **Offen:**
  - `render/haeuser-outlet.json` fehlt im Branch. Den Export für FUNDUS nachziehen (Abschnitt 4).
  - `spiel-render.js` bricht ab mit „Wochenstreifen enthält nicht die aktuelle Kalenderwoche“. Das Spiel ist mit Bot C in Woche 23 zerschlagen, und die Woche läuft nicht weiter. Mit der neuen Welt überlebt der Bot die Insolvenz nicht.
- **Folge:** Phase 1 wird **nicht allein** in `main` gemergt, weil das Spiel dort sonst nach 23 Wochen endet. **Phase 2 (Kalibrierung) direkt auf diesem Branch anschließen.** Gemergt wird nach Phase 2, wenn Bot C auf Seeds 1 bis 3 fünf Jahre überlebt und `spiel-render.js` 0 Abweichungen liefert.
- Die Grafik-Aufträge `massstab-staedte.md` und `massstab-oberflaeche.md` dürfen schon jetzt von `feat/engine-massstab` abzweigen statt von `main`.

## 9. Vierte Prüfung (20.10. früh)
Geprüft wurde der Branch nach einem Probe-Merge von `main` (Stand nach FUNDUS und Ladenbau).
- **Konflikte beim Merge:** `auftraege/nachbesserung-massstab.md` (Version von `main` nehmen) und `render/haeuser-outlet.json` (siehe unten). Vor dem nächsten Push `main` in den Branch mergen. Der Branch liegt 84 Commits zurück.
- **Bot C überlebt jetzt auf Seeds 1 bis 3 fünf Jahre.** Ende regulär in W260, Insolvenzplan jeweils angenommen. Das ist der wichtigste Schritt.
- **Tests:** 98 grün, 14 übersprungen, 3 rot:
  - Marketing-Werbequote 2,99 % statt über 3 %,
  - Startcash 400 Mio. € statt 120 Mio. € im Schwierigkeitstest,
  - HQ-FTE-Abweichung 13 statt höchstens 10.
  - Alle drei gehören zu Phase 2: entweder kalibrieren oder begründet auf den neuen Maßstab umstellen.
- **`massstab-phase2.ts` 1,2,3** (Ziel in Klammern):

  | Kennzahl | Ist | Ziel |
  |---|---|---|
  | Umsatz Jahr 1 Hartwig | 8.000 bis 8.040 Mio. € (−10,2 bis −10,6 %) | 8.950 Mio. € ±3 % |
  | Umsatz Premium | 734 bis 736 Mio. € (−10 %) | 820 Mio. € ±3 % |
  | Umsatz Sport | 493 bis 495 Mio. € (−9 %) | 545 Mio. € ±3 % |
  | EBITDA-Quote Jahr 1 | −2,2 bis −2,7 % | rund −4 %, Q4 positiv (Q4 positiv: erfüllt) |
  | Freigaben je Woche im Mittel | 77 (max. 137) | rund 8 |
  | Laufzeit je Woche (Node) | 102 bis 106 ms | unter 60 ms |
  | Laufzeit je Woche im Browser (`spiel-render`) | 248 ms | – |

  - Umsatz: Alle Formate liegen gleichmäßig rund 10 % zu tief. Das spricht für einen globalen Faktor, nicht für einzelne Häuser.
  - Freigaben: Einkauf liefert das Zehnfache. Startfreigabegrenze und Orderrunden weiter skalieren (Phase 2, Punkt 4).
- **`spiel-render.js`:** läuft durch, 0 Anzeige- und Panelabweichungen. Aber 2 Fehler im Einkaufsteil:
  - „FEHLER Freigabegrenze +10.000 €: 175000 €“
  - „FEHLER Folgewoche: Regler und Grenze wirken weiter: Servicegrad 0.98, Grenze 175000“
  - Die Prüfung erwartet die alte Startgrenze. Entweder die Prüfung auf die skalierte Grenze umstellen oder den Regler reparieren, je nachdem, was richtig ist.
- **`render/haeuser-outlet.json`:** Die 66 FUNDUS-Häuser aus dem Export passen nicht zum Format, das der FUNDUS-Grafikbau auf `main` erwartet:
  - nur eine Fläche `konzept: 'leer'` statt der Abteilungsflächen mit `gruppe` (damen, herren, kinder, schuhe usw.),
  - Baujahr 1953 bei einer Fachmarkt-Box am Stadtrand,
  - Namen wie „FUNDUS Berlin Am Stadtrand“.
  - Der Export muss dieselben Felder liefern wie die bisherige Datei auf `main`: Flächen nach Gruppen, Baujahr passend zur Bauform (Box ab 1995, Innenstadthaus 1965 bis 1985), Name „FUNDUS <Stadt>“, bei zwei Häusern in einer Stadt mit Stadtteil.
  - Danach die Kataloge `outlets` und `outlet-lagen` rendern und prüfen, dass sie weiter funktionieren.

## 10. Fünfte Prüfung (20.10. vormittags, Stand `2f26503`)
- **Tests:** 99 grün, 14 übersprungen, 2 rot:
  - `welt.test.ts` › „jedes Haus hat Etagen, Flächen und Potenzial je Sortiment“: `gruppenFuer(h.format)` liefert für Volkskauf bzw. FUNDUS eine leere Liste, die Häuser haben aber Flächen mit `gruppe: 'damen'` usw. Entweder `gruppenFuer` für `schwester` und `outlet` ergänzen (die Gruppen aus `grafik-outlet.md` bzw. Hartwig-Gruppen für Volkskauf) oder den Test auf `!h.nurDaten` beschränken. Richtig ist das Erste, weil `engine-formate.md` die Gruppen braucht.
  - `engine.test.ts` › „Ausgangslage: Verlust im Jahr, Gewinn im Weihnachtsquartal“: Jahresquote +2,6 % statt unter −1 %.
- **`massstab-phase2.ts 1`** (Ziel in Klammern):

  | Kennzahl | Ist | Ziel |
  |---|---|---|
  | Umsatz Jahr 1 gesamt | 10.694 Mio. € (+3,7 %) | ±3 % |
  | Hartwig | 9.280 Mio. € (+3,7 %) | 8.950 Mio. € ±3 % |
  | Premium | 844 Mio. € (+3,0 %) | 820 Mio. € ±3 % |
  | Sport | 570 Mio. € (+4,6 %) | 545 Mio. € ±3 % |
  | EBITDA-Quote Jahr 1 | **+2,6 %** | rund −4 % |
  | Freigaben je Woche im Mittel | 18,1 (max. 70) | rund 8 |
  | Laufzeit je Woche | 163 ms im Mittel, Quartalswochen 1.198 ms | unter 60 ms |

- **Bewertung:**
  - Umsatz ist fast im Ziel. Dafür ist die Kette jetzt profitabel, das Spiel hätte keine Krise mehr. Die EBITDA-Quote muss zurück auf rund −4 %, über Kosten (Personal, Miete, Zentrale), nicht über Umsatz.
  - Danach Bot C erneut auf Seeds 1 bis 3 prüfen, ebenso „ohne Eingriff folgt die Insolvenz binnen zwei Jahren“.
  - Laufzeit: `laufzeitOhneQuartalsvorschauMs` 77 ms. Die Quartalsvorschau (Prognose) kostet 1,2 s und rechnet offenbar die ganze Welt für das Quartal vor. Vorschlag: Prognose nur alle 13 Wochen und nur auf Konzernebene mit Durchschnittswerten je Hauscluster statt Hausweise, oder inkrementell über die Wochen verteilt. Ziel: keine Woche über 250 ms.
- Weiter auf diesem Branch, `main` vorher hineinmergen (dort sind inzwischen Premium, FUNDUS, Ladenbau 1–3 und Reise/Woche).

## 11. Wochenverlauf im ersten Quartal abschwächen (Ummo, 20.10.2026)
Befund aus TestFlight-Wurf 1 und Claudes Nachrechnung (Seed 1, Leicht, ohne Eingriffe, 130 Warenhäuser auf `main`): EBITDA je Woche KW 1 +2,4 Mio., KW 2 −1,0, KW 3 −4,9, KW 8 −7,2, KW 13 −3,6 Mio. bei rund 47 bis 53 Mio. Umsatz je Woche. Entscheidung Ummo: **zu hart, abschwächen**.
- Januar und Februar dürfen negativ sein, aber im Mittel höchstens etwa −4 % EBITDA-Quote (Zielwert aus Abschnitt 10), keine Woche unter −6 % auf Mittel, −8 % auf Schwer; auf Leicht entsprechend milder.
- KW 1 nicht künstlich positiv: kein Sprung von + auf − zwischen KW 1 und KW 2 (Ursache suchen, z. B. fehlende Kosten oder Vorlauf in der ersten Woche).
- Ursachenanalyse in die PR: Saisonkurve Januar/Februar, Personal- und Mietkosten je Woche, Wareneinsatz/Abschriften nach Weihnachten.
- Ausrichtung (Ummo, 20.10.2026): Turnaround und Management stehen im Fokus, die Insolvenz steht ganz am Ende. Der Standardverlauf ohne Eingriffe darf im ersten Jahr nicht in die Insolvenz zwingen.
- Prüfung: Wochenverlauf 13 und 52 Wochen je Schwierigkeit als Tabelle in `massstab-stand.md`; Bot C überlebt weiter 5 Jahre.

## 12. Spielende-Kriterium Seed 3 (Claude, 20.10. abends)
Mit N02 Spielende gilt „saniert“ nur bei positivem EBITDA der letzten 52 Wochen. Bot C erreicht auf `main` Seed 1 und 2, Seed 3 endet in W260 mit rund −15 Mio. € EBITDA-52 (schon vor der Integration der Nice-to-haves). Der Test `tests/spielende.test.ts` prüft deshalb vorerst nur Seeds 1 und 2. Mit der Kalibrierung aus Abschnitt 11 Seed 3 wieder aufnehmen: Bot C muss auf Seeds 1 bis 3 saniert enden.

## 13. Prüfung Abschnitt 11 (Claude, 21.10.2026 früh, Stand `4511dd4`)
`npx tsx scripts/m7-wochenverlauf.ts` auf `feat/engine-massstab` lokal ausgeführt. Ergebnis: **nicht erfüllt.**
- Januar/Februar −7,33 % EBITDA-Quote auf allen drei Stufen (Ziel leicht −3 %, mittel −4 %, schwer −6 %). KW 1 −8,38 %, KW 13 −9,04 %; der Verlauf wird bis KW 13 schlechter statt besser.
- **Die Schwierigkeit wirkt nicht:** leicht, mittel und schwer liefern bis auf Rundung dieselben Wochenwerte. Ursache zuerst klären (wird die Stufe im Skript übergeben, greift sie im Maßstab-Szenario mit 560 Häusern?).
- Auf jeder Stufe eine Insolvenz im ersten Jahr (Vorgabe: keine).
- Bot C (mittel, Seeds 1 bis 3) wird nach 23 Wochen zerschlagen. Auf `main` überlebt er 5 Jahre; der Maßstab-Branch macht das Spiel damit unspielbar.
Auftrag: erst die Schwierigkeitsstufen wirksam machen, dann Ursachen der Verluste im großen Maßstab (Kosten je Haus der neuen Formate, Zentrale-Skalierung, Wareneinsatz nach Weihnachten) beheben, bis das Skript ohne Verstöße durchläuft. Das Skript ist die Abnahme; sein vollständiges Protokoll gehört in `massstab-stand.md`. GPT kann es nicht ausführen: jede Änderung mit erwarteter Wirkung begründen, Claude misst.

## 14. Abnahme-Maßstab umgestellt: Turnaround statt Insolvenz (Ummo, 21.10.2026)
Ummo: Der Insolvenz-Fokus wird hinten angestellt; zuerst Turnaround und Management, die Insolvenz steht ganz am Ende. Bisher war Bot C (Insolvenzantrag in KW 3, Schutzschirm, 50 Schließungen) die Referenz, ob das Spiel schaffbar ist. Das widerspricht der Ausrichtung.
Befund Claude auf `main` (21.10. früh): Bot D (`botRegulaer`, Turnaround ohne Insolvenzantrag) rutscht auf Seeds 1 bis 3 in KW 31 bis 33 in die Insolvenz und wird in KW 50 bis 52 zerschlagen (EBITDA letzte 52 Wochen −75 bis −123 Mio. €). Das Spiel ist heute nur über die Insolvenz schaffbar.
Neue Abnahme für #7 (ersetzt die Bot-C-Kriterien aus Abschnitt 11 bis 13):
- **Referenz ist ein Turnaround ohne Insolvenz:** Bot D überlebt auf Stufe mittel, Seeds 1 bis 3, 260 Wochen ohne Insolvenzantrag und endet mit positivem EBITDA der letzten 52 Wochen. Auf leicht deutlich bequemer, auf schwer knapp (ein Seed darf scheitern).
- Ohne Eingriffe (kein Bot) keine Insolvenz im ersten Jahr auf leicht und mittel.
- Bot C ist nur noch Nebenprüfung: Die Insolvenz als letzte Option muss funktionieren (Bot C darf nicht vor Woche 104 zerschlagen werden), ist aber nicht der Maßstab.
- Q1-Quoten aus Abschnitt 11 bleiben.
Hebel liegen in der operativen Wirtschaft (Personal, Ware, Zentrale, Miete, Sortiment), nicht in Insolvenzmechanik und nicht in pauschalen Gutschriften. `m7-wochenverlauf.ts` um Bot D erweitern; das Skript bleibt die Abnahme, Claude misst.

## 15. Messung Stand `37d446a` (Claude, 21.10.2026, 06:00)
- Q1 jetzt im Ziel: Januar/Februar leicht −1,54 % (schlechteste Woche −2,55 %), mittel −2,69 % (−3,85 %).
- **Zweites Halbjahr bricht ein:** ohne Eingriffe ab etwa KW 39 EBITDA-Quote −24 % bis −33 % je Woche, Insolvenz noch im ersten Jahr auf leicht und mittel. Die Verluste wurden aus dem Q1 ins zweite Halbjahr verschoben, nicht beseitigt.
- **Bot D schlechter als auf main:** Insolvenz in KW 36 bis 47, zerschlagen in KW 55 bis 66, EBITDA letzte 52 Wochen −375 bis −476 Mio. € (main: Insolvenz KW 31 bis 33, −75 bis −123 Mio. €).
Nächster Schritt: Ganzjahresverlauf je Woche erklären (Rohertrag, Personal, Miete, Zentrale, Abschriften je Woche als Tabelle), die Ursache des Einbruchs ab KW 39 beseitigen. Abnahme unverändert nach Abschnitt 14.

## 16. Messung `6abb4b4` und Zielstruktur (Claude, 21.10.2026; Entscheidung Ummo)
Messung: Typecheck grün. Q1 im Ziel (schwer Jan/Feb −4,78 %). Abnahme nach Abschnitt 14 **nicht bestanden**: Bot D wird auf allen Stufen und Seeds nach 45 bis 56 Wochen zerschlagen (EBITDA 52 Wochen −268 bis −523 Mio. €); Bot C mittel Seed 3 nach 23 Wochen. Ohne Eingriffe Jahr schwer −6,19 % (Umsatz 9.583 Mio. €, EBITDA −593 Mio. €).
Ursache laut `m7-jahresdiagnose.ts` (Seed 1, mittel):
- Kostenstruktur ohne Eingriffe im Wochenschnitt: Rohertrag vor Abschriften 42 % vom Umsatz, Personal 23 %, Miete 12,7 %, Zentrale 3,3 %. Der Fixkostenblock (rund 70 Mio. € je Woche) ist erst bei rund 170 Mio. € Wochenumsatz gedeckt.
- Bot D schließt in KW 4 79 Häuser (560 → 481), FTE 44.042 → 35.046. Danach fällt der Umsatz um rund 28 %, Personal nur um rund 20 %, Miete um rund 26 %. **Das Schließen der schwächsten Häuser kostet mehr Umsatz als Kosten** – betriebswirtschaftlich falsch: schwächste Häuser haben unterdurchschnittlichen Umsatz, und ein Teil ihres Umsatzes wandert zu Nachbarhäusern und online.
- Im vierten Quartal hoher Fehlumsatz (bis 44 Mio. € je Woche) trotz Bestand: Ware fehlt am richtigen Ort.
**Entscheidung Ummo (21.10.2026): Startlage strukturell sanierbar.**
1. Startlage ohne Eingriffe rund −4 % EBITDA im Jahr (mittel); Personalquote Richtung 20 %, Mietquote Richtung 11 %, Rohertrag bleibt rund 42 %.
2. Schließung schwacher Häuser: Umsatzverlust höchstens proportional zu ihrem Umsatzanteil; davon wandert ein Teil zu Häusern derselben Stadt bzw. Region und zu hartwig.de (Kannibalisierungsrücklauf, Größenordnung 20 bis 40 %). Kosten fallen nach Abwicklung vollständig weg.
3. Fehlumsatz im vierten Quartal senken (Allokation/Nachschub aus O05 vor Weihnachten).
Abnahme bleibt Abschnitt 14 (Bot D mittel Seeds 1 bis 3 überlebt 260 Wochen ohne Insolvenz, positives EBITDA der letzten 52 Wochen).

## 17. Referenz-Kostenstruktur und Turnaround ohne Schließungen (Vorgabe Ummo, 21.10.2026)
Ummo hat eine reale Filial-GuV eines Warenhauskonzerns geliefert (IST, Filialebene ohne Zentrale, in % vom Umsatz). Sie ist ab jetzt die **verbindliche Referenz für die Startlage** und ersetzt die Zielquoten aus Abschnitt 16 (Personal 20 %, Miete 11 %). Werte exakt so übernehmen:

| Position | IST % v. U. | Vorjahr | Plan |
|---|---:|---:|---:|
| Umsatz | 100,0 % | | |
| Wareneinsatz | −58,8 % | | |
| Bruttogewinn | 41,2 % | 41,7 % | 46,1 % |
| Übrige betriebliche Erträge | 2,3 % | | |
| Personalaufwand | −16,0 % | −15,6 % | −15,6 % |
| Fremdkräfte | −0,7 % | | |
| Miete / Leasing | −11,2 % | | |
| Mietnebenkosten | −1,5 % | | |
| Logistik | −6,3 % | | |
| Werbung | −1,8 % | | |
| Unterhalt | −1,9 % | | |
| Zahlungsverkehr | −0,2 % | | |
| Facility Management | −1,7 % | | |
| Energie | −2,4 % | | |
| IT | −0,3 % | | |
| Administrative Kosten | −0,2 % | | |
| Übrige betriebliche Aufwendungen | −0,4 % | | |
| Total OPEX | −42,4 % | | |
| **EBITDA Filialebene** | **−1,2 %** | | |

Die Zentrale kommt im Spiel zusätzlich obendrauf (eigene Kostenstelle).

Lesart (Claude, 21.10.): „Total OPEX −42,4 %“ ist **netto nach übrigen betrieblichen Erträgen**: Einzelaufwände −44,6 % + übrige Erträge +2,3 % ≈ −42,4 % (Rundung). Damit gilt Bruttogewinn 41,2 % − OPEX netto 42,4 % = EBITDA −1,2 %. Die Tabelle ist in sich stimmig; keine Ausgleichsbuchung und keine Abweichungsanzeige nötig.

**Entscheidung Ummo:** Turnaround und Sanierung müssen **auch ohne Schließungen** möglich sein.

Umsetzung:
1. **Filial-GuV in diesen Positionen** führen (Engine und Haus-Reiter/Reporting): mindestens Wareneinsatz/Bruttogewinn, übrige Erträge, Personal, Fremdkräfte, Miete, Mietnebenkosten, Logistik, Werbung, Unterhalt, Facility Management, Energie, IT/Administration/Übrige. Startwerte je Format so kalibrieren, dass der Konzern auf Filialebene bei rund −1,2 % EBITDA startet (Hartwig regulär nahe an der Tabelle; Premium besser, FUNDUS mit niedrigerem Wareneinsatz-Niveau und niedrigerer Miete, Sport/Volkskauf plausibel abweichend, Abweichungen in der PR begründen). Zentrale zusätzlich, so dass der Konzern ohne Eingriffe rund −4 % EBITDA hat (E24 bleibt in diesem Punkt).
2. **Jede Position hat mindestens einen Hebel**, der ohne Schließung wirkt, mit Kosten, Vorlaufzeit und Nebenwirkung: Bruttogewinn (Sortiment, Eigenmarken, Einkaufskonditionen, Reduzierungssteuerung; Planwert 46,1 % zeigt die Spannweite), Personal (Einsatzplanung, Produktivität, Tarif), Miete (Nachverhandlung, Flächenrückgabe/Untervermietung von Etagen), Logistik, Werbung, Energie (Technik-Umbau O08), Facility Management, Unterhalt.
3. **Neue Referenz „Bot T“** in `engine/scripts/bot.ts`: Turnaround **ohne Schließungen und ohne Insolvenz**, nur über die Hebel aus Punkt 2. Abnahme: Bot T auf mittel, Seeds 1 bis 3, 260 Wochen ohne Insolvenz, positives EBITDA der letzten 52 Wochen; auf leicht bequem, auf schwer knapp. Bot D (mit Schließungen) muss ebenfalls bestehen und darf besser abschneiden. Schließungsrücklauf aus Abschnitt 16 Punkt 2 bleibt.
4. `m7-jahresdiagnose.ts` gibt die Filial-GuV in den Positionen dieser Tabelle aus (Ist je Woche und Jahr, in % vom Umsatz), damit der Abgleich mit der Referenz direkt sichtbar ist.

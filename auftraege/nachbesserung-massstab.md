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

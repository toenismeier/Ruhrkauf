# O04 – Personaleinsatz: Implementierungsstand

**Branch:** `feat/op-personal` (Ausgangspunkt `main`).

## Umgesetzt

- Vier operative Personengruppen (Instore-Logistik 19 %, Verkauf 52 %, Kasse 19 %, Verwaltung 10 %) als Aufteilung der **bestehenden** Haus-FTE. Die Basislöhne der Alt-Engine bleiben unverändert.
- Mo–Sa-Bedarf und Soll-/Ist-Dienstplan pro Gruppe, inklusive saisonaler Kranken-/Urlaubsquoten, Umsatz- und Frequenzindikator (O02 falls vorhanden), Anlieferungen, Reduzierungslast und Warenhausstruktur.
- Planungsqualität aus dem Personalbereich in O01-kompatibler Form, deterministische Tagesabweichungen, Übersteuerung je Gruppe und Samstagskasse, Mehrbedarf bei Sonderaktionen.
- Aushilfen- und Weihnachtseinsatz mit drei fristgebundenen Optionen (Vorlage in KW 40, Entscheidung spätestens KW 44), späte Nachbuchung mit 55 % Mehrkosten und nur 65 % verfügbaren Stunden.
- Springerpool mit **clusterinterner** Stundenverschiebung, Premium-/Flagship-Sondercluster, Weiterbildung, Moral-/Fluktuationsfolgen und Einarbeitung neuer FTE (vier Wochen mit halber Produktivität).
- Auswirkungen auf beratungsintensive Verkäufe und Kaufquote sowie Verfügbarkeit durch Instore-Logistik; Kassenunterdeckung am Samstag wirkt stärker. Zusätzliche Personalkosten fließen in das Haus-DB und EBITDA, Verwaltungsmängel in die Sonstigen Kosten.
- O02-Treiberadapter mit eigener Quelle `personal` unter `h.treiberQuellen`, sofern O02 nach Integration vorhanden ist. Ohne O02 greift die Engine direkt.
- Hausdetail mit Personalreiter, Tagesbalken und Reglern; zentrale Personalseite nach Hauscluster mit Vier-Gruppen-Deckungsgrad, Springer und Weiterbildung. Personalentscheidungen sind im Posteingang verlinkt.
- Alte Spielstände ohne Personalstruktur werden beim Fortsetzen deterministisch initialisiert. Für 52-Wochen-Vergleich existiert `personaleinsatzDeaktiviert` nur als Benchmark-Testschalter.

## Integration mit parallelen Aufträgen

O01 (`feat/op-organisation`) und O02 (`feat/op-umsatztreiber`) lagen zum Start nicht auf `main`. Die Umsetzung enthält **keine Fremdänderungen** aus deren Branches. Sie nutzt den O01-kompatiblen Strukturadapter (Bereich `personaleinsatz`, Hauscluster, Sondercluster) und die O02-Treiberstruktur bei Verfügbarkeit. Bei späterem Merge müssen identische zusätzliche Felder in `types.ts` zusammengeführt und die Initialisierungsreihenfolge so festgelegt werden, dass O01 das Hausclusterbild vor O04 erstellt. O05 kann den Funktionswert `personalVerfuegbarkeit(h)` direkt verwenden.

## Prüfungen und Abnahme

- `cd engine && npm test -- --runInBand`: bestehende Regressionstests und `tests/personaleinsatz.test.ts`.
- `cd engine && npm run typecheck`: TypeScript-Typprüfung.
- `cd engine && npm run check:personal`: Seeds 1–3, Umsatz/EBITDA-Abweichung zur deaktivierten Neuplanung maximal ±1 %, anschließend Bot C über 260 Wochen.
- `cd engine && npm run perf:personal`: wöchentlicher Zeitvergleich (52 Wochen, Seed 1, Kriterium **maximal +10 ms**).
- `render/spiel.html` auf einem mobilen Gerät prüfen: Personalkachel, Hausreiter, sechs Tagesbalken, Aktionen, Posteingang, Wiederaufnahme eines Altspielstands.

**Status:** Änderungen gepusht; Prüfskripte und Tests hinterlegt, jedoch in dieser Bearbeitungsumgebung **nicht ausgeführt**. GitHub war nicht über den lokalen Container erreichbar, und GitHub Actions ist nach den Auftragsvorgaben blockiert. Deshalb ist keine Aussage „Tests grün“ oder eine gemessene Performancezahl zulässig. Merge erst nach lokalem Typecheck, Regressionstest, A/B-Abnahme und Integration von O01/O02.

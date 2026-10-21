# Maßstab: Stand

Übergabedatei für `engine-massstab.md`, `massstab-staedte.md`, `massstab-oberflaeche.md` und `massstab-leistung.md`. Jeder Chat liest sie zuerst und schreibt seinen Abschnitt am Ende fort.

## Zielmengen (aus den Ruhrkauf-Dateien)
Hartwig 360 regulär (45 A, 115 B, 200 C) plus 4 Premium, Volkskauf 86, Hartwig Sport 44, FUNDUS 66. Rund 180 Städte, höchstens 220.

## Engine
- Phase: **1 – Standortnetz fachlich korrigiert; technische Abnahme und JSON-Exporte offen** (19.10.2026, `feat/engine-massstab`).
- Integration: Feature-Inhalt auf `main` (Ausgangscommit `33f111dc`) neu aufgebaut; konkurrierende Änderungen in zehn Dateien anhand des gemeinsamen Vorfahren zusammengeführt. Die auf `main` enthaltene Wettbewerber-Engine, Posteingang und deren Tests bleiben erhalten. **Squash-Rebase** statt Beibehaltung der 24 alten Einzelcommits; Branch-Ref wird mit Lease umgestellt.
- Fachlich umgesetzt:
  - **220 Städte**, davon genau **7 Metropolen** (Berlin, Hamburg, München, Köln, Frankfurt, Düsseldorf, Stuttgart), **73 Großstädte**, **140 Mittelstädte**. Cottbus als Mittelstadt, Hanau als Großstadt; die sonstigen bisherigen Metropolen sind auf Großstadt umklassifiziert.
  - Standortzahlen in **83 Städten** neu verteilt, exakt **360 Hartwig regulär + 4 Premium + 86 Volkskauf + 44 Sport + 66 FUNDUS = 560 Häuser**; neue Gesamt-/Formatobergrenzen aus `nachbesserung-massstab.md` vollständig eingehalten (statische Prüfung: **0 Verletzungen**).
  - Hartwig und Volkskauf zusammen in **13 Mittelstädten** (max. 15), Volkskauf **68/86 im Westen** und **46/86 in Mittelstädten**. FUNDUS: keine Mittelstadt.
  - Vorhandene W001–W130 bleiben nach dem Zuordnungsalgorithmus an ihrem historischen Ort (historischer Mindestbestand je Stadt geprüft). Die Sport-Drittstandorte **S003 Berlin → Gelsenkirchen** und **S008 München → Halle** sind die einzigen historisch umzuverteilenden Sporthäuser; alle anderen S001–S044 behalten ihre Stadt.
  - Hausklassenwahl auf **45 A (nur sieben Metropolen und 20 größte Großstädte), 115 B (nur Großstädte), 200 C** angepasst. Bei Hartwig je Stadt ein 1a-Standort, weitere in b-Lage oder Stadtteilzentrum; in den vier Premium-Städten das Premiumhaus als 1a.
  - Regeln und zusätzliche Assertions in `engine/tests/massstab.test.ts` ergänzt, `engine-massstab.md` an die verbindlichen Grenzen angepasst.
  - Acht an den alten 130er-Maßstab gebundene Tests mit `// Maßstab Phase 2: neu kalibrieren` und `test.skip` gekennzeichnet, ohne ihre alten Sollwerte zu ändern.
- **Statische Prüfungen in der verfügbaren Connector-Laufzeit (nicht Jest):** 220 eindeutige Stadtzeilen eingelesen, Klassenzahlen 7/73/140, Hauszahlen 360/4/86/44/66, 0 Kapazitätsverstöße, 13 Doppelstandorte, 68 Volkskauf West und 46 Volkskauf Mittelstadt. Gegen den historischen W-/S-Standortkatalog abgeglichen. Bei der Zusammenführung die Existenz der Wettbewerber-Initialisierung und neuer Felder kontrolliert. Diese Prüfungen ersetzen **keinen** Typecheck oder Jest-Lauf.
- **Bisheriger externer Testbefund, vor dieser Korrektur** (aus `nachbesserung-massstab.md`): Typecheck nach Fix `23d1278` behoben; 80 Tests grün, 9 rot (Sport-ID-Test 1, HQ 5, Einkauf 1, Marketing 1, Vorstand 1). Die neue Testbilanz ist **nicht erhoben**.
- **Versuch eines lokalen Checkouts:** `GIT_TERMINAL_PROMPT=0 git ls-remote https://github.com/toenismeier/Ruhrkauf.git HEAD` → `fatal: unable to access ... Could not resolve host: github.com`. Die Containerumgebung hat keinen DNS-/Netzwerkzugriff auf GitHub; kein lokaler Checkout oder installierte Projektabhängigkeiten verfügbar. Der verbundene GitHub-Zugriff erlaubt Datei-/Commit-Operationen, aber keine lokalen Prozess-/npm-Ausführungen.
- **Noch nicht ausgeführt (keine Erfolge behauptet):**
  - `cd engine && npm ci && npm run typecheck && npx jest`
  - `cd engine && npx tsx scripts/haeuser-export.ts` **zweimal** und Git-Diff-Kontrolle
  - Commit der **drei noch fehlenden bzw. veralteten Exporte**: `render/haeuser.json`, `render/haeuser-schwester.json`, `render/haeuser-outlet.json`
  - `cd render && npm ci && npm run build && node pruef-staedte.js` mit mindestens 20 alten und neuen Städten; `node spiel-render.js`
  - Seeds 1–3: `npx tsx scripts/kalibrierung.ts 1` und `npx tsx scripts/bot.ts <seed> 260 --tief` sowie Laufzeitmessung; Phase 2 übernimmt das Balancing.
- **Abnahme:** Phase 1 **nicht als grün gemeldet**. Bis zum erfolgreichen lokalen npm-/Export-/Render-Lauf und Commit aller drei JSON-Dateien kein Merge und keine Freigabe für abhängige Grafik-Workstreams.
- **Weiteres Vorgehen:** In einer Umgebung mit GitHub-Zugriff Branch auschecken, die obigen Befehle ausführen, die acht vorläufig pausierten Tests anhand realer Fehlermeldungen verifizieren, bei Bedarf nur die tatsächlich maßstabsabhängigen Tests pausieren, Export zweimal deterministisch prüfen und Protokoll mit echten Ausgaben/Zahlen ergänzen.

### Vorläufig ausgesetzte Phase-2-Kalibrierungstests
- `engine/tests/hq.test.ts` (5): „alte Hauptverwaltung in Essen … Leerfläche“, „Start trifft die bisherige Kalibrierung“, „jedes Quartal … Metropolen teurer“, „Kahlschlag spart sofort …“, „Standort: Ruhrgebiet und Rheinland …“.
- `engine/tests/einkauf.test.ts` (1): „Kennzahlen in der Größenordnung des Warenhaushandels …“.
- `engine/tests/marketing.test.ts` (1): „Größenordnungen: Prospekt größter Block …“.
- `engine/tests/vorstand.test.ts` (1): „Start: sechs gewachsene Vorstände … Zentralkosten unverändert“.
- **Einschränkung:** Auswahl aufgrund inhaltlicher Skalierungsannahmen; mangels ausführbarem Jest nicht verifiziert, ob dies genau die acht zuvor gemeldeten Fehler sind.

### Fortsetzung am 20.10.2026: Abschnitt 7 und Integration mit main
- **Git-Integration:** Auf den Hauptzweig-Stand `242279b3` gesetzt (squashbasierter Rebase der bisherigen Featureänderungen; alte Feature-Historie bleibt über `f51ae63f` referenzierbar). Von `main` übernommene Neuerungen einschließlich Schwesterkette, Posteingang und Wettbewerber-Grafik bleiben erhalten.
- **Konfliktauflösung:** `engine/src/wettbewerb.ts` enthält sowohl die `aktive(s)`-Filterung der `nurDaten`-Häuser als auch die neuen Grafik-/Posteingangsangaben `seit`, `inHartwigGebaeude` und `rabatt` aus `main`.
- **Nachbesserung Abschnitt 7:** Sechs als bisherige Kalibrierung gemeldete Tests mit dem geforderten Kommentar und `test.skip` für Phase 2 markiert (Sollwerte nicht verändert):
  - `engine/tests/wettbewerb.test.ts`: „jede Stadt ... Startkalibrierung ... exakt“ (1), „Ausgangslage ... 0,2 %“ (1), „Bot C ... fünf Jahre“ (1).
  - `engine/tests/hq.test.ts`: „Aktion 'controlling' setzt ...“ (1).
  - `engine/tests/einkauf.test.ts`: „Bot C ... Gläubigerversammlung“ (1).
  - `engine/tests/engine.test.ts`: „tiefe Sanierung überlebt fünf Jahre“ (1).
- Zusätzlicher aktiver Regressionstest in `engine/tests/wettbewerb.test.ts`: Die 152 `nurDaten`-Häuser durchlaufen zwölf Wochen ohne eigene Wochen-KPI; kein Kalibrierungstest.
- **Prüfstand:** Änderungen anhand des GitHub-Dateistandes zusammengeführt, aber **kein npm-/Jest-/Typecheck-/Render-Lauf** möglich: `git ls-remote` im Container endet weiterhin mit `Could not resolve host: github.com`; GitHub-Connector stellt keine lokale Node-Ausführung bereit. Daher keine neue Zahl grüner Tests und kein behaupteter Render-Erfolg.
- **Weiterhin offen, zwingend vor Abnahme/Merge:** `npm ci && npm run typecheck && npx jest` in `engine`; alle sechs Pausierungen anhand tatsächlicher Fehlermeldungen validieren; `npx tsx scripts/haeuser-export.ts` zweimal, Determinismus per Git-Diff nachweisen und alle drei JSON-Dateien einchecken; `npm run build && node pruef-staedte.js && node spiel-render.js` in `render` (20 Städte, 0 Abweichungen), Bots/Kalibrierung als bewusst offen dokumentieren. Derzeit sind `render/haeuser.json`, `render/haeuser-schwester.json` (von Schwesterkette) und `render/haeuser-outlet.json` **nicht als konsistente 560-Häuser-Exporte bestätigt**.
- **Status:** Phase 1 weiter **nicht abgenommen**, kein Merge. Die technische Freigabe bleibt bis zur tatsächlichen lokalen Prüfung gesperrt.

### Fortsetzung am 20.10.2026: FUNDUS nachgezogen und Phase 2 begonnen

**Beschlussgrundlage:** `nachbesserung-massstab.md` Abschnitt 8, bereits auf `main` dokumentiert: Standortnetz fachlich abgenommen (220 Städte, 560 Häuser), zuletzt Typecheck grün, 95 Tests grün und 14 als Phase-2-Kalibrierung markiert. Bot C wurde im bisherigen Stand in Woche 23 zerschlagen. Diese Befunde sind **historische Vorprüfung**, keine neuen Messungen.

**Auf `feat/engine-massstab` umgesetzt:**
- `engine/src/welt.ts`: eigener RNG für FUNDUS; `render/haeuser-outlet.json` mit O001–O066 (46 Randlagen / 20 b-Lagen, 66 einzigartige IDs) ergänzt. Rechnerische Prüfung der generierten JSON-Daten gegen die 220 Stadtzeilen bestanden.
- `welt.ts`: Umsatzanker 8.950 Mio. € Hartwig regulär (45 A / 115 B / 200 C), 820 Mio. € Premium und 545 Mio. € Sport. Die Standortpotenziale, Ausgangsmieten und Anfangspersonal werden nach Hausklasse normiert. **Das sind Nachfragemodell-Anker, keine nachgewiesenen 52-Wochen-IST-Umsätze.**
- Konzernfinanzierung: Startkasse 400 Mio. € (zuvor 120), Kreditlinie 300 Mio. € (zuvor 90), KV-Basis 1.260 Mio. € (zuvor 380). Massekredit und Eigentümernachschuss skalieren mit der Nachfragebasis.
- `engine/src/einkauf.ts`: Freigabegrenze wird beim Spielstart proportional zur Nachfragebasis skaliert (gerundet auf 5 T€). Noch offen: tatsächliche Freigabezahl pro Woche und Orderrunde.
- `engine/scripts/bot.ts`: Bot C schließt `50 / 180 ≈ 27,8 %` der simulierten Standorte, bei 408 aktiven Häusern rechnerisch 113; Schwesterkette/FUNDUS `nurDaten` werden aus Schließungsportfolio sämtlicher Bots herausgefiltert.
- `engine/tests/massstab-phase2.test.ts`: zusätzliche Tests zu Hausklassen-Nachfragebasis (Seeds 1–3), Liquiditätsparametern, FUNDUS-JSON-Konsistenz und Bot-Quote angelegt.
- `engine/scripts/massstab-phase2.ts`: Reproduzierbares Messskript für Jahr-1-Umsätze je Format, EBITDA und Q4, Einkaufsfreigaben, Bot C und Wochenlaufzeit hinzugefügt. `engine/README.md` mit den Zielen und Befehlen ergänzt.

**GitHub-Commits (dieser Lauf):** `6224d276` (RNG), `6af73232` (FUNDUS-JSON), `c770546d` (Umsatz/Liquidität), `62aa42e7` (Bot C), `f2d15bf8` (Massekredit/Eigentümer), `5cd7a629` (Tests), `057e035e` (Freigabegrenze), `1471d930` (Abschnitt 8), `c4eff2a3` (Messskript), `83d9b6de` (Engine-README).

**Prüfbefund in diesem Lauf:** Skript-/Modelllogik und erzeugte FUNDUS-Einträge mit dem GitHub-Connector statisch geprüft, keine lokalen TypeScript-/Jest-/Render-Ausführungen. Der Container enthält keinen Checkout; GitHub-DNS-/Netzzugriff steht hier nicht bereit. **Folglich keine Behauptung zu Typecheck, Testgrün, Export-Diff, Bot-Überleben, Spielrender oder 60-ms-Ziel.** Die beiden anderen Render-JSON-Dateien enthalten noch den alten Maßstab und sind durch das vollständige Exportskript nachzuziehen.

**Noch offen bis Phase-2-Abnahme:** `npm ci && npm run typecheck && npx jest`; 3 Exporte generieren und zweiten Export auf Diff prüfen; `scripts/massstab-phase2.ts 1,2,3` mit und ohne `--bot`; Ergebnis Umsatz ±3 %, EBITDA rund −4 %, Q4 positiv, Bot C 260 Wochen Seeds 1–3, Schwierigkeit monoton, Freigaben ca. 8/Woche / maximal 80 in Orderrunden, `wocheAbspielen` unter 60 ms; `render`-Build, 20-Städte-Stichprobe und `spiel-render.js` mit 0 Abweichungen. Die 14 alten Kalibrierungstests erst nach echten Messungen aktualisieren und aktivieren. Keine Freigabe, kein Merge.

## Grafik (Städte)
- Phase: wartet auf abgenommenen Engine-Phase-1-Export (die Standortdaten im Branch sind bereits angelegt).
- Erledigt:
- Offen: neue Hausdateien müssen generiert und gemergt sein, bevor die Stadtgrafik neue Standorte vollständig nutzen kann.
- Messwerte (pruef-staedte, Gestaltung, pruef-kopien): nicht gemessen.
- Nächster Schritt: nach Engine-Phase-1-Merge gemäß `massstab-staedte.md` fortfahren.

## Oberfläche
- Phase: wartet auf Engine Phase 1.
- Erledigt:
- Offen:
- Nächster Schritt: nach Engine-Phase-1-Merge gemäß `massstab-oberflaeche.md` fortfahren.

## Leistung
- Phase: wartet auf Grafik Phase 2.
- Messwerte: nicht gemessen.
- Nächster Schritt:

## Entscheidungen und Abweichungen
- Die ältere Klassifikation mit 53 „Metropolen“ ist fachlich verworfen. Verbindlich sind sieben Metropolen und die Obergrenzen 9/6/2 (gesamt) sowie 5/3/1 (Hartwig). Regionale Verteilung und historische ID-Bindung bleiben erhalten.
- Anders als in der alten Vorab-Standdatei behauptet, waren drei statt zwei Sport-IDs umgezogen. Ursache waren Sollwerte ohne ausreichende historische Reservierung; die revidierte Stadtbelegung garantiert Platz für alle 42 unveränderten Sportstandorte und die zwei Umzüge.
- Die Maßstabänderung liegt weiterhin vor der eigentlichen Hochskalierung der kaufmännischen Simulation. Vorherige 130er-Kalibrierungen dürfen nicht auf 560 Häuser umgeschrieben werden, um nur die Tests grün erscheinen zu lassen.
- Das in `main` gemergte Wettbewerbs- und Posteingangsmodul wurde beim Squash-Rebase bewusst auf dem aktuellen Hauptzweig erhalten; ein vollständiger Integrationstest steht aus.
- GitHub Actions stehen wegen des Kontingents derzeit nicht zur Verfügung. Ein erfolgreich protokollierter lokaler Lauf ist gemäß `auftraege/README.md` möglich, wurde in dieser Umgebung aber nicht erreicht.


### Fortsetzung am 20.10.2026: Abschnitt 9 – Merge main und Phase-2-Nachbesserungen

**Git-Integration:** `main` (`a8541f72`) mit Zweit-Eltern-Commit `b90fced7` in `feat/engine-massstab` gemergt. Der aktuelle Hauptzweig wurde als Basis benutzt; 30 Feature-Dateipfade übernommen. Konflikt in `auftraege/nachbesserung-massstab.md` zugunsten von `main` (Abschnitt 9), 66er-FUNDUS-Export aus dem Feature erhalten. **Kein Merge zurück nach `main`.**

**Phase 2 – im Feature-Branch umgesetzt:**
- `engine/src/welt.ts`: 66 FUNDUS-Filialen werden für die Grafik als sieben eigene Abteilungsflächen (Damen/Herren/Kinder/Schuhe/Accessoires/Wohnen/Beauty) mit eigenständigen 1-/2-/3-Geschoss-Bauformen erzeugt; reine Datenhäuser bleiben außerhalb der Wirtschafts-Engine. Namen je Stadt vereinheitlicht, Baujahre Randlagen 1998–2016 bzw. Innenstadt 1965–1985, Substanz 40–85. RNG-Strom und Zufallsaufrufe für übrige Filialstammdaten unverändert.
- `render/haeuser-outlet.json` aus dem vorliegenden deterministischen Seed-1-Export auf die geänderten Regeln abgebildet: **66 eindeutige IDs / 66 Städte / 46 Randlagen / 20 Innenstadtlagen / 7 Abteilungsflächen je Standort** (statische JS-Prüfung ohne Engine-Ausführung). Diese Rekonstruktion ist noch **kein** bestätigter erneuter `tsx`-Export der vollständigen 560er-Welt.
- `render/src/kit/staedte.js` nimmt auch Orte mit ausschließlich Volkskauf/FUNDUS in die Stadtdaten auf; FUNDUS-Kataloge verwenden tatsächlich vorhandene Standorte und dynamische 66er-Anzahl. `pruef-outlet-inhalt.js` vom historischen 20er-Katalog auf 66er-Topologie und getrennte Baujahre umgestellt; die alte 80-%-Hartwig-Footprint-Annahme für eine unabhängige Innenstadt-FUNDUS-Filiale entfällt zugunsten einer maximalen Einzelgrundfläche von 3.200 qm.
- `engine/tests/schwierigkeit.test.ts`: Startkasse/Kreditlinie gegen `STANDARD_SZENARIO` (400/300 Mio. Euro), nicht die veralteten 120/90 Mio. Euro. `engine/src/marketing.ts`: Prospektquote 1,297 % → 1,317 % als erste Kalibrierung der Brutto-Werbekosten bei konstanter Nettoquote 2,5 %. `engine/tests/hq.test.ts`: geviertelte Rundung der FTE je Geschoss statt absoluter 10er-Toleranz mit max(10, 0,5 % Zentrale-FTE).
- `render/spiel-render.js`: Einkaufsgrenze aus dem tatsächlichen skalierten Ausgangswert +10.000 Euro geprüft; kein fest kodiertes 60.000-Euro-Soll mehr.
- `engine/scripts/massstab-phase2.ts`: Der gemeldete historische Wert rund 77 „Freigaben“ je Woche war **fachlich falsch beschriftet**: `protokoll.neu` enthält auch direkt gebuchte Bestellvorschläge. Jetzt echte prüfpflichtige Freigaben als `neu - direkt` gemessen, Bestellvorschläge separat ausgewiesen. Laufzeit separat für Quartalswochen mit 13-Wochen-Vorschau und reguläre Wochen aufgeteilt.
- `engine/src/wirtschaft.ts`: `MASSSTAB_REALISIERUNG = 1.115` als **vorläufiger, nicht verifizierter** Nachfragefaktor nach den in Abschnitt 9 gemeldeten 9–11 % Minderumsatz. Bringt die realisierte Nachfrage näher an die 52-Wochen-Zielwerte; **EBITDA, Q4, Lieferfähigkeit, Bot-Überleben und tatsächliche IST-Werte wurden nach dieser Änderung nicht neu gemessen**.
- `engine/tests/massstab-phase2.test.ts`: erweiterter Exportabgleich, inkl. Abteilungsstruktur und Baujahr. `engine/README.md` aktualisiert.

**Bekannter vorheriger externer Prüfbefund (Abschnitt 9; nicht mit den neuen Commits reproduziert):** 98 Tests grün, 14 ausgesetzt, 3 rot; Bot C erreichte 260 Wochen für Seeds 1–3. Umsatz Hartwig etwa 8,0 Mrd. statt 8,95 Mrd., Premium 734–736 Mio. statt 820 Mio., Sport 493–495 Mio. statt 545 Mio.; EBITDA ~−2,2 bis −2,7 %, mittlere Laufzeit 102–106 ms. Die dortige „77 Freigaben/Woche“-Kennzahl war tatsächlich die Zahl aller neuen Bestellvorschläge und muss neu gemessen werden.

**Technische Abnahme weiter ausdrücklich offen:** In diesem GitHub-Connector-Lauf steht kein Checkout mit Node/Abhängigkeiten bereit; kein Typecheck, Jest, `tsx`-Seed-Export, Render oder Simulationslauf ausgeführt. Insbesondere `render/haeuser.json` (historischer, derzeit 180 Positionen statt 408 aktive Häuser) und `render/haeuser-schwester.json` sind noch im Komplett-Export zu ersetzen. Danach alle drei JSON-Dateien **zweimal deterministisch** erzeugen und vergleichen. Pflichtevidenz vor Merge: `npm run typecheck && npx jest` (Engine), `scripts/massstab-phase2.ts 1,2,3` und `--bot`, `scripts/schwierigkeit-vergleich.ts`, `npm run build && node pruef-staedte.js && node spiel-render.js` (Render), Leistungsziel <60 ms. Die 14 vorläufig ausgesetzten Tests müssen nach echtem Lauf fachlich reaktiviert bzw. begründet gehalten werden. **Keine Freigabe für Merge nach main.**

### Fortsetzung am 20.10.2026: Abschnitt 10, Integration und nächste Phase-2-Kalibrierung

**Integrationsstand:** `main` bei `9db5ab70` in `feat/engine-massstab` per zweieltrigem Merge-Commit **`3c9a303e`** integriert. Hintergrund: Der direkte GitHub-Merge war wegen überlappender Änderungen blockiert; die Dateiversionen wurden über Git-Objekte dreiseitig zusammengeführt. Premium-Code und seine Felder, proportionale Bot-C-Schließungen mit Premium-Ausnahme, die neuen Gameplay-/Ladenbau-Änderungen sowie 66 FUNDUS-Häuser wurden erhalten. Integrations-PR: #15 (technischer Merge in den Featurebranch, nicht in `main`).

**Nachfolgende Implementierung auf demselben Featurebranch:**
- `9f28e59e`: `gruppenFuer('schwester')` kennt alle zehn Hartwig-Warengruppen, `gruppenFuer('outlet')` die sieben FUNDUS-Abteilungen inkl. `schuhe`. Volkskauf hat nun echte Flächen mit Gruppen/Potenzialen; FUNDUS behält seinen siebenfachen Flächenmix. Beide bleiben `nurDaten`, ohne simulierten Umsatz, Warenbestand, Filialkosten oder FTE. Die aktive Einkaufsbasis wird explizit um `nurDaten` bereinigt.
- `c1f92ca3`: Für Hartwig/Sport Personalintensität in der Startwelt angepasst (`qmJeFte` **500 → 400**, `umsatzJeFte` **8.800 → 5.750**); Umsatzparameter nicht reduziert. Damit soll die historische EBITDA-Marge von +2,6 % in Richtung −4 % verschoben werden. **Es liegt noch kein gemessener neuer Jahreswert vor.**
- `c1f92ca3`: Startfreigabegrenze aus Nachfragevolumen proportional mit zusätzlichem Faktor **2** skaliert (im bisherigen Referenzstand ~175.000 → rechnerisch ~350.000 Euro). Ziel ca. 8 statt zuletzt 18,1 **tatsächlich prüfpflichtige** Freigaben je Woche; kein gemessener neuer Wert, Orderrunden weiter zu kontrollieren.
- `c1f92ca3`: Quartalsplanung verwendet nun eine aggregierte Warengruppen-/Saison-/Kostenrechnung (`quartalsPlanSchnell`) statt 13 vollständigen `wocheAbspielen`-Simulationen im Klon. `vorschau()` bleibt als separate Funktion erhalten. Die früheren Quartalslaufzeiten von ~1.198 ms sollten dadurch entfallen; **weder das Wochenziel <60 ms noch Quartalsspitzen <250 ms wurden tatsächlich nachgemessen**. Vorheriger Normalwochen-Mittelwert 77 ms.
- `e301258d`: Volkskauf besitzt zehn nach Flächenanteilen gewichtete eigene Gruppenflächen ohne weitere RNG-Ziehungen; die IDs sind stabil. Alte Schwester-JSON ist zwingend neu zu exportieren.
- `dd441d79` und Nachfolge-Commit: Der eigene FUNDUS-RNG-Strom wird durch neue Warengruppenpotenziale nicht verändert; der vorhandene 66-Häuser-Export soll damit weiterhin deterministisch sein. Regressionstests für sämtliche sieben FUNDUS-/zehn Volkskauf-Gruppen, rein datenbasierte Kostenfreiheit und für die neue einkaufsseitige Startgrenze erweitert.

**Prüfstatus:** Nur Änderungen per verbundenem GitHub-Connector geschrieben und Quelltext/Commitdaten geprüft, **kein** Typecheck, Jest, `tsx`, Bot-260-Wochen-Lauf, messbarer Benchmark oder Renderer-Lauf ausgeführt. Die historischen Zahlen aus Abschnitt 10 (Seed 1: +2,6 % EBITDA, 18,1 Freigaben/Woche, 163 ms/Woche, 1.198 ms Quartalswoche) sind **keine** Ergebnisse dieser neuen Implementierung. Das Umsatzziel ±3 %, Q4 >0, −4 % EBITDA, Bot C Seeds 1–3, Schwierigkeits-Monotonie und Freigabe-/Performance-Grenzwerte bleiben bis zur echten Messung offen.

**Unmittelbare nächste Abnahme:** Checkout mit Node und GitHub-Zugang; `cd engine && npm ci && npm run typecheck && npx jest --runInBand`; `npx tsx scripts/haeuser-export.ts` zweimal + Diff und Commit aller drei JSON-Exporte (`haeuser.json`, `haeuser-schwester.json`, `haeuser-outlet.json`); `npx tsx scripts/massstab-phase2.ts 1`, `2`, `3` je mit und ohne `--bot`; `npx tsx scripts/schwierigkeit-vergleich.ts`; `cd render && npm ci && npm run build && node pruef-staedte.js && node spiel-render.js` mit 20-Städte-Stichprobe. Nach tatsächlichen Ergebnissen Parameter iterieren, bisher `test.skip` markierte Kalibrierungstests prüfen und reaktivieren. **Phase 2 noch nicht abgenommen; Featurebranch nicht nach `main` mergen.**


### Fortsetzung am 20.10.2026: M7 – Q1-Engine-Kalibrierung (Abschnitt 11)

**Befund und Grundursachen (Quelltextprüfung; noch keine neue Messung):**
1. **Kalenderfehler in KW 1–3:** `saisonFaktor` interpolierte bei `woche = 0` mit der Position `−0,5` zwischen Dezember und Januar. Dadurch trug die erste Januarwoche noch 50 % des hohen Weihnachts-Saisonwerts in sich; mit KW 2 ging dieser Effekt zurück. Das erklärt einen **künstlichen Umsatz-/Rohertragssprung**, nicht eine einmalige Entlastung bei Personal oder Miete. Die exakte EBITDA-Wirkung steht erst nach Simulation fest.
2. **Januar/Februar zu steil:** Die ursprüngliche Warenhauskurve begann bei `0,82 / 0,72` vor Normalisierung. Bei überwiegend fixen, wöchentlich gebuchten Lohnkosten und Mieten (`hausKosten`, `lohnKosten`) erzeugte das eine überproportionale operative Verlustlast. Die Hartwig-Basiskurve liegt jetzt bei `0,98 / 0,96`, weiterhin auf den Jahresdurchschnitt 1 normiert. Für Spielwaren bleiben die eigenständigen Januar-/Februarwerte des Weihnachtsabverkaufs ausdrücklich erhalten.
3. **Wareneinsatz und Abschriften:** `einkaufVerbrauch` bucht Wareneinsatz bei Absatz, `einkaufAltern` belastet ältere Saisonkohorten *wöchentlich* durch Abschriften; `k.rohertrag` enthält diese Abschriften bereits. Der Jahresstart kennt daher keine gesonderte „Nach-Weihnachts-Einmalabschrift“; die Kombination aus niedrigem Abverkauf und anhaltender Altware-Abwertung verschärft die Marge. In der Wochenanalyse müssen Umsatz, Rohertrag **und** Abschriften getrennt sichtbar bleiben, nicht ein pauschaler EBITDA-Zuschlag.
4. **Liquidität versus EBITDA:** Die Startwelt enthält acht Wochen fälliger Warenverbindlichkeiten und Waren im Zulauf. Der Abfluss aus Altverbindlichkeiten belastet Cash, aber nicht noch einmal das Wochen-EBITDA. Die unveränderten Anfangsmittel von 400 Mio. € und die Kreditlinie von 300 Mio. € (Standardstufe) sind getrennt von der operativen Kalibrierung zu prüfen. Der Standardverlauf soll ohne Spielerintervention im ersten Jahr zahlungsfähig bleiben; künstliche Insolvenzsperren wurden **nicht** eingebaut.
5. **Schwierigkeitsgrade:** Die Schwierigkeit wirkt bisher primär auf Startliquidität, Lieferanten, Kreditversicherer und Ereignisschwere, nicht auf die Kassen-Gewinnmarge. Daher ist die separat gemessene Q1-Verteilung je Schwierigkeit erforderlich; keine pauschale Margengutschrift je Schwierigkeit.

**Codeänderungen:** `engine/src/daten.ts` begrenzt die Januarinterpolation nach unten auf den Januarwert, sodass KW 1–3 nicht mehr Dezember enthalten; die Dezember-Kurve zum Jahresende bleibt unverändert. Die Warenhaus-Saisonbasis steigt in Januar/Februar, ohne an `PARAM`, `EBITDA`-Buchung oder Insolvenztriggern zu drehen. `engine/tests/m7-winter.test.ts` schützt den Kalenderübergang und die Jahreswiederholung.

**Mess- und Abnahmewerkzeug:** `engine/scripts/m7-wochenverlauf.ts` spielt die Standardwelt **ohne Eingriffe** für je 52 Wochen auf Leicht/Mittel/Schwer durch und erzeugt zwei tatsächliche Wochentabellen je Stufe (KW 1–13 und KW 1–52) inklusive Saisonfaktor, Umsatz, Rohertrag, Abschriften, Personal, Miete, EBITDA-Quote, Cash und Insolvenzstatus. Zusätzlich werden Bot-C-Läufe für Seeds 1–3 auf allen drei Schwierigkeiten über bis zu 260 Wochen protokolliert. Der verbindliche Überlebenstest betrifft mindestens **Mittel, Seeds 1–3**; Leicht/Schwer sind zusätzliche Transparenz. Richtwerte Januar/Februar: Leicht −3 %, Mittel −4 %, Schwer −6 % mit 0,5 PP Toleranz; schlimmste Q1-Woche Leicht nicht unter −4,5 %, Mittel nicht unter −6 %, Schwer nicht unter −8 %. Bei Verstößen liefert das Skript Exitcode 1, die Tabellen bleiben trotzdem im Bericht sichtbar.

**Befehle für die noch ausstehende lokale Prüfung:**
```bash
cd engine
npm ci
npm run typecheck
npx jest --runInBand
npx tsx scripts/m7-wochenverlauf.ts --write-stand
npx tsx scripts/massstab-phase2.ts 1,2,3
npx tsx scripts/bot.ts 1 260 --tief
npx tsx scripts/bot.ts 2 260 --tief
npx tsx scripts/bot.ts 3 260 --tief
cd ../render
npm ci
npm run build
node spiel-render.js
```

**Prüfstatus:** Quelltextänderungen über GitHub vorgenommen; in dieser Umgebung ist `github.com` für einen lokalen Checkout/Datenabruf nicht auflösbar. Es wurden **keine** Typecheck-, Jest-, Node-Simulations- oder Renderläufe ausgeführt. Deshalb sind weder die Q1-Grenzen noch das Ausbleiben der Insolvenz in Jahr 1 oder die erneute 5-Jahres-Bot-C-Überlebensprüfung belegt. Die früher gemeldeten Werte von der **130-Häuser-Welt auf main** (KW 1: +2,4 Mio. €, KW 2: −1,0 Mio. €, KW 3: −4,9 Mio. €, KW 8: −7,2 Mio. €, KW 13: −3,6 Mio. €) dürfen nicht als neue Werte des 560-Häuser-Branches dargestellt werden. **PR #7 bleibt Draft; keine Mergefreigabe.**

<!-- M7-WOCHENTABELLEN:START -->

Die 13- und 52-Wochentabellen sind noch **nicht gemessen**. `npx tsx scripts/m7-wochenverlauf.ts --write-stand` ersetzt genau diesen Bereich nach dem tatsächlichen Simulationslauf mit den je Schwierigkeit vollständigen Zahlen. Keine geschätzten oder erfundenen Wochendaten.

<!-- M7-WOCHENTABELLEN:ENDE -->


### M7 – Nachbesserung nach Claudes Messung vom 21.10.2026 (Abschnitt 13)

**Ausgangsbefund (externe Messung auf `4511dd4`, nicht nach den folgenden Änderungen):** Januar/Februar auf allen Stufen −7,33 % EBITDA-Quote, KW 1 −8,38 %, KW 13 −9,04 %; Insolvenz innerhalb der ersten 52 Wochen und Bot C (mittel) nach 23 Wochen zerschlagen. Das Skript übergibt die Schwierigkeit korrekt: `neuesSpiel(1, { schwierigkeit: st })`. Die alte Engine beeinflusste im Normalbetrieb primär Kasse, Kredit und Ereignisse, nicht den Absatz; identische EBITDA-Quoten waren daher eine **Modelllücke**, kein Aufruffehler.

**Änderungen und ex ante erwartete Wirkung (nicht simuliert):**

| Bereich | Änderung | Erwartete kausale Wirkung und Risiko |
|---|---|---|
| Schwierigkeitsgrad | `SCHWIERIGKEIT.kaufneigung` leicht 1,035 / mittel 1,000 / schwer 0,945; in `wirtschaft.hausFaktor` bei allen Nachfragearten berücksichtigt | Nachfrage, Verkauf und margenabhängiger Rohertrag unterscheiden sich bereits in KW 1 bei identischem Standort und Seed. Erwartete Rangfolge der EBITDA-Quoten leicht > mittel > schwer; keine pauschale EBITDA-Gutschrift. Die Bestandsgrenze kann den Unterschied später abschwächen. |
| Filialpersonal | `PARAM.umsatzJeFte` 5.750 → 6.300 € je Woche, `qmJeFte` 400 → 430 qm | Umsatzabhängiger Personalbedarf sinkt rechnerisch um 8,7 %, flächenabhängiger um 7,0 %. Das reduziert laufende Personalkosten **und** den Startpersonalbestand; der tatsächliche Konzern-Effekt hängt vom FTE-Mix und den Besetzungsquoten ab. Vorläufige Annahme, durch Format- und Bedarfsmessung zu validieren. |
| Hauptverwaltung | `PARAM.zentraleQuote` 3,4 → 3,0 % des unveränderten Wochen-Umsatzankers | Zentralkostenbasis inklusive HQ-FTE/Büroflächen sinkt bei der Weltgenerierung um nominal 0,4 Prozentpunkte der Nachfragebasis. `hqAktualisiere`, Vorstandskosten und reale Gebäudeabrechnung bleiben aktiv; keine Buchungsumgehung. |
| Wintersaison | Warenhaus-Basiskurve Januar 0,98 → 1,06, Februar 0,96 → 1,045, März 0,88 → 1,03 (vor 12-Monats-Normalisierung) | Glättung der schwachen KW 1–13 bei unveränderter Fixkostenbuchung und dauerhaft normalisierter Jahreskurve. Reale Wochennachfrage und Rohertrag steigen im Q1; spätere Wochenanteile sinken durch die Normalisierung. Eigenständige Spielwaren-/Wintersport-Saisonprofile bleiben erhalten. Wichtig: Q4-Umsatz und Jahresumsatz erneut kontrollieren. |
| Abschriften | `EK_PARAM.abschriftK` 0,457 → 0,395 (−13,6 %) | Wöchentliche Abschreibung vorhandener gealterter Kohorten sinkt, nicht der gebuchte Wareneinsatz. Der Abschluss weist die verbleibenden Abschriften weiterhin getrennt aus; Bilanz-/Bestandswerte und Folgewochen ändern sich mit. |
| Datennetze | `initialisiereEinkauf` ignoriert `nurDaten` bei WG-Gewichtung/Marken-Pool-Zuordnung | Volkskauf/FUNDUS verzerren nicht mehr Nachfrage-/Markenmix der aktiven 408 Geschäfte. Stammdaten und Grafik der 152 Schwester-/Outlet-Filialen bleiben unberührt; ein bisher zu hoch gewichteter Pool kann die Anfangsverfügbarkeit und Marge verändern. |
| Gläubigerversammlung | Negative Plan-EBITDA-Grenze wird mit dem bei Spielstart festgelegten Jahresnachfragevolumen statt mit einem 130er-Festbetrag verglichen (Referenz 3,3 Mrd. € p.a.) | Ein identischer relativer operativer Sanierungsplan gilt für 408 statt ~130 aktive Läden nicht als schlechter, bloß weil seine Euro-Verluste größer sind. Die Plan-EBITDA-Prognose selbst, Gläubigerstimmen, Mindestquote und 40-%-Sofortzahlung bleiben unverändert. Erwarteter Effekt für Bot C: geringeres Risiko einer rein größenbedingten Ablehnung in KW 23; **keine Garantie**, dass die Planliquidität ausreicht. |

**Regressionstests:** `engine/tests/m7-massstab.test.ts` prüft die Nachfragefaktoren deterministisch und die unterschiedliche Wochen-GuV, die Trennung aktiver Häuser von `nurDaten` sowie die Saisonkorrektur. Bestehende `m7-winter.test.ts` bleibt erhalten.

**Erforderliche externe Abnahme (Claude):**
```bash
cd engine
npm ci
npm run typecheck
npx jest --runInBand
npx tsx scripts/m7-wochenverlauf.ts --write-stand
npx tsx scripts/massstab-phase2.ts 1
npx tsx scripts/massstab-phase2.ts 2
npx tsx scripts/massstab-phase2.ts 3
npx tsx scripts/bot.ts 1 260 --tief
npx tsx scripts/bot.ts 2 260 --tief
npx tsx scripts/bot.ts 3 260 --tief
```
Das `m7-wochenverlauf.ts`-Skript bleibt die verbindliche Abnahme für **alle drei Stufen**, 13 und 52 Wochen sowie Bot C (mittel, Seeds 1–3). Besonderes Augenmerk: Ausreißer KW 1/13, Cash und Lieferantenzahlungen, Plan-EBITDA/Gläubigerabstimmung in KW 23, Q4- und Jahresumsatz. **In der vorliegenden Laufzeit nicht ausgeführt**: kein Checkout mit GitHub-DNS und installierten Abhängigkeiten. Daher keine behaupteten neuen Q1-Werte, kein als bestanden gemeldeter Test, keine Freigabe zum Merge. Die Platzhalter zwischen den M7-Wochentabellenmarkern bleiben bis zu Claudes echter Messung unverändert.


### M7 – Abschnitt 15: Halbjahreseinbruch, Einkaufsursache und Turnaround-Abnahme (21.10.2026)

**Ausgangsmessung Claude auf `37d446a` (Abschnitt 15 auf main):** Januar/Februar leicht −1,54 % und mittel −2,69 % EBITDA-Quote. Ab ungefähr KW 39 ohne Eingriffe wöchentliche EBITDA-Quoten zwischen −24 und −33 %, Insolvenz im ersten Jahr. Bot D (außergerichtlicher Turnaround) ging in KW 36–47 insolvent und wurde in KW 55–66 zerschlagen; EBITDA der letzten 52 Wochen −375 bis −476 Mio. €. Dies sind **Vorher-Werte** – keine Messergebnisse der nachfolgenden Änderung.

**Zentrale Ursache des Einbruchs aus der Quelltextanalyse:**
1. **Abgeschnittene Herbst-/Winterversorgung:** `einkauf.ts` erzeugt die Vororder der Herbst-/Wintersaison für `saisonStart(1)=32` schon um KW 3–6 (nullbasierte Orderwoche `2 + WG-Offset`). Im Standardstand war `STANDARD_STEUERUNG.modus.saison='verfall'`: Nicht freigegebene Orders wurden nach `EK_PARAM.frist.vororder=3` Wochen endgültig gestrichen. Nach Auslaufen der anfänglichen saisonalen Bestände fehlt neue Ware ausgerechnet vor dem wichtigen vierten Quartal. Im `einkaufVerbrauch` senken geringe frische Bestände über `rw/EK_PARAM.praesentation` die Verkäufe zusätzlich; gealterte Saisonware wird nur begrenzt verkauft und trotzdem fortlaufend abgeschrieben. Fixkosten der Filialen und Zentrale fallen weiterhin an. Dieser Mechanismus erklärt den ab KW 39 stark fallenden Rohertrag **strukturell**. Die tatsächlichen Euroanteile der Bestands-/Fehlmengenwirkung werden erst durch das Jahresdiagnoseskript ermittelt.
2. **Nicht dynamische Disposition:** Die Einkaufsbasis `st.basisVK` wurde zuvor nur bei `initialisiereEinkauf` gesetzt. Die Engine schreibt `s.basisUmsatz` wöchentlich aus saisonbereinigter Bruttonachfrage fort, aber `einkaufDispo` verwendete weiterhin den alten Umsatzanker. Vor allem Bot D ordnete nach Filialschließungen saisonale Vororders/Nachorders für das ursprüngliche Netz an: Überbestände, Liquiditätsbindung und Abschriften statt Sanierungseffekten.
3. **Bot D nicht größenneutral:** In `botRegulaerBasis` blieben 35 Schließungen als feste Zahl statt des ursprünglichen Anteils `35 / 180`. Im großen Maßstab wurden so nur ungefähr 9 % statt rund 19 % des operativen Portfolios restrukturiert. Der tatsächliche EBITDA- und Liquiditätseffekt ist wegen Schließungsdauer, Sozialplan und Restmieten zeitverzögert zu messen.

**Behebung (ohne direkte Änderung von EBITDA, Startkasse oder Insolvenzauslösern):**

| Änderung | Funktionswirkung und erwartete Richtung | Kontrollrisiko |
|---|---|---|
| `STANDARD_STEUERUNG.modus.saison = 'auto'` | Freigabepflichtige Standard-Saisonorders bleiben während der Frist im Management-Posteingang und werden bei Untätigkeit rechtzeitig automatisch bestellt. Spieler können weiterhin kürzen, ablehnen oder `wgFreigabeModus='verfall'` wählen. Erwartet: Herbstware kommt an, Q4-Fehlmengen sinken und Rohertrag stabilisiert sich. | Größere Warenbestellungen verursachen zunächst Beschaffungszahlungen; OTB und Kreditversicherung bleiben unverändert. |
| `einkaufDispo`: `st.basisVK` an `s.basisUmsatz[g] * WG-Anteil` gekoppelt | Absatz-/Portfolioveränderungen einschließlich Schließungen fließen in zukünftige NOS-, Saison- und Limitrechnungen ein; vermeidet strukturelle Überbestellung durch veralteten Eröffnungsstand. Keine Koppelung an kurzfristige Warenfehlbestände (keine negative Angebots-/Nachfragespirale). | Bestehende rechtsverbindliche Vororders werden nicht rückwirkend storniert; Umsatz-/Bestands-/Cash-Betrachtung nötig. |
| `botRegulaerBasis`: 35/180 statt fix 35 Schließungen, Premium und `nurDaten` geschützt | Portfoliosanierung im gleichen relativen Ausmaß wie im alten Maßstab; mehr verlustbringende Häuser verlassen das Netz, mit nachgelagerter Einsparung von Personal, Miete und Nebenkosten. | Mehr Abfindungen und Restmietbelastung beim tatsächlichen Schließungstermin; anfängliche Liquidität unbedingt gegenchecken. |

**Wochentabelle für das vollständige erste Jahr, inklusive GuV und Warenversorgung:** `engine/scripts/m7-jahresdiagnose.ts` erzeugt **genau 52 KW-Zeilen** mit Umsatz, Rohertrag vor Abschriften, Abschriften, GuV-Rohertrag, Personal, Miete, Zentrale, EBITDA-Quote, Fehlumsatz, Bestand, Bestellpipeline, Freigaben, Orderverfall, Cash und Insolvenzphase. Bei Zerschlagung sind spätere KW ausdrücklich „Nicht simuliert“, nicht Nullwerte. Zusätzlich enthalten: Vergleich KW 26–38 versus KW 39–52. Das Skript hat als A/B-Kontrolle `--verfall`, um den früheren Saisonorder-Verfall im aktuellen Code gezielt wieder einzuschalten. Die vorherige Messung aus Abschnitt 15 enthält **keine** 52 Einzelwochen-GuV; ohne tatsächliche Engine-Ausführung sind Euro-Werte nicht seriös einzutragen.

<!-- M7-JAHRESDIAGNOSE:START -->

**Noch nicht ausgeführt.** Die 52-Wochen-Werte werden durch den lokalen Befehl `npx tsx scripts/m7-jahresdiagnose.ts --write-stand` unmittelbar hier ausgegeben. Bis dahin keine erfundenen Einzelwochenzahlen.

<!-- M7-JAHRESDIAGNOSE:ENDE -->

**Abnahme gemäß Abschnitt 14 (Bot D statt Bot C):** `engine/scripts/m7-wochenverlauf.ts` wertet jetzt **mittel Seeds 1–3 / 260 Wochen ohne jede Insolvenz / positives EBITDA letzte 52 Wochen**, leicht komfortabler und schwer mindestens 2/3 erfolgreiche Seeds aus. Ohne Eingriffe muss auf leicht/mittel das erste Jahr ohne Insolvenz bleiben. Bot C wird ergänzend auf mindestens 104 Wochen auf mittel geprüft. Alle Q1-Wochengrenzen bleiben aktiv. Die GuV-Tabellen enthalten jetzt auch die Zentrale und explizit den Rohertrag vor Abschriften. Regressionsfälle in `engine/tests/m7-versorgung.test.ts`.

**Von Claude auszuführen:**

```bash
cd engine
npm ci
npm run typecheck
npx jest --runInBand
npx tsx scripts/m7-jahresdiagnose.ts --verfall       # A/B-Kontrolle: vorheriger Orderverfall
npx tsx scripts/m7-jahresdiagnose.ts --write-stand   # tatsächliche 52-Wochen-Tabelle
npx tsx scripts/m7-jahresdiagnose.ts --bot --seed=1  # operative Diagnose Bot D
npx tsx scripts/m7-wochenverlauf.ts --write-stand    # verbindliche Abnahme Abschnitt 14
```

**Messstatus:** Quelltexte und Remote-Commits über den GitHub-Connector geschrieben, aber kein ausführbares lokales Repo mit Node-Abhängigkeiten und kein GitHub-DNS im Container. **Weder Typecheck/Jest noch das 52-Wochen- und 260-Wochen-Protokoll wurden hier ausgeführt.** Bis Claudes Zahlen die Kriterien erfüllen, keine Mergefreigabe.

## M7 · Abschnitt 17 – Referenz-Filial-GuV und Turnaround ohne Schließungen (21.10.2026)

**Verbindliche Referenz, keine Schätzung:** `src/filialguv.ts` enthält *alle* Originalpositionen aus Abschnitt 17 mit dem exakt gelieferten IST, einschließlich Bruttogewinn Vorjahr **41,7 %**, Plan **46,1 %** und Personal Vorjahr/Plan **−15,6 %**. Die Referenz ist intern nicht additiv konsistent: Summe der Kostenzeilen **−44,6 %**, veröffentlichtes OPEX-Total **−42,4 %** (Differenz **2,2 PP**). Die Einzelzeilen führen mit 41,2 % Bruttogewinn und 2,3 % übrigen Erträgen rechnerisch zu **−1,1 % Filial-EBITDA**, die Vorgabe lautet **−1,2 %** (0,1 PP Rundungs-/Abstimmungsdifferenz). **Keine Ausgleichs- oder Pauschalgutschrift.** Das Reporting zeigt beide Werte und die echte gebuchte Summe, die Referenz bleibt unverändert. Für eine strenge buchhalterische Abstimmung ist die Herkunftsdatenquelle zu klären.

**Ausgangskalibrierung:** `welt.ts` setzt Personal/FTE und Vertragsmiete pro aktivem Haus auf die Sollgrößen **16,0 % / 11,2 % des normierten Jahresumsatzes**, statt aus dem Konzern-EBITDA abgeleitete Zuschüsse zu buchen. Die Umstellung verändert echte FTE, Mietzahlungsverpflichtung und Besetzungsgrad. Nicht simulierte Volkskauf-/FUNDUS-Datenhäuser werden bis zur Formate-Aktivierung nicht in einer Scheinkostenstelle mit Umsatz geführt. Logistikquote steigt von 2,5 % auf **6,3 %** und die Werbequote sinkt von 2,5 % auf **1,8 %**. Übrige filialeigene Ausgaben werden als einzelne kosten- und zahlungswirksame Positionen geführt. Nicht zahlungswirksame Bestandsabschriften werden **einmal** als Teil des Wareneinsatzes ausgewiesen. Zentrale/Externe bleiben außerhalb der Filial-GuV. Die initiale Umsatzrealisierung bei der FTE-/Mietkalibrierung **1,02 × normierte Nachfragebasis** ist ein Vorabschätzer, kein gemessener Jahreswert; Claude muss Ist-Abweichungen nachkalibrieren.

**Formate:** Reguläre Hartwig-Häuser folgen der Referenz; Premium hat hier vorläufig ca. +8 % Personal und +12 % Miete sowie höhere Sach-/Serviceraten, Sport ca. −6 % Personal/−4 % Miete und geringere Sachkosten. FUNDUS hat bei wirtschaftlicher Aktivierung geringeren Unterhalts-/Nebenkostenbedarf und die bisher separate Offprice-Warenwirtschaft; Volkskauf ist zunächst inaktiv. Diese Multiplikatoren sind Modellannahmen, nicht Ist-Messungen. Wareneinsatz bleibt an der realen Warengruppen-/Bestandsbuchung, kein auf 41,2 % „hochgebuchter“ Rohertrag.

### Maßnahmen und rechnerische EBITDA-Wirkung

Brutto-Effekt in **Prozentpunkten des Umsatzes**: Ausgangsquote der Referenz × Kostenreduktion, **vor** Investitionsauszahlungen, Anlaufrisiko, Veränderung des Umsatznenners, Wechselwirkungen und Nachfrageeffekten. Kein Effekt läuft vor dem jeweiligen Vorlauf an. Alle Programme sind über `filialProgramm` spielbar, einmalige Kosten werden sofort zahlungswirksam. Effekte fließen in `hausKosten`, Werbung in `marketingKosten` und der Preishebel in den tatsächlich realisierten Verkaufsumsatz ein.

| Referenzposition / Maßnahme | Vorlauf | Einmalinvestition vom Jahresumsatz | Brutto-EBITDA-Effekt | Betriebliche Nebenwirkung |
|---|---:|---:|---:|---|
| Bruttogewinn / Sortiments- und Preisarchitektur | 10 Wochen | 0,050 % | **+0,5 bis +0,7 PP** aus 1,2 % realisiertem Preisaufschlag auf Eigenware | −0,6 % Mengennachfrage, vor Bestands-/Mixeffekten |
| Personal / Einsatzplanung | 6 Wochen | 0,030 % | **+1,44 PP** (16,0 % × 9 %) | −0,4 % Nachfrage (Beratungs-/Serviceeffekt) |
| Fremdkräfte / Pooling | 4 Wochen | 0,005 % | **+0,14 PP** | geringere Peak-Reserve |
| Miete / Nachverhandlung | 20 Wochen | 0,040 % | **+1,34 PP** (11,2 % × 12 %) | Verhandlungsaufwand, geringeres Vermietervertrauen |
| Mietnebenkosten / Flächennutzung | 12 Wochen | 0,015 % | **+0,18 PP** | Flächeneinschränkungen |
| Logistik / Lieferbündelung | 12 Wochen | 0,070 % | **+1,13 PP** (6,3 % × 18 %) | weniger Lieferfenster |
| Werbung / Kanaleffizienz | 5 Wochen | 0,010 % | **+0,27 PP** (1,8 % × 15 %) | −0,6 % Nachfrage |
| Unterhalt / Wartungsplanung | 12 Wochen | 0,030 % | **+0,34 PP** (1,9 % × 18 %) | zeitweise Betriebseingriffe |
| Zahlungsverkehr / Payment-Mix | 6 Wochen | 0,006 % | **+0,04 PP** | Kassenterminal-Umstellung |
| Facility Management / Neuvergabe | 10 Wochen | 0,012 % | **+0,34 PP** | reduzierte Servicefrequenz |
| Energie / LED, HLK | 18 Wochen | 0,140 % | **+0,67 PP** (2,4 % × 28 %) | hohe Investition, zeitweise Anlagenabschaltung |
| IT / Lizenzkonsolidierung | 10 Wochen | 0,013 % | **+0,07 PP** | Migration |
| Administration / Prozessautomation | 8 Wochen | 0,013 % | **+0,04 PP** | Einführung und Schulung |
| Übrige Aufwendungen / Bedarfsbündelung | 7 Wochen | 0,010 % | **+0,08 PP** | geringere Flexibilität |
| Übrige betriebliche Erträge / Untermiete | abhängig vom tatsächlichen Angebot | Vertrags- und Umbaukosten der bestehenden Untermietaktion | **nicht pauschal bezifferbar**, nur tatsächlich vereinbarte Erlöse | Fläche entfällt für Eigenumsatz |
| Zentrale / personeller Kapazitätsabbau Bot T | sofort mit Abfindung | reale Abfindungen gemäß HQ-Engine | höchstens ca. **+0,3 bis +0,4 PP** bei rund 3 % HQ-Kostenquote | geringere Unterstützungsleistung und Betriebsratsrisiko |

Alle Kostenprogramme zusammen bieten unter den Referenzquoten eine **theoretische Brutto-Entlastung von ca. +6,10 PP** vor der Preis-/Nachfragewirkung und HQ; die Summe ist **keine gemessene Verbesserung**. Es gibt keine direkte Cash-/EBITDA-Gutschrift. Der Engpass kann weiterhin die Warenverfügbarkeit und die zwischenzeitliche Liquidität sein. Insbesondere die vorfinanzierten LED-/HLK-Projekte und die 20-wöchige Mietverhandlung wirken bei zu wenig Cash möglicherweise zu spät.

**Bot T:** in `scripts/bot.ts --turnaround`. Ohne Schließungs- oder Insolvenzaktion, 14 Programme mit Vorlauf/Investition, operatives Warenmanagement, Bestellfreigaben und echte Untermietverträge. Bot D verwendet diese Programme zusätzlich zu seiner bestehenden Portfoliostrategie. Beim Schließen werden 30 % des Umsatzes als **Nachfrage** zu vorhandenen Häusern derselben Stadt, andernfalls derselben Region umgeleitet; kein pauschaler Umsatz- oder Geldzugang, reale Bestände begrenzen die Verkäufe. Die bisherige Möglichkeit, die Hauptverwaltung oder einzelne Häuser zu steuern, bleibt erhalten.

**Diagnose/Reporting:** `m7-jahresdiagnose.ts` liefert neben den bisherigen 52 Zeilen jetzt alle 19 Referenzzeilen als Wochenbeträge, Wochenquoten und Jahresvergleich. Im Haus-Reiter erscheint dieselbe individuelle GuV mit laufenden zentralen Filialprogrammen und deren Nebenwirkungen. `m7-wochenverlauf.ts` prüft den 260-Wochen-Bot T auf **mittel Seeds 1–3**, außerdem leicht/schwer, unverändertes Portfolio, keine Insolvenz und EBITDA der letzten 52 Wochen positiv. Bot D bleibt eigene Prüfung (muss mindestens bestehen und besser sein); Winterlimits und Bot C bleiben sichtbar.

**Ausführung/Abnahme durch Claude – noch nicht gemessen:**

```bash
cd engine
npm ci
npm run typecheck
npx jest --runInBand
npx tsx scripts/m7-jahresdiagnose.ts --seed=1 --schwierigkeit=mittel --write-stand
npx tsx scripts/m7-jahresdiagnose.ts --seed=1 --turnaround
npx tsx scripts/m7-wochenverlauf.ts --write-stand
for seed in 1 2 3; do npx tsx scripts/bot.ts "$seed" 260 --turnaround; done
for seed in 1 2 3; do npx tsx scripts/bot.ts "$seed" 260 --regulaer; done
cd ../render
npm ci
npm run build
node spiel-render.js
```

**Abnahmekriterium:** Filialebene um **−1,2 %**, Gruppe mit Zentrale um **−4 %** und Bot T auf mittel bei Seeds 1, 2, 3 ohne Insolvenz/Schließung 260 Wochen mit positivem EBITDA der letzten 52 Wochen. Erst Claudes Simulation kann das bestätigen. Hier **kein Typecheck, keine Jest-Ausführung, kein Fünfjahreslauf und kein Rendering**; der PR bleibt Draft, es erfolgt kein Merge.

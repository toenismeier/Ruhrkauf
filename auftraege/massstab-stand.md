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

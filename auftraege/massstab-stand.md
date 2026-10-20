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

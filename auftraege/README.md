# Aufträge

Jeder Auftrag ist eigenständig und für einen eigenen Lauf gedacht. Vor jedem Auftrag lesen: `README.md`, `engine/README.md`, `render/KIT.md`, `render/GESTALTUNG.md`, `HQ-VERTRAG.md`, `EINKAUF-VERTRAG.md`, `VORSTAND-MARKETING-VERTRAG.md`.

## Reihenfolge und Abhängigkeiten

| Auftrag | Branch | Hängt ab von | Darf parallel zu |
|---|---|---|---|
| `grafik-schwesterkette.md` + `nachbesserung-schwesterkette.md` | `feat/grafik-schwesterkette` | **gemergt 19.10.** | |
| `grafik-sport.md` + `nachbesserung-sport.md` | `feat/grafik-sport` | **gemergt 19.10.** | |
| `grafik-outlet.md` + `nachbesserung-outlet.md` | `feat/grafik-outlet` | (Merge Schwesterkette, darf vorher starten) | Premium, Posteingang, Wettbewerber-Engine |
| `grafik-premium.md` + `nachbesserung-premium.md` | `feat/grafik-premium` | (Merge Schwesterkette, darf vorher starten) | Outlet, Posteingang, Wettbewerber-Engine |
| `engine-wettbewerber.md` + `nachbesserung-wettbewerber.md` | `feat/engine-wettbewerber` | **gemergt 19.10.** | |
| `grafik-wettbewerber-im-spiel.md` | `feat/grafik-wettbewerber-spiel` | **gemergt 19.10.** | |
| `engine-formate.md` | `feat/engine-formate` | Merge Schwesterkette, Merge Outlet, Engine-Maßstab Phase 1 | Posteingang, Städte, Oberfläche |
| `workstream-ladenbau.md` (mehrere Chats, Stand in `ladenbau-stand.md`), aktuell `nachbesserung-ladenbau-p3.md` | `feat/ladenbau` bzw. `feat/ladenbau-p<N>` | Phase 4 nach Merge Sport, Phase 5 nach Merge Outlet-Außenbau, Phase 6 nach Merge Schwesterkette | Engine-Aufträgen, Posteingang |
| `engine-massstab.md` + `nachbesserung-massstab.md` (mehrere Chats, Stand in `massstab-stand.md`) | `feat/engine-massstab` | Phase 1 sofort; Phase 3 nach `engine-formate.md` | allem außer `engine-formate.md` gleichzeitig |
| `massstab-staedte.md` | `feat/massstab-staedte` | Engine-Maßstab Phase 1 | Oberfläche, Ladenbau, Engine-Aufträgen |
| `massstab-oberflaeche.md` | `feat/massstab-oberflaeche` | Engine-Maßstab Phase 1 | allem |
| `massstab-leistung.md` | `feat/massstab-leistung` | Städte Phase 2 | Oberfläche |
| `spiel-posteingang.md` | `feat/spiel-posteingang` | **gemergt 19.10.** Folgeschritt: Wettbewerbsmeldungen in die Kategorie Konkurrenz (kleiner Commit) | |

## Ohne CI arbeiten (gilt, solange GitHub Actions blockiert ist)
- GitHub Actions startet derzeit keine Jobs (Kontingent). Nicht auf die CI warten.
- Abnahme stattdessen lokal: `cd engine && npm ci && npm run typecheck && npx jest`, `cd render && npm ci && npm run build && node spiel-render.js`, dazu die im Auftrag genannten Prüfskripte. Chromium für Playwright: `CHROMIUM_PATH=<Pfad zur Chromium-Datei>` setzen, falls `spiel-render.js` keinen Browser findet. Ist kein Browser verfügbar, Rendering und Bilder als offen markieren und alles andere trotzdem fertigstellen.
- Das Protokoll der lokalen Läufe (Befehle, Ergebnisse, Zahlen) in die Stand-Datei bzw. die PR-Beschreibung schreiben.
- **Merge:** Ist der lokale Lauf grün und ist der Auftrag vollständig, darf der PR ohne CI gemergt werden (vorher auf `main` rebasen, Konflikte lösen, lokal erneut prüfen).
- Branches, die von noch nicht gemergten Branches abhängen, dürfen bereits starten. Sie zweigen von `main` ab und rebasen später.

## Namen und Maßstab (entschieden)
- Hauptkette Hartwig, Sportkette Hartwig Sport, Hertie-Pendant **Volkskauf**, SchnäppchenCenter-Pendant (TK-Maxx-Prinzip) **FUNDUS**.
- Maßstab nach Ruhrkauf: 360 Hartwig regulär plus 4 Premium, 86 Volkskauf, 44 Sport, 66 FUNDUS, gemischt auf rund 180 Städte (`engine-massstab.md`).

## Gemeinsam berührte Dateien (Parallelbetrieb)
Premium, Outlet und Schwesterkette hängen sich an dieselben Einbaupunkte. In diesen Dateien gilt: nur ergänzen, nichts umbauen, eigene Zeilen bzw. eigener Block je Format, damit parallele Branches beim Rebase höchstens triviale Konflikte haben.
- `render/src/kit/bauer.js` (`fussabdruck`): je Format ein eigener `if`-Zweig.
- `render/src/kit/bruecke.js` (Verzweigung auf den Bauer, `slot`-Liste in `spielBauer`): je Format ein Eintrag.
- `render/src/kit/stadtplan.js` (`SLOT_ROLLE`): je Format ein Schlüssel.
- `render/src/kit/staedte.js` (`baueEintrag`, Standorte je Stadt): je Format ein eigener Block.
- `render/GESTALTUNG.md`: je Format ein eigener Unterabschnitt.
- `render/pruef-gestaltung.js` bzw. `render/src/pruef-gestaltung-inhalt.js`: je Format eine eigene Prüffunktion.
- `render/src/kataloge/alle-haeuser.js`: je Format ein eigener Abschnitt.
- Nur Premium: `render/src/kit/grundriss.js` (Schalter `klasse: 'premium'`) und `render/haeuser.json` über das Exportskript.

Vor dem PR immer auf den aktuellen `main` rebasen. Wer als Zweiter mergt, löst die Konflikte.

Merge in `main` nur mit grüner CI bzw., solange die CI blockiert ist, mit grünem lokalem Lauf. Nach jedem Merge: `README.md` (Abschnitt Stand) und betroffene Verträge fortschreiben.

## Regeln für alle Aufträge
- **Actions-Minuten sparen:** Kataloge nicht bei jedem Push in der CI rendern. Render-Workflows nur über `workflow_dispatch` oder einmal vor dem PR. Kein `push`-Trigger für Render-Jobs, keine Bild-Commits durch den Bot bei jedem Lauf. Prüfungen und Renderings, wo möglich, lokal ausführen und das Protokoll in die Stand-Datei schreiben.
- Deutsch mit echten Umlauten in Code-Texten, Oberfläche und Doku. Keine echten Marken, Firmen oder Personen.
- Engine deterministisch über den Seed, Zufall nur über die vorhandenen RNG-Helfer (`engine/src/util.ts`), Geld in ganzen Euro.
- Grafik: `render/src/kit/basis.js` nicht ändern, Zufall nur über `rng(seed)`, Teilebudgets aus `KIT.md`.
- Kalibrierung Schwierigkeit mittel bleibt erhalten, außer der Auftrag sagt etwas anderes. Prüfen mit `npx tsx scripts/kalibrierung.ts 1` und `npx tsx scripts/bot.ts <seed> 260 --tief` für Seeds 1, 2, 3 (Bot C muss 5 Jahre überleben).
- Vor dem Abschluss: `cd engine && npm run typecheck && npm test`, `cd render && npm run build && node spiel-render.js` (0 Abweichungen), betroffene Kataloge rendern und ansehen.
- Neue Spieleraktionen immer über `SpielerAktion` in `engine/src/aktionen.ts` und `fuehreAus`, neue Anzeigen immer über Abfragefunktionen in `engine/src/abfragen.ts` bzw. dem jeweiligen Modul, nie Rechenlogik in der Oberfläche.

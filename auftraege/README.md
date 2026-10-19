# Aufträge

Jeder Auftrag ist eigenständig und für einen eigenen Lauf gedacht. Vor jedem Auftrag lesen: `README.md`, `engine/README.md`, `render/KIT.md`, `render/GESTALTUNG.md`, `HQ-VERTRAG.md`, `EINKAUF-VERTRAG.md`, `VORSTAND-MARKETING-VERTRAG.md`.

## Reihenfolge und Abhängigkeiten

| Auftrag | Branch | Hängt ab von | Darf parallel zu |
|---|---|---|---|
| `grafik-schwesterkette.md` + `nachbesserung-schwesterkette.md` | `feat/grafik-schwesterkette` | | Sport, Posteingang, Wettbewerber-Engine |
| `grafik-sport.md` + `nachbesserung-sport.md` | `feat/grafik-sport` | | allem |
| `grafik-outlet.md` | `feat/grafik-outlet` | Merge Schwesterkette | Premium, Posteingang, Wettbewerber-Engine |
| `grafik-premium.md` | `feat/grafik-premium` | Merge Schwesterkette | Outlet, Posteingang, Wettbewerber-Engine |
| `engine-wettbewerber.md` + `nachbesserung-wettbewerber.md` | `feat/engine-wettbewerber` | | Grafik-Aufträgen, Posteingang |
| `grafik-wettbewerber-im-spiel.md` | `feat/grafik-wettbewerber-spiel` | Merge Wettbewerber-Engine | Premium, Outlet |
| `engine-formate.md` | `feat/engine-formate` | Merge Schwesterkette, Merge Outlet | Posteingang |
| `workstream-ladenbau.md` (mehrere Chats, Stand in `ladenbau-stand.md`) | `feat/ladenbau` bzw. `feat/ladenbau-p<N>` | Phase 4 nach Merge Sport, Phase 5 nach Merge Outlet-Außenbau, Phase 6 nach Merge Schwesterkette | Engine-Aufträgen, Posteingang |
| `spiel-posteingang.md` | `feat/spiel-posteingang` | | allem; nach Merge der Wettbewerber-Engine deren Meldungen einbinden |

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

Merge in `main` nur mit grüner CI. Nach jedem Merge: `README.md` (Abschnitt Stand) und betroffene Verträge fortschreiben.

## Regeln für alle Aufträge
- Deutsch mit echten Umlauten in Code-Texten, Oberfläche und Doku. Keine echten Marken, Firmen oder Personen.
- Engine deterministisch über den Seed, Zufall nur über die vorhandenen RNG-Helfer (`engine/src/util.ts`), Geld in ganzen Euro.
- Grafik: `render/src/kit/basis.js` nicht ändern, Zufall nur über `rng(seed)`, Teilebudgets aus `KIT.md`.
- Kalibrierung Schwierigkeit mittel bleibt erhalten, außer der Auftrag sagt etwas anderes. Prüfen mit `npx tsx scripts/kalibrierung.ts 1` und `npx tsx scripts/bot.ts <seed> 260 --tief` für Seeds 1, 2, 3 (Bot C muss 5 Jahre überleben).
- Vor dem Abschluss: `cd engine && npm run typecheck && npm test`, `cd render && npm run build && node spiel-render.js` (0 Abweichungen), betroffene Kataloge rendern und ansehen.
- Neue Spieleraktionen immer über `SpielerAktion` in `engine/src/aktionen.ts` und `fuehreAus`, neue Anzeigen immer über Abfragefunktionen in `engine/src/abfragen.ts` bzw. dem jeweiligen Modul, nie Rechenlogik in der Oberfläche.

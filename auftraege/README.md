# Aufträge

Jeder Auftrag ist eigenständig und für einen eigenen Lauf gedacht. Vor jedem Auftrag lesen: `README.md`, `engine/README.md`, `render/KIT.md`, `render/GESTALTUNG.md`, `HQ-VERTRAG.md`, `EINKAUF-VERTRAG.md`, `VORSTAND-MARKETING-VERTRAG.md`.

## Reihenfolge und Abhängigkeiten

| Auftrag | Branch | Hängt ab von | Darf parallel zu |
|---|---|---|---|
| `grafik-schwesterkette.md` + `nachbesserung-schwesterkette.md` | `feat/grafik-schwesterkette` | | Sport, Posteingang, Wettbewerber-Engine |
| `grafik-sport.md` + `nachbesserung-sport.md` | `feat/grafik-sport` | | allem |
| `grafik-outlet.md` | `feat/grafik-outlet` | Merge Schwesterkette | Posteingang, Wettbewerber-Engine |
| `grafik-premium.md` | `feat/grafik-premium` | Merge Schwesterkette | Posteingang, Wettbewerber-Engine |
| `engine-wettbewerber.md` | `feat/engine-wettbewerber` | | Grafik-Aufträgen, Posteingang |
| `grafik-wettbewerber-im-spiel.md` | `feat/grafik-wettbewerber-spiel` | Merge Wettbewerber-Engine | Premium, Outlet |
| `engine-formate.md` | `feat/engine-formate` | Merge Schwesterkette, Merge Outlet | Posteingang |
| `spiel-posteingang.md` | `feat/spiel-posteingang` | | allem; nach Merge der Wettbewerber-Engine deren Meldungen einbinden |

Merge in `main` nur mit grüner CI. Nach jedem Merge: `README.md` (Abschnitt Stand) und betroffene Verträge fortschreiben.

## Regeln für alle Aufträge
- Deutsch mit echten Umlauten in Code-Texten, Oberfläche und Doku. Keine echten Marken, Firmen oder Personen.
- Engine deterministisch über den Seed, Zufall nur über die vorhandenen RNG-Helfer (`engine/src/util.ts`), Geld in ganzen Euro.
- Grafik: `render/src/kit/basis.js` nicht ändern, Zufall nur über `rng(seed)`, Teilebudgets aus `KIT.md`.
- Kalibrierung Schwierigkeit mittel bleibt erhalten, außer der Auftrag sagt etwas anderes. Prüfen mit `npx tsx scripts/kalibrierung.ts 1` und `npx tsx scripts/bot.ts <seed> 260 --tief` für Seeds 1, 2, 3 (Bot C muss 5 Jahre überleben).
- Vor dem Abschluss: `cd engine && npm run typecheck && npm test`, `cd render && npm run build && node spiel-render.js` (0 Abweichungen), betroffene Kataloge rendern und ansehen.
- Neue Spieleraktionen immer über `SpielerAktion` in `engine/src/aktionen.ts` und `fuehreAus`, neue Anzeigen immer über Abfragefunktionen in `engine/src/abfragen.ts` bzw. dem jeweiligen Modul, nie Rechenlogik in der Oberfläche.

# Aufträge aus TestFlight-Wurf 1 (20.10.2026)

Grundlage: Ummos Test auf dem iPhone und die Screenshots in `testflight/wurf-1/` (`BEFUNDE.md`). Vor jedem Auftrag zusätzlich `auftraege/README.md` lesen; dessen Regeln gelten.

| Auftrag | Branch | Hängt ab von | Darf parallel zu |
|---|---|---|---|
| `q01-staedte-kartendaten.md` (mehrere Chats) | `feat/q01-staedte-karte` | Kartendaten Essen von Claude (Phase 0); Merge von `feat/massstab-staedte` | Q02 bis Q05 |
| `q02-grafik-qualitaet.md` | `feat/q02-grafik-qualitaet` | nichts | allem; bei Konflikten mit Q01 gewinnt Q01 im Stadtplan, Q02 im Kit |
| `q03-stadt-fingerabdruck.md` | `feat/q03-fingerabdruck` | nichts | allem (zuerst mergen) |
| `q04-spiel-befunde.md` | `feat/q04-spiel-befunde` | nichts | allem |
| `q05-eigenmarken-delegation.md` | `feat/q05-eigenmarken-delegation` | nichts | allem |
| `q06-marktbeobachtung.md` | `feat/q06-marktbeobachtung` | Merge N08 Zeitung | allem außer N08 |
| `q07-vertriebssteuerung.md` | `feat/q07-vertrieb` | Merge `feat/massstab-oberflaeche` | allem außer Oberfläche |

Reihenfolge der Merges: Q03 zuerst (danach prüft das Merge-Gate jede Stadt), dann Q04 und Q05, dann Q02, dann Q01 Stadt für Stadt.

Regeln aus dem Workstream-Regiment: je GPT-Chat genau ein offener PR; Leistung ist Abnahmekriterium jedes Grafik-PR (Dreiecke, Draw Calls, Startzeit nicht schlechter als `main`, Messwerte in die PR); Merge durch Claude nach lokaler Prüfung.

# Workstream Engine: Ruhrkauf-Maßstab (rund 560 Häuser, vier Formate plus Premium)

Branch `feat/engine-massstab` (je Phase ein PR). Mehrere Chats. Übergabedatei `auftraege/massstab-stand.md`: zuerst lesen, am Ende jedes Chats fortschreiben.

## Ziel
Hartwig bekommt den Maßstab des Ruhrkauf-Konzerns aus den Ruhrkauf-Dateien (Konzernprofil, Stand GJ 2025). Die Häuser verteilen sich gemischt auf die Städte, nicht zehn Hartwig-Häuser in einer Stadt.

| Format | Kennung | Name im Spiel | Häuser | Vorbild | Umsatz Ziel Jahr 1 |
|---|---|---|---:|---|---:|
| Warenhaus regulär | `warenhaus` | Hartwig | 360 (45 A, 115 B, 200 C) | Ruhrkauf Warenhäuser regulär | 8.950 Mio. € |
| Premium | `warenhaus` + `klasse: 'premium'` | vier Einzelnamen (`grafik-premium.md`) | 4 | Premium-Quartett | ~820 Mio. € |
| Schwesterkette | `schwester` | Volkskauf | 86 | Hertie Warenhaus GmbH | 1.020 Mio. € |
| Sport | `sport` | Hartwig Sport | 44 | Ruhrkauf Sports | 545 Mio. € |
| Off-Price | `outlet` | FUNDUS | 66 (rund 46 Randlage, 20 b-Lage) | SchnäppchenCenter | 790 Mio. € |

Hausklassen Hartwig (aus der Ruhrkauf-Warenhaus-Anatomie):

| Klasse | Häuser | MA je Haus | Umsatz je Haus | Verkaufsfläche |
|---|---:|---:|---:|---|
| A | 45 | ~560 | ~48 Mio. € | 15.000 bis 25.000 m² |
| B | 115 | ~290 | ~30 Mio. € | 8.000 bis 15.000 m² |
| C | 200 | ~137 | ~17 Mio. € | 3.500 bis 8.000 m² |

Die EBITDA-Quote der Ausgangslage bleibt die heutige Spielkalibrierung (rund −4 %, Q4 positiv), nicht der Ruhrkauf-Wert. Sie ist Spielbalance.

## Phase 1: Standortnetz (1 Chat, zuerst)
1. **Städte:** `engine/src/daten.ts STAEDTE` auf höchstens 220 Städte ausbauen (Phase 1: 220). Genau sieben `metropole`: Berlin, Hamburg, München, Köln, Frankfurt, Düsseldorf, Stuttgart; übrige Orte ab 100.000 Einwohnern `grossstadt`, sonst `mittelstadt`. Echte deutsche Städte, `KOORDINATEN` in `engine/src/standorte.ts` ergänzen (viele sind schon da). Neuer Cluster nur, wenn nötig; sonst `mittelstadt` für alles unter 100.000 Einwohner.
2. **Format des Eintrags erweitern:** `[name, region, cluster, kaufkraft, { hartwig, premium, volkskauf, sport, fundus }]`.
3. **Mischung je Stadt, harte Obergrenzen** (verbindliche Fassung aus `nachbesserung-massstab.md`):

   | Cluster | alle Häuser zusammen | davon Hartwig | Volkskauf | Sport | FUNDUS | Premium |
   |---|---:|---:|---:|---:|---:|---:|
   | Metropole | höchstens 9 | höchstens 5 | höchstens 2 | höchstens 2 | höchstens 2 | höchstens 1 |
   | Großstadt | höchstens 6 | höchstens 3 | höchstens 1 | höchstens 1 | höchstens 1 | 0 |
   | Mittelstadt | höchstens 2 | höchstens 1 | höchstens 1 | höchstens 1 | 0 | 0 |

   - Hartwig und Volkskauf zusammen in einer Mittelstadt nur ausnahmsweise (historische Doppelstandorte, höchstens 15 Fälle).
   - Volkskauf mit Schwerpunkt NRW und Mittelstädte, Hartwig A-Häuser nur in Metropolen und den 20 größten Großstädten, B-Häuser nur in Großstädten, C-Häuser überwiegend in Mittelstädten oder als Zweit-/Dritthaus in Großstädten.
   - FUNDUS ausschließlich in Groß- und Metropolstädten; mehrere Hartwig-Häuser je Stadt mit genau einem 1a-Standort, weitere in b-Lage oder Stadtteilzentrum.
   - Premium in Berlin, München, Hamburg, Düsseldorf.
4. **Daten statt Simulation:** In dieser Phase entstehen die Häuser aller Formate als Daten (`bauHaus` mit Format, Lage, Klasse, Grundfläche, Etagen, Baujahr, Fassade, Substanz). Simuliert werden wie bisher nur `warenhaus` und `sport`; `schwester` und `outlet` bekommen ihre Wirtschaft im Auftrag `engine-formate.md`. Bis dahin laufen sie mit Status `offen`, aber ohne Umsatz und ohne Kosten (eigenes Kennzeichen `nurDaten: true`), damit die Kalibrierung dieser Phase nur Hartwig und Sport betrifft.
5. **Export:** Skript `engine/scripts/haeuser-export.ts` (anlegen, falls nicht vorhanden) schreibt `render/haeuser.json` (Hartwig inklusive Premium und Sport), `render/haeuser-schwester.json` (Volkskauf) und `render/haeuser-outlet.json` (FUNDUS) aus `neueWelt(1)`. Die bisherigen Ids bleiben für bestehende Häuser erhalten, neue Ids fortlaufend (W…, S…, K…, O…).
6. **Abnahme Phase 1:**
   - Mengen exakt wie in der Tabelle,
   - Obergrenzen je Stadt eingehalten (Test),
   - jede Stadt hat Koordinaten,
   - Export ohne Diff bei zweitem Lauf,
   - bestehende Tests grün.
   - Kalibrierung ist hier noch alt und darf abweichen. Das wird in `massstab-stand.md` vermerkt, nicht weggerechnet.

Nach Phase 1 kann der Grafik-Workstream `massstab-staedte.md` starten.

## Phase 2: Kalibrierung Hartwig und Sport auf den neuen Maßstab (1 bis 2 Chats)
1. `welt.ts` und `PARAM` so einstellen, dass die Umsatzziele der Tabelle für Hartwig regulär, Premium und Sport in Jahr 1 ohne Eingriff erreicht werden (Seeds 1 bis 3, ±3 %), mit den Hausklassen A/B/C als Größen- und Umsatzanker.
2. EBITDA-Quote Ausgangslage (nur diese Formate) rund −4 %, Q4 positiv.
3. **Zentrale und HQ** (`hq.ts`): FTE, Kosten und Abteilungsgrößen auf den größeren Konzern skalieren, Kalibrierung „unverändert“ heißt hier: gleiche Zentralkostenquote am Umsatz wie heute.
4. **Einkauf** (`einkauf.ts`): Orderrunden, Freigabegrenze und Mengen skalieren. Die Zahl der Freigaben je Woche bleibt spielbar: Alltag im Mittel weiterhin rund 8 je Woche, Orderrunden höchstens 80 je Woche. Notfalls die Startgrenze für Freigaben anheben.
5. **Marketing, Vorstand, Produkte:** Budgets proportional, Wirkungen unverändert.
6. **Bots** (`scripts/bot.ts`): Schließungslogik auf die neue Menge anpassen (Bot C schließt anteilig, nicht absolut). Bot C überlebt 5 Jahre auf Seeds 1 bis 3.
7. Schwierigkeit: Monotonie der Stufen bleibt (`scripts/schwierigkeit-vergleich.ts`).
8. Laufzeit messen: `wocheAbspielen` mit 560 Häusern. Ziel unter 60 ms je Woche im Node-Lauf. Falls nötig Hotpaths optimieren (keine Logikänderung).
9. `engine/README.md` neu schreiben: Stand Balancing, Tabellen, Befehle.

## Phase 3: Volkskauf und FUNDUS einschalten (nach `engine-formate.md`)
Wenn `engine-formate.md` die Wirtschaft beider Formate gebaut hat, `nurDaten` entfernen und auf die Umsatzziele der Tabelle kalibrieren:
- Volkskauf: 1.020 Mio. €, EBITDA-Marge rund −3 %.
- FUNDUS: 790 Mio. €, EBITDA-Marge rund −1 % bei Standardsteuerung.

Konzern-EBITDA-Quote der Ausgangslage bleibt bei rund −4 %. Bot C überlebt 5 Jahre.

## Grenzen
- Keine Grafikänderungen in diesem Workstream außer den exportierten JSON-Dateien.
- Spielstände alter Versionen müssen nicht migriert werden; `GameState.version` auf 2 setzen und alte Stände beim Laden mit Hinweis verwerfen (`render/src/ui/speicher.js`).

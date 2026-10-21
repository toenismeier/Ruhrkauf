# Q08: Fünf Premiumhäuser statt vier

Branch `feat/q08-premium-fuenf` von `main`, Draft-PR gegen `main`. Engine, Brücke, Grafik-Kit.

## Vorgabe (Ummo, 21.10.2026)
Premium sind laut Ruhrkauf die Pendants zu den großen Häusern in Berlin (zwei Häuser), München, Hamburg und Düsseldorf; Düsseldorf liegt am Standort des Carsch-Hauses. „wir können daher gerne fünf draus machen“. Alle Namen bleiben fiktiv (Repo-Regel: keine echten Marken, Firmen, Hausnamen).

| Schlüssel | Stadt | Name im Spiel | Lage (Vorbild) | Fläche | Geschosse | Rang |
|---|---|---|---|---|---|---|
| P001 | Berlin | Palais Hartwig | Tauentzien/Wittenbergplatz | 30.000 qm | 6 | 1 |
| P005 | Berlin | Hartwig Leipziger Platz | Leipziger Platz | 20.000 qm | 5 | 2 |
| P002 | München | Hartwig am Hofgarten | Kaufingerstraße/Karlstor | 30.000 qm | 6 | 1 |
| P003 | Hamburg | Hartwig am Jungfernstieg | Jungfernstieg (bisher „Alsterhaus Hartwig“: realer Name, umbenennen) | 18.000 qm | 5 | 2 |
| P004 | Düsseldorf | Hartwig am Heine-Platz | Heinrich-Heine-Platz, Standort Carsch-Haus (bisher „Hartwig Königsallee“) | 14.000 qm | 5 | 3 |

## Umsetzung
1. `engine/src/daten.ts` `PREMIUM_HAEUSER` und `engine/src/premium.ts` `PREMIUM_PROFIL` um P005 erweitern (Produktivität 1,52, Mietquote 0,060 wie Rang 2), Namen P003/P004 umstellen. Haus-IDs der bestehenden vier bleiben, Spielstand-Version bleibt 2 (alte Stände sind seit #7 ohnehin ungültig).
2. `welt.ts`: `STANDARD_SZENARIO.premiumhaeuser = 5`. Die fünf sind zusätzliche Standorte zu den 360 regulären Warenhäusern (Gesamtwelt 561). `UMSATZZIELE_JAHR1.premium` von 820 Mio. € anteilig um P005 erhöhen (Faktor nach Fläche × Produktivität), Begründung im Commit.
3. Premium-Kalibrierung aus #7 bleibt: alle fünf klar besser als der Filialschnitt (Haus-EBITDA mindestens +1 %, Mittel mindestens +3 %; Filialschnitt −1,2 %). Test `engine/tests/premium.test.ts` auf fünf Häuser erweitern.
4. Grafik: `render/src/kit/premium.js` bekommt ein eigenes Gebäude für P005 (Berliner Kaufhausarchitektur am Platz, deutlich anders als P001), Düsseldorf am Heine-Platz statt an der Kö. Neues Motiv als Katalogmodul anlegen; Claude rendert und prüft. Dreiecke je Premiumhaus höchstens wie P001.
5. Brücke/Oberfläche: alle Stellen, die vier Premiumhäuser annehmen (Listen, Karten, Portfolio, Q04-Dublettenprüfung), auf fünf prüfen.

## Abnahme (Claude misst)
`npm run typecheck`, `npm test`, `npx tsx scripts/m7-wochenverlauf.ts` bestanden, Premium-Margen wie oben, `node spiel-render.js` 0 Abweichungen, Fingerabdruck Berlin, Hamburg und Düsseldorf mit Begründung neu (Claude erzeugt), übrige Städte unverändert.

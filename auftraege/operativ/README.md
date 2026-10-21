# Operatives Paket

Ummo, 20.10.: Insolvenz und Sanierung sind geparkt. Hartwig bekommt den operativen Betrieb einer Warenhauskette: eine Zentrale mit Bereichen, Hauscluster, Personal, Ware, Planung, Häuser als Betriebe, Umbauten, IT und E-Commerce. Alle Festlegungen in diesen Aufträgen stammen von Ummo und sind verbindlich.

## Reihenfolge
| Nr. | Auftrag | Branch | Hängt ab von |
|---|---|---|---|
| O01 | `o01-organisation.md`: Hauscluster, Leitungen, Bereiche, Berichtslinien | `feat/op-organisation` | – (zuerst) |
| O02 | `o02-umsatztreiber.md`: Frequenz × Kaufquote × Bon, Umsatzbrücke, Wochenreporting | `feat/op-umsatztreiber` | – (parallel zu O01) |
| O03 | `o03-it.md`: IT-Systeme als Projekte | `feat/op-it` | O01 |
| O04 | `o04-personal.md`: Personaleinsatz in vier Gruppen | `feat/op-personal` | O01, O02 |
| O05 | `o05-ware.md`: Merchandise Planning, Clusterbestand, Allokation, Reduzierung | `feat/op-ware` | O01, O02 |
| O06 | `o06-planung.md`: Jahresplanung, Forecast, Boni | `feat/op-planung` | O01, O02 |
| O07 | `o07-haus.md`: Haus als Betrieb | `feat/op-haus` | O01, O02 |
| O08 | `o08-umbau.md`: Umbau und Modernisierung | `feat/op-umbau` | O01 |
| O09 | `o09-ecommerce.md`: E-Commerce als Kanal | `feat/op-ecommerce` | O03, O05 |

Der Branch darf vor dem Merge seiner Abhängigkeiten starten: von `main` abzweigen und vor dem PR rebasen. Wer auf O01 oder O03 aufbaut, nutzt deren Schnittstellen (unten). Fehlt die Schnittstelle noch auf `main`, legt er sie als Platzhalter an, mit genau der Signatur von unten.

## Regeln für alle O-Aufträge
1. **Neutral im Standard.** Mit den Starteinstellungen liefert die Ausgangslage dieselben Ergebnisse wie `main`: Umsatz und EBITDA Jahr 1 höchstens ±1 % je Seed 1 bis 3. Bot C überlebt 5 Jahre. Die neuen Hebel wirken erst, wenn der Spieler, ein Vorstand oder eine Bereichsleitung sie bewegt. Dafür wird jeder neue Faktor so normiert, dass sein Startwert 1 ergibt.
2. **Eigene Module:**
   - Engine in `engine/src/<modul>.ts`. In `engine.ts` höchstens ein Aufruf je Woche.
   - Aktionen über `SpielerAktion` in `aktionen.ts`, Anzeigen über Abfragen in `abfragen.ts`.
   - Oberfläche in `render/src/ui/<modul>.js`.
   - In geteilten Dateien (`types.ts`, `aktionen.ts`, `abfragen.ts`, `engine.ts`, `spiel.js`, `spiel.html`) nur ergänzen, eigener Block je Auftrag mit Kommentar `// O0x <Name>`.
3. **Begriffe:**
   - **Hauscluster:** eine Gruppe von Häusern einer Region. Typ `Hauscluster`, Feld `haus.hauscluster`.
   - Das bestehende Feld `haus.cluster` (Stadtgröße: Metropole, Großstadt, Mittelstadt) bleibt im Code, heißt in der Oberfläche ab sofort „Stadtgröße“.
   - **Cluster** ohne Zusatz meint in Texten den Vergleich mit allen Häusern („gegen Cluster“).
4. **Maßstab:** Alles muss mit der heutigen Welt (rund 130 Häuser) und mit der Maßstab-Welt (560 Häuser, Branch `feat/engine-massstab`) laufen. Nichts an Städten oder Häusern fest verdrahten.
5. **Laufzeit:** Jeder Auftrag misst `wocheAbspielen` vorher und nachher (Mittel über 52 Wochen, Seed 1). Höchstens +10 ms je Woche in der heutigen Welt. Messung in die PR.
6. **Posteingang:** Neue Vorlagen und Meldungen laufen über den Posteingang (`E.posteingang`). Vorlagen haben eine Frist. Unentschieden läuft nach der Frist der Vorschlag der zuständigen Bereichs- oder Clusterleitung durch.
7. **Bilder:** GPT kann nicht rendern. Neue Grafik als Kit-Modul und Katalog anlegen. Claude rendert und prüft.
8. Alle Regeln aus `auftraege/README.md` gelten, vor allem „Ohne CI arbeiten“ und Deutsch mit echten Umlauten.

## Gemeinsame Schnittstellen (von O01 und O03 angelegt)
```ts
// O01, engine/src/organisation.ts
export type BereichId = string;                       // z. B. 'merchandise_planning'
export function bereichsQualitaet(s: GameState, b: BereichId): number;   // 0..1, aus Leitung, Stufe, Vorstand, IT-Deckel
export function berichtetAn(s: GameState, b: BereichId): 'spieler' | RessortId;
export function hausclusterVon(s: GameState, hausId: string): Hauscluster | undefined;
export function clusterleitungQualitaet(s: GameState, hcId: string): number; // 0..1
export function neueVorlage(s: GameState, v: VorlageEingabe): void;        // Vorlage in den Posteingang, Absender = Bereich oder Clusterleitung
// O03, engine/src/it.ts
export function itDeckel(s: GameState, b: BereichId): number;  // 0..1, Startwert so, dass die Ausgangslage unverändert bleibt
```

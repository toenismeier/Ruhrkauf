# Vertrag HQ-Logik und Engine-Anbindung (verbindlich für alle Agents)

Spiel: iPhone-Turnaround-Tycoon über die fiktive Warenhauskette "Hartwig" (+ "Hartwig Sport"), Stil Coffee Inc 2. Engine: /home/claude/turnaround (TypeScript strict, deterministisch, Euro als Integer). Grafik: /home/claude/render (three.js, Iso-Kamera, Kataloge via `node render-katalog.js <name>`). Deutsch mit echten Umlauten, keine Gedankenstriche (– —) in Texten für den Spieler. Alle Namen fiktiv, keine echten Firmen, Marken oder Personen.

## Idee (wie Coffee Inc 2)
Die Zentrale ist kein Pauschalposten mehr. Der Spieler mietet Bürogebäude (in einer oder mehreren Städten), mietet darin einzelne Etagen und setzt Abteilungen auf die Etagen. Abteilungen kosten Personal und Fläche und wirken auf die Engine. Start: eine zu große, alte Hauptverwaltung (Bürobau 1960er, Essen) mit allen Abteilungen; der Turnaround-Weg ist verkleinern, umziehen, gezielt ausbauen.

## Engine-Datenmodell (src/hq.ts, in GameState als `hq`)
```ts
type AbteilungId = 'controlling' | 'einkauf' | 'marketing' | 'personal' | 'immobilien'
  | 'logistik' | 'ecommerce' | 'recht' | 'vm' | 'verwaltung';
interface HqEtage { nr: number; qm: number; gemietet: boolean; abteilungen: AbteilungId[] }
interface HqGebaeude {
  id: string; name: string; stadt: string;
  typ: 'altbau' | 'nachkrieg' | 'buero70' | 'glas' | 'loft' | 'campus';
  etagen: HqEtage[]; mieteQmMonat: number; bisWoche: number; seitWoche: number;
}
interface Abteilung { id: AbteilungId; stufe: 0|1|2|3; fte: number; gebaeudeId?: string; etage?: number; umzugBis?: number }
interface HqAngebot { id: string; gebaeude: HqGebaeude; frist: number }  // freie Bürogebäude zum Mieten
interface Hq { gebaeude: HqGebaeude[]; abteilungen: Abteilung[]; angebote: HqAngebot[]; sitz: string }
```
- Flächenbedarf je Abteilung = fte × 14 qm; eine Abteilung darf nur auf gemieteten Etagen eines gemieteten Gebäudes sitzen; Summe Bedarf ≤ Etagen-qm. Abteilung ohne Platz wirkt mit Stufe 0.
- `s.zentrale.kostenWoche` wird aus Abteilungen (Personal) + Büromieten + Nebenkosten berechnet; Startwert muss die bisherige Kalibrierung treffen (zentraleQuote 0,034, Balancing aus README bleibt im Rahmen).
- `s.controllingStufe` wird aus der Abteilung controlling abgeleitet (Stufe 0..3 → 0,1,2,2 plus Stufe 3 Zusatzeffekt).
- Wirkungen (Größenordnung, kalibrieren): einkauf → Rohertrag/WKZ, marketing → Wirkung Marketingbudget, personal → Betriebsrat/Filialleiter-Moral/Besetzung, immobilien → Mietverhandlung/Untermiet-Angebote, logistik → Logistikkosten, ecommerce → Umsatzbonus, recht → Kosten Sozialplan/Insolvenz/Restmieten, vm → Flächenproduktivität, verwaltung → Pflicht (unter Mindeststufe Strafen). Verteilung über mehrere Städte kostet etwas Wirkung.
- Aktionen in aktionen.ts (fuehreAus): hqMieten(angebotId, etagen[]), hqEtageKuendigen(gebaeudeId, etage), hqGebaeudeKuendigen(gebaeudeId) (Restmiete wie bei Häusern), abteilungSetzen(abteilung, gebaeudeId, etage) (Umzug kostet Einmalkosten und 4 Wochen halbe Wirkung), abteilungStufe(abteilung, stufe) (Abbau mit Abfindung und Betriebsrat-Effekt, Aufbau mit Einarbeitung). Bestehende Aktion 'zentrale' (Prozent-Kürzung) bleibt kompatibel und kürzt alle Abteilungen anteilig.
- Abfrage in abfragen.ts: `hqUebersicht(s)` → Gebäude, Etagen mit Belegung und Auslastung, Abteilungen mit Stufe, FTE, Kosten/Woche, Wirkung als Text, offene Angebote.
- `export function hqFuerGrafik(s)` → reines JSON für die Grafik: `{ sitz, gebaeude: [{id,name,stadt,typ,etagen:[{nr,qm,gemietet,abteilungen:[{id,fte,stufe}]}]}], angebote:[{id,stadt,typ,etagen:[{nr,qm}]}] }`.
- Tests ergänzen (jest), `npm test` und `npm run typecheck` grün; Bot-Strategie C überlebt weiter 5 Jahre auf Seeds 1 bis 3.

## Grafik (render)
- `src/kit/hq.js`: `hqGebaeude(S, scene, g, opt)` baut ein Bürogebäude je typ (6 Typen, eigenständig, im Stil der Stadthäuser), gemietete Etagen mit "HARTWIG"-Zentrale-Schild, freie Gebäude mit "Zu vermieten"-Banner. `hqEtage(S, scene, g, nr, opt)` baut den Etagengrundriss als Schnitt wie grundriss.js etage(): jede Abteilung eine Zone mit typischer Einrichtung (Schreibtischinseln, Glasbüros, Besprechung, Teeküche, Druckerecke; Controlling Bildschirme mit Charts, Einkauf Musterregale und Stoffproben, Marketing Fotostudio/Plakatwand, VM Dekowerkstatt mit Puppen, Logistik Leitstand mit Karten, E-Commerce Fotoplatz/Packtische, Recht Aktenregale, Personal Bewerbungsraum, Immobilien Grundrisspläne und Modell, Verwaltung Buchhaltung), Abteilungsschild in Abteilungsfarbe, Figuren nach FTE.
- Stadt: Slot-Typ 'slot:hq' bzw. Platzierung über plan.standorte mit `{art:'hq', ...}`, damit HQ-Gebäude in der Stadt stehen; Angebote ebenfalls als Gebäude mit Banner.
- Kataloge: `src/kataloge/hq.js` (alle Typen außen, gemietet/frei), `src/kataloge/hq-etagen.js` (Etagen mit Abteilungen, alle 10 Abteilungen sichtbar, Stufen erkennbar).
- Bild-Eingabe ist ausschließlich das JSON aus hqFuerGrafik (Beispieldatei `render/hq-beispiel.json`, bis die Engine liefert).

## Brücke Engine ↔ Grafik
- `render/src/kit/bruecke.js`: `zustandAusHaus(haus, s)` bildet Engine-Haus auf die 12 sichtbaren Zustände ab (STATI in zustaende.js: offen, aktion, untermiete, offprice, teilschliessung, umbau, raeumung, geschlossen, leer, verfall, neueroeffnung, abriss), inkl. Mieter, Aktionen (Engine-Aktionen mit scope), Substanz → verfall.
- `render/spiel.html` + `src/spiel.js`: Browser-Prototyp: Engine (esbuild bündelt TS direkt) läuft im Browser, eine Stadt wird gebaut, Woche weiter, Cockpit-Zahlen, Antippen eines Hauses zeigt Hausdetail, HQ-Ansicht zeigt Gebäude/Etagen. Kamera verschiebbar/zoombar im Rahmen plan.kameraGrenze.
- Headless-Beleg: Bilder des Prototyps in Woche 0, 26, 52 (mit Bot-Strategie), damit Zustandswechsel sichtbar sind.

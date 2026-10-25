# Q37: Musterfeld, Kategorie Anlass, Freischaltungen (Claude-Chat)

Branch `feat/q37-musterfeld-anlass`. Grundlage `auftraege/wurf4/README.md`.

## 1. Musterfeld
- Produkt bekommt ein Feld **Muster** neben Farbe und Material: Uni, Streifen, Ringel, Karo, Punkte, Blumen, Leo, Tier, Camouflage, Batik, Print, Schriftzug, Schachbrett, Norweger, Häkel/Strick, Lizenzmotiv (Lizenzmotiv vorbereitet, aber noch ohne Lizenzgeber; Ummo will später Kooperationen wie Disney).
- Je Artikeltyp erlaubte Muster (Kategorie-Standard plus Ausnahmen), im Produktentwickler wählbar, Bild zeigt das Muster (`stoff.js` hat uni/streifen/karo/blumen; fehlende ergänzen).
- **Trend je Muster × Saison × Zielgruppe** an die Referenz anlehnen (Anteile in `auftraege/wurf4/daten/muster-anteile.csv`, z. B. Teens: 59 % Uni, 18 % Schriftzug, 10 % Print; Blumen im Sommer 6 %, im Winter < 1 %; Karo im Winter 8 %).
- **28 heutige Muster-Typen** (`daten/q37-mustertypen.csv`, z. B. Karohemd, Ringelshirt, Leo-Midirock) gehen im Grundtyp plus Muster auf. Die Zielgruppen der alten Typen wandern auf den Grundtyp. Alte Spielstände: Produkte dieser Typen auf Grundtyp + Muster umschreiben (Migration, Test).
- Nebenbefund: „Cargo-Hose“ und „Cargohose“ sind doppelt, zusammenführen.

## 2. Kategorie Anlass
- Eigene Kategorie im Sortimentsbaum mit Unterkategorien: **Abiball, Tanzschulball, Konfirmation/Jugendweihe/Firmung, Oper/Familienfeier/Hochzeitsgast, Volksfest/Tracht, Hochzeit (Braut), Zubehör**. Zuordnung der Referenzartikel in der Excel (Blatt Anlass).
- Saisonspitzen: Konfirmation/Jugendweihe/Firmung März–Juni, Abiball Mai–Juli, Hochzeit bis September, Tanzschulball und Weihnachts-/Silvesterfeier Herbst–Winter, Volksfest/Tracht Sept–Okt.
- Anlassmode ausdrücklich auch für Teens (E45). Als Eigenmarken-Schwerpunkt wählbar.
- Vorhandene Typen einsortieren (Abendkleid, Ballkleid, Cocktailkleid, Etuikleid, Anzug, Sakko, Blazer, Pumps, Clutch …); neue Anlass-Typen kommen aus Q39–Q41.

## 3. Freischaltungen
- `daten/q37-freischalten.csv`: 112 vorhandene Typen bekommen zusätzliche Zielgruppen (Spalte `freischalten_fuer`). Umsetzung über Korrekturen wie `q34-zielgruppen.ts` (eigene Datei `q37-zielgruppen.ts`), Test, der jede Zeile prüft.

## Abnahme
Wie README. Zusätzlich: Zählung Typen je Zielgruppe vorher/nachher im PR, Migrationstest Spielstand 52 Wochen.

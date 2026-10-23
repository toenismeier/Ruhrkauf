# Q34: Sortiment je Zielgruppe – Adults, Best Ager + Schuhbilder (Claude-Chat)

Branch `feat/q34-sortiment-erwachsen`. **Ummo 23.10.2026: „ca. 180 Produkte pro Zielgruppe“; Crop-Tops eher bei Teens als bei Best Agern.** Befund `testflight/wurf-3/BEFUNDE.md` 7. Regeln `auftraege/wurf2/produktbilder-regeln.md`.

## Ziel
- Je Zielgruppe **Adults und Best Ager mindestens 180 Artikeltypen** (Damen, Herren, Home zusammen), jeder mit eigenem, unterscheidbarem Bild; Zähltest wie Q33.
- Zielgruppengerecht: Best Ager z. B. Twinset, Steppweste, Bundfaltenhose, Komfortschuh, Lesebrillenetui, Gehstock-Schirm; keine Crop-Tops, keine Baggy-Cargos. Zuordnung über `G(kinder, jung, mitte, reif)`.
- **Schuhbilder:** Ballerina, Business-Schuh, Loafer, Schnürschuh, Slipper zeigen heute dasselbe Loafer-Bild, Wanderschuh einen Stiefel. Jede Schuhart eigene Silhouette (Q28-Leisten `q28-schuhe.js` weiterverwenden); Prüfung: keine zwei Artikeltypen mit identischem Bild-SVG (Test über alle Typen, nicht nur Schuhe).

## Dateien (Konfliktvermeidung mit Q33)
Neue Typen in `engine/src/sortiment/q34-erwachsen.ts`, Korrekturen in `engine/src/sortiment/q34-zielgruppen.ts`, Bilder `render/src/kit/mode/q34-*.js` über `erweiterung-q34.js`. Schuhkorrektur direkt in `q28-schuhe.js` (Q33 fasst sie nicht an).

## Abnahme
Wie Q33 (Kontaktbogen je Zielgruppe, Blindtest ≥ 95 %, Tests, Wochenverlauf identisch mit main, CI von Hand, selbst mergen, STATUS).

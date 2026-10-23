# Q33: Sortiment je Zielgruppe – Kinder, Teens & Tweens, Young Adults (Claude-Chat)

Branch `feat/q33-sortiment-jung`. **Ummo 23.10.2026: „ca. 180 Produkte pro Zielgruppe“; Crop-Tops eher bei Teens als bei Best Agern.** Befunde `testflight/wurf-3/BEFUNDE.md` 8, 9. Regeln `auftraege/wurf2/produktbilder-regeln.md` (ein Stil, Blindtest 64 px durch frischen Subagenten).

## Ziel
- Je Zielgruppe **Kinder, Teens & Tweens, Young Adults mindestens 180 Artikeltypen** im Gesamtsortiment (Damen, Herren, Kinder, Home zusammen), jeder mit eigenem, unterscheidbarem Bild. Zählung als Test (`engine`), Ausgabe je Zielgruppe × Sortiment.
- Zielgruppengerecht: z. B. Crop-Top, Cargo-Baggy, Hoodie, Bucket Hat, Schulrucksack, Sneaker bei jung; kein Business-Schuh, keine Bundfaltenhose bei Teens. Zuordnung über die Gewichte `G(kinder, jung, mitte, reif)` (`engine/src/sortiment/basis.ts`); Teens und Young Adults teilen `jung` heute – wo nötig feiner trennen, ohne Spielstände zu brechen.
- Eine Marke sieht deutlich mehr als heute (Pünktchen Teens & Tweens: 21 Typen, Oberteile nur T-Shirt). Prüfen, ob der Marken-Filter über WGs zu eng ist; Ziel: eine Kinder-/Jugendmarke sieht je passender Zielgruppe ≥ 80 Typen.
- Doppelte Ebene „Kinder → Kinder und Baby (38)“ auflösen: Baum unter dem Reiter Kinder nach Oberteile/Unterteile/… gliedern, Baby als eigene Unterkategorie. Unter dem Reiter Kinder nur die Zielgruppen Kinder und Teens & Tweens anbieten.

## Dateien (Konfliktvermeidung mit Q34)
Neue Typen nur in `engine/src/sortiment/q33-jung.ts` (Haken in `index.ts` wie Q27–Q29), Zielgruppen-Korrekturen bestehender Typen in `engine/src/sortiment/q33-zielgruppen.ts`. Bilder in `render/src/kit/mode/q33-*.js`, registriert über `erweiterung-q33.js`. Q34 arbeitet parallel mit q34-Dateien; gemeinsame Typen nicht doppelt anlegen, Namensliste vorher gegen main und Q34-Branch prüfen.

## Abnahme
Kontaktbogen je Zielgruppe (alle Bilder 64 px) an Ummo, Blindtest ≥ 95 %, `npm test` in engine und render, Wochenverlauf `engine/scripts/m7-wochenverlauf.ts` identisch mit main (neue Typen nur in der Auswahl, nicht im Startsortiment), CI von Hand, selbst mergen, STATUS nachziehen.

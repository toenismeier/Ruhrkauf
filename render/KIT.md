# Grafik-Baukasten Turnaround-Tycoon

Ziel: Massenproduktion wie bei CityRT. Alles wird aus Code generiert (three.js), parametrisch und deterministisch.
Bildsprache: **Coffee Inc 2**. Referenzbilder liegen in `/home/claude/render/ref/` (unbedingt ansehen):
- `appstore.png`: 10 App-Store-Screens: Stadtkarten Tokyo/Paris/New York, aufgeschnittenes Café, HQ-Büro, Bank, UI
- `2024-08-23_16-41-33_UTC_5.png` (Paris) und `2024-10-19_12-57-00_UTC.png` (Madrid): Stadt in Großansicht
- weitere Promo-Bilder im selben Ordner

## Was diese Bildsprache ausmacht
- Echte isometrische Ansicht, feste Kamera (Azimut 45°, Elevation 30°), orthografisch.
- Flach schattiert (Lambert, keine Texturen außer Schrift). Detail entsteht aus Geometrie: Fensterraster, Gesimse,
  Fensterbänke, Pilaster, Erker, Balkone, Mansarden, Gauben, Schornsteine, Dachaufbauten, Markisen, Ladenfronten.
- Helle, leicht warme oder kühle Weißtöne als Grundton, wenige Akzentfarben. Kontrast zwischen linker (heller) und rechter (dunklerer) Seite.
- Dichte: Blockrandbebauung, Höfe, viele Parzellen mit unterschiedlicher Breite und Höhe.

## Gestaltungsregeln (verbindlich)
- `GESTALTUNG.md`: messbare Regeln aus der Vorlage (Blockrand, eine Ebene, Maßstab, Wasser, Ruhe, Sorgfalt).
- Prüfen: `node pruef-gestaltung.js [Stadt,Stadt]` zählt die Verstöße je Stadt (Plan und Nahausschnitt der Einkaufslage).

## Technische Regeln (verbindlich)
- Basis-API: `src/kit/basis.js` (lesen!). **Nicht ändern.** Eigene Helfer gehören in die eigene Moduldatei.
- Sichtbar sind nur die Seiten **+x** (rechts im Bild) und **+z** (links im Bild) plus Dach. Diese beiden Seiten immer voll detaillieren.
- Ein Objekt steht auf `[x, x+w] × [z, z+d]`, Boden y = 0. Generatorfunktion: `export function name(S, scene, p)` mit
  `p = { x, z, w, d, seed, ... }`, Rückgabe `{ hoehe }` (oder mehr). Alle Geometrie über den Sammler `S`.
- Text/Logos nur über `schild()`/`textTextur()`/`textMaterial()` aus basis.js (gemeinsamer Cache nach Text, Farbe, Größe,
  Hintergrund und Schrift; keine eigenen Caches in den Modulen). Alle Texte auf Deutsch mit echten Umlauten.
- Keine echten Marken oder Firmennamen. Eigene Kette heißt **Hartwig** (Warenhaus, Rot `#d23c32`) und **Hartwig Sport**.
- Budget: ein normales Gebäude ≤ 2.500 Teile im Sammler, ein Warenhaus ≤ 8.000. Prüfen über `S.anzahl`.
- Deterministisch: Zufall nur über `rng(seed)`.

## Stadtrand, Kamera, Gelände
- `src/kit/stadtrand.js`: Stadtrandgürtel als Plandaten (`plan.aussen`: Straßen, Kreuzungen, Vorortblöcke mit Belegung,
  Wasser, Grünstreifen, Bauten), `plan.kameraGrenze` (Rechteck für den Kamera-Mittelpunkt im Spiel) und `nahMitte(plan,
  ansicht, zoom, o)`, die gemeinsame Nahkamera von Katalog und Prüfskript. Gebaut in `stadt.js baueStadtrand`.
- `src/kit/gelaende.js`: glatte Geländeflächen (`gelaende`), Bergprofil (`bergHoehe`, `plan.berge`) und Rebzeilen.

## Katalog rendern
- Katalogdatei `src/kataloge/<modul>.js` baut eine Liste von Einträgen und ruft `zeigeKatalog(eintraege, { titel, spalten, kachel })`.
- Rendern: `cd /home/claude/render && node render-katalog.js <modul>` → `out/katalog-<modul>.png`
- Bild ansehen (Read-Tool auf die PNG), mit den Referenzen vergleichen, nachbessern. Mindestens drei Runden.
- Beispiel: `src/kataloge/test.js`

## Daten aus der Spiel-Engine
- `/home/claude/render/haeuser.json`: alle 180 Häuser (130 Warenhäuser W…, 50 Sporthäuser S…) mit
  `grundflaecheQm, etagen (-1 = UG), baujahr (1895 bis 2015), fassade (0 bis 7), lage ('1a'|'b'|'center'|'rand'), cluster, substanz (0 bis 100), flaechen [{etage, qm, konzept, gruppe}]`.
- Konzepte einer Fläche: `eigen | kommission | konzession | untermiete | offprice | leer`.
- Warengruppen Warenhaus: damen, herren, kinder, beauty, accessoires (Schuhe & Accessoires), waesche, wohnen, spielwaren, food (Feinkost), sport.
  Sporthaus: sportschuhe, sporttextil, outdoor, rad, wintersport, teamsport.

## Detailstufen (LOD), Grundlage für das iPhone
`setzeLod(stufe)` aus basis.js schaltet global um (nach dem Bau wieder `setzeLod('nah')`). Zufall und Grundriss bleiben
in allen Stufen gleich, es entfallen nur Teile.
- `nah` (Standard): alle Details. Für Nahansichten und Ausschnitte (`ausschnittBauer` baut nur sichtbare Parzellen).
- `fern` (ganze Stadt, `standortEintrag(name, 'stadt')` setzt sie selbst):
  - Sammler (`Sammler`, `KompaktSammler`) verwerfen Kleinteile: zwei Kanten unter `LOD.duenn` (0,3 m) und keine über
    `LOD.lang` (6 m), also Fensterbänke, Rahmen, Sprossen, Geländer, Masten, Figuren aus Geometrie.
  - Instanzer (stadt.js) lässt Figuren, Straßenmöbel, Laternen, Ampeln, Fugen und Schwellen weg (`FERN_WEG`);
    Bäume, Fahrzeuge, Bahnen, Schiffe und Markierungen bleiben (alle als InstancedMesh).
  - Schrift höchstens `LOD.schrift` (24) px, Schilder unter `LOD.schildMin` (1,4 m) entfallen (`entferneKleineSchilder`).
  - `KompaktSammler` kopiert jedes Teil sofort in Puffer je Farbe (rund halber Spitzenspeicher) und lässt Dreiecke weg,
    die bei fester Kamera und Sonne weder sichtbar sind noch Schatten werfen (alle −x-Seiten, rund ein Fünftel).
- Prüfen: `node pruef-render.js` rendert alle 112 Städte einzeln (640 × 360, Metropolen zusätzlich 1280 × 720) und
  schreibt Dreiecke, Teile, Zeit und Erfolg nach `out/render-protokoll.csv`. `node pruef-render.js --zeit` misst die
  Zeit je Slot-Bauer und Aufruf im Browser über alle Städte (`out/zeit-bauer.txt`, Ziel: unter 0,5 s).

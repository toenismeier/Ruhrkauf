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
- **FUNDUS (Off-Price):** Ziel 900–1.800 Teile je Haus im Nah-LOD, absolute Obergrenze 3.000; alle 20 Häuser plus die drei Bauformen separat im Katalog und über die `teile`-Rückgabe prüfen. `fern`-LOD reduziert insbesondere die einzelnen Warenstücke. Breites 3,5-m-Markenband, weiße Versalien, Claim, 9-m-Pylon und drei klar getrennte Bauformen sind verbindliche Qualitätsmerkmale.
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

## Möbelbibliothek (Workstream Ladenbau, Phase 1)
- `src/kit/moebel/index.js`: `ALLE_MOEBEL` (147 Definitionen), `MOEBEL[id]` und `moebel(id)`. Bereiche Sport (86), Off-Price (15), allgemein / Schwesterkette (46). Neue Möbel gehören in `moebel/{wand,gondel,insel,kasse,deko,sport,outlet,service}.js`, gemeinsame Hilfen in `moebel/basis.js`.
- Schnittstelle pro Stück: `{id,titel,bereich,rasterB,rasterT,hoehe,typ,budget,bau(L,r,d,ctx)}`; `L` aus `innen.js lokal()`, Vorderseite lokal +z. Breiten/Tiefen als Vielfache von 1,25 m; Wandtiefe stets 0,6 m, Wandkorpus 2,4 m mit 0,6-m-Schildband. Gondeln 1,25 m tief, 1,4 m hoch; Inseln maximal 1,5 m.
- `rng(seed)` aus `basis.js` verwenden und an `bau` übergeben; `setzeLod('fern')` reduziert auf Korpus und Flächenfarben; keine Schrift außerhalb `basis.js`.
- Prüfen: `cd render && node pruef-moebel.js` (oder `npm run moebel:pruefen`). Testet tatsächliche Geometrie-Abmessungen, Rückkanten, Höhen, Bauteilbudgets, reproduzierbare Farbe/Geometrie und Fernstufe. Erwartung: 0 Fehler.
- Kataloge: `node render-katalog.js moebel-sport`, `moebel-outlet`, `moebel-allgemein`, `moebel-reihen` und optional `moebel-sport-fern`. Ergebnisse unter `render/out/katalog-moebel-*.png`; der Grafik-CI-Workflow stellt die vier Kernkataloge zusätzlich als Artifact `ladenbau-kataloge` bereit.
- Alte Aufrufer (`innen.js`, `sportabteilung.js`) bleiben unverändert. Der gemeinsame Ladenplaner aus Phase 3 wird die IDs verwenden.


## Maßstab – 220 Städte und 560 Filialen (Feature-Branch `feat/massstab-staedte`, 20.10.2026)

**Entwicklung, noch nicht abgenommen.** Stadtstamm aus `engine/src/daten.ts` (220 Städte; 7 Metropolen, 73 Großstädte, 140 Mittelstädte), Render-Geografie und Koordinaten aus `src/kit/stadt-geografie.js`. Alte 112 Stadtbilder in `src/kit/staedte.js` behalten ihre regionalen Sonderentwürfe; 108 neue erhalten explizite Grundrissfamilien, regionale Zuordnung und DDR-Prägung statt Zufallsauswahl. Nachbarstädte werden bundesweit mit demselben 28-km-Radius auf Basis gerundeter Stadtkoordinaten bestimmt.

Die Render-Exporte aus `engine/scripts/haeuser-export.ts` müssen vor dem endgültigen Grafiktest mit Seed 1 neu erzeugt werden: `haeuser.json` 408 (360 reguläre Hartwig, 4 Premium, 44 Sport), `haeuser-schwester.json` 86 (Volkskauf), `haeuser-outlet.json` 66 (FUNDUS). Der Stand des Ausgangsbranches enthält bisher nur 180/24/20 Exporte, deshalb sind die neuen Kataloge noch nicht belastbar renderbar.

Kataloge nach dem Export: `stadtvielfalt-neu` (24 neue Städte, fünf Regionen), `standorte-mix` (zehn gemischte Städte), `alle-hartwig-1` bis `alle-hartwig-6` (60 pro Seite), `alle-premium` (4), `alle-volkskauf-1`/`-2` (60/26), `alle-sport` (44), `alle-fundus`/`alle-fundus-2` (60/6). Ausgabe `node render-katalog.js <name>` nach `npm ci`.

Qualitätsprüfungen: `npm run massstab:geografie` (220 Städte/Cluster), `npm run massstab:standorte` (eindeutige Platzierung, Blockabstand, Nebenzentren), `npm run massstab:kopien` (Hausfamilie/Variante/Fassade unter 50 km), `npm run massstab:gestaltung` (alle exportierten Städte). Danach `node pruef-staedte.js`, `node spiel-render.js` und Bildabnahme in drei Runden durchführen. **Diese npm-, Bild- und Renderprüfungen sind im Feature-Branch noch nicht ausgeführt**; bis dahin keine Merge-Freigabe.

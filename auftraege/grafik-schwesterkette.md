# Auftrag Grafik: Schwesterkette (zweite Warenhauskette im Konzern)

## Einordnung
Repo `toenismeier/Ruhrkauf`, Grafik-Baukasten in `render/`. Vor dem Start vollständig lesen: `render/KIT.md`, `render/GESTALTUNG.md`, `render/src/kit/basis.js`, `render/src/kit/warenhaus.js`, `render/src/kit/zustaende.js`, `render/src/kit/bruecke.js`, `render/src/kit/bauer.js`. Referenzbilder: `render/ref/`, bestehende Kataloge: `bilder/katalog-warenhaus.png`, `bilder/katalog-wettbewerber.png`.

Hartwig ist die Hauptkette (rot `#d23c32`). Dazu kommt jetzt eine zweite, ältere und schwächere Warenhauskette, die zum selben Konzern gehört: der „vergessene Zwilling“. Solide, nicht glamourös, die Arbeiterkette.

**Name:** Arbeitsname `Kaufhaus Wendt`, als eine einzige Konstante `NAME_SCHWESTER` in der neuen Moduldatei. Keine echten Marken, keinen Namen aus `wettbewerber.js` oder den Eigenmarken verwenden. Der endgültige Name kommt später und darf nur diese Konstante ändern.

## Aussehen und Feeling
- Nur Nachkriegsbauten, Baujahr 1955 bis 1979. Keine Kaiserzeit, keine Kuppel, kein Glas der Postmoderne, kein Center-Kopfbau.
- Drei Familien, je mindestens vier Varianten über Fassadenfarbe, Achsen und Dachaufbauten:
  1. Klinkerkasten der 60er: heller Klinker, gleichmäßiges Fensterraster, schmales Gesims.
  2. Sichtbeton-Raster der 70er: Betonrahmen mit Brüstungsfeldern, kräftige Attika.
  3. Waschbeton mit Fensterband: horizontale Bänder, geschlossene Wandflächen, Kachel- oder Waschbetonplatten.
- Drei bis vier Obergeschosse plus EG, ein UG. Grundfläche sichtbar kleiner als ein Hartwig-A-Haus, eher wie Hartwig B/C.
- Fußgängerzone, aber nicht die beste Lage. Breite Schaufenster im EG, aber kein Portal: zwei schmale Türen, keine Drehtür.
- Kein Lichthof, keine Rolltreppenrotunde. Innen eine zentrale Treppe.
- Verschleiß über Geometrie, nicht über Texturen:
  - Attika und Gesims in zwei Grautönen versetzt (fleckig),
  - einzelne Fensterfelder dunkler (blind, verhängt),
  - ausgeblichene Markisen in entsättigter Kettenfarbe,
  - alte, kistige Dachtechnik, keine Solarflächen,
  - Schriftzug kleiner und matter als bei Hartwig, Kastenbuchstaben auf einem schmalen Band über dem EG.
- Kettenfarbe: gedämpftes Petrol `#2f6f73` als einzige Akzentfarbe (Schriftband, Markisen, Türrahmen). Kein Rot.
- Vorplatz schlicht: keine Fahnen, keine Kübel, höchstens zwei Fahrradständer und eine Bank.
- Passantendichte etwa 60 % von Hartwig.

## Innenräume
- `grundriss.js` und `abteilung.js` weiterverwenden, über einen Schalter `kette: 'schwester'` statt Kopie.
- Unterschiede zu Hartwig: kein Restaurant oben, keine Feinkost im UG (UG nur Lager/Anlieferung), weniger und kleinere Abteilungen, Kassen dezentral je Etage, abgenutzter Bodenton (`#cfc6b4`), Deckenleuchten als Rasterleuchten.

## Technik
1. Neue Datei `render/src/kit/schwesterhaus.js` mit `export function schwesterhaus(S, scene, haus, opt = {})`, gleiche Signatur und Rückgabe wie `sporthaus()` (`{ hoehe, w, d, familie, teile, status }`). Dazu `familieSchwester(haus)`, `masseSchwester(haus)`.
2. Alle 12 Zustände über `zustandsDekor()` aus `zustaende.js` (Umbau, Räumung, leer, geschlossen, Untermieter, Patina usw.). `zustaende.js` nur erweitern, wenn ein Zustand für diese Kette sonst falsch aussieht.
3. Daten: neue Datei `render/haeuser-schwester.json` mit 24 Häusern (`id` `K001` bis `K024`, `format: 'schwester'`, Felder wie in `haeuser.json`). Lage nur `b` oder `1a`, Cluster `grossstadt` und `mittelstadt`, Substanz 15 bis 60, verteilt auf Städte aus `staedte.js`, Schwerpunkt West/NRW, nie zwei in einer Stadt.
4. Anbindung ohne Engine-Änderung:
   - `bauer.js fussabdruck()` kennt `format === 'schwester'`.
   - `stadtplan.js SLOT_ROLLE` bekommt `schwester: 'slot:schwester'`.
   - `bruecke.js` verzweigt `format === 'schwester'` auf `schwesterhaus()`.
   - Die Engine (`engine/`) wird in diesem Auftrag nicht angefasst.
5. Gestaltungsregeln in `GESTALTUNG.md` ergänzen und in `pruef-gestaltung.js` prüfen:
   - nie im selben Block wie ein Hartwig-Haus,
   - Grundfläche höchstens 80 % der größten Hartwig-Grundfläche der Stadt,
   - keine zwei Häuser der Kette mit gleicher Familie und Variante in Nachbarstädten.
6. Budget: höchstens 8.000 Teile je Haus (`S.anzahl`), Fernstufe mit `setzeLod('fern')` prüfen.
7. `basis.js` nicht ändern. Zufall nur über `rng(seed)`. Alle Texte deutsch mit echten Umlauten.

## Kataloge und Prüfung
1. Neuer Katalog `render/src/kataloge/schwesterhaeuser.js`: alle 24 Häuser, dazu je Familie die Zustände Umbau, Räumung, leer, geschlossen, Untermieter EG+OG, Patina.
2. Neuer Katalog `render/src/kataloge/schwester-etagen.js`: drei Etagenschnitte (EG, 1. OG, UG).
3. `render/src/kataloge/alle-haeuser.js` um die Kette ergänzen.
4. Rendern mit `node render-katalog.js <name>`, jedes Bild ansehen und mit `render/ref/` und `bilder/katalog-warenhaus.png` vergleichen. Mindestens drei Runden Nachbessern.
5. Abnahme:
   - `node pruef-staedte.js` 0 Fehler,
   - `node pruef-gestaltung.js` 0 Verstöße in allen 112 Städten,
   - Teilebudget eingehalten,
   - auf einen Blick von Hartwig unterscheidbar (Farbe, Bauform, Größe),
   - neben einem Hartwig-Haus wirkt die Kette älter, kleiner und müder, aber nie verfallen.
6. Fertige PNGs nach `bilder/` kopieren (`katalog-schwesterhaeuser.png`, `katalog-schwester-etagen.png`).

## Grenzen
- Kein Merge in `main` ohne Prüfung: Arbeit auf Branch `feat/grafik-schwesterkette`, CI muss grün sein.
- Gemeinsam berührte Dateien (`bruecke.js`, `bauer.js`, `stadtplan.js`, `GESTALTUNG.md`, `pruef-gestaltung.js`, `alle-haeuser.js`) teilen sich die Aufträge Schwesterkette und Outlet. Nacheinander abarbeiten, nicht parallel.

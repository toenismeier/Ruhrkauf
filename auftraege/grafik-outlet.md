# Auftrag Grafik: Off-Price-Kette des Konzerns (SchnäppchenCenter-Pendant)

## Einordnung
Repo `toenismeier/Ruhrkauf`, Grafik-Baukasten in `render/`. Vor dem Start vollständig lesen:
- `render/KIT.md`, `render/GESTALTUNG.md`
- in `render/src/kit/`: `basis.js`, `sporthaus.js` (Fachmarkt-Box und Mall-Front als Vorbild), `sporthelfer.js`, `stadtrand.js`, `zustaende.js`, `bruecke.js`, `bauer.js`, `wettbewerber.js`

Referenzbilder liegen in `render/ref/`. Bestehende Kataloge zum Vergleich: `bilder/katalog-sporthaeuser.png`, `bilder/katalog-wettbewerber.png`.

**Was das Format ist:** eine Off-Price-Kette nach dem Muster TK Maxx. Markenware zu deutlich reduzierten Preisen, ständig wechselndes Sortiment, Schatzsuche. Hierhin geht unter anderem, was Hartwig, Kaufhaus Wendt und Hartwig Sport nicht verkauft haben. Dazu kommen günstig zugekaufte Markenposten.

**Was es nicht ist:**
- kein Restpostenlager,
- keine Lagerhalle mit Paletten und Gitterboxen,
- kein Wühltischladen.

Das Off-Price-Format ist ein ordentlicher, heller Laden mit sehr dichter Ware.

**Name:** eigene Marke, nicht Hartwig. Arbeitsname `MARKENWERT`, als eine einzige Konstante `NAME_OUTLET` in `render/src/kit/outlet.js`. Der endgültige Name kommt später und darf nur diese Konstante ändern. Der Name darf nicht in `wettbewerber.js NAMEN` vorkommen.

## Aussehen außen
- **Lagen:**
  - 14 Häuser in Fachmarktlage am Stadtrand (Retail Park mit Parkplatz),
  - 6 Häuser in der Innenstadt in b-Lage, in einem umgenutzten Geschäftshaus der 70er/80er (Hinweis: auch ehemalige Warenhausflächen).
- **Drei Bauformen:**
  1. Fachmarkt-Box im Retail Park: eingeschossig, große Glasfront mit Vordach, Parkplatz mit Einkaufswagen-Häuschen, Pylon an der Zufahrt.
  2. Fachmarkt-Box zweigeschossig mit Rolltreppe hinter der Glasfront, Parkplatz.
  3. Innenstadt-Geschäftshaus: zwei bis drei Geschosse Ladenfläche, Schaufensterfront im EG, darüber geschlossene Fassade mit großem Markenschriftzug.
- **Markenauftritt:** eine kräftige eigene Hausfarbe (Vorschlag Weinrot `#8c1d40` oder Tiefblau, nicht Hartwig-Rot `#d23c32`) als breites Fassadenband mit großem, gut lesbarem Schriftzug. Unter dem Schriftzug ein Claim-Band („Marken. Bis zu 60 % unter dem empfohlenen Preis.“).
- **Schaufenster:** Puppen in Markenmode, Schuhe, Taschen, Home-Deko. Keine Rabattplakat-Wand. Der Preisvorteil steckt im Claim, nicht in Plakaten.
- **Betrieb:** viele Passanten mit großen Einkaufstüten in der Hausfarbe. In der Fachmarktlage volle Parkplätze.
- **Abgrenzung zu den Wettbewerbern der Art `offprice`** (Kaufkiste, Wühlwerk, Resteparadies): Die sind billig und laut, mit Wühltischen und gelben Plakaten. Dieses Format wirkt wie ein Markenladen, nur voller. Bei Verwechslungsgefahr gewinnt der Markenauftritt.

## Innenraum
Der endgültige Innenraum kommt aus dem Workstream Ladenbau (`workstream-ladenbau.md`, Phase 5). In diesem Auftrag nur einen einfachen Platzhalter liefern, aber schon im richtigen Bild:
- großer heller Raum, Neonraster-Licht, heller Boden, breiter Hauptgang,
- **Abteilungen:** Damen, Herren, Kinder, Schuhe, Taschen und Accessoires, Home, kleine Beauty-Ecke,
- **Ware:** lange Kleiderstangen (Doppelstangen, Reihen), über jeder Stange ein großes Größenschild (XS, S, M, L, XL), ein paar Gondeln für Home und Accessoires, Schuhregale mit Kartons nach Größen,
- **Kasse:** zentrale Kassenzeile mit Schlangenführung (Absperrbänder, Impulsware am Weg), Einkaufswagen und Körbe am Eingang,
- **Personal:** Mitarbeiter mit Rollwagen beim Nachräumen.

Vorhandenes wiederverwenden: `innen.js` (Stangen, Ständer, Gondeln, Kassentresen, Figuren).

## Technik
1. Neue Datei `render/src/kit/outlet.js` mit `export function outlet(S, scene, haus, opt = {})`. Gleiche Signatur und Rückgabe wie `sporthaus()` (`{ hoehe, w, d, familie, teile, status }`). Dazu `familieOutlet(haus)` und `masseOutlet(haus)`.
2. **Zustände:** alle 12 über `zustandsDekor()` aus `zustaende.js`, mit eigenem Kettennamen und eigener Hausfarbe. Zusätzlich ein Zustand „Neueröffnung“: Ballons in der Hausfarbe, Schlange am Eingang.
3. **Daten:** neue Datei `render/haeuser-outlet.json` mit 20 Häusern.
   - `id` `O001` bis `O020`, `format: 'outlet'`, Felder wie in `haeuser.json`.
   - Lage: 14 × `rand`, 6 × `b`.
   - Cluster `grossstadt` und `metropole`.
   - Baujahr (Eröffnung) 1998 bis 2016, Substanz 40 bis 85 (das Format ist jünger und gepflegter als die Warenhäuser).
   - Verteilt auf Städte aus `staedte.js`, Schwerpunkt NRW, nie zwei in einer Stadt.
4. **Platzierung:**
   - Randlage im Stadtrandgürtel: `stadtrand.js` (`plan.aussen`) bekommt einen Fachmarkt-Slot `slot:outlet` an einer Ausfallstraße, mit Parkplatz.
   - b-Lage: Slot im Stadtplan wie bei Wettbewerbern (`stadtplan.js SLOT_ROLLE` um `outlet: 'slot:outlet'` ergänzen), nie im Hartwig-Block und nie im Block der Schwesterkette.
5. **Anbindung ohne Engine-Änderung:**
   - `bauer.js fussabdruck()` kennt `format === 'outlet'`.
   - `bruecke.js` verzweigt `format === 'outlet'` auf `outlet()`.
   - Die Engine (`engine/`) wird in diesem Auftrag nicht angefasst.
6. **Gestaltungsregeln** in `GESTALTUNG.md` ergänzen und in `pruef-gestaltung.js` prüfen:
   - keine gleiche Bauform in Nachbarstädten,
   - nie direkt neben einem Wettbewerber der Art `offprice`,
   - in b-Lage höchstens 80 % der größten Hartwig-Grundfläche der Stadt.
7. **Budget:** höchstens 3.000 Teile je Haus, Fernstufe mit `setzeLod('fern')` prüfen.
8. `basis.js` nicht ändern. Zufall nur über `rng(seed)`. Alle Texte deutsch mit echten Umlauten.

## Kataloge und Prüfung
1. Neuer Katalog `render/src/kataloge/outlets.js`: alle 20 Häuser, dazu je Bauform die Zustände Normalbetrieb, Neueröffnung, Räumung, leer, geschlossen.
2. Neuer Katalog `render/src/kataloge/outlet-lagen.js`: je ein Ausschnitt Retail Park am Stadtrand und Innenstadt-b-Lage.
3. Neuer Katalog `render/src/kataloge/outlet-vergleich.js`: das Format neben Kaufkiste, Wühlwerk und Resteparadies in gleicher Kachelgröße.
4. `render/src/kataloge/alle-haeuser.js` um das Format ergänzen.
5. Rendern mit `node render-katalog.js <name>`, jedes Bild ansehen und mit `render/ref/` vergleichen. Mindestens drei Runden Nachbessern.
6. **Abnahme:**
   - `node pruef-staedte.js` 0 Fehler,
   - Gestaltungsprüfung 0 Verstöße in allen 112 Städten,
   - Teilebudget eingehalten,
   - im Vergleichskatalog auf einen Blick als Off-Price-Markenladen erkennbar und klar von den Billig-Wettbewerbern unterscheidbar.
7. Fertige PNGs nach `bilder/` kopieren.

## Grenzen
- Arbeit auf Branch `feat/grafik-outlet`, CI muss grün sein.
- Gemeinsam berührte Dateien (`bruecke.js`, `bauer.js`, `stadtplan.js`, `GESTALTUNG.md`, `pruef-gestaltung.js`, `alle-haeuser.js`) teilen sich die Aufträge Schwesterkette, Premium und dieses Format. Erst nach dem Merge der Schwesterkette starten.

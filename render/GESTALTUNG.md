# Gestaltungsregeln nach der Vorlage Coffee Inc 2

Verbindlich für alle Städte des Baukastens. Abgelesen aus `ref/2024-08-23_16-41-33_UTC_5.png` (Paris),
`ref/2024-10-19_12-57-00_UTC.png` (Madrid), `ref/appstore.png` (Tokyo, Paris, New York im Spiel),
`ref/2026-06-04_12-30-10_UTC.png` (New York) und `ref/2023-12-27_21-00-31_UTC_1.png` (Seattle).
Prüfen: `node pruef-gestaltung.js [Stadt,Stadt]` (Plan, ganze Stadt und Nahausschnitt der Einkaufslage mit derselben Kamera wie
der Katalog: `stadtrand.js nahMitte`, Zoom 62, Kachel 720 × 1280; der Stadtrandgürtel zählt mit).
Grenzwerte unten in eckigen Klammern sind die Prüfwerte des Skripts für den Nahausschnitt.

## Was die Vorlage zeigt

- Paris: jeder Block ist ein geschlossener Ring gleich hoher Häuser (fünf bis sechs Geschosse, Mansarde), der Hof ist ein
  schmaler Schlitz und fast ganz von den Bauten verdeckt. Grün gibt es nur als eigene Parkblöcke (Marsfeld, Tuilerien) und als
  Baumreihen an Boulevards. Die Seine ist ein durchgehendes Band in Breite eines Blocks, gefasst von Kaimauern; an beiden Ufern
  läuft eine Uferstraße, Brücken liegen an jeder zweiten Querstraße. Der Bahnhof (Appstore-Bild) ist ein Empfangsgebäude mit
  einem schmalen Gleisbündel am Bildrand. Landmarken (Eiffelturm, Arc, Madeleine) stehen auf normalen Blöcken im Raster.
- Madrid: Blöcke ringsum bebaut, gleichmäßige Traufe je Block, Walmdächer und Flachdächer mit Dachaufbauten, Ecken betont.
  Plätze (Puerta del Sol, Plaza Mayor) sind von Bauten gefasst und haben Blockgröße. Die Palette ist fast einfarbig.
- New York (Spiel): Hochhäuser in Gruppen, Reihenhäuser als geschlossene Zeilen gleicher Höhe, schmale grüne Säume nur an
  Wohntürmen, die Stadt endet an einer Uferstraße mit Bordstein, nie an einer offenen Fläche.
- Überall: alles steht auf einer Ebene; Gehweg als helle Platte mit Bordstein um jeden Block, Gebäude bündig an der
  Gehwegkante; Straßen grau mit gestrichelter Mittellinie und Zebrastreifen an jeder Kreuzung; sehr wenige Figuren.

## 1. Blockrand geschlossen

- Jeder Wohn- und Geschäftsblock ist ringsum bebaut. Unbebaute Blockrandlänge an Straßenseiten [höchstens 2 %].
  Lücken und Baustellen zusammen höchstens 1,6 % der Parzellen, keine Parkplätze im Blockrand, keine leeren Parzellen.
- Nachbarhäuser teilen Brandwände: stößt die zweite sichtbare Seite eines Hauses an einen Nachbarbau, trägt sie keine
  Seitenfassade (Plan setzt `p.anbau`, Bauer baut mit `seite: 'nachbar'`).
- Einheitliche Bauflucht: Bautiefe je Block gleich, sie wächst mit der Blockgröße (22 % der kürzeren Blockseite,
  mindestens `TYPEN.tiefe`, höchstens 24 m). Eckhäuser verlängern sich höchstens in eine Richtung, nie mit Vorsprung in den Hof.
- Kein Blockrand bleibt offen: `stadtplan.js randSchliessen` füllt parzellenfreie Straßenkanten (Stadthäuser, in Ost-Städten
  Platten-Arkaden), schmale Vorstreifen rücken die Bauten an die Kante; Höfe im Zentrumsbild sind gepflastert.
  Freie Rasenfläche je Block höchstens ein Quadrat von 26 m [Freie Rasenfläche nah und Rand höchstens 26 m].
- Höfe klein und verdeckt: Höfe über 26 × 26 m bekommen flache Hofbauten (zwei Geschosse, dunkles Flachdach, rundum 5 m Gasse),
  auch in Blöcken mit Standorten. Rasterspalten der Ruhrstädte höchstens 84 m breit, damit Blöcke nicht übergroß werden.
- Keine Rasenflächen in Wohn- und Geschäftsblöcken [Grün in Blöcken 0 %, Stadt höchstens 1 %]. Höfe sind Pflaster
  (`#cbc4b7`, höchstens zwei Hofbäume), Kies oder Stellplätze. Grün nur als eigener Parkblock, als Platz mit Bäumen oder als
  Baumreihe an Hauptstraßen.

## 2. Alles auf einer Ebene

- Gebäude stehen bündig an der Gehwegkante auf Straßenniveau (Oberkante Gehweg 0,32 m). Keine Sockelstufen, Terrassen,
  schwebenden oder versunkenen Bauten im Stadtgebiet [Bauten nicht ebenerdig 0]. Rheinpromenaden nur ebenerdig (treppe, anleger).
- Berge sind glatte, natürliche Hänge (`gelaende.js`, keine Stufenpyramiden): eine Kulisse in der Randreihe steigt zur
  Kartenkante an und läuft im Stadtrandgürtel als Berg weiter (Wald, Reben in eigenen Zeilen, Alpen mit Fels und Schnee).
  Burgen stehen auf einem ebenen Plateau. Innerhalb der Stadt keine Hangterrassen.

## 3. Maßstab und Zurückhaltung

- Landmarken je Stadt eindeutig: keine zwei Kirchen gleichen Stils oder gleicher Variante, keine zwei Hartwig-Häuser gleicher
  Familie und Variante; Parkdeck nur bei Rand- und Center-Lage.
- Landmarken sitzen eingebettet im Raster in Blockgröße: Konzernturm als Slot im Blockrand eines normalen Blocks (übrige
  Seiten Blockrand), nie als Solitär auf einer Freifläche; je Stadt eigene Variante und Lage.
- Bahnhof: ein Empfangsgebäude mit Vorplatz (Taxistand, höchstens zwei Bussteige, Baumreihe), dahinter ein
  Gleisband von vier Gleisen (26 m, Mittelstadt zwei Gleise mit Bahnsteig, 16 m) an der Kartenseite, gegenüber und seitlich
  der Einkaufslage. Keine Gleisfelder [Gleisfläche nah höchstens 2 %, Bahnhof nah höchstens 3 %].
  Der Vorplatz liegt nur vor dem Empfangsgebäude (± 26 m); seitlich davon Häuserzeile zur Straße und P+R-Parkplatz.
- Zeche, Hütte, Kokerei, Halde, Siedlung, Stadion, Einkaufszentrum, Kanalhafen gehören an den Stadtrand. Im Nahausschnitt
  höchstens ein Großbau und nur am Rand [Großbauten nah höchstens 1, innen 0]. Gleisband zählt mit.
- Hartwig ist das prägnanteste Haus der Einkaufslage: Nachbarn im Hartwig-Block höchstens vier Geschosse, Wettbewerber
  höchstens 80 % der größten Hartwig-Grundfläche der Stadt. Wettbewerber in Nachbarstädten nie mit gleicher Kombination aus
  Art, Bauform und Name (siehe 3a).
- Plätze höchstens Blockgröße und von mindestens drei Seiten gefasst; gefüllt mit Baumreihe, Brunnen, Bänken, Ständen.
  Wenige Figuren (Markt rund eine Figur je 60 m², Fußgängerzone eine je 40 m²). Offene Parkplatzblöcke nur am Stadtrand.

## 3a. Vielfalt zwischen Nachbarstädten

- Nachbarstädte (näher als 28 km, `staedte.js` KOORD/NACHBAR_KM) zeigen nie dieselbe Bauform: Wettbewerber mit gleicher Art und
  gleicher Bauform, gleicher Kirchenstil der Hauptkirche, gleicher Rathausstil, gleicher Konzernbau sind ausgeschlossen
  [`pruef-gestaltung.js`: gleiche Bauform bei Nachbarn keine].
- Wettbewerber: die bei Nachbarn seltenste Art; jede Art hat fünf Bauformen (Block, Kopfturm rechts, Glasvorbau mit Rotunde,
  Kopfturm links, Kopfturm mit Glasvorbau); der Zylinder kommt nur in einer Bauform vor, in einer Stadt jede Bauform nur einmal.
- Hartwig im Betrieb: roter Attikarand und rotes Band über dem Erdgeschoss, heller Vorplatz mit Bänken, Kübeln und drei Fahnen.

## 4. Wasser

- Flüsse sind klare, durchgehende Bänder über die ganze Karte, breiter als ein Kanal (Kanal 58 m, Fluss ab 72 m, Rhein 94 m).
  Brücken in regelmäßigem Abstand (Rhein rund 240 m), Schiffe auf dem Fluss.
  Brücken sind echte Brücken: dünnes Deck bündig mit der Straße, Widerlager und Pfeiler bis unter den Wasserspiegel,
  darunter läuft das Wasser sichtbar durch (Schattenkante), Geländer durchsichtig. Uferlinie über die ganze Länge stetig
  [Versatz Ufer an Brücken 0 m, Versatz Uferlinie ganze Länge 0 m].
- Das Stadtgebiet endet nie an einer nackten Wasserkante: an jedem Ufer eine Uferstraße mit Kaimauer, Gehweg und Baumreihe
  oder ein Kai mit Bauten an der Kante [nackte Wasserkante 0 m].
- Wasser nie als großer leerer Bildteil [Wasser nah höchstens 15 %]. Stadtwasser ruhig und dunkler (`#3c8a9b`), alle Module
  benutzen dieselbe Farbe.
- Der Nahausschnitt sieht nie über den Kartenrand [Außerhalb Karte 0 %]: rings um die Karte liegt der Stadtrandgürtel
  (`stadtrand.js`, 480 m: fortgesetztes Straßenraster, Vororte mit Reihen- und Einfamilienhäusern, Zeilen, Gewerbe,
  Sonderbauten, Kleingärten, Felder mit Höfen, außen Wald; Flüsse laufen mit Uferstraßen und Gegenufer weiter, Küsten mit
  150 m Hafen- und Vorortstreifen vor dem Meer). `plan.kameraGrenze` ist das Rechteck, in dem die Spielkamera ihren
  Mittelpunkt halten muss (Sicht der Nahkamera bis rund 420 m über die Kante, Gürtel 480 m).
- Querflüsse in der Randreihe haben an der Kartenkante eine Uferstraße; zwischen zwei Wasserflächen ohne Straße läuft das
  Wasser durch (kein Spalt, durch den der Hintergrund scheint). Kanäle (Ruhr) sind ein durchgehendes Band von 46 m.

## 5. Ruhe

- Straßenhierarchie einheitlich: alle Nebenstraßen gleich breit und gleich ausgestattet (ohne Baumreihen), Hauptachsen mit
  Mittelstreifen und Baumreihen, Fußgängerzone 18 m Nennbreite mit lockeren Baumreihen (Abstand 20 m). Fahrbahnmarkierung und
  durchgehende Gehwege überall.
- Gleichmäßige Traufhöhe je Block: das erste Haus setzt die Geschosszahl, 85 % der Nachbarn übernehmen sie genau, sonst
  höchstens ein Geschoss Unterschied; Eckhäuser dürfen ein Geschoss höher sein.
- Je Blockseite ein Bautyp mit derselben Dachform; Variation über Fassadenfarbe und Fensterachsen. Ruhr-Innenstadt je Block
  ein Dachregime: Flachdach mit Attika (60er, Viertel ruhr60 zu 75 %) oder Steildach (Altbau, Gründerzeitviertel zu 80 %).
- Gedämpfte, regional stimmige Palette. West: Grau, Beige, Taupe, Backstein, dunkle Schiefer- und Zinkdächer; Pastell und
  Ziegelrot selten (Ziegeldach-Gewicht × 0,3).

## 5a. FUNDUS – eigenständiger Marken-Off-Price

- FUNDUS ist ein Marken-Off-Price-Laden, kein Hartwig Outlet und kein Billig-Restpostenmarkt. Die Hausfarbe ist Weinrot (`#8c1d40`).
- Das mindestens 3,5 m hohe Fassadenband läuft über beide sichtbaren Seiten. Weißer FUNDUS-Schriftzug: Versalhöhe mindestens 2,4 m bei Boxen und 2,0 m in der Innenstadt. Darunter ein helles Claim-Band mit „Marken. Bis zu 60 % unter dem empfohlenen Preis.“
- Vorspringendes Eingangsportal, Retail-Park-Glasvordach über die ganze Front, Pylon mindestens 9 m hoch, volle Parkplätze und Warenpräsentation hinter dem Schaufenster.
- Drei Bauformen: eingeschossige Retail-Park-Box (6–7 m), zweigeschossiger Fachmarkt (10–11 m, Glasecke und Rolltreppe), Innenstadt-Geschäftshaus mit zwei bis drei Ladengeschossen und ein bis zwei Bürogeschossen (Raster-/Lochfassade), ohne Parkplatz.
- Länge, Tiefe, Dachaufbauten, Eingang, drei Paneelgrautöne und Parkplätze variieren deterministisch über `rng(seed)`.
- 14 Retail-Parks im Außenring, 6 Innenstadtlagen als eigene `slot:outlet`-Parzellen ohne Hartwig-/Volkskauf-Überschneidung. City-Grundfläche höchstens 80 % des größten Hartwig-Hauses; nicht im selben Block wie ein Billig-Offprice-Wettbewerber. Keine gleiche Bauform mit gleicher Fassadenvariante in Nachbarstädten.
- Alle 12 Zustände; für Aktion/Offprice kein Rabattplakat, sondern „Neue Ware jede Woche“. Zielbudget 900–1.800 Teile, Obergrenze 3.000; Fern-LOD prüfen.

## 6. Jedes Haus mit Sorgfalt

- Fensterraster, Gesimse, Ladenzone, Dachlandschaft mit Aufbauten an jedem sichtbaren Bau, auch an Hofbauten (Fensterband,
  Gesims, Oberlichter). Nichts Kistiges: keine Blöcke ohne Fassadengliederung, keine sichtbaren Seitenwände mit Fassade
  zwischen angebauten Häusern.

## 7. Schwesterkette (Volkskauf)

Die Schwesterkette ist eine bewusst ältere und schwächere Konzernkette und muss schon in der Stadtübersicht von Hartwig zu unterscheiden sein.

- Nur Nachkriegsbauten von 1955 bis 1979: Klinkerkasten, Sichtbeton-Raster oder Waschbeton-Fensterband, jeweils mindestens vier Fassadenvarianten. Keine Kaiserzeit, Kuppeln, Rotunden, Center-Kopfbauten oder postmoderne Glasfronten.
- Petrol `#2f6f73` als einziger Markenakzent für Schriftband, Türrahmen und Markisen. Keine roten Hartwig-Schriftzüge oder Fahnen.
- Maximal 80 Prozent der größten Hartwig-Grundfläche derselben Stadt; nicht im selben Block wie Hartwig. In Nachbarstädten keine identische Kombination aus Schwester-Familie und Fassadenvariante. Das prüft `pruef-schwester.js` für 112 Städte und `pruef-gestaltung.js` für die abgefragten Städte.
- Fassadenverschleiß über Geometrie: versetzte graue Attika-/Gesimsbänder, einzelne blinde Fensterfelder, alte Dachtechnik, matte, gut lesbare Kastenbuchstaben auf dem Petrolband über dem EG (Glyphenhöhe 1,2 bis 1,6 m). Gepflegter Altbau, keine verfallene Ruine als Standardzustand.
- EG breite Schaufenster und zwei schmale Türen, keine Drehtür und kein monumentales Portal. Vorplatz ohne Fahnen oder Kübel, höchstens zwei Fahrradständer und eine Bank. Fußgängerdichte rund 60 Prozent von Hartwig.
- Innenräume über `grundriss.js` mit `kette: 'schwester'`: einfache zentrale Treppe ohne Rolltreppenhalle oder Lichthof, weniger Abteilungen, Kassen auf den Verkaufsetagen, Rasterdeckenleuchten, gealterter Belag `#cfc6b4`, UG nur Lager und Anlieferung, kein Restaurant und keine Feinkost.
- Zustände der bestehenden `zustandsDekor()`-Mechanik, höchstens 8.000 Sammler-Teile je Schwesterhaus, Nah/Fern über `setzeLod()`, Zufall ausschließlich über `rng(seed)`.


## 8. Maßstab 220 Städte / gemischte Konzernstandorte (Entwicklungsstand 20.10.2026)

- Der Engine-Städtestamm bestimmt den Stadttyp; 108 neue Städte bekommen explizite Bildarchetypen, statt ein zufälliges Stadtbild zu erben.
- Metropolen mit vier oder mehr eigenen Innenstadtstandorten besitzen weitere Einkaufszentren mit eigener Fußgängerachse und Platz. `plan.nebenzentren` enthält ihre Koordinaten; das Hauptzentrum bleibt `plan.einkaufslagen[0]`.
- In Innenstadtblöcken nie zwei eigene Häuser. Hartwig-Warenhäuser haben mindestens zwei freie Blöcke zwischen sich (Raster-Manhattan-Distanz mindestens 3). Volkskauf steht nicht im selben oder unmittelbar gegenüberliegenden Block von Hartwig (Distanz mindestens 2).
- Premium und Hartwig A erhalten in der 1a-Zuordnung Vorrang; übrige Hartwig-Formate, Volkskauf, Sport und FUNDUS nutzen geeignete Neben-, Center- und Fachmarktlagen. Bei knappem Raum wird ein regelkonformer Ersatzblock gesucht; ein nicht platzierbares Haus ist ein expliziter Fehler.
- Für Nachbarbilder 28 km, für identische Konzernhaus-Signaturen 50 km. `pruef-kopien.js` untersucht Familie/Variante/Fassade je Konzernformat, `pruef-stadt-geografie.js` die vollständigen Stadtzuordnungen. Alle 560 Häuser werden erst nach dem deterministischen Engine-Export prüfbar.
- Solange Haus-Exporte und visuelle Abnahme nicht vollständig sind, gelten die neuen Regeln **nicht als nachgewiesen erfüllt**.

## Premium-Kronjuwelen (vier Einzelgebäude)

Das Premium-Haus wird im Stadtplan vor den normalen Hartwig-Häusern auf die beste 1a-Parzelle gesetzt. Es ist der prägnanteste Hochbau des betreffenden Blocks; seine direkten Nachbarn haben höchstens vier Geschosse. Berlin: Kalkstein und Rundturm, München: Arkaden und Kupferdach mit Terrasse, Hamburg: weiße Kolonnaden und grüne Kuppel, Düsseldorf: Natursteinraster und Bronzedach über dem Eingang. Messingakzent #b8955a, keine flächendeckende Hartwig-Rot-Fassade. Der Lichthof muss als Glasdach von oben erkennbar sein. Insolvenz-Investorenkennzeichnung ist zurückhaltend; keine Rabattplakate am Verkaufsprozess. Premium ist nicht das Premium-Format der Wettbewerber.

**Premium-Prüfung:** `cd render && node pruef-premium.js` kontrolliert 1a-Slots, Begrenzung angrenzender Traufen auf vier Geschosse und die Zuordnung der vier Häuser. Der bauliche Eindruck ist zusätzlich visuell anhand der drei Premium-Kataloge abzunehmen.


### Premium-Nachbesserung (20.10.2026)

Vier unterschiedliche Stadtsilhouetten: P001 Kolossalpilaster, Eckturm mindestens zwei Geschosse über Traufe und Wintergarten über die Längsachse; P002 Arkaden, doppelte Gaubenreihe und steiles patiniertes Kupferdach mit ausgesparter Terrasse; P003 Kolonnade und Kuppel mindestens acht Meter über Traufe, Brunnenplatz; P004 Naturstein-Lisenen und Attikageschoss. Jeweils 4.000–9.000 Teile mit ausmodellierten Fensterlaibungen, Gesimsen, Balustern und Steinrelief. Alle Häuser haben fünf dunkelgrüne Fahnen, Messing-Schriftzug, inszenierte Auslagen, eine Wagenvorfahrt und einen glasgedeckten Lichthof. Umbau: Bauzaun, Planengerüst und Kran bei laufendem Betrieb; Verkauf: exklusiver Investorenaushang, eingeholte Fahnen, halbierter Passantenstrom und keine Rabattwerbung; danach Käufername und geänderte Fahnenfarbe. Abnahme ausschließlich nach erfolgreichem Rendering und Sichtprüfung.

# Workstream Ladenbau: Möbelbibliothek, Ladenbau-Regeln und Planer für Sport, Outlet und Schwesterkette

Großer Arbeitsblock über mehrere Stunden und mehrere Chats. Branch `feat/ladenbau`, je Phase ein eigener Pull Request gegen `main` (Branch `feat/ladenbau-p<N>` von `feat/ladenbau` abzweigen oder direkt aus `main` nach Merge der Vorphase).

**Jeder neue Chat beginnt so:**
1. `auftraege/README.md`, diese Datei und `auftraege/ladenbau-stand.md` vollständig lesen.
2. Die offene Phase aus `ladenbau-stand.md` übernehmen.
3. Am Ende des Chats `ladenbau-stand.md` fortschreiben: was erledigt ist, was offen ist, letzte Bilder, Messwerte, nächster Schritt. Nie einen Chat beenden, ohne diese Datei zu aktualisieren.

## Warum
Die Innenräume der Sporthäuser wirken zerklüftet (Bild: `bilder/katalog-sport-etagen.png` auf `feat/grafik-sport`, z. B. Essen EG, S017):
- Viele kleine Inseln ohne Ordnung, keine durchgehenden Gänge.
- Je Abteilung ein eigener Bodenbelag (Kunstrasen, Holz, Dunkelgrau, Hellgrau, Orange): bis zu sechs Böden auf einer Etage.
- Deko-Elemente (Felsen, Bäume, Zelte) überall verstreut, Möbel in allen Drehungen.
- Wandabwicklung unterbrochen.

Die Warenhaus-Etagen (`bilder/katalog-etagen.png`, Hartwig Köln Arkaden UG und EG) sind der Maßstab: Hauptgang hell und durchgehend, Wandregale als geschlossenes Band, Abteilungen als ruhige Rechtecke, Gondeln in Reihen, wenige Inszenierungen an Gangkreuzungen. Das Outlet hat noch gar keinen Innenraum, die Schwesterkette einen einfachen.

Vorgehen: erst einen großen, sauberen Möbelbestand bauen und katalogisieren, dann Regeln, dann einen gemeinsamen Planer, dann die Formate darauf umstellen. So wie die Gebäude: erst Baukasten, dann Stadt.

## Ausgangsmaterial im Code
- `render/src/kit/innen.js`: 5-m-Raster (`RASTER`), `lokal()`-Rahmen (lokal +z = Vorderseite), vorhandene Möbel (u. a. `staender`, `rundstaender`, `warenTisch`, `puppe`, `puppenPodest`, `wandRegal`, `vitrine`, `gondel`, `schuhwand`, `rucksackwand`, `radwand`, `skiwand`, `trikotwand`, `ballkorb`, `tor`, `wuehltisch`, `gitterbox`, `kartons`, `laufband`, `hantelbank`), `zelle()`, `raumKachel()`, `rueckwand`, `stuetze`, `rolltreppe`, `boden(S, x, z, w, d, y, typ)`.
- `render/src/kit/sportabteilung.js`: Sportmöbel (Schuhwand-Bühne, Kartonwand, Laufanalyse, Anprobeinsel, Textil-, Falt-, Trikot-, Jacken-, Rucksack-, Schlafsack-, Wanderschuhwand, Zelt-, Kanu-, Fels-Inszenierungen, Rad-, Helm-, Zubehörwand, E-Bike-Podest, Radwerkstatt, Ski-, Board-, Skijackenwand, Skischuh-Anprobe, Skiservice, Ball-, Stollenwand, Torinsel, Beflockung, `regalSchwer`, `einkaufswagen`).
- `render/src/kit/sportgrundriss.js`: Raster und Zonen der Sporthäuser (`sportRaster`, `sportZonen`, Stile je Außenfamilie in `STIL`).
- `render/src/kit/grundriss.js` und `abteilung.js`: Warenhaus-Etagen (Maßstab).
- Kataloge: `render/src/kataloge/innen.js`, `etagen.js`, `sport-etagen.js`, `sport-abteilungen.js`.
- Regeln: `render/KIT.md`, `render/GESTALTUNG.md`. Referenzbilder Coffee Inc: `render/ref/appstore.png` (aufgeschnittenes Café, HQ-Büro).

## Phase 1: Möbelbibliothek (1 bis 2 Chats)
Ziel: ein einheitlicher, katalogisierter Möbelbestand mit gleichem Aufruf, gleichen Maßen und Budgets.

1. Neuer Ordner `render/src/kit/moebel/` mit `index.js` und je Bereich einer Datei: `basis.js` (Hilfen), `wand.js`, `gondel.js`, `insel.js`, `kasse.js`, `deko.js`, `sport.js`, `outlet.js`, `service.js`.
2. **Einheitliche Schnittstelle** je Möbel: `export const NAME = { id, titel, bereich, rasterB, rasterT, hoehe, typ: 'wand' | 'gondel' | 'insel' | 'kasse' | 'deko' | 'service', budget, bau(L, r, d, ctx) }`.
   - Maße im Grundraster 1,25 m (ein Viertel der 5-m-Zelle): `rasterB` × `rasterT` in Vierteln.
   - Wandmöbel immer 0,6 m tief und in Breiten 2,5 / 5 / 10 m kombinierbar, nahtlos aneinanderreihbar (gleiche Sockelhöhe 0,12 m, gleiche Oberkante 2,4 m, darüber 0,6 m Schild- oder Bildband).
   - Gondeln 1,25 m tief, Längen 2,5 / 3,75 / 5 m, Höhe 1,4 m (Sichtachse frei), Kopfenden mit Aktionsfläche.
   - Inseln 2,5 × 2,5 oder 5 × 2,5 m, höchstens 1,5 m hoch.
3. **Bestand aufbauen**, vorhandene Funktionen übernehmen und vereinheitlichen, fehlende neu bauen. Mindestens:
   - Sport (≥ 60 Stück): Schuhwand in 3 Varianten (Marken, Laufschuh, Kinder), Kartonwand, Textilwand (Hängung, Falt, Mix), Trikotwand, Jackenwand, Outdoorschuhwand, Rucksackwand, Schlafsack-, Isomatten-, Zeltzubehörwand, Radwand, Helmwand, Zubehörwand, Skiwand, Boardwand, Skijackenwand, Ballwand, Stollenwand, Fitnesszubehörwand; Gondeln für Schuhe, Textil gefaltet, Bälle, Trinkflaschen und Riegel, Socken und Zubehör, Fitnesskleingeräte; Inseln: Neuheitenpodest, Puppengruppe (3 Haltungen, 4 Sportarten), Laufanalyse (Laufband, Bildschirm, Bank), Fitness (2 bis 3 Geräte, Spiegel, Matte), Zelt aufgebaut, Kanu auf Ständer, E-Bike-Podest, Radreihe, Skischuh-Anprobe, Torinsel, Beflockung; Service: Radwerkstatt, Skiservice, Kassentresen klein und groß, Info, Umkleide (2 und 4 Kabinen), Sitzbank Anprobe; Deko: Kletterwand-Segment, Bildwand mit Motiv, Pflanzkübel, Saisonbanner.
   - Outlet (≥ 40 Stück): Wühltisch (3 Größen), Gitterbox, Palette mit Kartons, Palettenregal (2 und 3 Ebenen), Kleiderstange lang (5 m, einfach und doppelt), Rundständer Restposten, Schuhkarton-Regal, Schütte, Aktionsaufsteller, Deckenhänger mit Prozent, Kassenzeile (2, 4, 6 Kassen), Einkaufswagen-Station, Korbstapel, Sicherheitsschranke Eingang, Umkleide einfach, Lager-Hochregal, Rolltor, Hubwagen, Restposten nach Herkunft (Warenhaus-Mode, Sport, Wohnen, Spielwaren als Ware auf denselben Trägern).
   - Allgemein (≥ 20 Stück, für Schwesterkette und Warenhaus mitnutzbar): Wandregal Kaufhaus alt (Holz, dunkler), Kassentisch alt, Vitrine alt, Treppe zentral offen, Rasterleuchten-Decke (nur als Deckenband am Schnitt), Stütze mit Spiegel, Fahrstuhl alt.
4. **Deterministisch** über `rng(seed)`; Farben der Ware über Paletten je Sportart bzw. Herkunft; Schrift nur über `basis.js`.
5. **Budget** je Möbel im Objekt festgehalten und geprüft (`S.anzahl` vor und nach dem Bau): Wand 5 m höchstens 220 Teile, Gondel höchstens 120, Insel höchstens 260, Deko höchstens 80. Fernstufe (`setzeLod('fern')`) baut nur Korpus und Farbe.
6. **Kataloge:**
   - `render/src/kataloge/moebel-sport.js`, `moebel-outlet.js` und `moebel-allgemein.js`: jede Kachel ein Möbel auf einer 5 × 5-m-Bodenplatte mit Name, Raster, Teilen.
   - `moebel-reihen.js`: Wandmöbel nebeneinander als 20-m-Band (nahtloser Anschluss), Gondeln als Reihe, damit Anschlüsse geprüft werden.
7. **Prüfskript** `render/pruef-moebel.js`:
   - Budget je Möbel,
   - Bounding Box liegt innerhalb `rasterB` × `rasterT`,
   - Höhe ≤ angegebene Höhe,
   - deterministisch (zwei Bauten, gleiche Teilezahl),
   - kein Möbel ragt in −z (Rückseite) über 0,05 m hinaus.
   Ergebnis 0 Fehler.
8. Abnahme Phase 1: Kataloge gerendert und angesehen (mindestens drei Runden), PNGs in `bilder/`, `pruef-moebel` 0 Fehler, alte Aufrufer laufen unverändert (die alten Funktionen in `innen.js`/`sportabteilung.js` dürfen bleiben oder auf die Bibliothek weiterleiten).

## Phase 2: Ladenbau-Regeln (1 Chat)
Neue Datei `render/LADENBAU.md`, verbindlich wie `GESTALTUNG.md`, mit messbaren Grenzwerten:
1. **Gänge:**
   - Ein Hauptgang 3 m breit vom Eingang durch die Etage (Rundlauf oder T), heller, einheitlicher Belag.
   - Nebengänge 1,8 m, rechtwinklig. Jede Abteilung grenzt an einen Gang.
   - Vom Eingang erreicht man jede Abteilung, jede Kasse und jede Treppe über freie Wege (geprüft per Rastersuche auf 0,625-m-Raster).
2. **Wand:**
   - Die Rückwände (−x, −z) sind zu mindestens 85 % mit Wandmöbeln belegt, als geschlossenes Band. Unterbrechungen nur für Treppenhaus, Lager, Umkleide, Service.
   - Schild- und Bildband über den Wandmöbeln durchgehend.
3. **Fläche:**
   - Abteilungen sind Rechtecke im 1,25-m-Raster.
   - Gondeln stehen in Reihen parallel zu einer Achse, Abstand 1,8 m.
   - Inseln nur am Kopf von Gondelreihen oder an Gangkreuzungen, höchstens eine Inszenierung (Zelt, Kanu, Fitness, Laufanalyse, E-Bike) je Abteilung.
   - Keine Drehungen außer 0°, 90°, 180°, 270°.
4. **Böden:**
   - Höchstens drei Bodenbeläge je Etage: Gang, Fläche, ein Akzent.
   - Akzentboden nur unter einer Inszenierung, höchstens 10 % der Fläche.
   - Kein Kunstrasen außer unter der Torinsel.
5. **Deko:** Felsen, Bäume und Pflanzen höchstens 2 % der Fläche, nur in Inszenierungen bzw. am Eingang.
6. **Kasse:** Kassen am Ausgang bzw. im Rücken des Hauptgangs, Warteraum davor frei (2 m).
7. **Dichte:** Möbelfläche 35 bis 50 % der Verkaufsfläche, größte Leerfläche höchstens 6 m (wie heute gemessen).
8. **Format-Profile:**
   - Hartwig Sport: hell, modern, Markenwände, eine Inszenierung je Abteilung, Schild-Farbe je Sportart nur im Schildband.
   - Outlet: Halle, Palettenregale an der Wand, Wühltisch- und Stangenreihen, Kassenzeile, keine Inszenierung, ein Boden plus Gangmarkierung.
   - Schwesterkette: Kaufhaus alt, Holzregale dunkler, Treppe zentral, keine Rolltreppe, Rasterleuchten.

Grenzwerte als Konstanten in `render/src/kit/ladenbau-regeln.js`, damit Planer und Prüfung dieselben Zahlen nutzen.

## Phase 3: Planer und Prüfung (2 bis 3 Chats)
1. Neues Modul `render/src/kit/ladenplan.js`:
   - `ladenplan(flaeche, profil, abteilungen, seed)` liefert einen Plan: Gänge, Abteilungsrechtecke, Wandbelegung, Gondelreihen, Inseln, Kasse, Böden, jeweils als Daten mit Möbel-Ids aus der Bibliothek, noch ohne Geometrie.
   - `baueLadenplan(S, scene, plan, o)` baut den Plan aus der Bibliothek.
   - Eingaben: Außenmaße und Eingänge aus dem Gebäude, Hindernisse (Stützen, Treppen, Rolltreppen, Aufzug, Lager), Abteilungen mit Fläche in qm aus `haus.flaechen` (bzw. Pool-Daten beim Outlet), Profil aus Phase 2.
   - Reihenfolge im Planer: Hindernisse → Hauptgang ab Eingang → Kasse → Wandband → Abteilungen als Rechtecke entlang des Gangs (Größe nach qm, Rest an die größte) → Nebengänge → Gondelreihen → Inseln am Kopf bzw. an Kreuzungen → Böden → Schilder.
2. **Prüfskript** `render/pruef-ladenbau.js` mit allen Grenzwerten aus Phase 2:
   - Wegesuche,
   - Wandbelegung,
   - Zahl der Böden,
   - Drehwinkel,
   - Inseln je Abteilung,
   - Dekoanteil,
   - Dichte,
   - größte Leerfläche,
   - Teile je Etage.
   Läuft über alle 50 Sporthäuser, alle Etagen, später Outlet und Schwester. Ausgabe als Tabelle je Haus, Ziel 0 Verstöße.
3. **Diagnosebild:** Katalog `ladenplan-diagnose.js` zeigt den Plan von oben in Flächenfarben (Gang, Abteilung, Wand, Insel, Kasse) neben der 3D-Ansicht. So sieht man Zerklüftung sofort.

## Phase 4: Sport umstellen (2 Chats)
1. `sportgrundriss.js` nutzt `ladenplan` mit Profil Sport. Familienstile aus `STIL` bleiben für Wände, Stützen und Gangbelag. Die Familien-Eigenheiten bleiben als feste Hindernisse oder Inszenierung erhalten:
   - Kletterwand (Familie 1),
   - Regalgassen der Fachmarkt-Box (Familie 3, dort Profil-Variante „Halle“),
   - Mall-Front (Familie 4),
   - Portalfenster-Inszenierung (Familie 5),
   - Rundbühne (Familie 6).
2. Die Abverkaufs- und Erlebnislogik aus `feat/grafik-sport` bleibt erhalten, gebaut aus Bibliotheksmöbeln:
   - Abverkauf oben: Wühltische, Gitterboxen,
   - Laufanalyse bzw. Fitness als die eine Inszenierung der Abteilung.
3. Kataloge `sport-etagen`, `sport-abteilungen`, `sport-feeling`, `sport-feeling-nah` neu rendern und neben den alten Stand legen (Vorher/Nachher-Katalog `sport-etagen-vergleich.js`).
4. Abnahme: `pruef-ladenbau` 0 Verstöße über alle Sporthäuser, Teile je Etage nicht höher als vorher, `spiel-render.js` 0 Abweichungen, Sichtprüfung: ruhige Fläche, klare Gänge, Wandband geschlossen.

## Phase 5: Outlet innen (1 bis 2 Chats)
1. Innenraum des Outlets mit `ladenplan` und Profil Outlet für alle drei Bauformen aus `grafik-outlet.md` (Industriehalle, umgebauter Supermarkt, Fachmarkt-Box mit Lagerannex).
2. Ware nach Herkunft (Warenhaus, Sport, Wohnen) in Zonen. Ist die Engine mit Formaten fertig (`engine-formate.md`), Zonen nach Pool-Inhalt, sonst nach festem Schlüssel.
3. Zustände innen:
   - normal (gefüllt),
   - leer gelaufen (Regale halb leer, Gitterboxen leer),
   - überfüllt (Paletten im Gang am Rand, Kartons gestapelt),
   - Räumung.
4. Katalog `outlet-innen.js` (ersetzt den gleichnamigen Katalog aus `grafik-outlet.md`, falls schon vorhanden) und `outlet-innen-zustaende.js`. `pruef-ladenbau` 0 Verstöße.

## Phase 6: Schwesterkette innen (1 Chat)
1. `grundriss.js` mit `kette: 'schwester'` auf `ladenplan` mit Profil Schwester umstellen. Das löst auch die doppelten Abteilungen je Etage (Nachbesserungsauftrag), weil der Planer jede Abteilung genau einmal als Rechteck setzt.
2. Katalog `schwester-etagen.js` neu, `pruef-ladenbau` 0 Verstöße.

## Phase 7: Warenhaus angleichen (optional, nur wenn Zeit bleibt, 1 bis 2 Chats)
`pruef-ladenbau` über alle 130 Warenhäuser laufen lassen und die Verstöße als Liste festhalten. Hartwig-Etagen nur dort anfassen, wo die Prüfung grobe Verstöße zeigt (Wegesuche, Böden). Das Warenhaus ist Maßstab und wird nicht auf den Planer umgebaut, solange es die Regeln erfüllt.

## Abschluss
- `README.md` (Abschnitt Stand), `render/KIT.md` (Möbelbibliothek, Planer, Prüfskripte) und `render/LADENBAU.md` fortschreiben.
- Alle Kataloge nach `bilder/`, alte Stände überschreiben.
- CI: `pruef-moebel` und `pruef-ladenbau` (Sport) in den Grafik-Workflow aufnehmen.

## Grenzen
- `basis.js` nicht ändern. Keine echten Marken (Sportmarken-Namen aus `sportabteilung.js`/`innen.js MARKEN` sind fiktiv und bleiben).
- Kein Merge einer Phase ohne grüne CI und angesehene Bilder.
- Phase 4 ändert nichts an Außenbauten und Stadtplänen; `pruef-staedte` und Gestaltungsprüfung müssen unverändert 0 bleiben.

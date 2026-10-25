# Illustrationen (E47 P4, verbindlich)

Ziel: Jede Stelle, an der Coffee Inc 2 ein isometrisches Bild zeigt (Reiterleiste, Menü, Kanalkarten, Kopfbilder), bekommt ein eigenes Hartwig-Motiv in einem Stil. Ummo 24.10.2026: Die Bildsprache des Probesatzes passt „ein bisschen“, an den Motiven „ordentlich Feinschliff“. Maßstab ist `szenen/massstab.py` (Motiv `kanal-tv`) neben Coffee 05 (`testflight/vorlage-coffee/05.png`).

## Werkzeug
- `render.py`: Blender (Python-Modul `bpy` 5.2, headless). Feste Kamera: orthografisch, 30° Neigung, Blick aus +x/−y (Vorderseite eines Objekts = −y, erscheint links unten). Stil `illustriert`: jede Fläche hat einen festen Ton aus ihrer Richtung (oben hell, links mittel, rechts dunkel), keine Glanzlichter, Fasen an allen Kanten als Lichtkante.
- `szenen/werkzeug.py`: Palette und Bausteine `q()` (Quader), `zyl()` (Zylinder), `bild()` (Bildfläche mit PNG aus `flaechen/`), `lautsprecher()`. Modelle aus den CC0-Paketen von Kenney (`./holen.sh` lädt sie nach `.assets/`), umfärbbar über `'farben': {'Materialname' | '*': '#hex'}`.
- `bauen.py [motiv …]`: rendert und schreibt alle Motive nach `render/src/ui/illustrationen-daten.js` (WebP). `blatt.py <datei.png> [motiv …]`: Kontaktbogen zum Ansehen.
- Eine Datei je Gruppe in `szenen/` mit einem dict `S`; Motivnamen sind global eindeutig.

## Regeln für jedes Motiv
1. **Gegenstand, nicht Symbol.** Ein erkennbares Ding aus dem Warenhausalltag (Kasse, Kleiderständer, Orderbuch), keine abstrakten Klötzchen, keine Pfeile, keine Emoji-Ideen.
2. **Detail wie Coffee:** 15 bis 60 Teile, echte Proportionen, kleine Einzelheiten (Knöpfe, Etiketten, Griffe, Kabel, Schrauben). Ein Motiv aus zwei Quadern ist kein Motiv.
3. **Lesbar bei 34 px** (Reiter) bzw. 240 px (Karte): klare Silhouette, ein Hauptgegenstand, höchstens zwei Nebendinge. Mit `blatt.py` in Zielgröße prüfen.
4. **Palette aus `werkzeug.py`.** Hartwig-Rot nur als Markenakzent (Logo, Band, Etikett), nicht als Fläche überall. Kein Coffee-Grün, kein Coffee-Orange.
5. **Texte auf Bildflächen** nur Deutsch, in Figtree (`../src/ui/schrift/figtree.ttf`), kurz („Sale −30 %“, „hartwig.de“). Keine echten Firmennamen außer Hartwig, Volkskauf, FUNDUS.
6. **Gleiches Licht, gleiche Kamera** für alle; Kamera und Licht nicht je Motiv ändern.
7. **Abnahme:** Kontaktbogen neben den passenden Coffee-Ausschnitten (`render/ui-referenz/coffee/*.png`, Vorlagen 01–32) ansehen, mindestens drei Runden je Motiv, Mängel selbst beheben.

## Motive (Name → Gegenstand)
### Gruppe A: Haus und Betrieb (`szenen/haus.py`)
`haus` Warenhausfassade mit rotem Band und H-Logo · `etagen` Schnitt durch drei Verkaufsebenen mit Rolltreppe · `leitung` Schreibtisch der Filialleitung mit Namensschild, Laptop, Stuhl · `sortiment` Kleiderständer mit Bügelware · `ware` Kartons auf Palette mit Hubwagen · `kosten` Kassentisch mit Kasse, Kartenterminal, Bon · `flaeche` Shop-in-Shop-Modul mit Markenschild (Konzession) · `notizen` Klemmbrett mit Liste und Stift · `post` Posteingangskorb mit Umschlägen und Siegel · `umbau` Gerüst mit Farbeimer und Leiter · `hausbesuch` Eingangstür mit Drehtür · `ebenen` gestapelte Kartenebenen · `liste` Aktenordner im Regal · `deutschland` Deutschlandkarte als Tischmodell mit Stecknadeln · `bahn` ICE-Triebkopf · `wettbewerber` fremdes Kaufhaus (blau, ohne echten Namen) · `ziel` Zielscheibe mit Dartpfeil · `personal` drei Mitarbeitende (Figuren folgen, vorerst Namensschilder an einer Garderobe)
### Gruppe B: Zentrale und Steuerung (`szenen/zentrale.py`)
`zentrale` Bürohochhaus mit Hartwig-Schild · `vorstand` Konferenztisch mit Stühlen und Wasserflaschen · `organisation` Pinnwand mit Organigramm-Karten · `reporting` Ordner und Monitor mit Balkendiagramm · `finanzen` Geldzählmaschine mit Banknoten · `planung` Planungstafel mit Magnetkarten · `forecast` Flipchart mit Linie · `boni` Geschenkbox mit Schleife und Umschlag · `freigaben` Stempel auf Bestellschein · `saison` Kollektionstafel mit Stoffmustern · `allokation` Lieferwagen mit Hartwig-Aufschrift · `reduzierung` Preisschild mit rotem −30 % · `marken` Kleidersack mit Markenetikett · `produkte` Bügel mit Hemd und Schnittmuster · `neu` Zeichentisch mit Skizze und Stoffrollen · `systeme` Serverschrank · `projekte` Kanbantafel · `it` Kassen-PC mit Scanner
### Gruppe C: Marketing, Online und Menü (`szenen/markt.py`)
Kanalkarten (Größe `karte`): `kanal-prospekt` Prospektstapel · `kanal-anzeigen` aufgeschlagene Zeitung mit Anzeige · `kanal-plakat` Plakatwand auf Stelze · `kanal-radio` Studiomikrofon mit Radio · `kanal-online` Laptop mit Shop auf dem Schirm · `kanal-social` Smartphone im Ständer mit Ringlicht · `kanal-schaufenster` Schaufenster mit Puppe · `kanal-crm` Briefkasten mit Mailing und Handy
Reiter und Menü (Größe `symbol`): `marketing` Werbetafel · `staedte` Stadtkulisse · `kundenkarte` rote Hartwig-Karte mit Lesegerät · `crm` Briefstapel mit Mailing · `kalender` Wandkalender mit Markierungen · `online` Paket mit Laptop · `zeitung` Zeitung „Der Handelsbote“ · `chronik` aufgeschlagenes Buch · `pokal` Pokal · `podest` Siegertreppchen · `speichern` Aktenschrank mit Schublade · `spielstaende` Aktenregal · `einstellungen` Zahnräder auf Grundplatte · `klang` Lautsprecherbox · `einfuehrung` Infotafel mit Fragezeichen · `messung` Stoppuhr · `ruhestand` Liegestuhl · `werkzeuge` Werkzeugkiste · `menue` Ablagefach

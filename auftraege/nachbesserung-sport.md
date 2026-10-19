# Nachbesserung Grafik: Hartwig Sport

Branch: `feat/grafik-sport` (weiterarbeiten, kein neuer Branch). Grundlage bleibt `auftraege/grafik-sport.md`.
Technik ist abgenommen (CI grün). Offen ist die Sichtbarkeit: Die drei neuen Zustände unterscheiden sich im Katalog kaum, im Spielzoom gar nicht.

## 1. Abverkauf oben sichtbar machen
- Heute: winzige rote Schilder im obersten OG. Ziel: Das Geschoss liest sich auf einen Blick als Abverkauf.
- Außen: großes Rabattbanner (`plakat()`, Prozentwert aus der Brücke) über die Fassadenbreite des obersten OG auf der Hauptseite, zusätzlich rote Klebefolie bzw. Rabattstreifen auf mindestens der Hälfte der Glasfelder dieses Geschosses.
- Innen hinter dem Glas: Wühltische, Gitterkörbe, Schuhkartonstapel, gelbe oder rote Preisschilder. Keine inszenierten Puppen mehr in diesem Geschoss.
- EG bleibt Normalbetrieb.
- Teilezahl im Abverkauf darf nicht unter die Normalvariante fallen (heute 839 auf 520 bei S003). Es kommt Inhalt dazu, nicht weg.

## 2. Substanz 25 eigenständig
- Heute identisch mit „Abverkauf oben“. Substanz und Abverkauf sind zwei getrennte Signale und müssen einzeln wie kombiniert erkennbar sein.
- Bei Substanz unter 40: zwei bis vier blinde bzw. milchige Glasfelder (deutlich andere Farbe als `GLAS`), Leuchtband am Schriftzug aus (dunkel), ein ausgeblichenes oder schief hängendes Banner, Fugen bzw. Schmutzkante an der Attika. Kein Verfall.
- Katalog `sport-feeling` bekommt eine vierte Spalte „Abverkauf + Substanz 25“.

## 3. Erlebnisfläche erkennbar
- Laufanalyse: Laufband, Bildschirmwand, Bank und eine laufende Figur direkt hinter einem Glasfeld des EG oder 1. OG an der Hauptseite, mit eigenem hellem Bodenfeld und kleinem Schild „Laufanalyse“. Im Katalog muss man ohne Beschriftung erkennen, was es ist.
- Fitness: zwei bis drei Geräte, Spiegelwand, Matten, Schild „Fitness“, ebenso hinter Glas an der Hauptseite.
- Bei Familien ohne große Glasfront (F2, F4, F6) Erlebnisfläche über ein großes Fensterfeld oder einen Glasvorbau sichtbar machen statt sie wegzulassen.

## 4. Weniger Betrieb
- Passantendichte ist im Abverkauf heute höher als in der Erlebnisvariante. Regel: Normalbetrieb 70 % der früheren Dichte, Abverkauf 80 % (Schnäppchenjäger), Substanz unter 40 nur 50 %.
- Kundschaft jung und sportlich gekleidet, keine Schlangen.

## Abnahme
1. Kataloge `sport-feeling`, `sporthaeuser`, `sport-etagen`, `sport-zustaende` neu rendern.
2. Zusätzlich eine Nahansicht `sport-feeling-nah.js` im echten Spielzoom (Kamera aus `stadtrand.js nahMitte`), je ein Haus normal, Abverkauf, Substanz 25. Hier entscheidet sich, ob es sichtbar ist.
3. Jedes Bild ansehen, mindestens drei Runden Nachbessern.
4. Prüfungen: `node pruef-staedte.js` 0 Fehler, `node pruef-gestaltung.js` mit allen 112 Städten 0 Verstöße, `node spiel-render.js` 0 Abweichungen, höchstens 8.000 Teile je Haus.
5. Erfolgskriterium: In der Nahansicht unterscheidet man die vier Zustände (normal, Abverkauf, Substanz 25, beides) ohne Bildunterschrift, und Laufanalyse bzw. Fitness sind als solche erkennbar.
6. Bilder nach `bilder/` (überschreiben).

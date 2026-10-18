# Auftrag Grafik: Hartwig Sport nachschärfen

## Einordnung
Repo `toenismeier/Ruhrkauf`, Grafik-Baukasten in `render/`. Vor dem Start vollständig lesen: `render/KIT.md`, `render/GESTALTUNG.md`, `render/src/kit/basis.js`, `render/src/kit/sporthaus.js`, `render/src/kit/sporthelfer.js`, `render/src/kit/sportgrundriss.js`, `render/src/kit/sportabteilung.js`, `render/src/kit/zustaende.js`, `render/src/kit/bruecke.js`. Bestehender Stand: `bilder/katalog-sporthaeuser.png`, `bilder/katalog-sport-etagen.png`, `bilder/katalog-sport-zustaende.png`.

Hartwig Sport ist fertig (6 Familien, 50 Häuser). Kein Neubau. Dieser Auftrag schärft das Feeling nach: modern, hell, sportlich, aber es kommen weniger Leute als früher. Das Haus wirkt lebendig gebaut und halb leer im Betrieb.

## Was sich ändert
1. **A-Häuser mit Erlebnisfläche:** Häuser mit `lage === '1a'` und Grundfläche ab 2.000 m² zeigen hinter der Glasfront eine Laufanalyse-Station (Laufband, Bildschirm, Bank) oder eine kleine Fitnessfläche. Sichtbar von außen durch die Glasfront an +x oder +z. Je Haus nur eins von beiden, Wahl über `rng(seed)`.
2. **Oberstes OG als Abverkaufsfläche:** Läuft das Haus schlecht (Zustand aus der Brücke: Aktion mit Rabatt oder substanz unter 40), wird das oberste Obergeschoss zur Abverkaufsfläche: rote Rabattplakate nur in diesem Geschoss, innen Wühltische statt Inszenierung. EG bleibt Normalbetrieb.
3. **Weniger Belebung:** Passantendichte vor Sporthäusern auf etwa 70 % des bisherigen Werts. Kundschaft jünger (Figuren mit Sportkleidung über `mensch()`/`figur()`), keine Schlangen an der Kasse.
4. **Kleine Abnutzung:** Bei substanz unter 40 ein bis zwei blinde Glasfelder und ein abgeschaltetes Leuchtband am Schriftzug. Kein Verfall, das Haus bleibt das modernste im Konzern.
5. **Innen (`sportgrundriss.js`, `sportabteilung.js`):** die Laufanalyse bzw. Fitnessfläche auch im Etagenschnitt. Im Abverkaufsgeschoss Wühltische, Gitterkörbe, Paletten mit Schuhkartons.

## Technik
- Nur bestehende Dateien erweitern: `sporthaus.js`, `sportgrundriss.js`, `sportabteilung.js`, bei Bedarf `zustaende.js`. Keine neue Familie, keine neuen Häuser, keine Änderung an `haeuser.json`.
- Die Abverkaufslogik liest nur, was `zustandAusHaus()` in `bruecke.js` schon liefert (`aktion`, `rabatt`, `status`) plus `haus.substanz`. Die Engine wird nicht angefasst.
- Budget unverändert: höchstens 8.000 Teile je Haus, Fernstufe mit `setzeLod('fern')` prüfen.
- `basis.js` nicht ändern. Zufall nur über `rng(seed)`. Alle Texte deutsch mit echten Umlauten.

## Kataloge und Prüfung
1. Kataloge `sporthaeuser`, `sport-etagen`, `sport-zustaende` neu rendern.
2. Neuer Katalog `render/src/kataloge/sport-feeling.js`: je Familie ein A-Haus mit Erlebnisfläche, ein Haus im Abverkauf, ein Haus mit substanz unter 40.
3. Jedes Bild ansehen und mit dem alten Stand in `bilder/` vergleichen. Mindestens drei Runden Nachbessern.
4. Abnahme:
   - `node pruef-staedte.js` 0 Fehler,
   - `node pruef-gestaltung.js` 0 Verstöße in allen 112 Städten,
   - `node spiel-render.js` 0 Abweichungen zwischen Anzeige und Engine,
   - Teilebudget eingehalten,
   - Erlebnisfläche und Abverkaufsgeschoss im Spielzoom erkennbar.
5. Fertige PNGs nach `bilder/` kopieren (alte Dateien überschreiben, sonst nichts löschen).

## Grenzen
- Arbeit auf Branch `feat/grafik-sport`, CI muss grün sein.
- Berührt keine Dateien der Aufträge Schwesterkette und Outlet außer `zustaende.js`. Läuft er parallel zu einem davon, `zustaende.js` nur additiv ändern.

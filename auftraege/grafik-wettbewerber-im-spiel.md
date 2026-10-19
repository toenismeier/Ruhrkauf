# Auftrag: Wettbewerber im Spiel sichtbar machen

Branch `feat/grafik-wettbewerber-spiel`. Erst nach Merge von `feat/engine-wettbewerber` starten. Datengrundlage: `wettbewerbFuerGrafik(s, stadt)` aus der Engine und `render/wettbewerb-beispiel.json`.

## Ausgangslage
- Wettbewerber werden heute rein grafisch in `render/src/kit/staedte.js` je Stadt gewürfelt und über `slot:wettbewerber` gebaut (`bauer.js wettbewerberEcht` → `wettbewerber.js wettbewerber(S, scene, { x, z, w, d, seed, art, name, form, region })`). Arten und Bauformen sind fertig (`bilder/katalog-wettbewerber.png`).
- `bruecke.js stadtEintragAusSpiel` übernimmt die Hartwig-Häuser aus dem Spielstand, die Wettbewerber aber noch aus `staedte.js` (Zeile mit `q.rolle === 'wettbewerber'`).
- `bruecke.js spielBauer` baut nur Hartwig-Häuser einzeln neu (`o.getrennt`, `neuBauen`, `aktualisiere`). Wettbewerber sind Teil des statischen Stadtbaus.
- Marker: `spiel.js` Zeile mit `const pins = { … wettbewerber: 'wettbewerber' … }`.

## Ziel
Der Spieler sieht, was die Konkurrenz tut: Eröffnungen, Räumungen, Leerstand, Nachnutzung ehemaliger Hartwig-Häuser, Preisaktionen. Alles aus dem Spielstand, Woche für Woche.

## Umsetzung
1. **Quelle umstellen:** `stadtEintragAusSpiel` nimmt die Wettbewerber aus `wettbewerbFuerGrafik(s, name)` statt aus `staedte.js`. Ohne Spielstand (Kataloge, Prüfskripte) bleibt `staedte.js` die Quelle. Der Stadtplan muss stabil bleiben: Slots für Wettbewerber werden einmal je Stadt aus dem Startbestand vergeben (gleiche Parzellen wie heute). Spätere Eröffnungen nutzen
   - einen freien Wettbewerber-Ersatzslot, den `stadtplan.js` je Stadt zusätzlich vorhält (ein bis zwei Slots `slot:wettbewerber_reserve`, bis zur Belegung als normales Stadthaus gebaut),
   - oder bei Nachnutzung (`inHartwigGebaeude`) die Parzelle des geschlossenen Hartwig-Hauses.
   Kein Neuaufbau des Stadtplans im laufenden Spiel.
2. **Einzeln neu bauen:** Wettbewerber in `spielBauer` wie Hartwig-Häuser in eigene Gruppen bauen (`o.getrennt`) mit Schlüssel aus Status, Art, Name, Rabatt. `aktualisiere()` meldet geänderte Wettbewerber (`'wb:<id>'`), `neuBauen` baut sie neu. Ziel: „Woche weiter“ bleibt unter 80 ms Neubau im Mittel.
3. **Zustände am Wettbewerber** (in `wettbewerber.js` über einen neuen Parameter `zustand`, nicht kopieren; Helfer aus `zustaende.js` und `sporthelfer.js plakat()` nutzen):
   - `eroeffnung`: Banner „Neueröffnung“ über dem Eingang, Fahnen- oder Ballonreihe, rote Teppichfläche, Passanten ×2, Schlange am Eingang.
   - Preisaktion (`rabatt > 0`): Prozentplakate an beiden sichtbaren Seiten in der Hausfarbe der Kette, bei offprice zusätzlich Aufsteller vor dem Haus.
   - `raeumung`: „Alles muss raus“, „Wir schließen“, Rabatt bis 70 %, Schaufenster teils leer.
   - `geschlossen` bzw. Art `leer_ehemals`: wie heute die Art `leer_ehemals` (verklebte Fenster, „Zu vermieten“), mit dem alten Namen als Geisterschrift.
   - Nachnutzung im ehemaligen Hartwig-Haus: der Hartwig-Baukörper bleibt (Familie und Fassade aus dem Haus), Hartwig-Schriftzug und rotes Band entfernt, dafür Schriftzug und Hausfarbe des Wettbewerbers, Ladenzone neu verglast, Obergeschosse teilweise leer. Neue Funktion `nachnutzung(S, scene, haus, wettbewerber, opt)` in `warenhaus.js` bzw. `sporthaus.js`, die `warenhaus()`/`sporthaus()` mit Option `ohneMarke` aufruft und darüber den fremden Auftritt legt.
4. **Karte:** Pin je Wettbewerber mit Farbe nach Art; bei Eröffnung 4 Wochen ein pulsierender Ring, bei Preisaktion ein kleines Prozentzeichen am Pin. Tippen auf den Pin öffnet ein schlankes Panel (nur lesen): Name, Art, seit wann, Wirkung auf Hartwig je Gruppe aus `wettbewerbUebersicht`, laufende Aktion.
5. **Hausdetail Hartwig:** Abschnitt „Konkurrenz in der Stadt“ mit den Wettbewerbern der Stadt und ihrer Wirkung (aus `hausDetail`).
6. **Meldungen:** Wettbewerbsmeldungen der Engine erscheinen im bestehenden Meldungsband; nach Merge von `feat/spiel-posteingang` im Posteingang mit Sprung zur Stadt und zum Pin.

## Kataloge und Prüfung
1. Neuer Katalog `render/src/kataloge/wettbewerber-zustaende.js`: jede Art in den Zuständen normal, Eröffnung, Preisaktion, Räumung, leer; dazu vier Nachnutzungen ehemaliger Hartwig-Häuser (zwei Warenhaus-Familien, ein Sporthaus, eine Ost-Familie).
2. Neuer Katalog `render/src/kataloge/wettbewerber-verlauf.js`: Nahausschnitt Essen aus `wettbewerb-beispiel.json` in Woche 0, 30, 104.
3. Mindestens drei Render-Runden, jedes Bild ansehen und mit `bilder/katalog-wettbewerber.png` vergleichen.
4. `node pruef-staedte.js` 0 Fehler, Gestaltungsprüfung 0 Verstöße in allen 112 Städten (Reserveslots zählen als Blockrand, dürfen keine Lücke reißen), `node spiel-render.js` 0 Abweichungen. `spiel-render.js` erweitern: angezeigte Wettbewerber je Stadt gleich `wettbewerbFuerGrafik`.
5. Leistung: „Woche weiter“ mit 260 Wochen Bot C in Essen und Berlin messen (`render/src/ui/diagnose.js`), Neubauzeit im Mittel unter 80 ms, Spitze unter 200 ms.
6. Bilder nach `bilder/`.

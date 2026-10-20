# Q02: Grafikqualität – Bildfehler weg, Sprung nach oben

Branch `feat/q02-grafik-qualitaet`. 1 bis 2 Chats.

## Ziel (Ummo, 20.10.2026)
Die Grafik muss „signifikant besser“ werden, „ein signifikanter Sprung nach oben“. Dieser Auftrag räumt die Bildfehler aus Wurf 1 im Kit ab und macht sie dauerhaft prüfbar. Grundriss und Wiedererkennbarkeit der Städte sind Q01.

## Befunde aus Wurf 1
1. **Chemnitz:** Die Straßenbahn hört einfach auf, die Oberleitung hängt in der Luft (`testflight/wurf-1/05-chemnitz.png`).
2. **Essen:** Züge stehen vor dem Hauptbahnhof statt auf den Gleisen; Gleise verschwinden irgendwo (`04-essen-hauptbahnhof.png`).
3. **Dachaufbauten:** Klimaanlagen und Technik auf Dächern sehen komisch aus (schweben, durchdringen das Dach, falsche Größe; `02-…`, `03-…`).
4. **Start:** Die Stadt rendert zum Anfang nicht richtig (Teile fehlen oder springen nach).
5. **Monotonie:** Schrebergärten 1:1 gleich, gleichförmige Felder (Hannover, `07-hannover.png`).

## Umsetzung
1. **Gleise und Oberleitung** (`kit/` Gleis- und Bahnbauer): Gleisende nur mit Prellbock, Wendeschleife, Anschluss oder am Kartenrand. Oberleitungsmasten und Fahrdraht nur entlang vorhandener Gleise und bis zu deren Ende. Fahrzeuge (Zug, Tram) nur auf Gleisen, Züge im Bahnhof an Bahnsteigen.
2. **Dachaufbauten:** Auf der Dachfläche aufsitzend (Unterkante = Dachoberkante), Abstand zur Dachkante, Größe relativ zur Dachfläche, höchstens 3 Arten je Dach, nicht auf Steildächern. Neue Varianten: Lüftungsgeräte flach, Aufzugsüberfahrt, Oberlicht, Solarfeld, Dachgarten.
3. **Startbild:** Erst anzeigen, wenn Plan und Grundkacheln stehen (Ladebild bis dahin), danach Detailkacheln von der Bildmitte nach außen nachladen. Kein sichtbares Springen von Teilen.
4. **Vielfalt der Flächen:** Kleingärten (unregelmäßige Parzellen, mindestens 6 Laubentypen und -farben, Wege, Beete, Obstbäume, verwilderte Parzellen), Felder (Streifen unterschiedlicher Breite, mindestens 5 Fruchtfarben je Jahreszeit, Feldwege, Hecken, Höfe, Baumreihen), Wohnblöcke (Muster wechselt je Block: Farbe, Balkone, Dachform).
5. **Prüfregeln** neu in `pruef-gestaltung`:
   - offene Gleisenden ohne Abschluss: 0,
   - Oberleitung ohne Gleis darunter: 0,
   - Fahrzeug außerhalb Fahrbahn/Gleis: 0,
   - Dachaufbau nicht auf Dachfläche oder über Dachkante: 0,
   - Wiederholung: Anteil identischer Bauteil-Gruppen in gleicher Lage je 100 × 100 m höchstens 15 %.
   Über alle Städte laufen lassen, Ergebnis 0.

## Abnahme
- Vorher/Nachher-Katalog: Chemnitz Tram, Essen Hbf, 6 Dachansichten, Kleingarten Hannover, Feldrand Hannover, Startsequenz Essen (Bildfolge 0 bis 3 s).
- Neue Prüfregeln über alle Städte 0, `spiel-render.js` 0 Abweichungen bzw. neue Fingerabdrücke (Q03) nur für tatsächlich geänderte Städte, mit Begründung.
- Leistung je Stadt nicht schlechter als `main` (Dreiecke, Draw Calls, Aufbauzeit).

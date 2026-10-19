# Workstream Grafik: Städte und Standorte im Ruhrkauf-Maßstab

Branch `feat/massstab-staedte`. Mehrere Chats. Übergabedatei `auftraege/massstab-stand.md` (Abschnitt Grafik): zuerst lesen, am Ende fortschreiben.

**Start erst nach Phase 1 von `engine-massstab.md`.** Dann liegen `render/haeuser.json`, `render/haeuser-schwester.json` und `render/haeuser-outlet.json` mit rund 560 Häusern in rund 180 Städten vor.

## Ausgangslage
- Die Stadtliste der Grafik entsteht aus den Häusern (`render/src/kit/staedte.js`, `nachStadt` aus `haeuser.json`, dann `baueEintrag` je Stadt → `STADTLISTE`). Neue Städte in den JSON-Dateien erzeugen also automatisch neue Stadtpläne.
- Archetyp je Stadt kommt aus der echten Geografie (`staedte.js` Stadtbild-Tabelle) oder aus `archetypen/*.js` (`def.staedte`); fehlt ein Eintrag, wird gewichtet gewürfelt.
- Koordinaten für Nachbarschaftsregeln: `KOORD` in `staedte.js` (`NACHBAR_KM`).
- Prüfungen: `node pruef-staedte.js` (Fehler je Stadt), `node pruef-gestaltung.js "<Städte>"` bzw. `node pruef-alle-gestaltung.js` (auf `feat/grafik-schwesterkette`, nach Merge auf `main`), `node pruef-render.js` (Dreiecke, Teile, Zeit je Stadt).
- Heute: 112 Städte, höchstens 4 Hartwig-Häuser je Stadt, alle Prüfungen 0.

## Phase 1: Neue Städte sauber (1 bis 2 Chats)
1. Für jede neue Stadt:
   - Koordinaten in `KOORD`,
   - Stadtbild in der Stadtbild-Tabelle nach echter Geografie (Region, Fluss, Küste, Hügel, Ruhrgebiet, DDR-Prägung im Osten),
   - Stadttyp aus dem Cluster der Engine.
   Keine gewürfelten Archetypen für echte Städte mit klarer Prägung.
2. `node pruef-staedte.js` über alle rund 180 Städte: 0 Fehler.
3. Gestaltungsprüfung über alle Städte: 0 Verstöße. Gruppenweise laufen lassen, wenn der Speicher knapp wird (wie `pruef-alle-gestaltung.js`).
4. Vielfalt zwischen Nachbarstädten (`GESTALTUNG.md` 3a) bei viel dichterer Städtelage, besonders im Ruhrgebiet und im Rheinland: Kirchenstil, Rathausstil, Konzernbau und Wettbewerber-Bauform dürfen sich unter 28 km nicht wiederholen. Ist das mit den vorhandenen Varianten nicht lösbar, Varianten ergänzen (in den Regionsmodulen `ostbauten.js`, `westbauten.js` usw.), nicht die Regel lockern.
5. Katalog `stadtvielfalt-neu.js`: Nahausschnitte von 24 neuen Städten (je Region mindestens 4). Ansehen und nachbessern, mindestens drei Runden.

## Phase 2: Gemischte Standorte je Stadt (1 bis 2 Chats)
1. Bis zu 8 eigene Häuser je Metropole und bis zu 5 je Großstadt aus vier Formaten müssen sinnvoll im Stadtplan liegen (`stadtplan.js`, Standortverteilung um `EINKAUF_SLOTS` und das Kreuz der Haupteinkaufsstraßen):
   - **Hartwig A-Häuser und Premium:** 1a, an der Hauptachse, prägnantestes Haus.
   - **Hartwig B/C und Volkskauf:** b-Lagen, Nebenachsen, Stadtteilzentren. In Metropolen auch eigene Stadtteilzentren als zweite Einkaufslage (neues Merkmal im Stadtplan: ein bis zwei Nebenzentren mit kleinem Platz, je Stadt deterministisch).
   - **Sport:** 1a oder Center wie heute.
   - **FUNDUS:** Retail Park am Stadtrand oder b-Lage.
2. **Regeln** (in `GESTALTUNG.md` ergänzen, in der Gestaltungsprüfung messen):
   - keine zwei eigenen Häuser im selben Block,
   - zwischen zwei Hartwig-Häusern mindestens zwei Blöcke,
   - Volkskauf nie im Hartwig-Block und nie direkt gegenüber,
   - das größte Hartwig-Haus bleibt das prägnanteste Haus der Stadt (Premium ausgenommen),
   - Nahausschnitt der Haupteinkaufslage zeigt höchstens 3 eigene Häuser.
3. **Hartwig-Familien:** In einer Stadt nie zwei Hartwig-Häuser gleicher Familie und Variante (`bauer.js` B4, `bruecke.js`). Mit bis zu 4 Häusern je Stadt und 360 Häusern insgesamt prüfen, dass die Familien 1 bis 11 und die Fassaden 0 bis 7 reichen. Sonst Varianten ergänzen.
4. **Katalog** `standorte-mix.js`: Berlin, Hamburg, München, Köln, Essen, Dortmund, eine ostdeutsche Großstadt, drei Mittelstädte, jeweils Stadtplan von oben mit Pins je Format und Nahausschnitt.

## Phase 3: Alle Häuser einmal sehen (1 Chat)
1. Kataloge mit allen Häusern je Format in Seiten zu höchstens 60 Kacheln: `alle-hartwig-1.js` bis `alle-hartwig-6.js`, `alle-volkskauf-1.js` und `-2.js`, `alle-sport.js`, `alle-fundus.js` und `-2.js`. Sie dienen der Sichtprüfung auf Kopien und Ausreißer.
2. Prüfskript `pruef-kopien.js`: zwei Häuser derselben Kette mit gleicher Familie, Variante und Fassade in Städten unter 50 km Abstand gelten als Verstoß. Ziel 0.

## Abnahme
- `pruef-staedte` 0 Fehler, Gestaltungsprüfung 0 Verstöße über alle Städte, `pruef-kopien` 0.
- `node pruef-render.js` über alle Städte ohne Abbruch; Teile und Dreiecke je Stadt in `out/render-protokoll.csv`. Städte über dem Budget aus `KIT.md` werden gelistet und im Workstream `massstab-leistung.md` behandelt, nicht hier.
- Bilder nach `bilder/`.
- `README.md` und `KIT.md` fortschreiben.

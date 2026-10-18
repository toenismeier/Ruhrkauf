# Auftrag Grafik: Hartwig Outlet (Abverkaufsschiene am Stadtrand)

## Einordnung
Repo `toenismeier/Ruhrkauf`, Grafik-Baukasten in `render/`. Vor dem Start vollständig lesen: `render/KIT.md`, `render/GESTALTUNG.md`, `render/src/kit/basis.js`, `render/src/kit/sporthaus.js` (Fachmarkt-Box als Vorbild), `render/src/kit/sporthelfer.js`, `render/src/kit/stadtrand.js`, `render/src/kit/zustaende.js`, `render/src/kit/bruecke.js`, `render/src/kit/bauer.js`, `render/src/kit/wettbewerber.js`. Referenzbilder: `render/ref/`, bestehende Kataloge: `bilder/katalog-sporthaeuser.png`, `bilder/katalog-wettbewerber.png`.

Das Outlet ist die Abverkaufsschiene des Konzerns: Hierhin geht, was in den Warenhäusern und Sporthäusern nicht verkauft wurde. Restposten, Saisonware, Sonderangebote. Groß, funktional, nicht glamourös.

**Name:** Arbeitsname `Hartwig Outlet`, als eine einzige Konstante `NAME_OUTLET` in der neuen Moduldatei. Der endgültige Name kommt später und darf nur diese Konstante ändern.

## Aussehen und Feeling
- Lage: Stadtrand und Gewerbegebiet, nie in der Innenstadt und nie im Nahausschnitt der Einkaufslage.
- Drei Bauformen, alle wirken umgenutzt:
  1. Ehemalige Industriehalle: Klinker, Sheddach oder Satteldach mit Oberlichtband, große zugemauerte Tore, ein neues breites Eingangsportal aus Blech.
  2. Umgebauter Supermarkt: eingeschossiger Flachbau mit umlaufendem Vordach, Parkplatz davor, Einkaufswagenhaus.
  3. Fachmarkt-Box mit Lagerannex: Trapezblechfassade, angebauter niedriger Lagerteil mit Rampe und Lkw.
- EG plus höchstens ein OG, breite Eingänge, keine Schaufenster-Inszenierung.
- Kühles, helles Licht. Fassaden grau, beige, Blech. Wenig Farbe.
- Feeling „hier landet der Rest“ über Teile:
  - Rabattplakate über `plakat()` an der Fassade, Prozentwert aus dem echten Rabatt der Brücke,
  - Gitterboxen und Paletten vor dem Haus, Einkaufswagen auf dem Parkplatz,
  - Aufsteller mit Sonderangeboten am Eingang,
  - Schriftzug als nüchterner Kasten, kleines Hartwig-Rot nur als Akzent im Logo.
- Abgrenzung zu den Wettbewerbern der Art `offprice` (Kaufkiste, Wühlwerk, Resteparadies): Die sind laut und bunt. Das Outlet bleibt bewusst grauer und ruhiger. Bei Verwechslungsgefahr gewinnt Zurückhaltung.
- Wenige Passanten, mehr Autos.

## Innenräume
- Eine einfache Halle: Wühltische, Gitterkörbe, lange Kleiderstangen, Paletten mit Ware, Kassenzeile am Ausgang, abgehängte Rasterleuchten.
- Wiederverwenden, was es gibt (`innen.js`: Ständer, Warentische, Konzept `offprice` aus `grundriss.js`), statt neu zu bauen.
- Optional OG als Lager mit Hochregal.

## Technik
1. Neue Datei `render/src/kit/outlet.js` mit `export function outlet(S, scene, haus, opt = {})`, gleiche Signatur und Rückgabe wie `sporthaus()` (`{ hoehe, w, d, familie, teile, status }`). Dazu `familieOutlet(haus)`, `masseOutlet(haus)`.
2. Alle 12 Zustände über `zustandsDekor()` aus `zustaende.js`. Beim Outlet ist „Räumung“ der Normalzustand mit Dauerplakaten. Räumung im Sinne der Schließung muss sich davon sichtbar abheben (z. B. „Alles muss raus“, leere Gitterboxen).
3. Daten: neue Datei `render/haeuser-outlet.json` mit 20 Häusern (`id` `O001` bis `O020`, `format: 'outlet'`, Felder wie in `haeuser.json`). Lage nur `rand`, Cluster `grossstadt` und `metropole`, Baujahr der Umnutzung 1995 bis 2015, Substanz 20 bis 70, verteilt auf Städte aus `staedte.js`, Schwerpunkt NRW, nie zwei in einer Stadt.
4. Platzierung im Stadtrandgürtel: `stadtrand.js` (`plan.aussen`) bekommt einen Gewerbe-Slot `slot:outlet` an einer Ausfallstraße. Der Stadtplan der Innenstadt bleibt unverändert.
5. Anbindung ohne Engine-Änderung:
   - `bauer.js fussabdruck()` kennt `format === 'outlet'`.
   - `bruecke.js` verzweigt `format === 'outlet'` auf `outlet()`.
   - Die Engine (`engine/`) wird in diesem Auftrag nicht angefasst.
6. Gestaltungsregeln in `GESTALTUNG.md` ergänzen und in `pruef-gestaltung.js` prüfen:
   - Outlet nie im Nahausschnitt der Einkaufslage,
   - keine gleiche Bauform in Nachbarstädten,
   - nie direkt neben einem Wettbewerber der Art `offprice`.
7. Budget: höchstens 2.500 Teile je Outlet (normales Gebäude), Fernstufe mit `setzeLod('fern')` prüfen.
8. `basis.js` nicht ändern. Zufall nur über `rng(seed)`. Alle Texte deutsch mit echten Umlauten.

## Kataloge und Prüfung
1. Neuer Katalog `render/src/kataloge/outlets.js`: alle 20 Häuser, dazu je Bauform die Zustände Normalbetrieb, Räumung, leer, geschlossen, Untermieter.
2. Neuer Katalog `render/src/kataloge/outlet-innen.js`: Hallenschnitt EG und OG.
3. Neuer Katalog `render/src/kataloge/outlet-stadtrand.js`: ein Stadtrandausschnitt je Region mit dem Outlet im Gewerbe.
4. `render/src/kataloge/alle-haeuser.js` um das Outlet ergänzen.
5. Rendern mit `node render-katalog.js <name>`, jedes Bild ansehen und mit `render/ref/` und `bilder/katalog-wettbewerber.png` vergleichen. Mindestens drei Runden Nachbessern.
6. Abnahme:
   - `node pruef-staedte.js` 0 Fehler,
   - `node pruef-gestaltung.js` 0 Verstöße in allen 112 Städten,
   - Teilebudget eingehalten,
   - auf einen Blick als Konzern-Outlet erkennbar und nicht mit einem Offprice-Wettbewerber verwechselbar.
7. Fertige PNGs nach `bilder/` kopieren.

## Grenzen
- Arbeit auf Branch `feat/grafik-outlet`, CI muss grün sein.
- Gemeinsam berührte Dateien (`bruecke.js`, `bauer.js`, `GESTALTUNG.md`, `pruef-gestaltung.js`, `alle-haeuser.js`) teilen sich die Aufträge Schwesterkette und Outlet. Erst nach dem Merge der Schwesterkette starten, nicht parallel.

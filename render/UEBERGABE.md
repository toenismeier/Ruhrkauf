# Hartwig Tycoon: Stand Grafik, HQ und Engine (18.10.2026)

## Worum es geht
iPhone-Turnaround-Tycoon über die fiktive Warenhauskette "Hartwig" (dazu "Hartwig Sport"), Stil Coffee Inc 2: feste isometrische 3D-Kamera ohne Drehung, Karte frei verschieb- und zoombar, Hochformat. Nur Deutschland, 112 Städte. Später: HQ-Logik wie Coffee Inc 2 (Gebäude mieten, Etagen, Abteilungen), Wettbewerber mit fiktiven Namen.

## Wo alles liegt (Ummos Rechner)
- C:\Users\Ummo\Desktop\Projekte\WH\grafik-baukasten.zip: kompletter Grafik-Baukasten (Quellcode, Kataloge, Prüfskripte, GESTALTUNG.md, KIT.md, haeuser.json)
- C:\Users\Ummo\Desktop\Projekte\WH\grafik: 55 aktuelle Katalogbilder (katalog-*.png). Dateien "stand-*.png" sind veraltet.
- C:\Users\Ummo\Desktop\Projekte\WH\turnaround-engine.zip: Spiel-Engine (Kennzahlen, Häuser), noch nicht mit der Grafik verbunden
- C:\Users\Ummo\Desktop\Projekte\WH\the.coffee.inc: Vorlage-Screenshots Coffee Inc 2

## Baukasten in Kürze
- three.js r160, orthografische Iso-Kamera, Bündeln mit esbuild, Rendern headless mit Chromium/Playwright.
- Plan und Bau getrennt: stadtplan(seed, {typ, archetyp, region, standorte}) liefert Parzellen und Slots, baueStadt() baut daraus die 3D-Szene. Plan enthält plan.kameraGrenze (Rechteck, das das Spiel als Verschiebegrenze nutzt) und plan.aussen (Stadtrandgürtel 480 m).
- Regionen als Module: src/kit/archetypen/{ost,nord,west,mitte,sued}.js, Bauten in ostbauten/nordbauten/westbauten/mittebauten/suedbauten.js.
- Häuser: warenhaus.js (Familien 1 bis 11, inkl. DDR-Bauten), sporthaus.js (6 eigene Bauformen, Center immer Mall-Front), wettbewerber.js (7 Arten x 5 Bauformen), zustaende.js (12 sichtbare Zustände mit Belegungslogik je Fassade).
- Innenräume: grundriss.js + abteilung.js (Warenhaus: Beauty, Damen, Herren, Kiko = Kinderkonfektion, Restaurant, Feinkost im UG, Spielwaren, Living ...), sportgrundriss.js + sportabteilung.js (Sporthaus nach Sportarten).
- Gelände: gelaende.js (glatte Hänge, Rebzeilen), stadtrand.js (Vororte, Gewerbe, Kleingärten, Felder, Wald).
- Regeln für jedes Bild: GESTALTUNG.md (keine leeren Blockinnenflächen, kein Rasen in Blöcken, keine Baum-Mittelstreifen außer Boulevard/Ring/Magistrale, kleine Bahnhöfe, Flüsse als durchgehendes Band, keine nackten Ufer, alles auf einer Ebene, keine kopierten Gebäude, kein Kartenrand sichtbar).

## Befehle (Ubuntu/WSL oder Linux, im entpackten Ordner)
1. Abhängigkeiten: `npm install`
2. Katalog rendern: `node render-katalog.js <name>` (Namen = Dateien in src/kataloge, Ergebnis out/katalog-<name>.png)
3. Städteprüfung: `node pruef-staedte.js` (Ziel: Fehler 0 in 112 Städten)
4. Gestaltungsprüfung: `node pruef-gestaltung.js "<Städteliste>"` (ohne Liste nur Essen, Duisburg, Gelsenkirchen)

## Stand 18.10.2026
- pruef-staedte: 0 Fehler, pruef-gestaltung: 0 Verstöße in allen 112 Städten.
- Zwei unabhängige Bildprüfungen (Stadtbilder und alle Gebäude-/Innenraumkataloge Kachel für Kachel) abgearbeitet.
- Bewusst so gelassen: bei heruntergekommenen Häusern fehlt im Schriftzug höchstens ein Buchstabe (Zustandssignal); Umbaugerüst steht teils vor dem Schriftzug; Bielefeld-Sporthaus ohne Medienbanner.

## Offen
- Vororte wirken ganz herausgezoomt gleichförmig (beim Spielzoom kaum sichtbar).
- Kein eigener Uferweg unter Brückendecks.
- Leistung auf dem iPhone ungeprüft (Stadtrand bringt viel zusätzliche Geometrie).

## Entschieden (18.10.2026)
Als Nächstes: HQ-Logik (Punkt 2) und Engine anbinden (Punkt 4). Während der Arbeit alle zehn Minuten ein kurzes Update an Ummo.

## Nächste Schritte
1. iPhone-Prototyp: eine Stadt spielbar, Verschieben/Zoomen mit plan.kameraGrenze, Leistung (Instancing, Detailstufen je Zoom, Kacheln nachladen).
2. HQ-Logik wie Coffee Inc 2: Gebäude mieten, Etagen, Abteilungen (Controlling usw.).
3. Wettbewerber im Spiel (fiktive Namen, Arten sind grafisch fertig).
4. Engine anbinden (turnaround-engine.zip: Konzepte, Rebalance).

## Neu am 18.10.2026 nachmittags: HQ-Logik und Engine-Anbindung
- C:\Users\Ummo\Desktop\Projekte\WH\turnaround-engine.zip enthält jetzt die HQ-Logik (src/hq.ts, src/standorte.ts, tests/hq.test.ts, scripts/hq-vergleich.ts). 40 Tests grün.
- Zentrale wie Coffee Inc 2: Bürogebäude mieten, Etagen mieten/kündigen, 10 Abteilungen (controlling, einkauf, marketing, personal, immobilien, logistik, ecommerce, recht, vm, verwaltung) mit Stufe 0 bis 3 auf Etagen setzen. Start: Hartwig-Hochhaus Brehmstraße Essen (12 × 1.250 qm) plus Verwaltungsscheibe (5 × 1.300 qm), 1.139 FTE, 2,17 Mio. € je Woche (112,8 Mio. € im Jahr, Kalibrierung unverändert).
- Wirkung (Jahr 3, Mittel Seeds 1 bis 3, gegen keine Zentralmaßnahme): pauschal 30 % +27,1 Mio. €, gute Strategie +31,5 Mio. €, Kahlschlag +20,3 Mio. € (plus 41,6 Mio. € Abfindungen), gute Strategie mit Ausbau Einkauf/Immobilien +36,0 Mio. €. Ohne Zentralmaßnahme scheitert der Schutzschirm auf 2 von 3 Seeds. Standort zählt (Erreichbarkeit, Fachkräfte): Ruhrgebiet/Rheinland/Frankfurt voll, abgelegene Städte bis 16 % schwächer.
- Grafik: src/kit/hq.js (6 Bürotypen mit Varianten, Etagenschnitte mit Signaturmöbeln je Abteilung, Stufen sichtbar, Angebote mit Banner und Schlüssel-Pin, hqEinplanen ändert den Stadtplan nicht). Kataloge hq, hq-etagen, hq-stadt.
- Brücke: src/kit/bruecke.js (Engine-Haus → 12 sichtbare Zustände, echter Rabatt auf Bannern). Prototyp: spiel.html + spiel-bundle.js im Browser öffnen (Hochformat 390 × 844), Woche weiter, Cockpit, Hausdetail, HQ-Panel mit Aktionen. Stadtaufbau 1,7 bis 2,9 s, ca. 42.000 Teile beim Start, Woche weiter ca. 17 ms Engine + 54 ms Neubau. spiel-render.js prüft Anzeige gegen Engine (0 Abweichungen).
- Bilder: C:\Users\Ummo\Desktop\Projekte\WH\grafik\katalog-hq*.png, katalog-bruecke.png, spiel-*.png.

## Neu am 18.10.2026 abends: Einkauf, Freigaben, Eigenmarken
- Engine: src/einkauf.ts, src/eigenmarken.ts, 57 Warengruppen unter den 16 Bereichen, je NOS und Saison. Steuerung je WG: Limit (Open to Buy), NOS-Anteil, Servicegrad, Vororderquote, Reduzierung, Freigabemodus (auto/verfall je NOS/Saison). Kennzahlen: Umsatz, Rohertragsquote, Lagerumschlag, Reichweite, Abverkauf, Altware, Abschriften, NOS-Verfügbarkeit, Fehlmengen, Limit, Eigenmarkenanteil.
- Freigaben: Grenze einstellbar (Start 50.000 € EK), Orderrunden 30 Wochen vor Saison (43 bis 71 Orders je Woche, HW rund 210 Mio. € EK), Alltag mit Steuerung im Mittel 8 je Woche. Saison ohne Freigabe verfällt (Startwert), NOS läuft automatisch.
- Eigenmarken: Start Lisanne (Damen 50+, Stil veraltet), Brehm & Sohn (Herren klassisch), Casa Linde (Wohnen), Pünktchen (Kinder); gründen, neu positionieren, einstellen; Beschaffung Fernost/Nahost-Osteuropa/Europa; Mehrmarge 10 bis 14 Punkte; Kapazität nach HQ-Einkaufsstufe.
- Strategievergleich Jahr 3 (EBITDA): Bot C 15 Mio. €, NOS-Pflege 21 Mio. €, Eigenmarken-Offensive 41 Mio. €, Kahlschlag Limit -11 Mio. €. Kalibrierung Ausgangslage innerhalb 0,2 %. 55 Tests grün.
- Prototyp: Knopf "Einkauf" mit Übersicht, WG-Detail, Freigaben, Eigenmarken, Assistent "Marke gründen"; Eigenmarken-Shops im Innenraum. Prüfung 655 Werte, 0 Abweichungen, 12/12 Aktionen.
- Vertrag: EINKAUF-VERTRAG.md im Baukasten.

## Als Nächstes
1. Prototyp auf dem iPhone (Expo/React Native mit three.js oder WebView), echte Bildrate messen.
2. Wettbewerber in Engine und Stadt.
3. Oberfläche für Entscheidungen, Angebote, Meldungen im Prototyp.

## Arbeitsweise mit Ummo
Deutsch mit echten Umlauten, kurz. Entscheidungen über Auswahlfragen mit Empfehlung. Selbst gefundene Schwächen beheben statt auflisten. Bei laufender Arbeit alle 10 Minuten kurzes Update. Coffee Inc 2 ist die verbindliche Vorlage. Nie in C:\Users\Ummo\Desktop\Privat schauen, nie über den Bildschirm bedienen.

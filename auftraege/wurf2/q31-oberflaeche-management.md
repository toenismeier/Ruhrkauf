# Q31: Oberfläche Teil 2 – Management-Panels auf das Gestaltungssystem (Claude-Chat)

Branch `feat/q31-oberflaeche-management`. Hintergrund und Regeln wie `q30-oberflaeche-spiel.md` (Ummo 22.10.2026, per Auswahl: Claude-Chats nach Bereichen).

## Umfang (Zentrale-Fachbereiche)
Einkauf (`einkauf.js`, Ware/WG-Detail), Eigenmarken und Produktentwicklung (`eigenmarken.js`, `produkte.js`, `produkte-q24.js`), Marketing (`marketing.js`, `marketing-q16.js`), IT und IT-Produkte (`it.js`, `it-produkte.js`), E-Commerce (`ecommerce.js`), Planung, Reporting, Vorstand, App/Spielstände (`app.js`).

## Regeln
- Baut auf den gemeinsamen Bausteinen aus Q30 auf (`render/src/ui/komponenten.css`); bis Q30 sie gemergt hat, mit der Bestandsaufnahme und Vorher-Bildern beginnen. `spiel.html`/`spiel.js` nicht ändern, Bedarf an Q30 melden.
- Eigenmarken: Produktbilder kommen aus `render/src/kit/mode/` (Q25, Q27–Q29), nicht anfassen; nur Rahmen, Raster, Hierarchie.
- Den Abschnitt „Gegen den KI-Look“ unten genauso anwenden; eigene Bereichselemente z. B. Orderbuch (Einkauf), Musterkarte/Kollektionstafel (Eigenmarken), Kampagnenkalender (Marketing).
- Sonst wie Q30: keine Engine-Änderung, Vorher/Nachher je Panel bei 390 × 844 selbst ansehen, Zwischenstand an Ummo, `npm test`, `spiel-render.js --nur-panels` 0 Abweichungen, CI von Hand, selbst mergen, STATUS nachziehen.

## Gegen den KI-Look (Ummo 22.10., Video „Why does it all look like the same AI app?“)
Ein ordentlich angewandtes Kit reicht nicht; jedes Panel braucht ein Gesicht, das nur Hartwig hat.
- **Hauptfrage je Panel:** Vor dem Bauen pro Panel einen Satz notieren, welche Frage es beantwortet (z. B. Hausdetail: „Läuft dieses Haus diese Woche?“). Der größte Block beantwortet genau diese Frage; alles andere ist kleiner.
- **Hauptaufgabe mit einem Tipp:** Was man im Panel meistens tun will, ist ohne Scrollen mit einem Tipp erreichbar.
- **Eine Sache, die nur ein Warenhaus hat:** je Bereich ein eigenes Element statt Kachelraster, z. B. Etagenschnitt im Hausdetail, Wochenbericht als Zeitungsspalte, Posteingang als Aktenstapel/Hauspost, Einkauf als Orderbuch. Keine Begrüßungszeilen und keine Floskelköpfe.
- **Verbotene Muster** (prüfen, nicht hoffen): schwere Schatten, Symbole in eingefärbten Kreisen, Text unter 12 px, Creme-mit-Terrakotta als Ausweichpalette, Platzhalterdaten wie „Max Mustermann“, gleichförmige Kachelraster ohne Rangfolge, Verläufe/Glas.
- **Zahlen zuerst:** Angezeigte Summen müssen aus den angezeigten Zeilen nachrechenbar sein; ein Test prüft das je Panel mit Summen.
- **Schlechte Tage zeichnen:** leerer Zustand, Nullwert, Fehlerfall und Engpass (z. B. Abteilung unterbesetzt) sind je Panel bewusst gestaltet und gerendert.
- **Bildprüfung mit 7 Fragen** je Nachher-Bild, Ergebnis kurz in den PR: 1. Beantwortet der größte Block die Hauptfrage? 2. Tote Streifen/Leerflächen? 3. Verwaiste Zellen? 4. Summen nachgerechnet? 5. Leerer Zustand gezeichnet? 6. Null sichtbar statt versteckt? 7. Nennt der Fehler, was schiefging? Was im Bild falsch aussieht, ist falsch, egal was der Code sagt.
- Vorlage Coffee Inc ist Maßstab für Dichte und Rangfolge, nicht zum Abmalen.

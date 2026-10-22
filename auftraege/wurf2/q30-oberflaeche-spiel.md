# Q30: Oberfläche Teil 2 – Spiel-Panels auf das Gestaltungssystem (Claude-Chat)

Branch `feat/q30-oberflaeche-spiel`. **Ummo (22.10.2026, per Auswahl):** Die restlichen Panels stellen Claude-Chats um, nach Bereichen, weil GPT nicht sehen kann, wie es aussieht. Hintergrund: Q14 (#51, gemergt 22.10.) hat nur das Gestaltungssystem `render/GESTALTUNG-UI.md`, die Tokens und fünf Korrekturen geliefert. Ummos Befund aus Wurf 2: Oberfläche „sehr KI-generiert“, „sehr lieblos“, „zusammengeschustert“. Vorlage Coffee Inc 2: `testflight/vorlage-coffee/01–14.png`, Befundbilder `testflight/wurf-2/`.

## Umfang (Spiel und Betrieb)
Cockpit/Kopfzeile, Menü und Chips (`render/src/spiel.js`, `render/spiel.html`), Startbildschirm und Szenarien (`szenarien.js`), Hausdetail (`haus.js`) und Hausbesuch, Karte/Portfolio/Vertrieb (`karte.js`, `portfolio.js`, `vertrieb.js`), Posteingang, Wochenbericht, Zeitung, Reise und Deutschlandkarte, Chronik, Statistik, Erfolge, Spielende, Einführung, Einstellungen, Organisation, Zentrale-Abteilungen, Personaleinsatz, Umbau, Ware.

## Regeln
- `render/GESTALTUNG-UI.md` ist verbindlich (Tokens, Komponentenvertrag, Panel-Abnahme). Gemeinsame Tokens und Komponenten (Panelkopf, Karte, Liste, Reiter, Knöpfe, Kennzahl, leerer Zustand) baut **Q30** als gemeinsame Bausteine (`render/src/ui/komponenten.css` + kleine Hilfsfunktionen) und mergt sie **zuerst als eigenen kleinen PR**, damit Q31 darauf aufsetzt.
- Q31 ändert `spiel.html`/`spiel.js` nicht; Bedarf meldet Q31 an Q30.
- Keine Engine-Änderung, Spielwerte unverändert (`node spiel-render.js --nur-panels` 0 Abweichungen).
- Je Panel Vorher/Nachher bei 390 × 844 rendern und selbst ansehen; sichtbare Strings ohne `undefined`, `null`, `hc-`, abgeschnittene Beschriftungen; Touch-Ziele ≥ 44 px; Erfolgs-/Hinweisbanner verdecken keine Panelköpfe.
- Ein Zwischenstand (z. B. Cockpit + Hausdetail + Posteingang) geht als Bild an Ummo, bevor der Rest folgt.

## Abnahme
`cd render && npm test`, `node spiel-render.js --nur-panels`, Fingerabdruck unverändert (keine Stadtänderung), Kontaktbogen Vorher/Nachher aller Panels an Ummo, CI von Hand (`gh api -X POST repos/toenismeier/Ruhrkauf/actions/workflows/quality.yml/dispatches -f ref=<branch>`; auf den PR-Lauf nicht warten, er startet bei PRs aus der Sitzung nicht), selbst mergen, `auftraege/STATUS.md` nachziehen.

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

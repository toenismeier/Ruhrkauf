# Gestaltungssystem der Spieloberfläche (Q14, dunkel seit Q30)

Stand: 21.10.2026. Referenz: Coffee Inc 2 – ruhige Informationshierarchie, klare Zahlen, zurückhaltende Interaktion. Gilt für sämtliche Panels einschließlich Cockpit, Hausdetail, Posteingang, Organisation, Zentrale, Reise und Eigenmarken. Ausschließlich Darstellung; keine Änderung an Engine, Aktionen oder Berechnungen.

## Gestaltungsprinzipien
1. **Eine Hauptaussage je Ansicht.** Titel, zentrale Kennzahl, höchstens eine hervorgehobene Primäraktion. Sekundäre Informationen als kompakte Zeilen, nicht als gleichgewichtete Kartenwand.
2. **Information vor Dekoration.** Keine Emoji, Fragezeichen als Bildersatz, bedeutungslosen Fortschrittsbalken, Farbverläufe oder Schattenstapel. Icons ausschließlich aus einem konsistenten SVG-Satz mit 20 × 20 px, 1,75 px Strichstärke.
3. **Mobil zuerst.** Abnahme bei 390 × 844 CSS-Pixeln; keine horizontale Seitenüberläufe. Scrollbare Reiter dürfen horizontal laufen, ohne Texte abzuschneiden. Touch-Ziele mindestens 44 × 44 px.
4. **Eindeutige Sprache.** Interne IDs (hc-*, technische Aktionsschlüssel), `undefined`, `null` und rohe Enum-Werte niemals anzeigen. Fehlende Bezeichnungen erhalten einen verständlichen Fallback.

## Design-Tokens (Q30, dunkler Grundlook nach Coffee Inc 2, Ummo 22.10.2026)
Alle Werte in `render/src/ui/komponenten.css` als CSS-Custom-Properties. Ein Panel schaltet den Look ein, indem sein Inhalt den Marker `bereich(name, symbol)` aus `render/src/ui/komponenten.js` enthält; der Bereich setzt Grund, Flächen und Kopfsymbol. Die hellen Q14-Werte (`--ui-bg #F5F4F1` usw.) gelten nur noch für Panels ohne Marker, bis Q30 und Q31 alles umgestellt haben, dann entfallen sie.

| Bereich | Grund | Fläche | Tiefe (Kopf, Sprecher, Reiter) | Linie | Text | Leise |
|---|---|---|---|---|---|---|
| `haus` (Haus, Filiale, Personal, Umbau) | #2A2521 | #352F2A | #1D1916 | #4A423B | #F3EEE8 | #A89E93 |
| `zentrale` (Zentrale, Organisation, Q31-Fachbereiche) | #1F2B32 | #29373F | #162026 | #3B4B54 | #EEF3F5 | #93A3AB |
| `betrieb` (Posteingang, Wochenbericht, Reise, Karte, Statistik, Erfolge, Einstellungen) | #24272B | #2F3338 | #1A1C1F | #43484E | #F1F1EF | #9DA2A7 |
| `papier` (Zeitung, Chronik) | #ECE7DC | #F6F2E9 | #DDD6C7 | #C9C0AE | #1F1D1A | #5F5A52 |

| Token | Wert | Verwendung |
|---|---|---|
| `--hk-xs / sm / md / lg / xl` | 12 / 14 / 16 / 22 / 32 px | Meta / Listen / Bedienung / Titel / Großkennzahl |
| `--hk-1 … --hk-6` | 4, 8, 12, 16, 24, 32 px | 4er-Raster |
| `--hk-akzent` | #D23C32 (Innenkontur #EF7A6F) | Hartwig-Rot: Bedienelemente (Stepper, Schalter, Segment) und höchstens eine Primäraktion je Abschnitt; kein Coffee-Orange |
| `--hk-gut` / `--hk-schlecht` / `--hk-achtung` | #6DBF73 / #EF6F62 / #E7B04B | Ergebnis und positive Abweichung / negative Abweichung / Engpass |
| `--hk-serie-a` / `--hk-serie-b` | Text / #6DBF73 | Balken Umsatz / Ergebnis |
| Grund | senkrechter Streifen 7 + 1 px, Weiß mit 2,2 % Deckung | einzig erlaubter Verlauf |
| `--hk-radius` | 10 px | Flächen, Eingaben |

## Bausteine (`render/src/ui/komponenten.js`, Katalog: `node tests/komponenten-katalog.cjs` → `out/q30/komponenten.png`)
`bereich`, `rumpf`, `sprecher` (Person sagt den Befund der Woche, keine Begrüßung; Ton `engpass`/`alarm`), `abschnitt` (Versalien), `gross` + `abweichung` (Großkennzahl mit Abweichung absolut und in %), `balken` (5 Wochen gepaart, ohne Achsen; unter zwei Punkten leerer Zustand), `tabelle` (GuV, Strich vor Summen, Null sichtbar; `pruefen: true` → Summenprüfung über `data-w`), `zeile`/`liste`, `knopf` (primär, `zweit`, `text`), `stepper`, `schalter`, `seg`, `reiterUnten` mit isometrischen `SYMBOLE`, `leer`, `hinweis` (`achtung`, `fehler`, `gut`), `marke`, `skala` (fünf Segmente mit Zahl).

## Verbotene Muster als Skript
`render/src/ui/stilpruefung.js` prüft im Browser auf berechneten Stilen: Schatten-Unschärfe > 8 px, Verläufe und Glas außer dem Streifengrund, Schrift < 12 px, Touch-Ziel < 44 px, abgeschnittene Beschriftung (Ellipse mit Überlauf), Symbol im eingefärbten Kreis, helle Cremeflächen im dunklen Look, Text `undefined`/`null`/`NaN`/`hc-`/Platzhalternamen, Summen, die sich nicht aus den angezeigten Zeilen ergeben. `node spiel-render.js --nur-panels` prüft alle Panels mit `umgestellt: true` aus `tests/q30-panelliste.cjs` und `tests/q31-panelliste.cjs` und endet mit Fehler. Aufnahmen aller Panels: `node tests/q30-panels.cjs --ordner out/q30/nachher`.

## Komponentenvertrag
- **Panelkopf:** eine maximal zweizeilige Überschrift, optional Unterzeile; rechts höchstens eine Aktion. Bei Platzmangel Aktionen in eigene Zeile.
- **Karte:** Fläche des Bereichs, 1px Kontur, 12–16px Innenabstand, 8–12px Abstand zur nächsten Einheit. Nur für eigenständige Sachverhalte; verwandte Daten als Zeilen mit Trennlinie.
- **Liste:** Titel links, Wert oder Aktion rechts; rechter Bereich schrumpft nicht unter lesbare Mindestbreite. Bei schmalen Ansichten Wert unter Titel umbrechen; niemals überlappen.
- **Reiter:** vollständige Begriffe; horizontales Scrollen mit `overflow-x:auto`, `flex-shrink:0`, sichtbarer aktiver Unterstreichung und erreichbarem Fokus. Keine künstlich verkürzten Wortfragmente.
- **Knöpfe:** Primär Hartwig-Rot gefüllt mit doppelter Kontur, sekundär neutral mit Kontur, tertiär als Text; gleiche Höhe 44px, klarer Disabled-Zustand. Nie mehr als eine rote Primäraktion pro Abschnitt.
- **Kennzahlen:** tabellarische Ziffern; Zahl und Einheit zusammenhalten. Responsive Anzeige in Tsd., Mio., Mrd.; bei Engpässen Zeilenumbruch statt Ellipse. Negative Vorzeichen und Prozentpunkte eindeutig kennzeichnen.
- **Benachrichtigungen:** unterhalb des sicheren Kopfbereichs, mit eigener Schließmöglichkeit; keine verdeckten Navigationselemente. Fehlermeldungen zusätzlich inline beim auslösenden Element.
- **Leere Zustände:** kurzer Grund und ggf. nächste sinnvolle Aktion. Ein Verlauf mit weniger als zwei Datenpunkten zeigt „Ein Verlauf ist ab der zweiten Woche verfügbar.“ statt einer Achse KW 1 bis KW 1.
- **Bilder:** für Reiseziele echte vorhandene Stadtansichten; falls nicht vorhanden, neutrale beschriftete Fläche statt „?“. Kartenmarkierungen ausreichend groß und mit lesbarer Beschriftung oder zugänglicher Liste.

## Panel-spezifische Abnahme
1. **Cockpit:** klare Kennzahlenhierarchie; lange Formatnamen umbrechen; Beträge in Mio./Mrd. und ohne abgeschnittene Einheiten.
2. **Hausdetail:** vollständige Reiter; Aktionsbezeichnungen mit Fallback statt „Aktion undefined“; Cluster-ID in lesbaren Raum-/Regionsnamen übersetzen.
3. **Posteingang:** verdichtete Liste nach Priorität und Datum; klare ungelesen-Markierung, keine gleichförmigen Großkarten.
4. **Organisation:** Hierarchie und Zuständigkeit statt dekorativer Fortschrittsbalken; gruppierte Listen und eindeutige Aktionen.
5. **Zentrale:** Etagenangabe und „Kündigen“ in getrennten flexiblen Bereichen, bei schmalem Bildschirm untereinander.
6. **Reise:** beschriftete Städte, keine „?“-Kacheln; erreichbare Ziele und verständliche Karteneinträge.
7. **Eigenmarken:** eindeutige Produkt-/Kategoriehierarchie, konsistente Bilderrahmen und Zielgruppenkennzeichnung ohne Platzhalter.

## Qualitätssicherung
Claude erstellt Vorher-/Nachher-Aufnahmen sämtlicher Panels bei 390 × 844, prüft sichtbare Strings auf `undefined`, `null`, `hc-` und abgeschnittene Beschriftungen und führt die bestehenden Smoketests sowie `cd render && npm run build && node spiel-render.js` aus. Fingerabdruck-Gate `node pruef-fingerabdruck.js` vor Merge. Keine Referenzbilder automatisch aktualisieren. Jede Panelumstellung in eigenem Commit dokumentieren.

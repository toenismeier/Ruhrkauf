# Gestaltungssystem der Spieloberfläche (Q14)

Stand: 21.10.2026. Referenz: Coffee Inc 2 – ruhige Informationshierarchie, klare Zahlen, zurückhaltende Interaktion. Gilt für sämtliche Panels einschließlich Cockpit, Hausdetail, Posteingang, Organisation, Zentrale, Reise und Eigenmarken. Ausschließlich Darstellung; keine Änderung an Engine, Aktionen oder Berechnungen.

## Gestaltungsprinzipien
1. **Eine Hauptaussage je Ansicht.** Titel, zentrale Kennzahl, höchstens eine hervorgehobene Primäraktion. Sekundäre Informationen als kompakte Zeilen, nicht als gleichgewichtete Kartenwand.
2. **Information vor Dekoration.** Keine Emoji, Fragezeichen als Bildersatz, bedeutungslosen Fortschrittsbalken, Farbverläufe oder Schattenstapel. Icons ausschließlich aus einem konsistenten SVG-Satz mit 20 × 20 px, 1,75 px Strichstärke.
3. **Mobil zuerst.** Abnahme bei 390 × 844 CSS-Pixeln; keine horizontale Seitenüberläufe. Scrollbare Reiter dürfen horizontal laufen, ohne Texte abzuschneiden. Touch-Ziele mindestens 44 × 44 px.
4. **Eindeutige Sprache.** Interne IDs (hc-*, technische Aktionsschlüssel), `undefined`, `null` und rohe Enum-Werte niemals anzeigen. Fehlende Bezeichnungen erhalten einen verständlichen Fallback.

## Design-Tokens
Alle Werte zentral unter `render/src/ui/` als CSS-Custom-Properties bündeln, keine lokalen Sonderfarben und -abstände pro Panel.

| Token | Wert | Verwendung |
|---|---|---|
| `--ui-font-xs` | 12px/16px | Meta, Zeitstempel |
| `--ui-font-sm` | 14px/20px | Labels, Listen |
| `--ui-font-md` | 16px/24px | Fließtext, Bedienelemente |
| `--ui-font-lg` | 24px/30px | Titel, Hauptkennzahlen |
| `--ui-space-1…6` | 4, 8, 12, 16, 24, 32px | 4er-Raster |
| `--ui-bg` | #F5F4F1 | App-Hintergrund |
| `--ui-surface` | #FFFFFF | Oberflächen |
| `--ui-text` | #242424 | Primärtext |
| `--ui-muted` | #62666A | Sekundärtext |
| `--ui-border` | #E2E1DD | Trennlinien |
| `--ui-brand` | #B32632 | Primäraktion, kritische Warnung |
| `--ui-positive` | #247153 | Positive Kennzahl |
| `--ui-negative` | #A52D38 | Negative Kennzahl |
| `--ui-radius` | 10px | Flächen, Eingaben |
| `--ui-shadow` | 0 1px 3px rgb(0 0 0 / 6%) | Nur schwebende Ebenen |

Keine zweite Akzentfarbe für gewöhnliche Buttons. Kontrast mindestens WCAG AA; nicht allein durch Farbe unterscheiden.

## Komponentenvertrag
- **Panelkopf:** eine maximal zweizeilige Überschrift, optional Unterzeile; rechts höchstens eine Aktion. Bei Platzmangel Aktionen in eigene Zeile.
- **Karte:** weiß, 1px Kontur, 12–16px Innenabstand, 8–12px Abstand zur nächsten Einheit. Nur für eigenständige Sachverhalte; verwandte Daten als Zeilen mit Trennlinie.
- **Liste:** Titel links, Wert oder Aktion rechts; rechter Bereich schrumpft nicht unter lesbare Mindestbreite. Bei schmalen Ansichten Wert unter Titel umbrechen; niemals überlappen.
- **Reiter:** vollständige Begriffe; horizontales Scrollen mit `overflow-x:auto`, `flex-shrink:0`, sichtbarer aktiver Unterstreichung und erreichbarem Fokus. Keine künstlich verkürzten Wortfragmente.
- **Knöpfe:** Primär rot und gefüllt, sekundär neutral mit Kontur, tertiär als Text; gleiche Höhe 44px, klarer Disabled-Zustand. Nie mehr als eine rote Primäraktion pro Abschnitt.
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

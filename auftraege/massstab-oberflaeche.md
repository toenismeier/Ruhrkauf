# Workstream Oberfläche: 560 Häuser bedienbar machen

Branch `feat/massstab-oberflaeche`. Ein bis zwei Chats. Übergabedatei `auftraege/massstab-stand.md` (Abschnitt Oberfläche).

**Start nach Phase 1 von `engine-massstab.md`.** Funktioniert zunächst mit Hartwig und Sport; Volkskauf und FUNDUS kommen dazu, sobald `engine-formate.md` sie simuliert.

## Problem
Der Prototyp (`render/spiel.html`, `render/src/spiel.js`) ist für 180 Häuser in 112 Städten gebaut. Stadtwahl über ein Auswahlfeld, Hausdetail je Haus, Cockpit als Summe. Mit rund 560 Häusern in rund 180 Städten und vier Formaten findet der Spieler nichts mehr, und Entscheidungen Haus für Haus werden zur Fleißarbeit.

## Umsetzung
1. **Deutschlandkarte** als Einstieg (neues Modul `render/src/ui/deutschland.js`):
   - schematische Karte mit allen Städten als Punkte, Größe nach Umsatz, Farbe nach Lage (Ampel aus Hausergebnis),
   - Tippen öffnet die Stadt; Filter nach Format, Region, Hausklasse A/B/C, Ampel.
   - Gezeichnet als SVG oder Canvas, nicht in three.js. Koordinaten aus `KOORD`.
2. **Portfolio-Liste** (Menükachel „Häuser“):
   - alle Häuser als sortierbare Liste (Umsatz, EBITDA, Marge, Miete je Umsatz, Substanz, Restlaufzeit Miete, Status), gruppiert nach Format,
   - Filter wie oben, Suche nach Stadt oder Name,
   - virtuelles Scrollen (nur sichtbare Zeilen im DOM).
   Datenquelle: `portfolio(s)` aus `engine/src/abfragen.ts`, um Klasse, Format und Ampel erweitern.
3. **Sammelaktionen:** Mehrfachauswahl in der Liste und Aktionen für die Auswahl, alle über vorhandene `SpielerAktion`-Typen mit `haeuser: string[]`:
   - Schließen (mit Vorschau der Kosten),
   - Personal, Aushilfen,
   - Miete verhandeln,
   - Marketing-Aktion mit Scope `haeuser`.
   Gespeicherte Auswahlen („alle C-Häuser West mit negativem EBITDA“) als Filter merken (`ui/speicher.js`).
4. **Cockpit:** Kopfzeilen je Format (Umsatz, EBITDA, Häuser offen), Summe darunter. Tippen auf ein Format filtert Karte und Liste.
5. **Stadtansicht:** Kopfleiste mit allen eigenen Häusern der Stadt als Chips (Format-Farbe), Tippen springt zum Haus. Wettbewerber der Stadt, sobald `engine-wettbewerber.md` gemergt ist.
6. **Bedienung:** Hochformat 390 × 844, Knöpfe mindestens 44 px, alles mit dem Daumen erreichbar. Texte deutsch mit echten Umlauten, Geld über `ui/format.js`.

## Prüfung und Abnahme
- `spiel-render.js` erweitern:
  - Listenwerte gleich `portfolio(s)` (Stichprobe 50 Häuser je Format),
  - Karte zeigt jede Stadt,
  - Sammelaktion „Personal −5 % für Auswahl“ ändert den Spielstand wie `fuehreAus`.
  - 0 Abweichungen.
- `render/tests/mobil-smoke.js`: Karte öffnen, filtern, Stadt öffnen, Liste scrollen, Sammelaktion.
- Bilder `bilder/deutschland.png`, `bilder/portfolio-liste.png`, `bilder/sammelaktion.png` (Seed 1, Woche 30) erzeugen und ansehen.
- CI grün.

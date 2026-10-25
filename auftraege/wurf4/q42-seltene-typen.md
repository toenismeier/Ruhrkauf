# Q42: Seltene Typen und Varianten aus dem Referenzsortiment (Claude-Chat)

Branch `feat/q42-referenz`. Grundlage `auftraege/wurf4/README.md` (Regeln, Bilder nur als Vorlage, nie ins Repo).
**Start erst, wenn Q37–Q41 gemergt sind** (Zieltypen der Varianten kommen teils aus Q38–Q41, Musterfeld aus Q37).

**Ummo 25.10.2026:** Von den 131 seltenen Typen (unter 3 Artikel) sind 83 neue Typen und 35 Varianten freigegeben, 13 bleiben draußen.

## 1. Neue Typen (83)
- `daten/q42-typen.csv`, gleicher Aufbau wie `q38-typen.csv` (Zielgruppe ab 30 % der Artikel). Alle Oberbegriffe, sortiert nach Oberbegriff und Häufigkeit.
- Je Typ wie Q38–Q41: Engine-Eintrag (Kategorie, Baumpfad, WGs, Saison, Preis, Materialien, Gruppe passend zu den Zielgruppen), eigene Silhouette im Hartwig-Stil, Model-Platz. Zeichenvorlage über `vorlage_boegen`, Merkmale über `typische_merkmale`.
- Anlass-Typen (Ballkleid, Brautkleid, Pillbox-Hut, Kopfschmuck, Lange Handschuhe, Tracht) in die Kategorie Anlass aus Q37 einsortieren (Unterkategorie Abiball/Tanzschulball, Hochzeit (Braut), Volksfest/Tracht, Zubehör).
- Code in `engine/src/sortiment/q42-selten.ts`, Bilder in `render/src/kit/mode/q42-*.js` über `erweiterung-q42.js`.

## 2. Varianten (35)
- `daten/q42-varianten.csv`: Variante → Zieltyp (Spalte `zieltyp_herkunft`: im Spiel, neu aus Q38–Q41 oder neu aus Q42).
- Variante ist **kein eigener Eintrag** in `ARTIKELTYPEN`. Sie wird als Schnitt-/Modellvariante des Zieltyps im Produktentwickler wählbar (Name der Variante), mit eigener Bildvariante, wenn die Form sichtbar abweicht (z. B. Keilstiefel, D'Orsay-Pumps, Cape-Top); bei reinen Ausprägungen (Füßlinge, Multipack, Web-Boxershorts) reicht Name plus Merkmal.
- Gibt es im Produktentwickler noch keine Schnittvariante, diese minimal einführen (Feld am Produkt, Spielstand-kompatibel, Standard = Grundform).
- Zielgruppen: Bringt eine Variante eine Gruppe mit (`zielgruppen_variante`), die der Zieltyp nicht hat, gilt sie nur für die Variante, nicht für den ganzen Zieltyp.

## Draußen (nicht umsetzen)
Anstecker-Set, Fashion-Tape, Handyhalter, Hunde-Hoodie, Schmuckbox, Shirt-Set, Besteck-Rolltasche, Glätteisen-Etui, Brust-Tape, Nipple-Cover, Geschenkgutschein, Kleiderschutzhülle, Spezialwaschmittel.

## Abnahme
Wie README. Zusätzlich Test, der jede Zeile beider CSVs prüft (Typ vorhanden mit Zielgruppen, Variante am Zieltyp wählbar).

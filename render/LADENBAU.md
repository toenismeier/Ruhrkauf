# Verbindliche Ladenbau-Regeln

Stand: 20.10.2026 · Workstream `auftraege/workstream-ladenbau.md` · Phase 2

**Geltungsbereich:** Hartwig Sport, FUNDUS (Off-Price), Volkskauf und als Prüfmaßstab die bestehenden Hartwig-Warenhäuser. Die Konstanten in `src/kit/ladenbau-regeln.js` sind die alleinige technische Quelle. Alle Maße in Metern, Flächen in m². Prüfung und Planer müssen identische Grenzen verwenden.

## Wege, Eingang und Erschließung
- Ein durchgehender, vom Eingang sichtbarer **Hauptgang ≥ 3,0 m** führt als T oder Rundlauf bis zur rückwärtigen Verkaufsfläche; im Gelände wird die Breite auf das nächsthöhere 1,25-m-Raster aufgerundet.
- Rechtwinklig anschließende **Nebengänge ≥ 1,8 m**, ebenfalls aufgerundet. Keine diagonal gestellten Einbauten oder spitzwinkligen Schleusen.
- Jede Abteilung muss mit ihrer Rechteckkante an einen Haupt- oder Nebengang grenzen. Von jedem Eingang muss jede Abteilung, jede Kasse und jede Treppe auf freien Wegen erreichbar sein. Die Validierung verwendet **0,625-m-Zellen (vier pro 1,25-m-Zelle)** und vier orthogonale Nachbarn.
- Hindernisse (Stützen, Rolltreppen, Treppen, Aufzüge, Lager) sind vor der Gangvergabe zu reservieren. Verlegte Treppen, gekappte Verkaufswege oder fingierte Durchgänge sind verboten.

## Wände und Sortimente
- Mindestens **85 % der nutzbaren Rückwände (−x und −z)** sind durchgehend mit wandgebundenen Möbeln belegt. Von der Bemessungsbasis abzuziehen sind nur nachgewiesene Treppen-, Lager-, Umkleide- und Serviceöffnungen.
- Einheitliche Wandmodule: **0,60 m Tiefe**, **0,12 m Sockel**, **2,40 m Korpus**, darüber ein **0,60 m hohes, durchgehendes Schild-/Bildband**. Teilstücke **2,50 / 5,00 / 10,00 m** müssen bündig anschließen; unterbrochene Schildbänder sind unzulässig.

## Abteilungen und Präsentation
- Jede Abteilung ist **genau ein Rechteck** auf dem **1,25-m-Raster** (Hindernisse sind separate Aussparungen, nicht eigene Abteilungen). Die Zielgröße kommt aus `haus.flaechen` oder den Pool-Daten; Rundungsreste erhält die größte Abteilung.
- Gondeln maximal **1,40 m** hoch und **1,25 m** tief, in **parallelen Reihen**; freie Verkehrsbreite **≥ 1,80 m** zwischen Reihen. Kopfenden dürfen Aktionsware tragen.
- Inseln messen **2,50 × 2,50 m** oder **5,00 × 2,50 m** (Höhe **≤ 1,50 m**); nur an Gangkreuzungen oder Reihenenden. Maximal **eine Erlebnisinszenierung** pro Abteilung; nicht jede Wareninsel ist eine Erlebnisinszenierung.
- Möbel dürfen nur in **0°, 90°, 180°, 270°** ausgerichtet sein.

## Materialität und Dekoration
- Höchstens **drei funktionale Bodenarten** je Etage (Gang, Warenfläche, optional ein Akzent). Im Sporthaus unterscheidet die Warenfläche ihre **Abteilungsfarben** aus `sportabteilung.js`; diese Farbvarianten zählen nicht als neue funktionale Bodenart.
- Akzentbelag ausschließlich unmittelbar unter einer Inszenierung, Anteil höchstens **10 %** der Etage.
- Für Sportflächen sind abteilungsspezifische Bestandsfarben zulässig. Kunstrasen-Akzentinseln bleiben dem Teamsport vorbehalten; keine flächendeckenden zusätzlichen Akzentbeläge.
- Felsen, Bäume und Pflanzen höchstens **2 %** der Etagenfläche; nur im Eingangsbereich oder innerhalb einer Inszenierung. Banner/Bilder zählen als Dekoration, erhalten aber keinen eigenständigen Boden.

## Kassen, Flächendichte, Performance
- Kassen in Eingangsnähe bzw. am Auslauf des Hauptgangs; davor mindestens **2,00 m** unmöblierter Warte-/Bewegungsraum. Warteschlangen dürfen keine notwendige Flucht- oder Erschließungsachse blockieren.
- Möbelfußabdrücke belegen **35–50 % der tatsächlich nutzbaren Verkaufsfläche**, ohne Lager/Treppenkern. Keine Mehrfachzählung sich überlappender Fußabdrücke.
- Größte zusammenhängende freie quadratische Prüffläche höchstens **6,00 m Seitenlänge**; Hauptgänge werden als unvermeidbare Freiflächen mitgeprüft.
- Teilebudget entsprechend `KIT.md`, je normale Etage **≤ 8.000 Sammler-Teile**; frühere Messwerte bleiben Vergleichsbasis beim Wechsel bestehender Formate.

## Formatprofile
| Format | Raum- und Warenbild | Sonderregeln |
|---|---|---|
| **Hartwig Sport** | Heller Hauptgang, je Sportabteilung erkennbarer Bodenfarbton und Hängeschild, bündige Markenwände, Warentische, Hänger, Rundständer, Puppen und Produktpräsentationen | Mindestens vier unterscheidbare Möbelvarianten je Abteilung; maximal 40 % je Variante; Gondeln vorrangig für Zubehör/Abverkauf. Pro Abteilung maximal eine Erlebnisinszenierung. Außenfamilien bleiben in Phase 4 erhalten |
| **FUNDUS** | Helle, große Warenflächen mit langen, dicht bestückten parallelen Kleiderstangen; Größen XS–XL | Maximal zwei Beläge: Gang + Fläche; keine Erlebniselemente, kein Kunstrasen, keine Wühltische/Paletten; zentrale Kassenzeile mit Schlangenführung |
| **Volkskauf** | Klassisches Kaufhaus: dunklere Holzregale, alte Kassen, schlichte Vitrinen, Rasterleuchten | Zentrale offene Treppe, **keine Rolltreppe**; keine doppelte Abteilung je Etage |

## Prüfsemantik
- *Erschließung:* Hindernisse und Möbelfußabdrücke sperren Suchzellen; Ziele müssen aus dem freien Gang erreichbar und mit dem Gang verbunden sein.
- *Wandbelegung:* Belegte Längen werden entlang −x und −z addiert (Überlappung nur einmal), Öffnungen als nachvollziehbare Ausnahmen dokumentiert.
- *Sport-Sortimentsmix:* Mindestens vier Möbelarten/Präsentationsvarianten pro Abteilung; kein identischer Möbeltyp über 40 % der zugeordneten Möbel. Die technische Prüfung erfolgt in `src/kit/ladenbau-pruefung.js` und im Produktionsdaten-Smoketest.
- *Dichte:* Vereinigungsfläche der Möbelpolygone / nutzbare Verkaufsfläche. Kassen zählen als Möbel; Dekoration als eigene Flächenkennzahl. Boden zählt nicht als Möbel.
- *Bestehender Bestand:* Phase 3 prüft Datenpläne, **nicht** automatisch die bisherige Sport-Geometrie. Erst Phase 4 stellt die tatsächlichen Sportetagen um; eine grüne Planprüfung ist nicht mit einer grünen Alt-Etagenprüfung gleichzusetzen.
- *Reporting:* `node pruef-ladenbau.js` zeigt je Haus/Etage Kennzahlen und Verstöße, beendet sich bei Verstößen mit Exitcode 1. PNG-Diagnose ist separat visuell abzunehmen.

Änderungen an diesen Regeln erfordern gleichzeitige Aktualisierung der Konstanten und der Prüfungen.

## Phase 4: Qualitätsmaßstab für die Sportumstellung
- Der Datenplan reserviert Inszenierungen **vor** dem Befüllen der Warenreihen. Die Flächenfarben und Hängeschilder stammen aus der vorhandenen `sportabteilung.js`; feste Kletter-, Mall-, Portal- und Bühnenarchitekturen verbleiben bei `sportgrundriss.js`.
- Die Bibliothek `moebel/sport-mix.js` bietet differenzierte, teilesparende Präsentationen in 2,50-/5,00-m-Breiten; bei kleinen Randabteilungen dürfen 2,50-m-Innenwandmodule ergänzt werden.
- Die **visuelle** Vorher-/Nachher-Abnahme über alle acht Vergleichshäuser und ein **gemessenes** Teilebudget (Etage nachher ≤ Etage vorher) sind zusätzlich zur regelkonformen Datenplanung verpflichtend. Bis dahin keine Mergefreigabe.

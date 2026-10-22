# Coffee-Inc-2-Muster für Q30/Q31

Vorlagen in `testflight/vorlage-coffee/`: 01–14 (Zentrale: Marketing, Produkt, IT, Zeitung) und 15–32 (Ummo 22.10.2026: Karte, Ebenen, Zentrale-Finanzen, Filiale). **Ummo 22.10.2026 per Auswahl: Grundlook dunkel nach Coffee.** Die hellen Q14-Tokens (`--ui-bg #F5F4F1` usw.) in `render/GESTALTUNG-UI.md` werden durch Q30 ersetzt. Die Muster werden übernommen, die Farben nicht abgemalt: Bedienelemente bekommen eine eigene Hartwig-Akzentfarbe statt Coffee-Orange.

## Bildzuordnung 15–32
| Bild | Inhalt | Hartwig-Gegenstück |
|---|---|---|
| 15 | Stadtkarte: Pins mit Markenlogo, oben zwei Glas-Pillen (Firma + Kasse, Datum), unten Ebenen-Knopf, Stadt-Pille mit Flagge, Menü | Stadtansicht, Kopfzeile, Hauspins |
| 16 | Ebenen-Liste: Schalter + isometrisches Symbol je Gebäudeart, Karte rückt nach rechts | Ebenen: Warenhaus, Volkskauf, Sport, FUNDUS, Premium, Wettbewerber, Zentrale, Lager |
| 17–19 | Zentrale Finanzen: GuV zweispaltig, Unterstrich vor Summen, zwei Reiterleisten (Income/Balance/Cash Flow, Week/Quarter/Year) | Zentrale → Finanzen, Wochenbericht |
| 20 | Zentrale-Kopf: isometrisches Großraumbüro mit Leuten, darunter zwei Großkennzahlen + Balken 5 Wochen | Zentrale-Abteilungen |
| 21–22 | Filiale Finanzen: Großkennzahlen mit Abweichung, gepaarte Balken, GuV mit Abweichungsspalte, Hauptaktion „Remodel Store“ | Hausdetail → Finanzen (Filial-GuV), Umbau |
| 23–24 | Marketing-Kacheln 2-spaltig: Illustration, Titel, Stufe links, Betrag groß rechts, „per week“ | Haus-Marketing, Marketing-Kanäle |
| 25 | Marktanteil-Ring + Liste der eigenen Häuser im Umkreis | Vertrieb/Marktanteil je Haus |
| 26 | Produktkarte im Karussell: Illustration ragt über die Karte, Sterne, Schalter, Absatz Vorwoche mit Abweichung, Margenring, Preis-Stepper, Seitenpunkte | Eigenmarken-Produkt, Ware/WG |
| 27 | Zwei Mengen-Kennzahlen in Serienfarbe + Linien mit großem Endpunkt | Haus → Ware, Absatz |
| 28 | Filialleitung: Porträtkarte, Fähigkeitsbalken in Segmenten mit Zahl, Gehalt-Stepper, Delegationsschalter | Hausleitung, Delegation je Aufgabe |
| 29 | Kundenbewertung: große Note, Teilnoten mit Sternen, Bewertungskarten im Karussell | Kundenzufriedenheit Haus |
| 30 | Personal: Stepper Anzahl + Stundenlohn, Figuren in der gewählten Anzahl, Skill/Moral | Personaleinsatz Haus |
| 31–32 | Kopfbild isometrisch: innen ↔ außen umschaltbar (Knopf unten rechts), Personal-Knopf unten links, Leute laufen | Hausdetail-Kopf = Hausbesuch-Vorschau |

## Muster, die gelten
- **Blatt statt Seite:** Kopf mit Gebäudesymbol links, Name + Adresse mittig, Schließen rechts; Griffleiste; großes isometrisches Kopfbild, über das der Inhalt beim Scrollen hochfährt.
- **Sprecherzeile mit Person:** eine dunkle Leiste mit einem Satz und einer Figur rechts (Finanzchefin, Filialleitung). Bei Hartwig sagt die Person **den Befund der Woche**, keine Begrüßung (z. B. „Zwei Abteilungen sind unterbesetzt.“). Das erfüllt die Hauptfrage-Regel.
- **Grund je Bereich:** Haus/Filiale warm-dunkel, Zentrale kühl-dunkel, jeweils mit feinem senkrechten Streifenmuster (≤ 3 % Helligkeitsunterschied); Zeitung bleibt hell (Papier).
- **Reiterleiste unten mit illustrierten Symbolen** je Gebäudeart (Haus: Personal, Sortiment, Marketing, Finanzen; Zentrale: Finanzen, Einkauf, Vorstand, Investition, Etage). Aktiver Reiter mit abgerundeter Fläche.
- **Großkennzahlen:** Beschriftung in Versalien, dünn, grau; Zahl sehr groß, weiß bzw. grün; darunter die Abweichung absolut und in % zur Vorwoche.
- **Balken ohne Achsen:** 5 Wochen, gepaart (Umsatz weiß, Ergebnis grün), abgerundete Enden, Datum darunter.
- **Tabellen:** Abschnittsköpfe in Versalien; Zeilenbeschriftung grau, Zahlen rechtsbündig weiß; Strich vor Summen; Nullen werden als 0 gezeigt, nicht versteckt.
- **Bedienelemente:** Stepper [−] Wert [+] mit Unterzeile (z. B. „0 %“), Schalter, Segmentleisten; Akzentfarbe nur hier, mit doppelter Kontur.
- **Kacheln mit Illustration** statt Symbol-in-Kreis. Die Illustration zeigt den Gegenstand (Plakat, Kasse, Kleiderständer), isometrisch wie die Stadt.
- **Karussell mit Seitenpunkten** für gleichartige Objekte (Produkte, Kampagnen, Bewertungen); Nachbarkarte schaut an der Kante heraus.
- **Figuren zählen sichtbar:** Wird das Personal per Stepper erhöht, erscheint eine Figur mehr.

## Was Hartwig anders macht (eigenes Gesicht)
- Haus hat Etagen: Im Hausdetail-Kopf zeigt ein Etagenschnitt das isometrische Innenbild (Coffee hat nur einen Raum).
- Kennzahlen nach Warenhauslogik: Umsatz, Rohertrag, Haus-EBITDA, Abweichung zur Vorwoche **und zum Vorjahr**.
- Kein Coffee-Orange, keine Coffee-Symbole nachzeichnen; Illustrationen aus dem eigenen Kit (`render/src/kit/`).

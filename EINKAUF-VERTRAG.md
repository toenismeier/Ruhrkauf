# Vertrag Einkauf, Freigaben und Eigenmarken (verbindlich für alle Agents)

Spiel: Turnaround-Tycoon über die fiktive Warenhauskette "Hartwig" (+ "Hartwig Sport"). Engine /home/claude/turnaround (TypeScript strict, deterministisch, Euro als Integer, README lesen, HQ-Logik in src/hq.ts beachten). Prototyp /home/claude/render (spiel.html, src/spiel.js, src/kit/bruecke.js). Deutsch mit echten Umlauten, keine Gedankenstriche in Spielertexten, alle Marken und Lieferanten fiktiv.

## Entscheidungen von Ummo (gesetzt)
- Zwei Ebenen: die 16 bisherigen Gruppen bleiben die Flächenebene (Bereiche); darunter ca. 50 Warengruppen (WG) für den Einkauf, jede mit NOS-Teil und Saisonteil.
- Freigabe: globale Freigabegrenze in Euro EK (Spieler stellt ein, Beispiel 50.000 €), Verhalten bei nicht rechtzeitiger Freigabe einstellbar je Warengruppe: 'auto' (wird nach Frist freigegeben) oder 'verfall' (verfällt nach Frist, Ware fehlt). Vorschlag Startwerte: NOS auto, Saison verfall.
- Eigenmarken: Start mit 3 bis 4 gewachsenen, teils veralteten Hartwig-Eigenmarken; Spieler kann sie neu positionieren, einstellen oder neue für Zielgruppen gründen (z. B. 70+, 50+ Damen, 50+ Herren, Schuhe, Teens und Tweens, Young Adults).

## Engine (src/einkauf.ts, src/eigenmarken.ts; GameState erweitert)
### Warengruppen
- `WG_DEF`: ca. 50 WG mit id, name, bereich (GruppeId), Anteil am Bereich, NOS-Anteil Start, Marge NOS/Saison, Vorlauf Vororder/Nachorder/NOS, Saisonkurve (erbt vom Bereich, mit Abweichungen), Mindestabnahme, eigenmarkenfähig. Beispiele Damen: Jacken und Mäntel, Kleider, Blusen, Strick, Hosen, Denim, Young Fashion, Große Größen, Trachten; Herren: Business, Casual, Hemden, Hosen, Strick, Jacken; Wäsche: Tag, Nacht, Mieder, Herrenwäsche, Strümpfe; Schuhe und Accessoires: Damenschuhe, Herrenschuhe, Lederwaren, Schmuck und Uhren, Reisegepäck; Kinder: Baby, Mädchen, Jungen, Kinderschuhe; Wohnen: Tisch und Küche, Heimtextil, Bettwaren, Leuchten und Deko, Elektrokleingeräte; Beauty: Parfüm, Pflege, Drogerie; Feinkost: Delikatessen, Wein und Spirituosen, Süßwaren; Spielwaren: Klein, Lizenz, Saison; Sport und Hartwig Sport WG entsprechend. Bereichssumme muss die bisherige Kalibrierung exakt treffen.
- Bestand, Bestellungen, Abschriften, Verbrauch laufen künftig je WG und Art ('nos' | 'saison'), Kohorte trägt optional `marke` (Eigenmarken-Id). Bereichswerte (bisherige Felder) werden aggregiert, damit wirtschaft/abfragen weiter funktionieren.
### Steuerung je WG (Spieleraktionen in fuehreAus)
- Limit (Open to Buy) als Faktor oder Euro je Saison, NOS-Anteil Ziel, NOS-Servicegrad Ziel (90/95/98 %), Vororderquote (Rest Nachorder), Reduzierungsstrategie (früh, normal, spät), Eigenmarkenanteil je WG und Marke, Freigabemodus je WG und Art.
- Orderrhythmus: Saison-Vororder zwei Orderrunden im Jahr (Frühjahr/Sommer, Herbst/Winter) mit langem Vorlauf, Nachorder alle 4 Wochen, NOS wöchentlich automatisch. Orders werden je WG, Art und Lieferant gebündelt, damit typischerweise 5 bis 15 Freigaben je Woche entstehen (Grenze 50.000 €), in Orderrunden mehr.
- Freigabe-Eingang `s.einkauf.freigaben`: Order mit WG, Art, Lieferant/Marke, Wert EK, erwarteter Abverkauf, Reichweite danach, Frist. Aktionen: freigeben, ablehnen, kürzen (Prozent), Sammelfreigabe (Filter), Grenze ändern.
### Kennzahlen je WG und je Bereich (abfragen.ts: `einkaufUebersicht(s, filter)`, `wgDetail(s, wgId)`)
- Umsatz, Rohertrag und Quote, Bestand EK, Lagerumschlag (Jahresumsatz zu EK durch Durchschnittsbestand EK, rollierend 13/52 Wochen), Reichweite in Wochen, Abverkaufsquote der laufenden Saison, Altwarenanteil (Saison älter 16 Wochen, NOS älter 52 Wochen, Ladenhüter), Abschriften und Reduzierungsquote, NOS-Verfügbarkeit und entgangener Umsatz durch Fehlmengen, Limit verbraucht/frei, offene Orders, Eigenmarkenanteil und Eigenmarkenmarge. Bewertungsampel je Kennzahl.
- Controlling-Stufe (HQ) bestimmt die Genauigkeit dieser Kennzahlen (Rauschen wie bisher); Einkauf-Stufe (HQ) wirkt auf Konditionen, Prognosequalität der Auto-Dispo und wie viele Eigenmarken sinnvoll geführt werden können.
### Eigenmarken
- Marke: id, name, zielgruppe (alter: '13-17' | '10-13' | '18-29' | '30-49' | '50+' | '70+', geschlecht 'damen' | 'herren' | 'unisex' | 'kinder'), kategorie (Bekleidung, Schuhe, Wäsche, Accessoires, Home, Beauty), preislage (einstieg, mitte, gehoben), stil (klassisch, modern, sportlich, trendig), qualitaet 1 bis 5, beschaffung (fernost: günstig, Vorlauf 20 bis 26 Wochen, hohe Mindestabnahme; nahost/osteuropa: mittel, 8 bis 12 Wochen; europa: teuer, 4 bis 6 Wochen), Markenbudget je Woche, Bekanntheit 0..100, Passung je Haus (aus Einzugsgebiet alter/kaufkraft gegen Zielgruppe und Preislage), WG-Zuordnung mit Anteilen.
- Wirkung: höhere Marge als Fremdmarke (abhängig von Beschaffung, Qualität, Preislage), Nachfrage hängt an Bekanntheit, Passung, Qualität und Stil-Aktualität (veraltet mit der Zeit ohne Pflege), Mindestabnahme erhöht Altwarenrisiko, Kannibalisierung von Fremdmarken senkt WKZ und Lieferantenvertrauen leicht.
- Aktionen: gründen (Einmalkosten, Aufbauzeit), neu positionieren (Kosten, Zeit, Bekanntheit sinkt teilweise), einstellen (Restbestand wird Altware/Offprice), WG-Anteile setzen, Budget, Qualität, Beschaffung ändern.
- Start: 3 bis 4 gewachsene Marken (fiktive Namen), z. B. eine Damenmarke 50+ mit veraltetem Stil, eine klassische Herrenmarke, eine Home-Marke, eine Kindermarke; gemeinsam ca. 8 bis 12 % vom Umsatz.
### Kalibrierung und Tests
- Ausgangslage (kalibrierung.ts 1) bleibt in Umsatz, Rohertrag, EBITDA im Rahmen von ±0,5 %; Bot C überlebt weiter 5 Jahre auf Seeds 1 bis 3; neue Bot-Strategien: "NOS-Pflege + Limitdisziplin", "Eigenmarken-Offensive" (z. B. 50+ und Young Adults), "Kahlschlag Limit" zeigen nachvollziehbare Unterschiede (Umschlag, Altware, Abschriften, Rohertrag, EBITDA). jest-Tests für Freigabe (auto/verfall/kürzen), Kennzahlen, Eigenmarken, Aggregation.

## Prototyp (render)
- Einkauf-Panel (Knopf "Einkauf"): Übersicht nach Bereich aufklappbar zu WG, Spalten auswählbar (Umsatz, Rohertragsquote, Umschlag, Reichweite, Abverkauf, Altware, NOS-Verfügbarkeit, Limit frei), Sortieren und Ampeln; WG-Detail mit Kurven (Bestand, Umsatz, Reichweite über 26 Wochen) und allen Reglern; Freigabe-Eingang mit Badge am Knopf, Einzel- und Sammelfreigabe, Grenze einstellbar; Eigenmarken-Seite mit Markenkarten (Zielgruppe, Positionierung, Bekanntheit, Marge, Umsatz, Passung je Region) und Assistent zum Gründen.
- Häuser: Flächen mit hohem Eigenmarkenanteil zeigen in der Grafik einen Eigenmarken-Shop mit Markenname und Farbe (Innenraum, abteilung.js, nur Erweiterung).
- spiel-render.js gleicht Panelwerte gegen die Engine-Abfragen ab (0 Abweichungen) und erzeugt Bilder: einkauf-uebersicht, einkauf-wg, einkauf-freigaben, eigenmarken, eigenmarke-gruenden.


## FUNDUS: Zukauf von Markenposten und Altware als Nebenkanal (21.10.2026)

FUNDUS ist ein eigenständiger Marken-Off-Price-Laden, kein Restpostenlager. Rund 65 % des Wareneinsatzes sollen auf externe Markenposten entfallen, die zu 30 bis 40 % des früheren Listenpreises zugekauft und zu 50 bis 70 % verkauft werden. Einkaufskompetenz verbessert diese Konditionen. Rund 35 % des Wareneinsatzes kommen aus alter Hartwig-/Sport-Ware.

Das Feld s.einkauf.offpriceZukauf begrenzt den wöchentlichen zu bezahlenden Markenpostenzukauf in Euro. s.einkauf.altwareOutlet begrenzt den Anteil geeigneter Konzernaltware zwischen 0 und 1 (Start 0,5). outletVersorgung(s) überträgt Altware aus dem Konzernbestand in s.formate.pool zum Buchwert und belastet 3 % tatsächliche Logistikkosten. Alte Ladenhüter werden höchstens zu 6 % des jeweiligen Postens je Woche verkauft. Fehlmengen senken realisierte Umsätze; Überhang erzeugt Abschriften. Die Filial-GuV enthält echte Wareneinsatz-, Miet-, Personal-, Logistik-, Werbe- und Abschriftenbuchungen; keine pauschale Ausgleichsgutschrift.

Volkskauf verfügt über ein eigenes Beschaffungs- und Bestandsmodell außerhalb des Hartwig-OTB. Für Mengen, wirtschaftliche Zielquoten und die Bot-T-/Bot-D-Wirkung sind Messungen durch Claude erforderlich.

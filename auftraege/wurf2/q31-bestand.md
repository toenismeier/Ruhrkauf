# Q31 Bestandsaufnahme Management-Panels (22.10.2026)

Vorher-Bilder: `node render/tests/q31-bilder.cjs <ordner>` (Essen, Seed 1, KW 9, 390 × 844, je Reiter bis zu drei Bildschirmhöhen; Textprüfung auf `undefined`, `null`, `NaN`, `hc-…`).

## Befund quer über alle Panels
- Heller Q14-Look, Blatt nur halbe Höhe über der Stadt; bei kurzem Inhalt fällt es auf ein Drittel zusammen (Planung Planung/Forecast/Boni, IT-Projekte), oben tote Stadtfläche.
- „+ Neue Eigenmarke“ als grüner Großknopf über jedem Reiter von Einkauf und Marketing. Einstieg bleibt (Q05), wird Nebenaktion an der Eigenmarken-Stelle.
- Grün als Primärfarbe für Knöpfe statt einer Hartwig-Akzentfarbe; Kachelraster 2 × n ohne Rangfolge in Einkauf, Marketing, Online, Vorstand, Planung.
- Interne IDs sichtbar: `hc-ost-2` usw. in Planung, Online, Reporting (behoben, Commit 1), Ebene als Rohwert `hauscluster`.
- Erfolgsbanner überdeckt Panelinhalt mitten im Blatt (Bedarf Q30).
- Text unter 12 px in Tabellen (Planung 12 px fest, Merchandise-Kopf), abgeschnittene Spalten „Warengruppe / S…“, „Herbst/Winter 20…“, Reiter „Merch“, „Redu“.
- Rohzahlen in Eingaben: Markenposten-Zukauf „6578979“, Planziele als Dezimalfeld.

## Je Panel: Hauptfrage, Hauptaufgabe, eigenes Element
| Panel | Hauptfrage | Hauptaufgabe (ein Tipp) | Eigenes Element |
|---|---|---|---|
| Einkauf Übersicht | Wo läuft die Ware aus dem Ruder? | Bereich mit roter Ampel öffnen | Warenbuch: Bereiche als Buchzeilen mit Umsatz, Rohertrag, Limit frei, Summenstrich |
| Einkauf Freigaben | Was muss ich diese Woche freigeben? | Alle bis Grenze freigeben | Orderbuch: Orders als linierte Buchseite (Lieferant, WG, EK, Frist), Summe unter Strich = Kopfwert |
| Eigenmarken | Welche Marke trägt, welche verliert? | Marke öffnen | Kollektionstafel: Marken als Musterkarten mit Stoffprobe in Markenfarbe, Anteil und Mehrmarge |
| Produktentwicklung | Was läuft im Sortiment, was entsteht? | Neues Produkt | Kollektionsstange: Produktkarten im Karussell (Coffee 07), Bilder aus kit/mode unverändert |
| Marketing | Bringt mein Werbegeld diese Woche Kundschaft? | Kanalbudget ändern | Werbeplan: Budget je Kanal als Zeilen mit Summenstrich; Kampagnenkalender als Jahresleiste |
| IT | Welches System droht auszufallen? | Modernisieren | Systemlandkarte als Generationenleiter (Gen 1 bis 4) je System |
| IT-Produkte | Wie viele nutzen Karte, App, Kasse? | Produkt öffnen | Großkennzahl + 5-Wochen-Linie (Coffee 12–14) |
| Online | Verdient hartwig.de diese Woche Geld? | Sortimentsbreite / Fulfillment | Paketschein: Umsatz, Kosten je Bestellung, Deckungsbeitrag als Lieferschein |
| Planung | Liegen wir im Plan? | Abweichung je Region öffnen | Planblatt: Plan, Ist, Abweichung als GuV-Spalten mit Strich vor Summe (Coffee 17–19) |
| Reporting | Was treibt den Umsatz gegen Vorjahr? | Haus aus Beobachtungsliste öffnen | Konzernbrücke als Wasserfall Vorjahr → Ist |
| Vorstand | Wer fehlt im Vorstand, was steht zur Entscheidung? | Offene Sitzungsvorlage entscheiden | Sitzungstisch: Ressorts als Platzkarten, unbesetzt als leerer Stuhl |
| Spielstände | Wo liegt mein Spiel, kann ich zurück? | Speichern auf Platz | Aktenregal: drei Ordnerrücken mit Stadt, KW, Kasse |

## Schlechte Tage (je Panel zu zeichnen)
Keine Freigaben offen; Limit überzogen (negativ); Marke im Aufbau ohne Umsatz; kein Produkt in Entwicklung; Kanalbudget 0; System Generation 1 mit Ausfallrisiko; Online mit negativem Deckungsbeitrag; kein Jahresplan / Forecast erst ab KW 13; unbesetztes Ressort; leere Spielstandplätze.

## Bedarf an Q30 (spiel.html / spiel.js / komponenten.css)
1. Blatt füllt bei Management-Panels die volle Höhe unter der Kopfzeile, unabhängig von der Inhaltslänge (heute Zusammenfallen auf ein Drittel).
2. Erfolgsbanner nicht über Panelinhalt; unterhalb sicherer Kopfbereich oder erst nach Schließen.
3. Bausteine, die Q31 nutzt: Panelkopf mit Bereichssymbol, Sprecherzeile mit Figur, Reiterleiste (gern unten), Großkennzahl mit Abweichung, Stepper, Schalter, Segmentleiste, Tabelle mit Summenstrich, Karussell mit Seitenpunkten, leerer Zustand.
4. Zentrale-Grund (kühl-dunkel, Streifen) als Klasse, die ein Modul am Blatt setzen kann.

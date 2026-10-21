# O02: Umsatztreiber – Frequenz × Kaufquote × Bon

Branch `feat/op-umsatztreiber`. Darf parallel zu O01 laufen. Zuerst lesen: `auftraege/operativ/README.md`, `engine/src/wirtschaft.ts`.

## Ziel
Heute entsteht der Umsatz eines Hauses aus Potenzial und Faktoren. Der Spieler sieht, dass ein Haus verfehlt, aber nicht warum. Künftig wird der Umsatz jedes Hauses in drei Treiber zerlegt:

**Umsatz = Frequenz × Kaufquote × Durchschnittsbon**

Der Durchschnittsbon wiederum ist Teile je Bon × Durchschnittspreis je Teil. Alle späteren Hebel greifen an einem dieser Treiber an:
- Marketing und Umfeld wirken auf die Frequenz,
- Personal, Standards und Verfügbarkeit auf die Kaufquote,
- Preis, Reduzierung und Zusatzverkauf auf den Bon.

## 1. Engine
1. `engine/src/treiber.ts`. Nach `simuliereHaus` wird je Haus und Woche zerlegt:
   - **Frequenz** (Besucher je Woche): aus Grundfläche, Lage, Stadtgröße, Kaufkraft, Saison und Marketingfaktor. Startgrößen realistisch: ein A-Haus 25.000 bis 45.000 Besucher je Woche, ein C-Haus 5.000 bis 12.000.
   - **Kaufquote**: Startwerte je Format (Hartwig 22 bis 30 %, Sport 18 bis 25 %, FUNDUS 30 bis 40 %).
   - **Bon** = Umsatz / (Frequenz × Kaufquote). Teile je Bon und Preis je Teil aus dem Gruppenmix des Hauses.
   - Die Zerlegung muss den heutigen Umsatz exakt ergeben (Test). Sie ist zunächst eine **Erklärung**, keine neue Rechnung.
2. **Treiberfaktoren:** Je Treiber ein Faktor in `haus.treiber = { frequenz: 1, kaufquote: 1, bon: 1 }`.
   - Andere Module setzen ihn über `setzeTreiber(s, hausId, quelle, treiber, faktor)`, eine Quelle je Modul, zum Beispiel `('personal', 'kaufquote', 0.97)`.
   - Der Umsatz wird mit dem Produkt aller Quellen multipliziert. Ohne Quellen ist alles 1, also neutral.
3. **Vorjahr und Verlauf:** Je Haus die Treiber der letzten 104 Wochen, um Speicher zu sparen ab Woche 53 in 4-Wochen-Blöcken.
4. **Umsatzbrücke** `umsatzbruecke(s, { ebene: 'konzern'|'region'|'hauscluster'|'haus', id?, vergleich: 'vorjahr'|'plan', wochen })`:
   - Zerlegt die Abweichung in Frequenzeffekt, Kaufquoteneffekt und Boneffekt, den Boneffekt weiter in Teile und Preis.
   - Methode: Komponenten nacheinander tauschen, Reihenfolge Frequenz → Kaufquote → Teile → Preis. Die Summe ergibt exakt die Differenz.
   - `vergleich: 'plan'` erst mit O06. Bis dahin liefert sie „kein Plan vorhanden“.
5. **Ranking** `ranking(s, { kennzahl, ebene, innerhalb? })`: Häuser innerhalb ihres Hauscluster (wenn O01 da ist, sonst Region) und gegen alle Häuser. Kennzahlen: Umsatz, Umsatz je qm, Frequenz, Kaufquote, Bon, Abweichung zum Vorjahr.

## 2. Oberfläche
1. **Hausdetail** bekommt eine Treiberzeile: Frequenz, Kaufquote, Bon jeweils mit Vorjahresabweichung und Pfeil, dazu ein kleiner Wasserfall Vorjahr → Ist.
2. **Wochenreporting** (`render/src/ui/reporting.js`, Menükachel „Reporting“):
   - Tabelle je Region bzw. Hauscluster bzw. Haus (aufklappbar) mit Umsatz, Abweichung zum Vorjahr, Frequenz, Kaufquote, Bon, Ampel.
   - Sortierbar, Filter auf Format.
   - Oben die Konzernbrücke.
   - Die Spalten Plan und Forecast hängt O06 an.
3. **Beobachtungsliste:** die zehn Häuser mit der größten negativen Abweichung, mit dem Haupttreiber („Kaufquote −3,1 Punkte“). Antippen öffnet das Haus.

## Abnahme
- Tests: Zerlegung ergibt exakt den Umsatz. Brücke summiert exakt. Neutral im Standard.
- Prüfung in `spiel-render.js`: Treiberwerte im Hausdetail gleich Engine, Brückensumme gleich Differenz.

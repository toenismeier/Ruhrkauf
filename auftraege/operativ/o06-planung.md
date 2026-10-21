# O06: Planung – Jahresplanung, Forecast, Boni

Branch `feat/op-planung`. Baut auf O01 (Bereiche, Leitungen) und O02 (Treiber, Reporting). Zuerst lesen: `auftraege/operativ/README.md`, `o01`, `o02`.

## Ziel
Die Jahresplanung mit unterjährigem Forecast ist das zentrale Führungsinstrument einer Warenhauskette. Sie gibt Häusern und Bereichen Ziele, misst die Leitungen und bindet Eigentümer und Bank.

## Festlegungen von Ummo
- Der Spieler setzt das **Konzernziel**. Das Controlling verteilt es auf Bereiche, Hauscluster und Häuser. Der Spieler kann übersteuern.
- **Folgen einer Planverfehlung:** Vertrauen von Eigentümer und Bank sowie Boni der Leitungen. Kein Spielende durch Abwahl.
- **Forecast quartalsweise:** 3+9, 6+6, 9+3.

## 1. Jahresplanung (`engine/src/planung.ts`)
1. **Zeitpunkt:** KW 40 bis 44 für das Folgejahr. Der Bereich Konzerncontrolling öffnet die Planung mit einer Vorlage.
2. **Gegenstromverfahren:**
   1. **Top-down:** Der Spieler setzt Konzernziele für Umsatz, EBITDA und Investitionen. Startvorschlag des Controllings: Vorjahr plus Trend.
   2. **Verteilung:** Das Controlling verteilt auf Format → Region → Hauscluster → Haus und auf Warengruppen, nach Vorjahr, Trend, Umbauten und Schließungen.
   3. **Bottom-up:** Cluster- und Bereichsleitungen melden zurück („Ruhr West hält −4 % für realistisch“).
      - Sandbagging: Jede Leitung hat einen Hang zu weicher Planung, umso stärker, je höher ihr Bonusanteil.
      - Optimismus: Manche planen zu hoch.
      - Das Konzern- bzw. Vertriebscontrolling erkennt Sandbagging nach seiner Qualität und schlägt Korrekturen vor.
   4. **Abschluss:** Der Spieler übernimmt, korrigiert einzelne Cluster, Häuser oder Bereiche, oder lässt den Vorschlag durchlaufen.
3. **Phasing** auf Wochen: Vorjahresverlauf je Haus, Kalendereffekte (Ostern, Feiertage, Anzahl Samstage, verkaufsoffene Sonntage), geplante Aktionen aus dem Marketing-Kalender.
4. **Der Plan steuert:** Das Budget setzt den Rahmen für Merchandise Planning (O05: Open-to-Buy je Saison) und Personal (O04: Stundenbudget je Cluster). Wer zu wenig Umsatz plant, kauft zu wenig Ware und plant zu wenig Stunden.
5. **Erstes Spieljahr:** Beim Spielstart gibt es einen vorhandenen Plan (vom Vorgänger), leicht zu optimistisch (+3 %).

## 2. Forecast
- In KW 13, 26 und 39 erstellt das Controlling den Forecast (3+9, 6+6, 9+3): Ist bis heute plus Erwartung für den Rest, je Ebene.
- Die Treffgenauigkeit hängt an Konzern- und Vertriebscontrolling und am Planungssystem (O03).
- Der Spieler kann den Forecast vor Abgabe an Eigentümer und Bank korrigieren.

## 3. Folgen
1. **Vertrauen:** Bei jedem Quartalsende wird Ist gegen den letzten abgegebenen Forecast gemessen.
   - Abweichung unter 2 %: Vertrauen +2.
   - 2 bis 5 %: 0.
   - Über 5 %: −3, über 10 %: −6.
   - Auch ein Übertreffen über 5 % kostet Vertrauen (−1, „Planung nicht im Griff“).
   - Die Kennzahl Vertrauen gibt es schon (`stakeholder`).
2. **Boni:**
   - Cluster-, Haus- und Bereichsleitungen bekommen einen Bonus nach Planerfüllung (Umsatz und EBITDA ihrer Ebene), ausgezahlt im Februar für das Vorjahr. Kosten im Personalaufwand.
   - Ein zu harter Plan senkt Stimmung und erhöht Wechselwillen, ein zu weicher kostet Bonus ohne Leistung.
   - Bonusanteil je Ebene als Einstellung (Start 10 % des Gehalts).

## 4. Oberfläche
- **Planungsassistent** (`render/src/ui/planung.js`), aktiv KW 40 bis 44:
  - Schritt 1: Konzernziel mit Reglern und sofortiger Wirkung auf EBITDA.
  - Schritt 2: Verteilung als Baum (Format → Region → Cluster → Haus) mit Rückmeldungen der Leitungen und markiertem Sandbagging-Verdacht.
  - Schritt 3: Abschluss.
- **Reporting (O02)** bekommt die Spalten Plan, Abweichung zum Plan, Forecast. Die Brücke vergleicht wahlweise mit dem Plan.
- **Forecast-Vorlage** im Posteingang in KW 13, 26, 39.

## Abnahme
- Tests:
  - Neutral im Standard: Plan und Forecast ändern das Simulationsergebnis nicht, nur Boni, Vertrauen und die gesteuerten Budgets.
  - Bei Bot C mit Standardplan ist die Wirkung auf das EBITDA Jahr 1 höchstens 1 %.
  - Phasing summiert auf das Jahresziel.
  - Forecast-Abweichung → Vertrauen nach Tabelle.
- Bot C plant mit Controlling-Vorschlag und überlebt 5 Jahre.

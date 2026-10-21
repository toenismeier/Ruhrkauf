# N02: Spielende, Bilanz, Bestenliste

## Ziel
Heute steht bei „zerschlagen“ nur ein Wort in der Kopfleiste, und das Spiel bleibt stehen. Ein Tycoon braucht ein Ende mit Wirkung und einen Grund, noch einmal zu spielen.

## Engine
1. `s.ende?: { art, woche, kennzahlen }` mit den Arten:
   - `zerschlagen` (heute schon),
   - `saniert`: 5 Jahre überlebt, Insolvenzverfahren abgeschlossen, EBITDA der letzten 52 Wochen positiv,
   - `investor`: Verkauf des Konzerns, siehe unten,
   - `ruhestand`: Spieler beendet nach Jahr 5 freiwillig.
2. **Investorenverkauf** (neues Angebot `konzernVerkauf`):
   - Ab Woche 156 bietet ein Käufer (Finanzinvestor, Handelskonzern, Immobilienfonds; Namen aus einer neuen Liste in `daten.ts`) einmal im Jahr den Kauf an.
   - Preis: Vielfaches des EBITDA plus Immobilienwert, wie beim `premiumVerkauf` gerechnet. Annehmen beendet das Spiel mit `investor`.
3. **Punkte** `endwertung(s)`:
   - Zählt: gerettete Häuser, gerettete Arbeitsplätze (FTE gegen Start), Unternehmenswert, Image, Stakeholder.
   - Abzug für Schließungen und Entlassungen. Faktor für Schwierigkeit (leicht 0,8, mittel 1, schwer 1,3).
   - Formel offen in der Datei, je Anteil eine Zeile.
4. Tests: Bot C erreicht nach 260 Wochen `saniert` auf Seeds 1 bis 3. Ohne Eingriff wird es `zerschlagen`. Die Wertung ist deterministisch.

## Oberfläche
1. **Endszene je Art**, Vollbild, wie der Wochenbericht:
   - `zerschlagen`: Stadt in Grau, alle Häuser im Zustand Räumung bzw. Leerstand, Zeitungsschlagzeile.
   - `saniert`: Stadt in Weihnachtsbeleuchtung, volle Fußgängerzone.
   - `investor`: Schlüsselübergabe, Schriftzug des Käufers.
   - Danach die Bilanzseite: Wertung mit hochzählenden Teilwerten, Verlauf Umsatz und EBITDA (N01, falls vorhanden), beste und schlechteste Entscheidung (größte EBITDA-Wirkung aus `s.protokoll`, falls vorhanden; sonst weglassen).
2. **Bestenliste** lokal (`localStorage`, je Schwierigkeit 10 Einträge: Datum, Seed, Art, Punkte). Testspiele (N14) werden markiert.
3. „Neues Spiel“ und „Weiterspielen“. Weiterspielen geht nur nach `saniert` und `ruhestand`.

## Abnahme
- Bilder aller vier Endszenen und der Bilanz.
- `spiel-render.js`: Endszene `zerschlagen` erscheint nach dem bekannten Ablauf ohne Eingriff, 0 Abweichungen.

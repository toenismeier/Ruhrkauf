# Auftrag: Premium-Häuser (Trophy Stores)

Branch `feat/grafik-premium`, erst nach Merge von `feat/grafik-schwesterkette` starten (gleiche Einbaupunkte). Engine und Grafik in einem Auftrag.

## Worum es geht
Vorbild ist das Premium-Quartett des Ruhrkauf-Konzerns: vier Weltstadt-Warenhäuser, die nicht wie die Masse geführt werden. Profitabel (EBITDA-Marge 6 bis 12 %), Immobilie mehr wert als der Handel, im Ernstfall eigener Verkaufsprozess an Luxusgruppen und Family Offices. Im Spiel sind das die Kronjuwelen: das Beste, was Hartwig hat, und das Erste, was Käufer wollen.

## Die vier Häuser
Namen als Konstanten in `engine/src/daten.ts` (`PREMIUM_HAEUSER`) und gespiegelt in `render/src/kit/premium.js`. Arbeitsnamen, keine echten Häuser, keine Namen aus `wettbewerber.js NAMEN` (dort gibt es eine Art `premium` mit Haus Ahlert, Feldmann & Cie. usw., die sind Konkurrenz und bleiben getrennt):

| Schlüssel | Name | Stadt | Rang | Charakter |
|---|---|---|---|---|
| P001 | Palais Hartwig | Berlin | 1 | Größtes Haus, Feinkostetage mit Legendenstatus, Dachgarten |
| P002 | Hartwig am Hofgarten | München | 1 | Gleichauf mit Berlin, Luxusmarken-Galerie, Dachterrasse mit Blick |
| P003 | Alsterhaus Hartwig | Hamburg | 2 | Kleiner, elegant, Wasserlage |
| P004 | Hartwig Königsallee | Düsseldorf | 3 | Klar schwächer, Haus mit Potenzial |

Rangfolge wie im Vorbild: 1 und 1 gleichauf, dann 2, dann 3 deutlich schwächer.

## Engine
1. **Kein neues Format.** `Haus` bekommt ein optionales Feld `klasse?: 'premium'`. Format bleibt `'warenhaus'`, damit Einkauf, Marketing und Aktionen ohne Sonderfälle weiterlaufen.
2. **Umwidmen statt hinzufügen,** damit die Kalibrierung hält: In `welt.ts neueWelt` wird je Stadt das bisher größte Hartwig-1a-Haus (Grundfläche × Etagen) in Berlin, München, Hamburg, Düsseldorf umgewidmet: neuer Name, `klasse: 'premium'`, `premiumSchluessel: 'P001'` bis `'P004'`. Die Haus-Id (W…) bleibt unverändert, damit HQ, Spielstände, Prüfskripte und Brücke weiter funktionieren. Bei Seed 1 sind das nach heutigem Stand W003 (Berlin), W009 (München), W006 (Hamburg), W016 (Düsseldorf); die Auswahl muss aber regelbasiert sein, nicht fest verdrahtet.
3. **Wirtschaft (`wirtschaft.ts`, `welt.ts`):**
   - Flächenproduktivität je Gruppe Faktor 1,8 (Rang 1), 1,5 (Rang 2), 1,25 (Rang 3) gegenüber einem normalen Metropolenhaus.
   - Gruppenmix: beauty, accessoires, damen, food stärker, spielwaren und wohnen kleiner.
   - Höhere Marge in beauty und accessoires (+3 Punkte), Konzessionsanteil höher (Luxusmarken als Shop-in-Shop, Konzept `konzession`).
   - Personal: höhere Beratung (FTE je qm +15 %).
   - Ziel EBITDA-Marge je Haus: Rang 1 rund 11 %, Rang 2 rund 9 %, Rang 3 rund 6 % in Jahr 1 ohne Eingriff, Seeds 1 bis 3.
4. **Schutz und Bewertung:**
   - Premium-Häuser sind von Rabattaktionen mit Scope `alle` ausgenommen, wenn der Spieler den neuen Schalter `premiumSchuetzen` (Standard an) nicht ausschaltet. Aktionen auf Premium-Häuser senken eine neue Kennzahl `premiumImage` (0 bis 100, Start 80), die die Flächenproduktivität dieser Häuser treibt.
   - In der Insolvenz: neues Angebot `premiumVerkauf` (Typ in `AngebotTyp`) mit Käufertyp (Luxusgruppe, Family Office, Staatsfonds), Kaufpreis als Vielfaches des Haus-EBITDA plus Immobilienwert, Frist 10 bis 20 Wochen, Verhandlung über `angebotVerhandeln`. Die drei besten Häuser zusammen etwa 3 Mrd. € Bewertungsanker, Rang 3 deutlich darunter.
   - Verkauf bringt Cash und entfernt das Haus (`status: 'verkauft'`), senkt aber `image` und `eigentuemer` spürbar.
5. **Aktionen:** `{ typ: 'premiumSchuetzen'; an: boolean }`, `{ typ: 'premiumInvestition'; haus: string; betrag: number }` (Investition hebt Substanz und `premiumImage`, wirkt über 26 Wochen).
6. **Abfragen:** `premiumUebersicht(s)` in `abfragen.ts`: je Haus Umsatz, EBITDA, Marge, Image, Substanz, geschätzter Marktwert.
7. **Tests** in `engine/tests/premium.test.ts`: Umwidmung erzeugt genau vier Häuser in den vier Städten, Margenziele in Jahr 1 (Toleranz ±2 Punkte), Aktion mit Scope `alle` trifft Premium nicht bei Schutz an, Verkauf entfernt Haus und bucht Cash.
8. **Kalibrierung:** Konzernumsatz Jahr 1 höchstens ±1,5 % gegen heute, Bot C überlebt 5 Jahre auf Seeds 1 bis 3. Neue Werte in `engine/README.md` eintragen.

## Grafik
1. Neues Modul `render/src/kit/premium.js`, `export function premiumhaus(S, scene, haus, opt = {})` mit gleicher Rückgabe wie `warenhaus()`. Budget bis 12.000 Teile (Ausnahme vom Warenhausbudget, in `KIT.md` dokumentieren).
2. **Aussehen:** Prachtbauten, jedes Haus ein Unikat, keine Familien-Logik:
   - P001 Berlin: monumentaler Kalksteinbau der Kaiserzeit, sechs Geschosse plus Staffelgeschoss mit Glasdach-Wintergarten, Ecke mit Rundturm, Bronzevordächer, Schriftzug in Messing.
   - P002 München: Neorenaissance-Fassade mit Arkaden im EG, Kupferdach mit Gauben, Dachterrasse mit Sonnenschirmen.
   - P003 Hamburg: heller Putzbau mit Kolonnaden, grüne Kupferkuppel, Lage am Wasser (Slot an Uferstraße, wenn der Stadtplan das hergibt).
   - P004 Düsseldorf: Bau der 1920er mit Natursteinraster, schlichter, aber mit Baldachin über dem Haupteingang.
   - Allen gemeinsam: Lichthof mit Glasdach (von oben sichtbar), große Schaufenster mit Inszenierung, Portier-Vordach, Fahnen, Wagenvorfahrt, mehr Passanten als jedes andere Haus.
   - Farben: Kalkstein, Messing `#b8955a`, Bronze, dunkles Grün. Hartwig-Rot nur klein im Signet.
3. **Zustände:** alle 12 aus `zustaende.js`, dazu ein eigener Zustand „Verkaufsprozess“ (dezentes Bauschild mit Investorennamen, Fassade unverändert, keine Rabattplakate) und „Neuer Eigentümer“ (Schriftzug des Käufers statt Hartwig).
4. **Innen:** Etagenschnitte mit Feinkostetage (Theken, Austernbar, Weinwand), Luxus-Galerie (Shop-in-Shop mit Glasvitrinen), Lichthof über alle Etagen, Restaurant oben. Über `grundriss.js` mit Schalter `klasse: 'premium'`, nicht kopieren.
5. **Einbau:** `bauer.js fussabdruck`, `bruecke.js` (Verzweigung auf `haus.klasse === 'premium'`), `stadtplan.js` (größerer Slot, Hartwig-Regel: Premium ist das prägnanteste Haus der Stadt, Nachbarn höchstens vier Geschosse), `haeuser.json` neu erzeugen über ein Skript aus der Engine (`engine/scripts/haeuser-export.ts`, falls nicht vorhanden anlegen).
6. **Kataloge:** `premium.js` (vier Häuser in drei Zuständen), `premium-etagen.js`, `premium-stadt.js` (Nahausschnitt jeder der vier Städte). Mindestens drei Render-Runden, jedes Bild ansehen.
7. **Oberfläche:** Im Hausdetail ein Premium-Block mit Image, Marktwert, Investieren, Schutz an/aus. Auf der Karte eigener Pin (Krone).

## Abnahme
- Engine: Tests grün, Kalibrierung wie oben, `premiumUebersicht` liefert plausible Werte.
- Grafik: `pruef-staedte` 0 Fehler, Gestaltungsprüfung 0 Verstöße in allen 112 Städten, `spiel-render.js` 0 Abweichungen.
- Sichtprüfung: Jedes Premium-Haus ist auf den ersten Blick das schönste Gebäude seiner Stadt und klar von Hartwig-Häusern und Premium-Wettbewerbern unterscheidbar.

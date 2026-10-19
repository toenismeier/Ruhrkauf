# Nachbesserung: Premium-Häuser (PR #12)

Branch `feat/grafik-premium` (weiterarbeiten). Grundlage bleibt `auftraege/grafik-premium.md`.

## Befund (19.10., lokal geprüft)
- Typecheck grün, `spiel-render.js` 0 Abweichungen.
- **Tests: 4 rot von 113.**
  - `premium.test.ts` › „Seed 1/2/3: operative Premium-Margen und Rangfolge“: Die Abweichung vom Margenziel beträgt 2,3 / 2,2 / 3,4 Punkte, erlaubt sind 2.
  - `abnahme.test.ts` › „Bot C überlebt auf Seeds 1 bis 3 fünf Jahre“: rot.
- **Optik nicht abgenommen.** Katalog `premium` angesehen:
  - 670 bis 860 Teile je Haus. Das Budget liegt bei bis zu 12.000. Die Häuser wirken schlichter als normale Hartwig-A-Häuser.
  - Die vier Häuser sind fast gleiche Quader mit flachem braunem Dach und Glas-Lichthof. Keine Unikate.
  - Es fehlen: Schriftzug in Messing, Fahnen, Portier-Vordach mit Wagenvorfahrt, Schaufenster-Inszenierung. Auch die Passanten sind nicht mehr als bei anderen Häusern.
  - Die Zustände „Investition / Umbau“ und „Insolvenz / Verkauf“ unterscheiden sich vom Regelbetrieb fast nicht.
- `main` enthält inzwischen Volkskauf (#2) und Wettbewerber im Spiel (#10). Zuerst rebasen. Konflikte in `bruecke.js`, `stadtplan.js` und `bauer.js`: beide Seiten behalten. Danach die Kalibrierung neu messen, weil die Wettbewerber die Nachfrage verändern.

## 1. Engine
1. Rebase auf `main`, dann `npx jest` und die Margen der vier Häuser je Seed als Tabelle in die PR-Beschreibung.
2. Margen auf die Ziele bringen (Rang 1 rund 11 %, Rang 2 rund 9 %, Rang 3 rund 6 %, Toleranz ±2 Punkte). Stellschrauben in dieser Reihenfolge: Flächenproduktivitätsfaktor je Rang, Konzessionsanteil, FTE-Zuschlag. Nicht die Toleranz im Test aufweichen.
3. Bot C: Ursache benennen (Woche und Grund der Insolvenz je Seed aus `npx tsx scripts/bot.ts <seed> 260 --tief`). Vermutung: Die Umwidmung entzieht dem Konzern Ertrag, oder der Bot schließt bzw. verkauft Premium-Häuser. Bot C darf Premium-Häuser nicht schließen. Verkauf nur in der Insolvenz über `premiumVerkauf`.
4. Konzernumsatz Jahr 1 höchstens ±1,5 % gegen `main`. Werte in `engine/README.md`.

## 2. Grafik: vier Unikate
Ziel je Haus 4.000 bis 9.000 Teile. Werte in `KIT.md`. Jedes Haus muss allein an der Silhouette erkennbar sein.
- **P001 Palais Hartwig, Berlin:**
  - Kalksteinfassade mit Kolossalpilastern über drei Geschosse und kräftigem Kranzgesims.
  - Runder Eckturm, der zwei Geschosse über die Traufe hinausragt und eine Kuppel mit Laterne trägt.
  - Staffelgeschoss mit Wintergarten aus Glas über der ganzen Länge.
  - Bronzevordächer über den drei Eingängen.
  - Schriftzug „PALAIS HARTWIG“ in Messing auf dem Gesims, Versalhöhe mindestens 1,6 m.
- **P002 Hartwig am Hofgarten, München:**
  - Erdgeschoss mit Rundbogenarkaden über die ganze Front.
  - Steiles Kupferdach (grün patiniert, `#5f8f7a`) mit zwei Reihen Gauben.
  - Ausgeschnittene Dachterrasse mit Sonnenschirmen und Pflanzkübeln. Fassade in warmem Ocker.
- **P003 Alsterhaus Hartwig, Hamburg:**
  - Heller Putzbau mit durchlaufenden Kolonnaden im EG.
  - Grüne Kupferkuppel über der Ecke. Die Kuppel ist das höchste Element, mindestens 8 m über der Traufe.
  - Uferstraße oder Wasserkante am Slot, falls der Stadtplan das hergibt. Sonst ein Platz mit Brunnen davor.
- **P004 Hartwig Königsallee, Düsseldorf:**
  - 1920er-Natursteinraster mit senkrechten Lisenen, flaches Dach mit zurückgesetztem Attikageschoss.
  - Großer Baldachin über dem Haupteingang, schlichter als die anderen drei.
- **Allen gemeinsam:**
  - Fahnenreihe über dem Eingang (mindestens 4 Fahnen, dunkelgrün mit Messing-Signet).
  - Portier-Vordach mit Wagenvorfahrt und ein bis zwei Limousinen.
  - Schaufenster mit Inszenierung: Puppen, Lichtrahmen, farbige Szenen.
  - Doppelt so viele Passanten wie ein Hartwig-A-Haus. Lichthof mit Glasdach von oben sichtbar.
  - Hartwig-Rot nur im kleinen Signet.

## 3. Zustände sichtbar machen
- **Investition / Umbau:** Gerüst mit Plane an einer Fassadenseite, Kran, Bauzaun am Gehweg. Das Geschäft bleibt geöffnet, die Passanten bleiben.
- **Insolvenz / Verkauf:** Bauschild „Exklusiver Verkaufsprozess“ mit Investorname neben dem Eingang, Fahnen eingeholt, halb so viele Passanten. Keine Rabattplakate.
- **Neuer Eigentümer:** Schriftzug des Käufers statt „Hartwig“, andere Fahnenfarbe.
- Dazu die 12 Grundzustände aus `zustaende.js`, mindestens im Katalog `premium-zustaende` (neu, alle vier Häuser × alle Zustände).

## 4. Abnahme
- Kataloge `premium`, `premium-zustaende`, `premium-etagen`, `premium-stadt` in mindestens drei Runden rendern und jedes Bild ansehen. Die Bilder nach `bilder/` legen.
- Sichtprüfung im Katalog `premium-stadt`: Das Premium-Haus ist das prägnanteste Gebäude der Stadt und klar von Hartwig-Häusern und Premium-Wettbewerbern (Haus Ahlert usw.) unterscheidbar.
- Lokal: Typecheck, alle Tests grün (inklusive Bot C), Build, `spiel-render.js` 0 Abweichungen, `pruef-staedte` 0 Fehler, `pruef-gestaltung` 0 Verstöße.
- Ohne CI arbeiten wie in `auftraege/README.md`.
